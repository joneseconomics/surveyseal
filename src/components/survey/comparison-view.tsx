"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { File, Download } from "lucide-react";
import { DocxViewer } from "@/components/survey/docx-viewer";

interface CJItemDisplay {
  id: string;
  label: string;
  content: {
    text?: string;
    imageUrl?: string;
    description?: string;
    fileUrl?: string;
    fileType?: string;
    fileName?: string;
  };
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
  const { fileUrl, fileType, fileName, imageUrl } = item.content;

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
        {/* Uploaded file rendering */}
        {fileUrl && fileType?.startsWith("image/") && (
          <img
            src={fileUrl}
            alt={item.label}
            className="w-full rounded-md object-cover"
          />
        )}
        {fileUrl && fileType === "application/pdf" && (
          <iframe
            src={fileUrl}
            title={fileName || item.label}
            className="w-full rounded-md border-0"
            style={{ aspectRatio: "3/4" }}
          />
        )}
        {fileUrl &&
          fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" && (
            <DocxViewer url={fileUrl} />
          )}
        {fileUrl &&
          fileType &&
          !fileType.startsWith("image/") &&
          fileType !== "application/pdf" &&
          fileType !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document" && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-md border p-3 text-sm hover:bg-muted"
              onClick={(e) => e.stopPropagation()}
            >
              <File className="h-5 w-5 text-blue-500 shrink-0" />
              <span className="flex-1 truncate">{fileName || "Download file"}</span>
              <Download className="h-4 w-4 text-muted-foreground shrink-0" />
            </a>
          )}

        {/* Fallback to external imageUrl */}
        {!fileUrl && imageUrl && (
          <img
            src={imageUrl}
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
