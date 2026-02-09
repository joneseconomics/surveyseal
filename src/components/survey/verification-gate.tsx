"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle, Smartphone, CheckCircle, SkipForward, Timer } from "lucide-react";
import { SurveySealLogo } from "@/components/logo";

interface VerificationGateProps {
  sessionId: string;
  surveyId: string;
  questionId: string;
  position: number;
  totalQuestions?: number;
  timerSeconds: number;
  returnUrl?: string;
}

export function VerificationGate({
  sessionId,
  surveyId,
  questionId,
  position,
  timerSeconds,
  returnUrl,
}: VerificationGateProps) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"waiting" | "verified" | "skipped">("waiting");
  const [secondsLeft, setSecondsLeft] = useState(timerSeconds);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer
  useEffect(() => {
    if (status !== "waiting") return;

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  // Auto-skip when timer expires
  const handleAutoSkip = useCallback(async () => {
    try {
      await fetch("/api/survey/verification-point", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, questionId, action: "skip" }),
      });
      setStatus("skipped");
    } catch {
      setStatus("skipped");
    }
  }, [sessionId, questionId]);

  useEffect(() => {
    if (secondsLeft === 0 && status === "waiting") {
      handleAutoSkip();
    }
  }, [secondsLeft, status, handleAutoSkip]);

  // Navigate to next question after verified or skipped
  useEffect(() => {
    if (status === "verified" || status === "skipped") {
      const timer = setTimeout(() => {
        window.location.href = returnUrl ?? `/s/${surveyId}/q?q=${position + 1}`;
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [status, surveyId, position, returnUrl]);

  async function handleNext() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/survey/verification-point", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, questionId, action: "next" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setStatus("verified");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSkip() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/survey/verification-point", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, questionId, action: "skip" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setStatus("skipped");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timerDisplay = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  const timerProgress = (secondsLeft / timerSeconds) * 100;

  return (
    <Card className="w-full max-w-md text-center">
      <CardHeader>
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <SurveySealLogo className="h-6 w-6" />
        </div>
        <CardTitle>Verification Point</CardTitle>
        <CardDescription>
          Please verify your identity to continue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "waiting" && (
          <>
            {/* Countdown timer */}
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-2xl font-mono font-bold tabular-nums">
                <Timer className="h-5 w-5 text-primary" />
                <span className={secondsLeft <= 10 ? "text-destructive" : ""}>{timerDisplay}</span>
              </div>
              <div className="mx-auto h-1.5 w-48 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${secondsLeft <= 10 ? "bg-destructive" : "bg-primary"}`}
                  style={{ width: `${timerProgress}%` }}
                />
              </div>
            </div>

            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 animate-pulse">
                <Smartphone className="h-8 w-8 text-primary" />
              </div>
              <p className="font-medium text-foreground">
                Tap your TapIn Survey card on your phone now
              </p>
              <p>
                After tapping, look for the green checkmark on your phone, then click &ldquo;Continue&rdquo; below.
              </p>
            </div>

            <Button
              onClick={handleNext}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              I see the green checkmark — Continue
            </Button>

            <div className="pt-2 border-t">
              <Button
                onClick={handleSkip}
                disabled={loading}
                variant="ghost"
                className="w-full text-muted-foreground"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <SkipForward className="mr-2 h-4 w-4" />
                )}
                I don&apos;t have a TapIn card — Skip verification
              </Button>
            </div>
          </>
        )}

        {status === "verified" && (
          <div className="space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <p className="font-semibold text-green-700 dark:text-green-400">
              Verified with TapIn
            </p>
            <p className="text-sm text-muted-foreground">
              Continuing to next question...
            </p>
          </div>
        )}

        {status === "skipped" && (
          <div className="space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <SkipForward className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-medium text-muted-foreground">
              {secondsLeft === 0 ? "Time expired — verification point skipped" : "Verification point skipped"}
            </p>
            <p className="text-sm text-muted-foreground">
              Continuing to next question...
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
