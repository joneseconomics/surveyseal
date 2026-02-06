"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { reorderQuestion, deleteQuestion, toggleCheckpoint } from "@/lib/actions/question";
import { ArrowUp, ArrowDown, Trash2, Pencil, Shield } from "lucide-react";
import type { Question } from "@/generated/prisma/client";

interface QuestionCardProps {
  question: Question;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  isDraft: boolean;
  onEdit: () => void;
}

const typeLabels: Record<string, string> = {
  MULTIPLE_CHOICE: "Multiple Choice",
  LIKERT: "Likert Scale",
  FREE_TEXT: "Free Text",
  MATRIX: "Matrix",
  RANKING: "Ranking",
};

export function QuestionCard({
  question,
  index,
  isFirst,
  isLast,
  isDraft,
  onEdit,
}: QuestionCardProps) {
  const content = question.content as { text?: string };

  return (
    <Card className={question.isCheckpoint ? "border-primary/50 bg-primary/5" : ""}>
      <CardContent className="flex items-center gap-3 py-3">
        <span className="w-8 text-center text-sm font-medium text-muted-foreground">
          {index + 1}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {question.isCheckpoint && (
              <Shield className="h-4 w-4 text-primary shrink-0" />
            )}
            <span className="truncate text-sm font-medium">
              {content?.text || "Untitled question"}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {typeLabels[question.type] || question.type}
            </Badge>
            {question.isCheckpoint && (
              <Badge variant="default" className="text-xs">
                Checkpoint
              </Badge>
            )}
          </div>
        </div>

        {isDraft && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={isFirst}
              onClick={() => reorderQuestion(question.id, "up")}
              title="Move up"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={isLast}
              onClick={() => reorderQuestion(question.id, "down")}
              title="Move down"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => toggleCheckpoint(question.id)}
              title={question.isCheckpoint ? "Remove checkpoint" : "Set as checkpoint"}
            >
              <Shield className={`h-4 w-4 ${question.isCheckpoint ? "text-primary" : ""}`} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} title="Edit">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => deleteQuestion(question.id)}
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
