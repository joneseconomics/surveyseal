"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { updateSurvey, deleteSurvey, publishSurvey, closeSurvey } from "@/lib/actions/survey";
import { QuestionCard } from "@/components/dashboard/question-card";
import { QuestionEditor } from "@/components/dashboard/question-editor";
import { ImportQuestions } from "@/components/dashboard/import-questions";
import { Globe, Trash2, ExternalLink, Upload } from "lucide-react";
import type { Survey, Question } from "@/generated/prisma/client";

interface SurveyBuilderProps {
  survey: Survey;
  questions: Question[];
  responseCount: number;
}

export function SurveyBuilder({ survey, questions, responseCount }: SurveyBuilderProps) {
  const [showEditor, setShowEditor] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const isDraft = survey.status === "DRAFT";
  const checkpointCount = questions.filter((q) => q.isCheckpoint).length;

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
                disabled={checkpointCount !== 3}
                title={
                  checkpointCount !== 3
                    ? `Need exactly 3 checkpoints (have ${checkpointCount})`
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

      {/* Questions section */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              Questions ({questions.length})
            </h2>
            <p className="text-sm text-muted-foreground">
              {checkpointCount}/3 checkpoints placed
              {checkpointCount === 3 && " — Ready to publish"}
            </p>
          </div>
          {isDraft && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowImport(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import Questions
              </Button>
              <Button
                onClick={() => {
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
          <div className="space-y-2">
            {questions.map((question, index) => (
              <QuestionCard
                key={question.id}
                question={question}
                index={index}
                isFirst={index === 0}
                isLast={index === questions.length - 1}
                isDraft={isDraft}
                onEdit={() => {
                  setEditingQuestion(question);
                  setShowEditor(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      {!isDraft && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stats</CardTitle>
            <CardDescription>
              {responseCount} response{responseCount !== 1 ? "s" : ""} collected
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Question editor dialog */}
      {showEditor && (
        <QuestionEditor
          surveyId={survey.id}
          question={editingQuestion}
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
    </div>
  );
}
