"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, Users } from "lucide-react";

interface Course {
  id: number;
  name: string;
  courseCode: string;
}

interface Assignment {
  id: number;
  name: string;
  description: string | null;
  dueAt: string | null;
  isGroup: boolean;
}

interface CanvasInstructionsImportProps {
  surveyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (text: string) => void;
}

export function CanvasInstructionsImport({
  surveyId,
  open,
  onOpenChange,
  onImport,
}: CanvasInstructionsImportProps) {
  const [step, setStep] = useState<"course" | "assignment">("course");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  function reset() {
    setStep("course");
    setLoading(false);
    setError("");
    setCourses([]);
    setSelectedCourse(null);
    setAssignments([]);
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

  function selectAssignment(assignment: Assignment) {
    if (!assignment.description) {
      setError("This assignment has no description/instructions in Canvas.");
      return;
    }
    // Strip HTML tags to get plain text
    const div = document.createElement("div");
    div.innerHTML = assignment.description;
    const plainText = div.textContent || div.innerText || "";
    onImport(plainText.trim());
    handleOpenChange(false);
  }

  const handleDialogOpen = () => {
    if (courses.length === 0 && !loading) {
      loadCourses();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-lg max-h-[80vh] overflow-y-auto"
        onOpenAutoFocus={handleDialogOpen}
      >
        <DialogHeader>
          <DialogTitle>Import Instructions from Canvas</DialogTitle>
          <DialogDescription>
            Select a course and assignment to import its description as the assignment instructions.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {step === "course" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Select a course.
            </p>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : courses.length === 0 && !error ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No courses found. Make sure Canvas is configured in Settings.
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

        {step === "assignment" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setStep("course"); setError(""); }}>
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
                      !assignment.description
                        ? "opacity-60"
                        : "cursor-pointer transition-colors hover:bg-accent/50"
                    }
                    onClick={() => assignment.description && selectAssignment(assignment)}
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
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Group
                          </Badge>
                        )}
                      </div>
                      {!assignment.description && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          No description available
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
