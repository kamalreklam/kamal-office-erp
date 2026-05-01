"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Layers, Plus, Minus, X, Search, Printer, Droplets, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useStore, type BundleItem } from "@/lib/store";
import { type Product, formatCurrency } from "@/lib/data";
import { toast } from "sonner";
import { useDebounce } from "@/lib/use-debounce";
import {
  getColorKey, detectType, resolveItems, itemSell, itemCost,
  colorStyles, type ResolvedItem,
} from "@/app/bundles/page";

const typeOrder = ["printer", "ink", "tank", "other"] as const;
const typeLabels: Record<string, string> = {
  printer: "طابعة", ink: "حبر", tank: "خزان", other: "أخرى",
};

function ProductIcon({ product, size = "sm" }: { product: Product; size?: "sm" | "md" }) {
  const type = detectType(product);
  const colorKey = getColorKey(product.name);
  const cs = colorStyles[colorKey];
  const cls = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  if (type === "printer") return <Printer className={`${cls} text-slate-500 shrink-0`} />;
  if (type === "tank")    return <Droplets className={`${cls} text-blue-400 shrink-0`} />;
  if (cs) return <div className={size === "md" ? "h-3.5 w-3.5 rounded-full shrink-0" : "h-3 w-3 rounded-full shrink-0"} style={{ backgroundColor: cs.dot }} />;
  return <Package className={`${cls} text-muted-foreground shrink-0`} />;
}

