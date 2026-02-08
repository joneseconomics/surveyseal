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
import { GripVertical, Trash2, Pencil, Plus, FileText, File as FileIcon, ImageIcon, GraduationCap, FolderOpen, Save, BookOpen } from "lucide-react";
import { deleteCJItem, reorderCJItems } from "@/lib/actions/cj-item";
import { updateCJAssignmentInstructions } from "@/lib/actions/survey";
import { CJItemEditor } from "@/components/dashboard/cj-item-editor";
import { CanvasImportDialog } from "@/components/dashboard/canvas-import-dialog";
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
}

export function CJBuilder({
  surveyId,
  cjItems: serverItems,
  isDraft,
  cjSubtype,
  assignmentInstructions,
}: CJBuilderProps) {
  const [items, setItems] = useState(serverItems);
  const [showEditor, setShowEditor] = useState(false);
  const [showCanvasImport, setShowCanvasImport] = useState(false);
  const [showFolderImport, setShowFolderImport] = useState(false);
  const [editingItem, setEditingItem] = useState<CJItemData | null>(null);
  const [instructions, setInstructions] = useState(assignmentInstructions ?? "");
  const [savingInstructions, setSavingInstructions] = useState(false);
  const [instructionsSaved, setInstructionsSaved] = useState(false);

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

  return (
    <div className="space-y-6">
      {/* Assignment instructions */}
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
            <div className="flex justify-end">
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
