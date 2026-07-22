"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "@/lib/store";
import type { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from "@/lib/store";
import { formatCurrency } from "@/lib/data";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus, Trash2, PackageCheck, X, AlertTriangle, Sparkles, Search, Package } from "lucide-react";

const STATUS_META: Record<PurchaseOrderStatus, { label: string; cls: string }> = {
  draft: { label: "مسودة", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  ordered: { label: "مطلوب", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  received: { label: "مستلم", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: "ملغى", cls: "bg-rose-50 text-rose-700 border-rose-200" },
};

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

// isNew rows aren't in the catalog yet — newName holds the typed name until save(),
// when a real product row is created first so the purchase order can reference a
// real productId (receiving still adds stock the normal way). productQuery holds
// the live search text shown in the input, separate from the committed productId.
type DraftItem = { productId: string; productQuery: string; quantity: number; costPrice: number; isNew?: boolean; newName?: string };
const BLANK_ITEM: DraftItem = { productId: "", productQuery: "", quantity: 1, costPrice: 0 };

export default function PurchasesPage() {
  const {
    connectionStatus, purchaseOrders, suppliers, products, settings,
    addPurchaseOrder, addProduct, receivePurchaseOrder, deletePurchaseOrder,
  } = useStore();
  const cur = settings.currencySymbol;

  const [createOpen, setCreateOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [showSupplierDrop, setShowSupplierDrop] = useState(false);
  const supplierRef = useRef<HTMLDivElement>(null);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftItem[]>([{ ...BLANK_ITEM }]);
  const [openProductRow, setOpenProductRow] = useState<number | null>(null);
  const productRowRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [deleting, setDeleting] = useState<PurchaseOrder | null>(null);
  const [receiving, setReceiving] = useState<PurchaseOrder | null>(null);

  const selectedSupplier = suppliers.find((s) => s.id === supplierId) || null;

  const sorted = useMemo(
    () => [...purchaseOrders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [purchaseOrders]
  );
  const draftTotal = useMemo(() => items.reduce((s, it) => s + it.quantity * it.costPrice, 0), [items]);
  const filteredSuppliers = useMemo(() => {
    const q = supplierSearch.trim().toLowerCase();
    return q ? suppliers.filter((s) => s.name.toLowerCase().includes(q)) : suppliers;
  }, [suppliers, supplierSearch]);

  useEffect(() => {
    function clickOutside(e: MouseEvent) {
      if (supplierRef.current && !supplierRef.current.contains(e.target as Node)) setShowSupplierDrop(false);
      const openRef = openProductRow != null ? productRowRefs.current[openProductRow] : null;
      if (openRef && !openRef.contains(e.target as Node)) setOpenProductRow(null);
    }
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, [openProductRow]);

  if (connectionStatus === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  function resetForm() {
    setSupplierId(""); setSupplierSearch(""); setShowSupplierDrop(false);
    setNotes(""); setItems([{ ...BLANK_ITEM }]); setOpenProductRow(null);
  }
  function toggleCreate() {
    if (createOpen) { setCreateOpen(false); return; }
    resetForm(); setCreateOpen(true);
  }
  function setItem(idx: number, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function pickProduct(idx: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    setItem(idx, {
      productId, productQuery: p?.name || "",
      costPrice: p && p.costPrice > 0 ? p.costPrice : items[idx].costPrice,
    });
    setOpenProductRow(null);
  }
  function toggleNewProduct(idx: number) {
    setItem(idx, items[idx].isNew
      ? { isNew: false, newName: "", productId: "", productQuery: "" }
      : { isNew: true, productId: "", productQuery: "" });
  }
  // New-product rows create the catalog entry now (stock 0 — receiving the order
  // adds the ordered quantity the normal way) so the purchase order can reference
  // a real productId like every other item.
  function buildItems(): PurchaseOrderItem[] {
    const built: PurchaseOrderItem[] = [];
    for (const it of items) {
      if (it.isNew && it.newName?.trim() && it.quantity > 0) {
        const created = addProduct({
          name: it.newName.trim(),
          category: settings.productCategories[0] || "عام",
          sku: "", description: "",
          costPrice: it.costPrice, sellingPrice: 0,
          stock: 0, minStock: 5, unit: "قطعة",
        });
        built.push({ productId: created.id, productName: created.name, quantity: it.quantity, costPrice: it.costPrice, total: it.quantity * it.costPrice });
      } else if (it.productId && it.quantity > 0) {
        const p = products.find((x) => x.id === it.productId);
        built.push({ productId: it.productId, productName: p?.name || "", quantity: it.quantity, costPrice: it.costPrice, total: it.quantity * it.costPrice });
      }
    }
    return built;
  }
  function save(status: PurchaseOrderStatus) {
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (!supplier) { toast.error("الرجاء اختيار المورد"); return; }
    if (items.some((it) => it.isNew && !it.newName?.trim())) { toast.error("أدخل اسم المنتج الجديد أو ألغِ الصف"); return; }
    const built = buildItems();
    if (built.length === 0) { toast.error("أضف منتجاً واحداً على الأقل"); return; }
    addPurchaseOrder({
      supplierId: supplier.id, supplierName: supplier.name, items: built,
      total: built.reduce((s, it) => s + it.total, 0), status, notes, receivedAt: "",
    });
    toast.success(status === "received" ? "تم استلام الطلب وإضافته للمخزون" : "تم حفظ طلب الشراء");
    setCreateOpen(false); resetForm();
  }

  const totalReceived = purchaseOrders.filter((po) => po.status === "received").reduce((s, po) => s + po.total, 0);
  const pendingCount = purchaseOrders.filter((po) => po.status !== "received" && po.status !== "cancelled").length;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-5 sm:pt-8 pb-10 sm:pb-16 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-violet-600 to-indigo-600 p-5 sm:p-6 md:p-8 text-white shadow-lg shadow-violet-500/20">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-violet-100 text-sm font-bold">
              <ShoppingCart className="h-4 w-4" /> المشتريات
            </div>
            <h1 className="mt-2 text-2xl md:text-3xl font-black !text-white">طلبات الشراء</h1>
            <p className="mt-1 text-sm text-violet-100/90">عند استلام الطلب تُضاف الكميات للمخزون ويُحدّث سعر التكلفة تلقائياً.</p>
          </div>
          <Button onClick={toggleCreate} className="gap-2 rounded-xl h-11 px-5 bg-white text-violet-700 hover:bg-violet-50 font-bold shadow">
            {createOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {createOpen ? "إغلاق" : "طلب شراء جديد"}
          </Button>
        </div>
      </div>

      {/* Inline create panel — slides open below the header instead of a modal popup */}
      <AnimatePresence initial={false}>
        {createOpen && (
          <motion.div
            key="po-form"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-violet-200 bg-violet-50/40 p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-black text-slate-800">طلب شراء جديد</h2>
                <Button size="sm" variant="ghost" onClick={() => setCreateOpen(false)} className="text-slate-500 px-2"><X className="h-4 w-4" /></Button>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">المورد</label>
                {selectedSupplier ? (
                  <div className="bg-gradient-to-l from-violet-50 to-indigo-50 border border-violet-200/50 rounded-2xl p-3 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center font-black shadow-inner">
                        {selectedSupplier.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-800 block truncate">{selectedSupplier.name}</span>
                        {selectedSupplier.phone && <span className="text-xs text-indigo-500 font-mono block" dir="ltr">{selectedSupplier.phone}</span>}
                      </div>
                    </div>
                    <button type="button" onClick={() => { setSupplierId(""); setSupplierSearch(""); }} className="w-9 h-9 shrink-0 rounded-xl bg-white text-rose-500 flex items-center justify-center hover:bg-rose-50 transition-colors shadow-sm active:scale-95">
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative" ref={supplierRef}>
                    <div className="relative">
                      <Search className="absolute start-4 top-1/2 -translate-y-1/2 size-4 text-indigo-300" />
                      <input
                        type="text"
                        placeholder="ابحث عن مورد..."
                        value={supplierSearch}
                        onChange={(e) => { setSupplierSearch(e.target.value); setShowSupplierDrop(true); }}
                        onFocus={() => setShowSupplierDrop(true)}
                        className="w-full bg-white border border-slate-200 rounded-2xl py-3 ps-11 pe-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                      />
                    </div>
                    {showSupplierDrop && (
                      <div className="absolute start-0 top-[calc(100%+8px)] w-full bg-white/95 backdrop-blur-xl border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl z-[60] max-h-[280px] overflow-y-auto p-2">
                        {filteredSuppliers.length === 0 ? (
                          <div className="p-4 text-center text-sm font-bold text-slate-500">لا يوجد مورد بهذا الاسم</div>
                        ) : (
                          filteredSuppliers.map((s) => (
                            <button
                              type="button"
                              key={s.id}
                              onClick={() => { setSupplierId(s.id); setSupplierSearch(s.name); setShowSupplierDrop(false); }}
                              className="w-full flex items-center gap-3 p-2.5 hover:bg-indigo-50/50 rounded-xl transition-colors border border-transparent hover:border-indigo-100 text-start"
                            >
                              <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600 flex items-center justify-center font-bold">
                                {s.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-800 truncate text-sm">
                                  <HighlightMatch text={s.name} query={supplierSearch} />
                                </div>
                                {s.phone && <div className="text-xs font-mono text-indigo-500/80">{s.phone}</div>}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
                {suppliers.length === 0 && <p className="mt-1 text-xs text-amber-600">أضف مورداً أولاً من صفحة الموردين.</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-500">الأصناف</label>
                  <Button size="sm" variant="ghost" onClick={() => setItems((p) => [...p, { ...BLANK_ITEM }])} className="gap-1 text-xs font-bold text-indigo-600">
                    <Plus className="h-3.5 w-3.5" /> صنف
                  </Button>
                </div>
                {items.map((it, idx) => {
                  const q = it.productQuery.trim().toLowerCase();
                  const filteredProducts = q
                    ? products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 30)
                    : products.slice(0, 30);
                  const rowTotal = it.quantity * it.costPrice;
                  return (
                    <div key={idx} className="rounded-2xl border border-slate-100 bg-white p-3 flex flex-col gap-2.5">
                      <div className="flex items-start gap-2">
                        {it.isNew ? (
                          <Input
                            value={it.newName || ""}
                            onChange={(e) => setItem(idx, { newName: e.target.value })}
                            placeholder="اسم المنتج الجديد"
                            className="bg-amber-50 border-amber-200 focus-visible:border-amber-400 flex-1"
                          />
                        ) : (
                          <div className="relative flex-1 min-w-0" ref={(el) => { productRowRefs.current[idx] = el; }}>
                            <input
                              type="text"
                              value={it.productQuery}
                              onFocus={() => setOpenProductRow(idx)}
                              onChange={(e) => { setItem(idx, { productQuery: e.target.value, productId: "" }); setOpenProductRow(idx); }}
                              placeholder="ابحث عن منتج..."
                              autoComplete="off"
                              className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all px-3 text-sm font-bold text-slate-800"
                            />
                            {openProductRow === idx && (
                              <div className="absolute start-0 top-[calc(100%+6px)] w-72 max-w-[85vw] bg-white/95 backdrop-blur-xl border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl z-[60] max-h-[280px] overflow-y-auto p-2">
                                {filteredProducts.length === 0 ? (
                                  <div className="p-4 text-center text-sm font-bold text-slate-500">لا يوجد منتج بهذا الاسم</div>
                                ) : (
                                  filteredProducts.map((p) => (
                                    <button
                                      type="button"
                                      key={p.id}
                                      onClick={() => pickProduct(idx, p.id)}
                                      className="w-full flex items-center gap-2.5 p-2.5 hover:bg-indigo-50/50 rounded-xl transition-colors border border-transparent hover:border-indigo-100 text-start"
                                    >
                                      <div className="w-8 h-8 shrink-0 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center"><Package className="size-4" /></div>
                                      <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">
                                        <HighlightMatch text={p.name} query={it.productQuery} />
                                      </span>
                                      <span className="shrink-0 text-xs font-mono font-black text-slate-500">{formatCurrency(p.costPrice, cur)} تكلفة</span>
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleNewProduct(idx)}
                          title={it.isNew ? "اختيار من المخزون بدلاً من ذلك" : "منتج جديد غير موجود في المخزون"}
                          className={`shrink-0 px-2 gap-1 text-xs font-bold ${it.isNew ? "text-amber-600" : "text-indigo-600"}`}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{it.isNew ? "من المخزون" : "جديد"}</span>
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setItems((p) => p.length === 1 ? p : p.filter((_, i) => i !== idx))} className="text-rose-500 px-2 shrink-0"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">الكمية</label>
                          <Input type="number" min={1} value={it.quantity} onChange={(e) => setItem(idx, { quantity: Math.max(1, Number(e.target.value) || 1) })} className="bg-slate-50 text-center" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">التكلفة للوحدة</label>
                          <Input type="number" min={0} step="0.01" value={it.costPrice} onChange={(e) => setItem(idx, { costPrice: Math.max(0, Number(e.target.value) || 0) })} className="bg-slate-50 text-center" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">الإجمالي الفرعي</label>
                          <div className="h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-sm font-black text-indigo-700">{formatCurrency(rowTotal, cur)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {items.some((it) => it.isNew) && (
                  <p className="text-[11px] font-bold text-amber-600">المنتجات الجديدة تُضاف إلى كتالوج المخزون مباشرة (بمخزون 0 وسعر بيع غير محدد) — أكمل السعر والفئة لاحقاً من الإدارة المتقدمة للمخزون.</p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">ملاحظات</label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="اختياري" className="bg-white" />
              </div>

              <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 border border-violet-100">
                <span className="text-sm font-bold text-slate-500">الإجمالي</span>
                <span className="text-xl font-black text-slate-800">{formatCurrency(draftTotal, cur)}</span>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => save("ordered")} className="rounded-xl font-bold bg-white">حفظ كطلب</Button>
                <Button onClick={() => save("received")} className="gap-2 rounded-xl font-bold"><PackageCheck className="h-4 w-4" /> استلام مباشر</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-bold text-slate-500 block">إجمالي الطلبات</span>
          <span className="mt-1 block text-2xl font-black text-slate-800">{purchaseOrders.length}</span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-bold text-slate-500 block">قيد الانتظار</span>
          <span className="mt-1 block text-2xl font-black text-amber-600">{pendingCount}</span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm col-span-2 md:col-span-1">
          <span className="text-xs font-bold text-slate-500 block">إجمالي المستلم</span>
          <span className="mt-1 block text-2xl font-black text-emerald-600">{formatCurrency(totalReceived, cur)}</span>
        </div>
      </div>

      {/* List */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {sorted.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingCart className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-700">لا توجد طلبات شراء بعد</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sorted.map((po) => {
              const meta = STATUS_META[po.status];
              return (
                <div key={po.id} className="flex flex-col md:flex-row md:items-center gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-800">{po.poNumber}</span>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${meta.cls}`}>{meta.label}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">{po.supplierName} · {po.items.length} صنف · {po.createdAt}</p>
                  </div>
                  <div className="text-lg font-black text-slate-800 md:w-40 md:text-left">{formatCurrency(po.total, cur)}</div>
                  <div className="flex items-center gap-2">
                    {po.status !== "received" && po.status !== "cancelled" && (
                      <Button size="sm" variant="outline" onClick={() => setReceiving(po)} className="gap-1.5 rounded-lg text-xs font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                        <PackageCheck className="h-4 w-4" /> استلام
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setDeleting(po)} className="rounded-lg text-rose-600"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Receive confirm — stays a modal, a deliberate extra step before an inventory-affecting action */}
      <Dialog open={!!receiving} onOpenChange={(o) => !o && setReceiving(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>تأكيد استلام الطلب</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">سيتم إضافة كميات {receiving?.poNumber} إلى المخزون وتحديث أسعار التكلفة.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReceiving(null)} className="rounded-xl font-bold">إلغاء</Button>
            <Button onClick={() => { if (receiving) { receivePurchaseOrder(receiving.id); toast.success("تم استلام الطلب وإضافة الكميات للمخزون"); setReceiving(null); } }} className="gap-2 rounded-xl font-bold"><PackageCheck className="h-4 w-4" /> تأكيد</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm — stays a modal */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-rose-600"><AlertTriangle className="h-5 w-5" /> حذف طلب الشراء</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">هل أنت متأكد من حذف {deleting?.poNumber}؟</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleting(null)} className="rounded-xl font-bold">إلغاء</Button>
            <Button onClick={() => { if (deleting) { deletePurchaseOrder(deleting.id); toast.success("تم حذف الطلب"); setDeleting(null); } }} className="rounded-xl font-bold bg-rose-600 hover:bg-rose-700">حذف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
