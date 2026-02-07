"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { deleteQuestion } from "@/lib/actions/question";
import { GripVertical, Trash2, Pencil, Shield } from "lucide-react";
import type { Question } from "@/generated/prisma/client";

interface QuestionCardProps {
  question: Question;
  index: number;
  isDraft: boolean;
  onEdit: () => void;
  isOverlay?: boolean;
}

const typeLabels: Record<string, string> = {
  MULTIPLE_CHOICE: "Multiple Choice",
  LIKERT: "Likert Scale",
  FREE_TEXT: "Free Text",
  MATRIX: "Matrix",
  RANKING: "Ranking",
  SHORT_TEXT: "Short Text",
  URL: "URL",
  EMAIL: "Email",
  YES_NO: "Yes / No",
  CUSTOMER_SATISFACTION: "Satisfaction",
  NPS: "NPS",
  CHECKBOX: "Checkbox",
  RATING: "Rating",
  DATE: "Date",
  DATE_TIME: "Date & Time",
  NUMBER: "Number",
  PERCENTAGE: "Percentage",
  SLIDER: "Slider",
  PHONE_NUMBER: "Phone",
};

export function QuestionCard({
  question,
  index,
  isDraft,
  onEdit,
  isOverlay,
}: QuestionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id, disabled: !isDraft });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const content = question.content as { text?: string };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`${question.isVerificationPoint ? "border-primary/50 bg-primary/5" : ""} ${
        isDragging ? "opacity-50" : ""
      } ${isOverlay ? "shadow-lg ring-2 ring-primary/20" : ""}`}
    >
      <CardContent className="flex items-center gap-3 py-3">
        {isDraft && (
          <button
            className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" />
          </button>
        )}

        <span className="w-8 text-center text-sm font-medium text-muted-foreground">
          {index + 1}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {question.isVerificationPoint && (
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
            {question.isVerificationPoint && (
              <Badge variant="default" className="text-xs">
                Verification Point
              </Badge>
            )}
          </div>
        </div>

        {isDraft && (
          <div className="flex items-center gap-1">
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
