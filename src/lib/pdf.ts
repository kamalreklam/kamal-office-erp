"use client";

import type { Invoice, InvoiceItem } from "@/lib/data";
import type { AppSettings } from "@/lib/store";

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, "_").replace(/\s+/g, "_");
}

function fmt(amount: number, symbol = "$"): string {
  const formatted = amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const clean = formatted.endsWith(".00") ? formatted.slice(0, -3) : formatted;
  return `${symbol}${clean}`;
}

async function generatePdfFromHtml(html: string, filename: string): Promise<void> {
  const res = await fetch("/api/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html, filename }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.details || err.error || "PDF generation failed");
  }

  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    // Fallback (Vercel): render HTML in hidden iframe, then use browser print-to-PDF
    const data = await res.json();
    if (data.fallback === "print" && data.html) {
      // Create hidden iframe to render the invoice
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "-9999px";
      iframe.style.top = "-9999px";
      iframe.style.width = "794px";
      iframe.style.height = "1123px";
      document.body.appendChild(iframe);
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(data.html);
        iframeDoc.close();
        // Wait for fonts/images to load then print
        await new Promise(resolve => setTimeout(resolve, 1500));
        iframe.contentWindow?.print();
        // Clean up after print dialog closes
        setTimeout(() => document.body.removeChild(iframe), 3000);
      }
    }
  } else {
    // PDF blob (local dev with puppeteer)
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// ============================================================
// INVOICE PDF
// ============================================================
export async function exportInvoicePDF(
  invoice: Invoice,
  settings: AppSettings,
  clientInfo?: { phone?: string; address?: string },
) {
  const c = settings.currencySymbol || "$";
  const items: InvoiceItem[] = Array.isArray(invoice.items) ? invoice.items : (invoice.items as any)?._items || [];
  const dateStr = invoice.createdAt;
  const clientDetail = [clientInfo?.phone, clientInfo?.address].filter(Boolean).join(" · ");
  // White logo for dark header background
  const logoUrl = typeof window !== "undefined" ? window.location.origin + "/logo.png" : "http://localhost:3001/logo.png";

  const rows = items.map((item, i) => `
    <tr>
      <td><span class="row-num">${String(i + 1).padStart(2, "0")}</span></td>
      <td><div class="item-name">${item.productName}</div></td>
      <td class="t-center">${item.quantity}</td>
      <td class="t-center"><span class="t-mono">${fmt(item.unitPrice, c).replace(c, "")}</span></td>
      <td class="t-left"><span class="t-mono">${fmt(item.total, c).replace(c, "")}</span></td>
    </tr>
  `).join("");

  let discountRow = "";
  if (invoice.discountAmount > 0) {
    discountRow = `<div class="totals-row discount"><span class="label">خصم (${invoice.discountType === "percentage" ? `${invoice.discountValue}%` : "ثابت"})</span><span class="value">- ${fmt(invoice.discountAmount, c).replace(c, "")} ${c === "$" ? "USD" : c}</span></div>`;
  }
  let taxRow = "";
  if ((invoice.taxAmount ?? 0) > 0) {
    taxRow = `<div class="totals-row"><span class="label">الضريبة</span><span class="value">+ ${fmt(invoice.taxAmount, c).replace(c, "")} ${c === "$" ? "USD" : c}</span></div>`;
  }

  const currLabel = c === "$" ? "USD" : c;

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700;800&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');

:root {
  --blue: #29ABE2;
  --blue-dark: #1B8AC2;
  --blue-light: #e8f6fc;
  --key: #1a1a2e;
  --text: #1a1a2e;
  --text-secondary: #546e7a;
  --text-muted: #90a4ae;
  --surface: #ffffff;
  --surface-alt: #f5f7fa;
  --border: #e8ecf1;
  --border-light: #f0f3f7;
}

@page { size: A4; margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'IBM Plex Sans Arabic', sans-serif;
  font-size: 13px;
  color: var(--text);
  direction: rtl;
  background: var(--surface);
  -webkit-font-smoothing: antialiased;
  width: 210mm;
  min-height: 297mm;
  position: relative;
}

/* ═══ TOP STRIP ═══ */
.geo-strip { position:absolute; top:0; right:0; left:0; height:6px; display:flex; z-index:10; }
.geo-strip span { flex:1; }
.geo-strip span:nth-child(1) { background:var(--blue); }
.geo-strip span:nth-child(2) { background:var(--blue-dark); }
.geo-strip span:nth-child(3) { background:var(--key); }
.geo-strip span:nth-child(4) { background:var(--key); }

/* ═══ HEADER ═══ */
.header { padding:36px 40px 28px; background:var(--key); position:relative; overflow:hidden; }
.header::before { content:''; position:absolute; top:0; left:0; right:0; bottom:0; background-image:radial-gradient(circle,rgba(41,171,226,0.07) 1.5px,transparent 1.5px); background-size:20px 20px; }
.header::after { content:''; position:absolute; bottom:0; left:0; width:140px; height:140px; background:linear-gradient(135deg,transparent 50%,rgba(41,171,226,0.1) 50%); }
.header-inner { display:flex; justify-content:space-between; align-items:center; position:relative; z-index:2; }
.company-name { font-size:28px; font-weight:800; color:#fff; letter-spacing:-0.5px; line-height:1.1; }
.company-tagline { font-size:11px; font-weight:500; color:var(--blue); letter-spacing:2.5px; margin-top:6px; }
.company-contact { display:flex; gap:20px; margin-top:8px; }
.company-contact span { font-size:10.5px; color:rgba(255,255,255,0.45); }
.logo-placeholder { width:120px; height:100px; border:2px solid rgba(255,255,255,0.15); border-radius:12px; display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.3); font-size:8px; font-weight:600; }
.logo-img { height:100px; }

/* ═══ TITLE BAR ═══ */
.title-bar { display:flex; justify-content:space-between; align-items:center; padding:18px 40px; background:var(--surface-alt); border-bottom:1px solid var(--border); }
.invoice-label { font-size:13px; font-weight:700; color:var(--blue); letter-spacing:3px; }
.invoice-number { font-family:'Space Mono',monospace; font-size:28px; font-weight:700; color:var(--text); letter-spacing:-1px; direction:ltr; margin-right:14px; }
.invoice-date { font-family:'Space Mono',monospace; font-size:18px; color:var(--text-secondary); direction:ltr; }

/* ═══ CONTENT ═══ */
.content { padding:28px 40px 20px; }

/* Client block */
.info-block { padding:14px 20px; border:1px solid var(--border); border-radius:6px; position:relative; overflow:hidden; display:flex; align-items:center; gap:24px; margin-bottom:30px; }
.info-block::before { content:''; position:absolute; top:0; right:0; width:4px; height:100%; background:var(--blue); }
.info-block-label { font-size:10px; font-weight:700; color:var(--text-muted); letter-spacing:2px; white-space:nowrap; }
.info-block .name { font-size:16px; font-weight:700; color:var(--text); white-space:nowrap; }
.info-block .detail { font-size:12px; color:var(--text-secondary); white-space:nowrap; }

/* ═══ TABLE ═══ */
.items-table { width:100%; border-collapse:collapse; margin-bottom:24px; }
.items-table thead { background:var(--key); }
.items-table thead th { padding:13px 18px; font-size:11px; font-weight:700; color:rgba(255,255,255,0.75); text-align:right; letter-spacing:1.2px; white-space:nowrap; }
.items-table thead th:first-child { border-radius:0 6px 0 0; width:36px; text-align:center; }
.items-table thead th:last-child { border-radius:6px 0 0 0; text-align:left; }
.items-table thead th.t-center { text-align:center; }
.items-table tbody td { padding:14px 18px; font-size:13px; border-bottom:1px solid var(--border-light); vertical-align:middle; white-space:nowrap; }
.items-table tbody tr:nth-child(even) { background:rgba(245,247,250,0.5); }
.item-name { font-weight:600; white-space:normal; }
.t-center { text-align:center; }
.t-left { text-align:left; }
.t-mono { font-family:'Space Mono',monospace; font-size:13px; direction:ltr; display:inline-block; }
.row-num { font-family:'Space Mono',monospace; font-size:11px; color:var(--text-muted); font-weight:700; }

/* ═══ TOTALS ═══ */
.totals-area { display:flex; justify-content:flex-end; margin-bottom:28px; break-inside:avoid; page-break-inside:avoid; }
.totals-box { width:310px; border:1px solid var(--border); border-radius:6px; overflow:hidden; break-inside:avoid; page-break-inside:avoid; }
.totals-row { display:flex; justify-content:space-between; align-items:center; padding:10px 18px; border-bottom:1px solid var(--border-light); }
.totals-row:last-of-type:not(.grand-total) { border-bottom:none; }
.totals-row .label { font-size:12px; color:var(--text-secondary); font-weight:500; }
.totals-row .value { font-family:'Space Mono',monospace; font-size:13px; font-weight:700; color:var(--text); direction:ltr; }
.totals-row.discount .value { color:#d32f2f; }
.totals-row.grand-total { background:var(--key); padding:14px 18px; border-bottom:none; }
.totals-row.grand-total .label { font-size:13px; font-weight:700; color:rgba(255,255,255,0.8); }
.totals-row.grand-total .value { font-size:22px; font-weight:700; color:var(--blue); letter-spacing:-0.5px; }

/* ═══ NOTES ═══ */
.notes-section { padding:16px 20px; background:var(--surface-alt); border-right:3px solid var(--blue); border-radius:0 6px 6px 0; margin-bottom:20px; break-inside:avoid; page-break-inside:avoid; }
.notes-title { font-size:10px; font-weight:700; color:var(--text-muted); letter-spacing:2px; margin-bottom:6px; }
.notes-text { font-size:12px; color:var(--text-secondary); line-height:1.7; }

/* ═══ FOOTER ═══ */
.footer { position:absolute; bottom:0; left:0; right:0; }
.footer-content { display:flex; justify-content:space-between; align-items:center; padding:16px 40px; background:var(--surface-alt); border-top:1px solid var(--border); }
.footer-legal { font-size:10px; color:var(--text-muted); }
.footer-page { font-family:'Space Mono',monospace; font-size:10px; color:var(--text-muted); }
.footer-strip { height:4px; display:flex; }
.footer-strip span:nth-child(1) { flex:5; background:var(--blue); }
.footer-strip span:nth-child(2) { flex:3; background:var(--blue-dark); }
.footer-strip span:nth-child(3) { flex:2; background:var(--key); }
</style>
</head>
<body>

<!-- CMYK Top Strip -->
<div class="geo-strip"><span></span><span></span><span></span><span></span></div>

<!-- Header -->
<div class="header">
  <div class="header-inner">
    <div>
      <div class="company-name">برينتكس للأحبار ولوازم الطباعة</div>
      <div class="company-tagline">PRINTIX</div>
      <div class="company-contact">
        <span dir="ltr">+905465301000</span>
        <span>الجميلية - حلب - سوريا</span>
      </div>
    </div>
    <img src="${logoUrl}" class="logo-img" onerror="this.outerHTML='<div class=\\'logo-placeholder\\'>LOGO</div>'" />
  </div>
</div>

<!-- Title Bar -->
<div class="title-bar">
  <div style="display:flex;align-items:baseline;gap:14px">
    <span class="invoice-label">فاتورة</span>
    <span class="invoice-number">#${invoice.invoiceNumber}</span>
  </div>
  <span class="invoice-date">${dateStr}</span>
</div>

<!-- Content -->
<div class="content">

  <!-- Client -->
  <div class="info-block">
    <span class="info-block-label">العميل</span>
    <span class="name">${invoice.clientName}</span>
    ${clientDetail ? `<span class="detail">${clientDetail}</span>` : ""}
  </div>

  <!-- Items Table -->
  <table class="items-table">
    <thead><tr>
      <th>#</th>
      <th>الوصف</th>
      <th class="t-center">الكمية</th>
      <th class="t-center">سعر الوحدة</th>
      <th style="text-align:left">المبلغ</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <!-- Totals + Notes (kept together, won't split across pages) -->
  <div style="break-inside:avoid; page-break-inside:avoid;">
    <div class="totals-area">
      <div class="totals-box">
        <div class="totals-row">
          <span class="label">المجموع الفرعي</span>
          <span class="value">${fmt(invoice.subtotal, c).replace(c, "")} ${currLabel}</span>
        </div>
        ${discountRow}
        ${taxRow}
        <div class="totals-row grand-total">
          <span class="label">الإجمالي</span>
          <span class="value">${fmt(invoice.total, c).replace(c, "")} ${currLabel}</span>
        </div>
      </div>
    </div>
    ${invoice.notes ? `<div class="notes-section"><div class="notes-title">ملاحظات</div><div class="notes-text">${invoice.notes}</div></div>` : ""}
  </div>

</div>

<!-- Footer -->
<div class="footer">
  <div class="footer-content">
    <span class="footer-legal">برينتكس للأحبار ولوازم الطباعة — الجميلية - حلب - سوريا</span>
    <span class="footer-page">1 / 1</span>
  </div>
  <div class="footer-strip"><span></span><span></span><span></span></div>
</div>

</body>
</html>`;

  const clientPart = sanitizeFilename(invoice.clientName);
  const datePart = invoice.createdAt.replace(/\//g, "-");
  await generatePdfFromHtml(html, `${clientPart}_${datePart}_${invoice.invoiceNumber}.pdf`);
}

// ============================================================
// REPORT EXPORTS
// ============================================================
export interface ReportDateRange { from: string; to: string; }

function buildReportHtml(
  title: string, subtitle: string, dateRange: ReportDateRange,
  companyName: string, companyNameEn: string,
  stats: { label: string; value: string }[],
  headers: string[], rows: string[][], totalsRow?: string[],
): string {
  const statsHtml = stats.map(s => `<div class="stat"><div class="s-lbl">${s.label}</div><div class="s-val">${s.value}</div></div>`).join("");
  const headHtml = headers.map(h => `<th>${h}</th>`).join("");
  const bodyHtml = rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("");
  const totHtml = totalsRow ? `<tr class="tot">${totalsRow.map(c => `<td>${c}</td>`).join("")}</tr>` : "";

  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
<style>
@page{size:A4;margin:0}*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'IBM Plex Sans Arabic',sans-serif;font-size:10px;color:#2c3e50;direction:rtl;background:#fff;padding:20px 28px}
.bar{height:3px;background:#29ABE2;border-radius:2px;margin-bottom:12px}
.hdr{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:8px;border-bottom:1px solid #ecf0f1;margin-bottom:10px}
h1{font-size:16px;color:#29ABE2;font-weight:700}
.sub{font-size:8px;color:#95a5a6;margin-top:2px}
.dr{font-size:7px;color:#95a5a6;background:#fafbfc;padding:3px 8px;border-radius:3px}
.co{font-size:6px;color:#bdc3c7;margin-top:2px}
.stats{display:flex;gap:8px;margin-bottom:12px}
.stat{flex:1;background:#fafbfc;border-radius:4px;padding:8px;border-top:2px solid #29ABE2}
.s-lbl{font-size:7px;color:#95a5a6}.s-val{font-size:12px;font-weight:700;margin-top:1px}
table{width:100%;border-collapse:collapse}
th{background:#29ABE2;color:#fff;padding:6px 8px;font-size:7px;font-weight:700;text-align:right;white-space:nowrap}
td{padding:5px 8px;font-size:8px;border-bottom:.5px solid #ecf0f1;white-space:nowrap}
tr:nth-child(even){background:#fafbfc}
.tot td{background:#29ABE2;color:#fff;font-weight:700}
.ftr{position:fixed;bottom:12px;left:28px;right:28px;display:flex;justify-content:space-between;font-size:6px;color:#bdc3c7;border-top:.5px solid #ecf0f1;padding-top:4px}
</style></head><body>
<div class="bar"></div>
<div class="hdr"><div><h1>${title}</h1><div class="sub">${subtitle}</div></div><div style="text-align:left"><div class="dr">من ${dateRange.from} إلى ${dateRange.to}</div><div class="co">${companyName} | ${companyNameEn}</div></div></div>
<div class="stats">${statsHtml}</div>
<table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}${totHtml}</tbody></table>
<div class="ftr"><span>${companyName} — ${companyNameEn}</span><span>${new Date().toLocaleDateString("ar-SY")}</span></div>
</body></html>`;
}

export async function exportInventoryReportPDF(products: any[], dateRange: ReportDateRange, settings: AppSettings) {
  const c = settings.currencySymbol || "$";
  const tv = products.reduce((s: number, p: any) => s + p.price * p.stock, 0);
  const ts = products.reduce((s: number, p: any) => s + p.stock, 0);
  const ls = products.filter((p: any) => p.stock <= p.minStock);
  const html = buildReportHtml("تقرير المخزون", `${products.length} منتج`, dateRange, settings.businessName, settings.businessNameEn,
    [{ label: "المنتجات", value: String(products.length) }, { label: "المخزون", value: ts.toLocaleString() }, { label: "القيمة", value: fmt(tv, c) }, { label: "منخفض", value: String(ls.length) }],
    ["#", "المنتج", "الفئة", "السعر", "المخزون", "الوحدة", "القيمة"],
    products.map((p: any, i: number) => [String(i + 1), p.name, p.category, fmt(p.price, c), String(p.stock), p.unit, fmt(p.price * p.stock, c)]),
    ["", `${products.length}`, "", "", String(ts), "", fmt(tv, c)]);
  await generatePdfFromHtml(html, `تقرير_المخزون_${dateRange.from}_${dateRange.to}.pdf`);
}

export async function exportSalesReportPDF(invoices: Invoice[], dateRange: ReportDateRange, settings: AppSettings) {
  const c = settings.currencySymbol || "$";
  const f = invoices.filter(i => i.createdAt >= dateRange.from && i.createdAt <= dateRange.to && i.status !== "ملغاة" && i.status !== "مسودة");
  const tr = f.filter(i => i.status === "مدفوعة").reduce((s, i) => s + i.total, 0);
  const pc = f.filter(i => i.status === "مدفوعة").length;
  const ut = f.filter(i => i.status === "غير مدفوعة").reduce((s, i) => s + i.total, 0);
  const html = buildReportHtml("تقرير المبيعات", `${f.length} فاتورة`, dateRange, settings.businessName, settings.businessNameEn,
    [{ label: "المبيعات", value: fmt(tr, c) }, { label: "الفواتير", value: String(f.length) }, { label: "المدفوعة", value: String(pc) }, { label: "المستحقات", value: fmt(ut, c) }],
    ["#", "الفاتورة", "العميل", "التاريخ", "الحالة", "الإجمالي"],
    f.map((inv, i) => [String(i + 1), inv.invoiceNumber, inv.clientName, inv.createdAt, inv.status, fmt(inv.total, c)]),
    ["", `${f.length}`, "", "", `${pc} مدفوعة`, fmt(tr, c)]);
  await generatePdfFromHtml(html, `تقرير_المبيعات_${dateRange.from}_${dateRange.to}.pdf`);
}

export async function exportClientsReportPDF(clients: any[], invoices: Invoice[], dateRange: ReportDateRange, settings: AppSettings) {
  const c = settings.currencySymbol || "$";
  const ts = clients.reduce((s: number, cl: any) => s + cl.totalSpent, 0);
  const html = buildReportHtml("تقرير العملاء", `${clients.length} عميل`, dateRange, settings.businessName, settings.businessNameEn,
    [{ label: "العملاء", value: String(clients.length) }, { label: "المبيعات", value: fmt(ts, c) }, { label: "الفواتير", value: String(invoices.length) }],
    ["#", "العميل", "الهاتف", "العنوان", "الفواتير", "الإنفاق"],
    clients.map((cl: any, i: number) => [String(i + 1), cl.name, cl.phone || "—", cl.address || "—", String(invoices.filter((inv: Invoice) => inv.clientId === cl.id).length), fmt(cl.totalSpent, c)]),
    ["", `${clients.length}`, "", "", String(invoices.length), fmt(ts, c)]);
  await generatePdfFromHtml(html, `تقرير_العملاء_${dateRange.from}_${dateRange.to}.pdf`);
}

export async function exportAccountingReportPDF(invoices: Invoice[], dateRange: ReportDateRange, settings: AppSettings) {
  const c = settings.currencySymbol || "$";
  const f = invoices.filter(i => i.createdAt >= dateRange.from && i.createdAt <= dateRange.to && i.status !== "ملغاة" && i.status !== "مسودة");
  const pr = f.filter(i => i.status === "مدفوعة").reduce((s, i) => s + i.total, 0);
  const ur = f.filter(i => i.status === "غير مدفوعة").reduce((s, i) => s + i.total, 0);
  const d = f.reduce((s, i) => s + i.discountAmount, 0);
  const html = buildReportHtml("التقرير المحاسبي", `من ${dateRange.from} إلى ${dateRange.to}`, dateRange, settings.businessName, settings.businessNameEn,
    [{ label: "الإيرادات", value: fmt(pr + ur, c) }, { label: "المحصّل", value: fmt(pr, c) }, { label: "المستحقات", value: fmt(ur, c) }, { label: "الخصومات", value: fmt(d, c) }],
    ["#", "الفاتورة", "العميل", "التاريخ", "الحالة", "الخصم", "الإجمالي"],
    f.map((inv, i) => [String(i + 1), inv.invoiceNumber, inv.clientName, inv.createdAt, inv.status, inv.discountAmount > 0 ? `-${fmt(inv.discountAmount, c)}` : "—", fmt(inv.total, c)]),
    ["", `${f.length}`, "", "", "", d > 0 ? `-${fmt(d, c)}` : "—", fmt(pr + ur, c)]);
  await generatePdfFromHtml(html, `التقرير_المحاسبي_${dateRange.from}_${dateRange.to}.pdf`);
}

export async function exportOrdersReportPDF(orders: any[], dateRange: ReportDateRange, settings: AppSettings) {
  const f = orders.filter((o: any) => o.createdAt >= dateRange.from && o.createdAt <= dateRange.to);
  const html = buildReportHtml("تقرير الطلبات", `${f.length} طلب`, dateRange, settings.businessName, settings.businessNameEn,
    [{ label: "الطلبات", value: String(f.length) }, { label: "انتظار", value: String(f.filter((o: any) => o.status === "قيد الانتظار").length) }, { label: "تنفيذ", value: String(f.filter((o: any) => o.status === "قيد التنفيذ").length) }, { label: "مكتمل", value: String(f.filter((o: any) => o.status === "مكتمل").length) }],
    ["#", "التتبع", "العميل", "الوصف", "الحالة", "التاريخ"],
    f.map((o: any, i: number) => [String(i + 1), o.trackingId, o.clientName, o.description || "—", o.status, o.createdAt]));
  await generatePdfFromHtml(html, `تقرير_الطلبات_${dateRange.from}_${dateRange.to}.pdf`);
}

export async function exportClientSheetPDF(client: any, clientInvoices: Invoice[], settings: AppSettings) {
  const c = settings.currencySymbol || "$";
  const dr = { from: clientInvoices.length > 0 ? clientInvoices[clientInvoices.length - 1].createdAt : "—", to: clientInvoices.length > 0 ? clientInvoices[0].createdAt : "—" };
  const html = buildReportHtml(`بيانات: ${client.name}`, `${client.phone || ""} — ${client.address || ""}`, dr, settings.businessName, settings.businessNameEn,
    [{ label: "المشتريات", value: fmt(client.totalSpent, c) }, { label: "الفواتير", value: String(clientInvoices.length) }, { label: "التسجيل", value: client.createdAt }],
    ["#", "الفاتورة", "التاريخ", "الحالة", "الإجمالي"],
    clientInvoices.map((inv, i) => [String(i + 1), inv.invoiceNumber, inv.createdAt, inv.status, fmt(inv.total, c)]),
    ["", `${clientInvoices.length}`, "", "", fmt(client.totalSpent, c)]);
  await generatePdfFromHtml(html, `${sanitizeFilename(client.name)}_بيانات.pdf`);
}

// ============================================================
// WHATSAPP
// ============================================================
export function shareInvoiceWhatsApp(invoice: Invoice, settings: AppSettings) {
  const items = Array.isArray(invoice.items) ? invoice.items : (invoice.items as any)?._items || [];
  const lines = [`*${settings.businessName}*`, `فاتورة رقم: ${invoice.invoiceNumber}`, `العميل: ${invoice.clientName}`, `التاريخ: ${invoice.createdAt}`, "", "*المنتجات:*",
    ...items.map((item: InvoiceItem, i: number) => `${i + 1}. ${item.productName} × ${item.quantity} = ${settings.currencySymbol}${item.total.toFixed(2)}`),
    "", `المجموع: ${settings.currencySymbol}${invoice.subtotal.toFixed(2)}`];
  if (invoice.discountAmount > 0) lines.push(`الخصم: -${settings.currencySymbol}${invoice.discountAmount.toFixed(2)}`);
  lines.push(`*الإجمالي: ${settings.currencySymbol}${invoice.total.toFixed(2)}*`, `الحالة: ${invoice.status}`);
  window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
}
