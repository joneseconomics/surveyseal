"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, CheckCircle2, Users } from "lucide-react";

interface CanvasImportDialogProps {
  surveyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Course {
  id: number;
  name: string;
  courseCode: string;
}

interface Assignment {
  id: number;
  name: string;
  dueAt: string | null;
  isGroup: boolean;
  submissionTypes: string[];
  hasSubmissions: boolean;
}

interface Submission {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  submissionType: string | null;
  body: string | null;
  url: string | null;
  attachments: { id: number; displayName: string; contentType: string }[];
}

type Step = "course" | "assignment" | "preview" | "importing" | "done";

export function CanvasImportDialog({
  surveyId,
  open,
  onOpenChange,
}: CanvasImportDialogProps) {
  const [step, setStep] = useState<Step>("course");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);

  function reset() {
    setStep("course");
    setLoading(false);
    setError("");
    setCourses([]);
    setSelectedCourse(null);
    setAssignments([]);
    setSelectedAssignment(null);
    setSubmissions([]);
    setResult(null);
  }

  function handleOpenChange(open: boolean) {
    if (!open) reset();
    onOpenChange(open);
  }

  async function loadCourses() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/canvas/courses?surveyId=${surveyId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCourses(data.courses);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load courses");
    } finally {
      setLoading(false);
    }
  }

  async function selectCourse(course: Course) {
    setSelectedCourse(course);
    setStep("assignment");
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/canvas/assignments?surveyId=${surveyId}&courseId=${course.id}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAssignments(data.assignments);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  }

  async function selectAssignment(assignment: Assignment) {
    setSelectedAssignment(assignment);
    setStep("preview");
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/canvas/submissions?surveyId=${surveyId}&courseId=${selectedCourse!.id}&assignmentId=${assignment.id}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubmissions(data.submissions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load submissions");
    } finally {
      setLoading(false);
    }
  }

  async function doImport() {
    setStep("importing");
    setError("");
    try {
      const res = await fetch("/api/canvas/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surveyId,
          courseId: selectedCourse!.id,
          assignmentId: selectedAssignment!.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
      setStep("preview");
    }
  }

  // Load courses when dialog opens
  const handleDialogOpen = () => {
    if (courses.length === 0 && !loading) {
      loadCourses();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
    >
      <DialogContent
        className="max-w-lg max-h-[80vh] overflow-y-auto"
        onOpenAutoFocus={handleDialogOpen}
      >
        <DialogHeader>
          <DialogTitle>Import from Canvas</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Step 1: Select Course */}
        {step === "course" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Select a course to import submissions from.
            </p>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : courses.length === 0 && !error ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No courses found. Make sure you have teacher access.
              </p>
            ) : (
              <div className="space-y-2">
                {courses.map((course) => (
                  <Card
                    key={course.id}
                    className="cursor-pointer transition-colors hover:bg-accent/50"
                    onClick={() => selectCourse(course)}
                  >
                    <CardContent className="py-3">
                      <p className="font-medium">{course.name}</p>
                      <p className="text-xs text-muted-foreground">{course.courseCode}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Assignment */}
        {step === "assignment" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep("course")}>
                &larr; Back
              </Button>
              <p className="text-sm text-muted-foreground">
                {selectedCourse?.name}
              </p>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : assignments.length === 0 && !error ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No assignments found in this course.
              </p>
            ) : (
              <div className="space-y-2">
                {assignments.map((assignment) => (
                  <Card
                    key={assignment.id}
                    className={
                      assignment.isGroup
                        ? "opacity-60"
                        : "cursor-pointer transition-colors hover:bg-accent/50"
                    }
                    onClick={() => !assignment.isGroup && selectAssignment(assignment)}
                  >
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{assignment.name}</p>
                          {assignment.dueAt && (
                            <p className="text-xs text-muted-foreground">
                              Due: {new Date(assignment.dueAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        {assignment.isGroup && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Group
                          </Badge>
                        )}
                      </div>
                      {assignment.isGroup && (
                        <p className="mt-1 text-xs text-destructive">
                          Group assignments cannot be imported for comparative judgment
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Preview & Confirm */}
        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep("assignment")}>
                &larr; Back
              </Button>
              <p className="text-sm text-muted-foreground">
                {selectedAssignment?.name}
              </p>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="rounded-md border p-4 space-y-2">
                  <p className="font-medium">
                    {submissions.length} submission{submissions.length !== 1 ? "s" : ""} found
                  </p>
                  <SubmissionBreakdown submissions={submissions} />
                </div>
                <Button onClick={doImport} disabled={submissions.length === 0}>
                  Import {submissions.length} Submission{submissions.length !== 1 ? "s" : ""}
                </Button>
              </>
            )}
          </div>
        )}

        {/* Step 4: Importing */}
        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Importing submissions... This may take a moment for file uploads.
            </p>
          </div>
        )}

        {/* Step 5: Done */}
        {step === "done" && result && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
            <p className="font-medium">Import Complete</p>
            <p className="text-sm text-muted-foreground">
              Imported {result.imported} item{result.imported !== 1 ? "s" : ""}
              {result.skipped > 0 && `, skipped ${result.skipped} (no submission content)`}
            </p>
            <Button
              onClick={() => {
                handleOpenChange(false);
                window.location.reload();
              }}
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SubmissionBreakdown({ submissions }: { submissions: Submission[] }) {
  const textCount = submissions.filter((s) => s.submissionType === "online_text_entry").length;
  const fileCount = submissions.filter((s) => s.submissionType === "online_upload").length;
  const urlCount = submissions.filter((s) => s.submissionType === "online_url").length;
  const otherCount = submissions.length - textCount - fileCount - urlCount;

  const parts: string[] = [];
  if (textCount > 0) parts.push(`${textCount} text`);
  if (fileCount > 0) parts.push(`${fileCount} file${fileCount !== 1 ? "s" : ""}`);
  if (urlCount > 0) parts.push(`${urlCount} URL${urlCount !== 1 ? "s" : ""}`);
  if (otherCount > 0) parts.push(`${otherCount} other`);

  return (
    <p className="text-sm text-muted-foreground">
      {parts.join(", ")}
    </p>
  );
}
