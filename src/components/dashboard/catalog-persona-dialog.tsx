"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import * as michaelJones from "@/lib/ai/catalog/michael-jones";

const catalogData: Record<string, { resume: string; claudeMd: string; agentsMd: string }> = {
  "michael-jones": michaelJones,
};

interface CatalogPersonaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
}

export function CatalogPersonaDialog({ open, onOpenChange, slug }: CatalogPersonaDialogProps) {
  const data = catalogData[slug];

  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Catalog Persona Details</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="resume" className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full shrink-0">
            <TabsTrigger value="resume">Resume</TabsTrigger>
            <TabsTrigger value="claude">CLAUDE.md</TabsTrigger>
            <TabsTrigger value="agents">AGENTS.md</TabsTrigger>
          </TabsList>
          <TabsContent value="resume" className="flex-1 min-h-0 mt-2">
            <div className="overflow-y-auto max-h-[55vh] rounded-md border p-4 bg-muted/30">
              <pre className="whitespace-pre-wrap text-xs font-mono">{data.resume}</pre>
            </div>
          </TabsContent>
          <TabsContent value="claude" className="flex-1 min-h-0 mt-2">
            <div className="overflow-y-auto max-h-[55vh] rounded-md border p-4 bg-muted/30">
              <pre className="whitespace-pre-wrap text-xs font-mono">{data.claudeMd}</pre>
            </div>
          </TabsContent>
          <TabsContent value="agents" className="flex-1 min-h-0 mt-2">
            <div className="overflow-y-auto max-h-[55vh] rounded-md border p-4 bg-muted/30">
              <pre className="whitespace-pre-wrap text-xs font-mono">{data.agentsMd}</pre>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
