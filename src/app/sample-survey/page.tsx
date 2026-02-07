"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  ClipboardList,
  Smartphone,
  SkipForward,
  Timer,
} from "lucide-react";
import Link from "next/link";

type StepType =
  | { kind: "checkpoint"; checkpoint: number; label: string }
  | { kind: "question"; question: SurveyQuestion };

interface SurveyQuestion {
  id: number;
  question: string;
  type: "multiple_choice" | "likert" | "free_text";
  options?: string[];
  likertLabels?: { low: string; high: string };
  context?: string;
}

const surveyQuestions: SurveyQuestion[] = [
  {
    id: 1,
    question:
      "How confident are you that the online surveys you've taken recently were completed only by real humans?",
    type: "likert",
    likertLabels: { low: "Not at all confident", high: "Extremely confident" },
    context:
      "Research shows AI bots can now pass 99.8% of survey attention checks, making them nearly indistinguishable from human respondents.",
  },
  {
    id: 2,
    question:
      "Which of these can an AI bot do when taking an online survey?",
    type: "multiple_choice",
    options: [
      "Simulate realistic reading speeds",
      "Mimic natural mouse movements",
      "Include deliberate typing errors",
      "All of the above",
    ],
    context:
      'The answer is "All of the above." A 2025 PNAS study demonstrated AI agents that replicate every human behavior pattern researchers use for detection — reading pace, cursor movement, even strategic typos.',
  },
  {
    id: 3,
    question:
      "How much does it cost to generate one fake survey response using AI?",
    type: "multiple_choice",
    options: [
      "About $5.00",
      "About $1.50",
      "About $0.50",
      "About $0.05",
    ],
    context:
      "It costs roughly five cents per fake response — 30x cheaper than a real human respondent. At that price, manipulating survey results at scale is trivially affordable.",
  },
  {
    id: 4,
    question:
      "A researcher uses CAPTCHAs, attention checks, and IP filtering on their survey. How protected is their data?",
    type: "multiple_choice",
    options: [
      "Fully protected — bots can't get through all three",
      "Mostly protected — only sophisticated bots could pass",
      "Partially protected — these help but can all be bypassed",
      "Minimally protected — modern AI bypasses all of these",
    ],
    context:
      "Modern AI agents evade every software-only detection method currently in use. CAPTCHAs are solved by AI, attention checks are trivial for LLMs, and VPNs defeat IP filtering. These tools were designed for an earlier era.",
  },
  {
    id: 5,
    question:
      "In one study, researchers found that just 10–52 fake responses could have flipped the outcome of major election polls. What does this suggest about survey-based research?",
    type: "free_text",
    context:
      "Even small-scale manipulation can have outsized effects. When the margin between real and manipulated results is this thin, the integrity of every individual response matters.",
  },
  {
    id: 6,
    question:
      "What's the fundamental limitation of all software-only bot detection methods?",
    type: "multiple_choice",
    options: [
      "They're too expensive to implement",
      "They can only guess — they can't prove a respondent is human",
      "They slow down the survey too much",
      "They only work on desktop computers",
    ],
    context:
      "Software-only methods analyze behavior patterns to estimate whether a respondent is human. They're probabilistic, not provable. As AI gets better at mimicking human behavior, these statistical guesses become less and less reliable.",
  },
  {
    id: 7,
    question:
      "If you were designing a system to verify survey respondents, what would make it fundamentally different from CAPTCHAs and attention checks?",
    type: "free_text",
    context:
      "SurveySeal's approach: require something a bot physically cannot do — tap a hardware card on a phone. Each tap verifies the respondent's identity by matching their email, creating proof that a real person is present.",
  },
  {
    id: 8,
    question:
      "How important is it for academic research to adopt new methods of verifying survey respondents?",
    type: "likert",
    likertLabels: { low: "Not important", high: "Critically important" },
    context:
      "Surveys underpin research across political science, psychology, public health, economics, and more. If the data can't be trusted, the conclusions built on it can't be either. The tools need to evolve with the threat.",
  },
];

