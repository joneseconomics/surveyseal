"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X, FileText, File } from "lucide-react";
import { addCJItem, updateCJItem } from "@/lib/actions/cj-item";
import { getSupabase, getCJFilePath, getPublicUrl, BUCKET } from "@/lib/supabase";
import type { CJItemContent } from "@/lib/validations/cj";

const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

interface CJItemData {
  id: string;
  label: string;
  content: CJItemContent;
}

interface CJItemEditorProps {
  surveyId: string;
  item: CJItemData | null;
  onClose: () => void;
}

export function CJItemEditor({ surveyId, item, onClose }: CJItemEditorProps) {
  const [label, setLabel] = useState(item?.label ?? "");
  const [text, setText] = useState(item?.content?.text ?? "");
  const [description, setDescription] = useState(item?.content?.description ?? "");
  const [imageUrl, setImageUrl] = useState(item?.content?.imageUrl ?? "");
  const [fileUrl, setFileUrl] = useState(item?.content?.fileUrl ?? "");
  const [fileType, setFileType] = useState(item?.content?.fileType ?? "");
  const [fileName, setFileName] = useState(item?.content?.fileName ?? "");
  const [filePath, setFilePath] = useState(item?.content?.filePath ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError("");

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUploadError("Unsupported file type. Use images, PDF, or DOCX.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setUploadError("File too large. Maximum 10MB.");
      return;
    }

    setUploading(true);
    try {
      const fileId = crypto.randomUUID();
      const path = getCJFilePath(surveyId, fileId, file.name);
      const supabase = getSupabase();

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });

      if (error) throw error;

      const publicUrl = getPublicUrl(path);
      setFileUrl(publicUrl);
      setFileType(file.type);
      setFileName(file.name);
      setFilePath(path);
    } catch (err: unknown) {
      console.error("Upload error:", err);
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      setUploadError(`Upload failed: ${msg}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemoveFile() {
    if (!filePath) {
      setFileUrl("");
      setFileType("");
      setFileName("");
      return;
    }

    try {
      const supabase = getSupabase();
      await supabase.storage.from(BUCKET).remove([filePath]);
    } catch (err) {
      console.error("Failed to delete file from storage:", err);
    }

    setFileUrl("");
    setFileType("");
    setFileName("");
    setFilePath("");
  }

  async function handleSave() {
    setSaving(true);
    try {
      const content: Record<string, unknown> = {};
      if (text) content.text = text;
      if (description) content.description = description;
      if (imageUrl) content.imageUrl = imageUrl;
      if (fileUrl) {
        content.fileUrl = fileUrl;
        content.fileType = fileType;
        content.fileName = fileName;
        content.filePath = filePath;
      }

      if (item) {
        await updateCJItem({ id: item.id, label, content });
      } else {
        await addCJItem({ surveyId, label, content });
      }
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  const isImage = fileType.startsWith("image/");

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? "Edit Item" : "Add Item"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cj-label">Label *</Label>
            <Input
              id="cj-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Essay A"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cj-text">Text Content</Label>
            <Textarea
              id="cj-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="The main text content of this item..."
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cj-description">Description (optional)</Label>
            <Input
              id="cj-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description or context"
            />
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>File Upload (optional)</Label>
            {fileUrl ? (
              <div className="flex items-center gap-3 rounded-md border p-3">
                {isImage ? (
                  <img
                    src={fileUrl}
                    alt={fileName}
                    className="h-16 w-16 rounded object-cover"
                  />
                ) : fileType === "application/pdf" ? (
                  <FileText className="h-10 w-10 text-red-500 shrink-0" />
                ) : (
                  <File className="h-10 w-10 text-blue-500 shrink-0" />
                )}
                <span className="flex-1 truncate text-sm">{fileName}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={handleRemoveFile}
                  title="Remove file"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES.join(",")}
                  onChange={handleFileUpload}
                  className="hidden"
                  id="cj-file-upload"
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? "Uploading..." : "Choose File"}
                </Button>
                <p className="mt-1 text-xs text-muted-foreground">
                  Images, PDF, or DOCX. Max 10MB.
                </p>
              </div>
            )}
            {uploadError && (
              <p className="text-sm text-destructive">{uploadError}</p>
            )}
          </div>

          {/* External Image URL - secondary option */}
          {!fileUrl && (
            <div className="space-y-2">
              <Label htmlFor="cj-image">External Image URL (optional)</Label>
              <Input
                id="cj-image"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!label.trim() || saving || uploading}>
              {saving ? "Saving..." : item ? "Update" : "Add Item"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
