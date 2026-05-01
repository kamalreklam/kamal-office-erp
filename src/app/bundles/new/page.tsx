"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Layers, Plus, X, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useStore, type BundleItem } from "@/lib/store";
import { formatCurrency } from "@/lib/data";
import { toast } from "sonner";

const colorStyles: Record<string, { label: string; dot: string }> = {
  C:  { label: "سماوي",          dot: "#06b6d4" },
  M:  { label: "أرجواني",        dot: "#ec4899" },
  Y:  { label: "أصفر",           dot: "#eab308" },
  BK: { label: "أسود",           dot: "#374151" },
  LC: { label: "سماوي فاتح",     dot: "#38bdf8" },
  LM: { label: "أرجواني فاتح",   dot: "#fb7185" },
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

export default function NewBundlePage() {
  const router = useRouter();
  const { products, addBundle } = useStore();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [discount, setDiscount] = useState(0);
  const [items, setItems] = useState<BundleItem[]>([]);

  const inkProducts = products.filter(p => p.category !== "Printers" && p.category !== "V50.1");
  const inkFamilies = inkProducts.reduce<Record<string, typeof products>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  function loadFamily(category: string) {
    const family = inkFamilies[category];
    if (!family) return;
    setName(`${category} CMYK`);
    setDescription(family[0]?.name.replace(/ - (Black|Cyan|Magenta|Yellow|Light Cyan|Light Magenta)$/, "") || "");
    setItems(family.map(p => ({
      productId: p.id,
      productName: p.name,
      quantity: 1,
      costPrice: p.price,
      sellingPrice: p.price,
    })));
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
    addBundle({ name, description, discount, items: validItems });
    toast.success("تم إنشاء المجموعة بنجاح");
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
            <h1 className="text-xl font-bold text-foreground">مجموعة جديدة</h1>
          </div>
        </div>

        <div className="space-y-5">
          {/* Quick family loader */}
          {Object.keys(inkFamilies).length > 0 && (
            <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--surface-1)] p-5">
              <p className="mb-3 text-sm font-medium">تحميل سريع من فئة</p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(inkFamilies).map(cat => (
                  <Button key={cat} variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => loadFamily(cat)}>
                    <Droplets className="h-3 w-3" />
                    {cat}
                  </Button>
                ))}
              </div>
            </div>
          )}

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
              <p className="py-6 text-center text-sm text-muted-foreground">اختر فئة أعلاه أو أضف منتجات يدوياً</p>
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

            {/* Cost / sell / margin summary */}
            {items.some(i => i.productId) && (
              <div className="mt-4 flex items-center justify-between rounded-xl bg-[var(--surface-2)] px-4 py-3 text-sm">
                <span className="text-muted-foreground">التكلفة: <span className="font-bold text-foreground">{formatCurrency(totalCost)}</span></span>
                <span className="text-muted-foreground">البيع: <span className="font-bold text-foreground">{formatCurrency(totalSell)}</span></span>
                <span className="text-muted-foreground">الهامش: <span className={`font-bold ${margin >= 0 ? "text-emerald-600" : "text-red-600"}`}>{margin.toFixed(1)}%</span></span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => router.push("/bundles")}>إلغاء</Button>
            <Button onClick={handleSave}>إنشاء المجموعة</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
