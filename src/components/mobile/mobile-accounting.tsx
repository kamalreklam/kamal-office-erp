"use client";

import { useMemo } from "react";
import { Calculator, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatCurrency, getStatusColor } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { toast } from "sonner";
import { DateRangeExportButton, type DateRange } from "@/components/date-range-picker";

export function MobileAccounting() {
  const { invoices, settings } = useStore();

  const active = useMemo(() => invoices.filter((i) => i.status !== "ملغاة" && i.status !== "مسودة"), [invoices]);
  const totalRevenue = useMemo(() => active.reduce((s, i) => s + i.total, 0), [active]);
  const totalTax = useMemo(() => active.reduce((s, i) => s + (i.taxAmount || 0), 0), [active]);
  const totalDiscount = useMemo(() => active.reduce((s, i) => s + i.discountAmount, 0), [active]);
  const paid = useMemo(() => active.filter((i) => i.status === "مدفوعة"), [active]);
  const unpaid = useMemo(() => active.filter((i) => i.status === "غير مدفوعة" || i.status === "مدفوعة جزئياً"), [active]);
  const paidTotal = useMemo(() => paid.reduce((s, i) => s + i.total, 0), [paid]);
  const unpaidTotal = useMemo(() => unpaid.reduce((s, i) => s + i.total, 0), [unpaid]);

  return (
    <div className="space-y-4" dir="rtl">
      {/* P&L Summary */}
      <div className="rounded-2xl p-5" style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}>
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="h-5 w-5" style={{ color: "var(--primary)" }} />
          <span style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>الأرباح والخسائر</span>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span style={{ fontSize: 16, color: "var(--text-muted)" }}>إجمالي الإيرادات</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: "var(--green-500)" }}>{formatCurrency(totalRevenue)}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ fontSize: 16, color: "var(--text-muted)" }}>المحصّل</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{formatCurrency(paidTotal)}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ fontSize: 16, color: "var(--text-muted)" }}>المستحق</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: "var(--amber-500)" }}>{formatCurrency(unpaidTotal)}</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex justify-between">
              <span style={{ fontSize: 16, color: "var(--text-muted)" }}>الخصومات</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: "var(--red-500)" }}>-{formatCurrency(totalDiscount)}</span>
            </div>
          )}
          {totalTax > 0 && (
            <div className="flex justify-between">
              <span style={{ fontSize: 16, color: "var(--text-muted)" }}>الضريبة ({settings.taxRate}%)</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{formatCurrency(totalTax)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Collection stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4 text-center" style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}>
          <TrendingUp className="h-6 w-6 mx-auto mb-1" style={{ color: "var(--green-500)" }} />
          <p style={{ fontSize: 22, fontWeight: 800, color: "var(--green-500)" }}>{paid.length}</p>
          <p style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>مدفوعة</p>
        </div>
        <div className="rounded-2xl p-4 text-center" style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}>
          <TrendingDown className="h-6 w-6 mx-auto mb-1" style={{ color: "var(--amber-500)" }} />
          <p style={{ fontSize: 22, fontWeight: 800, color: "var(--amber-500)" }}>{unpaid.length}</p>
          <p style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>مستحقة</p>
        </div>
      </div>

      {/* Export actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <DateRangeExportButton label="تصدير PDF" buttonStyle={{ flex: 1, height: 48, borderRadius: 14, fontSize: 16, fontWeight: 700, background: "var(--surface-1)", color: "var(--primary)", border: "2px solid var(--border-default)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onExport={async (range: DateRange) => {
          try { const { exportAccountingReportPDF } = await import("@/lib/pdf"); await exportAccountingReportPDF(invoices, range, settings); toast.success("تم التصدير"); } catch { toast.error("فشل التصدير"); }
        }} />
        <button onClick={() => {
          const lines = [`💰 *المحاسبة — ${settings.businessName}*`, "", `الإيرادات: ${formatCurrency(totalRevenue)}`, `المحصّل: ${formatCurrency(paidTotal)}`, `المستحق: ${formatCurrency(unpaidTotal)}`];
          if (totalTax > 0) lines.push(`الضريبة: ${formatCurrency(totalTax)}`);
          if (unpaid.length > 0) { lines.push("", "المستحقات:"); unpaid.slice(0, 5).forEach((inv) => lines.push(`• ${inv.invoiceNumber} - ${inv.clientName}: ${formatCurrency(inv.total)}`)); }
          window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
        }} style={{ flex: 1, height: 48, borderRadius: 14, fontSize: 16, fontWeight: 700, background: "#25D366", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          واتساب
        </button>
      </div>

      {/* Receivables */}
      {unpaid.length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5" style={{ color: "var(--amber-500)" }} />
            <span style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>المستحقات</span>
            <span className="rounded-full px-2 py-0.5" style={{ fontSize: 13, fontWeight: 800, background: "var(--amber-500)", color: "white" }}>{unpaid.length}</span>
          </div>
          <div className="space-y-2">
            {unpaid.sort((a, b) => b.total - a.total).slice(0, 10).map((inv) => (
              <Link key={inv.id} href={`/invoices/${inv.id}`}>
                <div className="flex items-center justify-between rounded-xl p-3" style={{ background: "var(--surface-2)" }}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{inv.invoiceNumber}</p>
                      <Badge variant="outline" className={`text-[11px] ${getStatusColor(inv.status)}`}>{inv.status}</Badge>
                    </div>
                    <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{inv.clientName} · {inv.createdAt}</p>
                  </div>
                  <span style={{ fontSize: 17, fontWeight: 800, color: "var(--amber-500)", flexShrink: 0 }}>{formatCurrency(inv.total)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
