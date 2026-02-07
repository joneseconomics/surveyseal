"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Loader2, AlertCircle, Smartphone, CheckCircle, SkipForward } from "lucide-react";

interface CheckpointGateProps {
  sessionId: string;
  surveyId: string;
  questionId: string;
  position: number;
  totalQuestions: number;
}

export function CheckpointGate({
  sessionId,
  surveyId,
  questionId,
  position,
  totalQuestions,
}: CheckpointGateProps) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"waiting" | "verified" | "skipped">("waiting");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for TapIn verification every 3 seconds
  useEffect(() => {
    if (status !== "waiting") return;

    async function checkVerification() {
      try {
        const res = await fetch("/api/survey/checkpoint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, questionId, action: "check" }),
        });
        const data = await res.json();
        if (data.success && data.status === "verified") {
          setStatus("verified");
        }
      } catch {
        // Silently retry on network errors
      }
    }

    checkVerification();
    pollRef.current = setInterval(checkVerification, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [sessionId, questionId, status]);

  // Navigate to next question after verified or skipped
  useEffect(() => {
    if (status === "verified" || status === "skipped") {
      const timer = setTimeout(() => {
        window.location.href = `/s/${surveyId}/q?q=${position + 1}`;
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [status, surveyId, position]);

  async function handleSkip() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/survey/checkpoint", {
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

  return (
    <Card className="w-full max-w-md text-center">
      <CardHeader>
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Verification Checkpoint</CardTitle>
        <CardDescription>
          Question {position + 1} of {totalQuestions}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "waiting" && (
          <>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 animate-pulse">
                <Smartphone className="h-8 w-8 text-primary" />
              </div>
              <p className="font-medium text-foreground">
                Tap your TapIn Survey card to verify
              </p>
              <p>
                Tap your card on your phone. Verification will be detected automatically.
              </p>
            </div>

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
              Checkpoint skipped
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
