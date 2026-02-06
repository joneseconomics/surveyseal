"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Question } from "@/generated/prisma/client";

interface QuestionRendererProps {
  sessionId: string;
  surveyId: string;
  question: Question;
  position: number;
  totalQuestions: number;
  isAnswered: boolean;
}

interface QuestionContent {
  text: string;
  options?: string[];
  scale?: { min: number; max: number; minLabel?: string; maxLabel?: string };
  rows?: string[];
  columns?: string[];
}

export function QuestionRenderer({
  sessionId,
  surveyId,
  question,
  position,
  totalQuestions,
  isAnswered,
}: QuestionRendererProps) {
  const router = useRouter();
  const content = question.content as unknown as QuestionContent;
  const [answer, setAnswer] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (answer === null || answer === undefined) return;
    setLoading(true);
    try {
      const res = await fetch("/api/survey/response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, questionId: question.id, answer }),
      });
      if (res.ok) {
        router.push(`/s/${surveyId}/q?q=${position + 1}`);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardDescription>
          Question {position + 1} of {totalQuestions}
        </CardDescription>
        <CardTitle className="text-lg">{content.text}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {question.type === "MULTIPLE_CHOICE" && content.options && (
          <MultipleChoice
            options={content.options}
            value={answer as string | null}
            onChange={setAnswer}
          />
        )}
        {question.type === "LIKERT" && content.scale && (
          <LikertScale
            scale={content.scale}
            value={answer as number | null}
            onChange={setAnswer}
          />
        )}
        {question.type === "FREE_TEXT" && (
          <FreeText value={(answer as string) ?? ""} onChange={setAnswer} />
        )}
        {question.type === "MATRIX" && content.rows && content.columns && (
          <Matrix
            rows={content.rows}
            columns={content.columns}
            value={(answer as Record<string, string>) ?? {}}
            onChange={setAnswer}
          />
        )}
        {question.type === "RANKING" && content.options && (
          <Ranking
            options={content.options}
            value={(answer as string[]) ?? [...content.options]}
            onChange={setAnswer}
          />
        )}

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={loading || answer === null || isAnswered}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isAnswered ? "Already answered" : "Next"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MultipleChoice({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((option) => (
        <label
          key={option}
          className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
            value === option ? "border-primary bg-primary/5" : "hover:bg-muted/50"
          }`}
        >
          <input
            type="radio"
            name="choice"
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
            className="h-4 w-4"
          />
          <span className="text-sm">{option}</span>
        </label>
      ))}
    </div>
  );
}

function LikertScale({
  scale,
  value,
  onChange,
}: {
  scale: { min: number; max: number; minLabel?: string; maxLabel?: string };
  value: number | null;
  onChange: (v: number) => void;
}) {
  const points = Array.from(
    { length: scale.max - scale.min + 1 },
    (_, i) => scale.min + i
  );

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{scale.minLabel}</span>
        <span>{scale.maxLabel}</span>
      </div>
      <div className="flex justify-between gap-2">
        {points.map((point) => (
          <button
            key={point}
            onClick={() => onChange(point)}
            className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-medium transition-colors ${
              value === point
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:border-primary/50"
            }`}
          >
            {point}
          </button>
        ))}
      </div>
    </div>
  );
}

function FreeText({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Type your answer..."
      rows={4}
    />
  );
}

function Matrix({
  rows,
  columns,
  value,
  onChange,
}: {
  rows: string[];
  columns: string[];
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left p-2"></th>
            {columns.map((col) => (
              <th key={col} className="p-2 text-center font-medium">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row} className="border-t">
              <td className="p-2 font-medium">{row}</td>
              {columns.map((col) => (
                <td key={col} className="p-2 text-center">
                  <input
                    type="radio"
                    name={`matrix-${row}`}
                    checked={value[row] === col}
                    onChange={() => onChange({ ...value, [row]: col })}
                    className="h-4 w-4"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Ranking({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  function moveUp(index: number) {
    if (index === 0) return;
    const next = [...value];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  }

  function moveDown(index: number) {
    if (index === value.length - 1) return;
    const next = [...value];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  }

  // Initialize with options if value matches
  const items = value.length === options.length ? value : [...options];

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground mb-2">
        Use the arrows to reorder items (most important at top).
      </p>
      {items.map((item, i) => (
        <div
          key={item}
          className="flex items-center gap-2 rounded-lg border p-2"
        >
          <span className="w-6 text-center text-sm font-medium text-muted-foreground">
            {i + 1}
          </span>
          <span className="flex-1 text-sm">{item}</span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={i === 0}
              onClick={() => moveUp(i)}
            >
              <span className="text-xs">^</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={i === items.length - 1}
              onClick={() => moveDown(i)}
            >
              <span className="text-xs">v</span>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
