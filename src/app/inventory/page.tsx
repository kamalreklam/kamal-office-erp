"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/lib/use-debounce";
import { ResponsiveShell } from "@/components/responsive-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, Package, AlertTriangle, Plus, Pencil, Trash2, MessageCircle,
  ArrowUpDown, Download, History, LayoutGrid, List, ImageIcon, Upload,
} from "lucide-react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { type Product, getLowStockProducts, formatCurrency } from "@/lib/data";
import { toast } from "sonner";
import { exportCSV } from "@/lib/export";
import { shareAsImage, formatProductWhatsAppText, shareViaWhatsApp } from "@/lib/share";
import { DateRangeExportButton, type DateRange } from "@/components/date-range-picker";
import { TablePageSkeleton } from "@/components/skeletons";
import { FadeInView } from "@/components/fade-in-view";
import { InlineEdit } from "@/components/inline-edit";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { MobileInventory } from "@/components/mobile/mobile-inventory";
import { MobileShell } from "@/components/mobile/mobile-shell";

export default function InventoryPage() {
  const isMobile = useIsMobile();
  const { connectionStatus } = useStore();

  if (connectionStatus === "loading") {
    return <ResponsiveShell><TablePageSkeleton /></ResponsiveShell>;
  }

  if (isMobile) {
    return <MobileShell><MobileInventory /></MobileShell>;
  }

  return <DesktopInventory />;
}

