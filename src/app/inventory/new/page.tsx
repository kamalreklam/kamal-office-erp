"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ImageUpload } from "@/components/image-upload";
import { useStore } from "@/lib/store";
import { type Product } from "@/lib/data";
import { toast } from "sonner";

const emptyForm = {
  name: "",
  category: "Printers",
  sku: "",
  description: "",
  price: 0,
  stock: 0,
  minStock: 0,
  unit: "عبوة",
  image: "",
};

export default function NewProductPage() {
  const router = useRouter();
  const { addProduct, settings } = useStore();
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  function handleSave() {
    if (!formData.name.trim()) {
      toast.error("يرجى إدخال اسم المنتج");
      return;
    }
    setSaving(true);
    const { image, ...productData } = formData;
    addProduct({ ...productData, image } as Omit<Product, "id" | "createdAt"> & { image?: string });
    toast.success("تم إضافة المنتج بنجاح");
    router.push("/inventory");
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <Link href="/inventory" className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--glass-border)] bg-[var(--surface-1)] text-muted-foreground transition-colors hover:bg-[var(--surface-2)]">
            <ArrowRight className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">إضافة منتج جديد</h1>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--surface-1)] p-6 shadow-sm">
          <div className="grid gap-6">
            {/* Image + Name + SKU */}
            <div className="flex items-start gap-4">
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
                <Select value={formData.category} onValueChange={(v) => v && setFormData({ ...formData, category: v })}>
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
                <Select value={formData.unit} onValueChange={(v) => v && setFormData({ ...formData, unit: v })}>
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
                <label className="text-sm font-medium">سعر التكلفة</label>
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

          {/* Actions */}
          <div className="mt-8 flex items-center justify-end gap-3 border-t border-[var(--glass-border)] pt-6">
            <Button variant="outline" asChild>
              <Link href="/inventory">إلغاء</Link>
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              إضافة المنتج
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
