"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Layers, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useStore, type BundleItem } from "@/lib/store";
import { formatCurrency } from "@/lib/data";
import { toast } from "sonner";

const colorStyles: Record<string, { dot: string }> = {
  C:  { dot: "#06b6d4" },
  M:  { dot: "#ec4899" },
  Y:  { dot: "#eab308" },
  BK: { dot: "#374151" },
  LC: { dot: "#38bdf8" },
  LM: { dot: "#fb7185" },
};

function getColorKey(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("light cyan")    || n === "lc") return "LC";
  if (n.includes("light magenta") || n === "lm") return "LM";
  if (n.includes("cyan")          || n === "c")  return "C";
  if (n.includes("magenta")       || n === "m")  return "M";
  if (n.includes("yellow")        || n === "y")  return "Y";
  if (n.includes("black")         || n === "bk") return "BK";
  return "";
}

export default function EditBundlePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { bundles, products, updateBundle } = useStore();

  const bundle = bundles.find(b => b.id === id);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [discount, setDiscount] = useState(0);
  const [items, setItems] = useState<BundleItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (bundle && !loaded) {
      setName(bundle.name);
      setDescription(bundle.description);
      setDiscount(bundle.discount);
      setItems(bundle.items.map(it => ({
        ...it,
        costPrice: it.costPrice ?? products.find(p => p.id === it.productId)?.price ?? 0,
        sellingPrice: it.sellingPrice ?? products.find(p => p.id === it.productId)?.price ?? 0,
      })));
      setLoaded(true);
    }
  }, [bundle, loaded, products]);

  if (!bundle) {
    return (
      <div className="flex min-h-screen items-center justify-center" dir="rtl">
        <div className="text-center">
          <p className="text-muted-foreground">المجموعة غير موجودة</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/bundles">العودة للمجموعات</Link>
          </Button>
        </div>
      </div>
    );
  }

  function addItem() {
    setItems(prev => [...prev, { productId: "", productName: "", quantity: 1, costPrice: 0, sellingPrice: 0 }]);
  }

  function updateItem(index: number, field: string, value: string | number) {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      if (field === "productId") {
        const product = products.find(p => p.id === value);
        return { ...item, productId: value as string, productName: product?.name || "", costPrice: product?.price || 0, sellingPrice: product?.price || 0 };
      }
      return { ...item, [field]: value };
    }));
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index));
  }

  const totalCost = items.reduce((s, it) => s + (it.costPrice || 0) * it.quantity, 0);
  const totalSell = items.reduce((s, it) => s + (it.sellingPrice || 0) * it.quantity, 0);
  const margin = totalSell > 0 ? ((totalSell - totalCost) / totalSell * 100) : 0;

  function handleSave() {
    if (!name.trim()) { toast.error("يرجى إدخال اسم المجموعة"); return; }
    const validItems = items.filter(i => i.productId);
    if (validItems.length === 0) { toast.error("يرجى إضافة منتج واحد على الأقل"); return; }
    updateBundle(id, { name, description, discount, items: validItems });
    toast.success("تم تحديث المجموعة");
    router.push("/bundles");
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8 flex items-center gap-3">
          <Link href="/bundles" className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--glass-border)] bg-[var(--surface-1)] text-muted-foreground transition-colors hover:bg-[var(--surface-2)]">
            <ArrowRight className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">تعديل المجموعة</h1>
          </div>
          <span className="text-sm text-muted-foreground">{bundle.name}</span>
        </div>

        <div className="space-y-5">
          {/* Basic info */}
          <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--surface-1)] p-5">
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">اسم المجموعة</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: Epson V63.2 CMYK" />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">الوصف</label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="وصف مختصر" />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">خصم المجموعة (%)</label>
                <Input type="number" min={0} max={100} value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} className="max-w-32" />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--surface-1)] p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold">المنتجات / الألوان</p>
              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={addItem}>
                <Plus className="h-3 w-3" />
                إضافة منتج
              </Button>
            </div>

            {items.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">لا توجد منتجات، أضف منتجاً</p>
            ) : (
              <div className="rounded-xl border border-[var(--glass-border)] overflow-hidden">
                <div className="grid grid-cols-[1fr_60px_90px_90px_32px] gap-2 bg-[var(--surface-2)] px-3 py-2">
                  <span className="text-xs font-bold text-muted-foreground">المنتج</span>
                  <span className="text-xs font-bold text-muted-foreground text-center">الكمية</span>
                  <span className="text-xs font-bold text-muted-foreground text-center">التكلفة</span>
                  <span className="text-xs font-bold text-muted-foreground text-center">سعر البيع</span>
                  <span />
                </div>
                {items.map((item, index) => {
                  const colorKey = getColorKey(item.productName);
                  const cs = colorStyles[colorKey];
                  const underCost = (item.sellingPrice || 0) < (item.costPrice || 0);
                  return (
                    <div key={index} className="grid grid-cols-[1fr_60px_90px_90px_32px] gap-2 items-center px-3 py-2 border-t border-[var(--glass-border)]">
                      <div className="flex items-center gap-2">
                        {cs ? (
                          <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: cs.dot }} />
                        ) : (
                          <div className="h-3 w-3 rounded-full flex-shrink-0 bg-muted" />
                        )}
                        <Select value={item.productId} onValueChange={v => v && updateItem(index, "productId", v)}>
                          <SelectTrigger className="h-8 text-xs border-0 bg-transparent p-0 shadow-none">
                            <SelectValue placeholder="اختر منتج..." />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} ({formatCurrency(p.price)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Input
                        type="number" min={1} value={item.quantity}
                        onChange={e => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                        className="h-8 text-xs text-center"
                      />
                      <Input
                        type="number" min={0} value={item.costPrice || 0}
                        onChange={e => updateItem(index, "costPrice", parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs text-center"
                      />
                      <Input
                        type="number" min={0} value={item.sellingPrice || 0}
                        onChange={e => updateItem(index, "sellingPrice", parseFloat(e.target.value) || 0)}
                        className={`h-8 text-xs text-center ${underCost ? "border-red-400 text-red-600" : ""}`}
                      />
                      <button onClick={() => removeItem(index)} className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {items.some(i => i.productId) && (
              <div className="mt-4 flex items-center justify-between rounded-xl bg-[var(--surface-2)] px-4 py-3 text-sm">
                <span className="text-muted-foreground">التكلفة: <span className="font-bold text-foreground">{formatCurrency(totalCost)}</span></span>
                <span className="text-muted-foreground">البيع: <span className="font-bold text-foreground">{formatCurrency(totalSell)}</span></span>
                <span className="text-muted-foreground">الهامش: <span className={`font-bold ${margin >= 0 ? "text-emerald-600" : "text-red-600"}`}>{margin.toFixed(1)}%</span></span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" asChild><Link href="/bundles">إلغاء</Link></Button>
            <Button onClick={handleSave}>حفظ التعديلات</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
