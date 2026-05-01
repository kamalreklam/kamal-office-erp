"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, Plus, Printer, Droplets, Package } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/data";
import {
  getColorKey, detectType, resolveItems, itemSell,
  colorStyles,
} from "@/app/bundles/page";

const typeOrder = ["printer", "ink", "tank", "other"] as const;

export function MobileBundles() {
  const { bundles, products } = useStore();
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = search
    ? bundles.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))
    : bundles;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Stats */}
      <div className="rounded-2xl p-4 text-center" style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}>
        <p style={{ fontSize: 26, fontWeight: 800, color: "var(--primary)" }}>{bundles.length}</p>
        <p style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 600 }}>مجموعة</p>
      </div>

      {/* Add button */}
      <button
        onClick={() => router.push("/bundles/new")}
        style={{ width: "100%", height: 52, borderRadius: 16, fontSize: 17, fontWeight: 800, background: "var(--primary)", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
      >
        <Plus style={{ width: 20, height: 20 }} /> مجموعة جديدة
      </button>

      {/* Search */}
      {bundles.length > 0 && (
        <input
          type="text"
          placeholder="ابحث عن مجموعة..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-2xl border-2 px-4"
          style={{ height: 48, fontSize: 16, background: "var(--surface-1)", borderColor: "var(--border-default)", color: "var(--text-primary)", outline: "none" }}
        />
      )}

      {/* Empty state */}
      {bundles.length === 0 ? (
        <div className="rounded-3xl p-10 text-center" style={{ background: "var(--surface-1)" }}>
          <Layers className="mx-auto h-10 w-10 mb-3" style={{ color: "var(--text-muted)", opacity: 0.3 }} />
          <p style={{ fontSize: 18, color: "var(--text-muted)" }}>لا توجد مجموعات</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center py-6" style={{ fontSize: 15, color: "var(--text-muted)" }}>لا توجد نتائج</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(bundle => {
            const resolved = resolveItems(bundle.items, products);
            const hasPrinter = resolved.some(it => it.type === "printer");
            const rawSell = resolved.reduce((s, it) => s + itemSell(it, it.product) * it.quantity, 0);
            const totalSell = rawSell * (1 - bundle.discount / 100);

            const groups = typeOrder
              .map(t => ({ type: t, items: resolved.filter(it => it.type === t) }))
              .filter(g => g.items.length > 0);

            return (
              <button
                key={bundle.id}
                onClick={() => router.push(`/bundles/${bundle.id}/edit`)}
                className="w-full rounded-2xl overflow-hidden text-right"
                style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}
              >
                {/* Card header */}
                <div className="flex items-center gap-3 p-4" style={{ background: hasPrinter ? "rgba(71,85,105,0.08)" : "linear-gradient(135deg, rgba(6,182,212,0.08), rgba(236,72,153,0.08), rgba(234,179,8,0.08))" }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
                    background: hasPrinter ? "#475569" : "linear-gradient(135deg, #06b6d4, #ec4899, #eab308)",
                    color: "white", flexShrink: 0,
                  }}>
                    {hasPrinter ? <Printer style={{ width: 20, height: 20 }} /> : <Droplets style={{ width: 20, height: 20 }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)" }}>{bundle.name}</p>
                    {bundle.description && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{bundle.description}</p>}
                  </div>
                </div>

                {/* Items */}
                <div className="px-3 pb-3 pt-2 space-y-1">
                  {groups.map(group =>
                    group.items.map((it, i) => {
                      const cs = colorStyles[it.colorKey];
                      return (
                        <div key={i} className="flex items-center gap-2.5 rounded-xl px-3 py-2" style={{ background: "var(--surface-2)" }}>
                          {it.type === "printer"
                            ? <Printer style={{ width: 14, height: 14, color: "#64748b", flexShrink: 0 }} />
                            : it.type === "tank"
                            ? <Droplets style={{ width: 14, height: 14, color: "#60a5fa", flexShrink: 0 }} />
                            : cs
                            ? <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: cs.dot, flexShrink: 0 }} />
                            : <Package style={{ width: 14, height: 14, color: "var(--text-muted)", flexShrink: 0 }} />
                          }
                          <span className="flex-1 truncate" style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                            {it.product?.name || it.productName}
                          </span>
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>×{it.quantity}</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)" }}>
                            {formatCurrency(itemSell(it, it.product))}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t px-4 py-3" style={{ borderColor: "var(--border-subtle)" }}>
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{resolved.length} منتجات{bundle.discount > 0 ? ` · خصم ${bundle.discount}%` : ""}</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: "var(--primary)" }}>{formatCurrency(totalSell)} / طقم</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
