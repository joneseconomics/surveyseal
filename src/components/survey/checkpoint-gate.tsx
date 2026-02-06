"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Loader2, AlertCircle, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [word1, setWord1] = useState("");
  const [word2, setWord2] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tapped, setTapped] = useState(false);

  async function handleMockTap() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/nfc/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setWord1(data.word1);
      setWord2(data.word2);
      setTapped(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/survey/checkpoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, questionId, word1, word2 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      // Navigate to next question
      router.push(`/s/${surveyId}/q?q=${position + 1}`);
      router.refresh();
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
        {!tapped ? (
          <>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-center gap-2">
                <Smartphone className="h-4 w-4" />
                <span>Tap your NFC card on your phone</span>
              </div>
              <p>
                A two-word phrase will appear on your phone. Enter it below to continue the survey.
              </p>
            </div>

            {/* In mock mode, show a simulate button */}
            {process.env.NEXT_PUBLIC_NFC_MOCK_MODE === "true" && (
              <Button onClick={handleMockTap} disabled={loading} variant="outline" className="w-full">
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="mr-2 h-4 w-4" />
                )}
                Simulate NFC Tap (Dev Mode)
              </Button>
            )}

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="word1">Word 1</Label>
                  <Input
                    id="word1"
                    value={word1}
                    onChange={(e) => setWord1(e.target.value.toLowerCase())}
                    placeholder="first word"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="word2">Word 2</Label>
                  <Input
                    id="word2"
                    value={word2}
                    onChange={(e) => setWord2(e.target.value.toLowerCase())}
                    placeholder="second word"
                    autoComplete="off"
                  />
                </div>
              </div>
              <Button
                onClick={handleVerify}
                disabled={loading || !word1 || !word2}
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Verify
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-primary/5 p-4">
              <p className="text-sm text-muted-foreground mb-1">
                Your phrase (auto-filled from NFC tap):
              </p>
              <p className="text-2xl font-bold">
                {word1} {word2}
              </p>
            </div>
            <Button
              onClick={handleVerify}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Continue
            </Button>
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
