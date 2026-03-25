"use client";

export interface InvoiceSettings {
  htmlTemplate: string;
}

const STORAGE_KEY = "invoice_template";

// All available template variables
export const TEMPLATE_VARIABLES: Record<string, string> = {
  "{{companyName}}": "اسم الشركة (عربي)",
  "{{companyNameEn}}": "اسم الشركة (إنجليزي)",
  "{{companyTagline}}": "شعار الشركة (سطر ترويجي)",
  "{{companyAddress}}": "عنوان الشركة",
  "{{companyPhone}}": "هاتف الشركة",
  "{{companyEmail}}": "بريد الشركة",
  "{{logoUrl}}": "رابط الشعار",
  "{{invoiceNumber}}": "رقم الفاتورة",
  "{{clientName}}": "اسم العميل",
  "{{clientPhone}}": "هاتف العميل",
  "{{clientAddress}}": "عنوان العميل",
  "{{date}}": "تاريخ الفاتورة",
  "{{status}}": "حالة الفاتورة",
  "{{salesperson}}": "مندوب المبيعات",
  "{{itemsRows}}": "صفوف المنتجات (HTML)",
  "{{subtotal}}": "المجموع الفرعي",
  "{{discountRow}}": "سطر الخصم (HTML)",
  "{{taxRow}}": "سطر الضريبة (HTML)",
  "{{total}}": "الإجمالي",
  "{{currencySymbol}}": "رمز العملة",
  "{{notes}}": "ملاحظات الفاتورة",
  "{{notesSection}}": "قسم الملاحظات (HTML كامل)",
  "{{footerText}}": "نص التذييل",
};

