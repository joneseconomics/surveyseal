"use client";

import { useState } from "react";
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
import { addCJItem, updateCJItem } from "@/lib/actions/cj-item";
import type { CJItemContent } from "@/lib/validations/cj";

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
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const content: Record<string, unknown> = {};
      if (text) content.text = text;
      if (description) content.description = description;
      if (imageUrl) content.imageUrl = imageUrl;

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
          <div className="space-y-2">
            <Label htmlFor="cj-image">Image URL (optional)</Label>
            <Input
              id="cj-image"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!label.trim() || saving}>
              {saving ? "Saving..." : item ? "Update" : "Add Item"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
