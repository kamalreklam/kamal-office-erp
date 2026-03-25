"use client";

import type { Invoice, InvoiceItem } from "@/lib/data";
import type { AppSettings } from "@/lib/store";

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, "_").replace(/\s+/g, "_");
}

function fmtCurrency(amount: number, symbol = "$"): string {
  return `${symbol}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ============================================================
// jsPDF-based PDF generation (reliable, no html2canvas issues)
// ============================================================
async function createPdf() {
  const { jsPDF } = await import("jspdf");
  await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  return doc;
}

function downloadDoc(doc: any, filename: string) {
  doc.save(filename);
}

// ============================================================
// INVOICE PDF
// ============================================================
export async function exportInvoicePDF(
  invoice: Invoice,
  settings: AppSettings,
  clientInfo?: { phone?: string; address?: string },
) {
  const doc = await createPdf();
  const c = settings.currencySymbol || "$";
  const items = Array.isArray(invoice.items) ? invoice.items : (invoice.items as any)?._items || [];
  const pageW = 210;
  const margin = 15;
  const contentW = pageW - margin * 2;

  // Colors
  const blue = [41, 171, 226];
  const dark = [26, 26, 46];
  const white = [255, 255, 255];
  const gray = [100, 116, 139];
  const lightGray = [241, 245, 249];

  // ── Top accent strip ──
  doc.setFillColor(blue[0], blue[1], blue[2]);
  doc.rect(0, 0, pageW * 0.4, 3, "F");
  doc.setFillColor(27, 138, 194);
  doc.rect(pageW * 0.4, 0, pageW * 0.3, 3, "F");
  doc.setFillColor(dark[0], dark[1], dark[2]);
  doc.rect(pageW * 0.7, 0, pageW * 0.3, 3, "F");

  // ── Dark header ──
  doc.setFillColor(dark[0], dark[1], dark[2]);
  doc.rect(0, 3, pageW, 38, "F");

  // Company name (right-aligned for RTL)
  doc.setTextColor(white[0], white[1], white[2]);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("برينتكس للأحبار ولوازم الطباعة", pageW - margin, 18, { align: "right" });

  // Tagline
  doc.setFontSize(8);
  doc.setTextColor(blue[0], blue[1], blue[2]);
  doc.text("INKS & PRINTING SUPPLIES", pageW - margin, 24, { align: "right" });

  // Contact info
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 200);
  doc.text("00905465301000  |  kamalreklam.ist@gmail.com  |  الجميلية - حلب - سوريا", pageW - margin, 30, { align: "right" });

  // Logo placeholder text (left side)
  doc.setFontSize(20);
  doc.setTextColor(white[0], white[1], white[2]);
  doc.setFont("helvetica", "bold");
  doc.text("PRINTIX", margin + 5, 23, { align: "left" });

  // Try loading logo image
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = "/logo.png";
    await new Promise<void>((resolve) => {
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const imgData = canvas.toDataURL("image/png");
            const ratio = img.width / img.height;
            const h = 18;
            const w = h * ratio;
            doc.addImage(imgData, "PNG", margin + 2, 12, w, h);
            // Clear the text placeholder
            doc.setFillColor(dark[0], dark[1], dark[2]);
            doc.rect(margin, 12, w + 4, h + 2, "F");
            doc.addImage(imgData, "PNG", margin + 2, 12, w, h);
          }
        } catch { /* logo loading failed, text fallback is shown */ }
        resolve();
      };
      img.onerror = () => resolve();
      setTimeout(resolve, 2000); // timeout fallback
    });
  } catch { /* ignore */ }

  // ── Title bar ──
  let y = 44;
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.rect(0, y, pageW, 14, "F");
  doc.setDrawColor(232, 236, 241);
  doc.line(0, y + 14, pageW, y + 14);

  // Invoice label + number
  doc.setFontSize(10);
  doc.setTextColor(blue[0], blue[1], blue[2]);
  doc.setFont("helvetica", "bold");
  doc.text("فاتورة", pageW - margin, y + 9, { align: "right" });

  doc.setFontSize(16);
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.text(invoice.invoiceNumber, pageW - margin - 22, y + 9.5, { align: "right" });

  // Date on left
  doc.setFontSize(12);
  doc.setTextColor(gray[0], gray[1], gray[2]);
  const dateStr = invoice.createdAt.split("-").reverse().join("/");
  doc.text(dateStr, margin, y + 9, { align: "left" });

  // ── Client info ──
  y = 62;
  doc.setDrawColor(blue[0], blue[1], blue[2]);
  doc.setLineWidth(1);
  doc.line(pageW - margin, y, pageW - margin, y + 14);
  doc.setLineWidth(0.2);
  doc.setDrawColor(232, 236, 241);
  doc.rect(margin, y, contentW, 14);

  doc.setFontSize(8);
  doc.setTextColor(gray[0], gray[1], gray[2]);
  doc.text("العميل", pageW - margin - 4, y + 5, { align: "right" });

  doc.setFontSize(12);
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.setFont("helvetica", "bold");
  doc.text(invoice.clientName, pageW - margin - 4, y + 11, { align: "right" });

  // Client details on left
  if (clientInfo?.phone || clientInfo?.address) {
    doc.setFontSize(8);
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.setFont("helvetica", "normal");
    const details = [clientInfo.phone, clientInfo.address].filter(Boolean).join("  ·  ");
    doc.text(details, margin + 4, y + 9, { align: "left" });
  }

  // ── Items table ──
  y = 82;

  const tableHead = [["#", "الوصف", "الكمية", "سعر الوحدة", "المبلغ"]];
  const tableBody = items.map((item: InvoiceItem, i: number) => [
    String(i + 1),
    item.productName,
    `${item.quantity.toFixed(2)} الوحدات`,
    fmtCurrency(item.unitPrice, c),
    fmtCurrency(item.total, c),
  ]);

  (doc as any).autoTable({
    startY: y,
    head: tableHead,
    body: tableBody,
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 10,
      cellPadding: 4,
      lineColor: [240, 243, 247],
      lineWidth: 0.3,
      textColor: dark,
      halign: "right",
    },
    headStyles: {
      fillColor: dark,
      textColor: [220, 220, 240],
      fontSize: 8,
      fontStyle: "bold",
      halign: "right",
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 12, textColor: gray, fontSize: 9 },
      1: { cellWidth: "auto", fontStyle: "bold" },
      2: { halign: "center", cellWidth: 32 },
      3: { halign: "center", cellWidth: 30 },
      4: { halign: "left", cellWidth: 32, fontStyle: "bold" },
    },
    alternateRowStyles: { fillColor: [250, 251, 253] },
    margin: { left: margin, right: margin },
    didDrawPage: () => {},
  });

  // ── Totals box ──
  y = (doc as any).lastAutoTable.finalY + 8;
  const boxW = 80;
  const boxX = margin;

  // Subtotal
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.rect(boxX, y, boxW, 9, "F");
  doc.setFontSize(8);
  doc.setTextColor(gray[0], gray[1], gray[2]);
  doc.text("المجموع الفرعي", boxX + boxW - 3, y + 6, { align: "right" });
  doc.setFontSize(9);
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.setFont("helvetica", "bold");
  doc.text(fmtCurrency(invoice.subtotal, c), boxX + 3, y + 6, { align: "left" });
  y += 10;

  // Discount row
  if (invoice.discountAmount > 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(boxX, y, boxW, 9, "F");
    doc.setFontSize(8);
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.setFont("helvetica", "normal");
    const discLabel = `الخصم ${invoice.discountType === "percentage" ? `(${invoice.discountValue}%)` : ""}`;
    doc.text(discLabel, boxX + boxW - 3, y + 6, { align: "right" });
    doc.setTextColor(blue[0], blue[1], blue[2]);
    doc.setFont("helvetica", "bold");
    doc.text(`-${fmtCurrency(invoice.discountAmount, c)}`, boxX + 3, y + 6, { align: "left" });
    y += 10;
  }

  // Tax row
  if ((invoice.taxAmount ?? 0) > 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(boxX, y, boxW, 9, "F");
    doc.setFontSize(8);
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.setFont("helvetica", "normal");
    doc.text("الضريبة", boxX + boxW - 3, y + 6, { align: "right" });
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.setFont("helvetica", "bold");
    doc.text(`+${fmtCurrency(invoice.taxAmount, c)}`, boxX + 3, y + 6, { align: "left" });
    y += 10;
  }

  // Grand total
  doc.setFillColor(dark[0], dark[1], dark[2]);
  doc.rect(boxX, y, boxW, 12, "F");
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 220);
  doc.setFont("helvetica", "bold");
  doc.text("الإجمالي", boxX + boxW - 3, y + 8, { align: "right" });
  doc.setFontSize(14);
  doc.setTextColor(blue[0], blue[1], blue[2]);
  doc.text(fmtCurrency(invoice.total, c), boxX + 3, y + 8.5, { align: "left" });

  // ── Notes ──
  if (invoice.notes) {
    y += 18;
    doc.setDrawColor(blue[0], blue[1], blue[2]);
    doc.setLineWidth(1);
    doc.line(pageW - margin, y, pageW - margin, y + 12);
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.rect(margin, y, contentW, 12, "F");
    doc.setFontSize(7);
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.setFont("helvetica", "normal");
    doc.text("ملاحظات", pageW - margin - 4, y + 4.5, { align: "right" });
    doc.setFontSize(9);
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.text(invoice.notes, pageW - margin - 4, y + 9, { align: "right" });
  }

  // ── Footer ──
  const footerY = 280;
  doc.setDrawColor(232, 236, 241);
  doc.line(margin, footerY, pageW - margin, footerY);
  doc.setFontSize(7);
  doc.setTextColor(gray[0], gray[1], gray[2]);
  doc.setFont("helvetica", "normal");
  doc.text(settings.invoiceNotes || "شكراً لتعاملكم معنا", pageW - margin, footerY + 5, { align: "right" });
  doc.text("1 / 1", margin, footerY + 5, { align: "left" });

  // Bottom strip
  doc.setFillColor(blue[0], blue[1], blue[2]);
  doc.rect(0, 294, pageW * 0.5, 3, "F");
  doc.setFillColor(27, 138, 194);
  doc.rect(pageW * 0.5, 294, pageW * 0.3, 3, "F");
  doc.setFillColor(dark[0], dark[1], dark[2]);
  doc.rect(pageW * 0.8, 294, pageW * 0.2, 3, "F");

  const clientPart = sanitizeFilename(invoice.clientName);
  const datePart = invoice.createdAt.replace(/\//g, "-");
  downloadDoc(doc, `${clientPart}_${datePart}_${invoice.invoiceNumber}.pdf`);
}

// ============================================================
// REPORT PDF EXPORTS
// ============================================================
export interface ReportDateRange {
  from: string;
  to: string;
}

async function createReportPdf(
  title: string,
  subtitle: string,
  dateRange: ReportDateRange,
  settings: AppSettings,
  stats: { label: string; value: string }[],
  tableHead: string[][],
  tableBody: string[][],
  totalsRow?: string[],
) {
  const doc = await createPdf();
  const c = settings.currencySymbol || "$";
  const pageW = 210;
  const margin = 15;
  const blue = [41, 171, 226];
  const dark = [26, 26, 46];
  const gray = [100, 116, 139];
  const lightGray = [241, 245, 249];

  // Accent bar
  doc.setFillColor(blue[0], blue[1], blue[2]);
  doc.rect(0, 0, pageW, 3, "F");

  // Title
  let y = 14;
  doc.setFontSize(16);
  doc.setTextColor(blue[0], blue[1], blue[2]);
  doc.setFont("helvetica", "bold");
  doc.text(title, pageW - margin, y, { align: "right" });

  doc.setFontSize(9);
  doc.setTextColor(gray[0], gray[1], gray[2]);
  doc.setFont("helvetica", "normal");
  doc.text(subtitle, pageW - margin, y + 6, { align: "right" });

  // Date range on left
  doc.setFontSize(8);
  doc.text(`من ${dateRange.from} إلى ${dateRange.to}`, margin, y + 2, { align: "left" });
  doc.setFontSize(7);
  doc.text(`${settings.businessName} | ${settings.businessNameEn}`, margin, y + 6, { align: "left" });

  // Separator
  y = 24;
  doc.setDrawColor(232, 236, 241);
  doc.line(margin, y, pageW - margin, y);

  // Stats row
  y = 28;
  const statW = (pageW - margin * 2) / stats.length;
  stats.forEach((stat, i) => {
    const x = pageW - margin - (i + 1) * statW;
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.rect(x + 1, y, statW - 2, 16, "F");
    doc.setFillColor(blue[0], blue[1], blue[2]);
    doc.rect(x + 1, y, statW - 2, 1.5, "F");

    doc.setFontSize(7);
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.text(stat.label, x + statW / 2, y + 6, { align: "center" });
    doc.setFontSize(11);
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.setFont("helvetica", "bold");
    doc.text(stat.value, x + statW / 2, y + 13, { align: "center" });
  });

  // Table
  y = 48;
  const body = totalsRow ? [...tableBody, totalsRow] : tableBody;

  (doc as any).autoTable({
    startY: y,
    head: tableHead,
    body,
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 3,
      lineColor: [240, 243, 247],
      lineWidth: 0.2,
      textColor: dark,
      halign: "right",
    },
    headStyles: {
      fillColor: blue,
      textColor: [255, 255, 255],
      fontSize: 7,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [250, 251, 253] },
    margin: { left: margin, right: margin },
    didParseCell: (data: any) => {
      // Bold totals row
      if (totalsRow && data.section === "body" && data.row.index === tableBody.length) {
        data.cell.styles.fillColor = blue;
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  // Footer
  const fY = 285;
  doc.setDrawColor(232, 236, 241);
  doc.line(margin, fY, pageW - margin, fY);
  doc.setFontSize(7);
  doc.setTextColor(gray[0], gray[1], gray[2]);
  doc.setFont("helvetica", "normal");
  doc.text(`${settings.businessName} — ${settings.businessNameEn}`, pageW - margin, fY + 4, { align: "right" });
  doc.text(new Date().toLocaleDateString("ar-SY"), margin, fY + 4, { align: "left" });

  return doc;
}

export async function exportInventoryReportPDF(
  products: { name: string; category: string; price: number; stock: number; unit: string; minStock: number }[],
  dateRange: ReportDateRange,
  settings: AppSettings,
) {
  const c = settings.currencySymbol || "$";
  const totalValue = products.reduce((s, p) => s + p.price * p.stock, 0);
  const totalStock = products.reduce((s, p) => s + p.stock, 0);
  const lowStock = products.filter(p => p.stock <= p.minStock);

  const doc = await createReportPdf(
    "تقرير المخزون", `${products.length} منتج`, dateRange, settings,
    [
      { label: "إجمالي المنتجات", value: String(products.length) },
      { label: "إجمالي المخزون", value: totalStock.toLocaleString() },
      { label: "قيمة المخزون", value: fmtCurrency(totalValue, c) },
      { label: "منخفض المخزون", value: String(lowStock.length) },
    ],
    [["#", "المنتج", "الفئة", "السعر", "المخزون", "الوحدة", "القيمة"]],
    products.map((p, i) => [String(i + 1), p.name, p.category, fmtCurrency(p.price, c), String(p.stock), p.unit, fmtCurrency(p.price * p.stock, c)]),
    ["", `${products.length} منتج`, "", "", String(totalStock), "", fmtCurrency(totalValue, c)],
  );
  downloadDoc(doc, `تقرير_المخزون_${dateRange.from}_${dateRange.to}.pdf`);
}

export async function exportSalesReportPDF(
  invoices: Invoice[],
  dateRange: ReportDateRange,
  settings: AppSettings,
) {
  const c = settings.currencySymbol || "$";
  const filtered = invoices.filter(inv => inv.createdAt >= dateRange.from && inv.createdAt <= dateRange.to && inv.status !== "ملغاة" && inv.status !== "مسودة");
  const totalRevenue = filtered.filter(inv => inv.status === "مدفوعة").reduce((s, inv) => s + inv.total, 0);
  const paidCount = filtered.filter(inv => inv.status === "مدفوعة").length;
  const unpaidTotal = filtered.filter(inv => inv.status === "غير مدفوعة").reduce((s, inv) => s + inv.total, 0);

  const doc = await createReportPdf(
    "تقرير المبيعات", `${filtered.length} فاتورة`, dateRange, settings,
    [
      { label: "إجمالي المبيعات", value: fmtCurrency(totalRevenue, c) },
      { label: "عدد الفواتير", value: String(filtered.length) },
      { label: "المدفوعة", value: String(paidCount) },
      { label: "مستحقات معلقة", value: fmtCurrency(unpaidTotal, c) },
    ],
    [["#", "رقم الفاتورة", "العميل", "التاريخ", "الحالة", "الإجمالي"]],
    filtered.map((inv, i) => {
      const items = Array.isArray(inv.items) ? inv.items : (inv.items as any)?._items || [];
      return [String(i + 1), inv.invoiceNumber, inv.clientName, inv.createdAt, inv.status, fmtCurrency(inv.total, c)];
    }),
    ["", `${filtered.length} فاتورة`, "", "", `${paidCount} مدفوعة`, fmtCurrency(totalRevenue, c)],
  );
  downloadDoc(doc, `تقرير_المبيعات_${dateRange.from}_${dateRange.to}.pdf`);
}

export async function exportClientsReportPDF(
  clients: { id: string; name: string; phone: string; address: string; totalSpent: number }[],
  invoices: Invoice[],
  dateRange: ReportDateRange,
  settings: AppSettings,
) {
  const c = settings.currencySymbol || "$";
  const totalSpent = clients.reduce((s, cl) => s + cl.totalSpent, 0);

  const doc = await createReportPdf(
    "تقرير العملاء", `${clients.length} عميل`, dateRange, settings,
    [
      { label: "عدد العملاء", value: String(clients.length) },
      { label: "إجمالي المبيعات", value: fmtCurrency(totalSpent, c) },
      { label: "عدد الفواتير", value: String(invoices.length) },
    ],
    [["#", "العميل", "الهاتف", "العنوان", "الفواتير", "إجمالي الإنفاق"]],
    clients.map((cl, i) => [String(i + 1), cl.name, cl.phone || "—", cl.address || "—", String(invoices.filter(inv => inv.clientId === cl.id).length), fmtCurrency(cl.totalSpent, c)]),
    ["", `${clients.length} عميل`, "", "", String(invoices.length), fmtCurrency(totalSpent, c)],
  );
  downloadDoc(doc, `تقرير_العملاء_${dateRange.from}_${dateRange.to}.pdf`);
}

export async function exportAccountingReportPDF(
  invoices: Invoice[],
  dateRange: ReportDateRange,
  settings: AppSettings,
) {
  const c = settings.currencySymbol || "$";
  const filtered = invoices.filter(inv => inv.createdAt >= dateRange.from && inv.createdAt <= dateRange.to && inv.status !== "ملغاة" && inv.status !== "مسودة");
  const paidRevenue = filtered.filter(inv => inv.status === "مدفوعة").reduce((s, inv) => s + inv.total, 0);
  const unpaidRevenue = filtered.filter(inv => inv.status === "غير مدفوعة").reduce((s, inv) => s + inv.total, 0);
  const totalRevenue = paidRevenue + unpaidRevenue;
  const discounts = filtered.reduce((s, inv) => s + inv.discountAmount, 0);

  const doc = await createReportPdf(
    "التقرير المحاسبي", `الفترة: من ${dateRange.from} إلى ${dateRange.to}`, dateRange, settings,
    [
      { label: "إجمالي الإيرادات", value: fmtCurrency(totalRevenue, c) },
      { label: "المحصّل", value: fmtCurrency(paidRevenue, c) },
      { label: "المستحقات", value: fmtCurrency(unpaidRevenue, c) },
      { label: "الخصومات", value: fmtCurrency(discounts, c) },
    ],
    [["#", "رقم الفاتورة", "العميل", "التاريخ", "الحالة", "الخصم", "الإجمالي"]],
    filtered.map((inv, i) => [String(i + 1), inv.invoiceNumber, inv.clientName, inv.createdAt, inv.status, inv.discountAmount > 0 ? `-${fmtCurrency(inv.discountAmount, c)}` : "—", fmtCurrency(inv.total, c)]),
    ["", `${filtered.length} فاتورة`, "", "", "", discounts > 0 ? `-${fmtCurrency(discounts, c)}` : "—", fmtCurrency(totalRevenue, c)],
  );
  downloadDoc(doc, `التقرير_المحاسبي_${dateRange.from}_${dateRange.to}.pdf`);
}

export async function exportOrdersReportPDF(
  orders: { trackingId: string; clientName: string; description: string; status: string; createdAt: string }[],
  dateRange: ReportDateRange,
  settings: AppSettings,
) {
  const filtered = orders.filter(o => o.createdAt >= dateRange.from && o.createdAt <= dateRange.to);
  const pending = filtered.filter(o => o.status === "قيد الانتظار").length;
  const inProgress = filtered.filter(o => o.status === "قيد التنفيذ").length;
  const completed = filtered.filter(o => o.status === "مكتمل").length;

  const doc = await createReportPdf(
    "تقرير الطلبات", `${filtered.length} طلب`, dateRange, settings,
    [
      { label: "إجمالي الطلبات", value: String(filtered.length) },
      { label: "قيد الانتظار", value: String(pending) },
      { label: "قيد التنفيذ", value: String(inProgress) },
      { label: "مكتمل", value: String(completed) },
    ],
    [["#", "رقم التتبع", "العميل", "الوصف", "الحالة", "التاريخ"]],
    filtered.map((o, i) => [String(i + 1), o.trackingId, o.clientName, o.description || "—", o.status, o.createdAt]),
  );
  downloadDoc(doc, `تقرير_الطلبات_${dateRange.from}_${dateRange.to}.pdf`);
}

export async function exportClientSheetPDF(
  client: { name: string; phone: string; address: string; totalSpent: number; createdAt: string },
  clientInvoices: Invoice[],
  settings: AppSettings,
) {
  const c = settings.currencySymbol || "$";

  const doc = await createReportPdf(
    `بيانات العميل: ${client.name}`, `${client.phone || ""} — ${client.address || ""}`,
    { from: clientInvoices.length > 0 ? clientInvoices[clientInvoices.length - 1].createdAt : "—", to: clientInvoices.length > 0 ? clientInvoices[0].createdAt : "—" },
    settings,
    [
      { label: "إجمالي المشتريات", value: fmtCurrency(client.totalSpent, c) },
      { label: "عدد الفواتير", value: String(clientInvoices.length) },
      { label: "تاريخ التسجيل", value: client.createdAt },
    ],
    [["#", "رقم الفاتورة", "التاريخ", "الحالة", "الإجمالي"]],
    clientInvoices.map((inv, i) => [String(i + 1), inv.invoiceNumber, inv.createdAt, inv.status, fmtCurrency(inv.total, c)]),
    ["", `${clientInvoices.length} فاتورة`, "", "", fmtCurrency(client.totalSpent, c)],
  );
  downloadDoc(doc, `${sanitizeFilename(client.name)}_بيانات.pdf`);
}

// ============================================================
// WHATSAPP
// ============================================================
export function shareInvoiceWhatsApp(
  invoice: Invoice,
  settings: AppSettings
) {
  const items = Array.isArray(invoice.items) ? invoice.items : (invoice.items as any)?._items || [];
  const lines = [
    `*${settings.businessName}*`,
    `فاتورة رقم: ${invoice.invoiceNumber}`,
    `العميل: ${invoice.clientName}`,
    `التاريخ: ${invoice.createdAt}`,
    "",
    "*المنتجات:*",
    ...items.map(
      (item: InvoiceItem, i: number) =>
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
