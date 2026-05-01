"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/lib/use-debounce";
import { Search, Package, AlertTriangle, BarChart3, Plus, Pencil, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { formatCurrency, getLowStockProducts } from "@/lib/data";
import { toast } from "sonner";
import { DateRangeExportButton, type DateRange } from "@/components/date-range-picker";

export function MobileInventory() {
  const { products, settings, deleteProduct } = useStore();
  const router = useRouter();

  function shareWhatsApp() {
    const lines = [`📦 *تقرير المخزون — ${settings.businessName}*`, `عدد المنتجات: ${products.length}`, ""];
    products.slice(0, 20).forEach((p) => { lines.push(`• ${p.name}: ${p.stock} ${p.unit} (${formatCurrency(p.price)})`); });
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
  }
  const categories = ["الكل", ...Array.from(new Set(products.map((p) => p.category))).sort()];

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [activeCategory, setActiveCategory] = useState("الكل");
  const [showReport, setShowReport] = useState(false);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const q = debouncedSearch.toLowerCase(); const matchSearch = !debouncedSearch || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
      const matchCat = activeCategory === "الكل" || p.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [products, debouncedSearch, activeCategory]);

  const lowStock = getLowStockProducts(products);
  const totalValue = products.reduce((s, p) => s + p.price * p.stock, 0);
  const totalUnits = products.reduce((s, p) => s + p.stock, 0);

  // Category stats for report
  const categoryStats = useMemo(() => {
    const map = new Map<string, { count: number; units: number; value: number }>();
    products.forEach((p) => {
      const stat = map.get(p.category) || { count: 0, units: 0, value: 0 };
      stat.count++;
      stat.units += p.stock;
      stat.value += p.price * p.stock;
      map.set(p.category, stat);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].value - a[1].value);
  }, [products]);

  return (
    <div className="space-y-4" dir="rtl">
      {/* Quick actions */}
      <div className="flex gap-2">
        <button
          onClick={() => router.push("/inventory/new")}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl"
          style={{ height: 52, fontSize: 16, fontWeight: 700, background: "var(--primary)", color: "white", border: "none", cursor: "pointer" }}
        >
          <Plus className="h-5 w-5" /> منتج جديد
        </button>
        <button
          onClick={() => setShowReport(!showReport)}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl"
          style={{
            height: 52, fontSize: 16, fontWeight: 700,
            background: showReport ? "var(--primary)" : "var(--surface-1)",
            color: showReport ? "white" : "var(--primary)",
            border: `2px solid ${showReport ? "var(--primary)" : "var(--border-default)"}`,
            cursor: "pointer",
          }}
        >
          <BarChart3 className="h-5 w-5" /> تقرير
        </button>
      </div>

      {/* Export actions */}
      <div className="flex gap-2">
        <DateRangeExportButton label="تصدير PDF" buttonStyle={{ flex: 1, height: 48, borderRadius: 14, fontSize: 16, fontWeight: 700, background: "var(--surface-1)", color: "var(--primary)", border: "2px solid var(--border-default)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onExport={async (range: DateRange) => {
          try { const { exportInventoryReportPDF } = await import("@/lib/pdf"); await exportInventoryReportPDF(products, range, settings); toast.success("تم التصدير"); } catch { toast.error("فشل التصدير"); }
        }} />
        <button onClick={shareWhatsApp} style={{ flex: 1, height: 48, borderRadius: 14, fontSize: 16, fontWeight: 700, background: "#25D366", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          واتساب
        </button>
      </div>

      {/* Stock Report */}
      <AnimatePresence>
        {showReport && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="rounded-3xl p-5 space-y-4" style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>تقرير المخزون</h3>

              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl p-3 text-center" style={{ background: "var(--surface-2)" }}>
                  <p style={{ fontSize: 26, fontWeight: 800, color: "var(--primary)" }}>{products.length}</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>منتج</p>
                </div>
                <div className="rounded-2xl p-3 text-center" style={{ background: "var(--surface-2)" }}>
                  <p style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)" }}>{totalUnits.toLocaleString("en-US")}</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>وحدة</p>
                </div>
                <div className="rounded-2xl p-3 text-center" style={{ background: "var(--surface-2)" }}>
                  <p style={{ fontSize: 26, fontWeight: 800, color: "var(--green-500)" }}>{formatCurrency(totalValue)}</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>القيمة</p>
                </div>
              </div>

              {/* Low stock alert */}
              {lowStock.length > 0 && (
                <div className="rounded-2xl p-4" style={{ background: "var(--danger-soft)", border: "1px solid rgba(239,68,68,0.15)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5" style={{ color: "var(--red-500)" }} />
                    <span style={{ fontSize: 16, fontWeight: 700, color: "var(--red-500)" }}>{lowStock.length} منتج منخفض المخزون</span>
                  </div>
                  {lowStock.slice(0, 5).map((p) => (
                    <p key={p.id} className="truncate" style={{ fontSize: 14, color: "var(--text-secondary)", paddingRight: 28 }}>
                      {p.name} — {p.stock} {p.unit}
                    </p>
                  ))}
                </div>
              )}

              {/* Category breakdown */}
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>حسب الفئة</p>
                <div className="space-y-2">
                  {categoryStats.map(([cat, stat]) => (
                    <div key={cat} className="flex items-center gap-3 rounded-xl p-3" style={{ background: "var(--surface-2)" }}>
                      <div className="flex-1 min-w-0">
                        <p className="truncate" style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>{cat || "بدون فئة"}</p>
                        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{stat.count} منتج · {stat.units} وحدة</p>
                      </div>
                      <span style={{ fontSize: 16, fontWeight: 800, color: "var(--primary)" }}>{formatCurrency(stat.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
        <input
          type="text"
          placeholder="ابحث عن منتج..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl border-2 pr-12 pl-4"
          style={{ height: 52, fontSize: 18, background: "var(--surface-1)", borderColor: "var(--border-default)", color: "var(--text-primary)", outline: "none" }}
        />
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {categories.map((cat) => {
          const active = activeCategory === cat;
          const count = cat === "الكل" ? products.length : products.filter((p) => p.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5"
              style={{
                fontSize: 14, fontWeight: 700,
                background: active ? "var(--primary)" : "var(--surface-1)",
                color: active ? "white" : "var(--text-secondary)",
                border: active ? "none" : "1px solid var(--border-subtle)",
                cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              {cat}
              <span
                className="rounded-full px-1.5 py-0.5"
                style={{
                  fontSize: 11, fontWeight: 700,
                  background: active ? "rgba(255,255,255,0.2)" : "var(--surface-2)",
                  color: active ? "white" : "var(--text-muted)",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Product count */}
      <p style={{ fontSize: 15, color: "var(--text-muted)" }}>
        {filtered.length} منتج
      </p>

      {/* Product cards */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-3xl p-10 text-center" style={{ background: "var(--surface-1)" }}>
            <Package className="mx-auto h-10 w-10 mb-3" style={{ color: "var(--text-muted)", opacity: 0.3 }} />
            <p style={{ fontSize: 18, color: "var(--text-muted)" }}>لا توجد منتجات</p>
          </div>
        ) : (
          filtered.map((product) => {
            const isLow = product.stock <= product.minStock;
            return (
              <div
                key={product.id}
                className="rounded-2xl p-4"
                style={{
                  background: "var(--surface-1)",
                  border: isLow ? "2px solid var(--red-500)" : "1px solid var(--glass-border)",
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl"
                    style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
                  >
                    <Package className="h-8 w-8" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.4, textAlign: "center" }}>
                      {product.name}
                    </p>
                    <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{product.category}</p>
                  </div>
                  <div className="text-left shrink-0">
                    <p style={{ fontSize: 20, fontWeight: 800, color: "var(--primary)" }}>
                      {formatCurrency(product.price)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                  <div className="flex items-center gap-2">
                    {isLow && <AlertTriangle className="h-4 w-4" style={{ color: "var(--red-500)" }} />}
                    <span style={{
                      fontSize: 15, fontWeight: 700,
                      color: isLow ? "var(--red-500)" : "var(--text-primary)",
                    }}>
                      {product.stock} {product.unit}
                    </span>
                    {isLow && <span style={{ fontSize: 12, color: "var(--red-500)" }}>(حد: {product.minStock})</span>}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-muted)" }}>
                    القيمة: {formatCurrency(product.price * product.stock)}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => router.push(`/inventory/${product.id}/edit`)}
                      style={{ height: 34, width: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--accent-soft)", color: "var(--primary)", border: "none", cursor: "pointer" }}>
                      <Pencil style={{ width: 15, height: 15 }} />
                    </button>
                    <button onClick={() => { deleteProduct(product.id); toast.success("تم حذف المنتج"); }}
                      style={{ height: 34, width: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--danger-soft)", color: "var(--red-500)", border: "none", cursor: "pointer" }}>
                      <Trash2 style={{ width: 15, height: 15 }} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
