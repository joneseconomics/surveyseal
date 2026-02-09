"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import type { Question } from "@/generated/prisma/client";
import { useBotTelemetry } from "@/lib/bot-detection";

interface QuestionRendererProps {
  sessionId: string;
  surveyId: string;
  question: Question;
  isAnswered: boolean;
  nextPosition: number;
}

interface QuestionContent {
  text: string;
  options?: string[];
  scale?: { min: number; max: number; minLabel?: string; maxLabel?: string };
  rows?: string[];
  columns?: string[];
  maxStars?: number;
  min?: number;
  max?: number;
  step?: number;
}

export function QuestionRenderer({
  sessionId,
  surveyId,
  question,
  isAnswered,
  nextPosition,
}: QuestionRendererProps) {
  const content = question.content as unknown as QuestionContent;
  const [answer, setAnswer] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const { getTelemetry } = useBotTelemetry(question.id);

  async function handleSubmit() {
    if (answer === null || answer === undefined) return;
    setLoading(true);
    try {
      let telemetry;
      try { telemetry = getTelemetry(); } catch { /* graceful degradation */ }
      const res = await fetch("/api/survey/response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, questionId: question.id, answer, telemetry }),
      });
      if (res.ok) {
        window.location.href = `/s/${surveyId}/q?q=${nextPosition}`;
        return;
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
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
            onInit={() => { if (answer === null) setAnswer([...content.options!]); }}
          />
        )}
        {question.type === "SHORT_TEXT" && (
          <ShortText value={(answer as string) ?? ""} onChange={setAnswer} />
        )}
        {question.type === "URL" && (
          <UrlInput value={(answer as string) ?? ""} onChange={setAnswer} />
        )}
        {question.type === "EMAIL" && (
          <EmailInput value={(answer as string) ?? ""} onChange={setAnswer} />
        )}
        {question.type === "YES_NO" && (
          <YesNo value={answer as string | null} onChange={setAnswer} />
        )}
        {question.type === "CUSTOMER_SATISFACTION" && (
          <CustomerSatisfaction value={answer as number | null} onChange={setAnswer} />
        )}
        {question.type === "NPS" && (
          <NpsScale value={answer as number | null} onChange={setAnswer} />
        )}
        {question.type === "CHECKBOX" && content.options && (
          <CheckboxInput
            options={content.options}
            value={(answer as string[]) ?? []}
            onChange={setAnswer}
          />
        )}
        {question.type === "RATING" && (
          <StarRating
            maxStars={content.maxStars ?? 5}
            value={answer as number | null}
            onChange={setAnswer}
          />
        )}
        {question.type === "DATE" && (
          <DateInput value={(answer as string) ?? ""} onChange={setAnswer} />
        )}
        {question.type === "DATE_TIME" && (
          <DateTimeInput value={(answer as string) ?? ""} onChange={setAnswer} />
        )}
        {question.type === "NUMBER" && (
          <NumberInput value={(answer as string) ?? ""} onChange={setAnswer} />
        )}
        {question.type === "PERCENTAGE" && (
          <PercentageInput value={(answer as string) ?? ""} onChange={setAnswer} />
        )}
        {question.type === "SLIDER" && (
          <SliderInput
            min={content.min ?? 0}
            max={content.max ?? 100}
            step={content.step ?? 1}
            value={answer as number | null}
            onChange={setAnswer}
          />
        )}
        {question.type === "PHONE_NUMBER" && (
          <PhoneInput value={(answer as string) ?? ""} onChange={setAnswer} />
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

// ─── Existing Sub-Components ─────────────────────────────────────────────────

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
  onInit,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  onInit: () => void;
}) {
  useEffect(() => { onInit(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
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

// ─── New Sub-Components ──────────────────────────────────────────────────────

function ShortText({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Type your answer..."
    />
  );
}

function UrlInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Input
      type="url"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="https://example.com"
    />
  );
}

function EmailInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Input
      type="email"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="you@example.com"
    />
  );
}

function YesNo({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-3">
      {["Yes", "No"].map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`flex-1 rounded-lg border p-3 text-sm font-medium transition-colors ${
            value === opt
              ? "border-primary bg-primary text-primary-foreground"
              : "hover:border-primary/50"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function CustomerSatisfaction({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number) => void;
}) {
  const levels = [
    { score: 1, label: "Very Unsatisfied" },
    { score: 2, label: "Unsatisfied" },
    { score: 3, label: "Neutral" },
    { score: 4, label: "Satisfied" },
    { score: 5, label: "Very Satisfied" },
  ];

  return (
    <div className="flex justify-between gap-2">
      {levels.map(({ score, label }) => (
        <button
          key={score}
          onClick={() => onChange(score)}
          className={`flex flex-1 flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-colors ${
            value === score
              ? "border-primary bg-primary text-primary-foreground"
              : "hover:border-primary/50"
          }`}
        >
          <span className="text-lg font-medium">{score}</span>
          <span className="leading-tight">{label}</span>
        </button>
      ))}
    </div>
  );
}

function NpsScale({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Not at all likely</span>
        <span>Extremely likely</span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 11 }, (_, i) => (
          <button
            key={i}
            onClick={() => onChange(i)}
            className={`flex h-9 w-9 items-center justify-center rounded border text-xs font-medium transition-colors ${
              value === i
                ? "border-primary bg-primary text-primary-foreground"
                : i <= 6
                  ? "hover:border-red-300 hover:bg-red-50"
                  : i <= 8
                    ? "hover:border-yellow-300 hover:bg-yellow-50"
                    : "hover:border-green-300 hover:bg-green-50"
            }`}
          >
            {i}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Detractor (0-6)</span>
        <span>Passive (7-8)</span>
        <span>Promoter (9-10)</span>
      </div>
    </div>
  );
}

function CheckboxInput({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  function toggle(option: string) {
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option));
    } else {
      onChange([...value, option]);
    }
  }

  return (
    <div className="space-y-2">
      {options.map((option) => (
        <label
          key={option}
          className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
            value.includes(option) ? "border-primary bg-primary/5" : "hover:bg-muted/50"
          }`}
        >
          <input
            type="checkbox"
            checked={value.includes(option)}
            onChange={() => toggle(option)}
            className="h-4 w-4"
          />
          <span className="text-sm">{option}</span>
        </label>
      ))}
    </div>
  );
}

function StarRating({
  maxStars,
  value,
  onChange,
}: {
  maxStars: number;
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: maxStars }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          onClick={() => onChange(star)}
          className="text-2xl transition-colors"
        >
          <span className={value !== null && star <= value ? "text-yellow-400" : "text-gray-300"}>
            &#9733;
          </span>
        </button>
      ))}
    </div>
  );
}

function DateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function DateTimeInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Input
      type="datetime-local"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function NumberInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter a number"
    />
  );
}

function PercentageInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
      />
      <span className="text-lg font-medium text-muted-foreground">%</span>
    </div>
  );
}

function SliderInput({
  min,
  max,
  step,
  value,
  onChange,
}: {
  min: number;
  max: number;
  step: number;
  value: number | null;
  onChange: (v: number) => void;
}) {
  const current = value ?? Math.round((min + max) / 2);

  return (
    <div className="space-y-2">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={current}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{min}</span>
        <span className="font-medium text-foreground text-sm">{current}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function PhoneInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Input
      type="tel"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="+1 (555) 000-0000"
    />
  );
}
