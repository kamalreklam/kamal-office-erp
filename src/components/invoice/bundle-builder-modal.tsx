"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Layers, X, Search, Trash2 } from "lucide-react";
import type { Product } from "@/lib/data";

interface CustomBundleItem {
  productId: string;
  productName: string;
  quantity: number;
}

interface BundleBuilderModalProps {
  open: boolean;
  onClose: () => void;
  products: Product[];
  onConfirm: (name: string, price: number, items: CustomBundleItem[]) => void;
}

// One-off custom bundle builder for ad-hoc combos that aren't saved as a reusable
// product bundle — slides open inline below the trigger button rather than a popup,
// matching the app-wide no-popup pattern (dialogs are reserved for destructive
// confirmations only).
export function BundleBuilderModal({ open, onClose, products, onConfirm }: BundleBuilderModalProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [items, setItems] = useState<CustomBundleItem[]>([]);
  const [search, setSearch] = useState("");

  function reset() {
    setName(""); setPrice(""); setItems([]); setSearch("");
  }

  function handleConfirm() {
    if (!name || !price || items.length === 0) return;
    onConfirm(name, Number(price), items);
    reset();
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 shadow-sm mt-3">
            <div className="p-4 sm:p-6 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 shrink-0 rounded-2xl bg-fuchsia-100 text-fuchsia-600 flex items-center justify-center">
                  <Layers className="size-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900">تكوين حزمة عروض مخصصة</h2>
                  <p className="text-xs sm:text-sm font-bold text-slate-500">ادمج عدة منتجات في صنف واحد يخصم من المخزون تلقائياً</p>
                </div>
              </div>
              <button onClick={handleClose} className="w-10 h-10 shrink-0 rounded-full bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:bg-slate-100 transition-colors active:scale-95">
                <X className="size-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">اسم العرض / الحزمة</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: عرض طابعة + 4 أحبار" className="w-full bg-white border border-slate-200 rounded-2xl h-14 px-4 font-bold text-slate-800 focus:outline-none focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-500/10 transition-all" />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">السعر الإجمالي للحزمة</label>
                  <input type="number" inputMode="decimal" min="0" value={price} onChange={(e) => setPrice(parseFloat(e.target.value) || "")} placeholder="سعر العرض" className="w-full bg-white border border-slate-200 rounded-2xl h-14 px-4 font-mono font-black text-slate-800 focus:outline-none focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-500/10 transition-all" />
                </div>
              </div>

              <div className="border border-slate-200 rounded-[1.5rem] bg-white">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center rounded-t-[1.5rem]">
                  <span className="font-black text-slate-700">مكونات الحزمة ({items.length})</span>
                </div>

                <div className="p-4 space-y-3">
                  {items.map((comp, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-white border border-slate-100 p-3 rounded-xl shadow-sm">
                      <div className="flex-1 font-bold text-sm text-slate-800">{comp.productName}</div>
                      <div className="flex items-center gap-2 shrink-0">
                        <label className="text-[11px] font-black text-slate-400">الكمية:</label>
                        <input
                          type="number" inputMode="numeric" min="1" value={comp.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            setItems((prev) => prev.map((c, i) => (i === idx ? { ...c, quantity: val } : c)));
                          }}
                          className="w-16 h-9 text-center bg-slate-50 border border-slate-200 rounded-lg font-mono font-black text-sm"
                        />
                        <button onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="relative mt-4">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث عن منتج لإضافته للحزمة..." className="w-full bg-slate-50 border border-slate-200 rounded-xl h-12 pr-10 pl-4 text-sm font-bold focus:outline-none focus:border-fuchsia-500" />

                    {search.trim() && (
                      <div className="absolute top-full mt-2 right-0 w-full bg-white border border-slate-200 shadow-[0_10px_40px_rgba(0,0,0,0.15)] rounded-xl z-50 max-h-48 overflow-y-auto p-2">
                        {products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())).map((p) => (
                          <button
                            type="button"
                            key={p.id}
                            onClick={() => {
                              setItems((prev) => {
                                const exists = prev.find((i) => i.productId === p.id);
                                if (exists) return prev.map((i) => (i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i));
                                return [...prev, { productId: p.id, productName: p.name, quantity: 1 }];
                              });
                              setSearch("");
                            }}
                            className="w-full p-2 hover:bg-fuchsia-50 hover:text-fuchsia-700 rounded-lg text-sm font-bold transition-colors flex justify-between text-start"
                          >
                            <span>{p.name}</span>
                            <span className="text-slate-400 font-mono text-xs">متوفر: {p.stock}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={handleConfirm} className="flex-1 h-14 rounded-2xl bg-fuchsia-600 text-white font-black hover:bg-fuchsia-700 transition-colors shadow-md shadow-fuchsia-600/20 active:scale-[0.98]">
                  إضافة الحزمة للفاتورة
                </button>
                <button onClick={handleClose} className="px-8 h-14 rounded-2xl bg-white text-slate-600 font-bold border border-slate-200 hover:bg-slate-50 transition-colors active:scale-95">
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
