"use client";

import { useMemo } from "react";
import { BarChart3, TrendingUp, Package, Users } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/data";
import { toast } from "sonner";
import { DateRangeExportButton, type DateRange } from "@/components/date-range-picker";

export function MobileReports() {
  const { invoices, products, clients, settings } = useStore();

  const activeInvoices = useMemo(() => invoices.filter((i) => i.status !== "ملغاة" && i.status !== "مسودة"), [invoices]);
  const totalRevenue = useMemo(() => activeInvoices.reduce((s, i) => s + i.total, 0), [activeInvoices]);

  const topClients = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>();
    activeInvoices.forEach((inv) => {
      const e = map.get(inv.clientId) || { name: inv.clientName, total: 0, count: 0 };
      e.total += inv.total; e.count++; map.set(inv.clientId, e);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [activeInvoices]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    activeInvoices.forEach((inv) => {
      inv.items.forEach((item) => {
        const e = map.get(item.productId) || { name: item.productName, qty: 0, revenue: 0 };
        e.qty += item.quantity; e.revenue += item.total; map.set(item.productId, e);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [activeInvoices]);

  const categoryRevenue = useMemo(() => {
    const map = new Map<string, number>();
    activeInvoices.forEach((inv) => {
      inv.items.forEach((item) => {
        const product = products.find((p) => p.id === item.productId);
        const cat = product?.category || "أخرى";
        map.set(cat, (map.get(cat) || 0) + item.total);
      });
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [activeInvoices, products]);

  return (
    <div className="space-y-4" dir="rtl">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4 text-center" style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}>
          <TrendingUp className="h-6 w-6 mx-auto mb-1" style={{ color: "var(--green-500)" }} />
          <p style={{ fontSize: 22, fontWeight: 800, color: "var(--green-500)" }}>{formatCurrency(totalRevenue)}</p>
          <p style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>الإيرادات</p>
        </div>
        <div className="rounded-2xl p-4 text-center" style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}>
          <BarChart3 className="h-6 w-6 mx-auto mb-1" style={{ color: "var(--primary)" }} />
          <p style={{ fontSize: 22, fontWeight: 800, color: "var(--primary)" }}>{activeInvoices.length}</p>
          <p style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>فاتورة نشطة</p>
        </div>
      </div>

      {/* Export actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <DateRangeExportButton label="تصدير PDF" buttonStyle={{ flex: 1, height: 48, borderRadius: 14, fontSize: 16, fontWeight: 700, background: "var(--surface-1)", color: "var(--primary)", border: "2px solid var(--border-default)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onExport={async (range: DateRange) => {
          try { const { exportSalesReportPDF } = await import("@/lib/pdf"); await exportSalesReportPDF(invoices, range, settings); toast.success("تم التصدير"); } catch { toast.error("فشل التصدير"); }
        }} />
        <button onClick={() => {
          const lines = [`📊 *تقارير — ${settings.businessName}*`, `الإيرادات: ${formatCurrency(totalRevenue)}`, `الفواتير: ${activeInvoices.length}`, "", "أفضل العملاء:"];
          topClients.forEach((c, i) => { lines.push(`${i + 1}. ${c.name}: ${formatCurrency(c.total)}`); });
          window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
        }} style={{ flex: 1, height: 48, borderRadius: 14, fontSize: 16, fontWeight: 700, background: "#25D366", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          واتساب
        </button>
      </div>

      {/* Top Clients */}
      <div className="rounded-2xl p-5" style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}>
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-5 w-5" style={{ color: "var(--primary)" }} />
          <span style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>أفضل العملاء</span>
        </div>
        <div className="space-y-2">
          {topClients.map((c, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl p-3" style={{ background: "var(--surface-2)" }}>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span style={{ fontSize: 16, fontWeight: 800, color: "var(--primary)", width: 24 }}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate" style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{c.name}</p>
                  <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{c.count} فاتورة</p>
                </div>
              </div>
              <span style={{ fontSize: 17, fontWeight: 800, color: "var(--green-500)", flexShrink: 0 }}>{formatCurrency(c.total)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Products */}
      <div className="rounded-2xl p-5" style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}>
        <div className="flex items-center gap-2 mb-3">
          <Package className="h-5 w-5" style={{ color: "var(--purple-500)" }} />
          <span style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>أفضل المنتجات</span>
        </div>
        <div className="space-y-2">
          {topProducts.map((p, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl p-3" style={{ background: "var(--surface-2)" }}>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span style={{ fontSize: 16, fontWeight: 800, color: "var(--purple-500)", width: 24 }}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.4 }}>{p.name}</p>
                  <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{p.qty} وحدة</p>
                </div>
              </div>
              <span style={{ fontSize: 17, fontWeight: 800, color: "var(--green-500)", flexShrink: 0 }}>{formatCurrency(p.revenue)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="rounded-2xl p-5" style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>حسب الفئة</span>
        <div className="space-y-2 mt-3">
          {categoryRevenue.map(([cat, rev]) => (
            <div key={cat} className="flex items-center justify-between rounded-xl p-3" style={{ background: "var(--surface-2)" }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{cat}</span>
              <span style={{ fontSize: 17, fontWeight: 800, color: "var(--primary)" }}>{formatCurrency(rev)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
