"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Info } from "lucide-react";

interface AiPersonaInfoProps {
  personaName: string;
  personaType: "catalog" | "nemotron" | "custom" | "judge" | "unknown";
  systemPrompt: string;
  provider?: string;
  model?: string;
  demographics?: {
    jobTitle?: string;
    employer?: string;
    city?: string;
    state?: string;
    age?: number;
    sex?: string;
    educationLevel?: string;
  };
}

export function AiPersonaInfo({
  personaName,
  personaType,
  systemPrompt,
  provider,
  model,
  demographics,
}: AiPersonaInfoProps) {
  const [open, setOpen] = useState(false);

  const typeLabel =
    personaType === "catalog" ? "SurveySeal Catalog"
    : personaType === "nemotron" ? "Nemotron"
    : personaType === "custom" ? "Custom"
    : personaType === "judge" ? "Judge"
    : "AI";

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 p-0 text-muted-foreground hover:text-primary shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        title="View AI persona details"
      >
        <Info className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm">AI Persona Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 overflow-y-auto">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium">{personaName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Type:</span>
              <span>{typeLabel}</span>
            </div>
            {provider && model && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Model:</span>
                <span>{provider}/{model}</span>
              </div>
            )}
            {demographics && Object.values(demographics).some(Boolean) && (
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Demographics:</span>
                <div className="text-sm pl-2">
                  {demographics.jobTitle && <div>{demographics.jobTitle}{demographics.employer ? ` at ${demographics.employer}` : ""}</div>}
                  {(demographics.city || demographics.state) && (
                    <div>{[demographics.city, demographics.state].filter(Boolean).join(", ")}</div>
                  )}
                  {(demographics.age || demographics.sex) && (
                    <div>{[demographics.age && `Age ${demographics.age}`, demographics.sex].filter(Boolean).join(", ")}</div>
                  )}
                  {demographics.educationLevel && <div>{demographics.educationLevel}</div>}
                </div>
              </div>
            )}
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">System Prompt:</span>
              <div className="overflow-y-auto max-h-[40vh] rounded-md border p-3 bg-muted/30">
                <pre className="whitespace-pre-wrap text-xs font-mono">{systemPrompt}</pre>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
