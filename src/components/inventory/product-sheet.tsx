"use client";

import { useRef, useState } from "react";
import {
  DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Package } from "lucide-react";
import type { Product } from "@/lib/data";
import { formatCurrency } from "@/lib/data";
import { SpreadsheetCell } from "@/components/spreadsheet-cell";
import { CategoryBadge } from "@/app/(dashboard)/inventory/page";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

// Column widths are a personal display preference (not shared business data), so
// these stay per-browser. Manual row order is NOT — that's handled entirely via
// Supabase's products.sort_order column through the onReorder prop below.
const WIDTHS_KEY = "kamal_inventory_col_widths";

interface ColumnDef {
  key: string;
  label: string;
  defaultWidth: number;
  resizable?: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: "drag", label: "", defaultWidth: 36, resizable: false },
  { key: "name", label: "المنتج", defaultWidth: 280 },
  { key: "sku", label: "الكود (SKU)", defaultWidth: 130 },
  { key: "category", label: "الفئة", defaultWidth: 150 },
  { key: "cost", label: "التكلفة", defaultWidth: 110 },
  { key: "sell", label: "المبيع", defaultWidth: 110 },
  { key: "margin", label: "الربح", defaultWidth: 90, resizable: false },
  { key: "stock", label: "المخزون", defaultWidth: 100 },
  { key: "minStock", label: "حد التنبيه", defaultWidth: 110 },
  { key: "unit", label: "الوحدة", defaultWidth: 90 },
  { key: "total", label: "القيمة الإجمالية", defaultWidth: 150, resizable: false },
  { key: "delete", label: "", defaultWidth: 56, resizable: false },
];

function loadWidths(): Record<string, number> {
  const defaults = Object.fromEntries(COLUMNS.map((c) => [c.key, c.defaultWidth]));
  if (typeof window === "undefined") return defaults;
  try {
    const saved = JSON.parse(localStorage.getItem(WIDTHS_KEY) || "null");
    return saved && typeof saved === "object" ? { ...defaults, ...saved } : defaults;
  } catch {
    return defaults;
  }
}

