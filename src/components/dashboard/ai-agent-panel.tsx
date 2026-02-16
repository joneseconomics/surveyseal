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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bot, Key, Play, CheckCircle, XCircle, Loader2, Search, PenLine, UserCheck, FileText, ChevronDown, X, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { generatePersonaFromSession, combineSessionsIntoPersona } from "@/lib/actions/generate-judge-persona";

interface AiAgentRun {
  id: string;
  provider: string;
  model: string;
  persona: string;
  sessionCount: number;
  completedCount: number;
  failedCount: number;
  status: string;
  startedAt: string;
  completedAt: string | null;
  errorLog: string | null;
}

export interface JudgePersona {
  id: string;
  name: string;
  title: string;
  description: string;
  cvText?: string;
  cvFileName: string;
  isCatalog?: boolean;
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


const EDUCATION_LABELS: Record<string, string> = {
  less_than_9th: "Less than 9th",
  "9th_12th_no_diploma": "9th-12th",
  high_school: "High School",
  some_college: "Some College",
  associates: "Associate's",
  bachelors: "Bachelor's",
  graduate: "Graduate",
};

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

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
  const [nemSelected, setNemSelected] = useState<NemotronResult[]>([]);
  const [nemSearching, setNemSearching] = useState(false);
  const [nemFilters, setNemFilters] = useState<{
    sex: string;
    ageMin: string;
    ageMax: string;
    minEducation: string;
    states: string[];
    city: string;
  }>({ sex: "", ageMin: "", ageMax: "", minEducation: "", states: [], city: "" });
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
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [combining, setCombining] = useState(false);

