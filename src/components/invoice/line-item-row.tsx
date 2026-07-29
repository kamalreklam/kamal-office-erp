"use client";

import React from "react";
import { motion } from "framer-motion";
import { Trash2, X, Package, Layers } from "lucide-react";
import { formatCurrency } from "@/lib/data";

export interface LineItem {
  id: string;
  productId: string;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  isBundle?: boolean;
  bundleComponents?: { productId: string; productName: string; quantity: number }[];
  isTemporary?: boolean;
  costPrice?: number;
  showDescription?: boolean;
}

export interface FilteredItem {
  id: string;
  name: string;
  sellingPrice: number;
  stock: number;
  type: "product" | "bundle";
  product?: unknown;
  bundle?: unknown;
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={i} className="bg-amber-200 text-amber-900 rounded-[4px] px-0.5">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function marginPercent(item: LineItem): number {
  if (!item.unitPrice) return 0;
  return Math.round(((item.unitPrice - (item.costPrice || 0)) / item.unitPrice) * 100);
}

function MarginBadge({ item }: { item: LineItem }) {
  if (item.isTemporary || !item.productId) return null;
  const margin = marginPercent(item);
  return (
    <div className="flex items-center gap-1.5 text-xs font-bold mt-1.5">
      <span className="font-mono text-slate-400">{formatCurrency(item.costPrice || 0)} تكلفة</span>
      <span className="text-slate-300">|</span>
      <span className={`font-mono font-black ${margin < 5 ? "text-rose-500" : "text-emerald-600"}`}>{margin}% ربح</span>
    </div>
  );
}

interface AutocompleteListProps {
  searchQuery: string;
  filteredItems: FilteredItem[];
  focusedSearchIndex: number;
  onHoverIndex: (i: number) => void;
  onSelect: (opt: FilteredItem) => void;
  onAddTemporary: () => void;
  className?: string;
}

function AutocompleteList({ searchQuery, filteredItems, focusedSearchIndex, onHoverIndex, onSelect, onAddTemporary, className = "" }: AutocompleteListProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`absolute start-0 top-[calc(100%+8px)] w-full bg-white/95 backdrop-blur-xl border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl z-[9999] max-h-[350px] overflow-y-auto p-2 ${className}`}
    >
      {filteredItems.length === 0 ? (
        <button
          type="button"
          onClick={onAddTemporary}
          className="w-full p-3 text-sm font-bold text-amber-600 hover:bg-amber-50 rounded-xl text-center transition-colors"
        >
          + إضافة كمنتج مؤقت &quot;{searchQuery}&quot;
        </button>
      ) : (
        filteredItems.map((opt, oIdx) => (
          <button
            type="button"
            key={opt.id}
            onClick={() => onSelect(opt)}
            onMouseEnter={() => onHoverIndex(oIdx)}
            className={`w-full flex items-start justify-between p-3 rounded-xl text-sm transition-colors mb-1 text-start ${
              focusedSearchIndex === oIdx ? "bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-md" : "hover:bg-slate-50 border border-transparent hover:border-slate-100"
            }`}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${focusedSearchIndex === oIdx ? "bg-white/20" : "bg-indigo-50 text-indigo-500"}`}>
                {opt.type === "bundle" ? <Layers className="size-5" /> : <Package className="size-5" />}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-bold break-words text-xs sm:text-[length:var(--text-sm)]">
                  <HighlightMatch text={opt.name} query={searchQuery} />
                </span>
                {opt.type === "bundle" && (
                  <span className={`text-[length:var(--text-2xs)] ${focusedSearchIndex === oIdx ? "text-indigo-100" : "text-slate-400"}`}>حزمة تحتوي على عدة منتجات</span>
                )}
              </div>
            </div>
            <span className={`font-mono font-black text-sm ms-2 shrink-0 ${focusedSearchIndex === oIdx ? "text-white" : "text-indigo-600"}`}>
              {formatCurrency(opt.sellingPrice)}
            </span>
          </button>
        ))
      )}
    </motion.div>
  );
}

interface LineItemRowProps {
  item: LineItem;
  index: number;
  inputClass: string;
  isSearching: boolean;
  searchQuery: string;
  filteredItems: FilteredItem[];
  focusedSearchIndex: number;
  onHoverSearchIndex: (i: number) => void;
  onUpdate: (updates: Partial<LineItem>) => void;
  onRemove: () => void;
  onFocusSearch: () => void;
  onSearchChange: (value: string) => void;
  onKeyDownSearch: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSelectAutocomplete: (opt: FilteredItem) => void;
  onAddTemporary: () => void;
  onQuantityEnter: () => void;
  onPriceEnter: () => void;
}

// One responsive row shared by every screen size — mobile gets a stacked card with
// large touch targets and numeric keypads, desktop gets a compact grid row. Both
// reuse the same product-search/autocomplete/margin-badge pieces so they can no
// longer drift out of sync the way the old duplicated desktop/mobile blocks did.
export function LineItemRow({
  item, index, inputClass, isSearching, searchQuery, filteredItems, focusedSearchIndex,
  onHoverSearchIndex, onUpdate, onRemove, onFocusSearch, onSearchChange, onKeyDownSearch,
  onSelectAutocomplete, onAddTemporary, onQuantityEnter, onPriceEnter,
}: LineItemRowProps) {
  const productField = item.isTemporary ? (
    <div className="relative flex-1 min-w-0">
      <input
        type="text"
        value={item.productName}
        onChange={(e) => onUpdate({ productName: e.target.value })}
        placeholder="اسم المنتج المؤقت"
        className={`${inputClass} bg-amber-50 border-amber-200 focus:border-amber-500 focus:bg-white pe-16 w-full`}
      />
      {!item.showDescription && (
        <button type="button" onClick={() => onUpdate({ showDescription: true })} className="absolute end-3 top-1/2 -translate-y-1/2 text-[length:var(--text-2xs)] font-bold text-amber-600 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded-md transition-colors border border-amber-300">
          + وصف
        </button>
      )}
    </div>
  ) : (
    <div className="relative flex-1 min-w-0">
      <input
        type="text"
        id={`prod-${item.id}`}
        value={item.productName}
        onFocus={onFocusSearch}
        onChange={(e) => { onUpdate({ productName: e.target.value }); onSearchChange(e.target.value); }}
        onKeyDown={onKeyDownSearch}
        placeholder="البحث عن منتج..."
        autoComplete="off"
        className={`${inputClass} prod-input bg-slate-50 focus:bg-white pe-16 w-full`}
      />
      {!item.showDescription && (
        <button type="button" onClick={() => onUpdate({ showDescription: true })} className="absolute end-3 top-1/2 -translate-y-1/2 text-[length:var(--text-2xs)] font-bold text-indigo-500 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md transition-colors border border-indigo-200">
          + وصف
        </button>
      )}
      {isSearching && searchQuery.trim().length > 0 && (
        <AutocompleteList
          searchQuery={searchQuery}
          filteredItems={filteredItems}
          focusedSearchIndex={focusedSearchIndex}
          onHoverIndex={onHoverSearchIndex}
          onSelect={onSelectAutocomplete}
          onAddTemporary={onAddTemporary}
          className="min-w-[min(90vw,350px)]"
        />
      )}
    </div>
  );

  const descriptionField = item.showDescription && (
    <div className="relative mt-2">
      <input
        type="text"
        value={item.description}
        onChange={(e) => onUpdate({ description: e.target.value })}
        placeholder="وصف إضافي..."
        className={`${inputClass} bg-slate-50 focus:bg-white text-xs py-2.5 w-full pe-9`}
      />
      <button type="button" onClick={() => onUpdate({ showDescription: false, description: "" })} className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors">
        <X className="size-3.5" />
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop row */}
      <motion.div layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className={`hidden lg:flex relative items-start gap-2 group ${isSearching ? "z-50" : "z-10"}`}>
        <button type="button" onClick={onRemove} className="w-10 h-10 mt-1 rounded-xl flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors shrink-0">
          <Trash2 className="size-4" />
        </button>

        <div className="grid grid-cols-12 gap-3 flex-1 items-start bg-white border border-slate-100 rounded-2xl p-2 hover:border-indigo-200 hover:shadow-md transition-all">
          <div className="col-span-7 relative flex flex-col gap-1">
            <div className="relative w-full flex items-center gap-2">
              {productField}
              {item.isTemporary && (
                <div className="relative w-24 shrink-0">
                  <input type="number" inputMode="decimal" value={item.costPrice || ""} onChange={(e) => onUpdate({ costPrice: parseFloat(e.target.value) || 0 })} placeholder="تكلفة" className={`${inputClass} force-english-digits bg-amber-50 border-amber-200 focus:border-amber-500 focus:bg-white text-center w-full px-2`} />
                </div>
              )}
            </div>
            {descriptionField}
          </div>

          <div className="col-span-1 h-full flex items-start pt-0.5">
            <input
              type="number" inputMode="numeric" id={`qty-${item.id}`} min="1"
              value={item.quantity || ""}
              onChange={(e) => onUpdate({ quantity: parseInt(e.target.value) || 0 })}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onQuantityEnter(); } }}
              className={`${inputClass} force-english-digits bg-slate-50 focus:bg-white text-center h-[46px] w-full px-2`}
            />
          </div>

          <div className="col-span-2 h-full flex flex-col items-start pt-0.5">
            <input
              type="number" inputMode="decimal" id={`price-${item.id}`} min="0"
              value={item.unitPrice || ""}
              onChange={(e) => onUpdate({ unitPrice: parseFloat(e.target.value) || 0 })}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onPriceEnter(); } }}
              className={`${inputClass} force-english-digits bg-slate-50 focus:bg-white text-center h-[46px] w-full px-2`}
            />
            <MarginBadge item={item} />
          </div>

          <div className="col-span-2 text-left h-full flex items-start pt-0.5 pe-1">
            <span className="font-mono font-black text-[length:var(--text-base)] xl:text-lg text-indigo-700 bg-indigo-50 px-2 xl:px-3 py-1.5 rounded-xl border border-indigo-100 inline-block w-full text-center shadow-sm h-[46px] flex items-center justify-center overflow-hidden">
              {formatCurrency(item.total)}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Mobile/tablet card */}
      <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2 }} className={`lg:hidden bg-white border border-indigo-100/60 rounded-[1.75rem] p-4 shadow-lg shadow-indigo-900/5 relative ${isSearching ? "z-50" : "z-10"}`}>
        <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-indigo-500 to-blue-500 rounded-l-[1.75rem]" />

        <div className="flex justify-between items-center mb-4 ps-2">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm">{index + 1}</span>
            <span className="text-sm font-bold text-slate-800">عنصر الفاتورة</span>
          </div>
          <button type="button" onClick={onRemove} className="w-11 h-11 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all active:scale-95 shadow-sm">
            <Trash2 className="size-4" />
          </button>
        </div>

        <div className="space-y-4 ps-2">
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">{item.isTemporary ? "المنتج (مؤقت)" : "المنتج"}</label>
            {productField}
            {item.isTemporary && (
              <div className="mt-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">التكلفة الأساسية</label>
                <input type="number" inputMode="decimal" value={item.costPrice || ""} onChange={(e) => onUpdate({ costPrice: parseFloat(e.target.value) || 0 })} placeholder="تكلفة" className={`${inputClass} bg-amber-50 border-amber-200 focus:border-amber-500 w-full font-mono px-4`} />
              </div>
            )}
          </div>

          {descriptionField}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">الكمية</label>
              <input
                type="number" inputMode="numeric" id={`qty-${item.id}`} min="1"
                value={item.quantity || ""}
                onChange={(e) => onUpdate({ quantity: parseInt(e.target.value) || 0 })}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onQuantityEnter(); } }}
                className={`${inputClass} text-center font-mono font-black text-xl text-slate-900 force-english-digits h-14`}
              />
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">السعر للوحدة</label>
              <input
                type="number" inputMode="decimal" id={`price-${item.id}`} min="0"
                value={item.unitPrice || ""}
                onChange={(e) => onUpdate({ unitPrice: parseFloat(e.target.value) || 0 })}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onPriceEnter(); } }}
                className={`${inputClass} text-center font-mono font-black text-xl text-slate-900 force-english-digits h-14`}
              />
              <MarginBadge item={item} />
            </div>
          </div>

          <div className="pt-4 mt-1 border-t border-slate-100 flex justify-between items-center">
            <span className="text-sm font-black text-slate-400">الإجمالي الفرعي</span>
            <span className="font-mono font-black text-2xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 rounded-xl shadow-md shadow-indigo-500/20">{formatCurrency(item.total)}</span>
          </div>
        </div>
      </motion.div>
    </>
  );
}
