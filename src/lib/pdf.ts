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
// Core: render HTML string inside a hidden iframe and trigger print/save
// ============================================================
async function downloadPdf(html: string, filename: string): Promise<void> {
  const html2pdf = (await import("html2pdf.js")).default;

  // Create a hidden container to render the HTML
  const container = document.createElement("div");
  container.innerHTML = html;
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "210mm";
  document.body.appendChild(container);

  // Wait for fonts to load
  await new Promise(r => setTimeout(r, 300));

  await (html2pdf as any)()
    .set({
      margin: [8, 8, 12, 8],
      filename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    })
    .from(container)
    .save();

  document.body.removeChild(container);
}

// ============================================================
// Shared HTML template wrapper
// ============================================================
function reportTemplate(opts: {
  title: string;
  subtitle?: string;
  dateRange?: { from: string; to: string };
  companyName: string;
  companyNameEn: string;
  accentColor?: string;
  body: string;
  stats?: { label: string; value: string }[];
}): string {
  const accent = opts.accentColor || "#2563eb";
  const statsHtml = opts.stats
    ? `<div class="stats-row">${opts.stats.map(s =>
        `<div class="stat-box" style="border-top: 3px solid ${accent}">
          <div class="stat-label">${s.label}</div>
          <div class="stat-value">${s.value}</div>
        </div>`
      ).join("")}</div>`
    : "";
  const dateRangeHtml = opts.dateRange
    ? `<div class="date-range">من ${opts.dateRange.from} إلى ${opts.dateRange.to}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>${opts.title}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, sans-serif; font-size: 11px; color: #1e293b; direction: rtl; padding: 20px 30px; }
@media print {
  @page { size: A4; margin: 15mm 12mm; }
  body { padding: 0; }
  .no-print { display: none !important; }
}
.accent-bar { height: 4px; background: ${accent}; margin-bottom: 16px; border-radius: 2px; }
.header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0; }
.header-right h1 { font-size: 20px; font-weight: 700; color: ${accent}; }
.header-right .subtitle { font-size: 10px; color: #64748b; margin-top: 2px; }
.header-left { text-align: left; }
.date-range { font-size: 9px; color: #64748b; background: #f8fafc; padding: 4px 10px; border-radius: 4px; display: inline-block; }
.company-info { font-size: 8px; color: #94a3b8; margin-top: 4px; }
.stats-row { display: flex; gap: 10px; margin: 14px 0; }
.stat-box { flex: 1; background: #f8fafc; border-radius: 6px; padding: 10px 12px; }
.stat-label { font-size: 9px; color: #64748b; }
.stat-value { font-size: 16px; font-weight: 700; color: #1e293b; margin-top: 2px; }
table { width: 100%; border-collapse: collapse; margin-top: 10px; }
thead tr { background: ${accent}; color: white; }
thead th { padding: 7px 10px; font-size: 9px; font-weight: 700; text-align: right; }
tbody tr { border-bottom: 0.5px solid #e2e8f0; }
tbody tr:nth-child(even) { background: #f8fafc; }
tbody td { padding: 6px 10px; font-size: 10px; }
tfoot tr { background: ${accent}; color: white; font-weight: 700; }
tfoot td { padding: 7px 10px; font-size: 10px; }
.totals-row { background: ${accent} !important; color: white !important; }
.totals-row td { font-weight: 700; }
.text-left { text-align: left; }
.text-center { text-align: center; }
.text-muted { color: #64748b; }
.font-bold { font-weight: 700; }
.footer { margin-top: 20px; border-top: 0.5px solid #e2e8f0; padding-top: 8px; display: flex; justify-content: space-between; font-size: 8px; color: #94a3b8; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 8px; font-weight: 600; }
.badge-paid { background: #dcfce7; color: #16a34a; }
.badge-unpaid { background: #fef3c7; color: #d97706; }
.badge-draft { background: #f1f5f9; color: #64748b; }
.badge-cancelled { background: #fee2e2; color: #dc2626; }
</style>
</head>
<body>
<div class="accent-bar"></div>
<div class="header">
  <div class="header-right">
    <h1>${opts.title}</h1>
    ${opts.subtitle ? `<div class="subtitle">${opts.subtitle}</div>` : ""}
  </div>
  <div class="header-left">
    ${dateRangeHtml}
    <div class="company-info">${opts.companyName} | ${opts.companyNameEn}</div>
  </div>
</div>
${statsHtml}
${opts.body}
<div class="footer">
  <span>${opts.companyName} — ${opts.companyNameEn}</span>
  <span>${new Date().toLocaleDateString("ar-SY")}</span>
</div>
</body>
</html>`;
}

