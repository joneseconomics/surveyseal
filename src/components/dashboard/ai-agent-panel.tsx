"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bot, Key, Play, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { AI_PROVIDERS } from "@/lib/ai/providers";
import { AI_PERSONAS } from "@/lib/ai/personas";
import {
  updateAiSettings,
  createAiAgentRun,
  createAiSession,
  executeAiQuestion,
  executeAiComparison,
  completeAiSession,
  failAiSession,
  completeAiAgentRun,
} from "@/lib/actions/ai-agent";

interface AiAgentRun {
  id: string;
  provider: string;
  model: string;
  persona: string;
  sessionCount: number;
  completedCount: number;
  failedCount: number;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  errorLog: string | null;
}

interface AiAgentPanelProps {
  surveyId: string;
  surveyTitle: string;
  surveyType: string;
  surveyStatus: string;
  hasApiKey: boolean;
  savedProvider: string | null;
  savedModel: string | null;
  canEdit: boolean;
  initialRuns: AiAgentRun[];
}

interface ProgressState {
  running: boolean;
  currentSession: number;
  totalSessions: number;
  currentStep: number;
  totalSteps: number;
  status: string;
}

export function AiAgentPanel({
  surveyId,
  surveyTitle,
  surveyType,
  surveyStatus,
  hasApiKey: initialHasApiKey,
  savedProvider,
  savedModel,
  canEdit,
  initialRuns,
}: AiAgentPanelProps) {
  // Config state
  const [provider, setProvider] = useState(savedProvider ?? "openai");
  const [model, setModel] = useState(savedModel ?? "");
  const [apiKey, setApiKey] = useState("");
  const [hasApiKey, setHasApiKey] = useState(initialHasApiKey);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Run state
  const [persona, setPersona] = useState(AI_PERSONAS[0].id);
  const [sessionCount, setSessionCount] = useState(1);
  const [runs, setRuns] = useState<AiAgentRun[]>(initialRuns);

  // Progress state
  const [progress, setProgress] = useState<ProgressState>({
    running: false,
    currentSession: 0,
    totalSessions: 0,
    currentStep: 0,
    totalSteps: 0,
    status: "",
  });

  const selectedProvider = AI_PROVIDERS.find((p) => p.id === provider);
  const effectiveModel = model || selectedProvider?.defaultModel || "";

  const handleSaveSettings = useCallback(async () => {
    if (!apiKey && !hasApiKey) return;
    setSaving(true);
    setSaveMessage("");
    try {
      await updateAiSettings({
        surveyId,
        aiApiKey: apiKey || "__KEEP__",
        aiProvider: provider,
        aiModel: effectiveModel,
      });
      if (apiKey) {
        setHasApiKey(true);
        setApiKey("");
      }
      setSaveMessage("Saved");
      setTimeout(() => setSaveMessage(""), 2000);
    } catch (e) {
      setSaveMessage(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [apiKey, hasApiKey, surveyId, provider, effectiveModel]);

  const handleRun = useCallback(async () => {
    if (!hasApiKey || progress.running) return;
    if (surveyStatus !== "LIVE") return;

    // Save provider/model before running
    try {
      await updateAiSettings({
        surveyId,
        aiApiKey: "__KEEP__",
        aiProvider: provider,
        aiModel: effectiveModel,
      });
    } catch {
      // Continue anyway
    }

    setProgress({
      running: true,
      currentSession: 0,
      totalSessions: sessionCount,
      currentStep: 0,
      totalSteps: 0,
      status: "Starting...",
    });

    try {
      const { runId } = await createAiAgentRun({
        surveyId,
        provider,
        model: effectiveModel,
        persona,
        sessionCount,
      });

      for (let i = 0; i < sessionCount; i++) {
        setProgress((p) => ({
          ...p,
          currentSession: i + 1,
          currentStep: 0,
          totalSteps: 0,
          status: `Creating session ${i + 1}/${sessionCount}...`,
        }));

        let sessionId: string;
        try {
          const sessionResult = await createAiSession({
            surveyId,
            runId,
            provider,
            model: effectiveModel,
            persona,
          });
          sessionId = sessionResult.sessionId;

          if (surveyType === "QUESTIONNAIRE") {
            const questions = sessionResult.questions;
            const totalSteps = questions.length;
            setProgress((p) => ({ ...p, totalSteps }));

            for (let q = 0; q < questions.length; q++) {
              setProgress((p) => ({
                ...p,
                currentStep: q + 1,
                status: questions[q].isVerificationPoint
                  ? `Session ${i + 1}: Skipping VP ${q + 1}/${totalSteps}`
                  : `Session ${i + 1}: Question ${q + 1}/${totalSteps}`,
              }));

              await executeAiQuestion({
                surveyId,
                sessionId,
                questionId: questions[q].id,
                questionType: questions[q].type,
                questionContent: questions[q].content as Record<string, unknown>,
                isVerificationPoint: questions[q].isVerificationPoint,
                provider,
                model: effectiveModel,
                persona,
                surveyTitle,
              });

              // Rate limiting delay
              if (!questions[q].isVerificationPoint) {
                await delay(500);
              }
            }
          } else {
            // CJ survey
            const totalComparisons = sessionResult.totalComparisons;
            setProgress((p) => ({ ...p, totalSteps: totalComparisons }));

            for (let c = 0; c < totalComparisons; c++) {
              setProgress((p) => ({
                ...p,
                currentStep: c + 1,
                status: `Session ${i + 1}: Comparison ${c + 1}/${totalComparisons}`,
              }));

              const result = await executeAiComparison({
                surveyId,
                sessionId,
                comparisonIndex: c,
                provider,
                model: effectiveModel,
                persona,
                surveyTitle,
                cjPrompt: sessionResult.cjPrompt ?? "Which is better?",
                cjJudgeInstructions: sessionResult.cjJudgeInstructions ?? null,
              });

              if (result.noPairsLeft) break;

              // Rate limiting delay
              await delay(500);
            }
          }

          await completeAiSession({ sessionId, runId, surveyId });
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : "Unknown error";
          try {
            await failAiSession({
              sessionId: sessionId!,
              runId,
              error: `Session ${i + 1}: ${errMsg}`,
            });
          } catch {
            // If we couldn't even create the session, just log
          }
        }
      }

      await completeAiAgentRun({ runId, surveyId });

      // Refresh runs list
      const personaObj = AI_PERSONAS.find((p) => p.id === persona);
      setRuns((prev) => [
        {
          id: runId,
          provider,
          model: effectiveModel,
          persona: personaObj?.name ?? persona,
          sessionCount,
          completedCount: sessionCount,
          failedCount: 0,
          status: "COMPLETED",
          startedAt: new Date(),
          completedAt: new Date(),
          errorLog: null,
        },
        ...prev,
      ]);

      setProgress((p) => ({ ...p, running: false, status: "Done!" }));
    } catch (e) {
      setProgress((p) => ({
        ...p,
        running: false,
        status: `Error: ${e instanceof Error ? e.message : "Unknown error"}`,
      }));
    }
  }, [hasApiKey, progress.running, surveyStatus, surveyId, provider, effectiveModel, persona, sessionCount, surveyTitle, surveyType]);

  const isLive = surveyStatus === "LIVE";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AI Agent
        </h2>
        <p className="text-sm text-muted-foreground">
          Generate synthetic survey responses using AI personas.
        </p>
      </div>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" />
            Configuration
          </CardTitle>
          <CardDescription>
            Select your LLM provider and configure your API key.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={provider} onValueChange={(v) => { setProvider(v); setModel(""); }} disabled={!canEdit}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_PROVIDERS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Select value={effectiveModel} onValueChange={setModel} disabled={!canEdit}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedProvider?.models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>API Key</Label>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder={hasApiKey ? "••••••••••••••••" : "Enter API key..."}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={!canEdit}
              />
              <Button
                size="sm"
                onClick={handleSaveSettings}
                disabled={saving || !canEdit || (!apiKey && !hasApiKey)}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
            {saveMessage && (
              <p className={`text-xs ${saveMessage === "Saved" ? "text-green-600" : "text-red-600"}`}>
                {saveMessage}
              </p>
            )}
            {hasApiKey && !apiKey && (
              <p className="text-xs text-muted-foreground">API key is configured. Enter a new key to update.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Run Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Play className="h-4 w-4" />
            Run AI Agent
          </CardTitle>
          <CardDescription>
            Select a persona and number of sessions to generate.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Persona</Label>
            <Select value={persona} onValueChange={setPersona} disabled={!canEdit || progress.running}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_PERSONAS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span>{p.name}</span>
                    <span className="text-muted-foreground ml-2 text-xs">— {p.description}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Number of Sessions</Label>
            <div className="flex gap-2">
              {[1, 5, 10].map((n) => (
                <Button
                  key={n}
                  size="sm"
                  variant={sessionCount === n ? "default" : "outline"}
                  onClick={() => setSessionCount(n)}
                  disabled={progress.running}
                >
                  {n}
                </Button>
              ))}
              <Input
                type="number"
                min={1}
                max={50}
                value={sessionCount}
                onChange={(e) => setSessionCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                className="w-20"
                disabled={progress.running}
              />
            </div>
          </div>
          <Button
            onClick={handleRun}
            disabled={!canEdit || !hasApiKey || !isLive || progress.running}
            className="w-full"
          >
            {progress.running ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run AI Agent
              </>
            )}
          </Button>
          {!isLive && (
            <p className="text-xs text-muted-foreground">Survey must be live to run the AI agent.</p>
          )}
          {!hasApiKey && isLive && (
            <p className="text-xs text-muted-foreground">Configure an API key above first.</p>
          )}
        </CardContent>
      </Card>

      {/* Progress Card */}
      {(progress.running || progress.status) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">{progress.status}</p>
            {progress.totalSessions > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Session {progress.currentSession}/{progress.totalSessions}</span>
                  {progress.totalSteps > 0 && (
                    <span>Step {progress.currentStep}/{progress.totalSteps}</span>
                  )}
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{
                      width: `${progress.totalSteps > 0
                        ? (((progress.currentSession - 1) * progress.totalSteps + progress.currentStep) /
                            (progress.totalSessions * progress.totalSteps)) *
                          100
                        : (progress.currentSession / progress.totalSessions) * 100
                      }%`,
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Run History Card */}
      {runs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Run History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {runs.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{run.persona}</span>
                      <Badge variant="outline" className="text-xs">
                        {run.provider}/{run.model}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {run.completedCount}/{run.sessionCount} sessions
                      {run.failedCount > 0 && ` (${run.failedCount} failed)`}
                      {" · "}
                      {new Date(run.startedAt).toLocaleString()}
                    </p>
                  </div>
                  <RunStatusBadge status={run.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RunStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "COMPLETED":
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle className="mr-1 h-3 w-3" />
          Completed
        </Badge>
      );
    case "FAILED":
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          <XCircle className="mr-1 h-3 w-3" />
          Failed
        </Badge>
      );
    case "RUNNING":
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Running
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
