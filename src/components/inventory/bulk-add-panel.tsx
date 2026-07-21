"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ClipboardPaste, Plus, Trash2, X, Layers, ChevronDown } from "lucide-react";
import { SpreadsheetCell } from "@/components/spreadsheet-cell";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const INITIAL_ROW_COUNT = 5;

interface BulkRow {
  key: string;
  name: string;
  category: string;
  sku: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  unit: string;
}

function blankRow(category: string): BulkRow {
  return { key: `r_${Date.now()}_${Math.random().toString(36).slice(2)}`, name: "", category, sku: "", costPrice: 0, sellingPrice: 0, stock: 0, minStock: 5, unit: "قطعة" };
}

interface BulkAddPanelProps {
  open: boolean;
  onClose: () => void;
  categories: string[];
  onConfirm: (rows: Omit<BulkRow, "key">[]) => void;
}

// Bulk product entry — opens straight into an Excel-style grid of blank rows you can
// type/Tab across directly, same cells as the main sheet. Pasting from Excel/Sheets
// (tab or comma separated) is available as a secondary shortcut for larger batches.
// Nothing is saved until "إضافة الكل" so everything can be reviewed/corrected first.
export function BulkAddPanel({ open, onClose, categories, onConfirm }: BulkAddPanelProps) {
  const [pasteText, setPasteText] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [rows, setRows] = useState<BulkRow[]>([]);
  const defaultCategory = categories[0] || "عام";

  useEffect(() => {
    if (open && rows.length === 0) {
      setRows(Array.from({ length: INITIAL_ROW_COUNT }, () => blankRow(defaultCategory)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function parsePaste() {
    const lines = pasteText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    const parsed: BulkRow[] = lines.map((line, i) => {
      const parts = line.includes("\t") ? line.split("\t") : line.split(",");
      const [name, category, sku, cost, sell, stock, minStock, unit] = parts.map((p) => p?.trim() ?? "");
      return {
        key: `r_${Date.now()}_${i}`,
        name: name || "",
        category: category && categories.includes(category) ? category : defaultCategory,
        sku: sku || "",
        costPrice: parseFloat(cost) || 0,
        sellingPrice: parseFloat(sell) || 0,
        stock: parseInt(stock) || 0,
        minStock: parseInt(minStock) || 5,
        unit: unit || "قطعة",
      };
    });
    setRows((prev) => [...prev, ...parsed]);
    setPasteText("");
  }

  function updateRow(key: string, updates: Partial<BulkRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...updates } : r)));
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function reset() {
    setRows([]);
    setPasteText("");
    setShowPaste(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleConfirm() {
    const valid = rows.filter((r) => r.name.trim());
    if (valid.length === 0) return;
    onConfirm(valid.map(({ key: _key, ...rest }) => rest));
    reset();
  }

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div className="rounded-2xl border border-slate-300 bg-slate-50 p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 shrink-0 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Layers className="size-5" />
                </div>
                <div>
                  <h2 className="font-black text-slate-800">إضافة منتجات بالجملة</h2>
                  <p className="text-xs font-bold text-slate-500">أدخل بيانات كل منتج في صفه — مثل إكسل تماماً، Tab للانتقال بين الحقول</p>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={handleClose} className="text-slate-500 px-2"><X className="h-4 w-4" /></Button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => setShowPaste((v) => !v)}
                className="w-full flex items-center justify-between p-3 text-xs font-black text-slate-500 hover:bg-slate-50 transition-colors"
              >
                <span className="flex items-center gap-1.5"><ClipboardPaste className="size-3.5" /> أو الصق دفعة كبيرة من إكسل / شيتس</span>
                <ChevronDown className={`size-4 transition-transform ${showPaste ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence initial={false}>
                {showPaste && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <div className="p-4 pt-0 space-y-2">
                      <p className="text-xs text-slate-400 font-bold">كل سطر منتج، الأعمدة مفصولة بـ Tab: الاسم، الفئة، الكود، التكلفة، السعر، المخزون، حد التنبيه، الوحدة (الاسم فقط مطلوب)</p>
                      <Textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder={"ورق A4\tقرطاسية\t\t2\t3.5\t100\t10\tعبوة"} rows={3} className="bg-slate-50 font-mono text-xs" />
                      <div className="flex justify-end">
                        <Button size="sm" onClick={parsePaste} disabled={!pasteText.trim()} className="rounded-lg font-bold">إضافة كصفوف جديدة</Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {rows.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="min-w-max">
                    <div className="grid grid-cols-[220px_140px_110px_100px_100px_90px_90px_90px_44px] text-xs font-black text-slate-400 uppercase bg-slate-50 border-b border-slate-200">
                      <div className="px-3 py-2.5">الاسم</div>
                      <div className="px-3 py-2.5">الفئة</div>
                      <div className="px-3 py-2.5">الكود</div>
                      <div className="px-3 py-2.5">التكلفة</div>
                      <div className="px-3 py-2.5">السعر</div>
                      <div className="px-3 py-2.5">المخزون</div>
                      <div className="px-3 py-2.5">التنبيه</div>
                      <div className="px-3 py-2.5">الوحدة</div>
                      <div className="px-3 py-2.5" />
                    </div>
                    <div className="divide-y divide-slate-100">
                      {rows.map((r) => (
                        <div key={r.key} className="grid grid-cols-[220px_140px_110px_100px_100px_90px_90px_90px_44px] items-center hover:bg-slate-50/70">
                          <div className="px-2 py-1.5"><SpreadsheetCell value={r.name} onCommit={(v) => updateRow(r.key, { name: v })} className="font-bold text-slate-900" placeholder="اسم المنتج" /></div>
                          <div className="px-2 py-1.5">
                            <Select value={r.category} onValueChange={(v) => v && updateRow(r.key, { category: v })}>
                              <SelectTrigger className="h-9 text-xs bg-transparent border-transparent hover:bg-slate-100 rounded-lg"><SelectValue /></SelectTrigger>
                              <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div className="px-2 py-1.5"><SpreadsheetCell value={r.sku} onCommit={(v) => updateRow(r.key, { sku: v })} className="font-mono text-xs text-slate-500" /></div>
                          <div className="px-2 py-1.5"><SpreadsheetCell value={r.costPrice} onCommit={(v) => updateRow(r.key, { costPrice: parseFloat(v) || 0 })} type="number" step="0.01" min={0} align="center" className="font-mono font-bold text-slate-700" /></div>
                          <div className="px-2 py-1.5"><SpreadsheetCell value={r.sellingPrice} onCommit={(v) => updateRow(r.key, { sellingPrice: parseFloat(v) || 0 })} type="number" step="0.01" min={0} align="center" className="font-mono font-bold text-slate-700" /></div>
                          <div className="px-2 py-1.5"><SpreadsheetCell value={r.stock} onCommit={(v) => updateRow(r.key, { stock: parseInt(v) || 0 })} type="number" min={0} align="center" className="font-mono font-bold text-slate-700" /></div>
                          <div className="px-2 py-1.5"><SpreadsheetCell value={r.minStock} onCommit={(v) => updateRow(r.key, { minStock: parseInt(v) || 0 })} type="number" min={0} align="center" className="font-mono font-bold text-slate-500" /></div>
                          <div className="px-2 py-1.5"><SpreadsheetCell value={r.unit} onCommit={(v) => updateRow(r.key, { unit: v })} align="center" className="text-xs text-slate-500" /></div>
                          <div className="px-2 py-1.5 text-center">
                            <Button size="sm" variant="ghost" onClick={() => removeRow(r.key)} className="text-rose-600 px-2"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button variant="outline" onClick={() => setRows((prev) => [...prev, blankRow(defaultCategory)])} className="gap-2 rounded-xl font-bold bg-white">
                <Plus className="h-4 w-4" /> إضافة صف يدوياً
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} className="rounded-xl font-bold bg-white">إلغاء</Button>
                <Button onClick={handleConfirm} disabled={rows.filter((r) => r.name.trim()).length === 0} className="rounded-xl font-bold">
                  إضافة {rows.filter((r) => r.name.trim()).length || ""} منتج
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
