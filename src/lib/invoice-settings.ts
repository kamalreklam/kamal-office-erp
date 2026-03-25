"use client";

export interface InvoiceSettings {
  htmlTemplate: string;
}

const STORAGE_KEY = "invoice_template";

// All available template variables
export const TEMPLATE_VARIABLES = {
  "{{companyName}}": "اسم الشركة (عربي)",
  "{{companyNameEn}}": "اسم الشركة (إنجليزي)",
  "{{companyAddress}}": "عنوان الشركة",
  "{{companyPhone}}": "هاتف الشركة",
  "{{companyEmail}}": "بريد الشركة",
  "{{logoUrl}}": "رابط الشعار",
  "{{invoiceNumber}}": "رقم الفاتورة",
  "{{clientName}}": "اسم العميل",
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
};

export const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');

:root {
  --accent: #2a7ab5;
  --accent-light: #e8f4fd;
  --accent-dark: #1a5a8a;
  --text: #1e293b;
  --text-muted: #64748b;
  --text-light: #94a3b8;
  --border: #e2e8f0;
  --bg-soft: #f8fafc;
  --white: #ffffff;
}

* { margin:0; padding:0; box-sizing:border-box; }

body {
  font-family: 'IBM Plex Sans Arabic', 'Inter', sans-serif;
  font-size: 11px;
  color: var(--text);
  direction: rtl;
  background: var(--white);
  -webkit-font-smoothing: antialiased;
}

/* ═══════════════ HEADER ═══════════════ */
.header {
  position: relative;
  padding: 28px 36px 24px;
  background: linear-gradient(160deg, #f7faff 0%, #edf2ff 40%, var(--accent-light) 100%);
  border-bottom: 3px solid var(--accent);
  overflow: hidden;
}
.header::before {
  content: '';
  position: absolute;
  top: -60px;
  left: -40px;
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(42,122,181,0.06) 0%, transparent 70%);
  border-radius: 50%;
}
.header-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 1;
}
.header-brand {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.company-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.3px;
}
.company-subtitle {
  font-size: 9px;
  color: var(--text-muted);
  letter-spacing: 0.5px;
}
.company-address {
  font-size: 9px;
  color: var(--text-light);
  margin-top: 2px;
}
.logo {
  max-height: 65px;
  max-width: 170px;
  object-fit: contain;
}

/* ═══════════════ CONTENT ═══════════════ */
.content {
  padding: 28px 36px 20px;
}

/* Order Header */
.order-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 22px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}
.order-number-label {
  font-size: 10px;
  color: var(--text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 4px;
}
.order-number {
  font-family: 'Inter', 'IBM Plex Sans Arabic', sans-serif;
  font-size: 26px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.5px;
}
.client-block {
  text-align: left;
}
.client-label {
  font-size: 9px;
  color: var(--text-light);
  margin-bottom: 3px;
}
.client-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--accent-dark);
}

/* Meta Cards */
.meta-row {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}
.meta-card {
  flex: 1;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}
.meta-card-header {
  padding: 8px 16px;
  background: var(--bg-soft);
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted);
  text-align: center;
  border-bottom: 1px solid var(--border);
}
.meta-card-body {
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  color: var(--text);
}

/* ═══════════════ ITEMS TABLE ═══════════════ */
.items-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}
.items-table thead th {
  padding: 11px 16px;
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted);
  background: var(--bg-soft);
  border-bottom: 2px solid var(--border);
  text-align: right;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.items-table thead th.t-center { text-align: center; }
.items-table thead th.t-left { text-align: left; }
.items-table tbody td {
  padding: 13px 16px;
  font-size: 11px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}
.items-table tbody tr:last-child td { border-bottom: none; }
.items-table tbody tr:nth-child(even) { background: #fafbfd; }
.items-table .t-center { text-align: center; }
.items-table .t-left { text-align: left; }
.items-table .t-bold { font-weight: 700; }
.items-table .t-muted { color: var(--text-muted); font-size: 10px; }

/* Total Row */
.total-row {
  background: var(--accent) !important;
}
.total-row td {
  color: var(--white) !important;
  font-weight: 700 !important;
  font-size: 12px !important;
  padding: 13px 16px !important;
  border-bottom: none !important;
}
.total-row .total-amount {
  font-family: 'Inter', sans-serif;
  font-size: 16px !important;
  font-weight: 800 !important;
  letter-spacing: -0.3px;
}

/* Discount & Tax Rows */
.extra-row td {
  color: var(--text-muted);
  font-size: 10px;
  padding: 8px 16px;
  border-bottom: 1px solid #f1f5f9;
}
.discount-amount { color: #dc2626; font-weight: 600; }
.tax-amount { color: var(--text); font-weight: 600; }

/* ═══════════════ NOTES ═══════════════ */
.notes {
  margin-top: 20px;
  padding: 14px 18px;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 10px;
  color: var(--text-muted);
  line-height: 1.6;
}
.notes strong { color: var(--text); }

/* ═══════════════ FOOTER ═══════════════ */
.footer {
  margin-top: 50px;
  padding: 14px 36px;
  text-align: center;
  border-top: 1px solid var(--border);
  background: var(--bg-soft);
}
.footer-contact {
  font-size: 9px;
  color: var(--text-muted);
  letter-spacing: 0.3px;
}
.footer-contact a { color: var(--accent); text-decoration: none; }
.footer-page {
  font-size: 8px;
  color: var(--text-light);
  margin-top: 5px;
}
</style>
</head>
<body>

<!-- ▀▀▀ HEADER ▀▀▀ -->
<div class="header">
  <div class="header-inner">
    <div class="header-brand">
      <div class="company-name">{{companyName}}</div>
      <div class="company-address">{{companyAddress}}</div>
    </div>
    <img src="{{logoUrl}}" class="logo" crossorigin="anonymous" />
  </div>
</div>

<!-- ▀▀▀ CONTENT ▀▀▀ -->
<div class="content">

  <!-- Order + Client -->
  <div class="order-section">
    <div>
      <div class="order-number-label">رقم الأمر</div>
      <div class="order-number">{{invoiceNumber}}</div>
    </div>
    <div class="client-block">
      <div class="client-label">العميل</div>
      <div class="client-name">{{clientName}}</div>
    </div>
  </div>

  <!-- Meta Cards -->
  <div class="meta-row">
    <div class="meta-card">
      <div class="meta-card-header">تاريخ الطلب</div>
      <div class="meta-card-body">{{date}}</div>
    </div>
    <div class="meta-card">
      <div class="meta-card-header">مندوب المبيعات</div>
      <div class="meta-card-body" dir="ltr">{{salesperson}}</div>
    </div>
  </div>

  <!-- Items Table -->
  <table class="items-table">
    <thead>
      <tr>
        <th style="width:45%">الوصف</th>
        <th class="t-center" style="width:18%">الكمية</th>
        <th class="t-center" style="width:17%">سعر الوحدة</th>
        <th class="t-left" style="width:20%">المبلغ</th>
      </tr>
    </thead>
    <tbody>
      {{itemsRows}}
      {{discountRow}}
      {{taxRow}}
      <tr class="total-row">
        <td colspan="3">الإجمالي</td>
        <td class="t-left total-amount">{{total}}</td>
      </tr>
    </tbody>
  </table>

  {{notes}}

</div>

<!-- ▀▀▀ FOOTER ▀▀▀ -->
<div class="footer">
  <div class="footer-contact">{{companyEmail}}  ·  {{companyPhone}}</div>
  <div class="footer-page">الصفحة 1 / 1</div>
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
