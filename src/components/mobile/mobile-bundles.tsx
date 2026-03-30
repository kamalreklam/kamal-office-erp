"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Layers, Droplets, Plus, X, Search, Package } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatCurrency, type Product } from "@/lib/data";
import { toast } from "sonner";

const colorConfig: Record<string, { label: string; dot: string }> = {
  C: { label: "Cyan", dot: "#06b6d4" }, M: { label: "Magenta", dot: "#ec4899" },
  Y: { label: "Yellow", dot: "#eab308" }, BK: { label: "Black", dot: "#1f2937" },
  LC: { label: "Light Cyan", dot: "#38bdf8" }, LM: { label: "Light Magenta", dot: "#fb7185" },
};

function getColorKey(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("light cyan")) return "LC"; if (n.includes("light magenta")) return "LM";
  if (n.includes("cyan")) return "C"; if (n.includes("magenta")) return "M";
  if (n.includes("yellow")) return "Y"; if (n.includes("black")) return "BK"; return "BK";
}

export function MobileBundles() {
  const { bundles, products, addBundle } = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  function handleCreateBundle() {
    if (!newName.trim()) { toast.error("أدخل اسم المجموعة"); return; }
    if (selectedProducts.length === 0) { toast.error("اختر منتج واحد على الأقل"); return; }
    addBundle({
      name: newName, description: newDesc,
      items: selectedProducts.map((pid) => {
        const p = products.find((pr) => pr.id === pid);
        return { productId: pid, productName: p?.name || "", quantity: 1 };
      }),
      discount: 0,
    });
    toast.success("تم إنشاء المجموعة");
    setShowAdd(false); setNewName(""); setNewDesc(""); setSelectedProducts([]);
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="rounded-2xl p-4 text-center" style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}>
        <p style={{ fontSize: 26, fontWeight: 800, color: "var(--primary)" }}>{bundles.length}</p>
        <p style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 600 }}>مجموعة</p>
      </div>

      {/* Create bundle */}
      <button onClick={() => setShowAdd(!showAdd)}
        style={{ width: "100%", height: 52, borderRadius: 16, fontSize: 17, fontWeight: 800, background: "var(--primary)", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <Plus style={{ width: 20, height: 20 }} /> مجموعة جديدة
      </button>

      {showAdd && (
        <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="اسم المجموعة..."
            style={{ width: "100%", height: 48, borderRadius: 12, fontSize: 16, padding: "0 14px", background: "var(--surface-2)", color: "var(--text-primary)", border: "1px solid var(--border-default)", outline: "none" }} />
          <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="وصف (اختياري)..."
            style={{ width: "100%", height: 48, borderRadius: 12, fontSize: 16, padding: "0 14px", background: "var(--surface-2)", color: "var(--text-primary)", border: "1px solid var(--border-default)", outline: "none" }} />
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)" }}>اختر المنتجات:</p>
          <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
            {products.map((p) => {
              const selected = selectedProducts.includes(p.id);
              return (
                <button key={p.id} onClick={() => setSelectedProducts((prev) => selected ? prev.filter((id) => id !== p.id) : [...prev, p.id])}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, fontSize: 14, fontWeight: 600, textAlign: "right",
                    background: selected ? "var(--accent-soft)" : "var(--surface-2)", border: selected ? "2px solid var(--primary)" : "1px solid var(--border-subtle)", color: "var(--text-primary)", cursor: "pointer" }}>
                  <Package style={{ width: 16, height: 16, color: selected ? "var(--primary)" : "var(--text-muted)", flexShrink: 0 }} />
                  <span className="truncate" style={{ flex: 1 }}>{p.name}</span>
                </button>
              );
            })}
          </div>
          <button onClick={handleCreateBundle}
            style={{ width: "100%", height: 48, borderRadius: 12, fontSize: 16, fontWeight: 700, background: "var(--green-500)", color: "white", border: "none", cursor: "pointer" }}>
            حفظ المجموعة ({selectedProducts.length} منتج)
          </button>
        </div>
      )}

      {bundles.length === 0 ? (
        <div className="rounded-3xl p-10 text-center" style={{ background: "var(--surface-1)" }}>
          <Layers className="mx-auto h-10 w-10 mb-3" style={{ color: "var(--text-muted)", opacity: 0.3 }} />
          <p style={{ fontSize: 18, color: "var(--text-muted)" }}>لا توجد مجموعات</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bundles.map((bundle) => {
            const sortedItems = [...bundle.items]
              .map((bi) => { const p = products.find((pr) => pr.id === bi.productId); return { ...bi, product: p, ck: getColorKey(p?.name || bi.productName) }; })
              .sort((a, b) => ["C", "M", "Y", "BK", "LC", "LM"].indexOf(a.ck) - ["C", "M", "Y", "BK", "LC", "LM"].indexOf(b.ck));

            return (
              <div key={bundle.id} className="rounded-2xl overflow-hidden" style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}>
                <div className="flex items-center gap-3 p-4" style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.1), rgba(236,72,153,0.1), rgba(234,179,8,0.1))" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #06b6d4, #ec4899, #eab308)", color: "white" }}>
                    <Droplets style={{ width: 22, height: 22 }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>{bundle.name}</p>
                    {bundle.description && <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{bundle.description}</p>}
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  {sortedItems.map((bi) => {
                    const cfg = colorConfig[bi.ck] || colorConfig.BK;
                    const outOfStock = bi.product && bi.product.stock <= 0;
                    return (
                      <div key={bi.productId} className="flex items-center gap-3 rounded-xl p-3" style={{ background: "var(--surface-2)", opacity: outOfStock ? 0.4 : 1 }}>
                        <div style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: cfg.dot, flexShrink: 0 }} />
                        <div className="flex-1 min-w-0">
                          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{cfg.label}</p>
                          <p style={{ fontSize: 13, color: outOfStock ? "var(--red-500)" : "var(--text-muted)" }}>
                            {outOfStock ? "نفذ المخزون" : `المخزون: ${bi.product?.stock || 0}`}
                          </p>
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 800, color: "var(--primary)" }}>{formatCurrency(bi.product?.price || 0)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