export const DEFAULT_TEMPLATE = `<!DOCTYPE html>
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
  --key-soft: #2a2a3e;
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
  width: 794px;
  min-height: 1123px;
  position: relative;
}

/* ═══ TOP STRIP ═══ */
.geo-strip { position: absolute; top: 0; right: 0; left: 0; height: 6px; display: flex; }
.geo-strip span { flex: 1; }
.geo-strip span:nth-child(1) { background: var(--blue); }
.geo-strip span:nth-child(2) { background: var(--blue-dark); }
.geo-strip span:nth-child(3) { background: var(--key); }
.geo-strip span:nth-child(4) { background: var(--key); }

/* ═══ HEADER ═══ */
.header {
  padding: 32px 40px 28px;
  background: var(--key);
  position: relative;
  overflow: hidden;
}
.header::before {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  background-image:
    radial-gradient(circle, rgba(41,171,226,0.08) 1.5px, transparent 1.5px),
    radial-gradient(circle, rgba(41,171,226,0.05) 1px, transparent 1px);
  background-size: 20px 20px, 14px 14px;
  background-position: 0 0, 7px 7px;
}
.header::after {
  content: '';
  position: absolute; bottom: 0; left: 0;
  width: 120px; height: 120px;
  background: linear-gradient(135deg, transparent 50%, rgba(41,171,226,0.12) 50%);
}
.header-inner { display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 2; }
.header-brand { display: flex; flex-direction: column; gap: 8px; }
.company-name { font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; line-height: 1.1; }
.company-tagline { font-size: 11px; font-weight: 500; color: var(--blue); letter-spacing: 2.5px; text-transform: uppercase; }
.company-contact { display: flex; gap: 16px; margin-top: 6px; }
.company-contact span { font-size: 8.5px; color: rgba(255,255,255,0.5); font-weight: 400; }
.logo { max-height: 60px; max-width: 160px; object-fit: contain; opacity: 0.95; }

/* ═══ TITLE BAR ═══ */
.title-bar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 18px 40px;
  background: var(--surface-alt);
  border-bottom: 1px solid var(--border);
}
.invoice-label-group { display: flex; align-items: baseline; gap: 14px; }
.invoice-label { font-size: 13px; font-weight: 700; color: var(--blue); letter-spacing: 3px; text-transform: uppercase; }
.invoice-number { font-family: 'Space Mono', monospace; font-size: 22px; font-weight: 700; color: var(--text); letter-spacing: -1px; direction: ltr; }
.invoice-date { font-family: 'Space Mono', monospace; font-size: 18px; color: var(--text-secondary); direction: ltr; }

/* ═══ CONTENT ═══ */
.content { padding: 28px 40px 20px; }

/* Client Info */
.info-block {
  padding: 14px 20px; border: 1px solid var(--border); border-radius: 6px;
  position: relative; overflow: hidden;
  display: flex; align-items: center; gap: 24px;
  margin-bottom: 28px;
}
.info-block::before { content: ''; position: absolute; top: 0; right: 0; width: 4px; height: 100%; background: var(--blue); }
.info-block-label { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 2px; white-space: nowrap; }
.info-block .name { font-size: 16px; font-weight: 700; color: var(--text); white-space: nowrap; }
.info-block .detail { font-size: 12px; color: var(--text-secondary); display: flex; align-items: center; gap: 8px; white-space: nowrap; }
.info-block .detail .sep { color: var(--text-muted); font-size: 10px; }

/* ═══ ITEMS TABLE ═══ */
.items-table { width: 100%; border-collapse: collapse; }
.items-table thead { background: var(--key); }
.items-table thead th {
  padding: 12px 18px; font-size: 9px; font-weight: 700;
  color: rgba(255,255,255,0.8); text-align: right;
  text-transform: uppercase; letter-spacing: 1.2px;
}
.items-table thead th:first-child { border-radius: 0 6px 0 0; }
.items-table thead th:last-child { border-radius: 6px 0 0 0; }
.items-table thead th.t-center { text-align: center; }
.items-table thead th.t-left { text-align: left; }
.items-table tbody td { padding: 14px 18px; font-size: 13px; border-bottom: 1px solid var(--border-light); vertical-align: middle; }
.items-table tbody tr:last-child td { border-bottom: none; }
.items-table tbody tr:nth-child(even) { background: rgba(245, 247, 250, 0.5); }
.items-table .t-center { text-align: center; }
.items-table .t-left { text-align: left; }
.items-table .t-bold { font-weight: 600; }
.items-table .t-mono { font-family: 'Space Mono', monospace; font-size: 13px; direction: ltr; display: inline-block; }
.row-num { font-family: 'Space Mono', monospace; font-size: 11px; color: var(--text-muted); font-weight: 700; }

/* ═══ TOTALS ═══ */
.totals-area { display: flex; justify-content: flex-end; margin: 24px 0; }
.totals-box { width: 310px; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
.totals-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 18px; border-bottom: 1px solid var(--border-light); }
.totals-row:last-child { border-bottom: none; }
.totals-row .label { font-size: 10px; color: var(--text-secondary); font-weight: 500; }
.totals-row .value { font-family: 'Space Mono', monospace; font-size: 11px; font-weight: 700; color: var(--text); direction: ltr; }
.totals-row.discount .value { color: var(--blue); }
.totals-row.grand-total { background: var(--key); padding: 14px 18px; }
.totals-row.grand-total .label { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.8); }
.totals-row.grand-total .value { font-size: 18px; font-weight: 700; color: var(--blue); letter-spacing: -0.5px; }

/* ═══ NOTES ═══ */
.notes-section { padding: 16px 20px; background: var(--surface-alt); border-right: 3px solid var(--blue); border-radius: 0 6px 6px 0; margin-bottom: 20px; }
.notes-title { font-size: 8px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px; }
.notes-text { font-size: 10px; color: var(--text-secondary); line-height: 1.7; }

/* ═══ FOOTER ═══ */
.footer { position: absolute; bottom: 0; left: 0; right: 0; }
.footer-content { display: flex; justify-content: space-between; align-items: center; padding: 16px 40px; background: var(--surface-alt); border-top: 1px solid var(--border); }
.footer-legal { font-size: 10px; color: var(--text-muted); line-height: 1.5; max-width: 400px; }
.footer-page { font-family: 'Space Mono', monospace; font-size: 10px; color: var(--text-muted); }
.footer-strip { height: 4px; display: flex; }
.footer-strip span:nth-child(1) { flex: 5; background: var(--blue); }
.footer-strip span:nth-child(2) { flex: 3; background: var(--blue-dark); }
.footer-strip span:nth-child(3) { flex: 2; background: var(--key); }
.footer-strip span:nth-child(4) { flex: 0; }
</style>
</head>
<body>

<div class="geo-strip"><span></span><span></span><span></span><span></span></div>

<div class="header">
  <div class="header-inner">
    <div class="header-brand">
      <div class="company-name">{{companyName}}</div>
      <div class="company-tagline">{{companyTagline}}</div>
      <div class="company-contact">
        <span dir="ltr">{{companyPhone}}</span>
        <span>{{companyEmail}}</span>
        <span>{{companyAddress}}</span>
      </div>
    </div>
    <div class="logo-area">
      <img src="{{logoUrl}}" class="logo" crossorigin="anonymous" />
    </div>
  </div>
</div>

<div class="title-bar">
  <div class="invoice-label-group">
    <div class="invoice-label">فاتورة</div>
    <div class="invoice-number">{{invoiceNumber}}</div>
  </div>
  <div class="invoice-date">{{date}}</div>
</div>

<div class="content">
  <div class="info-block">
    <div class="info-block-label">العميل</div>
    <div class="name">{{clientName}}</div>
    <div class="detail">
      <span dir="ltr">{{clientPhone}}</span>
      <span class="sep">&middot;</span>
      <span>{{clientAddress}}</span>
    </div>
  </div>

  <div class="table-wrapper">
    <table class="items-table">
      <thead>
        <tr>
          <th style="width:5%">#</th>
          <th style="width:42%">الوصف</th>
          <th class="t-center" style="width:13%">الكمية</th>
          <th class="t-center" style="width:18%">سعر الوحدة</th>
          <th class="t-left" style="width:22%">المبلغ</th>
        </tr>
      </thead>
      <tbody>
        {{itemsRows}}
      </tbody>
    </table>
  </div>

  <div class="totals-area">
    <div class="totals-box">
      <div class="totals-row subtotal">
        <span class="label">المجموع الفرعي</span>
        <span class="value">{{subtotal}}</span>
      </div>
      {{discountRow}}
      {{taxRow}}
      <div class="totals-row grand-total">
        <span class="label">الإجمالي</span>
        <span class="value">{{total}}</span>
      </div>
    </div>
  </div>

  {{notesSection}}
</div>

<div class="footer">
  <div class="footer-content">
    <div class="footer-legal">{{footerText}}</div>
    <div class="footer-page">1 / 1</div>
  </div>
  <div class="footer-strip"><span></span><span></span><span></span><span></span></div>
</div>

</body>
</html>`;

export function loadInvoiceTemplate(): string {
  if (typeof window === "undefined") return DEFAULT_TEMPLATE;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
  } catch { /* ignore */ }
  return DEFAULT_TEMPLATE;
}

export function saveInvoiceTemplate(template: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, template);
}

export function resetInvoiceTemplate(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
