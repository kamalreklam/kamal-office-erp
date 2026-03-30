"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useDebounce } from "@/lib/use-debounce";
import Link from "next/link";
import { Search, Plus, FileText, ChevronLeft, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatCurrency, getStatusColor, type Invoice } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DateRangeExportButton, type DateRange } from "@/components/date-range-picker";

const statuses = ["الكل", "مدفوعة", "مدفوعة جزئياً", "غير مدفوعة", "مسودة", "ملغاة"];

export function MobileInvoices() {
  const { invoices, settings } = useStore();

  function shareWhatsApp() {
    const paid = invoices.filter((i) => i.status === "مدفوعة");
    const unpaid = invoices.filter((i) => i.status === "غير مدفوعة" || i.status === "مدفوعة جزئياً");
    const lines = [`📄 *ملخص الفواتير — ${settings.businessName}*`, `عدد الفواتير: ${invoices.length}`, `✅ مدفوعة: ${paid.length}`, `⏳ معلقة: ${unpaid.length}`, ""];
    invoices.slice(0, 10).forEach((inv, i) => {
      const emoji = inv.status === "مدفوعة" ? "✅" : inv.status === "مدفوعة جزئياً" ? "🔵" : "🔴";
      lines.push(`${i + 1}. ${inv.invoiceNumber} | ${inv.clientName} | ${emoji} ${formatCurrency(inv.total)}`);
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
  }
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [previewInv, setPreviewInv] = useState<Invoice | null>(null);

  const filtered = useMemo(() => {
    return invoices
      .filter((i) => {
        const matchSearch = !debouncedSearch || i.invoiceNumber.includes(debouncedSearch) || i.clientName.includes(debouncedSearch);
        const matchStatus = statusFilter === "الكل" || i.status === statusFilter;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [invoices, debouncedSearch, statusFilter]);

  const statusCounts = useMemo(() => {
    const map: Record<string, number> = { "الكل": invoices.length };
    invoices.forEach((i) => { map[i.status] = (map[i.status] || 0) + 1; });
    return map;
  }, [invoices]);

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header stats */}
      <div className="flex gap-3">
        <div className="flex-1 rounded-2xl p-4 text-center" style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}>
          <p style={{ fontSize: 26, fontWeight: 800, color: "var(--primary)" }}>{invoices.length}</p>
          <p style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 600 }}>فاتورة</p>
        </div>
        <div className="flex-1 rounded-2xl p-4 text-center" style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}>
          <p style={{ fontSize: 26, fontWeight: 800, color: "var(--green-500)" }}>{statusCounts["مدفوعة"] || 0}</p>
          <p style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 600 }}>مدفوعة</p>
        </div>
        <div className="flex-1 rounded-2xl p-4 text-center" style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}>
          <p style={{ fontSize: 26, fontWeight: 800, color: "var(--amber-500)" }}>{statusCounts["غير مدفوعة"] || 0}</p>
          <p style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 600 }}>معلقة</p>
        </div>
      </div>

      {/* New invoice */}
      <Link href="/invoices/new">
        <div
          className="flex items-center justify-center gap-2 rounded-2xl"
          style={{ height: 56, fontSize: 18, fontWeight: 800, background: "var(--primary)", color: "white" }}
        >
          <Plus className="h-5 w-5" />
          فاتورة جديدة
        </div>
      </Link>

      {/* Export actions */}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <DateRangeExportButton label="تصدير PDF" buttonStyle={{ flex: 1, height: 48, borderRadius: 14, fontSize: 16, fontWeight: 700, background: "var(--surface-1)", color: "var(--primary)", border: "2px solid var(--border-default)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onExport={async (range: DateRange) => {
          try { const { exportSalesReportPDF } = await import("@/lib/pdf"); await exportSalesReportPDF(invoices, range, settings); toast.success("تم التصدير"); } catch { toast.error("فشل التصدير"); }
        }} />
        <button onClick={shareWhatsApp} style={{ flex: 1, height: 48, borderRadius: 14, fontSize: 16, fontWeight: 700, background: "#25D366", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          واتساب
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
        <input
          type="text"
          placeholder="ابحث برقم الفاتورة أو العميل..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl border-2 pr-12 pl-4"
          style={{ height: 52, fontSize: 18, background: "var(--surface-1)", borderColor: "var(--border-default)", color: "var(--text-primary)", outline: "none" }}
        />
      </div>

      {/* Status filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {statuses.map((s) => {
          const active = statusFilter === s;
          const count = statusCounts[s] || 0;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5"
              style={{
                fontSize: 14, fontWeight: 700,
                background: active ? "var(--primary)" : "var(--surface-1)",
                color: active ? "white" : "var(--text-secondary)",
                border: active ? "none" : "1px solid var(--border-subtle)",
                cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              {s}
              <span
                className="rounded-full px-1.5 py-0.5"
                style={{ fontSize: 11, fontWeight: 700, background: active ? "rgba(255,255,255,0.2)" : "var(--surface-2)", color: active ? "white" : "var(--text-muted)" }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Results count */}
      <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{filtered.length} فاتورة</p>

      {/* Invoice cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-3xl p-10 text-center" style={{ background: "var(--surface-1)" }}>
            <FileText className="mx-auto h-10 w-10 mb-3" style={{ color: "var(--text-muted)", opacity: 0.3 }} />
            <p style={{ fontSize: 18, color: "var(--text-muted)" }}>لا توجد فواتير</p>
          </div>
        ) : (
          filtered.map((inv) => (
            <button
              key={inv.id}
              onClick={() => setPreviewInv(inv)}
              className="w-full rounded-2xl p-4 text-right"
              style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                  <p style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>{inv.invoiceNumber}</p>
                  <p style={{ fontSize: 16, color: "var(--text-secondary)", marginTop: 2 }}>{inv.clientName}</p>
                </div>
                <Badge variant="outline" className={`shrink-0 text-xs ${getStatusColor(inv.status)}`}>{inv.status}</Badge>
              </div>
              <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: 14, color: "var(--text-muted)" }}>{inv.createdAt} · {inv.items.length} منتج</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: "var(--primary)" }}>{formatCurrency(inv.total)}</span>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Invoice Detail — Portal */}
      {previewInv && <InvoiceSheet invoice={previewInv} onClose={() => setPreviewInv(null)} />}
    </div>
  );
}

