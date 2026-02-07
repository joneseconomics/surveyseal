"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";

interface CJItemDisplay {
  id: string;
  label: string;
  content: { text?: string; imageUrl?: string; description?: string };
}

interface ComparisonViewProps {
  sessionId: string;
  comparisonId: string;
  leftItem: CJItemDisplay;
  rightItem: CJItemDisplay;
  prompt: string;
  currentComparison: number;
  totalComparisons: number;
}

export function ComparisonView({
  sessionId,
  comparisonId,
  leftItem,
  rightItem,
  prompt,
  currentComparison,
  totalComparisons,
}: ComparisonViewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleChoice(winnerId: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/survey/comparison", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, comparisonId, winnerId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  const progress = ((currentComparison - 1) / totalComparisons) * 100;

  return (
    <div className="w-full max-w-4xl space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Comparison {currentComparison} of {totalComparisons}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Prompt */}
      <p className="text-center text-lg font-medium">{prompt}</p>

      {/* Side-by-side cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ItemCard item={leftItem} onClick={() => handleChoice(leftItem.id)} disabled={loading} />
        <ItemCard item={rightItem} onClick={() => handleChoice(rightItem.id)} disabled={loading} />
      </div>

      {error && (
        <p className="text-center text-sm text-destructive">{error}</p>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Click the item you think is better
      </p>
    </div>
  );
}

function ItemCard({
  item,
  onClick,
  disabled,
}: {
  item: CJItemDisplay;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:ring-2 hover:ring-primary hover:shadow-lg ${
        disabled ? "pointer-events-none opacity-60" : ""
      }`}
      onClick={onClick}
    >
      <CardHeader>
        <CardTitle className="text-base">{item.label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {item.content.imageUrl && (
          <img
            src={item.content.imageUrl}
            alt={item.label}
            className="w-full rounded-md object-cover"
          />
        )}
        {item.content.text && (
          <p className="text-sm whitespace-pre-wrap">{item.content.text}</p>
        )}
        {item.content.description && (
          <p className="text-xs text-muted-foreground">{item.content.description}</p>
        )}
      </CardContent>
    </Card>
  );
}
