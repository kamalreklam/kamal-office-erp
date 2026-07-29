"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Printer, Droplet, Package, Plus, Minus, Search, Sparkles, CheckCircle, X, FlaskConical, Wand2 } from "lucide-react";
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
  if (cs) return <div className="size-4 rounded-full shrink-0 shadow-sm ring-2 ring-white" style={{ backgroundColor: cs.dot }} />;
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
    toast.success("✨ تم تحميل الاقتراح — يمكنك تعديله بحرية");
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
  const marginPercent = Math.max(0, Math.min(100, margin));

  function goToReview() {
    if (items.length === 0) { toast.error("أضف منتجاً واحداً على الأقل"); return; }
    if (!name.trim()) setName(resolved.map(it => it.product?.name || it.productName).join(" + ").slice(0, 60));
    setStep(2);
  }

  function handleSave() {
    if (!name.trim()) { toast.error("يرجى إدخال اسم المجموعة"); return; }
    addBundle({ name, description, discount, items });
    toast.success("🎉 تم إنشاء المجموعة بنجاح");
    router.push("/bundles");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/60 via-slate-50 to-slate-50 pb-32" dir="rtl">
      {/* Demo banner */}
      <div className="bg-gradient-to-l from-amber-50 to-orange-50 border-b border-amber-200/70 px-4 py-2.5 flex items-center gap-2.5 text-sm font-bold text-amber-800">
        <FlaskConical className="size-4 shrink-0 animate-[pop-in_0.6s_ease-out]" />
        نسخة تجريبية — جرّبها بحرية، لن يتأثر أي شيء حتى تضغط &ldquo;حفظ&rdquo;
      </div>

      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-white/80 border-b border-slate-100 px-4 py-4 flex items-center gap-3 shadow-sm">
        <button
          onClick={() => step === 1 ? router.push("/bundles") : setStep(1)}
          className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:text-indigo-600 active:scale-90"
        >
          <ArrowRight className="size-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Wand2 className="size-4 text-indigo-500" />
            <span className="text-base font-black text-slate-900 tracking-tight">{step === 1 ? "اختر المنتجات" : "المراجعة والحفظ"}</span>
          </div>
          <div className="flex gap-1.5 mt-2">
            <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= 1 ? "bg-gradient-to-l from-indigo-600 to-violet-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" : "bg-slate-200"}`} />
            <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= 2 ? "bg-gradient-to-l from-indigo-600 to-violet-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" : "bg-slate-200"}`} />
          </div>
        </div>
      </div>

      {step === 1 && (
        <div key="step-1" className="p-4 space-y-6 animate-fade-in-up">
          {/* AI suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-black text-indigo-700 uppercase tracking-wide">
                <Sparkles className="size-4 text-violet-500" />
                <span className="shimmer-text">اقتراحات ذكية من سجل الفواتير</span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => applySuggestion(s.productIds)}
                    style={{ animationDelay: `${i * 70}ms` }}
                    className="animate-pop-in shrink-0 max-w-[280px] text-right bg-gradient-to-br from-white to-indigo-50 border border-indigo-200 rounded-3xl p-4 shadow-[0_4px_16px_-4px_rgba(99,102,241,0.25)] transition-all duration-200 hover:shadow-[0_8px_24px_-6px_rgba(99,102,241,0.35)] hover:-translate-y-0.5 active:scale-95 snap-start"
                  >
                    <div className="text-sm font-bold text-slate-800 leading-snug line-clamp-2">{s.suggestedName}</div>
                    <div className="text-xs font-black text-indigo-600 mt-2 flex items-center gap-1">
                      <Sparkles className="size-3" />
                      اشتُريا معاً في {s.invoiceCount} فاتورة
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ابحث عن منتج لإضافته..."
              className="w-full bg-white border-2 border-slate-200 rounded-3xl py-4 pr-12 pl-4 text-base font-bold text-slate-800 shadow-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-500"
            />
          </div>

          {debouncedSearch && (
            <div className="space-y-2.5">
              {filteredProducts.length === 0 ? (
                <div className="text-center text-sm font-bold text-slate-400 py-8">لا توجد نتائج</div>
              ) : (
                filteredProducts.map((p, i) => {
                  const already = items.find(it => it.productId === p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => addProduct(p)}
                      style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
                      className={`animate-fade-in-side w-full flex items-center gap-3 p-3.5 rounded-2xl border text-right transition-all duration-200 active:scale-[0.98] ${already ? "border-indigo-400 bg-indigo-50/60 shadow-[0_0_0_3px_rgba(99,102,241,0.1)]" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"}`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                        <ProductIcon product={p} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-slate-900 truncate">{p.name}</div>
                        <div className="text-xs font-bold text-slate-400 mt-0.5">{formatCurrency(p.sellingPrice)}</div>
                      </div>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 ${already ? "bg-indigo-600 text-white scale-110" : "bg-slate-900 text-white"}`}>
                        {already ? <span className="text-sm font-black">{already.quantity}</span> : <Plus className="size-4" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* Selected items */}
          {resolved.length > 0 && (
            <div className="space-y-2.5">
              <div className="text-sm font-black text-slate-500 uppercase tracking-wide">المنتجات المختارة ({resolved.length})</div>
              {resolved.map((it, i) => {
                const globalIndex = items.findIndex(x => x.productId === it.productId);
                return (
                  <div key={i} className="animate-pop-in flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm transition-shadow duration-200 hover:shadow-md">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                      {it.product ? <ProductIcon product={it.product} /> : <Package className="size-4 text-slate-400" />}
                    </div>
                    <div className="min-w-0 flex-1 text-sm font-bold text-slate-900 truncate">{it.product?.name || it.productName}</div>
                    <div className="flex items-center gap-1 bg-slate-50 rounded-2xl border border-slate-200 p-1">
                      <button onClick={() => adjustQty(globalIndex, -1)} className="w-7 h-7 flex items-center justify-center text-slate-600 rounded-lg transition-colors hover:bg-slate-200 active:scale-90"><Minus className="size-4" /></button>
                      <span className="w-7 text-center text-sm font-black text-indigo-600">{it.quantity}</span>
                      <button onClick={() => adjustQty(globalIndex, 1)} className="w-7 h-7 flex items-center justify-center text-slate-600 rounded-lg transition-colors hover:bg-slate-200 active:scale-90"><Plus className="size-4" /></button>
                    </div>
                    <button onClick={() => removeItem(globalIndex)} className="w-8 h-8 flex items-center justify-center text-slate-400 rounded-lg transition-colors hover:bg-rose-50 hover:text-rose-500 active:scale-90"><X className="size-4" /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div key="step-2" className="p-4 space-y-6 animate-fade-in-up">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-5 shadow-sm">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500">اسم المجموعة *</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl py-3 px-4 text-base font-bold text-slate-800 transition-all focus:outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-500" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500">الوصف (اختياري)</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl py-3 px-4 text-base font-bold text-slate-800 transition-all focus:outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-500" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500">خصم %</label>
              <input type="number" min="0" max="100" value={discount === 0 ? "" : discount} placeholder="0" onChange={e => setDiscount(parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl py-3 px-4 text-base font-black font-mono text-slate-800 transition-all focus:outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-500" />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-3 shadow-sm">
            {resolved.map((it, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="font-bold text-slate-700 truncate">{it.product?.name || it.productName} × {it.quantity}</span>
                <span className="font-black font-mono text-slate-800">{formatCurrency(itemSell(it, it.product) * it.quantity)}</span>
              </div>
            ))}
            <div className="border-t border-slate-100 pt-4 mt-1 rounded-2xl bg-gradient-to-l from-indigo-50 to-violet-50 -mx-5 -mb-5 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-indigo-700">الإجمالي بعد الخصم</span>
                <span className="text-2xl font-black font-mono text-indigo-700 tracking-tight">{formatCurrency(totalAfterDiscount)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-slate-500">هامش الربح</span>
                <span className={`font-black font-mono ${margin >= 20 ? "text-emerald-600" : margin >= 0 ? "text-amber-500" : "text-rose-600"}`}>{margin.toFixed(1)}%</span>
              </div>
              <div className="w-full h-2.5 bg-white/70 rounded-full overflow-hidden shadow-inner">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${margin >= 20 ? "bg-gradient-to-l from-emerald-400 to-emerald-600" : margin >= 0 ? "bg-gradient-to-l from-amber-300 to-amber-500" : "bg-gradient-to-l from-rose-400 to-rose-600"}`}
                  style={{ width: `${marginPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom action bar */}
      <div className="fixed bottom-0 inset-x-0 backdrop-blur-xl bg-white/90 border-t border-slate-200 p-4 flex items-center gap-3 z-30 shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.08)]">
        {resolved.length > 0 && (
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-400">{resolved.length} منتج</div>
            <div className="text-xl font-black font-mono text-slate-900 tracking-tight">{formatCurrency(step === 1 ? totalSell : totalAfterDiscount)}</div>
          </div>
        )}
        {step === 1 ? (
          <button onClick={goToReview} className="h-14 py-3.5 px-7 rounded-2xl bg-gradient-to-l from-indigo-600 to-violet-600 text-white font-black text-base flex items-center gap-2 shadow-[0_10px_24px_-8px_rgba(99,102,241,0.6)] transition-all duration-200 hover:shadow-[0_14px_32px_-8px_rgba(99,102,241,0.7)] hover:-translate-y-0.5 active:scale-95 active:translate-y-0">
            التالي <ArrowLeft className="size-4" />
          </button>
        ) : (
          <button onClick={handleSave} className="h-14 py-3.5 px-7 rounded-2xl bg-gradient-to-l from-indigo-600 to-violet-600 text-white font-black text-base flex items-center gap-2 shadow-[0_10px_24px_-8px_rgba(99,102,241,0.6)] transition-all duration-200 hover:shadow-[0_14px_32px_-8px_rgba(99,102,241,0.7)] hover:-translate-y-0.5 active:scale-95 active:translate-y-0">
            <CheckCircle className="size-4" /> حفظ المجموعة
          </button>
        )}
      </div>
    </div>
  );
}
