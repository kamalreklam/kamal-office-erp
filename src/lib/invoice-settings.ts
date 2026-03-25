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
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap');
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'IBM Plex Sans Arabic','Segoe UI',Tahoma,sans-serif; font-size:12px; color:#1e293b; direction:rtl; }
.header { padding:24px 30px; background:linear-gradient(135deg, #f0f6ff, #e8f0fe); border-bottom:3px solid #2a7ab5; }
.header-inner { display:flex; justify-content:space-between; align-items:center; }
.company-name { font-size:16px; font-weight:700; color:#1e293b; }
.company-address { font-size:10px; color:#64748b; margin-top:4px; }
.logo { max-height:70px; max-width:180px; }
.content { padding:20px 30px; }
.order-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; }
.order-number { font-size:22px; font-weight:800; }
.client-name { font-size:13px; font-weight:600; }
.meta-table { width:100%; border-collapse:collapse; margin-bottom:24px; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; }
.meta-table th { padding:12px 20px; text-align:center; font-weight:700; font-size:12px; background:#f8fafc; border-left:1px solid #e2e8f0; }
.meta-table td { padding:12px 20px; text-align:center; font-size:13px; border-left:1px solid #e2e8f0; }
.items-table { width:100%; border-collapse:collapse; }
.items-table thead tr { border-bottom:2px solid #e2e8f0; }
.items-table th { padding:10px 14px; text-align:right; font-weight:700; font-size:11px; color:#374151; }
.items-table td { padding:12px 14px; border-bottom:1px solid #eee; }
.items-table .text-center { text-align:center; }
.items-table .text-left { text-align:left; }
.total-row { background:#2a7ab5; color:white; }
.total-row td { padding:10px 14px; font-weight:700; }
.notes { margin-top:16px; padding:12px; background:#f8fafc; border-radius:6px; font-size:11px; color:#64748b; }
.footer { padding:16px 30px; text-align:center; border-top:1px solid #e2e8f0; margin-top:40px; }
.footer-text { font-size:10px; color:#64748b; }
.footer-page { font-size:9px; color:#94a3b8; margin-top:4px; }
</style>
</head>
<body>

<!-- Header -->
<div class="header">
  <div class="header-inner">
    <div>
      <div class="company-name">{{companyName}}</div>
      <div class="company-address">{{companyAddress}}</div>
    </div>
    <div>
      <img src="{{logoUrl}}" class="logo" crossorigin="anonymous" />
    </div>
  </div>
</div>

<!-- Content -->
<div class="content">
  <!-- Order Info -->
  <div class="order-header">
    <div>
      <div class="order-number">رقم الأمر {{invoiceNumber}}</div>
    </div>
    <div>
      <div class="client-name">{{clientName}}</div>
    </div>
  </div>

  <!-- Meta -->
  <table class="meta-table">
    <tr>
      <th>تاريخ الطلب</th>
      <th>مندوب المبيعات</th>
    </tr>
    <tr>
      <td>{{date}}</td>
      <td dir="ltr">{{salesperson}}</td>
    </tr>
  </table>

  <!-- Items -->
  <table class="items-table">
    <thead>
      <tr>
        <th>الوصف</th>
        <th class="text-center">الكمية</th>
        <th class="text-center">سعر الوحدة</th>
        <th class="text-left">المبلغ</th>
      </tr>
    </thead>
    <tbody>
      {{itemsRows}}
      {{discountRow}}
      {{taxRow}}
      <tr class="total-row">
        <td colspan="3">الإجمالي</td>
        <td class="text-left" style="font-size:14px">{{total}}</td>
      </tr>
    </tbody>
  </table>

  {{notes}}
</div>

<!-- Footer -->
<div class="footer">
  <div class="footer-text">{{companyEmail}} - {{companyPhone}}</div>
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
