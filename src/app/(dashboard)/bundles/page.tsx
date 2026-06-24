"use client";
// Bundles list — premium catalog, mobile-first, dual pricing


import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStore, type BundleItem } from "@/lib/store";
import { type Product, formatCurrency } from "@/lib/data";
import { toast } from "sonner";
import { Wave } from "@/components/wave";
import {
  Plus,
  Search,
  Printer,
  Droplet,
  Package,
  Pencil,
  Trash2,
  AlertTriangle,
  ChevronRight
} from "lucide-react";

import {
  type ResolvedItem,
  colorStyles,
  resolveItems,
  itemSell,
  itemCost,
  typeOrder
} from "./bundle-utils";

function ItemIcon({ type, colorKey }: { type: ResolvedItem["type"]; colorKey: string }) {
  const cs = colorStyles[colorKey];
  if (type === "printer") return <Printer className="size-5 text-slate-500 shrink-0" />;
  if (type === "tank") return <Droplet className="size-5 text-blue-400 shrink-0" />;
  if (cs) return (
    <div
      className="size-3.5 rounded-full shrink-0 shadow-sm"
      style={{ backgroundColor: cs.dot }}
    />
  );
  return <Package className="size-5 text-slate-400 shrink-0" />;
}

export default function BundlesPage() {
  const { bundles, products, deleteBundle, addBundle } = useStore();
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return search
      ? bundles.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))
      : bundles;
  }, [bundles, search]);

  const totalValue = useMemo(() => {
    return bundles.reduce((sum, bundle) => {
      const items = resolveItems(bundle.items, products);
      const raw = items.reduce((s, it) => s + itemSell(it, it.product) * it.quantity, 0);
      return sum + raw * (1 - bundle.discount / 100);
    }, 0);
  }, [bundles, products]);

  function handleDelete(bundle: (typeof bundles)[0]) {
    const snapshot = { name: bundle.name, description: bundle.description, items: bundle.items, discount: bundle.discount };
    deleteBundle(bundle.id);
    toast.success(`تم حذف "${bundle.name}"`, {
      duration: 5000,
      action: {
        label: "تراجع",
        onClick: () => addBundle(snapshot),
      },
    });
  }

  return (
    <div className="pb-32 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/30 min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">المجموعات الجاهزة</h1>
            <p className="mt-2 text-base font-medium text-slate-500 max-w-lg leading-relaxed">
              قم بتنظيم المنتجات في باقات وحزم مسبقة لسرعة إضافتها في الفواتير.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {bundles.length > 0 && (
              <div className="flex items-center justify-center gap-4 bg-white/80 backdrop-blur-md border border-slate-200/60 px-5 py-3 rounded-2xl shadow-sm w-full sm:w-auto">
                <div className="flex items-baseline gap-1.5">
                  <strong className="text-xl font-black text-slate-900">{bundles.length}</strong>
                  <span className="text-sm font-bold text-slate-500">مجموعة</span>
                </div>
                <div className="w-px h-6 bg-slate-200"></div>
                <span className="font-mono font-black text-lg text-indigo-600">{formatCurrency(totalValue)}</span>
              </div>
            )}
            <button
              className="w-full sm:w-auto h-12 px-6 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-[0_8px_20px_-6px_rgba(79,70,229,0.4)] flex items-center justify-center gap-2"
              onClick={() => router.push("/bundles/new")}
            >
              <Plus className="size-5" />
              <span>مجموعة جديدة</span>
            </button>
          </div>
        </div>

        {/* Search */}
        {bundles.length > 0 && (
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
              <Search className="size-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="البحث في المجموعات..."
              className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pr-12 pl-4 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
            />
          </div>
        )}

        {/* Content */}
        <div>
          {bundles.length === 0 ? (
            <div className="bg-white/60 backdrop-blur-xl border border-slate-200/60 rounded-[2rem] py-24 px-6 text-center shadow-sm">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Package className="size-10 text-slate-400" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">لا توجد مجموعات بعد</h3>
              <p className="mt-3 text-base font-medium text-slate-500 max-w-md mx-auto leading-relaxed">
                أنشئ مجموعات تضم طابعات وأحبار وخزانات لإضافتها دفعة واحدة للفواتير.
              </p>
              <button
                className="mt-8 h-12 px-8 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-[0_8px_20px_-6px_rgba(79,70,229,0.4)] inline-flex items-center justify-center gap-2"
                onClick={() => router.push("/bundles/new")}
              >
                <Plus className="size-5" />
                <span>إنشاء أول مجموعة</span>
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground text-lg">
              لا توجد نتائج مطابقة لـ &ldquo;{search}&rdquo;
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {filtered.map(bundle => {
                const resolved = resolveItems(bundle.items, products);
                const broken = resolved.some(item => !item.product);
                const hasPrinter = resolved.some(it => it.type === "printer");

                const rawSell = resolved.reduce((s, it) => s + itemSell(it, it.product) * it.quantity, 0);
                const totalSell = rawSell * (1 - bundle.discount / 100);
                const rawCost = resolved.reduce((s, it) => s + itemCost(it, it.product) * it.quantity, 0);
                
                const margin = rawSell > 0 ? ((rawSell - rawCost) / rawSell * 100) : 0;
                const marginPercent = Math.max(0, Math.min(100, margin));

                return (
                  <div
                    key={bundle.id}
                    className={`bg-white rounded-[2rem] border border-slate-200/60 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col ${
                      broken ? "ring-2 ring-rose-400" : ""
                    }`}
                  >
                    {/* Header Strip */}
                    <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-slate-100 bg-slate-50/50">
                      <div className="flex items-start gap-5 min-w-0">
                        <div
                          className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                            hasPrinter
                              ? "bg-slate-800 text-white"
                              : "bg-gradient-to-br from-cyan-500 via-pink-500 to-yellow-500 text-white"
                          }`}
                        >
                          {hasPrinter ? <Printer className="size-7" /> : <Droplet className="size-7" />}
                        </div>
                        <div className="min-w-0 pt-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-black text-xl text-slate-900 tracking-tight truncate">
                              {bundle.name}
                            </h2>
                            {broken && (
                              <span className="bg-rose-50 text-rose-600 text-xs font-bold py-1 px-2.5 flex items-center gap-1.5 rounded-lg border border-rose-100">
                                <AlertTriangle className="size-4" />
                                <span>يحتوي منتجات محذوفة</span>
                              </span>
                            )}
                          </div>
                          {bundle.description && (
                            <p className="text-slate-500 text-sm mt-2 max-w-sm leading-relaxed">
                              {bundle.description}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center md:items-start gap-2 shrink-0 md:ms-auto">
                        <button
                          className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm"
                          onClick={() => router.push(`/bundles/${bundle.id}/edit`)}
                          title="تعديل"
                        >
                          <Pencil className="size-5" />
                        </button>
                        <button
                          className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all shadow-sm"
                          onClick={() => handleDelete(bundle)}
                          title="حذف"
                        >
                          <Trash2 className="size-5" />
                        </button>
                      </div>
                    </div>

                    {/* Components List */}
                    <div className="p-6 md:p-8 flex-1 bg-white">
                      <h4 className="text-xs font-black text-slate-400 mb-4 uppercase tracking-wider">محتويات المجموعة</h4>
                      <div className="space-y-3">
                        {resolved.map((c, idx) => {
                          const cs = colorStyles[c.colorKey];
                          const sell = itemSell(c, c.product);
                          const cost = itemCost(c, c.product);
                          const isDeleted = !c.product;

                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors shadow-sm"
                              style={{ opacity: isDeleted ? 0.6 : 1 }}
                            >
                              <div className="flex items-center gap-4 min-w-0">
                                <div className="w-10 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center shrink-0">
                                  <ItemIcon type={c.type} colorKey={c.colorKey} />
                                </div>
                                <div className="min-w-0">
                                  <span className={`font-bold text-sm truncate block ${isDeleted ? "line-through text-rose-500" : "text-slate-900"}`}>
                                    {isDeleted ? `${c.productName} (محذوف)` : (c.product?.name || c.productName)}
                                  </span>
                                  {!isDeleted && (
                                    <span className="text-xs text-slate-500 font-mono font-medium mt-0.5 block">
                                      {c.product?.sku || "No SKU"}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-6 shrink-0">
                                <div className="text-center bg-white rounded-xl px-4 py-2 border border-slate-200 shadow-sm">
                                  <span className="text-[10px] font-bold text-slate-400 block mb-0.5 uppercase tracking-wider">الكمية</span>
                                  <span className="font-black text-base font-mono text-indigo-600">×{c.quantity}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Financial Footer */}
                    <div className="p-6 md:p-8 bg-slate-50/50 border-t border-slate-100 space-y-6">
                      <div className="grid grid-cols-2 gap-6 pb-6 border-b border-slate-200/60">
                        <div>
                          <span className="text-xs font-bold text-slate-500 block mb-1 uppercase tracking-wider">سعر التكلفة الإجمالي</span>
                          <span className="font-black text-2xl font-mono text-slate-800 tracking-tight">{formatCurrency(rawCost)}</span>
                        </div>
                        <div className="text-end">
                          <div className="flex items-center justify-end gap-2 mb-1">
                            {bundle.discount > 0 && (
                              <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                خصم {bundle.discount}%
                              </span>
                            )}
                            <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">سعر المبيع</span>
                          </div>
                          <span className="font-black text-3xl font-mono text-indigo-600 tracking-tight">{formatCurrency(totalSell)}</span>
                        </div>
                      </div>

                      {/* Margin Progress Indicator */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm font-black">
                          <span className="text-slate-500">هامش الربح المتوقع</span>
                          <span className={margin >= 20 ? 'text-emerald-600' : margin >= 0 ? 'text-amber-500' : 'text-rose-600'}>
                            {margin.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${margin >= 20 ? 'bg-emerald-500' : margin >= 0 ? 'bg-amber-400' : 'bg-rose-500'}`}
                            style={{ width: `${marginPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
