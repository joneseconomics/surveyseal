"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FolderOpen, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { addCJItem } from "@/lib/actions/cj-item";
import { getSupabase, getCJFilePath, getPublicUrl, BUCKET } from "@/lib/supabase";

const ACCEPTED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MIME_MAP: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

function inferMimeType(filename: string): string | undefined {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  return MIME_MAP[ext];
}

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

interface FileEntry {
  file: File;
  name: string;
  size: number;
  type: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

interface FolderImportDialogProps {
  surveyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FolderImportDialog({ surveyId, open, onOpenChange }: FolderImportDialogProps) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const folderInputRef = useRef<HTMLInputElement>(null);

  function handleFiles(fileList: FileList) {
    const entries: FileEntry[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const mimeType = file.type || inferMimeType(file.name);
      if (!mimeType || !ACCEPTED_TYPES.has(mimeType)) continue;
      if (file.size > MAX_SIZE) continue;
      entries.push({
        file,
        name: file.name,
        size: file.size,
        type: mimeType,
        status: "pending",
      });
    }
    // Sort alphabetically by name
    entries.sort((a, b) => a.name.localeCompare(b.name));
    setFiles(entries);
    setSelected(new Set(entries.map((_, i) => i)));
  }

  function toggleFile(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === files.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(files.map((_, i) => i)));
    }
  }

  const selectedCount = selected.size;

  async function handleImport() {
    setImporting(true);
    let imported = 0;
    let errors = 0;

    const supabase = getSupabase();

    for (let i = 0; i < files.length; i++) {
      if (!selected.has(i)) continue;
      const entry = files[i];
      setFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: "uploading" } : f))
      );

      try {
        const fileId = crypto.randomUUID();
        const path = getCJFilePath(surveyId, fileId, entry.name);

        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, entry.file, { contentType: entry.type, upsert: false });

        if (error) throw error;

        const publicUrl = getPublicUrl(path);

        // Strip extension for label
        const label = entry.name.replace(/\.[^.]+$/, "");

        await addCJItem({
          surveyId,
          label,
          content: {
            fileUrl: publicUrl,
            fileType: entry.type,
            fileName: entry.name,
            filePath: path,
          },
        });

        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: "done" } : f))
        );
        imported++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: "error", error: msg } : f))
        );
        errors++;
      }
    }

    setImportedCount(imported);
    setErrorCount(errors);
    setDone(true);
    setImporting(false);
  }

  function handleClose() {
    onOpenChange(false);
    // Reset state after close animation
    setTimeout(() => {
      setFiles([]);
      setSelected(new Set());
      setDone(false);
      setImportedCount(0);
      setErrorCount(0);
    }, 200);
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import from Folder</DialogTitle>
          <DialogDescription>
            Select a folder to import all supported files (images, PDF, DOCX) as comparison items.
          </DialogDescription>
        </DialogHeader>

        {/* Folder selection (hidden input) */}
        <input
          ref={folderInputRef}
          type="file"
          /* @ts-expect-error webkitdirectory is not in React types */
          webkitdirectory=""
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
          }}
        />

        {files.length === 0 && !done && (
          <div className="flex flex-col items-center gap-4 py-8">
            <FolderOpen className="h-12 w-12 text-muted-foreground" />
            <Button
              onClick={() => folderInputRef.current?.click()}
              variant="outline"
              size="lg"
            >
              <FolderOpen className="mr-2 h-4 w-4" />
              Choose Folder
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Supported: PNG, JPEG, GIF, WebP, PDF, DOCX. Max 10MB per file.
            </p>
          </div>
        )}

        {files.length > 0 && !done && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {files.length} file{files.length !== 1 ? "s" : ""} found
                {selectedCount < files.length && ` (${selectedCount} selected)`}
              </p>
              {!importing && (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs text-primary hover:underline"
                >
                  {selected.size === files.length ? "Deselect all" : "Select all"}
                </button>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1 rounded-md border p-2">
              {files.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm">
                  {entry.status === "uploading" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                  ) : entry.status === "done" ? (
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  ) : entry.status === "error" ? (
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                  ) : (
                    <Checkbox
                      checked={selected.has(i)}
                      onCheckedChange={() => toggleFile(i)}
                      disabled={importing}
                      className="shrink-0"
                    />
                  )}
                  <span className={`flex-1 truncate ${!selected.has(i) && entry.status === "pending" ? "text-muted-foreground" : ""}`}>
                    {entry.name}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatSize(entry.size)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose} disabled={importing}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={importing || selectedCount === 0}>
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  `Import ${selectedCount} File${selectedCount !== 1 ? "s" : ""}`
                )}
              </Button>
            </div>
          </div>
        )}

        {done && (
          <div className="space-y-4 text-center py-4">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <div>
              <p className="text-lg font-semibold">Import Complete</p>
              <p className="text-sm text-muted-foreground">
                {importedCount} item{importedCount !== 1 ? "s" : ""} imported
                {errorCount > 0 && `, ${errorCount} failed`}
              </p>
            </div>
            <Button onClick={handleClose}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
