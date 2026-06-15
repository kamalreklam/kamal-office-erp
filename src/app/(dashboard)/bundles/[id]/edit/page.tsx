"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Printer, Droplet, Package, ArrowRight, Layers, Search, Plus, Minus, X, Trash2, CheckCircle } from "lucide-react";
import { useStore, type BundleItem } from "@/lib/store";
import { type Product, formatCurrency } from "@/lib/data";
import { toast } from "sonner";
import { useDebounce } from "@/lib/use-debounce";
import { Wave } from "@/components/wave";
import {
  getColorKey, detectType, resolveItems, itemSell, itemCost,
  colorStyles,
} from "@/app/(dashboard)/bundles/bundle-utils";

const typeOrder = ["printer", "ink", "tank", "other"] as const;
const typeLabels: Record<string, string> = {
  printer: "طابعة", ink: "حبر", tank: "خزان", other: "أخرى",
};

function ProductTypeIcon({ product, className = "size-4" }: { product: Product; className?: string }) {
  const type = detectType(product);
  const colorKey = getColorKey(product.name);
  const cs = colorStyles[colorKey];
  if (type === "printer") return <Printer className={`${className} text-slate-500 shrink-0`} />;
  if (type === "tank") return <Droplet className={`${className} text-blue-400 shrink-0`} />;
  if (cs) return <div className="size-3 rounded-full shrink-0" style={{ backgroundColor: cs.dot }} />;
  return <Package className={`${className} text-slate-400 shrink-0 opacity-50`} />;
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
  const [productSearch, setProductSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("الكل");

  const debouncedSearch = useDebounce(productSearch);

  useEffect(() => {
    if (bundle && !loaded) {
      setName(bundle.name);
      setDescription(bundle.description || "");
      setDiscount(bundle.discount);
      setItems(bundle.items.map(it => ({
        ...it,
        componentType: it.componentType ?? (products.find(p => p.id === it.productId) ? detectType(products.find(p => p.id === it.productId)!) : "other"),
        costPrice: it.costPrice ?? products.find(p => p.id === it.productId)?.costPrice ?? 0,
        sellingPrice: it.sellingPrice ?? products.find(p => p.id === it.productId)?.sellingPrice ?? 0,
      })));
      setLoaded(true);
    }
  }, [bundle, loaded, products]);

  const categories = useMemo(() => ["الكل", ...Array.from(new Set(products.map(p => p.category))).sort()], [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !debouncedSearch || p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || p.category.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchCat = activeCategory === "الكل" || p.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [products, debouncedSearch, activeCategory]);

  if (!bundle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4" dir="rtl">
        <p className="text-slate-500 font-semibold">المجموعة المطلوبة غير موجودة</p>
        <button
          onClick={() => router.push("/bundles")}
          className="h-12 px-8 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-[0_8px_20px_-6px_rgba(79,70,229,0.4)]"
        >
          <span>العودة للمجموعات</span>
        </button>
      </div>
    );
  }

  function addProduct(product: Product) {
    const existing = items.findIndex(i => i.productId === product.id);
    if (existing >= 0) {
      setItems(prev => prev.map((it, i) => i === existing ? { ...it, quantity: it.quantity + 1 } : it));
    } else {
      setItems(prev => [...prev, {
        productId: product.id, productName: product.name, quantity: 1,
        componentType: detectType(product), costPrice: product.costPrice, sellingPrice: product.sellingPrice,
      }]);
    }
  }

  function adjustQty(index: number, delta: number) {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, quantity: Math.max(1, it.quantity + delta) } : it));
  }

  // Set unit selling price for items in builder
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
  const marginPercent = Math.max(0, Math.min(100, margin));

  const groups = typeOrder
    .map(t => ({ type: t, label: typeLabels[t], items: resolved.filter(it => it.type === t) }))
    .filter(g => g.items.length > 0);
  const multiType = groups.length > 1;
  const hasPrinter = resolved.some(it => it.type === "printer");

  function handleSave() {
    if (!name.trim()) { toast.error("يرجى إدخال اسم المجموعة"); return; }
    const validItems = items.filter(i => i.productId);
    if (validItems.length === 0) { toast.error("يرجى إضافة منتج واحد على الأقل"); return; }
    updateBundle(id, { name, description, discount, items: validItems });
    toast.success("تم تحديث المجموعة بنجاح");
    router.push("/bundles");
  }

  return (
    <div className="pb-32 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/30 min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 space-y-8">
        {/* Page header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/bundles")}
            className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300 transition-all shadow-sm flex items-center justify-center active:scale-95"
            title="العودة"
          >
            <ArrowRight className="size-5" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
            <Layers className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">تعديل المجموعة</h1>
            <p className="text-sm font-bold text-slate-500 mt-0.5">تعديل وتحديث حزمة: {bundle.name}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* LEFT: Builder */}
          <div className="xl:col-span-8 space-y-8">
            {/* Section A: Info */}
            <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-slate-100 shadow-sm space-y-6">
              <h3 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-4">معلومات المجموعة</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">اسم المجموعة <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    placeholder="مثال: Epson L3250 CMYK Kit"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">خصم المجموعة %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discount === 0 ? "" : discount}
                    placeholder="0"
                    onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-black text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">الوصف (اختياري)</label>
                <textarea
                  rows={2}
                  placeholder="اكتب وصفاً مختصراً للمجموعة..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm min-h-[100px]"
                />
              </div>
            </div>

            {/* Section B: Selected items */}
            {items.length > 0 && (
              <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h3 className="text-lg font-black text-slate-900">المنتجات المختارة</h3>
                  <span className="bg-indigo-50 text-indigo-700 text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-wider">{items.length} عنصر</span>
                </div>
                
                <div className="space-y-4">
                  {groups.map(group => (
                    <div key={group.type} className="space-y-3">
                      {multiType && (
                        <div className="flex items-center gap-3 py-2">
                          <div className="h-px flex-1 bg-slate-200" />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-200">
                            {group.label}
                          </span>
                          <div className="h-px flex-1 bg-slate-200" />
                        </div>
                      )}
                      {group.items.map((item, idx) => {
                        const globalIndex = items.findIndex(i => i.productId === item.productId);
                        const cs = colorStyles[item.colorKey];
                        const sell = itemSell(item, item.product);
                        const cost = itemCost(item, item.product);
                        const rowMargin = sell > 0 ? ((sell - cost) / sell * 100) : 0;
                        const underCost = sell < cost;

                        return (
                          <div
                            key={idx}
                            className={`flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-4 rounded-2xl bg-white border transition-all shadow-sm ${underCost ? "border-rose-300 ring-2 ring-rose-500/10" : "border-slate-200 hover:border-slate-300"}`}
                          >
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                              <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center shrink-0">
                                {cs ? (
                                  <div className="size-4 rounded-full shadow-sm" style={{ backgroundColor: cs.dot }} />
                                ) : item.type === "printer" ? (
                                  <Printer className="size-6 text-slate-500" />
                                ) : item.type === "tank" ? (
                                  <Droplet className="size-6 text-blue-400" />
                                ) : (
                                  <Package className="size-6 text-slate-400" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-sm text-slate-900 block truncate">
                                  {item.product?.name || item.productName}
                                </span>
                                <span className="text-xs font-medium text-slate-500 font-mono mt-0.5 block">
                                  {item.product?.sku || "No SKU"}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between lg:justify-end gap-6 flex-wrap">
                              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 shadow-sm">
                                <button
                                  onClick={() => adjustQty(globalIndex, -1)}
                                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors shadow-sm active:scale-95"
                                >
                                  <Minus className="size-4" />
                                </button>
                                <span className="w-10 text-center text-base font-black font-mono text-indigo-600">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => adjustQty(globalIndex, 1)}
                                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors shadow-sm active:scale-95"
                                >
                                  <Plus className="size-4" />
                                </button>
                              </div>

                              <div className="flex items-center gap-6 bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm">
                                <div className="space-y-1 text-center">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">سعر التكلفة</span>
                                  <span className="block text-sm font-black text-slate-700 font-mono">
                                    {formatCurrency(cost)}
                                  </span>
                                </div>
                                <div className="w-px h-8 bg-slate-200" />
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">سعر المبيع</span>
                                  <input
                                    type="number"
                                    value={item.sellingPrice ?? 0}
                                    onChange={e => setSellPrice(globalIndex, parseFloat(e.target.value) || 0)}
                                    className="w-28 text-center font-black font-mono py-1.5 px-3 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-lg bg-white transition-all text-sm shadow-sm"
                                  />
                                </div>
                              </div>
                              
                              <button
                                onClick={() => removeItem(globalIndex)}
                                className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border hover:border-rose-200 transition-all shadow-sm border border-transparent"
                                title="حذف"
                              >
                                <Trash2 className="size-5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section C: Product picker */}
            <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-slate-100 shadow-sm space-y-6">
              <h3 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-4">إضافة منتجات</h3>

              {/* Search and filters */}
              <div className="relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="البحث برمز أو اسم المنتج..."
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pr-12 pl-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
                />
              </div>

              {/* Category chips */}
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 custom-scrollbar">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-300 ${
                      activeCategory === cat 
                      ? "bg-slate-800 text-white shadow-sm" 
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Product list grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredProducts.length === 0 ? (
                  <div className="col-span-full text-center py-16 text-slate-400 text-base font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    لا توجد منتجات مطابقة لعملية البحث
                  </div>
                ) : (
                  filteredProducts.map(p => {
                    const already = items.find(it => it.productId === p.id);
                    return (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between p-4 bg-white rounded-2xl transition-all duration-200 border ${
                          already ? "border-indigo-500 shadow-[0_0_0_2px_rgba(79,70,229,0.1)]" : "border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md"
                        }`}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 border border-slate-100">
                            <ProductTypeIcon product={p} className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-sm block truncate text-slate-900" title={p.name}>
                              {p.name}
                            </span>
                            <span className="text-xs font-bold text-slate-400 block mt-0.5 uppercase tracking-wider">
                              {p.category} <span className="mx-1 text-slate-300">•</span> مخزون: <span className="font-mono text-slate-600">{p.stock}</span>
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span className="font-black text-sm text-indigo-600 font-mono">
                            {formatCurrency(p.price)}
                          </span>
                          <button
                            onClick={() => addProduct(p)}
                            className={`h-8 px-4 rounded-xl flex items-center justify-center transition-colors font-bold text-xs ${
                              already 
                              ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100" 
                              : "bg-slate-900 text-white hover:bg-slate-800"
                            }`}
                          >
                            {already ? `+${already.quantity}` : <Plus className="size-4" />}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Summary panel */}
          <div className="xl:col-span-4">
            <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-slate-100 shadow-sm space-y-6 xl:sticky xl:top-8">
              <h3 className="text-xl font-black text-slate-900 border-b border-slate-100 pb-4">معاينة المجموعة</h3>

              <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-start gap-4 pb-4 border-b border-slate-200/60">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                      hasPrinter ? "bg-slate-800 text-white" : "bg-gradient-to-br from-cyan-500 via-pink-500 to-yellow-500 text-white"
                    }`}
                  >
                    {hasPrinter ? <Printer className="size-6" /> : <Droplet className="size-6" />}
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <span className="font-black text-base block truncate text-slate-900">
                      {name || "اسم المجموعة"}
                    </span>
                    {description && (
                      <span className="text-sm font-medium text-slate-500 block truncate max-w-[180px] mt-1">
                        {description}
                      </span>
                    )}
                  </div>
                </div>

                {resolved.length === 0 ? (
                  <div className="text-center py-6 text-sm font-bold text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white">
                    لا توجد منتجات مختارة بعد
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                    {resolved.map((it, i) => {
                      const cs = colorStyles[it.colorKey];
                      return (
                        <div key={i} className="flex items-center justify-between gap-3 text-sm p-3 rounded-xl bg-white border border-slate-100 shadow-sm">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0">
                              {cs ? (
                                <div className="size-2.5 rounded-full shadow-sm" style={{ backgroundColor: cs.dot }} />
                              ) : it.type === "printer" ? (
                                <Printer className="size-4 text-slate-500" />
                              ) : it.type === "tank" ? (
                                <Droplet className="size-4 text-blue-400" />
                              ) : (
                                <Package className="size-4 text-slate-400" />
                              )}
                            </div>
                            <span className="truncate max-w-[140px] font-bold text-slate-700 text-xs">
                              {it.product?.name || it.productName}
                            </span>
                          </div>
                          <span className="text-indigo-600 font-black font-mono">×{it.quantity}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {resolved.length > 0 && (
                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center px-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">التكلفة الإجمالية:</span>
                    <span className="font-black text-lg font-mono text-slate-800">{formatCurrency(totalCost)}</span>
                  </div>
                  <div className="flex justify-between items-center px-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">سعر المبيع الأصلي:</span>
                    <span className="font-black text-lg font-mono text-slate-800">{formatCurrency(totalSell)}</span>
                  </div>
                  
                  {discount > 0 && (
                    <div className="flex justify-between items-center bg-indigo-50 border border-indigo-100 p-4 rounded-2xl">
                      <span className="text-xs font-black text-indigo-700 uppercase tracking-wider">السعر بعد الخصم ({discount}%):</span>
                      <span className="font-black text-2xl font-mono text-indigo-700 tracking-tight">{formatCurrency(totalSellAfterDiscount)}</span>
                    </div>
                  )}
                  
                  {/* Visual Margin bar */}
                  <div className="space-y-3 pt-6 border-t border-slate-100">
                    <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider">
                      <span className="text-slate-500">هامش الربح الصافي:</span>
                      <span className={`font-mono text-lg tracking-tight ${margin >= 20 ? "text-emerald-600" : margin >= 0 ? "text-amber-500" : "text-rose-600"}`}>
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
              )}

              <div className="space-y-3 pt-8 border-t border-slate-100">
                <button onClick={handleSave} className="w-full h-14 px-8 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-[0_8px_20px_-6px_rgba(79,70,229,0.4)] flex items-center justify-center gap-2">
                  <CheckCircle className="size-5" />
                  <span>حفظ التعديلات</span>
                </button>
                <button
                  onClick={() => router.push("/bundles")}
                  className="w-full h-14 px-8 rounded-2xl bg-amber-500 border border-amber-600 text-white font-bold hover:bg-amber-600 active:scale-95 transition-all shadow-md flex items-center justify-center"
                >
                  إلغاء الأمر
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
