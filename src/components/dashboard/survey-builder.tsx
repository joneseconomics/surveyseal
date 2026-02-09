"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { deleteSurvey, publishSurvey, closeSurvey, reopenSurvey } from "@/lib/actions/survey";
import { SortableQuestionList } from "@/components/dashboard/sortable-question-list";
import { QuestionEditor } from "@/components/dashboard/question-editor";
import { ImportQuestions } from "@/components/dashboard/import-questions";
import { CJBuilder } from "@/components/dashboard/cj-builder";
import { EditableSurveyTitle } from "@/components/dashboard/editable-survey-title";
import { Globe, Trash2, ExternalLink, Upload, Link2, Check, Clock } from "lucide-react";
import { SurveySealLogo } from "@/components/logo";
import type { Survey, Question } from "@/generated/prisma/client";
import type { CJItemContent } from "@/lib/validations/cj";

interface CJItemData {
  id: string;
  label: string;
  content: CJItemContent;
  position: number;
}

interface SurveyBuilderProps {
  survey: Survey;
  questions: Question[];
  responseCount: number;
  cjItems?: CJItemData[];
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function estimateQuestionSeconds(question: Question): number {
  const content = question.content as {
    text?: string;
    options?: string[];
    rows?: string[];
    columns?: string[];
    scale?: { min?: number; max?: number };
  };

  const questionText = content?.text ?? "";
  // Reading time: ~250 words/min = ~4 words/sec
  const readingSeconds = countWords(questionText) / 4;

  switch (question.type) {
    case "YES_NO":
    case "NPS":
    case "RATING":
    case "SLIDER":
    case "NUMBER":
    case "PERCENTAGE":
    case "DATE":
    case "DATE_TIME":
      // Simple single-input: read + quick answer
      return readingSeconds + 5;

    case "MULTIPLE_CHOICE":
    case "CHECKBOX":
    case "CUSTOMER_SATISFACTION": {
      // Read question + read each option (~1.5s per option) + decide
      const optionCount = content?.options?.length ?? 3;
      const optionWords = (content?.options ?? []).reduce((sum, o) => sum + countWords(o), 0);
      return readingSeconds + (optionWords / 4) + (optionCount * 1.5) + 3;
    }

    case "LIKERT": {
      // Read question + scan scale labels + decide
      const scalePoints = (content?.scale?.max ?? 5) - (content?.scale?.min ?? 1) + 1;
      return readingSeconds + (scalePoints * 1) + 3;
    }

    case "MATRIX": {
      // Read question + each row × each column interaction
      const rowCount = content?.rows?.length ?? 3;
      const colCount = content?.columns?.length ?? 3;
      const rowWords = (content?.rows ?? []).reduce((sum, r) => sum + countWords(r), 0);
      const colWords = (content?.columns ?? []).reduce((sum, c) => sum + countWords(c), 0);
      return readingSeconds + (rowWords / 4) + (colWords / 4) + (rowCount * colCount * 1.5) + 3;
    }

    case "RANKING": {
      // Read question + read each option + drag-and-drop ordering
      const itemCount = content?.options?.length ?? 4;
      const optionWords = (content?.options ?? []).reduce((sum, o) => sum + countWords(o), 0);
      return readingSeconds + (optionWords / 4) + (itemCount * 3) + 5;
    }

    case "SHORT_TEXT":
    case "EMAIL":
    case "URL":
    case "PHONE_NUMBER":
      // Read question + type short answer
      return readingSeconds + 10;

    case "FREE_TEXT":
      // Read question + compose a paragraph
      return readingSeconds + 45;

    default:
      return readingSeconds + 15;
  }
}

function estimateCompletionTime(questions: Question[], vpCount: number, vpTimerSeconds: number): string {
  const questionTimeSeconds = questions.reduce((sum, q) => sum + estimateQuestionSeconds(q), 0);
  // VP time: timer duration + ~10s for the tap/skip interaction
  const vpTimeSeconds = vpCount * (vpTimerSeconds + 10);
  const totalSeconds = questionTimeSeconds + vpTimeSeconds;

  const minutes = Math.ceil(totalSeconds / 60);
  if (minutes <= 1) return "1 minute";
  if (minutes <= 2) return "1\u20132 minutes";
  const low = Math.max(1, minutes - 1);
  const high = minutes + 1;
  return `${low}\u2013${high} minutes`;
}

export function SurveyBuilder({ survey, questions, cjItems }: SurveyBuilderProps) {
  const [showEditor, setShowEditor] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [addAsVP, setAddAsVP] = useState(false);
  const [copied, setCopied] = useState(false);
  const isDraft = survey.status === "DRAFT";
  const isCJ = survey.type === "COMPARATIVE_JUDGMENT";
  const regularQuestions = questions.filter((q) => !q.isVerificationPoint);
  const vpCount = questions.filter((q) => q.isVerificationPoint).length;
  const cjItemCount = cjItems?.length ?? 0;
  const canPublish = isCJ
    ? cjItemCount >= 3
    : regularQuestions.length >= 1;

  return (
    <div className="space-y-6">
      {/* Survey header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <EditableSurveyTitle
              surveyId={survey.id}
              title={survey.title}
              isDraft={isDraft}
            />
            <Badge variant={survey.status === "LIVE" ? "default" : "secondary"}>
              {survey.status}
            </Badge>
            <Badge variant="outline">
              {survey.type === "COMPARATIVE_JUDGMENT"
                ? `CJ — ${survey.cjSubtype === "ASSIGNMENTS" ? "Assignments" : survey.cjSubtype === "RESUMES" ? "Resumes" : "General"}`
                : "Questionnaire"}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {survey.status === "LIVE" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const url = `${window.location.origin}/s/${survey.id}`;
                  navigator.clipboard.writeText(url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? (
                  <><Check className="mr-2 h-4 w-4 text-green-600" />Copied!</>
                ) : (
                  <><Link2 className="mr-2 h-4 w-4" />Copy URL</>
                )}
              </Button>
              <a href={`/s/${survey.id}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Survey
                </Button>
              </a>
            </>
          )}
          {isDraft && (
            <form action={() => publishSurvey(survey.id)}>
              <Button
                size="sm"
                disabled={!canPublish}
                title={
                  !canPublish
                    ? isCJ
                      ? `Need 3+ items (${cjItemCount})`
                      : `Need at least 1 question`
                    : "Publish survey"
                }
              >
                <Globe className="mr-2 h-4 w-4" />
                Publish
              </Button>
            </form>
          )}
          {survey.status === "LIVE" && (
            <form action={() => closeSurvey(survey.id)}>
              <Button variant="outline" size="sm">
                Close Survey
              </Button>
            </form>
          )}
          {survey.status === "CLOSED" && (
            <form action={() => reopenSurvey(survey.id)}>
              <Button variant="outline" size="sm">
                <Globe className="mr-2 h-4 w-4" />
                Reopen Survey
              </Button>
            </form>
          )}
          {isDraft && (
            <form action={() => deleteSurvey(survey.id)}>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Content section: CJ builder or Questionnaire builder */}
      {isCJ ? (
        <CJBuilder
          surveyId={survey.id}
          cjItems={cjItems ?? []}
          isDraft={isDraft}
          cjSubtype={survey.cjSubtype}
          assignmentInstructions={survey.cjAssignmentInstructions}
          judgeInstructions={survey.cjJudgeInstructions}
          jobUrl={survey.cjJobUrl}
          jobTitle={survey.cjJobTitle}
          jobDescFileUrl={survey.cjJobDescFileUrl}
          jobDescFileType={survey.cjJobDescFileType}
          jobDescFileName={survey.cjJobDescFileName}
          jobDescFilePath={survey.cjJobDescFilePath}
        />
      ) : (
        <>
          {/* Questions section */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  Survey Questions
                </h2>
                <p className="text-sm text-muted-foreground">
                  {regularQuestions.length} question{regularQuestions.length !== 1 ? "s" : ""}
                </p>
              </div>
              {isDraft && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowImport(true)}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Import
                  </Button>
                  <Button
                    onClick={() => {
                      setAddAsVP(false);
                      setEditingQuestion(null);
                      setShowEditor(true);
                    }}
                  >
                    Add Question
                  </Button>
                </div>
              )}
            </div>

            {regularQuestions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No questions yet. Add your first question to get started.
                </CardContent>
              </Card>
            ) : (
              <SortableQuestionList
                surveyId={survey.id}
                questions={regularQuestions}
                isDraft={isDraft}
                onEdit={(question) => {
                  setEditingQuestion(question);
                  setShowEditor(true);
                }}
              />
            )}
          </div>

          {/* Verification points note */}
          {vpCount > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <SurveySealLogo className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">
                  {vpCount} verification point{vpCount !== 1 ? "s" : ""} included
                </p>
                <p className="mt-1">
                  {vpCount === 1
                    ? "The verification point will appear at the beginning of the survey."
                    : vpCount === 2
                      ? "Verification points will appear at the beginning and the end of the survey."
                      : `Verification points will appear at the beginning and end of the survey. The remaining ${vpCount - 2} will be evenly distributed throughout.`}
                </p>
              </div>
            </div>
          )}

          {/* Time estimate */}
          {regularQuestions.length > 0 && (
            <div className="flex items-start gap-3 rounded-lg border bg-muted/50 p-4">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">
                  Estimated completion time
                </p>
                <p className="mt-1">
                  Approximately {estimateCompletionTime(regularQuestions, vpCount, survey.verificationPointTimerSeconds)}
                </p>
              </div>
            </div>
          )}

          {/* Question editor dialog */}
          {showEditor && (
            <QuestionEditor
              surveyId={survey.id}
              question={editingQuestion}
              forceVP={editingQuestion ? editingQuestion.isVerificationPoint : addAsVP}
              onClose={() => {
                setShowEditor(false);
                setEditingQuestion(null);
              }}
            />
          )}

          {/* Import questions dialog */}
          <ImportQuestions
            surveyId={survey.id}
            open={showImport}
            onOpenChange={setShowImport}
          />
        </>
      )}
    </div>
  );
}
