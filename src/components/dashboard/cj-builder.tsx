"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GripVertical, Trash2, Pencil, Plus, FileText, File as FileIcon, ImageIcon, GraduationCap, FolderOpen, Save, BookOpen, ExternalLink } from "lucide-react";
import { deleteCJItem, reorderCJItems } from "@/lib/actions/cj-item";
import { updateCJAssignmentInstructions, updateCJJudgeInstructions } from "@/lib/actions/survey";
import { CJItemEditor } from "@/components/dashboard/cj-item-editor";
import { CanvasImportDialog } from "@/components/dashboard/canvas-import-dialog";
import { CanvasInstructionsImport } from "@/components/dashboard/canvas-instructions-import";
import { FolderImportDialog } from "@/components/dashboard/folder-import-dialog";
import type { CJItemContent } from "@/lib/validations/cj";

interface CJItemData {
  id: string;
  label: string;
  content: CJItemContent;
  position: number;
}

interface CJBuilderProps {
  surveyId: string;
  cjItems: CJItemData[];
  isDraft: boolean;
  cjSubtype?: string | null;
  assignmentInstructions?: string | null;
  judgeInstructions?: string | null;
  jobUrl?: string | null;
  jobTitle?: string | null;
}

export function CJBuilder({
  surveyId,
  cjItems: serverItems,
  isDraft,
  cjSubtype,
  assignmentInstructions,
  judgeInstructions,
  jobUrl: initialJobUrl,
  jobTitle: initialJobTitle,
}: CJBuilderProps) {
  const [items, setItems] = useState(serverItems);
  const [showEditor, setShowEditor] = useState(false);
  const [showCanvasImport, setShowCanvasImport] = useState(false);
  const [showFolderImport, setShowFolderImport] = useState(false);
  const [editingItem, setEditingItem] = useState<CJItemData | null>(null);
  const [instructions, setInstructions] = useState(assignmentInstructions ?? "");
  const [savingInstructions, setSavingInstructions] = useState(false);
  const [instructionsSaved, setInstructionsSaved] = useState(false);
  const [showCanvasInstructionsImport, setShowCanvasInstructionsImport] = useState(false);
  const [judgeText, setJudgeText] = useState(judgeInstructions ?? "");
  const [jobUrl, setJobUrl] = useState(initialJobUrl ?? "");
  const [jobTitleText, setJobTitleText] = useState(initialJobTitle ?? "");
  const [savingJudge, setSavingJudge] = useState(false);
  const [judgeSaved, setJudgeSaved] = useState(false);

  // Sync with server data
  if (
    serverItems !== items &&
    serverItems.map((i) => i.id).join() !== items.map((i) => i.id).join()
  ) {
    setItems(serverItems);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = [...items];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);
      setItems(reordered);
      reorderCJItems(surveyId, reordered.map((i) => i.id));
    },
    [items, surveyId]
  );

  async function handleSaveInstructions() {
    setSavingInstructions(true);
    try {
      await updateCJAssignmentInstructions(surveyId, instructions);
      setInstructionsSaved(true);
      setTimeout(() => setInstructionsSaved(false), 2000);
    } finally {
      setSavingInstructions(false);
    }
  }

  async function handleSaveJudgeInstructions() {
    setSavingJudge(true);
    try {
      await updateCJJudgeInstructions(surveyId, judgeText, jobUrl, jobTitleText);
      setJudgeSaved(true);
      setTimeout(() => setJudgeSaved(false), 2000);
    } finally {
      setSavingJudge(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Judge instructions — all CJ types */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Judge Instructions</CardTitle>
          </div>
          <CardDescription>
            Customize the instructions shown to judges before they begin comparing items.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="judge-instructions">Instructions</Label>
            <Textarea
              id="judge-instructions"
              value={judgeText}
              onChange={(e) => setJudgeText(e.target.value)}
              placeholder="Describe what judges should consider when comparing items..."
              rows={6}
            />
          </div>
          {cjSubtype === "RESUMES" && (
            <div className="space-y-2">
              <Label htmlFor="job-title">Job Title</Label>
              <Input
                id="job-title"
                value={jobTitleText}
                onChange={(e) => setJobTitleText(e.target.value)}
                placeholder="e.g. Senior Software Engineer"
              />
              <p className="text-xs text-muted-foreground">
                The position judges will imagine hiring for.
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="job-url">Job Posting URL (optional)</Label>
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                id="job-url"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                placeholder="https://example.com/job-posting"
                type="url"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              If provided, judges will see this job description embedded on the instructions page.
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleSaveJudgeInstructions}
              disabled={savingJudge}
            >
              {judgeSaved ? (
                "Saved!"
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {savingJudge ? "Saving..." : "Save"}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Assignment-specific instructions */}
      {cjSubtype === "ASSIGNMENTS" && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Assignment Instructions</CardTitle>
            </div>
            <CardDescription>
              Paste the assignment prompt or rubric here. Judges will see these instructions before comparing submissions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Write a 500-word essay analyzing the themes of..."
              rows={6}
            />
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCanvasInstructionsImport(true)}
              >
                <GraduationCap className="mr-2 h-4 w-4" />
                Import from Canvas
              </Button>
              <Button
                size="sm"
                onClick={handleSaveInstructions}
                disabled={savingInstructions}
              >
                {instructionsSaved ? (
                  "Saved!"
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {savingInstructions ? "Saving..." : "Save Instructions"}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Items to Compare</h2>
            <p className="text-sm text-muted-foreground">
              {items.length} item{items.length !== 1 ? "s" : ""}
              {items.length < 3 && " — Need at least 3 items to publish"}
            </p>
          </div>
          {isDraft && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFolderImport(true)}
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                Import from Folder
              </Button>
              {cjSubtype === "ASSIGNMENTS" && (
                <Button
                  variant="outline"
                  onClick={() => setShowCanvasImport(true)}
                >
                  <GraduationCap className="mr-2 h-4 w-4" />
                  Import from Canvas
                </Button>
              )}
              <Button
                onClick={() => {
                  setEditingItem(null);
                  setShowEditor(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No items yet. Add items that judges will compare side by side.
            </CardContent>
          </Card>
        ) : isDraft ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {items.map((item, index) => (
                  <SortableCJItemCard
                    key={item.id}
                    item={item}
                    index={index}
                    isDraft={true}
                    onEdit={() => {
                      setEditingItem(item);
                      setShowEditor(true);
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <CJItemCard key={item.id} item={item} index={index} isDraft={false} />
            ))}
          </div>
        )}
      </div>

      {showEditor && (
        <CJItemEditor
          surveyId={surveyId}
          item={editingItem}
          onClose={() => {
            setShowEditor(false);
            setEditingItem(null);
          }}
        />
      )}

      <FolderImportDialog
        surveyId={surveyId}
        open={showFolderImport}
        onOpenChange={setShowFolderImport}
      />

      <CanvasImportDialog
        surveyId={surveyId}
        open={showCanvasImport}
        onOpenChange={setShowCanvasImport}
      />

      <CanvasInstructionsImport
        surveyId={surveyId}
        open={showCanvasInstructionsImport}
        onOpenChange={setShowCanvasInstructionsImport}
        onImport={(text) => setInstructions(text)}
      />
    </div>
  );
}

function SortableCJItemCard({
  item,
  index,
  isDraft,
  onEdit,
}: {
  item: CJItemData;
  index: number;
  isDraft: boolean;
  onEdit: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "opacity-50" : ""}>
      <CJItemCard
        item={item}
        index={index}
        isDraft={isDraft}
        onEdit={onEdit}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

function CJItemCard({
  item,
  index,
  isDraft,
  onEdit,
  dragHandleProps,
}: {
  item: CJItemData;
  index: number;
  isDraft: boolean;
  onEdit?: () => void;
  dragHandleProps?: Record<string, unknown>;
}) {
  const content = item.content as CJItemContent;

  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-3">
        {isDraft && dragHandleProps && (
          <button
            className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
            {...dragHandleProps}
          >
            <GripVertical className="h-5 w-5" />
          </button>
        )}

        <span className="w-8 text-center text-sm font-medium text-muted-foreground">
          {index + 1}
        </span>

        <div className="flex-1 min-w-0">
          <span className="truncate text-sm font-medium">{item.label}</span>
          {content?.text && (
            <p className="mt-0.5 text-xs text-muted-foreground truncate">
              {content.text}
            </p>
          )}
          {content?.fileName && (
            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              {content.fileType?.startsWith("image/") ? (
                <ImageIcon className="h-3 w-3" />
              ) : content.fileType === "application/pdf" ? (
                <FileText className="h-3 w-3" />
              ) : (
                <FileIcon className="h-3 w-3" />
              )}
              <span className="truncate">{content.fileName}</span>
            </div>
          )}
        </div>

        {isDraft && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onEdit}
              title="Edit"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => deleteCJItem(item.id)}
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
