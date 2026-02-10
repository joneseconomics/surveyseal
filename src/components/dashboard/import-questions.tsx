"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { parseQuestionCSV, type ParsedQuestion, type ParseError } from "@/lib/csv";
import { importQuestionsFromCSV } from "@/lib/actions/question";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";

interface ImportQuestionsProps {
  surveyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  YES_NO: "Yes/No",
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

export function ImportQuestions({ surveyId, open, onOpenChange }: ImportQuestionsProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);

  function reset() {
    setQuestions([]);
    setErrors([]);
    setImporting(false);
    setDone(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDone(false);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = parseQuestionCSV(text);
      setQuestions(result.questions);
      setErrors(result.errors);
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (questions.length === 0) return;
    setImporting(true);
    try {
      await importQuestionsFromCSV({
        surveyId,
        questions: questions.map((q) => ({ type: q.type, content: q.content })),
      });
      setDone(true);
      setTimeout(() => {
        onOpenChange(false);
        reset();
      }, 1000);
    } catch (err) {
      console.error("Import failed:", err);
      setErrors((prev) => [...prev, { row: 0, message: "Import failed. Please try again." }]);
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Questions from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV with columns: Section, Question Text, Type, Choices (~ separated)
          </DialogDescription>
        </DialogHeader>

        <CSVFormatHelp />

        <div className="space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer"
          />

          {errors.length > 0 && (
            <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 space-y-1">
              {errors.map((err, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    {err.row > 0 ? `Row ${err.row}: ` : ""}
                    {err.message}
                  </span>
                </div>
              ))}
            </div>
          )}

          {questions.length > 0 && (
            <div className="rounded-md border">
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="p-2 text-left font-medium w-8">#</th>
                      <th className="p-2 text-left font-medium">Question</th>
                      <th className="p-2 text-left font-medium w-28">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map((q, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2 text-muted-foreground">{i + 1}</td>
                        <td className="p-2 truncate max-w-[300px]">
                          {(q.content.text as string) || "—"}
                        </td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-xs">
                            {typeLabels[q.type] || q.type}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {done && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Successfully imported {questions.length} questions
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={importing || questions.length === 0 || done}
          >
            {importing ? "Importing..." : `Import ${questions.length} Questions`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CSVFormatHelp() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-md border bg-muted/30">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        CSV format guide
      </button>
      {open && (
        <div className="border-t px-3 py-3 text-xs text-muted-foreground space-y-3">
          <div>
            <p className="font-medium text-foreground mb-1">Required columns (in order)</p>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b">
                  <th className="pb-1 pr-3 font-medium">Column</th>
                  <th className="pb-1 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="space-y-1">
                <tr><td className="pr-3 py-0.5">Section</td><td>Optional grouping label (can be empty)</td></tr>
                <tr><td className="pr-3 py-0.5">Question Text</td><td>The question shown to respondents</td></tr>
                <tr><td className="pr-3 py-0.5">Type</td><td>Question type (see below)</td></tr>
                <tr><td className="pr-3 py-0.5">Choices</td><td>Options separated by <code className="bg-muted px-1 rounded">~</code></td></tr>
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-medium text-foreground mb-1">Supported question types</p>
            <div className="flex flex-wrap gap-1">
              {[
                "Multiple Choice", "Checkbox", "Yes/No", "Likert", "NPS",
                "Rating", "Short Text", "Free Text", "Number", "Percentage",
                "Slider", "Date", "Date & Time", "Email", "URL", "Phone",
                "Ranking", "Customer Satisfaction",
              ].map((t) => (
                <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">
                  {t}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <p className="font-medium text-foreground mb-1">Example</p>
            <pre className="rounded bg-muted p-2 overflow-x-auto text-[11px] leading-relaxed">
{`Section,Question Text,Type,Choices
Demographics,What is your age?,Number,
Demographics,What is your major?,Multiple Choice,CS~Math~Biology~Other
Feedback,Rate your experience,Likert,Very Poor~Poor~Fair~Good~Excellent
,Any additional comments?,Free Text,`}
            </pre>
          </div>

          <p>
            A header row is optional. The first row is auto-detected as a header if it contains
            &ldquo;Section&rdquo;, &ldquo;Question&rdquo;, or &ldquo;Type&rdquo;.
          </p>
        </div>
      )}
    </div>
  );
}
