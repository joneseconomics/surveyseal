"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addQuestion, updateQuestion } from "@/lib/actions/question";
import { questionTypes, type QuestionTypeValue } from "@/lib/validations/survey";
import type { Question } from "@/generated/prisma/client";
import { X, Plus } from "lucide-react";

interface QuestionEditorProps {
  surveyId: string;
  question: Question | null;
  onClose: () => void;
}

const typeLabels: Record<QuestionTypeValue, string> = {
  MULTIPLE_CHOICE: "Multiple Choice",
  LIKERT: "Likert Scale",
  FREE_TEXT: "Free Text",
  MATRIX: "Matrix",
  RANKING: "Ranking",
};

export function QuestionEditor({ surveyId, question, onClose }: QuestionEditorProps) {
  const isEditing = !!question;
  const existingContent = (question?.content ?? {}) as Record<string, unknown>;

  const [type, setType] = useState<QuestionTypeValue>(
    (question?.type as QuestionTypeValue) ?? "MULTIPLE_CHOICE"
  );
  const [text, setText] = useState((existingContent.text as string) ?? "");
  const [options, setOptions] = useState<string[]>(
    (existingContent.options as string[]) ?? ["", ""]
  );
  const [scaleMin, setScaleMin] = useState(
    (existingContent.scale as { min?: number })?.min ?? 1
  );
  const [scaleMax, setScaleMax] = useState(
    (existingContent.scale as { max?: number })?.max ?? 5
  );
  const [scaleMinLabel, setScaleMinLabel] = useState(
    (existingContent.scale as { minLabel?: string })?.minLabel ?? ""
  );
  const [scaleMaxLabel, setScaleMaxLabel] = useState(
    (existingContent.scale as { maxLabel?: string })?.maxLabel ?? ""
  );
  const [rows, setRows] = useState<string[]>((existingContent.rows as string[]) ?? ["", ""]);
  const [columns, setColumns] = useState<string[]>(
    (existingContent.columns as string[]) ?? ["", ""]
  );
  const [isCheckpoint, setIsCheckpoint] = useState(question?.isCheckpoint ?? false);
  const [saving, setSaving] = useState(false);

  function buildContent(): Record<string, unknown> {
    switch (type) {
      case "MULTIPLE_CHOICE":
        return { text, options: options.filter(Boolean) };
      case "LIKERT":
        return {
          text,
          scale: {
            min: scaleMin,
            max: scaleMax,
            minLabel: scaleMinLabel || undefined,
            maxLabel: scaleMaxLabel || undefined,
          },
        };
      case "FREE_TEXT":
        return { text };
      case "MATRIX":
        return { text, rows: rows.filter(Boolean), columns: columns.filter(Boolean) };
      case "RANKING":
        return { text, options: options.filter(Boolean) };
      default:
        return { text };
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const content = buildContent();
      if (isEditing) {
        await updateQuestion({
          id: question!.id,
          type,
          content,
          isCheckpoint,
        });
      } else {
        await addQuestion({ surveyId, type, content, isCheckpoint });
      }
      onClose();
    } catch (err) {
      console.error("Failed to save question:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Question" : "Add Question"}</DialogTitle>
          <DialogDescription>
            Configure the question type and content.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Question Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as QuestionTypeValue)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {questionTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {typeLabels[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Question Text</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter your question..."
              rows={2}
            />
          </div>

          {/* Options for MULTIPLE_CHOICE and RANKING */}
          {(type === "MULTIPLE_CHOICE" || type === "RANKING") && (
            <div className="space-y-2">
              <Label>Options</Label>
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={opt}
                    onChange={(e) => {
                      const next = [...options];
                      next[i] = e.target.value;
                      setOptions(next);
                    }}
                    placeholder={`Option ${i + 1}`}
                  />
                  {options.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => setOptions(options.filter((_, j) => j !== i))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOptions([...options, ""])}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Option
              </Button>
            </div>
          )}

          {/* Likert scale config */}
          {type === "LIKERT" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Min</Label>
                  <Input
                    type="number"
                    value={scaleMin}
                    onChange={(e) => setScaleMin(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max</Label>
                  <Input
                    type="number"
                    value={scaleMax}
                    onChange={(e) => setScaleMax(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Min Label</Label>
                  <Input
                    value={scaleMinLabel}
                    onChange={(e) => setScaleMinLabel(e.target.value)}
                    placeholder="e.g. Strongly Disagree"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Label</Label>
                  <Input
                    value={scaleMaxLabel}
                    onChange={(e) => setScaleMaxLabel(e.target.value)}
                    placeholder="e.g. Strongly Agree"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Matrix config */}
          {type === "MATRIX" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Rows</Label>
                {rows.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={row}
                      onChange={(e) => {
                        const next = [...rows];
                        next[i] = e.target.value;
                        setRows(next);
                      }}
                      placeholder={`Row ${i + 1}`}
                    />
                    {rows.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setRows(rows.filter((_, j) => j !== i))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setRows([...rows, ""])}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Row
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Columns</Label>
                {columns.map((col, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={col}
                      onChange={(e) => {
                        const next = [...columns];
                        next[i] = e.target.value;
                        setColumns(next);
                      }}
                      placeholder={`Column ${i + 1}`}
                    />
                    {columns.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setColumns(columns.filter((_, j) => j !== i))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setColumns([...columns, ""])}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Column
                </Button>
              </div>
            </div>
          )}

          {/* Checkpoint toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="checkpoint"
              checked={isCheckpoint}
              onChange={(e) => setIsCheckpoint(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="checkpoint">This is a verification checkpoint</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !text.trim()}>
            {saving ? "Saving..." : isEditing ? "Update" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
