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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
}

function SortableItem({ id, children }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.85 : 1,
    scale: isDragging ? 1.02 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group/drag">
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="absolute top-3 left-3 z-10 flex h-7 w-7 cursor-grab items-center justify-center rounded-lg opacity-0 transition-opacity group-hover/drag:opacity-60 hover:!opacity-100 active:cursor-grabbing"
        style={{ background: "var(--surface-3)", color: "var(--text-muted)" }}
        title="اسحب لإعادة الترتيب"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      {children}
    </div>
  );
}

interface SortableWidgetsProps {
  storageKey: string;
  widgets: { id: string; content: React.ReactNode }[];
  className?: string;
}

export function SortableWidgets({ storageKey, widgets, className }: SortableWidgetsProps) {
  const [order, setOrder] = useState<string[]>(() => {
    if (typeof window === "undefined") return widgets.map((w) => w.id);
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        const validIds = new Set(widgets.map((w) => w.id));
        const filtered = parsed.filter((id) => validIds.has(id));
        const missing = widgets.map((w) => w.id).filter((id) => !filtered.includes(id));
        return [...filtered, ...missing];
      }
    } catch {}
    return widgets.map((w) => w.id);
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        setOrder((prev) => {
          const oldIndex = prev.indexOf(active.id as string);
          const newIndex = prev.indexOf(over.id as string);
          const newOrder = arrayMove(prev, oldIndex, newIndex);
          localStorage.setItem(storageKey, JSON.stringify(newOrder));
          return newOrder;
        });
      }
    },
    [storageKey]
  );

  const widgetMap = new Map(widgets.map((w) => [w.id, w]));
  const sorted = order.map((id) => widgetMap.get(id)).filter(Boolean);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <div className={className}>
          {sorted.map((widget) => (
            <SortableItem key={widget!.id} id={widget!.id}>
              {widget!.content}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
