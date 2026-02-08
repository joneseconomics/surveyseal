"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateSurveyTitle } from "@/lib/actions/survey";

interface EditableSurveyTitleProps {
  surveyId: string;
  title: string;
  isDraft: boolean;
}

export function EditableSurveyTitle({ surveyId, title, isDraft }: EditableSurveyTitleProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  async function handleSave() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === title) {
      setValue(title);
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await updateSurveyTitle(surveyId, trimmed);
      setEditing(false);
    } catch (e) {
      console.error(e);
      setValue(title);
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") {
      setValue(title);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          disabled={saving}
          className="text-2xl font-bold h-auto py-1"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <h1 className="text-2xl font-bold">{title}</h1>
      {isDraft && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setEditing(true)}
          title="Edit title"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
