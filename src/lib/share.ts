"use client";

import html2canvas from "html2canvas";
import type { Invoice, Product, Client } from "./data";
import type { AppSettings } from "./store";

function formatCurrencyAr(amount: number, symbol = "ر.س") {
  const formatted = amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${formatted} ${symbol}`;
}

/**
 * Capture a DOM element and save it as an image or share it natively on mobile
 */
export async function shareAsImage(elementId: string, filename: string): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found`);
    return false;
  }

  // Temporarily hide printing-hidden or action buttons that should not be in the image
  const elementsToHide = element.querySelectorAll(".no-capture, .print\\:hidden, button:not(.keep-capture)");
  const originalStyles = Array.from(elementsToHide).map((el) => {
    const htmlEl = el as HTMLElement;
    const display = htmlEl.style.display;
    const visibility = htmlEl.style.visibility;
    htmlEl.style.display = "none";
    return { el: htmlEl, display, visibility };
  });

  try {
    // Generate canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    // Restore hidden elements
    originalStyles.forEach(({ el, display, visibility }) => {
      el.style.display = display;
      el.style.visibility = visibility;
    });

    const dataUrl = canvas.toDataURL("image/png");
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], `${filename}.png`, { type: "image/png" });

    // Web Share API if supported (e.g. mobile Safari/Chrome)
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: filename,
        text: `مشاركة صور ${filename}`,
      });
      return true;
    } else {
      // Fallback for PC: Download directly
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${filename}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return false;
    }
  } catch (err) {
    // Restore hidden elements on failure
    originalStyles.forEach(({ el, display, visibility }) => {
      el.style.display = display;
      el.style.visibility = visibility;
    });
    console.error("Error generating or sharing image:", err);
    throw err;
  }
}

/**
 * Format Invoice to WhatsApp Arabic Text
 */
export function formatInvoiceWhatsAppText(invoice: Invoice, settings: AppSettings): string {
  const symbol = settings.currencySymbol || "ر.س";
  const items = Array.isArray(invoice.items) ? invoice.items : (invoice.items as any)?._items || [];
  const lines = [
    `*${settings.businessName}*`,
    `📄 *فاتورة مبيعات رقم ${invoice.invoiceNumber}*`,
    `----------------------------------------`,
    `👤 *العميل:* ${invoice.clientName}`,
    `📅 *التاريخ:* ${invoice.createdAt}`,
    `🟢 *حالة الدفع:* ${invoice.status}`,
    `----------------------------------------`,
    `*العناصر والمشتريات:*`,
    ...items.map((item: any, i: number) => `  ${i + 1}. ${item.productName} × ${item.quantity} = ${formatCurrencyAr(item.total, symbol)}`),
    `----------------------------------------`,
    `💰 *المجموع الفرعي:* ${formatCurrencyAr(invoice.subtotal, symbol)}`,
  ];

  if (invoice.discountAmount > 0) {
    lines.push(`🛑 *الخصم:* -${formatCurrencyAr(invoice.discountAmount, symbol)}`);
  }
  if (invoice.taxAmount > 0) {
    lines.push(`⚖️ *الضريبة:* +${formatCurrencyAr(invoice.taxAmount, symbol)}`);
  }

  lines.push(
    `✅ *الإجمالي النهائي:* *${formatCurrencyAr(invoice.total, symbol)}*`,
    `----------------------------------------`,
    settings.invoiceNotes || "نشكر ثقتكم بنا، ونسعد دائماً بخدمتكم!"
  );

  return lines.join("\n");
}

/**
 * Format Product stock info to WhatsApp Arabic Text
 */
export function formatProductWhatsAppText(product: Product, settings: AppSettings): string {
  const symbol = settings.currencySymbol || "ر.س";
  const status = product.stock <= product.minStock ? "⚠️ منخفض ومحتاج طلب" : "✅ متوفر وبحالة ممتازة";
  return [
    `*${settings.businessName}*`,
    `📦 *بيانات المنتج والمخزون*`,
    `----------------------------------------`,
    `اسم المنتج: *${product.name}*`,
    `الفئة: ${product.category}`,
    `كود الـ SKU: \`${product.sku || "غير متوفر"}\``,
    `سعر البيع الافتراضي: *${formatCurrencyAr(product.price, symbol)}*`,
    `المخزون المتوفر: *${product.stock} ${product.unit}*`,
    `الحد الأدنى للتنبيه: ${product.minStock} ${product.unit}`,
    `حالة المخزون: ${status}`,
    `----------------------------------------`,
    product.description ? `ملاحظات/الوصف: ${product.description}` : "",
  ].filter(Boolean).join("\n");
}

/**
 * Format Client details to WhatsApp Arabic Text
 */
export function formatClientWhatsAppText(client: Client, clientInvoices: Invoice[], settings: AppSettings): string {
  const symbol = settings.currencySymbol || "ر.س";
  return [
    `*${settings.businessName}*`,
    `👤 *بيانات حساب العميل*`,
    `----------------------------------------`,
    `اسم العميل: *${client.name}*`,
    `رقم الهاتف: \`${client.phone || "غير مسجل"}\``,
    `العنوان: ${client.address || "غير مسجل"}`,
    `إجمالي المبيعات المكتملة: *${formatCurrencyAr(client.totalSpent, symbol)}*`,
    `عدد الفواتير المصدرة: ${clientInvoices.length} فواتير`,
    `تاريخ الانضمام للنظام: ${client.createdAt}`,
    `----------------------------------------`,
    client.notes ? `ملاحظات خاصة: ${client.notes}` : "",
  ].filter(Boolean).join("\n");
}

/**
 * Format Profit and Loss / Financial report to WhatsApp Arabic Text
 */
export function formatFinancialsWhatsAppText(pnl: any, receivablesTotal: number, selectedYear: string, settings: AppSettings): string {
  const symbol = settings.currencySymbol || "ر.س";
  return [
    `*${settings.businessName}*`,
    `📊 *الملخص والتقرير المالي السنوي (${selectedYear})*`,
    `----------------------------------------`,
    `عدد الفواتير المدفوعة بالكامل: ${pnl.invoiceCount} فاتورة`,
    `إجمالي الإيرادات (قبل الخصم والضرائب): ${formatCurrencyAr(pnl.grossRevenue, symbol)}`,
    `إجمالي الخصومات الممنوحة: -${formatCurrencyAr(pnl.totalDiscount, symbol)}`,
    `إجمالي الضرائب المحتسبة: +${formatCurrencyAr(pnl.taxAmount, symbol)}`,
    `----------------------------------------`,
    `صافي المبيعات المحصلة: *${formatCurrencyAr(pnl.netRevenue, symbol)}*`,
    `تكلفة البضائع المبيعة (COGS): -${formatCurrencyAr(pnl.cogs, symbol)}`,
    `صافي الأرباح التشغيلية: *${formatCurrencyAr(pnl.grossProfit, symbol)}*`,
    `هامش الربح الإجمالي: *${pnl.profitMargin.toFixed(1)}%*`,
    `----------------------------------------`,
    `الذمم المدينة المستحقة (فواتير غير مدفوعة): *${formatCurrencyAr(receivablesTotal, symbol)}*`,
    `----------------------------------------`,
    `تاريخ التصدير: ${new Date().toLocaleDateString("ar-EG")}`
  ].join("\n");
}

/**
 * Opens WhatsApp sharing link
 */
export function shareViaWhatsApp(text: string) {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}
