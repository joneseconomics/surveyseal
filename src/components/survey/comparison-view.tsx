"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { File, Download, ExternalLink } from "lucide-react";
import { DocxViewer } from "@/components/survey/docx-viewer";
import DOMPurify from "isomorphic-dompurify";

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
    sourceType?: string;
    submissionUrl?: string;
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
  const [selected, setSelected] = useState<string | null>(null);

  async function handleChoice(winnerId: string) {
    setSelected(winnerId);
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
        setSelected(null);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
      setSelected(null);
    }
  }

  const progress = ((currentComparison - 1) / totalComparisons) * 100;

  return (
    <div className="flex min-h-screen w-full flex-col">
      {/* Top bar: progress + prompt */}
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-7xl px-4 py-3">
          {/* Progress bar */}
          <div className="mb-2 flex items-center gap-3">
            <div className="flex-1">
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              {currentComparison} / {totalComparisons}
            </span>
          </div>

          {/* Prompt */}
          <p className="text-center text-base font-medium">{prompt}</p>

          {/* Instruction */}
          <p className="mt-1 text-center text-xs text-muted-foreground">
            Read both items below, then click the one you believe is better.
          </p>
        </div>
      </div>

      {/* Main content: side-by-side items filling the screen */}
      <div className="flex flex-1 flex-col md:flex-row">
        <ItemPanel
          item={leftItem}
          onClick={() => handleChoice(leftItem.id)}
          disabled={loading}
          isSelected={selected === leftItem.id}
        />

        {/* Divider */}
        <div className="hidden md:flex items-center">
          <div className="h-full w-px bg-border" />
        </div>
        <div className="flex md:hidden items-center justify-center py-2 bg-muted/40">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">vs</span>
        </div>

        <ItemPanel
          item={rightItem}
          onClick={() => handleChoice(rightItem.id)}
          disabled={loading}
          isSelected={selected === rightItem.id}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="sticky bottom-0 border-t bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}

function ItemPanel({
  item,
  onClick,
  disabled,
  isSelected,
}: {
  item: CJItemDisplay;
  onClick: () => void;
  disabled: boolean;
  isSelected: boolean;
}) {
  const { fileUrl, fileType: rawFileType, fileName, imageUrl, sourceType, submissionUrl } = item.content;

  // Infer file type from filename when fileType is missing (e.g. Canvas imports)
  const fileType = rawFileType ?? (fileName ? inferMimeType(fileName) : undefined);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        group flex-1 text-left transition-all duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset
        ${disabled && !isSelected ? "pointer-events-none opacity-50" : ""}
        ${isSelected
          ? "bg-primary/5 ring-2 ring-inset ring-primary"
          : "hover:bg-accent/50"
        }
      `}
    >
      <div className="mx-auto h-full max-w-2xl px-6 py-6">
        {/* Item label */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{item.label}</h2>
          <span
            className={`
              rounded-full px-3 py-1 text-xs font-medium transition-all
              ${isSelected
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
              }
            `}
          >
            {isSelected ? "Selected" : "Select"}
          </span>
        </div>

        {/* File content */}
        {fileUrl && fileType?.startsWith("image/") && (
          <img
            src={fileUrl}
            alt={item.label}
            className="mb-4 w-full rounded-lg object-contain"
          />
        )}
        {fileUrl && fileType === "application/pdf" && (
          <iframe
            src={fileUrl}
            title={fileName || item.label}
            className="mb-4 w-full rounded-lg border-0"
            style={{ minHeight: "70vh" }}
          />
        )}
        {fileUrl &&
          fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" && (
            <div className="mb-4">
              <DocxViewer url={fileUrl} />
            </div>
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
              className="mb-4 flex items-center gap-2 rounded-lg border p-4 text-sm hover:bg-muted"
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
            className="mb-4 w-full rounded-lg object-contain"
          />
        )}

        {/* URL submission */}
        {submissionUrl && (
          <a
            href={submissionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-4 flex items-center gap-2 rounded-lg border p-4 text-sm text-primary hover:bg-muted"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-5 w-5 shrink-0" />
            <span className="flex-1 truncate">{submissionUrl}</span>
          </a>
        )}

        {/* Text content — Canvas HTML or plain text */}
        {item.content.text && sourceType === "canvas" ? (
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(item.content.text),
            }}
          />
        ) : item.content.text ? (
          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap">{item.content.text}</p>
          </div>
        ) : null}

        {/* Description */}
        {item.content.description && (
          <p className="mt-3 text-sm text-muted-foreground">{item.content.description}</p>
        )}
      </div>
    </button>
  );
}

const MIME_MAP: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
};

function inferMimeType(filename: string): string | undefined {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  return MIME_MAP[ext];
}
