"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload } from "lucide-react";

interface AddJudgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (persona: {
    id: string;
    name: string;
    title: string;
    description: string;
    cvFileName: string;
    createdAt: string;
  }) => void;
}

export function AddJudgeDialog({ open, onOpenChange, onCreate }: AddJudgeDialogProps) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setName("");
    setTitle("");
    setDescription("");
    setFile(null);
    setError("");
  };

  const handleSubmit = async () => {
    if (!name.trim() || !title.trim() || !description.trim() || !file) {
      setError("All fields are required");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("file", file);

      const res = await fetch("/api/ai/judge-personas", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create judge persona");
      }

      const data = await res.json();
      onCreate(data.persona);
      reset();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create judge persona");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!submitting) { onOpenChange(v); if (!v) reset(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Judge Persona</DialogTitle>
          <DialogDescription>
            Upload a CV (.docx or .pdf) to create a judge persona. The extracted text will be used as context for the AI.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="judge-name">Name</Label>
            <Input
              id="judge-name"
              placeholder="e.g. Michael Jones"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="judge-title">Title</Label>
            <Input
              id="judge-title"
              placeholder="e.g. Professor of Computer Science"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="judge-description">Description</Label>
            <Textarea
              id="judge-description"
              placeholder="Brief description of their expertise and perspective..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="judge-cv">CV File</Label>
            <div className="flex items-center gap-2">
              <label
                htmlFor="judge-cv"
                className="flex items-center gap-2 cursor-pointer rounded-md border px-3 py-2 text-sm hover:bg-muted/50"
              >
                <Upload className="h-4 w-4" />
                {file ? file.name : "Choose file..."}
              </label>
              <input
                id="judge-cv"
                type="file"
                accept=".docx,.pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                disabled={submitting}
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); reset(); }} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !name.trim() || !title.trim() || !description.trim() || !file}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Create"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