  // Rename persona state
  const [renamingPersonaId, setRenamingPersonaId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Catalog detail dialog state
  const [catalogDetailSlug, setCatalogDetailSlug] = useState<string | null>(null);
  const [catalogDetailOpen, setCatalogDetailOpen] = useState(false);

  // Judge persona detail dialog state
  const [judgeDetailPersona, setJudgeDetailPersona] = useState<JudgePersona | null>(null);

  // Compute the effective persona value based on the selected mode
  // For nemotron, persona is derived per-run in handleRun; this is for other modes
  const persona =
    personaMode === "preset"
      ? presetPersona
      : personaMode === "nemotron"
        ? nemSelected.length > 0 ? `nemotron:${nemSelected[0].professionalPersona}` : ""
        : personaMode === "judge"
          ? selectedJudge ? `judge:${selectedJudge}` : ""
          : customPersona.trim() ? `custom:${customPersona.trim()}` : "";

  const personaValid =
    personaMode === "nemotron" ? nemSelected.length > 0 : persona.length > 0;

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
    const hasQuery = nemQuery.trim();
    const hasFilters = nemFilters.sex || nemFilters.ageMin || nemFilters.ageMax ||
      nemFilters.minEducation || nemFilters.states.length > 0 || nemFilters.city;
    if ((!hasQuery && !hasFilters) || nemSearching) return;
    setNemSearching(true);
    setNemResults([]);
    setNemSelected([]);
    try {
      const p = new URLSearchParams();
      if (hasQuery) p.set("q", nemQuery.trim());
      p.set("limit", "10");
      if (nemFilters.sex) p.set("sex", nemFilters.sex);
      if (nemFilters.ageMin) p.set("ageMin", nemFilters.ageMin);
      if (nemFilters.ageMax) p.set("ageMax", nemFilters.ageMax);
      if (nemFilters.minEducation) p.set("minEducation", nemFilters.minEducation);
      if (nemFilters.states.length > 0) p.set("state", nemFilters.states.join(","));
      if (nemFilters.city) p.set("city", nemFilters.city);
      const res = await fetch(`/api/ai/persona-search?${p.toString()}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setNemResults(data.results ?? []);
    } catch {
      setNemResults([]);
    } finally {
      setNemSearching(false);
    }
  }, [nemQuery, nemFilters, nemSearching]);

  const handleCreateJudge = useCallback((newPersona: JudgePersona) => {
    setJudgePersonas((prev) => [newPersona, ...prev]);
    setSelectedJudge(newPersona.id);
  }, []);


  const handleGenerateFromSession = useCallback(async (sessionId: string) => {
    setGeneratingPersonaFor(sessionId);
    try {
      const result = await generatePersonaFromSession({ surveyId, sessionId });
      if (!result.success) {
        alert(result.error);
        return;
      }
      const updatedPersona: JudgePersona = {
        id: result.persona.id,
        name: result.persona.name,
        title: result.persona.title,
        description: result.persona.description,
        cvText: result.persona.cvText,
        cvFileName: result.persona.cvFileName,
        createdAt: result.persona.createdAt,
      };
      setJudgePersonas((prev) => {
        const existingIdx = prev.findIndex((p) => p.id === updatedPersona.id);
        if (existingIdx >= 0) {
          // Update existing persona in place
          const copy = [...prev];
          copy[existingIdx] = updatedPersona;
          return copy;
        }
        return [updatedPersona, ...prev];
      });
      setSelectedJudge(updatedPersona.id);
      // Mark all sessions with the same email as having a generated persona
      const clickedJudge = surveyJudges.find((j) => j.sessionId === sessionId);
      const clickedEmail = clickedJudge?.participantEmail;
      setSurveyJudges((prev) =>
        prev.map((j) => {
          if (j.sessionId === sessionId) {
            return { ...j, generatedPersonaId: result.persona.id };
          }
          if (clickedEmail && j.participantEmail === clickedEmail) {
            return { ...j, generatedPersonaId: result.persona.id };
          }
          return j;
        }),
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to generate persona");
    } finally {
      setGeneratingPersonaFor(null);
    }
  }, [surveyId, surveyJudges]);

  const handleCombineSessions = useCallback(async () => {
    if (selectedSessions.length < 2 || combining) return;
    setCombining(true);
    try {
      const result = await combineSessionsIntoPersona({ surveyId, sessionIds: selectedSessions });
      if (!result.success) {
        alert(result.error);
        return;
      }
      const newPersona: JudgePersona = {
        id: result.persona.id,
        name: result.persona.name,
        title: result.persona.title,
        description: result.persona.description,
        cvText: result.persona.cvText,
        cvFileName: result.persona.cvFileName,
        createdAt: result.persona.createdAt,
      };
      setJudgePersonas((prev) => [newPersona, ...prev]);
      setSelectedJudge(newPersona.id);
      // Mark all selected sessions as generated
      setSurveyJudges((prev) =>
        prev.map((j) =>
          selectedSessions.includes(j.sessionId)
            ? { ...j, generatedPersonaId: result.persona.id }
            : j,
        ),
      );
      setSelectedSessions([]);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to combine sessions");
    } finally {
      setCombining(false);
    }
  }, [surveyId, selectedSessions, combining]);

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

    // Build list of personas to run
    // For nemotron multi-select, each selected persona gets its own run
    // For other modes, a single persona/run
    const personasToRun: { personaValue: string; displayName: string; demographics?: {
      jobTitle: string; city: string; state: string; age: number; sex: string; educationLevel: string;
    } }[] = [];

    if (personaMode === "nemotron") {
      for (const nem of nemSelected) {
        personasToRun.push({
          personaValue: `nemotron:${nem.professionalPersona}`,
          displayName: resolvePersonaName(`nemotron:${nem.professionalPersona}`),
          demographics: {
            jobTitle: nem.occupation.replace(/_/g, " "),
            city: nem.city,
            state: nem.state,
            age: nem.age,
            sex: nem.sex,
            educationLevel: nem.educationLevel,
          },
        });
      }
    } else {
      const displayName = personaMode === "judge"
        ? judgePersonas.find((j) => j.id === selectedJudge)?.name ?? "Judge Persona"
        : resolvePersonaName(persona);
      personasToRun.push({ personaValue: persona, displayName });
    }

    const totalSessions = personasToRun.length * sessionCount;

    setProgress({
      running: true,
      currentSession: 0,
      totalSessions,
      currentStep: 0,
      totalSteps: 0,
      status: "Starting...",
    });

    let globalSession = 0;
    const newRuns: AiAgentRun[] = [];

    for (const p of personasToRun) {
      const runResult = await createAiAgentRun({
        surveyId,
        provider,
        model: effectiveModel,
        persona: p.personaValue,
        sessionCount,
      });

      if ("error" in runResult) {
        setProgress((prev) => ({
          ...prev,
          status: `Error (${p.displayName}): ${runResult.error}`,
        }));
        continue;
      }

      const { runId } = runResult;

      for (let i = 0; i < sessionCount; i++) {
        globalSession++;
        setProgress((prev) => ({
          ...prev,
          currentSession: globalSession,
          currentStep: 0,
          totalSteps: 0,
          status: `${p.displayName} — session ${i + 1}/${sessionCount}...`,
        }));

        let sessionId: string | undefined;
        try {
          const sessionResult = await createAiSession({
            surveyId,
            runId,
            provider,
            model: effectiveModel,
            persona: p.personaValue,
            ...(p.demographics ? { demographics: p.demographics } : {}),
          });

          if ("error" in sessionResult) {
            throw new Error(sessionResult.error);
          }

          sessionId = sessionResult.sessionId;

          if (surveyType === "QUESTIONNAIRE") {
            const questions = sessionResult.questions;
            const totalSteps = questions.length;
            setProgress((prev) => ({ ...prev, totalSteps }));

            for (let q = 0; q < questions.length; q++) {
              setProgress((prev) => ({
                ...prev,
                currentStep: q + 1,
                status: questions[q].isVerificationPoint
                  ? `${p.displayName} — session ${i + 1}: Skipping VP ${q + 1}/${totalSteps}`
                  : `${p.displayName} — session ${i + 1}: Q ${q + 1}/${totalSteps}`,
              }));

              const qResult = await executeAiQuestion({
                surveyId,
                sessionId,
                questionId: questions[q].id,
                questionType: questions[q].type,
                questionContent: questions[q].content as Record<string, unknown>,
                isVerificationPoint: questions[q].isVerificationPoint,
                provider,
                model: effectiveModel,
                persona: p.personaValue,
                surveyTitle,
              });

              if ("error" in qResult) {
                throw new Error(qResult.error);
              }

              if (!questions[q].isVerificationPoint) {
                await delay(500);
              }
            }
          } else {
            // CJ survey
            const totalComparisons = sessionResult.totalComparisons;
            setProgress((prev) => ({ ...prev, totalSteps: totalComparisons }));

            for (let c = 0; c < totalComparisons; c++) {
              setProgress((prev) => ({
                ...prev,
                currentStep: c + 1,
                status: `${p.displayName} — session ${i + 1}: Comparison ${c + 1}/${totalComparisons}`,
              }));

              const cResult = await executeAiComparison({
                surveyId,
                sessionId,
                comparisonIndex: c,
                provider,
                model: effectiveModel,
                persona: p.personaValue,
                surveyTitle,
                cjPrompt: sessionResult.cjPrompt ?? "Which is better?",
                cjJudgeInstructions: sessionResult.cjJudgeInstructions ?? null,
              });

              if ("error" in cResult) {
                throw new Error(cResult.error);
              }

              if (cResult.noPairsLeft) break;
              await delay(500);
            }
          }

          const completeResult = await completeAiSession({ sessionId, runId, surveyId });
          if ("error" in completeResult) {
            throw new Error(completeResult.error);
          }
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : "Unknown error";
          if (sessionId) {
            await failAiSession({
              sessionId,
              runId,
              error: `Session ${i + 1}: ${errMsg}`,
            });
          }
        }
      }

      await completeAiAgentRun({ runId, surveyId });

      newRuns.push({
        id: runId,
        provider,
        model: effectiveModel,
        persona: p.displayName,
        sessionCount,
        completedCount: sessionCount,
        failedCount: 0,
        status: "COMPLETED",
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        errorLog: null,
      });
    }

    setRuns((prev) => [...newRuns, ...prev]);
    setProgress((prev) => ({ ...prev, running: false, status: "Done!" }));
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
                  {judgePersonas.filter((jp) => jp.isCatalog).map((jp) => {
                    const catalogId = `judge:${jp.id}`;
                    return (
                      <label
                        key={catalogId}
                        className={`flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 text-sm ${
                          presetPersona === catalogId ? "bg-muted" : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="preset-persona"
                          className="mt-1 shrink-0"
                          checked={presetPersona === catalogId}
                          onChange={() => setPresetPersona(catalogId)}
                          disabled={!canEdit || progress.running}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{jp.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {jp.title}
                            {jp.cvFileName && ` · ${jp.cvFileName}`}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-auto gap-1 px-1.5 py-1 text-xs text-muted-foreground hover:text-primary"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setJudgeDetailPersona(jp);
                          }}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          System Prompt
                        </Button>
                      </label>
                    );
                  })}
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
                    disabled={nemSearching || progress.running}
                  >
                    {nemSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Sex</Label>
                    <Select
                      value={nemFilters.sex || "__any"}
                      onValueChange={(v) => setNemFilters((f) => ({ ...f, sex: v === "__any" ? "" : v }))}
                      disabled={progress.running}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__any">Either</SelectItem>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Age Min</Label>
                    <Input
                      type="number"
                      min={18}
                      max={100}
                      placeholder="18"
                      value={nemFilters.ageMin}
                      onChange={(e) => setNemFilters((f) => ({ ...f, ageMin: e.target.value }))}
                      disabled={progress.running}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Age Max</Label>
                    <Input
                      type="number"
                      min={18}
                      max={100}
                      placeholder="100"
                      value={nemFilters.ageMax}
                      onChange={(e) => setNemFilters((f) => ({ ...f, ageMax: e.target.value }))}
                      disabled={progress.running}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Min. Education</Label>
                    <Select
                      value={nemFilters.minEducation || "__any"}
                      onValueChange={(v) => setNemFilters((f) => ({ ...f, minEducation: v === "__any" ? "" : v }))}
                      disabled={progress.running}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__any">Any</SelectItem>
                        <SelectItem value="less_than_9th">Less than 9th Grade</SelectItem>
                        <SelectItem value="9th_12th_no_diploma">9th-12th (No Diploma)</SelectItem>
                        <SelectItem value="high_school">High School</SelectItem>
                        <SelectItem value="some_college">Some College</SelectItem>
                        <SelectItem value="associates">Associate&apos;s</SelectItem>
                        <SelectItem value="bachelors">Bachelor&apos;s</SelectItem>
                        <SelectItem value="graduate">Graduate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">States</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild disabled={progress.running}>
                        <Button variant="outline" className="h-8 w-full justify-between text-xs font-normal">
                          {nemFilters.states.length === 0
                            ? "Any"
                            : nemFilters.states.length <= 3
                              ? nemFilters.states.join(", ")
                              : `${nemFilters.states.length} selected`}
                          <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="max-h-56 overflow-y-auto w-24">
                        {US_STATES.map((s) => (
                          <DropdownMenuCheckboxItem
                            key={s}
                            checked={nemFilters.states.includes(s)}
                            onCheckedChange={(checked) =>
                              setNemFilters((f) => ({
                                ...f,
                                states: checked
                                  ? [...f.states, s]
                                  : f.states.filter((st) => st !== s),
                              }))
                            }
                            onSelect={(e) => e.preventDefault()}
                          >
                            {s}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {nemFilters.states.length > 0 && (
                      <button
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                        onClick={() => setNemFilters((f) => ({ ...f, states: [] }))}
                      >
                        <X className="h-3 w-3" /> Clear
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">City</Label>
                    <Input
                      placeholder="Any"
                      value={nemFilters.city}
                      onChange={(e) => setNemFilters((f) => ({ ...f, city: e.target.value }))}
                      disabled={progress.running}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {/* Results */}
                {nemResults.length > 0 && (
                  <div className="max-h-56 overflow-y-auto rounded-md border divide-y">
                    {nemSelected.length > 0 && (
                      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30">
                        <span className="text-xs text-muted-foreground">
                          {nemSelected.length} persona{nemSelected.length !== 1 ? "s" : ""} selected
                        </span>
                        <button
                          className="text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => setNemSelected([])}
                        >
                          Clear all
                        </button>
                      </div>
                    )}
                    {nemResults.map((r) => {
                      const isChecked = nemSelected.some((s) => s.index === r.index);
                      return (
                        <label
                          key={r.index}
                          className={`flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 text-sm ${
                            isChecked ? "bg-muted" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="mt-1 shrink-0"
                            checked={isChecked}
                            onChange={() =>
                              setNemSelected((prev) =>
                                isChecked
                                  ? prev.filter((s) => s.index !== r.index)
                                  : [...prev, r],
                              )
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-xs">
                              {r.occupation.replace(/_/g, " ")}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {r.city}, {r.state} · {r.age}{r.sex === "Male" ? "M" : "F"} · {EDUCATION_LABELS[r.educationLevel] || r.educationLevel}
                            </div>
                            <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                              {r.professionalPersona}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
                {nemResults.length === 0 && !nemSearching && (nemQuery || nemFilters.sex || nemFilters.states.length > 0 || nemFilters.minEducation || nemFilters.city || nemFilters.ageMin || nemFilters.ageMax) && (
                  <p className="text-xs text-muted-foreground">No results. Try different search terms or filters.</p>
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
                {/* Generated Judge Personas — selectable for running */}
                {judgePersonas.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Generated Personas
                    </div>
                    <div className="max-h-48 overflow-y-auto rounded-md border divide-y">
                      {judgePersonas.map((jp) => {
                        const countMatch = jp.description.match(/Comparison history \((\d+) judgments?\)/);
                        const compCount = countMatch ? parseInt(countMatch[1]) : 0;
                        const isRenaming = renamingPersonaId === jp.id;
                        return (
                          <label
                            key={jp.id}
                            className={`flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 text-sm ${
                              selectedJudge === jp.id ? "bg-muted" : ""
                            }`}
                          >
                            <input
                              type="radio"
                              name="judge-persona"
                              className="mt-1 shrink-0"
                              checked={selectedJudge === jp.id}
                              onChange={() => setSelectedJudge(jp.id)}
                              disabled={!canEdit || progress.running}
                            />
                            <div className="flex-1 min-w-0">
                              {isRenaming ? (
                                <form
                                  className="flex items-center gap-1"
                                  onSubmit={async (e) => {
                                    e.preventDefault();
                                    const trimmed = renameValue.trim();
                                    if (!trimmed || trimmed === jp.name) {
                                      setRenamingPersonaId(null);
                                      return;
                                    }
                                    const res = await fetch(`/api/ai/judge-personas/${jp.id}`, {
                                      method: "PATCH",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ name: trimmed }),
                                    });
                                    if (res.ok) {
                                      setJudgePersonas((prev) =>
                                        prev.map((p) => (p.id === jp.id ? { ...p, name: trimmed } : p)),
                                      );
                                    }
                                    setRenamingPersonaId(null);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Input
                                    autoFocus
                                    className="h-6 text-sm px-1"
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    onBlur={() => setRenamingPersonaId(null)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Escape") setRenamingPersonaId(null);
                                    }}
                                  />
                                </form>
                              ) : (
                                <div className="font-medium">{jp.name}</div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                {jp.title}
                                {compCount > 0 && ` · ${compCount} comparison${compCount !== 1 ? "s" : ""}`}
                                {jp.cvFileName && ` · ${jp.cvFileName}`}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setRenameValue(jp.name);
                                  setRenamingPersonaId(jp.id);
                                }}
                              >
                                <PenLine className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-auto gap-1 px-1.5 py-1 text-xs text-muted-foreground hover:text-primary"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setJudgeDetailPersona(jp);
                                }}
                              >
                                <FileText className="h-3.5 w-3.5" />
                                System Prompt
                              </Button>
                              <Button
                                size="sm"
                                variant={jp.isCatalog ? "default" : "outline"}
                                className="h-auto gap-1 px-1.5 py-1 text-xs"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const newValue = !jp.isCatalog;
                                  const res = await fetch(`/api/ai/judge-personas/${jp.id}`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ isCatalog: newValue }),
                                  });
                                  if (res.ok) {
                                    setJudgePersonas((prev) =>
                                      prev.map((p) =>
                                        p.id === jp.id ? { ...p, isCatalog: newValue } : p,
                                      ),
                                    );
                                  }
                                }}
                              >
                                <Globe className="h-3.5 w-3.5" />
                                {jp.isCatalog ? "In Catalog" : "Deploy to Catalog"}
                              </Button>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Survey Judges — completed human judges with CVs */}
                {surveyJudges.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Survey Judges
                      </div>
                      {selectedSessions.length >= 2 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-xs"
                          onClick={handleCombineSessions}
                          disabled={combining || progress.running}
                        >
                          {combining ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Bot className="h-3 w-3" />
                          )}
                          Combine {selectedSessions.length} into Persona
                        </Button>
                      )}
                    </div>
                    <div className="max-h-48 overflow-y-auto rounded-md border divide-y">
                      {surveyJudges.map((sj) => {
                        const isSelected = selectedSessions.includes(sj.sessionId);
                        return (
                          <div
                            key={sj.sessionId}
                            className="flex items-center gap-2 px-3 py-2 text-sm"
                          >
                            {!sj.generatedPersonaId && (
                              <input
                                type="checkbox"
                                className="shrink-0"
                                checked={isSelected}
                                onChange={() =>
                                  setSelectedSessions((prev) =>
                                    isSelected
                                      ? prev.filter((id) => id !== sj.sessionId)
                                      : [...prev, sj.sessionId],
                                  )
                                }
                                disabled={combining || progress.running}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium">
                                {sj.jobTitle && sj.employer
                                  ? `${sj.jobTitle} at ${sj.employer}`
                                  : sj.jobTitle || sj.employer || sj.participantEmail || "Anonymous Judge"}
                              </div>
                              {sj.participantEmail && (
                                <div className="text-xs text-muted-foreground">{sj.participantEmail}</div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                {sj.comparisonCount} comparison{sj.comparisonCount !== 1 ? "s" : ""}
                                {sj.cvFileName && ` · ${sj.cvFileName}`}
                              </div>
                              {sj.completedAt && (
                                <div className="text-xs text-muted-foreground">
                                  Completed {new Date(sj.completedAt).toLocaleString()}
                                </div>
                              )}
                            </div>
                            {sj.generatedPersonaId ? (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100 shrink-0">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Generated
                              </Badge>
                            ) : (() => {
                              const emailHasPersona = sj.participantEmail &&
                                surveyJudges.some((other) =>
                                  other.sessionId !== sj.sessionId &&
                                  other.participantEmail === sj.participantEmail &&
                                  other.generatedPersonaId,
                                );
                              return (
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
                                  {emailHasPersona ? "Update Persona" : "Generate Persona"}
                                </Button>
                              );
                            })()}
                          </div>
                        );
                      })}
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
                    {run.errorLog && (
                      <p className="text-xs text-red-600 mt-0.5">{run.errorLog}</p>
                    )}
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

      {/* Judge Persona System Prompt Dialog */}
      <Dialog open={!!judgeDetailPersona} onOpenChange={(open) => !open && setJudgeDetailPersona(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{judgeDetailPersona?.name ?? "Judge Persona"} — System Prompt</DialogTitle>
          </DialogHeader>
          {judgeDetailPersona && (
            <div className="overflow-y-auto flex-1 min-h-0 rounded-md border p-4 bg-muted/30">
              <pre className="whitespace-pre-wrap text-xs font-mono">
{`You are ${judgeDetailPersona.name}, ${judgeDetailPersona.title}. ${judgeDetailPersona.description}${
  judgeDetailPersona.cvText
    ? `\n\nYou are participating in a survey. Draw on your full professional background, expertise, and personality as reflected in your CV below.\n\n=== CURRICULUM VITAE ===\n${judgeDetailPersona.cvText}\n=== END CURRICULUM VITAE ===`
    : ""
}`}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>
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
