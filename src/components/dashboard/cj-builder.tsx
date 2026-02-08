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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { GripVertical, Trash2, Pencil, Plus, FileText, File as FileIcon, ImageIcon } from "lucide-react";
import { deleteCJItem, reorderCJItems, updateCJSettings, updateVerificationPointCount } from "@/lib/actions/cj-item";
import { CJItemEditor } from "@/components/dashboard/cj-item-editor";
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
  cjPrompt: string | null;
  comparisonsPerJudge: number | null;
  vpEnabled: boolean;
  isDraft: boolean;
}

export function CJBuilder({
  surveyId,
  cjItems: serverItems,
  cjPrompt,
  comparisonsPerJudge,
  vpEnabled: serverVpEnabled,
  isDraft,
}: CJBuilderProps) {
  const [items, setItems] = useState(serverItems);
  const [showEditor, setShowEditor] = useState(false);
  const [editingItem, setEditingItem] = useState<CJItemData | null>(null);
  const [prompt, setPrompt] = useState(cjPrompt ?? "");
  const [perJudge, setPerJudge] = useState(comparisonsPerJudge?.toString() ?? "");
  const [vpOn, setVpOn] = useState(serverVpEnabled);
  const [savingSettings, setSavingSettings] = useState(false);
  const [togglingVP, setTogglingVP] = useState(false);

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

  async function handleSaveSettings() {
    setSavingSettings(true);
    try {
      await updateCJSettings({
        surveyId,
        cjPrompt: prompt,
        comparisonsPerJudge: perJudge ? parseInt(perJudge, 10) : null,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* CJ Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparison Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cj-prompt">Comparison Prompt</Label>
            <Textarea
              id="cj-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Which of these two items is better? Consider..."
              rows={2}
              disabled={!isDraft}
            />
            <p className="text-xs text-muted-foreground">
              This prompt is shown to judges above each comparison.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cj-per-judge">Comparisons per Judge (optional)</Label>
            <Input
              id="cj-per-judge"
              type="number"
              min={1}
              value={perJudge}
              onChange={(e) => setPerJudge(e.target.value)}
              placeholder={`Default: ${Math.max(serverItems.length - 1, 1)}`}
              disabled={!isDraft}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank for default (number of items - 1).
            </p>
          </div>
          {isDraft && (
            <Button
              size="sm"
              onClick={handleSaveSettings}
              disabled={savingSettings || !prompt.trim()}
            >
              {savingSettings ? "Saving..." : "Save Settings"}
            </Button>
          )}
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="cj-vp-toggle">Verification Points</Label>
              <p className="text-xs text-muted-foreground">
                {vpOn
                  ? "Judges will verify at the beginning and end of the survey."
                  : "No verification required."}
              </p>
            </div>
            <Switch
              id="cj-vp-toggle"
              checked={vpOn}
              disabled={!isDraft || togglingVP}
              onCheckedChange={async (checked) => {
                setTogglingVP(true);
                setVpOn(checked);
                try {
                  await updateVerificationPointCount(surveyId, checked ? 2 : 0);
                } catch (e) {
                  console.error(e);
                  setVpOn(!checked);
                } finally {
                  setTogglingVP(false);
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

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
            <Button
              onClick={() => {
                setEditingItem(null);
                setShowEditor(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
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
