"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteSurvey } from "@/lib/actions/survey";

export function DeleteSurveyButton({ surveyId }: { surveyId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this survey? This action cannot be undone.")) {
      return;
    }
    setLoading(true);
    try {
      await deleteSurvey(surveyId);
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
      title="Delete survey"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </button>
  );
}
