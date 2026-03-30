"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, MessageCircle, Download, CheckCircle2, XCircle, Pencil, FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { formatCurrency, getStatusColor, type Invoice } from "@/lib/data";
import { toast } from "sonner";
import { MobileShell } from "./mobile-shell";

export function MobileInvoiceDetail({ invoice }: { invoice: Invoice }) {
  const router = useRouter();
  const { clients, settings, updateInvoiceStatus } = useStore();
  const client = clients.find((c) => c.id === invoice.clientId);

  // Normalize items
  const rawItems = invoice.items;
  const items = Array.isArray(rawItems) ? rawItems : (rawItems as any)?._items || [];

  async function handleExportPDF() {
    toast.success("جاري تصدير الفاتورة...");
    try {
      const { exportInvoicePDF } = await import("@/lib/pdf");
      await exportInvoicePDF({ ...invoice, items }, settings, { phone: client?.phone, address: client?.address });
    } catch (e) {
      toast.error("فشل تصدير الفاتورة: " + (e instanceof Error ? e.message : "خطأ"));
    }
  }

  async function shareWhatsApp() {
    try {
      const { shareInvoiceWhatsApp } = await import("@/lib/pdf");
      shareInvoiceWhatsApp({ ...invoice, items }, settings);
    } catch {
      toast.error("فشل المشاركة");
    }
  }

  function togglePaid() {
    const newStatus = invoice.status === "مدفوعة" ? "غير مدفوعة" : "مدفوعة";
    updateInvoiceStatus(invoice.id, newStatus);
    toast.success(`تم تغيير الحالة إلى: ${newStatus}`);
  }

  return (
    <MobileShell>
      <div className="space-y-4" dir="rtl">
        {/* Back + Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => router.push("/invoices")}
            style={{
              width: 44, height: 44, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--surface-2)", color: "var(--text-muted)", border: "none", cursor: "pointer",
            }}
          >
            <ArrowRight style={{ width: 20, height: 20 }} />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>{invoice.invoiceNumber}</h1>
            <p style={{ fontSize: 15, color: "var(--text-muted)", marginTop: 2 }}>{invoice.createdAt}</p>
          </div>
          <Badge variant="outline" className={`text-sm ${getStatusColor(invoice.status)}`}>{invoice.status}</Badge>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleExportPDF} style={{
            flex: 1, height: 48, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            fontSize: 15, fontWeight: 700, background: "var(--primary)", color: "white", border: "none", cursor: "pointer",
          }}>
            <Download style={{ width: 18, height: 18 }} /> PDF
          </button>
          <button onClick={shareWhatsApp} style={{
            flex: 1, height: 48, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            fontSize: 15, fontWeight: 700, background: "#25D366", color: "white", border: "none", cursor: "pointer",
          }}>
            <MessageCircle style={{ width: 18, height: 18 }} /> واتساب
          </button>
          <button onClick={togglePaid} style={{
            height: 48, width: 48, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--surface-1)", color: invoice.status === "مدفوعة" ? "var(--amber-500)" : "var(--green-500)",
            border: "1px solid var(--border-default)", cursor: "pointer",
          }}>
            {invoice.status === "مدفوعة" ? <XCircle style={{ width: 20, height: 20 }} /> : <CheckCircle2 style={{ width: 20, height: 20 }} />}
          </button>
          <Link href={`/invoices/new?edit=${invoice.id}`}>
            <div style={{
              height: 48, width: 48, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--surface-1)", color: "var(--primary)", border: "1px solid var(--border-default)",
            }}>
              <Pencil style={{ width: 18, height: 18 }} />
            </div>
          </Link>
        </div>

        {/* Client card */}
        <div style={{ background: "var(--surface-1)", borderRadius: 20, padding: 20, border: "1px solid var(--glass-border)" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)" }}>العميل</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginTop: 4 }}>{invoice.clientName}</p>
          {client?.phone && <p dir="ltr" style={{ fontSize: 16, color: "var(--text-muted)", marginTop: 4, textAlign: "left" }}>{client.phone}</p>}
          {client?.address && <p style={{ fontSize: 15, color: "var(--text-muted)", marginTop: 2 }}>{client.address}</p>}
        </div>

        {/* Items */}
        <div style={{ background: "var(--surface-1)", borderRadius: 20, padding: 20, border: "1px solid var(--glass-border)" }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-muted)", marginBottom: 12 }}>
            المنتجات ({items.length})
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((item: any, idx: number) => (
              <div key={idx} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                borderRadius: 14, padding: 14, background: "var(--surface-2)",
              }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.4 }}>
                    {item.productName}
                  </p>
                  <p style={{ fontSize: 15, color: "var(--text-muted)", marginTop: 2 }}>
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                  </p>
                </div>
                <span style={{ fontSize: 18, fontWeight: 800, color: "var(--primary)", flexShrink: 0, marginInlineStart: 12 }}>
                  {formatCurrency(item.quantity * item.unitPrice)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div style={{ background: "var(--surface-2)", borderRadius: 20, padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 17, color: "var(--text-muted)" }}>المجموع الفرعي</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{formatCurrency(invoice.subtotal)}</span>
          </div>
          {invoice.discountAmount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 17, color: "var(--text-muted)" }}>
                الخصم {invoice.discountType === "percentage" ? `(${invoice.discountValue}%)` : ""}
              </span>
              <span style={{ fontSize: 18, fontWeight: 700, color: "var(--red-500)" }}>-{formatCurrency(invoice.discountAmount)}</span>
            </div>
          )}
          {(invoice.taxAmount ?? 0) > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 17, color: "var(--text-muted)" }}>الضريبة</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>+{formatCurrency(invoice.taxAmount)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, borderTop: "2px solid var(--border-default)" }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>الإجمالي</span>
            <span style={{ fontSize: 32, fontWeight: 800, color: "var(--primary)" }}>{formatCurrency(invoice.total)}</span>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div style={{ background: "var(--surface-1)", borderRadius: 20, padding: 20, border: "1px solid var(--glass-border)" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6 }}>ملاحظات</p>
            <p style={{ fontSize: 16, color: "var(--text-primary)", lineHeight: 1.6 }}>{invoice.notes}</p>
          </div>
        )}
      </div>
    </MobileShell>
  );
}