function DesktopInventory() {
  const router = useRouter();
  const { products, invoices, addProduct, updateProduct, deleteProduct, getProductImage, settings } = useStore();
  const categories = ["الكل", ...Array.from(new Set(products.map(p => p.category))).sort()];
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [activeCategory, setActiveCategory] = useState("الكل");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [sortBy, setSortBy] = useState("default");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [csvPreview, setCsvPreview] = useState<{ name: string; category: string; price: number; costPrice: number; stock: number; minStock: number; unit: string; action: "جديد" | "تحديث"; existingId?: string }[]>([]);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const list = products.filter((p) => {
      const q = debouncedSearch.toLowerCase();
      const matchSearch =
        debouncedSearch === "" ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);
      const matchCategory = activeCategory === "الكل" || p.category === activeCategory;
      return matchSearch && matchCategory;
    });
    switch (sortBy) {
      case "price-asc": return [...list].sort((a, b) => a.price - b.price);
      case "price-desc": return [...list].sort((a, b) => b.price - a.price);
      case "stock-asc": return [...list].sort((a, b) => a.stock - b.stock);
      case "stock-desc": return [...list].sort((a, b) => b.stock - a.stock);
      case "name": return [...list].sort((a, b) => a.name.localeCompare(b.name, "ar"));
      default: return [...list].sort((a, b) => a.category.localeCompare(b.category, "ar"));
    }
  }, [products, debouncedSearch, activeCategory, sortBy]);

  const paged = filtered; // Show all items without pagination
  const lowStock = getLowStockProducts(products);

  function confirmDelete(product: Product) {
    setDeletingProduct(product);
    setDeleteDialogOpen(true);
  }

  function handleDelete() {
    if (!deletingProduct) return;
    deleteProduct(deletingProduct.id);
    toast.success("تم حذف المنتج");
    setDeleteDialogOpen(false);
    setDeletingProduct(null);
  }

  function handleCsvFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
      if (lines.length < 2) { toast.error("الملف فارغ أو لا يحتوي على بيانات"); return; }
      const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
      const nameIdx = headers.indexOf("اسم المنتج") !== -1 ? headers.indexOf("اسم المنتج") : headers.indexOf("name");
      const catIdx = headers.indexOf("الفئة") !== -1 ? headers.indexOf("الفئة") : headers.indexOf("category");
      const priceIdx = headers.indexOf("سعر البيع") !== -1 ? headers.indexOf("سعر البيع") : headers.indexOf("sellingprice");
      const costIdx = headers.indexOf("سعر التكلفة") !== -1 ? headers.indexOf("سعر التكلفة") : headers.indexOf("costprice");
      const stockIdx = headers.indexOf("المخزون") !== -1 ? headers.indexOf("المخزون") : headers.indexOf("stock");
      const minIdx = headers.indexOf("الحد الأدنى") !== -1 ? headers.indexOf("الحد الأدنى") : headers.indexOf("minstock");
      const unitIdx = headers.indexOf("الوحدة") !== -1 ? headers.indexOf("الوحدة") : headers.indexOf("unit");
      if (nameIdx === -1) { toast.error("لم يتم العثور على عمود اسم المنتج"); return; }
      const rows = lines.slice(1).map((line) => {
        const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        const name = cols[nameIdx] || "";
        const category = catIdx !== -1 ? cols[catIdx] || "عام" : "عام";
        const price = priceIdx !== -1 ? parseFloat(cols[priceIdx]) || 0 : 0;
        const costPrice = costIdx !== -1 ? parseFloat(cols[costIdx]) || 0 : 0;
        const stock = stockIdx !== -1 ? parseInt(cols[stockIdx]) || 0 : 0;
        const minStock = minIdx !== -1 ? parseInt(cols[minIdx]) || 0 : 0;
        const unit = unitIdx !== -1 ? cols[unitIdx] || "قطعة" : "قطعة";
        const existing = products.find((p) => p.name.trim() === name.trim());
        return { name, category, price, costPrice, stock, minStock, unit, action: (existing ? "تحديث" : "جديد") as "جديد" | "تحديث", existingId: existing?.id };
      }).filter((r) => r.name !== "");
      if (rows.length === 0) { toast.error("لا توجد صفوف صالحة في الملف"); return; }
      setCsvPreview(rows);
      setCsvModalOpen(true);
    };
    reader.readAsText(file, "UTF-8");
  }

  function confirmCsvImport() {
    let count = 0;
    csvPreview.forEach((row) => {
      if (row.action === "تحديث" && row.existingId) {
        updateProduct(row.existingId, { price: row.price, stock: row.stock, category: row.category });
      } else {
        addProduct({ name: row.name, category: row.category, sku: "", description: "", price: row.price, stock: row.stock, minStock: 0, unit: row.unit || "قطعة" });
      }
      count++;
    });
    setCsvModalOpen(false);
    setCsvPreview([]);
    toast.success(`تم استيراد ${count} منتج`);
  }

  function shareWhatsApp() {
    const totalValue = filtered.reduce((s, p) => s + p.price * p.stock, 0);
    const totalStock = filtered.reduce((s, p) => s + p.stock, 0);
    const lines = [
      `📦 *تقرير المخزون - ${settings.businessName}*`,
      `📅 التاريخ: ${new Date().toLocaleDateString("en-GB")}`,
      "",
      `📊 *الملخص:*`,
      `  • عدد المنتجات: ${filtered.length}`,
      `  • إجمالي المخزون: ${totalStock} وحدة`,
      `  • قيمة المخزون: ${settings.currencySymbol}${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      "",
      `📋 *قائمة المنتجات:*`,
    ];
    filtered.forEach((p, i) => {
      const val = p.price * p.stock;
      const warn = p.stock <= p.minStock ? " ⚠️" : "";
      lines.push(`${i + 1}. ${p.name}${warn}`);
      lines.push(`   الكمية: ${p.stock} ${p.unit} | السعر: ${settings.currencySymbol}${p.price} | القيمة: ${settings.currencySymbol}${val.toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
    });
    if (lowStock.length > 0) {
      lines.push("");
      lines.push(`⚠️ *منتجات منخفضة المخزون (${lowStock.length}):*`);
      lowStock.forEach((p) => {
        lines.push(`  🔴 ${p.name}: ${p.stock} ${p.unit} (الحد الأدنى: ${p.minStock})`);
      });
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
  }

  function shareLowStockWhatsApp() {
    if (lowStock.length === 0) return;
    const lines = [
      `🔴 *تنبيه مخزون منخفض - ${settings.businessName}*`,
      `📅 ${new Date().toLocaleDateString("en-GB")}`,
      "",
      "*المنتجات التالية بحاجة لإعادة طلب:*",
    ];
    lowStock.forEach((p) => {
      lines.push(`• ${p.name} (${p.sku})`);
      lines.push(`  الكمية: ${p.stock} ${p.unit} | الحد الأدنى: ${p.minStock}`);
      lines.push(`  السعر: ${formatCurrency(p.price)}`);
    });
    const text = encodeURIComponent(lines.join("\n"));
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  return (
    <ResponsiveShell>
      <div className="space-y-6">
        
        {/* Banner Header Widget */}
        <div className="relative overflow-hidden rounded-[28px] bg-white border border-[var(--glass-border)] p-6 shadow-sm hidden lg:block">
          {/* Subtle CMYK theme glows in background */}
          <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-cyan-400/10 blur-[60px] pointer-events-none" />
          <div className="absolute left-10 -bottom-20 h-40 w-40 rounded-full bg-pink-400/10 blur-[60px] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3.5 py-1 text-xs font-bold text-indigo-700 border border-indigo-100">
                📦 مستودع الأحبار والأصناف
              </span>
              <h1 className="text-2xl font-black text-[var(--text-primary)] mt-3">المخزون العام</h1>
              <p className="text-[13px] text-[var(--text-muted)] mt-1 font-medium">مراقبة مستويات المنتجات، تنبيهات الكميات المنخفضة، وإدارة أسعار البيع والشراء</p>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" className="gap-1.5 h-10 px-4 rounded-xl border-[var(--border-default)] hover:bg-[var(--surface-2)] text-[13px] font-bold" onClick={() => csvInputRef.current?.click()}>
                <Upload className="h-4 w-4" />
                <span>استيراد CSV</span>
              </Button>
              <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvFile(f); e.target.value = ""; }} />
              <Button variant="outline" size="sm" className="gap-1.5 h-10 px-4 rounded-xl border-[var(--border-default)] hover:bg-[var(--surface-2)] text-[13px] font-bold" onClick={() => {
                exportCSV("inventory", ["الاسم", "الكود", "الفئة", "السعر", "المخزون", "الوحدة", "الحد الأدنى"],
                  filtered.map((p) => [p.name, p.sku, p.category, String(p.price), String(p.stock), p.unit, String(p.minStock)])
                );
                toast.success("تم تصدير المخزون");
              }}>
                <Download className="h-4 w-4" />
                <span>تصدير CSV</span>
              </Button>
              <DateRangeExportButton
                label="تصدير تقرير PDF"
                onExport={async (range: DateRange) => {
                  try {
                    const { exportInventoryReportPDF } = await import("@/lib/pdf");
                    await exportInventoryReportPDF(filtered, range, settings);
                    toast.success("تم تصدير المخزون");
                  } catch {
                    toast.error("فشل تصدير التقرير");
                  }
                }}
              />
              <Button variant="outline" size="sm" className="gap-1.5 h-10 px-4 rounded-xl border-[var(--border-default)] hover:bg-[var(--surface-2)] text-[13px] font-bold" onClick={shareWhatsApp}>
                <MessageCircle className="h-4.5 w-4.5 text-emerald-600" />
                <span>مشاركة واتساب</span>
              </Button>
              <Button size="sm" className="gap-1.5 h-10 px-5 rounded-xl text-[13px] font-bold animate-pulse" onClick={() => router.push("/inventory/new")}>
                <Plus className="h-4.5 w-4.5" />
                <span>إضافة منتج</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Low stock banner */}
        {lowStock.length > 0 && (
          <div className="relative overflow-hidden rounded-[24px] border border-amber-200 bg-gradient-to-r from-amber-50/90 to-amber-50/20 p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 border border-amber-200 shadow-sm text-amber-700">
                  <AlertTriangle className="h-6 w-6 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-[14px] font-black text-amber-900">
                    تنبيه: يوجد {lowStock.length} منتجات بمخزون منخفض!
                  </h3>
                  <p className="text-xs font-bold text-amber-700 mt-0.5">
                    {lowStock.slice(0, 3).map((p) => p.name).join("، ")}
                    {lowStock.length > 3 && ` و ${lowStock.length - 3} آخرين`}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-9 rounded-xl border-amber-200 bg-white hover:bg-amber-50 text-amber-800 text-xs font-bold shrink-0 shadow-sm"
                onClick={shareLowStockWhatsApp}
              >
                <MessageCircle className="h-4.5 w-4.5 text-emerald-600" />
                <span>إرسال تنبيه واتساب</span>
              </Button>
            </div>
          </div>
        )}

        {/* Search & Sort */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم، الكود، أو الوصف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10 rounded-xl h-11 border-[var(--border-default)] focus:border-[var(--brand-primary)] bg-white shadow-sm text-xs"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => v && setSortBy(v)}>
            <SelectTrigger className="w-[170px] h-11 rounded-xl border-[var(--border-default)] bg-white text-xs font-bold shadow-sm">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground ml-1" />
              <SelectValue placeholder="ترتيب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">الترتيب الافتراضي</SelectItem>
              <SelectItem value="name">الاسم (أ-ي)</SelectItem>
              <SelectItem value="price-asc">السعر: الأقل</SelectItem>
              <SelectItem value="price-desc">السعر: الأعلى</SelectItem>
              <SelectItem value="stock-asc">المخزون: الأقل</SelectItem>
              <SelectItem value="stock-desc">المخزون: الأعلى</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex rounded-xl border border-[var(--border-default)] overflow-hidden bg-white p-0.5 shadow-sm">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-[var(--surface-2)]"}`}
            >
              <LayoutGrid className="h-4.5 w-4.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-[var(--surface-2)]"}`}
            >
              <List className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            const count = cat === "الكل"
              ? products.length
              : products.filter((p) => p.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition-all border ${
                  isActive
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-white text-[var(--text-secondary)] border-[var(--glass-border)] hover:bg-gray-50"
                }`}
              >
                <span>{cat}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                  isActive ? "bg-white/20 text-white" : "bg-gray-100 text-[var(--text-muted)]"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Product Display */}
        {filtered.length === 0 ? (
          <div className="m3-card relative overflow-hidden bg-white border border-[var(--glass-border)] rounded-[24px] p-16 text-center">
            <Package className="mx-auto mb-4 h-14 w-14 text-gray-300 opacity-60" />
            <p className="text-sm font-bold text-[var(--text-muted)]">لا توجد منتجات مطابقة للبحث الحالي.</p>
          </div>
        ) : viewMode === "list" ? (
          /* ===== LIST VIEW ===== */
          <FadeInView>
          <div className="m3-card relative overflow-hidden bg-white shadow-sm border border-[var(--glass-border)] rounded-[24px] p-0 hover:shadow-md transition-all duration-300">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-default)] bg-[var(--surface-2)] text-[12px] font-bold text-[var(--text-muted)]">
                    <th className="p-4 w-10">#</th>
                    <th className="p-4">المنتج</th>
                    <th className="p-4">التوافق</th>
                    <th className="p-4">الفئة</th>
                    <th className="p-4">السعر</th>
                    <th className="p-4 w-[160px]">المخزون والحد الأدنى</th>
                    <th className="p-4">إجمالي القيمة</th>
                    <th className="p-4 text-center">الحالة</th>
                    <th className="p-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-[13px]">
                  {paged.map((product, idx) => {
                    const isOutOfStock = product.stock === 0;
                    const isLow = product.stock <= product.minStock;
                    const statusText = isOutOfStock ? "نفذ المخزون" : isLow ? "مخزون منخفض" : "متوفر";
                    const statusColorClass = isOutOfStock
                      ? "bg-red-50 text-red-700 border-red-200"
                      : isLow
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200";

                    // Custom compatibility parser
                    const text = `${product.name} ${product.description || ""}`.toLowerCase();
                    const compats = [];
                    if (text.includes("epson") || text.includes("ep ")) compats.push("Epson");
                    if (text.includes("canon") || text.includes("cn ") || text.includes("pixma") || text.includes("maxify")) compats.push("Canon");
                    if (text.includes("hp")) compats.push("HP");
                    if (text.includes("l8050")) compats.push("L8050");
                    if (text.includes("c5790") || text.includes("c5890")) compats.push("C5790/C5890");
                    if (text.includes("c21000")) compats.push("C21000");
                    if (compats.length === 0) compats.push("عام");

                    return (
                      <tr key={product.id} className={`hover:bg-[var(--surface-2)]/40 transition-colors ${isOutOfStock ? "bg-red-50/10" : isLow ? "bg-amber-50/10" : ""}`}>
                        <td className="p-4 text-muted-foreground font-mono">{idx + 1}</td>
                        <td className="p-4">
                          <div className="max-w-[280px]">
                            <p className="font-bold text-[var(--text-primary)] leading-tight">{product.name}</p>
                            {product.sku && <p className="font-mono text-[10px] text-[var(--text-muted)] mt-1">{product.sku}</p>}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {compats.map((c) => (
                              <span key={c} className="inline-flex items-center rounded-full bg-cyan-50/50 text-cyan-700 border border-cyan-100 px-2 py-0.5 text-[10px] font-bold">
                                {c}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center rounded-full bg-indigo-50/40 text-indigo-700 border border-indigo-100/50 px-2.5 py-0.5 text-[10px] font-bold">
                            {product.category}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-[var(--brand-primary)]">
                          <InlineEdit
                            value={product.price}
                            type="currency"
                            format={formatCurrency}
                            onSave={(v) => updateProduct(product.id, { price: v })}
                          />
                        </td>
                        <td className="p-4">
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs">
                              <span className={`font-bold font-mono ${isLow ? "text-red-600 font-black" : "text-[var(--text-primary)]"}`}>
                                {product.stock} {product.unit}
                              </span>
                              <span className="text-[var(--text-muted)] text-[10px] font-medium">الحد: {product.minStock}</span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isOutOfStock ? "bg-red-500" : isLow ? "bg-amber-500" : "bg-emerald-500"
                                }`}
                                style={{ width: `${Math.min(100, (product.stock / Math.max(product.minStock * 3, 10)) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-bold text-[var(--text-secondary)] font-mono">
                          {formatCurrency(product.price * product.stock)}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full border ${statusColorClass}`}>
                            {isOutOfStock || isLow ? <AlertTriangle className="h-3 w-3" /> : null}
                            {statusText}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <Link
                              href={`/inventory/${product.id}/history`}
                              className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--text-muted)] transition-colors hover:bg-indigo-50 hover:text-indigo-600 border border-transparent hover:border-indigo-100"
                              title="سجل المبيعات"
                            >
                              <History className="h-4 w-4" />
                            </Link>
                            <button
                              onClick={() => {
                                shareViaWhatsApp(formatProductWhatsAppText(product, settings));
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-xl text-green-600 transition-colors hover:bg-green-50 hover:border-green-100 border border-transparent"
                              title="مشاركة واتساب"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </button>
                            <Link
                              href={`/inventory/${product.id}/edit`}
                              className="flex h-8 w-8 items-center justify-center rounded-xl text-indigo-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 border border-transparent hover:border-indigo-100"
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                            <button
                              onClick={() => confirmDelete(product)}
                              className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--text-muted)] transition-colors hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-100"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-[var(--surface-2)] border-t border-[var(--border-default)] font-bold text-[13px]">
                    <td colSpan={3} className="p-4 text-muted-foreground">
                      إجمالي الفرز الحالي ({filtered.length} منتج)
                    </td>
                    <td />
                    <td className="p-4 text-[var(--brand-primary)] font-mono">
                      {formatCurrency(filtered.reduce((s, p) => s + p.price, 0))}
                    </td>
                    <td className="p-4 font-mono">
                      {filtered.reduce((s, p) => s + p.stock, 0).toLocaleString("en-US")} وحدة
                    </td>
                    <td className="p-4 text-[var(--brand-primary)] font-mono">
                      {formatCurrency(filtered.reduce((s, p) => s + p.price * p.stock, 0))}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          </FadeInView>
        ) : (
          /* ===== GRID VIEW ===== */
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {paged.map((product) => {
              const isOutOfStock = product.stock === 0;
              const isLow = product.stock <= product.minStock;
              const img = getProductImage(product.id);
              const statusText = isOutOfStock ? "نفذ المخزون" : isLow ? "مخزون منخفض" : "متوفر";
              const statusColorClass = isOutOfStock
                ? "bg-red-50 text-red-700 border-red-200"
                : isLow
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200";

              // Compatibility Tags Parser
              const text = `${product.name} ${product.description || ""}`.toLowerCase();
              const compats = [];
              if (text.includes("epson") || text.includes("ep ")) compats.push("Epson");
              if (text.includes("canon") || text.includes("cn ") || text.includes("pixma") || text.includes("maxify")) compats.push("Canon");
              if (text.includes("hp")) compats.push("HP");
              if (text.includes("l8050")) compats.push("L8050");
              if (text.includes("c5790") || text.includes("c5890")) compats.push("C5790/C5890");
              if (text.includes("c21000")) compats.push("C21000");
              if (compats.length === 0) compats.push("عام");

              return (
                <div id={`product-card-${product.id}`} key={product.id} className="m3-card relative flex flex-col justify-between overflow-hidden bg-white shadow-sm border border-[var(--glass-border)] rounded-[24px] p-5 hover:shadow-md transition-all duration-300">
                  <div>
                    {/* Status and Category badges */}
                    <div className="flex justify-between items-center gap-2 mb-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full border ${statusColorClass}`}>
                        {statusText}
                      </span>
                      <span className="text-[10px] font-bold bg-indigo-50/50 text-indigo-700 px-2 py-0.5 rounded-full">
                        {product.category}
                      </span>
                    </div>

                    {/* Image Header */}
                    <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl bg-[var(--surface-2)] border border-gray-100 mb-4 flex items-center justify-center">
                      {img ? (
                        <img
                          src={img}
                          alt={product.name}
                          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="h-10 w-10 text-muted-foreground/25" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="mb-4">
                      <h3 className="text-sm font-bold text-[var(--text-primary)] leading-snug mb-1 line-clamp-2 min-h-[40px]">{product.name}</h3>
                      {product.sku && (
                        <p className="font-mono text-[10px] text-[var(--text-muted)] bg-gray-50 px-2.5 py-0.5 rounded inline-block">
                          {product.sku}
                        </p>
                      )}
                    </div>

                    {/* Compatibility tags */}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {compats.map((c) => (
                        <span key={c} className="text-[9px] py-0.5 px-2 bg-cyan-50/50 text-cyan-700 border border-cyan-100 rounded-full font-bold">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    {/* Stock level bar */}
                    <div className="space-y-1.5 mb-4">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[var(--text-muted)] font-medium">مستوى المخزون:</span>
                        <span className={`font-black font-mono ${isLow ? "text-red-600" : "text-[var(--text-primary)]"}`}>
                          {product.stock} / {product.minStock} {product.unit}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isOutOfStock ? "bg-red-500" : isLow ? "bg-amber-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(100, (product.stock / Math.max(product.minStock * 3, 10)) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Price & Stock info */}
                    <div className="flex items-center justify-between border-t border-gray-50 pt-3">
                      <div>
                        <p className="text-[10px] text-[var(--text-muted)] mb-0.5 font-medium">السعر</p>
                        <p className="text-base font-extrabold text-[var(--brand-primary)] font-mono">{formatCurrency(product.price)}</p>
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] text-[var(--text-muted)] mb-0.5 font-medium">إجمالي القيمة</p>
                        <p className="text-xs font-bold text-[var(--text-secondary)] font-mono">{formatCurrency(product.price * product.stock)}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex gap-1.5 border-t border-gray-50 pt-3 flex-wrap">
                      <Link
                        href={`/inventory/${product.id}/history`}
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 transition-colors keep-capture"
                        title="سجل المبيعات"
                      >
                        <History className="h-4.5 w-4.5" />
                      </Link>
                      <button
                        onClick={() => shareViaWhatsApp(formatProductWhatsAppText(product, settings))}
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-green-600 bg-green-50/50 hover:bg-green-50 transition-colors keep-capture"
                        title="مشاركة واتساب"
                      >
                        <MessageCircle className="h-4.5 w-4.5" />
                      </button>
                      <button
                        onClick={() => {
                          toast.promise(shareAsImage(`product-card-${product.id}`, `منتج_${product.name}`), {
                            loading: 'جاري تصدير صورة المنتج...',
                            success: 'تم التصدير بنجاح',
                            error: 'فشل التصدير'
                          });
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-cyan-600 bg-cyan-50/50 hover:bg-cyan-50 transition-colors keep-capture"
                        title="حفظ كصورة"
                      >
                        <ImageIcon className="h-4.5 w-4.5" />
                      </button>
                      <Link
                        href={`/inventory/${product.id}/edit`}
                        className="flex flex-1 items-center justify-center gap-1 rounded-xl py-2 px-3 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-colors keep-capture"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        تعديل
                      </Link>
                      <button
                        onClick={() => confirmDelete(product)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-bold text-red-600 bg-red-50/50 hover:bg-red-50 hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Item count */}
        <div className="text-center pt-2">
          <span className="text-sm text-muted-foreground">{filtered.length} منتج</span>
        </div>
      </div>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-red-600">حذف المنتج</DialogTitle>
          </DialogHeader>
          <p className="text-base text-muted-foreground">
            هل أنت متأكد من حذف &quot;{deletingProduct?.name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
            <Button variant="destructive" onClick={handleDelete}>حذف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Preview Modal */}
      <Dialog open={csvModalOpen} onOpenChange={setCsvModalOpen}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>معاينة استيراد CSV</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{csvPreview.length} منتج سيتم معالجته</p>
          <div className="max-h-80 overflow-y-auto rounded-xl border border-[var(--border-default)]">
            <table className="w-full text-right text-xs">
              <thead className="sticky top-0 bg-[var(--surface-2)]">
                <tr className="border-b border-[var(--border-default)] font-bold text-[var(--text-muted)]">
                  <th className="p-3">الاسم</th>
                  <th className="p-3">الفئة</th>
                  <th className="p-3">سعر البيع</th>
                  <th className="p-3">المخزون</th>
                  <th className="p-3 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {csvPreview.map((row, i) => (
                  <tr key={i} className="hover:bg-[var(--surface-2)]/40">
                    <td className="p-3 font-medium">{row.name}</td>
                    <td className="p-3 text-[var(--text-muted)]">{row.category}</td>
                    <td className="p-3 font-mono">{row.price}</td>
                    <td className="p-3 font-mono">{row.stock}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${row.action === "جديد" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                        {row.action}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCsvModalOpen(false)}>إلغاء</Button>
            <Button onClick={confirmCsvImport}>تأكيد الاستيراد</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </ResponsiveShell>
  );
}