function marginOf(p: Product): number {
  return p.sellingPrice > 0 ? ((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100 : 0;
}

interface ProductSheetProps {
  /** Filtered/searched subset currently shown — already in sort_order order. */
  products: Product[];
  /** Full unfiltered product list (also in sort_order order) — needed so a reorder
   *  made while a search/category filter is active can be merged back correctly
   *  without touching the position of products that aren't currently displayed. */
  allProducts: Product[];
  categories: string[];
  currencySymbol: string;
  onRename: (id: string, name: string) => void;
  onUpdate: (id: string, updates: Partial<Product>) => void;
  onReorder: (orderedIds: string[]) => void;
  onDelete: (product: Product) => void;
}

export function ProductSheet({ products: sorted, allProducts, categories, currencySymbol, onRename, onUpdate, onReorder, onDelete }: ProductSheetProps) {
  const [widths, setWidths] = useState<Record<string, number>>(loadWidths);
  const resizing = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const displayedIds = sorted.map((p) => p.id);
    const oldIndex = displayedIds.indexOf(active.id as string);
    const newIndex = displayedIds.indexOf(over.id as string);
    const newDisplayed = arrayMove(displayedIds, oldIndex, newIndex);
    const displayedSet = new Set(displayedIds);
    let di = 0;
    const newFull = allProducts.map((p) => (displayedSet.has(p.id) ? newDisplayed[di++] : p.id));
    onReorder(newFull);
  }

  function gridTemplate() {
    return COLUMNS.map((c) => `${widths[c.key]}px`).join(" ");
  }

  function startResize(e: React.PointerEvent, key: string) {
    e.preventDefault();
    resizing.current = { key, startX: e.clientX, startWidth: widths[key] };
    function onMove(ev: PointerEvent) {
      if (!resizing.current) return;
      // Handle sits on the physical-left edge of each header cell; in this RTL
      // grid that's the boundary with the next column, so dragging left (negative
      // delta) extends the column further left — i.e. width grows as delta shrinks.
      const delta = ev.clientX - resizing.current.startX;
      const next = Math.max(50, Math.min(600, resizing.current.startWidth - delta));
      setWidths((w) => ({ ...w, [resizing.current!.key]: next }));
    }
    function onUp() {
      resizing.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setWidths((w) => {
        localStorage.setItem(WIDTHS_KEY, JSON.stringify(w));
        return w;
      });
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-12 text-center">
        <Package className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 text-sm font-bold text-slate-700">لا توجد منتجات مطابقة</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Header */}
          <div className="grid text-xs font-black text-slate-400 uppercase bg-slate-50 border-b border-slate-200" style={{ gridTemplateColumns: gridTemplate() }}>
            {COLUMNS.map((col) => (
              <div key={col.key} className="relative px-3 py-4 flex items-center">
                {col.label}
                {col.resizable !== false && (
                  <div
                    onPointerDown={(e) => startResize(e, col.key)}
                    className="absolute top-0 left-0 h-full w-2 cursor-col-resize hover:bg-indigo-200/60 active:bg-indigo-300 transition-colors"
                    title="اسحب لتغيير العرض"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Rows */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sorted.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <div className="divide-y divide-slate-100">
                {sorted.map((p) => (
                  <ProductRow
                    key={p.id}
                    product={p}
                    gridTemplateColumns={gridTemplate()}
                    categories={categories}
                    currencySymbol={currencySymbol}
                    onRename={onRename}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  );
}

interface ProductRowProps {
  product: Product;
  gridTemplateColumns: string;
  categories: string[];
  currencySymbol: string;
  onRename: (id: string, name: string) => void;
  onUpdate: (id: string, updates: Partial<Product>) => void;
  onDelete: (product: Product) => void;
}

function ProductRow({ product: p, gridTemplateColumns, categories, currencySymbol, onRename, onUpdate, onDelete }: ProductRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id });
  const margin = marginOf(p);

  const style: React.CSSProperties = {
    gridTemplateColumns,
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : undefined,
    background: isDragging ? "var(--surface-1, #fff)" : undefined,
    boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,0.12)" : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="grid items-center hover:bg-slate-50/70 group">
      <div className="px-2 py-2.5 flex items-center justify-center">
        <button
          {...attributes}
          {...listeners}
          className="flex h-8 w-8 cursor-grab items-center justify-center rounded-lg text-slate-300 opacity-0 group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing transition-opacity"
          title="اسحب لإعادة الترتيب"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
      <div className="px-2 py-2.5 min-w-0">
        <SpreadsheetCell value={p.name} onCommit={(v) => onRename(p.id, v)} className="font-bold text-slate-900" />
      </div>
      <div className="px-2 py-2.5 min-w-0">
        <SpreadsheetCell value={p.sku} onCommit={(v) => onUpdate(p.id, { sku: v })} className="font-mono text-xs text-slate-500" />
      </div>
      <div className="px-2 py-2.5 min-w-0">
        <Select value={p.category} onValueChange={(v) => v && onUpdate(p.id, { category: v })}>
          <SelectTrigger className="h-9 text-xs border border-transparent hover:bg-slate-100 focus:border-indigo-400 bg-transparent px-2 shadow-none rounded-lg"><CategoryBadge category={p.category} /></SelectTrigger>
          <SelectContent>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="px-2 py-2.5 min-w-0">
        <SpreadsheetCell value={p.costPrice} onCommit={(v) => onUpdate(p.id, { costPrice: parseFloat(v) || 0 })} type="number" step="0.01" min={0} align="center" className="font-mono font-bold text-slate-700" />
      </div>
      <div className="px-2 py-2.5 min-w-0">
        <SpreadsheetCell value={p.sellingPrice} onCommit={(v) => onUpdate(p.id, { sellingPrice: parseFloat(v) || 0 })} type="number" step="0.01" min={0} align="center" className="font-mono font-bold text-slate-700" />
      </div>
      <div className="px-3 py-2.5">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-black ${margin >= 20 ? "bg-emerald-50 text-emerald-700" : margin > 0 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>
          {margin.toFixed(0)}%
        </span>
      </div>
      <div className="px-2 py-2.5 min-w-0">
        <SpreadsheetCell value={p.stock} onCommit={(v) => onUpdate(p.id, { stock: parseInt(v) || 0 })} type="number" min={0} align="center" className="font-mono font-bold text-slate-700" />
      </div>
      <div className="px-2 py-2.5 min-w-0">
        <SpreadsheetCell value={p.minStock} onCommit={(v) => onUpdate(p.id, { minStock: parseInt(v) || 0 })} type="number" min={0} align="center" className="font-mono font-bold text-slate-500" />
      </div>
      <div className="px-2 py-2.5 min-w-0">
        <SpreadsheetCell value={p.unit} onCommit={(v) => onUpdate(p.id, { unit: v })} align="center" className="text-xs text-slate-500" />
      </div>
      <div className="px-3 py-2.5 font-mono font-black text-slate-900 whitespace-nowrap">{formatCurrency(p.costPrice * p.stock, currencySymbol)}</div>
      <div className="px-2 py-2.5 text-center">
        <Button size="sm" variant="ghost" onClick={() => onDelete(p)} className="text-rose-600 px-2"><Trash2 className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
