"use client";

import { useState } from "react";
import { Copy, Loader2 } from "lucide-react";
import { copySurvey } from "@/lib/actions/survey";

export function CopySurveyButton({ surveyId }: { surveyId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      await copySurvey(surveyId);
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleCopy}
      disabled={loading}
      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
      title="Copy survey"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </button>
  );
}