function InvoiceSheet({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function close() {
    setVisible(false);
    setTimeout(onClose, 250);
  }

  return createPortal(
    <div
      onClick={close}
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        background: visible ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0)",
        backdropFilter: visible ? "blur(4px)" : "blur(0)",
        transition: "all 0.25s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100000,
          background: "var(--surface-1)",
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          maxHeight: "90vh", overflowY: "auto",
          paddingBottom: "calc(env(safe-area-inset-bottom, 8px) + 24px)",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px" }}>
          <div style={{ height: 4, width: 40, borderRadius: 4, background: "var(--border-strong)" }} />
        </div>

        <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>{invoice.invoiceNumber}</h2>
              <p style={{ fontSize: 16, color: "var(--text-muted)", marginTop: 2 }}>{invoice.createdAt}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Badge variant="outline" className={`text-sm ${getStatusColor(invoice.status)}`}>{invoice.status}</Badge>
              <button onClick={close} style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)", color: "var(--text-muted)", border: "none", cursor: "pointer" }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>
          </div>

          {/* Client */}
          <div style={{ background: "var(--surface-2)", borderRadius: 16, padding: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)" }}>العميل</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", marginTop: 2 }}>{invoice.clientName}</p>
          </div>

          {/* Items */}
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>المنتجات ({invoice.items.length})</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {invoice.items.map((item, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: 12, padding: 12, border: "1px solid var(--border-subtle)" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.4 }}>{item.productName}</p>
                    <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{item.quantity} × {formatCurrency(item.unitPrice)}</p>
                  </div>
                  <span style={{ fontSize: 17, fontWeight: 800, color: "var(--primary)", flexShrink: 0, marginInlineStart: 12 }}>
                    {formatCurrency(item.quantity * item.unitPrice)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div style={{ background: "var(--surface-2)", borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 16, color: "var(--text-muted)" }}>المجموع</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.discountAmount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 16, color: "var(--text-muted)" }}>الخصم</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: "var(--red-500)" }}>-{formatCurrency(invoice.discountAmount)}</span>
              </div>
            )}
            {invoice.taxAmount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 16, color: "var(--text-muted)" }}>الضريبة</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>+{formatCurrency(invoice.taxAmount)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "2px solid var(--border-default)" }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>الإجمالي</span>
              <span style={{ fontSize: 28, fontWeight: 800, color: "var(--primary)" }}>{formatCurrency(invoice.total)}</span>
            </div>
          </div>

          {/* Action */}
          <Link href={`/invoices/${invoice.id}`} onClick={close}>
            <div style={{ height: 56, fontSize: 18, fontWeight: 800, background: "var(--primary)", color: "white", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              عرض التفاصيل الكاملة
              <ChevronLeft style={{ width: 20, height: 20 }} />
            </div>
          </Link>
        </div>
      </div>
    </div>,
    document.body
  );
}
