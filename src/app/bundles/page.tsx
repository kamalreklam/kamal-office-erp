"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Layers, Plus, Pencil, Trash2, Package, X } from "lucide-react";
import { useStore, type BundleItem } from "@/lib/store";
import { formatCurrency } from "@/lib/data";
import { toast } from "sonner";

export default function BundlesPage() {
  const { bundles, products, addBundle, updateBundle, deleteBundle } = useStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<(typeof bundles)[0] | null>(null);
  const [deletingBundle, setDeletingBundle] = useState<(typeof bundles)[0] | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [discount, setDiscount] = useState(0);
  const [items, setItems] = useState<BundleItem[]>([]);

  function openAddDialog() {
    setEditingBundle(null);
    setName("");
    setDescription("");
    setDiscount(0);
    setItems([]);
    setDialogOpen(true);
  }

  function openEditDialog(bundle: (typeof bundles)[0]) {
    setEditingBundle(bundle);
    setName(bundle.name);
    setDescription(bundle.description);
    setDiscount(bundle.discount);
    setItems([...bundle.items]);
    setDialogOpen(true);
  }

  function addItem() {
    setItems((prev) => [...prev, { productId: "", productName: "", quantity: 1 }]);
  }

  function updateItem(index: number, field: string, value: string | number) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (field === "productId") {
          const product = products.find((p) => p.id === value);
          return { ...item, productId: value as string, productName: product?.name || "" };
        }
        return { ...item, [field]: value };
      })
    );
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    if (!name.trim()) { toast.error("يرجى إدخال اسم المجموعة"); return; }
    const validItems = items.filter((i) => i.productId);
    if (validItems.length === 0) { toast.error("يرجى إضافة منتج واحد على الأقل"); return; }

    if (editingBundle) {
      updateBundle(editingBundle.id, { name, description, discount, items: validItems });
      toast.success("تم تحديث المجموعة");
    } else {
      addBundle({ name, description, discount, items: validItems });
      toast.success("تم إنشاء المجموعة بنجاح");
    }
    setDialogOpen(false);
  }

  function confirmDelete(bundle: (typeof bundles)[0]) {
    setDeletingBundle(bundle);
    setDeleteDialogOpen(true);
  }

  function handleDelete() {
    if (!deletingBundle) return;
    deleteBundle(deletingBundle.id);
    toast.success("تم حذف المجموعة");
    setDeleteDialogOpen(false);
  }

  function getBundleTotal(bundle: (typeof bundles)[0]) {
    return bundle.items.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId);
      return sum + (product?.price || 0) * item.quantity;
    }, 0);
  }

  return (
    <AppShell>
      <div className="space-y-8 page-enter">
        <div className="animate-fade-in-up text-center">
          <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">مجموعات المنتجات</h1>
          <p className="mt-1.5 text-sm text-muted-foreground sm:mt-2 sm:text-base">
            أنشئ مجموعات جاهزة من المنتجات لإضافتها بسرعة للفواتير
          </p>
          <div className="mt-4 flex justify-center">
            <Button size="sm" className="gap-1.5" onClick={openAddDialog}>
              <Plus className="h-5 w-5" />
              مجموعة جديدة
            </Button>
          </div>
        </div>

        {bundles.length === 0 ? (
          <Card className="border border-[var(--glass-border)] shadow-sm">
            <CardContent className="flex flex-col items-center py-20 text-muted-foreground">
              <Layers className="mb-3 h-14 w-14 opacity-30" />
              <p className="text-lg font-medium">لا توجد مجموعات بعد</p>
              <p className="mt-2 text-base">أنشئ مجموعة لتسهيل إضافة المنتجات للفواتير</p>
              <Button className="mt-4 gap-1.5" onClick={openAddDialog}>
                <Plus className="h-5 w-5" />
                إضافة مجموعة
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 stagger-children">
            {bundles.map((bundle) => {
              const total = getBundleTotal(bundle);
              const discounted = total * (1 - bundle.discount / 100);
              return (
                <Card key={bundle.id} className="border border-[var(--glass-border)] shadow-sm transition-all hover:shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <Layers className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-foreground">{bundle.name}</h3>
                          {bundle.description && (
                            <p className="text-sm text-muted-foreground">{bundle.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openEditDialog(bundle)} className="rounded-xl p-2.5 text-muted-foreground hover:bg-[var(--surface-2)]"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => confirmDelete(bundle)} className="rounded-xl p-2.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {bundle.items.map((item, idx) => {
                        const product = products.find((p) => p.id === item.productId);
                        return (
                          <div key={idx} className="flex items-center justify-between rounded-lg bg-[var(--surface-2)] px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Package className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm font-medium">{item.productName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">×{item.quantity}</span>
                              <span className="font-bold">{formatCurrency((product?.price || 0) * item.quantity)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-[var(--glass-border)] pt-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{bundle.items.length} منتجات</Badge>
                        {bundle.discount > 0 && (
                          <Badge variant="outline" className="text-xs status-badge--success">خصم {bundle.discount}%</Badge>
                        )}
                      </div>
                      <div className="text-left">
                        {bundle.discount > 0 && (
                          <span className="text-sm text-muted-foreground line-through ml-2">{formatCurrency(total)}</span>
                        )}
                        <span className="text-base font-bold text-primary">{formatCurrency(discounted)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle>{editingBundle ? "تعديل المجموعة" : "مجموعة جديدة"}</DialogTitle></DialogHeader>
          <div className="grid gap-5 py-2">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">اسم المجموعة</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: طقم تونر HP CMYK" />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">الوصف</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف مختصر" />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">خصم المجموعة (%)</label>
              <Input type="number" min={0} max={100} value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold">المنتجات</label>
                <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={addItem}><Plus className="h-3 w-3" />إضافة</Button>
              </div>
              {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2 rounded-lg border border-[var(--glass-border)] p-3">
                  <div className="flex-1">
                    <Select value={item.productId} onValueChange={(v) => v && updateItem(index, "productId", v)}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="اختر منتج..." /></SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} ({formatCurrency(p.price)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    type="number" min={1} value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                    className="h-9 w-20 text-xs"
                    placeholder="الكمية"
                  />
                  <button onClick={() => removeItem(index)} className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {items.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">لم تتم إضافة منتجات بعد</p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave}>{editingBundle ? "حفظ" : "إنشاء"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle className="text-red-600">حذف المجموعة</DialogTitle></DialogHeader>
          <p className="text-base text-muted-foreground">هل أنت متأكد من حذف &quot;{deletingBundle?.name}&quot;؟</p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
            <Button variant="destructive" onClick={handleDelete}>حذف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