export default function NewBundlePage() {
  const router = useRouter();
  const { products, addBundle } = useStore();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [discount, setDiscount] = useState(0);
  const [items, setItems] = useState<BundleItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("الكل");

  const debouncedSearch = useDebounce(productSearch);

  const categories = useMemo(() => ["الكل", ...Array.from(new Set(products.map(p => p.category))).sort()], [products]);

  const inkFamilies = useMemo(() => {
    return products
      .filter(p => p.category !== "Printers" && getColorKey(p.name) !== "")
      .reduce<Record<string, Product[]>>((acc, p) => {
        if (!acc[p.category]) acc[p.category] = [];
        acc[p.category].push(p);
        return acc;
      }, {});
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !debouncedSearch || p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || p.category.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchCat = activeCategory === "الكل" || p.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [products, debouncedSearch, activeCategory]);

  function loadFamily(category: string, familyProducts: Product[]) {
    setName(`${category} CMYK`);
    setDescription(familyProducts[0]?.name.replace(/ - (Black|Cyan|Magenta|Yellow|Light Cyan|Light Magenta)$/, "") || "");
    setItems(familyProducts.map(p => ({
      productId: p.id,
      productName: p.name,
      quantity: 1,
      componentType: "ink",
      costPrice: p.price,
      sellingPrice: p.price,
    })));
  }

  function addProduct(product: Product) {
    const existing = items.findIndex(i => i.productId === product.id);
    if (existing >= 0) {
      setItems(prev => prev.map((it, i) => i === existing ? { ...it, quantity: it.quantity + 1 } : it));
    } else {
      setItems(prev => [...prev, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        componentType: detectType(product),
        costPrice: product.price,
        sellingPrice: product.price,
      }]);
    }
  }

  function adjustQty(index: number, delta: number) {
    setItems(prev => prev.map((it, i) => {
      if (i !== index) return it;
      const qty = Math.max(1, it.quantity + delta);
      return { ...it, quantity: qty };
    }));
  }

  function setSellPrice(index: number, value: number) {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, sellingPrice: value } : it));
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index));
  }

  const resolved = resolveItems(items, products);

  const totalCost = resolved.reduce((s, it) => s + itemCost(it, it.product) * it.quantity, 0);
  const totalSell = resolved.reduce((s, it) => s + itemSell(it, it.product) * it.quantity, 0);
  const totalSellAfterDiscount = totalSell * (1 - discount / 100);
  const margin = totalSell > 0 ? ((totalSell - totalCost) / totalSell * 100) : 0;

  const groups = typeOrder
    .map(t => ({ type: t, label: typeLabels[t], items: resolved.filter(it => it.type === t) }))
    .filter(g => g.items.length > 0);
  const multiType = groups.length > 1;

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
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Page header */}
        <div className="mb-8 flex items-center gap-3">
          <button
            aria-label="رجوع"
            onClick={() => router.push("/bundles")}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--glass-border)] bg-[var(--surface-1)] text-muted-foreground transition-colors hover:bg-[var(--surface-2)]"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">مجموعة جديدة</h1>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* ── LEFT: Builder ── */}
          <div className="space-y-5">
            {/* Section A: Info */}
            <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--surface-1)] p-5">
              <p className="mb-4 text-sm font-bold">معلومات المجموعة</p>
              <div className="grid gap-3">
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="اسم المجموعة — مثال: Epson L3250 CMYK Kit"
                  className="text-base font-semibold"
                />
                <Input
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="وصف مختصر (اختياري)"
                />
                <div className="flex items-center gap-3">
                  <label className="text-sm text-muted-foreground whitespace-nowrap">خصم المجموعة %</label>
                  <Input
                    type="number" min={0} max={100}
                    value={discount}
                    onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                    className="max-w-28"
                  />
                </div>
              </div>
            </div>

            {/* Section B: Product picker */}
            <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--surface-1)] p-5">
              <p className="mb-4 text-sm font-bold">إضافة منتجات</p>

              {/* Quick family buttons */}
              {Object.keys(inkFamilies).length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-xs text-muted-foreground">تحميل سريع — طقم أحبار:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(inkFamilies).map(([cat, fam]) => (
                      <button
                        key={cat}
                        onClick={() => loadFamily(cat, fam)}
                        className="flex items-center gap-1.5 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                      >
                        <Droplets className="h-3 w-3" />
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder="ابحث عن منتج..."
                  className="pr-9"
                />
              </div>

              {/* Category chips */}
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${activeCategory === cat ? "bg-primary text-white" : "bg-[var(--surface-2)] text-muted-foreground hover:text-foreground"}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Product results */}
              <div className="max-h-72 overflow-y-auto space-y-1 rounded-xl border border-[var(--glass-border)]">
                {filteredProducts.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">لا توجد منتجات</p>
                ) : filteredProducts.map(p => {
                  const already = items.find(it => it.productId === p.id);
                  return (
                    <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-[var(--surface-2)]">
                      <ProductIcon product={p} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.category} · مخزون: {p.stock}</p>
                      </div>
                      <span className="text-xs font-bold text-primary shrink-0">{formatCurrency(p.price)}</span>
                      <button
                        onClick={() => addProduct(p)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors hover:bg-primary hover:text-white"
                      >
                        {already ? <span className="text-xs font-bold">+{already.quantity}</span> : <Plus className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section C: Selected items */}
            {items.length > 0 && (
              <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--surface-1)] p-5">
                <p className="mb-4 text-sm font-bold">المنتجات المختارة</p>
                <div className="space-y-0.5">
                  {groups.map(group => (
                    <div key={group.type}>
                      {multiType && (
                        <div className="flex items-center gap-2 py-2">
                          <div className="h-px flex-1 bg-border/50" />
                          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{group.label}</span>
                          <div className="h-px flex-1 bg-border/50" />
                        </div>
                      )}
                      {group.items.map((item, gIdx) => {
                        const globalIndex = items.findIndex(i => i.productId === item.productId);
                        const cs = colorStyles[item.colorKey];
                        const sell = itemSell(item, item.product);
                        const cost = itemCost(item, item.product);
                        const rowMargin = sell > 0 ? ((sell - cost) / sell * 100) : 0;
                        const underCost = sell < cost;
                        return (
                          <div key={gIdx} className="grid grid-cols-[auto_1fr_auto_90px_auto_auto] items-center gap-2 rounded-xl px-3 py-2.5 bg-[var(--surface-2)]">
                            {cs
                              ? <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: cs.dot }} />
                              : item.type === "printer" ? <Printer className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                              : item.type === "tank" ? <Droplets className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                              : <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            }
                            <p className="text-sm font-medium truncate">{item.product?.name || item.productName}</p>
                            {/* Qty stepper */}
                            <div className="flex items-center gap-1">
                              <button aria-label="تقليل الكمية" onClick={() => adjustQty(globalIndex, -1)} className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--surface-1)] text-muted-foreground hover:text-foreground">
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-5 text-center text-xs font-bold">{item.quantity}</span>
                              <button aria-label="زيادة الكمية" onClick={() => adjustQty(globalIndex, 1)} className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--surface-1)] text-muted-foreground hover:text-foreground">
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            {/* Sell price */}
                            <Input
                              type="number" min={0}
                              value={item.sellingPrice ?? 0}
                              onChange={e => setSellPrice(globalIndex, parseFloat(e.target.value) || 0)}
                              className={`h-7 text-xs text-center ${underCost ? "border-red-400 text-red-600" : ""}`}
                            />
                            {/* Margin badge */}
                            <span className={`text-[10px] font-bold shrink-0 ${rowMargin >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                              {rowMargin.toFixed(0)}%
                            </span>
                            <button aria-label="حذف المنتج" onClick={() => removeItem(globalIndex)} className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Summary panel (sticky) ── */}
          <div className="lg:sticky lg:top-6 space-y-4 self-start">
            <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--surface-1)] p-5">
              <p className="mb-4 text-sm font-bold">معاينة المجموعة</p>

              {/* Bundle preview card */}
              <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--surface-2)] p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${resolved.some(it => it.type === "printer") ? "bg-slate-700" : "bg-gradient-to-br from-cyan-500 via-pink-500 to-yellow-500"}`}>
                    {resolved.some(it => it.type === "printer") ? <Printer className="h-4 w-4" /> : <Droplets className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{name || "اسم المجموعة"}</p>
                    {description && <p className="text-xs text-muted-foreground truncate">{description}</p>}
                  </div>
                </div>
                {resolved.length === 0 ? (
                  <p className="text-xs text-center text-muted-foreground py-3">أضف منتجات لترى المعاينة</p>
                ) : (
                  <div className="space-y-1">
                    {resolved.map((it, i) => {
                      const cs = colorStyles[it.colorKey];
                      return (
                        <div key={i} className="flex items-center gap-2">
                          {cs
                            ? <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cs.dot }} />
                            : it.type === "printer" ? <Printer className="h-3 w-3 text-slate-500 shrink-0" />
                            : it.type === "tank" ? <Droplets className="h-3 w-3 text-blue-400 shrink-0" />
                            : <Package className="h-3 w-3 text-muted-foreground shrink-0" />
                          }
                          <span className="flex-1 text-xs truncate">{it.product?.name || it.productName}</span>
                          <span className="text-[10px] text-muted-foreground">×{it.quantity}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Totals */}
              {resolved.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">التكلفة</span>
                    <span className="font-semibold">{formatCurrency(totalCost)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">سعر البيع</span>
                    <span className="font-bold text-foreground">{formatCurrency(totalSell)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">بعد الخصم {discount}%</span>
                      <span className="font-bold text-primary">{formatCurrency(totalSellAfterDiscount)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm border-t border-[var(--glass-border)] pt-2">
                    <span className="text-muted-foreground">الهامش</span>
                    <span className={`font-bold ${margin >= 0 ? "text-emerald-600" : "text-red-600"}`}>{margin.toFixed(1)}%</span>
                  </div>
                  {resolved.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <Badge variant="secondary">{resolved.length} منتجات</Badge>
                      {discount > 0 && <Badge variant="outline" className="text-emerald-600 border-emerald-300">خصم {discount}%</Badge>}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button onClick={handleSave} className="w-full">إنشاء المجموعة</Button>
              <Button variant="outline" onClick={() => router.push("/bundles")} className="w-full">إلغاء</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
