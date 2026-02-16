"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { File, Download, ExternalLink, Info, ChevronLeft, ChevronRight } from "lucide-react";
import { ExitSurveyButtons } from "@/components/survey/exit-survey-buttons";
import { DocxViewer } from "@/components/survey/docx-viewer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  surveyId: string;
  comparisonId: string;
  leftItem: CJItemDisplay;
  rightItem: CJItemDisplay;
  prompt: string;
  currentComparison: number;
  totalComparisons: number;
  judgeInstructions?: string | null;
  cjSubtype?: string | null;
  cjJobUrl?: string | null;
  cjJobDescFileUrl?: string | null;
  cjJobDescFileType?: string | null;
  cjJobDescFileName?: string | null;
  cjAssignmentInstructions?: string | null;
  currentPosition: number;
  totalJudged: number;
  isReview: boolean;
  existingWinnerId: string | null;
}

export function ComparisonView({
  sessionId,
  surveyId,
  comparisonId,
  leftItem,
  rightItem,
  prompt,
  currentComparison,
  totalComparisons,
  judgeInstructions,
  cjSubtype,
  cjJobUrl,
  cjJobDescFileUrl,
  cjJobDescFileType,
  cjJobDescFileName,
  cjAssignmentInstructions,
  currentPosition,
  totalJudged,
  isReview,
  existingWinnerId,
}: ComparisonViewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(existingWinnerId);
  const [showInstructions, setShowInstructions] = useState(false);

  // Reset state when a new comparison is loaded via server refresh
  useEffect(() => {
    setLoading(false);
    setSelected(existingWinnerId);
    setError("");
  }, [comparisonId, existingWinnerId]);

  async function handleChoice(winnerId: string) {
    // In review mode, clicking the already-selected item is a no-op
    if (isReview && winnerId === selected) return;

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
        setSelected(isReview ? existingWinnerId : null);
        return;
      }
      if (isReview) {
        // Stay on current comparison after re-judgment
        setLoading(false);
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
      setSelected(isReview ? existingWinnerId : null);
    }
  }

  const canGoPrev = currentPosition > 0;
  const canGoNext = currentPosition < totalJudged;

  function goToPrev() {
    if (!canGoPrev || loading) return;
    router.push(`/s/${surveyId}/compare?pos=${currentPosition - 1}`);
  }

  function goToNext() {
    if (!canGoNext || loading) return;
    if (currentPosition + 1 === totalJudged) {
      // Going to frontier — strip pos param
      router.push(`/s/${surveyId}/compare`);
    } else {
      router.push(`/s/${surveyId}/compare?pos=${currentPosition + 1}`);
    }
  }

  const progress = ((currentComparison - 1) / totalComparisons) * 100;

  return (
    <div className="flex min-h-screen w-full flex-col">
      {/* Top bar: progress + prompt */}
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-7xl px-4 py-3">
          {/* Progress bar + navigation */}
          <div className="mb-2 flex items-center gap-3">
            <button
              type="button"
              onClick={goToPrev}
              disabled={!canGoPrev || loading}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
              aria-label="Previous comparison"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Go Back</span>
            </button>
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
            <button
              type="button"
              onClick={goToNext}
              disabled={!canGoNext || loading}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
              aria-label="Next comparison"
            >
              <span>Go Forward</span>
              <ChevronRight className="h-4 w-4" />
            </button>
            <ExitSurveyButtons surveyId={surveyId} />
          </div>

          {/* Prompt */}
          <p className="text-center text-base font-medium">{prompt}</p>

          {/* Instruction link */}
          <div className="mt-1 flex items-center justify-center">
            <button
              type="button"
              onClick={() => setShowInstructions(true)}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Info className="h-3 w-3" />
              Instructions
            </button>
          </div>
        </div>
      </div>

      {/* Main content: side-by-side items filling the screen */}
      <div className="flex flex-1 flex-col md:flex-row">
        <ItemPanel
          item={leftItem}
          onClick={() => handleChoice(leftItem.id)}
          disabled={loading}
          isSelected={selected === leftItem.id}
          isRejected={selected !== null && selected !== leftItem.id}
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
          isRejected={selected !== null && selected !== rightItem.id}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="sticky bottom-0 border-t bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Instructions popup */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Instructions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground">
            {judgeInstructions && (
              <div className="whitespace-pre-wrap">{linkifyText(judgeInstructions)}</div>
            )}
            {!judgeInstructions && cjSubtype === "RESUMES" && (
              <p>
                You are a hiring manager for the position described below, and you will
                be shown two potential candidate resumes to review. Please select the
                resume of the candidate whom you would advance to the next round of
                interviews. Please note that you can only select one of the resumes.
              </p>
            )}
            {!judgeInstructions && cjSubtype === "ASSIGNMENTS" && (
              <p>
                You will be comparing student submissions side by side. For each pair,
                carefully review both submissions and select the one you believe
                demonstrates higher quality.
              </p>
            )}
            {!judgeInstructions && (!cjSubtype || cjSubtype === "GENERIC") && (
              <p>
                You will be shown pairs of items side by side. For each pair,
                carefully review both items and select the one you believe is better.
              </p>
            )}

            {/* Embedded job description (URL or file) */}
            {(cjJobUrl || cjJobDescFileUrl) && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Job Description
                </p>
                {cjJobUrl && (
                  <>
                    <iframe
                      src={cjJobUrl}
                      title="Job description"
                      className="w-full rounded-lg border"
                      style={{ minHeight: "400px" }}
                      sandbox="allow-scripts allow-same-origin"
                    />
                    <a
                      href={cjJobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Open in new tab
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </>
                )}
                {!cjJobUrl && cjJobDescFileUrl && cjJobDescFileType === "application/pdf" && (
                  <iframe
                    src={`${cjJobDescFileUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                    title={cjJobDescFileName || "Job description"}
                    className="w-full rounded-lg border-0"
                    style={{ minHeight: "500px" }}
                  />
                )}
                {!cjJobUrl && cjJobDescFileUrl && cjJobDescFileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" && (
                  <DocxViewer url={cjJobDescFileUrl} />
                )}
              </div>
            )}

            {/* Assignment prompt */}
            {cjSubtype === "ASSIGNMENTS" && cjAssignmentInstructions && (
              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Assignment Prompt
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{cjAssignmentInstructions}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ItemPanel({
  item,
  onClick,
  disabled,
  isSelected,
  isRejected,
}: {
  item: CJItemDisplay;
  onClick: () => void;
  disabled: boolean;
  isSelected: boolean;
  isRejected: boolean;
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
        ${disabled && !isSelected && !isRejected ? "pointer-events-none opacity-50" : ""}
        ${isSelected
          ? "bg-green-50 ring-2 ring-inset ring-green-400 dark:bg-green-950/30 dark:ring-green-600"
          : isRejected
            ? "bg-red-50 ring-2 ring-inset ring-red-300 opacity-60 pointer-events-none dark:bg-red-950/20 dark:ring-red-700"
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
              rounded-full px-5 py-2 text-sm font-semibold transition-all
              ${isSelected
                ? "bg-green-600 text-white"
                : isRejected
                  ? "bg-red-200 text-red-700 dark:bg-red-900 dark:text-red-300"
                  : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
              }
            `}
          >
            {isSelected ? "Selected" : isRejected ? "Not Selected" : "Select"}
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
            src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=1`}
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

/** Turn URLs in plain text into clickable links */
function linkifyText(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline break-all"
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}
