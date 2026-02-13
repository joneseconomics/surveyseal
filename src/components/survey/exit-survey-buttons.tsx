"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Save, Trash2 } from "lucide-react";
import { abandonSession } from "@/lib/actions/survey-participant";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ExitSurveyButtons({ surveyId }: { surveyId: string }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [abandoning, setAbandoning] = useState(false);

  async function handleAbandon() {
    setAbandoning(true);
    await abandonSession(surveyId);
    router.push(`/s/${surveyId}/exited`);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Exit survey"
          >
            <LogOut className="h-4 w-4" />
            <span>Exit</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => router.push(`/s/${surveyId}/saved`)}
          >
            <Save className="h-4 w-4" />
            Save & Exit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setConfirmOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Exit Without Saving
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exit without saving?</DialogTitle>
            <DialogDescription>
              All your responses will be permanently deleted. This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={abandoning}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleAbandon}
              disabled={abandoning}
            >
              {abandoning ? "Deleting..." : "Delete & Exit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
