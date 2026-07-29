"use client";

import { useMemo } from "react";
import { Droplet, Printer as PrinterIcon } from "lucide-react";
import { formatCurrency } from "@/lib/data";
import type { Product } from "@/lib/data";
import type { ProductBundle } from "@/lib/store";
import { resolveItems } from "@/app/(dashboard)/bundles/bundle-utils";

interface QuickAddPanelProps {
  bundles: ProductBundle[];
  products: Product[];
  onAdd: (bundle: ProductBundle, price: number) => void;
}

interface BundleCard {
  bundle: ProductBundle;
  price: number;
  availableUnits: number;
}

function bundleCards(bundles: ProductBundle[], products: Product[]): BundleCard[] {
  return bundles.map((b) => {
    const price = b.items.reduce((s, it) => {
      const sell = it.sellingPrice ?? products.find((p) => p.id === it.productId)?.sellingPrice ?? 0;
      return s + sell * it.quantity;
    }, 0) * (1 - b.discount / 100);
    const availableUnits = b.items.length === 0 ? 0 : Math.min(
      ...b.items.map((it) => {
        const prod = products.find((p) => p.id === it.productId);
        return prod ? Math.floor(prod.stock / it.quantity) : 0;
      })
    );
    return { bundle: b, price, availableUnits };
  });
}

// The business's real quick-add need is two specific bundle shapes: pure ink-refill
// bundles, and full printer+ink+tank combo bundles — not a hardcoded single-category
// chip row. This groups every real bundle by its component composition (using the
// same componentType/resolveItems logic the bundle editor already uses) instead of
// a brittle hardcoded category string.
function groupBundles(bundles: ProductBundle[], products: Product[]) {
  const cards = bundleCards(bundles, products);
  const ink: BundleCard[] = [];
  const combo: BundleCard[] = [];
  for (const card of cards) {
    const resolved = resolveItems(card.bundle.items, products);
    const hasPrinter = resolved.some((i) => i.type === "printer");
    (hasPrinter ? combo : ink).push(card);
  }
  return { ink, combo };
}

function BundleChip({ card, onAdd }: { card: BundleCard; onAdd: (bundle: ProductBundle, price: number) => void }) {
  const inStock = card.availableUnits > 0;
  return (
    <button
      type="button"
      disabled={!inStock}
      onClick={() => onAdd(card.bundle, card.price)}
      className={`group flex flex-col gap-1.5 p-3 rounded-2xl border text-start transition-all active:scale-95 ${
        inStock ? "bg-white border-indigo-100 hover:border-indigo-400 hover:shadow-md cursor-pointer" : "bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed"
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="text-sm sm:text-[length:var(--text-base)] font-black text-slate-800 leading-snug">{card.bundle.name}</span>
        <span className={`shrink-0 text-xs sm:text-[length:var(--text-sm)] font-bold px-2 py-0.5 rounded-full ${
          card.availableUnits > 3 ? "bg-emerald-50 text-emerald-700" : card.availableUnits > 0 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-600"
        }`}>
          {inStock ? card.availableUnits : "✕"}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[length:var(--text-base)] sm:text-base font-black text-indigo-600">{formatCurrency(card.price)}</span>
        <span className={`text-xs sm:text-[length:var(--text-sm)] font-bold px-2.5 py-1 rounded-lg transition-colors ${
          inStock ? "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white" : "bg-slate-100 text-slate-400"
        }`}>
          + إضافة
        </span>
      </div>
    </button>
  );
}

export function QuickAddPanel({ bundles, products, onAdd }: QuickAddPanelProps) {
  const { ink, combo } = useMemo(() => groupBundles(bundles, products), [bundles, products]);

  if (bundles.length === 0) return null;

  return (
    <div className="space-y-4">
      {combo.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shrink-0">
              <PrinterIcon className="size-3.5 text-white" />
            </div>
            <span className="text-xs sm:text-sm font-black text-slate-700">حزم كاملة (طابعة + حبر + خزان)</span>
            <span className="text-xs font-bold text-slate-400">({combo.length})</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {combo.map((card) => <BundleChip key={card.bundle.id} card={card} onAdd={onAdd} />)}
          </div>
        </div>
      )}

      {ink.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center shrink-0">
              <Droplet className="size-3.5 text-white" />
            </div>
            <span className="text-xs sm:text-sm font-black text-slate-700">حزم الحبر</span>
            <span className="text-xs font-bold text-slate-400">({ink.length})</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ink.map((card) => <BundleChip key={card.bundle.id} card={card} onAdd={onAdd} />)}
          </div>
        </div>
      )}
    </div>
  );
}
