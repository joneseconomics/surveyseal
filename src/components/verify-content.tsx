"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export function VerifyContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const uid = searchParams.get("uid");

  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [word1, setWord1] = useState("");
  const [word2, setWord2] = useState("");
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setState("error");
      setError("Missing session ID");
      return;
    }

    async function validate() {
      try {
        const res = await fetch("/api/nfc/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, uid: uid ?? undefined }),
        });

        const data = await res.json();
        if (!res.ok) {
          setState("error");
          setError(data.error || "Validation failed");
          return;
        }

        setWord1(data.word1);
        setWord2(data.word2);
        setExpiresAt(new Date(data.expiresAt));
        setState("success");
      } catch {
        setState("error");
        setError("Network error. Please try again.");
      }
    }

    validate();
  }, [sessionId, uid]);

  useEffect(() => {
    if (!expiresAt) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>SurveySeal Verify</CardTitle>
          <CardDescription>Enter this phrase in the survey</CardDescription>
        </CardHeader>
        <CardContent>
          {state === "loading" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Validating your card...</p>
            </div>
          )}

          {state === "success" && (
            <div className="space-y-4">
              <div className="rounded-lg bg-primary/5 p-6">
                <p className="text-4xl font-bold tracking-wider">
                  {word1} {word2}
                </p>
              </div>

              {secondsLeft > 0 ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>
                    Expires in{" "}
                    <span className={`font-mono font-bold ${secondsLeft <= 15 ? "text-destructive" : ""}`}>
                      {secondsLeft}s
                    </span>
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>Phrase expired. Tap your card again.</span>
                </div>
              )}
            </div>
          )}

          {state === "error" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
