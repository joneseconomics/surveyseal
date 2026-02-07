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
  type DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { QuestionCard } from "@/components/dashboard/question-card";
import { reorderQuestions } from "@/lib/actions/question";
import type { Question } from "@/generated/prisma/client";

interface SortableQuestionListProps {
  surveyId: string;
  questions: Question[];
  isDraft: boolean;
  onEdit: (question: Question) => void;
}

export function SortableQuestionList({
  surveyId,
  questions: serverQuestions,
  isDraft,
  onEdit,
}: SortableQuestionListProps) {
  const [questions, setQuestions] = useState(serverQuestions);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Sync with server data when it changes (e.g. after add/delete/import)
  if (serverQuestions !== questions && serverQuestions.map(q => q.id).join() !== questions.map(q => q.id).join()) {
    setQuestions(serverQuestions);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = questions.findIndex((q) => q.id === active.id);
      const newIndex = questions.findIndex((q) => q.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      // Optimistic reorder
      const reordered = [...questions];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);
      setQuestions(reordered);

      // Persist to server
      reorderQuestions(surveyId, reordered.map((q) => q.id));
    },
    [questions, surveyId]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const activeQuestion = activeId ? questions.find((q) => q.id === activeId) : null;

  if (!isDraft) {
    return (
      <div className="space-y-2">
        {questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={index}
            isDraft={false}
            onEdit={() => onEdit(question)}
          />
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={questions.map((q) => q.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {questions.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              index={index}
              isDraft={true}
              onEdit={() => onEdit(question)}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeQuestion ? (
          <QuestionCard
            question={activeQuestion}
            index={questions.indexOf(activeQuestion)}
            isDraft={true}
            onEdit={() => {}}
            isOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