function statusBadge(status: string): string {
  const cls = status === "مدفوعة" ? "badge-paid" : status === "غير مدفوعة" ? "badge-unpaid" : status === "مسودة" ? "badge-draft" : "badge-cancelled";
  return `<span class="badge ${cls}">${status}</span>`;
}

// ============================================================
// INVOICE PDF
// ============================================================
export async function exportInvoicePDF(
  invoice: Invoice,
  settings: AppSettings,
) {
  const c = settings.currencySymbol || "$";
  const items = Array.isArray(invoice.items) ? invoice.items : (invoice.items as any)?._items || [];

  const itemsHtml = items.map((item: InvoiceItem, i: number) => `
    <tr>
      <td class="text-center text-muted">${i + 1}</td>
      <td>${item.productName}</td>
      <td class="text-center">${item.quantity}</td>
      <td class="text-left">${fmtCurrency(item.unitPrice, c)}</td>
      <td class="text-left font-bold">${fmtCurrency(item.total, c)}</td>
    </tr>
  `).join("");

  const totalsHtml = `
    <div style="display:flex;justify-content:flex-start;margin-top:16px">
      <div style="width:280px;background:#f8fafc;border-radius:8px;padding:16px">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <span class="text-muted">المجموع الفرعي</span>
          <span>${fmtCurrency(invoice.subtotal, c)}</span>
        </div>
        ${invoice.discountAmount > 0 ? `
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <span class="text-muted">الخصم ${invoice.discountType === "percentage" ? `(${invoice.discountValue}%)` : ""}</span>
          <span style="color:#dc2626">-${fmtCurrency(invoice.discountAmount, c)}</span>
        </div>` : ""}
        ${(invoice.taxAmount ?? 0) > 0 ? `
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <span class="text-muted">الضريبة</span>
          <span>+${fmtCurrency(invoice.taxAmount, c)}</span>
        </div>` : ""}
        <div style="border-top:1px solid #e2e8f0;padding-top:8px;display:flex;justify-content:space-between;font-size:14px">
          <span class="font-bold">الإجمالي</span>
          <span class="font-bold" style="color:${settings.primaryColor || "#2563eb"}">${fmtCurrency(invoice.total, c)}</span>
        </div>
      </div>
    </div>
  `;

  const html = reportTemplate({
    title: `فاتورة ${invoice.invoiceNumber}`,
    subtitle: `${invoice.clientName} — ${statusBadge(invoice.status)}`,
    companyName: settings.businessName,
    companyNameEn: settings.businessNameEn || "Kamal Copy Center",
    accentColor: settings.primaryColor || "#2563eb",
    body: `
      <div style="margin-bottom:8px;font-size:10px;color:#64748b">
        <span>التاريخ: ${invoice.createdAt}</span>
        ${invoice.notes ? `<span style="margin-right:20px">ملاحظات: ${invoice.notes}</span>` : ""}
      </div>
      <table>
        <thead><tr>
          <th class="text-center" style="width:5%">#</th>
          <th style="width:40%">المنتج</th>
          <th class="text-center" style="width:12%">الكمية</th>
          <th class="text-left" style="width:18%">سعر الوحدة</th>
          <th class="text-left" style="width:25%">الإجمالي</th>
        </tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      ${totalsHtml}
    `,
  });

  const clientPart = sanitizeFilename(invoice.clientName);
  const datePart = invoice.createdAt.replace(/\//g, "-");
  const orderPart = invoice.invoiceNumber.replace(/^INV-/, "");
  await downloadPdf(html, `${clientPart}_${datePart}_${orderPart}.pdf`);
}

// ============================================================
// REPORT EXPORTS — each page calls its own function
// ============================================================

export interface ReportDateRange {
  from: string;
  to: string;
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

  const rows = products.map((p, i) => `
    <tr>
      <td class="text-center text-muted">${i + 1}</td>
      <td>${p.name}</td>
      <td class="text-center">${p.category}</td>
      <td class="text-left">${fmtCurrency(p.price, c)}</td>
      <td class="text-center">${p.stock}</td>
      <td class="text-center">${p.unit}</td>
      <td class="text-left font-bold">${fmtCurrency(p.price * p.stock, c)}</td>
    </tr>
  `).join("");

  const html = reportTemplate({
    title: "تقرير المخزون",
    subtitle: `${products.length} منتج`,
    dateRange,
    companyName: settings.businessName,
    companyNameEn: settings.businessNameEn || "Kamal Copy Center",
    accentColor: settings.primaryColor || "#2563eb",
    stats: [
      { label: "إجمالي المنتجات", value: String(products.length) },
      { label: "إجمالي المخزون", value: totalStock.toLocaleString() },
      { label: "قيمة المخزون", value: fmtCurrency(totalValue, c) },
      { label: "منخفض المخزون", value: String(lowStock.length) },
    ],
    body: `
      <table>
        <thead><tr>
          <th class="text-center" style="width:5%">#</th>
          <th style="width:28%">المنتج</th>
          <th class="text-center" style="width:13%">الفئة</th>
          <th class="text-left" style="width:12%">السعر</th>
          <th class="text-center" style="width:10%">المخزون</th>
          <th class="text-center" style="width:10%">الوحدة</th>
          <th class="text-left" style="width:17%">القيمة</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr class="totals-row">
          <td></td><td>${products.length} منتج</td><td></td><td></td>
          <td class="text-center">${totalStock.toLocaleString()}</td><td></td>
          <td class="text-left">${fmtCurrency(totalValue, c)}</td>
        </tr></tfoot>
      </table>
    `,
  });

  await downloadPdf(html, `تقرير_المخزون_${dateRange.from}_${dateRange.to}.pdf`);
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

  const rows = filtered.map((inv, i) => {
    const items = Array.isArray(inv.items) ? inv.items : (inv.items as any)?._items || [];
    return `
    <tr>
      <td class="text-center text-muted">${i + 1}</td>
      <td>${inv.invoiceNumber}</td>
      <td>${inv.clientName}</td>
      <td>${inv.createdAt}</td>
      <td class="text-center">${statusBadge(inv.status)}</td>
      <td class="text-center">${items.length}</td>
      <td class="text-left font-bold">${fmtCurrency(inv.total, c)}</td>
    </tr>
  `}).join("");

  const html = reportTemplate({
    title: "تقرير المبيعات",
    subtitle: `${filtered.length} فاتورة`,
    dateRange,
    companyName: settings.businessName,
    companyNameEn: settings.businessNameEn || "Kamal Copy Center",
    accentColor: settings.primaryColor || "#2563eb",
    stats: [
      { label: "إجمالي المبيعات", value: fmtCurrency(totalRevenue, c) },
      { label: "عدد الفواتير", value: String(filtered.length) },
      { label: "المدفوعة", value: String(paidCount) },
      { label: "مستحقات معلقة", value: fmtCurrency(unpaidTotal, c) },
    ],
    body: `
      <table>
        <thead><tr>
          <th class="text-center" style="width:5%">#</th>
          <th style="width:14%">رقم الفاتورة</th>
          <th style="width:22%">العميل</th>
          <th style="width:12%">التاريخ</th>
          <th class="text-center" style="width:12%">الحالة</th>
          <th class="text-center" style="width:8%">المنتجات</th>
          <th class="text-left" style="width:20%">الإجمالي</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr class="totals-row">
          <td></td><td>${filtered.length} فاتورة</td><td></td><td></td>
          <td class="text-center">${paidCount} مدفوعة</td><td></td>
          <td class="text-left">${fmtCurrency(totalRevenue, c)}</td>
        </tr></tfoot>
      </table>
    `,
  });

  await downloadPdf(html, `تقرير_المبيعات_${dateRange.from}_${dateRange.to}.pdf`);
}

export async function exportClientsReportPDF(
  clients: { id: string; name: string; phone: string; address: string; totalSpent: number }[],
  invoices: Invoice[],
  dateRange: ReportDateRange,
  settings: AppSettings,
) {
  const c = settings.currencySymbol || "$";
  const totalSpent = clients.reduce((s, cl) => s + cl.totalSpent, 0);

  const rows = clients.map((cl, i) => `
    <tr>
      <td class="text-center text-muted">${i + 1}</td>
      <td class="font-bold">${cl.name}</td>
      <td>${cl.phone || "—"}</td>
      <td>${cl.address || "—"}</td>
      <td class="text-center">${invoices.filter(inv => inv.clientId === cl.id).length}</td>
      <td class="text-left font-bold">${fmtCurrency(cl.totalSpent, c)}</td>
    </tr>
  `).join("");

  const html = reportTemplate({
    title: "تقرير العملاء",
    subtitle: `${clients.length} عميل`,
    dateRange,
    companyName: settings.businessName,
    companyNameEn: settings.businessNameEn || "Kamal Copy Center",
    accentColor: settings.primaryColor || "#2563eb",
    stats: [
      { label: "عدد العملاء", value: String(clients.length) },
      { label: "إجمالي المبيعات", value: fmtCurrency(totalSpent, c) },
      { label: "عدد الفواتير", value: String(invoices.length) },
    ],
    body: `
      <table>
        <thead><tr>
          <th class="text-center" style="width:5%">#</th>
          <th style="width:25%">العميل</th>
          <th style="width:18%">الهاتف</th>
          <th style="width:18%">العنوان</th>
          <th class="text-center" style="width:10%">الفواتير</th>
          <th class="text-left" style="width:24%">إجمالي الإنفاق</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr class="totals-row">
          <td></td><td>${clients.length} عميل</td><td></td><td></td>
          <td class="text-center">${invoices.length}</td>
          <td class="text-left">${fmtCurrency(totalSpent, c)}</td>
        </tr></tfoot>
      </table>
    `,
  });

  await downloadPdf(html, `تقرير_العملاء_${dateRange.from}_${dateRange.to}.pdf`);
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

  const rows = filtered.map((inv, i) => `
    <tr>
      <td class="text-center text-muted">${i + 1}</td>
      <td>${inv.invoiceNumber}</td>
      <td>${inv.clientName}</td>
      <td>${inv.createdAt}</td>
      <td class="text-center">${statusBadge(inv.status)}</td>
      <td class="text-left">${inv.discountAmount > 0 ? `-${fmtCurrency(inv.discountAmount, c)}` : "—"}</td>
      <td class="text-left font-bold">${fmtCurrency(inv.total, c)}</td>
    </tr>
  `).join("");

  const html = reportTemplate({
    title: "التقرير المحاسبي",
    subtitle: `الفترة: من ${dateRange.from} إلى ${dateRange.to}`,
    dateRange,
    companyName: settings.businessName,
    companyNameEn: settings.businessNameEn || "Kamal Copy Center",
    accentColor: settings.primaryColor || "#2563eb",
    stats: [
      { label: "إجمالي الإيرادات", value: fmtCurrency(totalRevenue, c) },
      { label: "المحصّل", value: fmtCurrency(paidRevenue, c) },
      { label: "المستحقات", value: fmtCurrency(unpaidRevenue, c) },
      { label: "الخصومات", value: fmtCurrency(discounts, c) },
    ],
    body: `
      <table>
        <thead><tr>
          <th class="text-center" style="width:5%">#</th>
          <th style="width:14%">رقم الفاتورة</th>
          <th style="width:22%">العميل</th>
          <th style="width:12%">التاريخ</th>
          <th class="text-center" style="width:12%">الحالة</th>
          <th class="text-left" style="width:12%">الخصم</th>
          <th class="text-left" style="width:20%">الإجمالي</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr class="totals-row">
          <td></td><td>${filtered.length} فاتورة</td><td></td><td></td><td></td>
          <td class="text-left">${discounts > 0 ? `-${fmtCurrency(discounts, c)}` : "—"}</td>
          <td class="text-left">${fmtCurrency(totalRevenue, c)}</td>
        </tr></tfoot>
      </table>
    `,
  });

  await downloadPdf(html, `التقرير_المحاسبي_${dateRange.from}_${dateRange.to}.pdf`);
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

  const rows = filtered.map((o, i) => `
    <tr>
      <td class="text-center text-muted">${i + 1}</td>
      <td class="font-bold">${o.trackingId}</td>
      <td>${o.clientName}</td>
      <td>${o.description || "—"}</td>
      <td class="text-center">${statusBadge(o.status)}</td>
      <td>${o.createdAt}</td>
    </tr>
  `).join("");

  const html = reportTemplate({
    title: "تقرير الطلبات",
    subtitle: `${filtered.length} طلب`,
    dateRange,
    companyName: settings.businessName,
    companyNameEn: settings.businessNameEn || "Kamal Copy Center",
    accentColor: settings.primaryColor || "#2563eb",
    stats: [
      { label: "إجمالي الطلبات", value: String(filtered.length) },
      { label: "قيد الانتظار", value: String(pending) },
      { label: "قيد التنفيذ", value: String(inProgress) },
      { label: "مكتمل", value: String(completed) },
    ],
    body: `
      <table>
        <thead><tr>
          <th class="text-center" style="width:5%">#</th>
          <th style="width:14%">رقم التتبع</th>
          <th style="width:22%">العميل</th>
          <th style="width:25%">الوصف</th>
          <th class="text-center" style="width:14%">الحالة</th>
          <th style="width:14%">التاريخ</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `,
  });

  await downloadPdf(html, `تقرير_الطلبات_${dateRange.from}_${dateRange.to}.pdf`);
}

export async function exportClientSheetPDF(
  client: { name: string; phone: string; address: string; totalSpent: number; createdAt: string },
  clientInvoices: Invoice[],
  settings: AppSettings,
) {
  const c = settings.currencySymbol || "$";

  const rows = clientInvoices.map((inv, i) => {
    const items = Array.isArray(inv.items) ? inv.items : (inv.items as any)?._items || [];
    return `
    <tr>
      <td class="text-center text-muted">${i + 1}</td>
      <td>${inv.invoiceNumber}</td>
      <td>${inv.createdAt}</td>
      <td class="text-center">${statusBadge(inv.status)}</td>
      <td class="text-center">${items.length}</td>
      <td class="text-left font-bold">${fmtCurrency(inv.total, c)}</td>
    </tr>
  `}).join("");

  const html = reportTemplate({
    title: `بيانات العميل: ${client.name}`,
    subtitle: `${client.phone || ""} — ${client.address || ""}`,
    companyName: settings.businessName,
    companyNameEn: settings.businessNameEn || "Kamal Copy Center",
    accentColor: settings.primaryColor || "#2563eb",
    stats: [
      { label: "إجمالي المشتريات", value: fmtCurrency(client.totalSpent, c) },
      { label: "عدد الفواتير", value: String(clientInvoices.length) },
      { label: "تاريخ التسجيل", value: client.createdAt },
    ],
    body: clientInvoices.length > 0 ? `
      <table>
        <thead><tr>
          <th class="text-center" style="width:5%">#</th>
          <th style="width:20%">رقم الفاتورة</th>
          <th style="width:15%">التاريخ</th>
          <th class="text-center" style="width:15%">الحالة</th>
          <th class="text-center" style="width:10%">المنتجات</th>
          <th class="text-left" style="width:35%">الإجمالي</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr class="totals-row">
          <td></td><td>${clientInvoices.length} فاتورة</td><td></td><td></td><td></td>
          <td class="text-left">${fmtCurrency(client.totalSpent, c)}</td>
        </tr></tfoot>
      </table>
    ` : `<p style="text-align:center;padding:40px;color:#94a3b8">لا توجد فواتير لهذا العميل</p>`,
  });

  await downloadPdf(html, `${sanitizeFilename(client.name)}_بيانات.pdf`);
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