// Build the step sequence: checkpoint → questions → checkpoint → questions → checkpoint
const steps: StepType[] = [
  { kind: "checkpoint", checkpoint: 1, label: "Opening Checkpoint — Tap to begin the survey" },
  ...surveyQuestions.slice(0, 4).map((q) => ({ kind: "question" as const, question: q })),
  { kind: "checkpoint", checkpoint: 2, label: "Mid-Survey Checkpoint — Tap to continue" },
  ...surveyQuestions.slice(4).map((q) => ({ kind: "question" as const, question: q })),
  { kind: "checkpoint", checkpoint: 3, label: "Closing Checkpoint — Tap to submit" },
];

export default function SampleSurveyPage() {
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showContext, setShowContext] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Checkpoint state
  const CHECKPOINT_TIMER = 30;
  const [checkpointPhase, setCheckpointPhase] = useState<
    "waiting" | "verified" | "skipped"
  >("waiting");
  const [checkpointSeconds, setCheckpointSeconds] = useState(CHECKPOINT_TIMER);
  const checkpointTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentStep = steps[currentIndex];
  const progress = ((currentIndex + 1) / steps.length) * 100;

  // Countdown timer for checkpoints
  useEffect(() => {
    if (currentStep.kind !== "checkpoint" || checkpointPhase !== "waiting") {
      if (checkpointTimerRef.current) clearInterval(checkpointTimerRef.current);
      return;
    }

    checkpointTimerRef.current = setInterval(() => {
      setCheckpointSeconds((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (checkpointTimerRef.current) clearInterval(checkpointTimerRef.current);
    };
  }, [currentStep.kind, checkpointPhase]);

  // Auto-skip when timer expires
  useEffect(() => {
    if (checkpointSeconds === 0 && checkpointPhase === "waiting") {
      setCheckpointPhase("skipped");
    }
  }, [checkpointSeconds, checkpointPhase]);

  const resetCheckpoint = useCallback(() => {
    setCheckpointPhase("waiting");
    setCheckpointSeconds(CHECKPOINT_TIMER);
  }, []);

  function handleVerifyCheckpoint() {
    setCheckpointPhase("verified");
  }

  function handleSkipCheckpoint() {
    setCheckpointPhase("skipped");
  }

  function selectAnswer(value: string) {
    if (currentStep.kind !== "question") return;
    setAnswers((prev) => ({ ...prev, [currentStep.question.id]: value }));
    setShowContext(true);
  }

  function next() {
    setShowContext(false);
    resetCheckpoint();
    if (currentIndex < steps.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setCompleted(true);
    }
  }

  function prev() {
    setShowContext(false);
    resetCheckpoint();
    setCurrentIndex((i) => Math.max(0, i - 1));
  }

  // ── Start screen ──
  if (!started) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="border-b">
          <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Shield className="h-5 w-5 text-primary" />
              SurveySeal
            </Link>
          </div>
        </header>
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
          <div className="mx-auto max-w-lg space-y-6">
            <Badge
              variant="secondary"
              className="gap-1.5 px-3 py-1 text-sm font-normal"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              Sample Survey
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Can You Spot the Bot?
            </h1>
            <p className="text-muted-foreground">
              This interactive survey explores how AI bots are compromising
              online research. You&apos;ll experience SurveySeal&apos;s
              TapIn verification at three checkpoints — just like a
              real verified survey.
            </p>
            <div className="rounded-lg border bg-muted/40 p-4 text-left text-sm text-muted-foreground">
              <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                <Smartphone className="h-4 w-4 text-primary" />
                How checkpoints work in this demo
              </div>
              <p>
                In a live survey, you&apos;d tap a physical TapIn Survey card
                on your phone at each checkpoint. A countdown timer gives you
                30 seconds to tap. Here, you can click &ldquo;I see the green
                checkmark&rdquo; or &ldquo;Skip&rdquo; to see how each path works.
              </p>
            </div>
            <Button size="lg" onClick={() => setStarted(true)}>
              Begin Survey
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // ── Completion screen ──
  if (completed) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="border-b">
          <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Shield className="h-5 w-5 text-primary" />
              SurveySeal
            </Link>
          </div>
        </header>
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
          <div className="mx-auto max-w-lg space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Survey Complete
            </h1>
            <p className="text-muted-foreground">
              You completed all three verification checkpoints. In a real
              SurveySeal survey, each verified tap would tag your response
              as &ldquo;Human Verified with TapIn&rdquo; — exported alongside
              your data for peer review.
            </p>
            <Card>
              <CardContent className="space-y-3 text-left text-sm">
                <div className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span>
                    <span className="font-medium">3 checkpoints completed</span>
                    {" "}— opening, mid-survey, and closing checkpoints all passed.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span>
                    <span className="font-medium">Without SurveySeal:</span>{" "}
                    There is no way to prove that a human — and not an AI bot —
                    completed this survey.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span>
                    <span className="font-medium">With SurveySeal:</span>{" "}
                    Each checkpoint tap verifies the respondent&apos;s identity
                    via email matching — proof that a real person is present.
                  </span>
                </div>
              </CardContent>
            </Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/dashboard">
                <Button size="lg">
                  Get Started with SurveySeal
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" size="lg">
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Survey flow ──
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Shield className="h-5 w-5 text-primary" />
            SurveySeal
          </Link>
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} of {steps.length}
          </span>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <main className="flex flex-1 flex-col items-center px-4 py-12">
        <div className="w-full max-w-2xl space-y-6">
          {/* ── Checkpoint step ── */}
          {currentStep.kind === "checkpoint" && (
            <>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="gap-1.5 border-primary/30 text-primary">
                  <Shield className="h-3.5 w-3.5" />
                  Checkpoint {currentStep.checkpoint} of 3
                </Badge>
              </div>

              <h2 className="text-xl font-semibold leading-snug">
                {currentStep.label}
              </h2>

              <Card className="border-primary/20">
                <CardContent className="space-y-5 pt-6">
                  {/* Waiting state with countdown */}
                  {checkpointPhase === "waiting" && (
                    <div className="space-y-4 text-center">
                      {/* Countdown timer */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-2 text-2xl font-mono font-bold tabular-nums">
                          <Timer className="h-5 w-5 text-primary" />
                          <span className={checkpointSeconds <= 10 ? "text-destructive" : ""}>
                            {Math.floor(checkpointSeconds / 60)}:{(checkpointSeconds % 60).toString().padStart(2, "0")}
                          </span>
                        </div>
                        <div className="mx-auto h-1.5 w-48 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${checkpointSeconds <= 10 ? "bg-destructive" : "bg-primary"}`}
                            style={{ width: `${(checkpointSeconds / CHECKPOINT_TIMER) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 animate-pulse">
                        <Smartphone className="h-8 w-8 text-primary" />
                      </div>
                      <p className="font-medium text-foreground">
                        Tap your TapIn Survey card on your phone now
                      </p>
                      <p className="text-sm text-muted-foreground">
                        After tapping, look for the green checkmark on your phone, then click &ldquo;Continue&rdquo; below.
                      </p>
                      <Button onClick={handleVerifyCheckpoint} className="w-full">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        I see the green checkmark — Continue
                      </Button>
                      <div className="pt-2 border-t">
                        <Button
                          onClick={handleSkipCheckpoint}
                          variant="ghost"
                          className="w-full text-muted-foreground"
                        >
                          <SkipForward className="mr-2 h-4 w-4" />
                          I don&apos;t have a TapIn card — Skip verification
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Verified state */}
                  {checkpointPhase === "verified" && (
                    <div className="space-y-4 text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                        <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-green-700 dark:text-green-400">
                          Checkpoint {currentStep.checkpoint} Verified with TapIn
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Identity confirmed via card tap.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Skipped state */}
                  {checkpointPhase === "skipped" && (
                    <div className="space-y-4 text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                        <SkipForward className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground">
                          {checkpointSeconds === 0
                            ? `Checkpoint ${currentStep.checkpoint} — Time expired`
                            : `Checkpoint ${currentStep.checkpoint} Skipped`}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          This checkpoint will be marked as unverified in the export.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Checkpoint context card */}
              {(checkpointPhase === "verified" || checkpointPhase === "skipped") && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">
                      What just happened?
                    </CardTitle>
                    <CardDescription className="text-sm text-foreground/80">
                      {currentStep.checkpoint === 1 &&
                        (checkpointPhase === "verified"
                          ? "The opening checkpoint verified that a real person with a TapIn card started this survey. The email on the card matched the email used to begin the survey."
                          : "The opening checkpoint was skipped. In a real survey, this response would be tagged as unverified — still recorded, but distinguishable from verified responses in the export.")}
                      {currentStep.checkpoint === 2 &&
                        (checkpointPhase === "verified"
                          ? "The mid-survey checkpoint confirms the same person is still present halfway through — not a bot that started the survey and handed off to automation."
                          : "The mid-survey checkpoint was skipped. Researchers can filter their data by verification status to analyze verified and unverified responses separately.")}
                      {currentStep.checkpoint === 3 &&
                        (checkpointPhase === "verified"
                          ? "The closing checkpoint seals the survey. All three verified taps create a chain of identity confirmation, exported alongside your data for peer review."
                          : "The closing checkpoint was skipped. The final verification status depends on how many checkpoints were verified vs. skipped.")}
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
            </>
          )}

          {/* ── Question step ── */}
          {currentStep.kind === "question" && (
            <>
              <h2 className="text-xl font-semibold leading-snug">
                {currentStep.question.question}
              </h2>

              {/* Multiple choice */}
              {currentStep.question.type === "multiple_choice" &&
                currentStep.question.options && (
                  <div className="space-y-3">
                    {currentStep.question.options.map((option) => (
                      <button
                        key={option}
                        onClick={() => selectAnswer(option)}
                        disabled={showContext}
                        className={`w-full rounded-lg border p-4 text-left text-sm transition-colors ${
                          answers[currentStep.question.id] === option
                            ? "border-primary bg-primary/5 font-medium"
                            : "hover:bg-muted/50"
                        } ${showContext ? "cursor-default" : "cursor-pointer"}`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}

              {/* Likert scale */}
              {currentStep.question.type === "likert" &&
                currentStep.question.likertLabels && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{currentStep.question.likertLabels.low}</span>
                      <span>{currentStep.question.likertLabels.high}</span>
                    </div>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          onClick={() => selectAnswer(String(n))}
                          disabled={showContext}
                          className={`flex h-12 flex-1 items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                            answers[currentStep.question.id] === String(n)
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/50"
                          } ${showContext ? "cursor-default" : "cursor-pointer"}`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              {/* Free text */}
              {currentStep.question.type === "free_text" && (
                <div className="space-y-3">
                  <textarea
                    className="w-full rounded-lg border bg-background p-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    rows={4}
                    placeholder="Type your answer..."
                    value={answers[currentStep.question.id] || ""}
                    onChange={(e) => {
                      setAnswers((prev) => ({
                        ...prev,
                        [currentStep.question.id]: e.target.value,
                      }));
                    }}
                    disabled={showContext}
                  />
                  {!showContext && answers[currentStep.question.id] && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowContext(true)}
                    >
                      Submit Answer
                    </Button>
                  )}
                </div>
              )}

              {/* Context reveal */}
              {showContext && currentStep.question.context && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">
                      Did you know?
                    </CardTitle>
                    <CardDescription className="text-sm text-foreground/80">
                      {currentStep.question.context}
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
            </>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={prev}
              disabled={currentIndex === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {/* Show Next for resolved checkpoints or answered questions */}
            {((currentStep.kind === "checkpoint" && (checkpointPhase === "verified" || checkpointPhase === "skipped")) ||
              (currentStep.kind === "question" && showContext)) && (
              <Button onClick={next}>
                {currentIndex < steps.length - 1
                  ? "Continue"
                  : "Finish Survey"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
