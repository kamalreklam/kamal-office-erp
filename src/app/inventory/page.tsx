"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, Package, AlertTriangle, Plus, Pencil, Trash2, MessageCircle,
  Printer, Droplets, FileStack, Cable, Archive,
} from "lucide-react";
import { ImageUpload } from "@/components/image-upload";
import { useStore } from "@/lib/store";
import { type Product, getLowStockProducts, formatCurrency } from "@/lib/data";
import { toast } from "sonner";

const categories = [
  { value: "الكل", label: "الكل", icon: Package },
  { value: "طابعة", label: "طابعات", icon: Printer },
  { value: "حبر", label: "أحبار", icon: Droplets },
  { value: "تونر", label: "تونر", icon: Archive },
  { value: "ورق", label: "ورق", icon: FileStack },
  { value: "ملحقات", label: "ملحقات", icon: Cable },
] as const;

const emptyForm = {
  name: "",
  category: "طابعة" as Product["category"],
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
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("الكل");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        search === "" ||
        p.name.includes(search) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        p.description.includes(search);
      const matchCategory = activeCategory === "الكل" || p.category === activeCategory;
      return matchSearch && matchCategory;
    });
  }, [products, search, activeCategory]);

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
      <div className="space-y-6 page-enter">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up">
          <div>
            <h1 className="text-2xl font-bold text-foreground">المخزون</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              إدارة ومتابعة جميع المنتجات ({products.length} منتج)
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={shareWhatsApp}>
              <MessageCircle className="h-4 w-4 text-green-600" />
              <span className="hidden sm:inline">مشاركة واتساب</span>
            </Button>
            <Button size="sm" className="gap-1.5" onClick={openAddDialog}>
              <Plus className="h-4 w-4" />
              إضافة منتج
            </Button>
          </div>
        </div>

        {/* Low stock banner */}
        {lowStock.length > 0 && (
          <Card className="border-amber-200 bg-gradient-to-l from-amber-50/80 to-orange-50/40">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-800">
                    {lowStock.length} منتجات بمخزون منخفض
                  </p>
                  <p className="text-xs text-amber-600">
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

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم، الكود، أو الوصف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.value;
            const count = cat.value === "الكل"
              ? products.length
              : products.filter((p) => p.category === cat.value).length;
            return (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-white text-muted-foreground border border-border hover:bg-accent"
                }`}
              >
                <cat.icon className="h-4 w-4" />
                {cat.label}
                <span className={`mr-1 rounded-full px-1.5 py-0.5 text-[11px] ${
                  isActive ? "bg-white/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Desktop Table */}
        <Card className="hidden border shadow-sm md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-right font-bold w-12"></TableHead>
                <TableHead className="text-right font-bold">المنتج</TableHead>
                <TableHead className="text-right font-bold">الفئة</TableHead>
                <TableHead className="text-right font-bold">الكود</TableHead>
                <TableHead className="text-right font-bold">السعر</TableHead>
                <TableHead className="text-right font-bold">المخزون</TableHead>
                <TableHead className="text-right font-bold">الحالة</TableHead>
                <TableHead className="text-right font-bold">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-16 text-center text-muted-foreground">
                    <Package className="mx-auto mb-3 h-10 w-10 opacity-30" />
                    <p className="text-sm">لا توجد منتجات مطابقة</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((product) => {
                  const isLow = product.stock <= product.minStock;
                  const img = getProductImage(product.id);
                  return (
                    <TableRow key={product.id} className="transition-colors hover:bg-accent/30">
                      <TableCell className="py-3">
                        {img ? (
                          <Image
                            src={img}
                            alt={product.name}
                            width={40}
                            height={40}
                            className="h-10 w-10 rounded-lg object-cover border border-border"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
                            <Package className="h-5 w-5" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        <div>
                          <p className="font-medium text-foreground">{product.name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{product.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">{product.category}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{product.sku}</TableCell>
                      <TableCell className="font-bold">{formatCurrency(product.price)}</TableCell>
                      <TableCell>
                        <span className={`font-bold ${isLow ? "text-red-600" : "text-foreground"}`}>
                          {product.stock}
                        </span>{" "}
                        <span className="text-xs text-muted-foreground">{product.unit}</span>
                      </TableCell>
                      <TableCell>
                        {isLow ? (
                          <Badge variant="destructive" className="gap-1 text-xs">
                            <AlertTriangle className="h-3 w-3" />
                            منخفض
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-xs text-emerald-700">
                            متوفر
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <button onClick={() => openEditDialog(product)} className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => confirmDelete(product)} className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Mobile Cards */}
        <div className="space-y-3 md:hidden stagger-list">
          {filtered.length === 0 ? (
            <Card className="border shadow-sm">
              <CardContent className="flex flex-col items-center py-16 text-muted-foreground">
                <Package className="mb-3 h-10 w-10 opacity-30" />
                <p className="text-sm">لا توجد منتجات مطابقة</p>
              </CardContent>
            </Card>
          ) : (
            filtered.map((product) => {
              const isLow = product.stock <= product.minStock;
              const img = getProductImage(product.id);
              return (
                <Card key={product.id} className={`border shadow-sm transition-all hover:shadow-md ${isLow ? "border-red-200" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      {img ? (
                        <Image
                          src={img}
                          alt={product.name}
                          width={56}
                          height={56}
                          className="h-14 w-14 shrink-0 rounded-xl object-cover border border-border"
                        />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground">
                          <Package className="h-6 w-6" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-foreground truncate">{product.name}</h3>
                            <p className="mt-0.5 text-xs text-muted-foreground truncate">{product.description}</p>
                          </div>
                          {isLow && (
                            <Badge variant="destructive" className="shrink-0 gap-1 text-[10px]">
                              <AlertTriangle className="h-3 w-3" />
                              منخفض
                            </Badge>
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          <Badge variant="secondary" className="text-[10px]">{product.category}</Badge>
                          <span className="text-muted-foreground">{product.sku}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-xs text-muted-foreground">السعر: </span>
                          <span className="font-bold">{formatCurrency(product.price)}</span>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">المخزون: </span>
                          <span className={`font-bold ${isLow ? "text-red-600" : "text-foreground"}`}>
                            {product.stock} {product.unit}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openEditDialog(product)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => confirmDelete(product)} className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "تعديل المنتج" : "إضافة منتج جديد"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 py-2">
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
                  onValueChange={(v) => v && setFormData({ ...formData, category: v as Product["category"] })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="طابعة">طابعة</SelectItem>
                    <SelectItem value="حبر">حبر</SelectItem>
                    <SelectItem value="تونر">تونر</SelectItem>
                    <SelectItem value="ورق">ورق</SelectItem>
                    <SelectItem value="ملحقات">ملحقات</SelectItem>
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
          <p className="text-sm text-muted-foreground">
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
