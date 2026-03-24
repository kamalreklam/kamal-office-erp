"use client";

import { useState, useMemo, useEffect } from "react";
import { useDebounce } from "@/lib/use-debounce";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, Package, AlertTriangle, Plus, Pencil, Trash2, MessageCircle,
  Printer, Droplets, FileStack, Cable, Archive, ArrowUpDown, ChevronLeft, ChevronRight, Download,
  LayoutGrid, List,
} from "lucide-react";
import { ImageUpload } from "@/components/image-upload";
import { useStore } from "@/lib/store";
import { type Product, getLowStockProducts, formatCurrency } from "@/lib/data";
import { toast } from "sonner";
import { exportCSV } from "@/lib/export";
import { DateRangeExportButton, type DateRange } from "@/components/date-range-picker";

const categoryIcons: Record<string, typeof Package> = {
  "طابعة": Printer,
  "حبر": Droplets,
  "تونر": Archive,
  "ورق": FileStack,
  "ملحقات": Cable,
};

const emptyForm = {
  name: "",
  category: "طابعة",
  sku: "",
  description: "",
  price: 0,
  stock: 0,
  minStock: 0,
  unit: "قطعة",
  image: "",
};

export default function InventoryPage() {
  const { products, addProduct, updateProduct, deleteProduct, getProductImage, settings } = useStore();
  const categories = ["الكل", ...settings.productCategories];
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [activeCategory, setActiveCategory] = useState("الكل");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [sortBy, setSortBy] = useState("default");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const perPage = viewMode === "grid" ? 12 : 20;

  const filtered = useMemo(() => {
    const list = products.filter((p) => {
      const matchSearch =
        debouncedSearch === "" ||
        p.name.includes(debouncedSearch) ||
        p.sku.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        p.description.includes(debouncedSearch);
      const matchCategory = activeCategory === "الكل" || p.category === activeCategory;
      return matchSearch && matchCategory;
    });
    switch (sortBy) {
      case "price-asc": return [...list].sort((a, b) => a.price - b.price);
      case "price-desc": return [...list].sort((a, b) => b.price - a.price);
      case "stock-asc": return [...list].sort((a, b) => a.stock - b.stock);
      case "stock-desc": return [...list].sort((a, b) => b.stock - a.stock);
      case "name": return [...list].sort((a, b) => a.name.localeCompare(b.name, "ar"));
      default: return list;
    }
  }, [products, debouncedSearch, activeCategory, sortBy]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);
  const filterKey = `${search}|${activeCategory}|${sortBy}|${viewMode}`;
  useEffect(() => { setPage(1); }, [filterKey]);

  const lowStock = getLowStockProducts(products);

  function openAddDialog() {
    setEditingProduct(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  }

  function openEditDialog(product: Product) {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      sku: product.sku,
      description: product.description,
      price: product.price,
      stock: product.stock,
      minStock: product.minStock,
      unit: product.unit,
      image: getProductImage(product.id),
    });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!formData.name.trim()) {
      toast.error("يرجى إدخال اسم المنتج");
      return;
    }
    const { image, ...productData } = formData;
    if (editingProduct) {
      updateProduct(editingProduct.id, { ...productData, image } as Partial<Product> & { image?: string });
      toast.success("تم تحديث المنتج بنجاح");
    } else {
      addProduct({ ...productData, image } as Omit<Product, "id" | "createdAt"> & { image?: string });
      toast.success("تم إضافة المنتج بنجاح");
    }
    setDialogOpen(false);
  }

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

  function shareWhatsApp() {
    const lines = [
      `📦 *تقرير المخزون - ${settings.businessName}*`,
      `📅 التاريخ: ${new Date().toLocaleDateString("ar-SY")}`,
      "",
    ];
    if (lowStock.length > 0) {
      lines.push("⚠️ *منتجات بحاجة لإعادة تعبئة:*");
      lowStock.forEach((p) => {
        lines.push(`  • ${p.name}: ${p.stock} ${p.unit} (الحد الأدنى: ${p.minStock})`);
      });
      lines.push("");
    }
    lines.push(`📊 إجمالي المنتجات: ${products.length}`);
    lines.push(`⚠️ منتجات منخفضة: ${lowStock.length}`);
    const text = encodeURIComponent(lines.join("\n"));
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  function shareLowStockWhatsApp() {
    if (lowStock.length === 0) return;
    const lines = [
      `🔴 *تنبيه مخزون منخفض - ${settings.businessName}*`,
      `📅 ${new Date().toLocaleDateString("ar-SY")}`,
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
    <AppShell>
      <div className="space-y-8 page-enter">
        {/* Header */}
        <div className="animate-fade-in-up text-center">
          <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">المخزون</h1>
          <p className="mt-1.5 text-sm text-muted-foreground sm:mt-2 sm:text-base">
            إدارة ومتابعة جميع المنتجات ({products.length} منتج)
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
              exportCSV("inventory", ["الاسم", "الكود", "الفئة", "السعر", "المخزون", "الوحدة", "الحد الأدنى"],
                filtered.map((p) => [p.name, p.sku, p.category, String(p.price), String(p.stock), p.unit, String(p.minStock)])
              );
              toast.success("تم تصدير المخزون");
            }}>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">تصدير CSV</span>
            </Button>
            <DateRangeExportButton
              label="تصدير تقرير PDF"
              onExport={async (range: DateRange) => {
                const { createInventoryReport } = await import("@/lib/report-generators");
                const { exportReportPDF } = await import("@/lib/pdf");
                const doc = createInventoryReport(filtered, range, settings);
                await exportReportPDF(doc, "تقرير_المخزون", range);
                toast.success("تم تصدير تقرير المخزون");
              }}
            />
            <Button variant="outline" size="sm" className="gap-1.5" onClick={shareWhatsApp}>
              <MessageCircle className="h-5 w-5 text-green-600" />
              <span className="hidden sm:inline">مشاركة واتساب</span>
            </Button>
            <Button size="sm" className="gap-1.5" onClick={openAddDialog}>
              <Plus className="h-5 w-5" />
              إضافة منتج
            </Button>
          </div>
        </div>

        {/* Low stock banner */}
        {lowStock.length > 0 && (
          <Card className="border border-[var(--glass-border)] border-amber-200 bg-gradient-to-l from-amber-50/80 to-orange-50/40">
            <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-base font-bold text-amber-800">
                    {lowStock.length} منتجات بمخزون منخفض
                  </p>
                  <p className="text-sm text-amber-600">
                    {lowStock.slice(0, 3).map((p) => p.name).join("، ")}
                    {lowStock.length > 3 && ` و ${lowStock.length - 3} آخرين`}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-100"
                onClick={shareLowStockWhatsApp}
              >
                <MessageCircle className="h-4 w-4" />
                إرسال تنبيه
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Search & Sort */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم، الكود، أو الوصف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => v && setSortBy(v)}>
            <SelectTrigger className="w-[160px] gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="ترتيب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">الافتراضي</SelectItem>
              <SelectItem value="name">الاسم (أ-ي)</SelectItem>
              <SelectItem value="price-asc">السعر: الأقل</SelectItem>
              <SelectItem value="price-desc">السعر: الأعلى</SelectItem>
              <SelectItem value="stock-asc">المخزون: الأقل</SelectItem>
              <SelectItem value="stock-desc">المخزون: الأعلى</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex rounded-xl border border-[var(--glass-border)] overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex h-10 w-10 items-center justify-center transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-[var(--surface-1)] text-muted-foreground hover:bg-[var(--surface-2)]"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex h-10 w-10 items-center justify-center transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-[var(--surface-1)] text-muted-foreground hover:bg-[var(--surface-2)]"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            const count = cat === "الكل"
              ? products.length
              : products.filter((p) => p.category === cat).length;
            const Icon = categoryIcons[cat] || Package;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-3 text-[15px] font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-[var(--surface-1)] text-muted-foreground border border-[var(--glass-border)] hover:bg-[var(--surface-2)]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {cat}
                <span className={`mr-1 rounded-full px-1.5 py-0.5 text-xs ${
                  isActive ? "bg-[var(--surface-1)]/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Product Display */}
        {filtered.length === 0 ? (
          <Card className="border border-[var(--glass-border)] shadow-sm">
            <CardContent className="flex flex-col items-center py-16 text-muted-foreground">
              <Package className="mb-3 h-10 w-10 opacity-30" />
              <p className="text-base">لا توجد منتجات مطابقة</p>
            </CardContent>
          </Card>
        ) : viewMode === "list" ? (
          /* ===== LIST VIEW ===== */
          <Card className="border border-[var(--glass-border)] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--glass-border)] bg-[var(--surface-2)]">
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">#</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">المنتج</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">الفئة</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">السعر</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">المخزون</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">القيمة</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">الحالة</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((product, idx) => {
                    const isLow = product.stock <= product.minStock;
                    return (
                      <tr key={product.id} className={`border-b border-border/40 transition-colors hover:bg-[var(--surface-2)] ${isLow ? "bg-red-50/50" : ""}`}>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{(page - 1) * perPage + idx + 1}</td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-semibold text-foreground">{product.name}</p>
                            {product.sku && <p className="font-mono text-xs text-muted-foreground mt-0.5">{product.sku}</p>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="text-xs">{product.category}</Badge>
                        </td>
                        <td className="px-4 py-3 font-semibold text-primary">{formatCurrency(product.price)}</td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold ${isLow ? "text-red-600" : "text-foreground"}`}>
                            {product.stock}
                          </span>
                          <span className="text-xs text-muted-foreground mr-1">{product.unit}</span>
                        </td>
                        <td className="px-4 py-3 font-medium text-muted-foreground">
                          {formatCurrency(product.price * product.stock)}
                        </td>
                        <td className="px-4 py-3">
                          {isLow ? (
                            <Badge variant="destructive" className="gap-1 text-xs">
                              <AlertTriangle className="h-3 w-3" />
                              منخفض
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="status-badge status-badge--success text-xs">
                              متوفر
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openEditDialog(product)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[var(--surface-2)] hover:text-foreground"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => confirmDelete(product)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-[var(--surface-2)] border-t border-[var(--glass-border)]">
                    <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-muted-foreground">
                      الإجمالي ({filtered.length} منتج)
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-primary">
                      {formatCurrency(filtered.reduce((s, p) => s + p.price, 0))}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold">
                      {filtered.reduce((s, p) => s + p.stock, 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-primary">
                      {formatCurrency(filtered.reduce((s, p) => s + p.price * p.stock, 0))}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        ) : (
          /* ===== GRID VIEW ===== */
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4 stagger-list">
            {paged.map((product) => {
              const isLow = product.stock <= product.minStock;
              const img = getProductImage(product.id);
              return (
                <Card key={product.id} className={`group border border-[var(--glass-border)] shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 ${isLow ? "border-red-200" : ""}`}>
                  {/* Image Header */}
                  <div className="relative aspect-[3/2] w-full overflow-hidden rounded-t-xl bg-[var(--surface-2)]">
                    {img ? (
                      <img
                        src={img}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-16 w-16 text-muted-foreground/20" />
                      </div>
                    )}
                    {/* Status badge overlay */}
                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                      {isLow ? (
                        <Badge variant="destructive" className="gap-0.5 text-[10px] px-1.5 py-0.5 shadow-sm sm:gap-1 sm:text-xs sm:px-2.5 sm:py-0.5">
                          <AlertTriangle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          منخفض
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="status-badge status-badge--success text-[10px] px-1.5 py-0.5 shadow-sm backdrop-blur-sm sm:text-xs sm:px-2.5 sm:py-0.5">
                          متوفر
                        </Badge>
                      )}
                    </div>
                    {/* Category badge */}
                    <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 shadow-sm backdrop-blur-sm bg-[var(--surface-1)]/80 sm:text-xs sm:px-2.5 sm:py-0.5">{product.category}</Badge>
                    </div>
                  </div>

                  {/* Card Body */}
                  <CardContent className="p-3 sm:p-5">
                    <div className="mb-2 sm:mb-3">
                      <h3 className="text-sm font-bold text-foreground leading-snug sm:text-base">{product.name}</h3>
                      {product.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1 sm:mt-1 sm:text-sm sm:line-clamp-2">{product.description}</p>
                      )}
                      <p className="mt-1 font-mono text-[10px] text-muted-foreground sm:mt-1.5 sm:text-xs">{product.sku}</p>
                    </div>

                    {/* Price & Stock */}
                    <div className="flex items-center justify-between border-t border-[var(--glass-border)] pt-2 sm:pt-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground sm:text-xs">السعر</p>
                        <p className="text-sm font-extrabold text-primary sm:text-lg">{formatCurrency(product.price)}</p>
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] text-muted-foreground sm:text-xs">المخزون</p>
                        <p className={`text-sm font-extrabold sm:text-lg ${isLow ? "text-red-600" : "text-foreground"}`}>
                          {product.stock} <span className="text-xs font-medium text-muted-foreground sm:text-sm">{product.unit}</span>
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-2 flex gap-1 border-t border-[var(--glass-border)] pt-2 sm:mt-3 sm:gap-2 sm:pt-3">
                      <button
                        onClick={() => openEditDialog(product)}
                        className="flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-[var(--surface-2)] hover:text-foreground sm:gap-1.5 sm:py-2.5 sm:text-sm"
                      >
                        <Pencil className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        تعديل
                      </button>
                      <button
                        onClick={() => confirmDelete(product)}
                        className="flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 sm:gap-1.5 sm:py-2.5 sm:text-sm"
                      >
                        <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        حذف
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--glass-border)] text-muted-foreground transition-colors hover:bg-[var(--surface-2)] disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="text-sm text-muted-foreground">
              صفحة {page} من {totalPages} ({filtered.length} منتج)
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--glass-border)] text-muted-foreground transition-colors hover:bg-[var(--surface-2)] disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "تعديل المنتج" : "إضافة منتج جديد"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-2">
            {/* Image upload */}
            <div className="flex items-center gap-4">
              <ImageUpload
                value={formData.image}
                onChange={(img) => setFormData({ ...formData, image: img })}
                size="lg"
                label="صورة المنتج"
              />
              <div className="flex-1 grid gap-3">
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">اسم المنتج</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: HP LaserJet Pro M404dn"
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">الكود (SKU)</label>
                  <Input
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="HP-LJ-M404"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">الفئة</label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => v && setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {settings.productCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">الوحدة</label>
                <Select
                  value={formData.unit}
                  onValueChange={(v) => v && setFormData({ ...formData, unit: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="قطعة">قطعة</SelectItem>
                    <SelectItem value="قنينة">قنينة</SelectItem>
                    <SelectItem value="عبوة">عبوة</SelectItem>
                    <SelectItem value="مجموعة">مجموعة</SelectItem>
                    <SelectItem value="رزمة">رزمة</SelectItem>
                    <SelectItem value="خرطوشة">خرطوشة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium">الوصف</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="وصف مختصر للمنتج"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">السعر ($)</label>
                <Input
                  type="number" min={0} step={0.5} value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">الكمية</label>
                <Input
                  type="number" min={0} value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">الحد الأدنى</label>
                <Input
                  type="number" min={0} value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave}>{editingProduct ? "حفظ التعديلات" : "إضافة المنتج"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </AppShell>
  );
}
