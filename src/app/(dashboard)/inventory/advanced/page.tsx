"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useStore, usePendingSaves } from "@/lib/store";
import type { Product } from "@/lib/data";
import { formatCurrency } from "@/lib/data";
import { toast } from "sonner";
import { useDebounce } from "@/lib/use-debounce";
import { exportCSV } from "@/lib/export";
import { ImageUpload } from "@/components/image-upload";
import { ProductSheet } from "@/components/inventory/product-sheet";
import { BulkAddPanel } from "@/components/inventory/bulk-add-panel";
import { AssistantChat } from "@/components/assistant-chat";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Lock, ArrowRight, Search, Download, TrendingUp, TrendingDown, DollarSign,
  Plus, X, AlertTriangle, Sparkles, Layers,
} from "lucide-react";

function marginOf(p: Product): number {
  return p.sellingPrice > 0 ? ((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100 : 0;
}

const SORT_LABELS: Record<string, string> = {
  manual: "الترتيب اليدوي (افتراضي)",
  "name-asc": "الاسم أبجدياً",
  "price-desc": "السعر: الأعلى أولاً",
  "price-asc": "السعر: الأقل أولاً",
  "cost-desc": "التكلفة: الأعلى أولاً",
  "cost-asc": "التكلفة: الأقل أولاً",
  "margin-desc": "هامش الربح: الأعلى أولاً",
  "margin-asc": "هامش الربح: الأقل أولاً",
  "stock-desc": "المخزون: الأكثر أولاً",
  "stock-asc": "المخزون: الأقل أولاً",
  category: "الفئة أبجدياً",
};

const blankForm = {
  name: "", category: "", sku: "", description: "",
  costPrice: 0, sellingPrice: 0, stock: 0, minStock: 5, unit: "قطعة", image: "",
};

export default function AdvancedInventoryPage() {
  const { connectionStatus, products, settings, addProduct, addProducts, updateProduct, reorderProducts, deleteProduct } = useStore();
  const isSaving = usePendingSaves();
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("manual");

  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);

  // Renaming a product needs to cascade into every historical invoice, purchase order,
  // and bundle that stores its name as frozen text — a plain updateProduct() only
  // touches the live products row, so this goes through the dedicated cascade endpoint.
  async function renameProduct(id: string, newName: string) {
    const toastId = toast.loading("جاري تحديث الاسم في كل مكان...");
    try {
      const res = await fetch("/api/products/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: id, newName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل تحديث الاسم");
      updateProduct(id, { name: newName });
      toast.success(
        `تم التحديث في ${data.invoicesUpdated} فاتورة، ${data.purchaseOrdersUpdated} طلب شراء، ${data.bundlesUpdated} مجموعة`,
        { id: toastId }
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل تحديث الاسم", { id: toastId });
    }
  }

  const filtered = useMemo(() => {
    const q = debounced.toLowerCase().trim();
    const list = products.filter((p) => {
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    });
    // "manual" keeps the store's sort_order (drag-to-reorder) as-is; any other
    // option re-sorts just this view without touching the saved manual order.
    switch (sortBy) {
      case "name-asc": return [...list].sort((a, b) => a.name.localeCompare(b.name, "ar"));
      case "price-desc": return [...list].sort((a, b) => b.sellingPrice - a.sellingPrice);
      case "price-asc": return [...list].sort((a, b) => a.sellingPrice - b.sellingPrice);
      case "cost-desc": return [...list].sort((a, b) => b.costPrice - a.costPrice);
      case "cost-asc": return [...list].sort((a, b) => a.costPrice - b.costPrice);
      case "stock-desc": return [...list].sort((a, b) => b.stock - a.stock);
      case "stock-asc": return [...list].sort((a, b) => a.stock - b.stock);
      case "margin-desc": return [...list].sort((a, b) => marginOf(b) - marginOf(a));
      case "margin-asc": return [...list].sort((a, b) => marginOf(a) - marginOf(b));
      case "category": return [...list].sort((a, b) => a.category.localeCompare(b.category, "ar"));
      default: return list;
    }
  }, [products, debounced, categoryFilter, sortBy]);

  const stats = useMemo(() => {
    const totalCostValue = products.reduce((s, p) => s + p.costPrice * p.stock, 0);
    const totalSellValue = products.reduce((s, p) => s + p.sellingPrice * p.stock, 0);
    const avgMargin = products.length > 0 ? products.reduce((s, p) => s + marginOf(p), 0) / products.length : 0;
    return { totalCostValue, totalSellValue, avgMargin, potentialProfit: totalSellValue - totalCostValue };
  }, [products]);

  if (connectionStatus === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  function toggleAdd() {
    if (addOpen) { setAddOpen(false); return; }
    setForm({ ...blankForm, category: settings.productCategories[0] || "" });
    setAddOpen(true);
    setBulkOpen(false);
  }

  function saveNew() {
    if (!form.name.trim()) { toast.error("الرجاء إدخال اسم المنتج"); return; }
    const { image, ...rest } = form;
    addProduct({ ...rest, name: form.name.trim(), category: form.category || settings.productCategories[0] || "عام", image: image || undefined });
    toast.success("تمت إضافة المنتج");
    setAddOpen(false);
  }

  function toggleBulk() {
    setBulkOpen((v) => !v);
    setAddOpen(false);
  }

  function saveBulk(rows: { name: string; category: string; sku: string; costPrice: number; sellingPrice: number; stock: number; minStock: number; unit: string }[]) {
    const defaultCategory = settings.productCategories[0] || "عام";
    addProducts(rows.map((r) => ({ ...r, name: r.name.trim(), category: r.category || defaultCategory, description: "" })));
    toast.success(`تمت إضافة ${rows.length} منتج بنجاح`);
    setBulkOpen(false);
  }

  function exportFullCsv() {
    exportCSV(
      "inventory_advanced",
      ["الاسم", "الكود", "الفئة", "سعر التكلفة", "سعر المبيع", "هامش الربح %", "المخزون", "الوحدة"],
      filtered.map((p) => [p.name, p.sku, p.category, String(p.costPrice), String(p.sellingPrice), marginOf(p).toFixed(1), String(p.stock), p.unit])
    );
    toast.success("تم تصدير البيانات الكاملة");
  }

  return (
    <div className="pb-32 bg-gradient-to-br from-slate-100 via-white to-slate-50 min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-5 sm:pt-8 pb-10 sm:pb-16 space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-slate-900 to-slate-700 p-5 sm:p-6 md:p-8 text-white shadow-lg">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 text-slate-300 text-sm font-bold">
                <Lock className="h-4 w-4" /> بيانات حساسة — للإدارة فقط
              </div>
              <h1 className="mt-2 text-2xl md:text-3xl font-black !text-white">الإدارة المتقدمة للمخزون</h1>
              <p className="mt-1 text-sm text-slate-300">إضافة، تعديل، حذف، وتصدير كامل بيانات المنتجات — التكلفة والفئة وهامش الربح.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setAssistantOpen((v) => !v)}
                className={`gap-2 h-11 px-5 font-bold shadow ${assistantOpen ? "bg-white/20 text-white hover:bg-white/30" : "bg-white text-slate-900 hover:bg-slate-100"}`}
              >
                {assistantOpen ? <X className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                {assistantOpen ? "إغلاق المساعد" : "المساعد الذكي"}
              </Button>
              <Button onClick={toggleAdd} className="gap-2 h-11 px-5 bg-white text-slate-900 hover:bg-slate-100 font-bold shadow">
                {addOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {addOpen ? "إغلاق" : "منتج جديد"}
              </Button>
              <Button onClick={toggleBulk} className={`gap-2 h-11 px-5 font-bold shadow ${bulkOpen ? "bg-white/20 text-white hover:bg-white/30" : "bg-white text-slate-900 hover:bg-slate-100"}`}>
                {bulkOpen ? <X className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
                {bulkOpen ? "إغلاق" : "إضافة جماعية"}
              </Button>
              <Link href="/inventory" className="gap-2 inline-flex items-center rounded-xl h-11 px-5 bg-white/10 hover:bg-white/20 text-white font-bold transition-colors">
                <ArrowRight className="h-4 w-4" /> عودة للمخزون
              </Link>
            </div>
          </div>
        </div>

        {/* Honesty note: no auth in this app */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
          ملاحظة: هذه الصفحة مخفية من التنقّل الرئيسي فقط، وليست محمية بكلمة مرور — لا يوجد نظام تسجيل دخول في التطبيق حالياً.
        </div>

        {/* Save-state indicator — every cell edit auto-saves on blur/Enter (no
            separate Save button); this makes that visible so users don't
            refresh/navigate away before an edit finishes writing to Supabase. */}
        <AnimatePresence>
          {isSaving && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="fixed top-4 inset-x-0 z-50 flex justify-center pointer-events-none"
            >
              <div className="flex items-center gap-2 rounded-full bg-slate-900 text-white text-xs font-bold px-4 py-2 shadow-lg">
                <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
                جارٍ الحفظ... لا تغلق الصفحة
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Inline AI assistant panel — helps organize/rename/analyze inventory faster from within this page */}
        <AnimatePresence initial={false}>
          {assistantOpen && (
            <motion.div
              key="assistant-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl border border-slate-300 bg-white p-4 sm:p-5 shadow-sm">
                <AssistantChat
                  compact
                  height="520px"
                  welcomeText={'أهلاً! اسألني عن المخزون، أو اطلب مني إعادة تسمية منتج مباشرة — مثلاً: "غيّر اسم ورق A4 إلى ورق A4 فاخر" — وسيُطبَّق الاسم الجديد على كل الفواتير وطلبات الشراء والمجموعات القديمة تلقائياً.'}
                  suggestions={["ما هي المنتجات ذات المخزون المنخفض؟", "ما هي المنتجات بدون سعر تكلفة؟", "ما هي اقتراحاتك لتنظيم المخزون؟"]}
                  onProductRenamed={(r) => updateProduct(r.productId, { name: r.newName })}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Inline add-product panel — no popup, slides open below header */}
        <AnimatePresence initial={false}>
          {addOpen && (
            <motion.div
              key="add-product-form"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl border border-slate-300 bg-slate-50 p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-black text-slate-800">منتج جديد</h2>
                  <Button size="sm" variant="ghost" onClick={() => setAddOpen(false)} className="text-slate-500 px-2"><X className="h-4 w-4" /></Button>
                </div>
                <div className="flex flex-col sm:flex-row gap-5">
                  <div className="shrink-0 flex sm:block justify-center">
                    <ImageUpload value={form.image} onChange={(img) => setForm((f) => ({ ...f, image: img }))} size="lg" label="صورة المنتج" />
                  </div>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-slate-500 mb-1.5 block">اسم المنتج</label>
                      <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="مثال: ورق A4" className="bg-white" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1.5 block">الفئة</label>
                      <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v ?? "" }))}>
                        <SelectTrigger className="bg-white w-full"><SelectValue placeholder="اختر" /></SelectTrigger>
                        <SelectContent>{settings.productCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1.5 block">الرمز (SKU)</label>
                      <Input value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} placeholder="اختياري" className="bg-white" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1.5 block">سعر التكلفة</label>
                      <Input type="number" min={0} step="0.01" value={form.costPrice} onChange={(e) => setForm((f) => ({ ...f, costPrice: Number(e.target.value) || 0 }))} className="bg-white" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1.5 block">سعر البيع</label>
                      <Input type="number" min={0} step="0.01" value={form.sellingPrice} onChange={(e) => setForm((f) => ({ ...f, sellingPrice: Number(e.target.value) || 0 }))} className="bg-white" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1.5 block">المخزون الحالي</label>
                      <Input type="number" min={0} value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: Number(e.target.value) || 0 }))} className="bg-white" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1.5 block">حد التنبيه</label>
                      <Input type="number" min={0} value={form.minStock} onChange={(e) => setForm((f) => ({ ...f, minStock: Number(e.target.value) || 0 }))} className="bg-white" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-slate-500 mb-1.5 block">الوصف</label>
                      <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="اختياري" rows={2} className="bg-white" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-5">
                  <Button variant="outline" onClick={() => setAddOpen(false)} className="rounded-xl font-bold bg-white">إلغاء</Button>
                  <Button onClick={saveNew} className="rounded-xl font-bold">إضافة المنتج</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bulk add panel — no popup, slides open below header */}
        <BulkAddPanel open={bulkOpen} onClose={() => setBulkOpen(false)} categories={settings.productCategories} onConfirm={saveBulk} />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> قيمة المخزون بالتكلفة</span>
            <span className="mt-1 block text-xl font-black text-slate-900">{formatCurrency(stats.totalCostValue, settings.currencySymbol)}</span>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> الربح المحتمل</span>
            <span className="mt-1 block text-xl font-black text-emerald-600">{formatCurrency(stats.potentialProfit, settings.currencySymbol)}</span>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><TrendingDown className="h-3.5 w-3.5" /> متوسط هامش الربح</span>
            <span className={`mt-1 block text-xl font-black ${stats.avgMargin >= 20 ? "text-emerald-600" : "text-amber-600"}`}>{stats.avgMargin.toFixed(0)}%</span>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-bold text-slate-500 block">عدد الأصناف</span>
            <span className="mt-1 block text-xl font-black text-slate-900">{products.length}</span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم أو الكود أو الفئة" className="pr-10 h-11 rounded-xl" />
          </div>
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "all")}>
            <SelectTrigger className="md:w-48 h-11 rounded-xl">
              <SelectValue>{(v: string) => (v === "all" ? "كل الفئات" : v)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الفئات</SelectItem>
              {settings.productCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v ?? "manual")}>
            <SelectTrigger className="md:w-52 h-11 rounded-xl">
              <SelectValue>{(v: string) => SORT_LABELS[v] || SORT_LABELS.manual}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">الترتيب اليدوي (افتراضي)</SelectItem>
              <SelectItem value="name-asc">الاسم أبجدياً</SelectItem>
              <SelectItem value="price-desc">السعر: الأعلى أولاً</SelectItem>
              <SelectItem value="price-asc">السعر: الأقل أولاً</SelectItem>
              <SelectItem value="cost-desc">التكلفة: الأعلى أولاً</SelectItem>
              <SelectItem value="cost-asc">التكلفة: الأقل أولاً</SelectItem>
              <SelectItem value="margin-desc">هامش الربح: الأعلى أولاً</SelectItem>
              <SelectItem value="margin-asc">هامش الربح: الأقل أولاً</SelectItem>
              <SelectItem value="stock-desc">المخزون: الأكثر أولاً</SelectItem>
              <SelectItem value="stock-asc">المخزون: الأقل أولاً</SelectItem>
              <SelectItem value="category">الفئة أبجدياً</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportFullCsv} variant="outline" className="gap-2 h-11 rounded-xl font-bold">
            <Download className="h-4 w-4" /> تصدير الكل CSV
          </Button>
        </div>

        {/* Spreadsheet — every field is a live cell: click, type, Tab/Enter to move on,
            Escape to revert. Commits on blur/Enter, never on every keystroke. Columns
            are resizable (drag the handle on the left edge of each header) and rows
            are drag-to-reorder (grip on hover) so related products can be grouped
            together — order is saved to Supabase (products.sort_order), shared across
            everyone, not per-browser. */}
        <ProductSheet
          products={filtered}
          allProducts={products}
          categories={settings.productCategories}
          currencySymbol={settings.currencySymbol}
          onRename={renameProduct}
          onUpdate={updateProduct}
          onReorder={reorderProducts}
          onDelete={setDeleting}
          dragEnabled={sortBy === "manual"}
        />
      </div>

      {/* Delete confirmation stays a modal — destructive action */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600"><AlertTriangle className="h-5 w-5" /> حذف المنتج</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">هل أنت متأكد من حذف «{deleting?.name}»؟ لا يمكن التراجع.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleting(null)} className="rounded-xl font-bold">إلغاء</Button>
            <Button onClick={() => { if (deleting) { deleteProduct(deleting.id); toast.success("تم حذف المنتج"); setDeleting(null); } }} className="rounded-xl font-bold bg-rose-600 hover:bg-rose-700">حذف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
