"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { updateSurvey, deleteSurvey, publishSurvey, closeSurvey, reopenSurvey } from "@/lib/actions/survey";
import { SortableQuestionList } from "@/components/dashboard/sortable-question-list";
import { QuestionEditor } from "@/components/dashboard/question-editor";
import { ImportQuestions } from "@/components/dashboard/import-questions";
import { CJBuilder } from "@/components/dashboard/cj-builder";
import { Globe, Trash2, ExternalLink, Upload, Shield } from "lucide-react";
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
  const isDraft = survey.status === "DRAFT";
  const isCJ = survey.type === "COMPARATIVE_JUDGMENT";
  const regularQuestions = questions.filter((q) => !q.isVerificationPoint);
  const vpCount = questions.filter((q) => q.isVerificationPoint).length;
  const cjItemCount = cjItems?.length ?? 0;
  const canPublish = isCJ
    ? vpCount === 3 && cjItemCount >= 3 && !!survey.cjPrompt
    : vpCount === 3;

  return (
    <div className="space-y-6">
      {/* Survey header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{survey.title}</h1>
            <Badge variant={survey.status === "LIVE" ? "default" : "secondary"}>
              {survey.status}
            </Badge>
            <Badge variant="outline">
              {survey.type === "COMPARATIVE_JUDGMENT"
                ? "Comparative Judgment"
                : "Questionnaire"}
            </Badge>
          </div>
          {survey.description && (
            <p className="mt-1 text-muted-foreground">{survey.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          {survey.status === "LIVE" && (
            <a href={`/s/${survey.id}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Survey
              </Button>
            </a>
          )}
          {isDraft && (
            <form action={() => publishSurvey(survey.id)}>
              <Button
                size="sm"
                disabled={!canPublish}
                title={
                  !canPublish
                    ? isCJ
                      ? `Need 3 VPs (${vpCount}), 3+ items (${cjItemCount}), and a prompt`
                      : `Need exactly 3 verification points (have ${vpCount})`
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

      {/* Survey details (editable in draft) */}
      {isDraft && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Survey Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateSurvey} className="space-y-4">
              <input type="hidden" name="id" value={survey.id} />
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" defaultValue={survey.title} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={survey.description ?? ""}
                  rows={2}
                />
              </div>
              <Button type="submit" size="sm">
                Save
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Content section: CJ builder or Questionnaire builder */}
      {isCJ ? (
        <CJBuilder
          surveyId={survey.id}
          cjItems={cjItems ?? []}
          cjPrompt={survey.cjPrompt}
          comparisonsPerJudge={survey.comparisonsPerJudge}
          isDraft={isDraft}
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
                  {regularQuestions.length} question{regularQuestions.length !== 1 ? "s" : ""} · {vpCount}/3 verification points
                  {vpCount === 3 && " — Ready to publish"}
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
                  {vpCount < 3 && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAddAsVP(true);
                        setEditingQuestion(null);
                        setShowEditor(true);
                      }}
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      Add Verification Point
                    </Button>
                  )}
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
