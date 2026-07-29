"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Printer, Droplet, Package, Plus, Minus, Search, Sparkles, CheckCircle, X, FlaskConical } from "lucide-react";
import { useStore, type BundleItem } from "@/lib/store";
import { type Product, formatCurrency } from "@/lib/data";
import { toast } from "sonner";
import { useDebounce } from "@/lib/use-debounce";
import {
  getColorKey, detectType, resolveItems, itemSell, itemCost,
  colorStyles, suggestBundles,
} from "@/app/(dashboard)/bundles/bundle-utils";

function ProductIcon({ product, className = "size-5" }: { product: Product; className?: string }) {
  const type = detectType(product);
  const cs = colorStyles[getColorKey(product.name)];
  if (type === "printer") return <Printer className={`${className} text-slate-500 shrink-0`} />;
  if (type === "tank") return <Droplet className={`${className} text-blue-400 shrink-0`} />;
  if (cs) return <div className="size-3.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: cs.dot }} />;
  return <Package className={`${className} text-slate-400 shrink-0 opacity-50`} />;
}

export default function NewBundleV2Page() {
  const router = useRouter();
  const { products, bundles, invoices, addBundle } = useStore();

  const [step, setStep] = useState<1 | 2>(1);
  const [items, setItems] = useState<BundleItem[]>([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [discount, setDiscount] = useState(0);

  const suggestions = useMemo(
    () => suggestBundles(invoices, products, bundles),
    [invoices, products, bundles]
  );

  const filteredProducts = useMemo(() => {
    if (!debouncedSearch) return [];
    const q = debouncedSearch.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)).slice(0, 30);
  }, [products, debouncedSearch]);

  function addProduct(product: Product) {
    setItems(prev => {
      const existing = prev.findIndex(i => i.productId === product.id);
      if (existing >= 0) return prev.map((it, i) => i === existing ? { ...it, quantity: it.quantity + 1 } : it);
      return [...prev, {
        productId: product.id, productName: product.name, quantity: 1,
        componentType: detectType(product), costPrice: product.costPrice || 0, sellingPrice: product.sellingPrice || 0,
      }];
    });
  }

  function applySuggestion(productIds: string[]) {
    const toAdd = productIds.map(id => products.find(p => p.id === id)).filter((p): p is Product => !!p);
    setItems(toAdd.map(p => ({
      productId: p.id, productName: p.name, quantity: 1,
      componentType: detectType(p), costPrice: p.costPrice || 0, sellingPrice: p.sellingPrice || 0,
    })));
    setName(toAdd.map(p => p.name).join(" + "));
    toast.success("تم تحميل الاقتراح — يمكنك تعديله بحرية");
  }

  function adjustQty(index: number, delta: number) {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, quantity: Math.max(1, it.quantity + delta) } : it));
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index));
  }

  const resolved = resolveItems(items, products);
  const totalCost = resolved.reduce((s, it) => s + itemCost(it, it.product) * it.quantity, 0);
  const totalSell = resolved.reduce((s, it) => s + itemSell(it, it.product) * it.quantity, 0);
  const totalAfterDiscount = totalSell * (1 - discount / 100);
  const margin = totalSell > 0 ? ((totalSell - totalCost) / totalSell * 100) : 0;

  function goToReview() {
    if (items.length === 0) { toast.error("أضف منتجاً واحداً على الأقل"); return; }
    if (!name.trim()) setName(resolved.map(it => it.product?.name || it.productName).join(" + ").slice(0, 60));
    setStep(2);
  }

  function handleSave() {
    if (!name.trim()) { toast.error("يرجى إدخال اسم المجموعة"); return; }
    addBundle({ name, description, discount, items });
    toast.success("تم إنشاء المجموعة بنجاح");
    router.push("/bundles");
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28" dir="rtl">
      {/* Demo banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-xs font-bold text-amber-800">
        <FlaskConical className="size-4 shrink-0" />
        نسخة تجريبية لواجهة إنشاء المجموعات — جرّبها بحرية، لن يتأثر أي شيء حتى تضغط "حفظ"
      </div>

      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => step === 1 ? router.push("/bundles") : setStep(1)}
          className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 active:scale-95"
        >
          <ArrowRight className="size-4" />
        </button>
        <div className="flex-1">
          <div className="text-sm font-black text-slate-900">{step === 1 ? "١. اختر المنتجات" : "٢. المراجعة والحفظ"}</div>
          <div className="flex gap-1 mt-1.5">
            <div className={`h-1 flex-1 rounded-full ${step >= 1 ? "bg-indigo-600" : "bg-slate-200"}`} />
            <div className={`h-1 flex-1 rounded-full ${step >= 2 ? "bg-indigo-600" : "bg-slate-200"}`} />
          </div>
        </div>
      </div>

      {step === 1 && (
        <div className="p-4 space-y-5">
          {/* AI suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-black text-indigo-700 uppercase tracking-wider">
                <Sparkles className="size-3.5" />
                اقتراحات ذكية من سجل الفواتير
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => applySuggestion(s.productIds)}
                    className="shrink-0 max-w-[260px] text-right bg-indigo-50 border border-indigo-100 rounded-2xl p-3 active:scale-95 transition-transform"
                  >
                    <div className="text-xs font-bold text-slate-800 leading-snug line-clamp-2">{s.suggestedName}</div>
                    <div className="text-[length:var(--text-2xs)] font-bold text-indigo-600 mt-1">اشتُريا معاً في {s.invoiceCount} فاتورة</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ابحث عن منتج لإضافته..."
              className="w-full bg-white border border-slate-200 rounded-2xl py-3 pr-10 pl-4 text-sm font-bold text-slate-800 shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
            />
          </div>

          {debouncedSearch && (
            <div className="space-y-2">
              {filteredProducts.length === 0 ? (
                <div className="text-center text-xs font-bold text-slate-400 py-6">لا توجد نتائج</div>
              ) : (
                filteredProducts.map(p => {
                  const already = items.find(it => it.productId === p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => addProduct(p)}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-right transition-colors ${already ? "border-indigo-400 bg-indigo-50/50" : "border-slate-200 bg-white"}`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                        <ProductIcon product={p} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 truncate">{p.name}</div>
                        <div className="text-[length:var(--text-2xs)] font-bold text-slate-400">{formatCurrency(p.sellingPrice)}</div>
                      </div>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${already ? "bg-indigo-600 text-white" : "bg-slate-900 text-white"}`}>
                        {already ? <span className="text-xs font-black">{already.quantity}</span> : <Plus className="size-4" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* Selected items */}
          {resolved.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-black text-slate-500 uppercase tracking-wider">المنتجات المختارة ({resolved.length})</div>
              {resolved.map((it, i) => {
                const globalIndex = items.findIndex(x => x.productId === it.productId);
                return (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200">
                    <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                      {it.product ? <ProductIcon product={it.product} /> : <Package className="size-4 text-slate-400" />}
                    </div>
                    <div className="min-w-0 flex-1 text-xs font-bold text-slate-900 truncate">{it.product?.name || it.productName}</div>
                    <div className="flex items-center gap-1 bg-slate-50 rounded-xl border border-slate-200 p-0.5">
                      <button onClick={() => adjustQty(globalIndex, -1)} className="w-6 h-6 flex items-center justify-center text-slate-600"><Minus className="size-3.5" /></button>
                      <span className="w-6 text-center text-xs font-black text-indigo-600">{it.quantity}</span>
                      <button onClick={() => adjustQty(globalIndex, 1)} className="w-6 h-6 flex items-center justify-center text-slate-600"><Plus className="size-3.5" /></button>
                    </div>
                    <button onClick={() => removeItem(globalIndex)} className="w-7 h-7 flex items-center justify-center text-slate-400"><X className="size-4" /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="p-4 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500">اسم المجموعة *</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-bold text-slate-800" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500">الوصف (اختياري)</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-bold text-slate-800" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500">خصم %</label>
              <input type="number" min="0" max="100" value={discount === 0 ? "" : discount} placeholder="0" onChange={e => setDiscount(parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-black font-mono text-slate-800" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            {resolved.map((it, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 truncate">{it.product?.name || it.productName} × {it.quantity}</span>
                <span className="font-black font-mono text-slate-800">{formatCurrency(itemSell(it, it.product) * it.quantity)}</span>
              </div>
            ))}
            <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
              <span className="text-xs font-black text-slate-500">الإجمالي بعد الخصم</span>
              <span className="text-lg font-black font-mono text-indigo-700">{formatCurrency(totalAfterDiscount)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-400">هامش الربح</span>
              <span className={`font-black font-mono ${margin >= 20 ? "text-emerald-600" : margin >= 0 ? "text-amber-500" : "text-rose-600"}`}>{margin.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom action bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 p-4 flex items-center gap-3 z-30">
        {resolved.length > 0 && (
          <div className="flex-1 min-w-0">
            <div className="text-[length:var(--text-2xs)] font-bold text-slate-400">{resolved.length} منتج</div>
            <div className="text-base font-black font-mono text-slate-900">{formatCurrency(step === 1 ? totalSell : totalAfterDiscount)}</div>
          </div>
        )}
        {step === 1 ? (
          <button onClick={goToReview} className="h-12 px-6 rounded-2xl bg-indigo-600 text-white font-bold flex items-center gap-2 active:scale-95">
            التالي <ArrowLeft className="size-4" />
          </button>
        ) : (
          <button onClick={handleSave} className="h-12 px-6 rounded-2xl bg-indigo-600 text-white font-bold flex items-center gap-2 active:scale-95">
            <CheckCircle className="size-4" /> حفظ المجموعة
          </button>
        )}
      </div>
    </div>
  );
}
