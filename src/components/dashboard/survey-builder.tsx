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
import { Globe, Trash2, ExternalLink, Upload, Link2, Check } from "lucide-react";
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
                  Survey Items
                </h2>
                <p className="text-sm text-muted-foreground">
                  {regularQuestions.length} question{regularQuestions.length !== 1 ? "s" : ""} · {vpCount} verification point{vpCount !== 1 ? "s" : ""}
                  {vpCount >= 2 && " — Ready to publish"}
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

            {questions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No questions yet. Add your first question to get started.
                </CardContent>
              </Card>
            ) : (
              <SortableQuestionList
                surveyId={survey.id}
                questions={questions}
                isDraft={isDraft}
                onEdit={(question) => {
                  setEditingQuestion(question);
                  setShowEditor(true);
                }}
              />
            )}
          </div>

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
