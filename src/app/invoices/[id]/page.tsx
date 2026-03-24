"use client";

import { use, useMemo } from "react";
import { useRouter } from "next/navigation";
import DOMPurify from "dompurify";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight, MessageCircle, FileText,
  Download, CheckCircle2, XCircle, Pencil,
} from "lucide-react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { formatCurrency, getStatusColor } from "@/lib/data";
import type { InvoicePDFSettings } from "@/components/invoice-pdf";
import { toast } from "sonner";

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { invoices, clients, settings, updateInvoiceStatus, getProductImage } = useStore();

  const foundInvoice = invoices.find((inv) => inv.id === id);

  if (!foundInvoice) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground animate-in fade-in duration-500">
          <FileText className="mb-3 h-12 w-12 opacity-40" />
          <p className="text-lg font-medium">الفاتورة غير موجودة</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/invoices")}>
            العودة للفواتير
          </Button>
        </div>
      </AppShell>
    );
  }

  // Normalize items — handle { _items, _taxAmount } meta format from DB
  const rawItems = foundInvoice.items;
  const normalizedItems = Array.isArray(rawItems)
    ? rawItems
    : (rawItems as any)?._items || [];
  const invoice = { ...foundInvoice, items: normalizedItems as typeof foundInvoice.items };
  const client = clients.find((c) => c.id === invoice.clientId);
  const hasCustomTemplate = !!settings.customInvoiceHtml?.trim();

  function renderCustomTemplate() {
    const itemsHtml = invoice.items
      .map(
        (item, i) =>
          `<tr><td>${i + 1}</td><td>${item.productName}</td><td>${item.quantity}</td><td>${formatCurrency(item.unitPrice)}</td><td>${formatCurrency(item.total)}</td></tr>`
      )
      .join("\n");

    return settings.customInvoiceHtml
      .replace(/\{\{businessName\}\}/g, settings.businessName)
      .replace(/\{\{businessNameEn\}\}/g, settings.businessNameEn)
      .replace(/\{\{phone\}\}/g, settings.phone)
      .replace(/\{\{address\}\}/g, settings.address)
      .replace(/\{\{logo\}\}/g, settings.logo ? `<img src="${settings.logo}" style="height:50px" />` : "")
      .replace(/\{\{invoiceNumber\}\}/g, invoice.invoiceNumber)
      .replace(/\{\{date\}\}/g, invoice.createdAt)
      .replace(/\{\{status\}\}/g, invoice.status)
      .replace(/\{\{clientName\}\}/g, invoice.clientName)
      .replace(/\{\{clientPhone\}\}/g, client?.phone || "")
      .replace(/\{\{clientAddress\}\}/g, client?.address || "")
      .replace(/\{\{subtotal\}\}/g, formatCurrency(invoice.subtotal))
      .replace(/\{\{discount\}\}/g, formatCurrency(invoice.discountAmount))
      .replace(/\{\{total\}\}/g, formatCurrency(invoice.total))
      .replace(/\{\{notes\}\}/g, invoice.notes || "")
      .replace(/\{\{currencySymbol\}\}/g, settings.currencySymbol)
      .replace(/\{\{items\}\}/g, itemsHtml);
  }

  async function handleExportPDF() {
    toast.success("جاري تصدير الفاتورة كـ PDF...");
    try {
      const { exportInvoicePDF } = await import("@/lib/pdf");
      await exportInvoicePDF(invoice, settings, {}, {
        accentColor: settings.primaryColor || "#2563eb",
      });
    } catch {
      toast.error("فشل تصدير الفاتورة");
    }
  }

  async function shareWhatsApp() {
    const { shareInvoiceWhatsApp } = await import("@/lib/pdf");
    shareInvoiceWhatsApp(invoice, settings);
  }

  function togglePaid() {
    const newStatus = invoice.status === "مدفوعة" ? "غير مدفوعة" : "مدفوعة";
    updateInvoiceStatus(invoice.id, newStatus);
    toast.success(`تم تغيير الحالة إلى: ${newStatus}`);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-8 print:max-w-none animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/invoices")} className="rounded-xl p-2.5 text-muted-foreground transition-all hover:bg-[var(--surface-2)] hover:scale-105">
              <ArrowRight className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-extrabold text-foreground">{invoice.invoiceNumber}</h1>
              <p className="text-base text-muted-foreground">تفاصيل الفاتورة</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/invoices/new?edit=${invoice.id}`}>
              <Button variant="outline" size="sm" className="gap-1.5 transition-all hover:scale-105">
                <Pencil className="h-4 w-4 text-primary" />
                <span className="hidden sm:inline">تعديل</span>
              </Button>
            </Link>
            <Button variant="outline" size="sm" className="gap-1.5 transition-all hover:scale-105" onClick={togglePaid}>
              {invoice.status === "مدفوعة" ? (
                <><XCircle className="h-4 w-4 text-amber-500" /><span className="hidden sm:inline">غير مدفوعة</span></>
              ) : (
                <><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span className="hidden sm:inline">تم الدفع</span></>
              )}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 transition-all hover:scale-105" onClick={shareWhatsApp}>
              <MessageCircle className="h-4 w-4 text-green-600" />
              <span className="hidden sm:inline">واتساب</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 transition-all hover:scale-105" onClick={handleExportPDF}>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">تصدير PDF</span>
            </Button>
          </div>
        </div>

        {/* Invoice Document */}
        <Card className="border border-[var(--glass-border)] shadow-sm print:border-0 print:shadow-none animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100" id="invoice-document">
          <CardContent className="p-6 md:p-8">
            {hasCustomTemplate ? (
              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderCustomTemplate(), { FORBID_TAGS: ['script', 'style'], FORBID_ATTR: ['onerror', 'onload', 'onclick'] }) }} />
            ) : (
              <>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-3">
                    {settings.logo ? (
                      <img src={settings.logo} alt="Logo" className="h-14 w-14 rounded-xl object-cover" />
                    ) : null}
                    <div>
                      <h2 className="text-xl font-extrabold text-foreground">{settings.businessName}</h2>
                      <p className="text-base text-muted-foreground">{settings.address}</p>
                      <p className="text-base text-muted-foreground">هاتف: <span dir="ltr">{settings.phone}</span></p>
                    </div>
                  </div>
                  <div className="text-left sm:text-left">
                    <p className="text-lg font-bold text-foreground">{invoice.invoiceNumber}</p>
                    <p className="text-base text-muted-foreground">التاريخ: {invoice.createdAt}</p>
                    <Badge variant="outline" className={`mt-2 ${getStatusColor(invoice.status)}`}>{invoice.status}</Badge>
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="rounded-xl bg-[var(--surface-2)] p-6">
                  <p className="text-sm font-bold text-muted-foreground">فاتورة إلى</p>
                  <p className="mt-2 text-base font-bold text-foreground">{invoice.clientName}</p>
                  {client && (
                    <>
                      <p className="text-base text-muted-foreground" dir="ltr">{client.phone}</p>
                      <p className="text-base text-muted-foreground">{client.address}</p>
                    </>
                  )}
                </div>

                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-base">
                    <thead>
                      <tr className="border-b-2 border-foreground/15">
                        <th className="pb-3 text-right font-bold text-muted-foreground">#</th>
                        <th className="pb-3 text-right font-bold text-muted-foreground">المنتج</th>
                        <th className="pb-3 text-right font-bold text-muted-foreground">الكمية</th>
                        <th className="pb-3 text-right font-bold text-muted-foreground">سعر الوحدة</th>
                        <th className="pb-3 text-right font-bold text-muted-foreground">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((item, index) => {
                        const img = getProductImage(item.productId);
                        return (
                          <tr key={item.id} className="border-b border-[var(--glass-border)]">
                            <td className="py-4 text-muted-foreground">{index + 1}</td>
                            <td className="py-4">
                              <div className="flex items-center gap-3">
                                {img && <img src={img} alt="" className="h-14 w-14 rounded-xl object-cover border border-[var(--glass-border)] print:hidden" />}
                                <div>
                                  <p className="font-medium">{item.productName}</p>
                                  {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="py-4">{item.quantity}</td>
                            <td className="py-4">{formatCurrency(item.unitPrice)}</td>
                            <td className="py-4 font-bold">{formatCurrency(item.total)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 flex justify-start">
                  <div className="w-full max-w-sm space-y-2 rounded-xl bg-muted/20 p-6">
                    <div className="flex justify-between text-base">
                      <span className="text-muted-foreground">المجموع الفرعي</span>
                      <span>{formatCurrency(invoice.subtotal)}</span>
                    </div>
                    {invoice.discountAmount > 0 && (
                      <div className="flex justify-between text-base">
                        <span className="text-muted-foreground">الخصم {invoice.discountType === "percentage" ? `(${invoice.discountValue}%)` : ""}</span>
                        <span className="text-red-600">-{formatCurrency(invoice.discountAmount)}</span>
                      </div>
                    )}
                    {(invoice.taxAmount ?? 0) > 0 && (
                      <div className="flex justify-between text-base">
                        <span className="text-muted-foreground">الضريبة</span>
                        <span>+{formatCurrency(invoice.taxAmount)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-lg pt-1">
                      <span className="font-bold">الإجمالي</span>
                      <span className="font-extrabold text-primary">{formatCurrency(invoice.total)}</span>
                    </div>
                  </div>
                </div>

                {invoice.notes && (
                  <div className="mt-6 rounded-xl bg-muted/20 p-6">
                    <p className="text-sm font-bold text-muted-foreground">ملاحظات</p>
                    <p className="mt-2 text-base">{invoice.notes}</p>
                  </div>
                )}

                {settings.invoiceNotes && (
                  <p className="mt-6 text-center text-base text-muted-foreground">{settings.invoiceNotes}</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
