"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bot, Key, Play, CheckCircle, XCircle, Loader2, Search, PenLine, UserCheck, FileText, Link } from "lucide-react";
import { AI_PROVIDERS } from "@/lib/ai/providers";
import { AI_PERSONAS, resolvePersonaName } from "@/lib/ai/personas";
import { AddJudgeDialog } from "@/components/dashboard/add-judge-dialog";
import { CatalogPersonaDialog } from "@/components/dashboard/catalog-persona-dialog";
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
import { generatePersonaFromSession } from "@/lib/actions/generate-judge-persona";

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

export interface JudgePersona {
  id: string;
  name: string;
  title: string;
  description: string;
  cvFileName: string;
  createdAt: string;
  createdBy?: { name: string | null; email: string | null };
}

export interface SurveyJudge {
  sessionId: string;
  participantEmail: string | null;
  jobTitle: string | null;
  employer: string | null;
  cvFileName: string | null;
  completedAt: string | null;
  comparisonCount: number;
  generatedPersonaId: string | null;
}

interface NemotronResult {
  index: number;
  uuid: string;
  professionalPersona: string;
  persona: string;
  sex: string;
  age: number;
  educationLevel: string;
  occupation: string;
  city: string;
  state: string;
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
  initialJudgePersonas?: JudgePersona[];
  initialSurveyJudges?: SurveyJudge[];
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
  initialJudgePersonas = [],
  initialSurveyJudges = [],
}: AiAgentPanelProps) {
  // Config state
  const [provider, setProvider] = useState(savedProvider ?? "openai");
  const [model, setModel] = useState(savedModel ?? "");
  const [apiKey, setApiKey] = useState("");
  const [hasApiKey, setHasApiKey] = useState(initialHasApiKey);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Run state
  const [personaMode, setPersonaMode] = useState<"preset" | "nemotron" | "custom" | "judge">("preset");
  const [presetPersona, setPresetPersona] = useState(AI_PERSONAS[0].id);
  const [nemQuery, setNemQuery] = useState("");
  const [nemResults, setNemResults] = useState<NemotronResult[]>([]);
  const [nemSelected, setNemSelected] = useState<NemotronResult | null>(null);
  const [nemSearching, setNemSearching] = useState(false);
  const [nemUrl, setNemUrl] = useState("");
  const [nemSuggesting, setNemSuggesting] = useState(false);
  const [nemSuggestError, setNemSuggestError] = useState("");
  const [customPersona, setCustomPersona] = useState("");
  const [sessionCount, setSessionCount] = useState(1);
  const [runs, setRuns] = useState<AiAgentRun[]>(initialRuns);

  // Judge state
  const [judgePersonas, setJudgePersonas] = useState<JudgePersona[]>(initialJudgePersonas);
  const [selectedJudge, setSelectedJudge] = useState<string | null>(
    initialJudgePersonas.length > 0 ? initialJudgePersonas[0].id : null,
  );
  const [addJudgeOpen, setAddJudgeOpen] = useState(false);

  // Survey judges state
  const [surveyJudges, setSurveyJudges] = useState<SurveyJudge[]>(initialSurveyJudges);
  const [generatingPersonaFor, setGeneratingPersonaFor] = useState<string | null>(null);

  // Catalog detail dialog state
  const [catalogDetailSlug, setCatalogDetailSlug] = useState<string | null>(null);
  const [catalogDetailOpen, setCatalogDetailOpen] = useState(false);

  // Compute the effective persona value based on the selected mode
  const persona =
    personaMode === "preset"
      ? presetPersona
      : personaMode === "nemotron"
        ? nemSelected ? `nemotron:${nemSelected.professionalPersona}` : ""
        : personaMode === "judge"
          ? selectedJudge ? `judge:${selectedJudge}` : ""
          : customPersona.trim() ? `custom:${customPersona.trim()}` : "";

  const personaValid = persona.length > 0;

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

  const handleNemotronSearch = useCallback(async () => {
    if (!nemQuery.trim() || nemSearching) return;
    setNemSearching(true);
    setNemResults([]);
    setNemSelected(null);
    try {
      const res = await fetch(`/api/ai/persona-search?q=${encodeURIComponent(nemQuery.trim())}&limit=10`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setNemResults(data.results ?? []);
    } catch {
      setNemResults([]);
    } finally {
      setNemSearching(false);
    }
  }, [nemQuery, nemSearching]);

  const handleNemotronSuggest = useCallback(async () => {
    if (!nemUrl.trim() || nemSuggesting || !hasApiKey) return;
    setNemSuggesting(true);
    setNemSuggestError("");
    setNemResults([]);
    setNemSelected(null);
    try {
      const res = await fetch("/api/ai/nemotron-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: nemUrl.trim(), surveyId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Suggestion failed" }));
        throw new Error(data.error || "Suggestion failed");
      }
      const data = await res.json();
      setNemResults(data.results ?? []);
      if (data.suggestion?.searchQuery) {
        setNemQuery(data.suggestion.searchQuery);
      }
    } catch (e) {
      setNemSuggestError(e instanceof Error ? e.message : "Suggestion failed");
    } finally {
      setNemSuggesting(false);
    }
  }, [nemUrl, nemSuggesting, hasApiKey, surveyId]);

  const handleCreateJudge = useCallback((newPersona: JudgePersona) => {
    setJudgePersonas((prev) => [newPersona, ...prev]);
    setSelectedJudge(newPersona.id);
  }, []);


  const handleGenerateFromSession = useCallback(async (sessionId: string) => {
    setGeneratingPersonaFor(sessionId);
    try {
      const { persona } = await generatePersonaFromSession({ surveyId, sessionId });
      const newPersona: JudgePersona = {
        id: persona.id,
        name: persona.name,
        title: persona.title,
        description: persona.description,
        cvFileName: persona.cvFileName,
        createdAt: persona.createdAt,
      };
      setJudgePersonas((prev) => [newPersona, ...prev]);
      setSelectedJudge(newPersona.id);
      setSurveyJudges((prev) =>
        prev.map((j) =>
          j.sessionId === sessionId ? { ...j, generatedPersonaId: persona.id } : j,
        ),
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to generate persona");
    } finally {
      setGeneratingPersonaFor(null);
    }
  }, [surveyId]);

  const handleRun = useCallback(async () => {
    if (!hasApiKey || progress.running || !personaValid) return;
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

    // Resolve display name for run history
    const displayName = personaMode === "judge"
      ? judgePersonas.find((j) => j.id === selectedJudge)?.name ?? "Judge Persona"
      : resolvePersonaName(persona);

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
            ...(personaMode === "nemotron" && nemSelected ? {
              demographics: {
                jobTitle: nemSelected.occupation.replace(/_/g, " "),
                city: nemSelected.city,
                state: nemSelected.state,
                age: nemSelected.age,
                sex: nemSelected.sex,
                educationLevel: nemSelected.educationLevel,
              },
            } : {}),
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
      setRuns((prev) => [
        {
          id: runId,
          provider,
          model: effectiveModel,
          persona: displayName,
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
  }, [hasApiKey, progress.running, personaValid, surveyStatus, surveyId, provider, effectiveModel, persona, sessionCount, surveyTitle, surveyType, personaMode, judgePersonas, selectedJudge, nemSelected]);

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
              <p className="text-xs text-muted-foreground">Your API key is configured. Enter a new key to update.</p>
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
            <Tabs value={personaMode} onValueChange={(v) => setPersonaMode(v as typeof personaMode)}>
              <TabsList className="w-full">
                <TabsTrigger value="preset" disabled={progress.running}>SurveySeal Catalog</TabsTrigger>
                <TabsTrigger value="nemotron" disabled={progress.running} className="gap-1">
                  <Search className="h-3 w-3" />
                  Nemotron
                </TabsTrigger>
                <TabsTrigger value="custom" disabled={progress.running} className="gap-1">
                  <PenLine className="h-3 w-3" />
                  Custom
                </TabsTrigger>
                <TabsTrigger value="judge" disabled={progress.running} className="gap-1">
                  <UserCheck className="h-3 w-3" />
                  Judges
                </TabsTrigger>
              </TabsList>

              <TabsContent value="preset">
                <div className="max-h-56 overflow-y-auto rounded-md border divide-y">
                  {AI_PERSONAS.map((p) => (
                    <label
                      key={p.id}
                      className={`flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 text-sm ${
                        presetPersona === p.id ? "bg-muted" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="preset-persona"
                        className="mt-1 shrink-0"
                        checked={presetPersona === p.id}
                        onChange={() => setPresetPersona(p.id)}
                        disabled={!canEdit || progress.running}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{p.name}</div>
                        {(p.title || p.employer || p.location) && (
                          <div className="text-xs text-muted-foreground">
                            {[p.title, p.employer, p.location].filter(Boolean).join(" · ")}
                          </div>
                        )}
                      </div>
                      {p.catalogSlug && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="shrink-0 h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setCatalogDetailSlug(p.catalogSlug!);
                            setCatalogDetailOpen(true);
                          }}
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </label>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="nemotron" className="space-y-3">
                {/* Free-text search */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Search Nemotron personas (e.g. &quot;software engineer&quot;)..."
                    value={nemQuery}
                    onChange={(e) => setNemQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleNemotronSearch()}
                    disabled={nemSearching || progress.running}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleNemotronSearch}
                    disabled={!nemQuery.trim() || nemSearching || progress.running}
                  >
                    {nemSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>

                {/* URL suggestion */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Paste a URL to suggest personas..."
                    value={nemUrl}
                    onChange={(e) => setNemUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleNemotronSuggest()}
                    disabled={nemSuggesting || progress.running || !hasApiKey}
                    className="text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleNemotronSuggest}
                    disabled={!nemUrl.trim() || nemSuggesting || progress.running || !hasApiKey}
                    title={!hasApiKey ? "Configure API key first" : "Suggest personas from URL"}
                  >
                    {nemSuggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link className="h-4 w-4" />}
                  </Button>
                </div>
                {nemSuggestError && (
                  <p className="text-xs text-red-600">{nemSuggestError}</p>
                )}

                {/* Results */}
                {nemResults.length > 0 && (
                  <div className="max-h-56 overflow-y-auto rounded-md border divide-y">
                    {nemResults.map((r) => (
                      <label
                        key={r.index}
                        className={`flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 text-sm ${
                          nemSelected?.index === r.index ? "bg-muted" : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="nem-persona"
                          className="mt-1 shrink-0"
                          checked={nemSelected?.index === r.index}
                          onChange={() => setNemSelected(r)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-xs">
                            {r.occupation.replace(/_/g, " ")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {r.city}, {r.state} · {r.age}{r.sex === "Male" ? "M" : "F"} · {r.educationLevel}
                          </div>
                          <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {r.professionalPersona}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                {nemResults.length === 0 && nemQuery && !nemSearching && !nemSuggesting && (
                  <p className="text-xs text-muted-foreground">No results. Try a different search term.</p>
                )}
              </TabsContent>

              <TabsContent value="custom">
                <Textarea
                  placeholder="Describe your persona (e.g. &quot;A first-year medical student who is skeptical of surveys but answers thoughtfully...&quot;)"
                  value={customPersona}
                  onChange={(e) => setCustomPersona(e.target.value)}
                  disabled={progress.running}
                  rows={3}
                />
              </TabsContent>

              <TabsContent value="judge" className="space-y-3">
                {/* Survey Judges — completed human judges with CVs */}
                {surveyJudges.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Survey Judges
                    </div>
                    <div className="max-h-48 overflow-y-auto rounded-md border divide-y">
                      {surveyJudges.map((sj) => (
                        <div
                          key={sj.sessionId}
                          className="flex items-center gap-2 px-3 py-2 text-sm"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">
                              {sj.jobTitle && sj.employer
                                ? `${sj.jobTitle} at ${sj.employer}`
                                : sj.jobTitle || sj.employer || sj.participantEmail || "Anonymous Judge"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {sj.comparisonCount} comparison{sj.comparisonCount !== 1 ? "s" : ""}
                              {sj.cvFileName && ` · ${sj.cvFileName}`}
                            </div>
                          </div>
                          {sj.generatedPersonaId ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100 shrink-0">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Generated
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0 gap-1"
                              onClick={() => handleGenerateFromSession(sj.sessionId)}
                              disabled={generatingPersonaFor !== null || progress.running}
                            >
                              {generatingPersonaFor === sj.sessionId ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Bot className="h-3.5 w-3.5" />
                              )}
                              Generate Persona
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </TabsContent>
            </Tabs>
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
            disabled={!canEdit || !hasApiKey || !isLive || progress.running || !personaValid}
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
            <p className="text-xs text-muted-foreground">Configure your API key above first.</p>
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

      {/* Add Judge Dialog */}
      <AddJudgeDialog
        open={addJudgeOpen}
        onOpenChange={setAddJudgeOpen}
        onCreate={handleCreateJudge}
      />

      {/* Catalog Persona Detail Dialog */}
      {catalogDetailSlug && (
        <CatalogPersonaDialog
          open={catalogDetailOpen}
          onOpenChange={setCatalogDetailOpen}
          slug={catalogDetailSlug}
        />
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
