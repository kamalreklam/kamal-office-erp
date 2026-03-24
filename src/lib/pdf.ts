"use client";

import { createElement } from "react";
import type { Invoice } from "@/lib/data";
import type { AppSettings } from "@/lib/store";

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, "_").replace(/\s+/g, "_");
}

async function generateBlob(doc: React.ReactElement): Promise<Blob> {
  const { pdf } = await import("@react-pdf/renderer");
  return pdf(doc as any).toBlob();
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportInvoicePDF(
  invoice: Invoice,
  settings: AppSettings,
  productImages?: Record<string, string>,
  pdfSettings?: Record<string, unknown>
) {
  const { InvoicePDF } = await import("@/components/invoice-pdf");
  const doc = createElement(InvoicePDF, {
    invoice,
    settings,
    productImages,
    pdfSettings,
  } as any);

  const blob = await generateBlob(doc);
  const clientPart = sanitizeFilename(invoice.clientName);
  const datePart = invoice.createdAt.replace(/\//g, "-");
  const orderPart = invoice.invoiceNumber.replace(/^INV-/, "");
  downloadBlob(blob, `${clientPart}_${datePart}_${orderPart}.pdf`);
}

export async function exportReportPDF(
  doc: React.ReactElement,
  reportType: string,
  dateRange?: { from: string; to: string }
) {
  const blob = await generateBlob(doc);
  const typePart = sanitizeFilename(reportType);
  const rangePart = dateRange
    ? `${dateRange.from}_${dateRange.to}`
    : new Date().toISOString().slice(0, 7);
  downloadBlob(blob, `${typePart}_${rangePart}.pdf`);
}

export async function exportClientSheetPDF(
  doc: React.ReactElement,
  clientName: string
) {
  const blob = await generateBlob(doc);
  downloadBlob(blob, `${sanitizeFilename(clientName)}_بيانات.pdf`);
}

export function shareInvoiceWhatsApp(
  invoice: Invoice,
  settings: AppSettings
) {
  const lines = [
    `*${settings.businessName}*`,
    `فاتورة رقم: ${invoice.invoiceNumber}`,
    `العميل: ${invoice.clientName}`,
    `التاريخ: ${invoice.createdAt}`,
    "",
    "*المنتجات:*",
    ...invoice.items.map(
      (item, i) =>
        `${i + 1}. ${item.productName} × ${item.quantity} = ${settings.currencySymbol}${item.total.toFixed(2)}`
    ),
    "",
    `المجموع: ${settings.currencySymbol}${invoice.subtotal.toFixed(2)}`,
  ];

  if (invoice.discountAmount > 0) {
    lines.push(`الخصم: -${settings.currencySymbol}${invoice.discountAmount.toFixed(2)}`);
  }

  lines.push(`*الإجمالي: ${settings.currencySymbol}${invoice.total.toFixed(2)}*`);
  lines.push(`الحالة: ${invoice.status}`);

  const text = encodeURIComponent(lines.join("\n"));
  window.open(`https://wa.me/?text=${text}`, "_blank");
}
