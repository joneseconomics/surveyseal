"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Smartphone, Loader2 } from "lucide-react";
import { reconcileTapIn } from "@/lib/actions/survey";

export function ReconcileButton({ surveyId }: { surveyId: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  async function handleClick() {
    setLoading(true);
    setMessage(null);
    try {
      await reconcileTapIn(surveyId);
      setMessage({ text: "Reconciliation complete", error: false });
    } catch (e) {
      setMessage({
        text: e instanceof Error ? e.message : "Reconciliation failed",
        error: true,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleClick} disabled={loading}>
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Smartphone className="mr-2 h-4 w-4" />
        )}
        Reconcile with TapIn
      </Button>
      {message && (
        <span className={`text-xs ${message.error ? "text-red-600" : "text-green-600"}`}>
          {message.text}
        </span>
      )}
    </div>
  );
}
