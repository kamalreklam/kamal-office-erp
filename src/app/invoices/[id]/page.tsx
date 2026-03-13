"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight, MessageCircle, FileText,
  Download, CheckCircle2, XCircle,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { formatCurrency, getStatusColor } from "@/lib/data";
import { exportInvoicePDF, shareInvoiceWhatsApp } from "@/lib/pdf";
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

  const invoice = foundInvoice;
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
    await exportInvoicePDF("invoice-document", invoice.invoiceNumber);
  }

  function shareWhatsApp() {
    const lines = [
      `📄 *فاتورة ${invoice.invoiceNumber}*`,
      `👤 العميل: ${invoice.clientName}`,
      `📅 التاريخ: ${invoice.createdAt}`,
      "",
      "*المنتجات:*",
    ];
    invoice.items.forEach((item, i) => {
      lines.push(`${i + 1}. ${item.productName} × ${item.quantity} = ${formatCurrency(item.total)}`);
    });
    lines.push("");
    lines.push(`المجموع: ${formatCurrency(invoice.subtotal)}`);
    if (invoice.discountAmount > 0) lines.push(`الخصم: -${formatCurrency(invoice.discountAmount)}`);
    lines.push(`*الإجمالي: ${formatCurrency(invoice.total)}*`);
    lines.push(`الحالة: ${invoice.status}`);
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
  }

  function togglePaid() {
    const newStatus = invoice.status === "مدفوعة" ? "غير مدفوعة" : "مدفوعة";
    updateInvoiceStatus(invoice.id, newStatus);
    toast.success(`تم تغيير الحالة إلى: ${newStatus}`);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6 print:max-w-none animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/invoices")} className="rounded-lg p-2 text-muted-foreground transition-all hover:bg-accent hover:scale-105">
              <ArrowRight className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{invoice.invoiceNumber}</h1>
              <p className="text-sm text-muted-foreground">تفاصيل الفاتورة</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
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
        <Card className="border shadow-sm print:border-0 print:shadow-none animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100" id="invoice-document">
          <CardContent className="p-6 md:p-8">
            {hasCustomTemplate ? (
              <div dangerouslySetInnerHTML={{ __html: renderCustomTemplate() }} />
            ) : (
              <>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-3">
                    {settings.logo ? (
                      <Image src={settings.logo} alt="Logo" width={56} height={56} className="h-14 w-14 rounded-xl object-cover" />
                    ) : null}
                    <div>
                      <h2 className="text-xl font-extrabold text-foreground">{settings.businessName}</h2>
                      <p className="text-sm text-muted-foreground">{settings.address}</p>
                      <p className="text-sm text-muted-foreground">هاتف: {settings.phone}</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-left">
                    <p className="text-lg font-bold text-foreground">{invoice.invoiceNumber}</p>
                    <p className="text-sm text-muted-foreground">التاريخ: {invoice.createdAt}</p>
                    <Badge variant="outline" className={`mt-1 ${getStatusColor(invoice.status)}`}>{invoice.status}</Badge>
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="rounded-xl bg-muted/30 p-4">
                  <p className="text-xs font-bold text-muted-foreground">فاتورة إلى</p>
                  <p className="mt-1 text-base font-bold text-foreground">{invoice.clientName}</p>
                  {client && (
                    <>
                      <p className="text-sm text-muted-foreground">{client.phone}</p>
                      <p className="text-sm text-muted-foreground">{client.address}</p>
                    </>
                  )}
                </div>

                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-sm">
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
                          <tr key={item.id} className="border-b border-border/60">
                            <td className="py-4 text-muted-foreground">{index + 1}</td>
                            <td className="py-4">
                              <div className="flex items-center gap-2">
                                {img && <Image src={img} alt="" width={32} height={32} className="h-8 w-8 rounded-lg object-cover border border-border print:hidden" />}
                                <div>
                                  <p className="font-medium">{item.productName}</p>
                                  {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
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
                  <div className="w-full max-w-sm space-y-2 rounded-xl bg-muted/20 p-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">المجموع الفرعي</span>
                      <span>{formatCurrency(invoice.subtotal)}</span>
                    </div>
                    {invoice.discountAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">الخصم {invoice.discountType === "percentage" ? `(${invoice.discountValue}%)` : ""}</span>
                        <span className="text-red-600">-{formatCurrency(invoice.discountAmount)}</span>
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
                  <div className="mt-6 rounded-xl bg-muted/20 p-4">
                    <p className="text-xs font-bold text-muted-foreground">ملاحظات</p>
                    <p className="mt-1 text-sm">{invoice.notes}</p>
                  </div>
                )}

                {settings.invoiceNotes && (
                  <p className="mt-6 text-center text-sm text-muted-foreground">{settings.invoiceNotes}</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
