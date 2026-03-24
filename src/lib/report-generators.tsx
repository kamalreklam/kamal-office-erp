"use client";

import { createElement } from "react";
import { ReportPDF, ReportTable, ReportStatRow, fmtNum, fmtInt, PdfText, PdfView } from "@/components/report-pdf";
import type { DateRange } from "@/components/date-range-picker";
import type { Product, Invoice, Client, Order } from "@/lib/data";
import type { AppSettings } from "@/lib/store";

const currency = (settings: AppSettings) => settings.currencySymbol || "$";

// ============ INVENTORY REPORT ============
export function createInventoryReport(
  products: Product[],
  dateRange: DateRange,
  settings: AppSettings
) {
  const c = currency(settings);
  const totalValue = products.reduce((s, p) => s + p.price * p.stock, 0);
  const totalStock = products.reduce((s, p) => s + p.stock, 0);
  const lowStock = products.filter(p => p.stock <= p.minStock);

  return createElement(
    ReportPDF,
    {
      title: "تقرير المخزون",
      subtitle: `${products.length} منتج`,
      dateRange,
      companyName: settings.businessName,
      companyNameEn: settings.businessNameEn,
      accentColor: settings.primaryColor || "#2563eb",
    },
    createElement(ReportStatRow, {
      accentColor: settings.primaryColor || "#2563eb",
      stats: [
        { label: "إجمالي المنتجات", value: fmtInt(products.length) },
        { label: "إجمالي المخزون", value: fmtInt(totalStock) },
        { label: "قيمة المخزون", value: `${c}${fmtNum(totalValue)}` },
        { label: "منخفض المخزون", value: fmtInt(lowStock.length) },
      ],
    }),
    createElement(ReportTable, {
      accentColor: settings.primaryColor || "#2563eb",
      columns: [
        { label: "#", width: "5%" },
        { label: "المنتج", width: "30%" },
        { label: "الفئة", width: "15%" },
        { label: "السعر", width: "12%", align: "left" },
        { label: "المخزون", width: "10%", align: "center" },
        { label: "الوحدة", width: "10%", align: "center" },
        { label: "القيمة", width: "18%", align: "left" },
      ],
      rows: products.map((p, i) => [
        String(i + 1),
        p.name,
        p.category,
        `${c}${fmtNum(p.price)}`,
        fmtInt(p.stock),
        p.unit,
        `${c}${fmtNum(p.price * p.stock)}`,
      ]),
      totalsRow: [
        "",
        `${products.length} منتج`,
        "",
        "",
        fmtInt(totalStock),
        "",
        `${c}${fmtNum(totalValue)}`,
      ],
    })
  );
}

// ============ SALES / INVOICES REPORT ============
export function createSalesReport(
  invoices: Invoice[],
  dateRange: DateRange,
  settings: AppSettings
) {
  const c = currency(settings);
  const filtered = invoices.filter(inv => inv.createdAt >= dateRange.from && inv.createdAt <= dateRange.to && inv.status !== "ملغاة" && inv.status !== "مسودة");
  const totalRevenue = filtered.filter(inv => inv.status === "مدفوعة").reduce((s, inv) => s + inv.total, 0);
  const paidCount = filtered.filter(inv => inv.status === "مدفوعة").length;
  const unpaidTotal = filtered.filter(inv => inv.status === "غير مدفوعة").reduce((s, inv) => s + inv.total, 0);

  return createElement(
    ReportPDF,
    {
      title: "تقرير المبيعات",
      subtitle: `${filtered.length} فاتورة`,
      dateRange,
      companyName: settings.businessName,
      companyNameEn: settings.businessNameEn,
      accentColor: settings.primaryColor || "#2563eb",
    },
    createElement(ReportStatRow, {
      accentColor: settings.primaryColor || "#2563eb",
      stats: [
        { label: "إجمالي المبيعات", value: `${c}${fmtNum(totalRevenue)}` },
        { label: "عدد الفواتير", value: fmtInt(filtered.length) },
        { label: "المدفوعة", value: fmtInt(paidCount) },
        { label: "مستحقات معلقة", value: `${c}${fmtNum(unpaidTotal)}` },
      ],
    }),
    createElement(ReportTable, {
      accentColor: settings.primaryColor || "#2563eb",
      columns: [
        { label: "#", width: "5%" },
        { label: "رقم الفاتورة", width: "15%" },
        { label: "العميل", width: "25%" },
        { label: "التاريخ", width: "12%" },
        { label: "الحالة", width: "13%", align: "center" },
        { label: "المنتجات", width: "8%", align: "center" },
        { label: "الإجمالي", width: "22%", align: "left" },
      ],
      rows: filtered.map((inv, i) => [
        String(i + 1),
        inv.invoiceNumber,
        inv.clientName,
        inv.createdAt,
        inv.status,
        String(inv.items.length),
        `${c}${fmtNum(inv.total)}`,
      ]),
      totalsRow: [
        "",
        `${filtered.length} فاتورة`,
        "",
        "",
        `${paidCount} مدفوعة`,
        "",
        `${c}${fmtNum(totalRevenue)}`,
      ],
    })
  );
}

// ============ CLIENTS REPORT ============
export function createClientsReport(
  clients: Client[],
  invoices: Invoice[],
  dateRange: DateRange,
  settings: AppSettings
) {
  const c = currency(settings);
  const totalSpent = clients.reduce((s, cl) => s + cl.totalSpent, 0);

  return createElement(
    ReportPDF,
    {
      title: "تقرير العملاء",
      subtitle: `${clients.length} عميل`,
      dateRange,
      companyName: settings.businessName,
      companyNameEn: settings.businessNameEn,
      accentColor: settings.primaryColor || "#2563eb",
    },
    createElement(ReportStatRow, {
      accentColor: settings.primaryColor || "#2563eb",
      stats: [
        { label: "عدد العملاء", value: fmtInt(clients.length) },
        { label: "إجمالي المبيعات", value: `${c}${fmtNum(totalSpent)}` },
        { label: "عدد الفواتير", value: fmtInt(invoices.length) },
      ],
    }),
    createElement(ReportTable, {
      accentColor: settings.primaryColor || "#2563eb",
      columns: [
        { label: "#", width: "5%" },
        { label: "العميل", width: "25%" },
        { label: "الهاتف", width: "18%" },
        { label: "العنوان", width: "18%" },
        { label: "الفواتير", width: "10%", align: "center" },
        { label: "إجمالي الإنفاق", width: "24%", align: "left" },
      ],
      rows: clients.map((cl, i) => [
        String(i + 1),
        cl.name,
        cl.phone || "—",
        cl.address || "—",
        String(invoices.filter(inv => inv.clientId === cl.id).length),
        `${c}${fmtNum(cl.totalSpent)}`,
      ]),
      totalsRow: [
        "",
        `${clients.length} عميل`,
        "",
        "",
        fmtInt(invoices.length),
        `${c}${fmtNum(totalSpent)}`,
      ],
    })
  );
}

// ============ CLIENT SHEET (single client) ============
export function createClientSheet(
  client: Client,
  clientInvoices: Invoice[],
  settings: AppSettings
) {
  const c = currency(settings);
  const dateRange = {
    from: clientInvoices.length > 0 ? clientInvoices[clientInvoices.length - 1].createdAt : "",
    to: clientInvoices.length > 0 ? clientInvoices[0].createdAt : "",
  };

  return createElement(
    ReportPDF,
    {
      title: `بيانات العميل: ${client.name}`,
      subtitle: client.phone ? `${client.phone} — ${client.address}` : client.address,
      dateRange: dateRange.from ? dateRange : { from: "—", to: "—" },
      companyName: settings.businessName,
      companyNameEn: settings.businessNameEn,
      accentColor: settings.primaryColor || "#2563eb",
    },
    createElement(ReportStatRow, {
      accentColor: settings.primaryColor || "#2563eb",
      stats: [
        { label: "إجمالي المشتريات", value: `${c}${fmtNum(client.totalSpent)}` },
        { label: "عدد الفواتير", value: fmtInt(clientInvoices.length) },
        { label: "تاريخ التسجيل", value: client.createdAt },
      ],
    }),
    clientInvoices.length > 0
      ? createElement(ReportTable, {
          accentColor: settings.primaryColor || "#2563eb",
          columns: [
            { label: "#", width: "5%" },
            { label: "رقم الفاتورة", width: "20%" },
            { label: "التاريخ", width: "15%" },
            { label: "الحالة", width: "15%", align: "center" },
            { label: "المنتجات", width: "10%", align: "center" },
            { label: "الإجمالي", width: "35%", align: "left" },
          ],
          rows: clientInvoices.map((inv, i) => [
            String(i + 1),
            inv.invoiceNumber,
            inv.createdAt,
            inv.status,
            String(inv.items.length),
            `${c}${fmtNum(inv.total)}`,
          ]),
          totalsRow: [
            "",
            `${clientInvoices.length} فاتورة`,
            "",
            "",
            "",
            `${c}${fmtNum(client.totalSpent)}`,
          ],
        })
      : createElement(PdfView, { style: { padding: 20 } },
          createElement(PdfText, { style: { fontSize: 10, color: "#94a3b8", textAlign: "center" } }, "لا توجد فواتير لهذا العميل")
        )
  );
}

// ============ ACCOUNTING REPORT ============
export function createAccountingReport(
  invoices: Invoice[],
  dateRange: DateRange,
  settings: AppSettings
) {
  const c = currency(settings);
  const filtered = invoices.filter(inv => inv.createdAt >= dateRange.from && inv.createdAt <= dateRange.to && inv.status !== "ملغاة" && inv.status !== "مسودة");
  const paidRevenue = filtered.filter(inv => inv.status === "مدفوعة").reduce((s, inv) => s + inv.total, 0);
  const unpaidRevenue = filtered.filter(inv => inv.status === "غير مدفوعة").reduce((s, inv) => s + inv.total, 0);
  const totalRevenue = paidRevenue + unpaidRevenue;
  const discounts = filtered.reduce((s, inv) => s + inv.discountAmount, 0);

  return createElement(
    ReportPDF,
    {
      title: "التقرير المحاسبي",
      subtitle: `الفترة: من ${dateRange.from} إلى ${dateRange.to}`,
      dateRange,
      companyName: settings.businessName,
      companyNameEn: settings.businessNameEn,
      accentColor: settings.primaryColor || "#2563eb",
    },
    createElement(ReportStatRow, {
      accentColor: settings.primaryColor || "#2563eb",
      stats: [
        { label: "إجمالي الإيرادات", value: `${c}${fmtNum(totalRevenue)}` },
        { label: "المحصّل", value: `${c}${fmtNum(paidRevenue)}` },
        { label: "المستحقات", value: `${c}${fmtNum(unpaidRevenue)}` },
        { label: "الخصومات", value: `${c}${fmtNum(discounts)}` },
      ],
    }),
    createElement(ReportTable, {
      accentColor: settings.primaryColor || "#2563eb",
      columns: [
        { label: "#", width: "5%" },
        { label: "رقم الفاتورة", width: "15%" },
        { label: "العميل", width: "22%" },
        { label: "التاريخ", width: "12%" },
        { label: "الحالة", width: "12%", align: "center" },
        { label: "الخصم", width: "12%", align: "left" },
        { label: "الإجمالي", width: "22%", align: "left" },
      ],
      rows: filtered.map((inv, i) => [
        String(i + 1),
        inv.invoiceNumber,
        inv.clientName,
        inv.createdAt,
        inv.status,
        inv.discountAmount > 0 ? `-${c}${fmtNum(inv.discountAmount)}` : "—",
        `${c}${fmtNum(inv.total)}`,
      ]),
      totalsRow: [
        "",
        `${filtered.length} فاتورة`,
        "",
        "",
        "",
        discounts > 0 ? `-${c}${fmtNum(discounts)}` : "—",
        `${c}${fmtNum(totalRevenue)}`,
      ],
    })
  );
}

// ============ ORDERS REPORT ============
export function createOrdersReport(
  orders: Order[],
  dateRange: DateRange,
  settings: AppSettings
) {
  const filtered = orders.filter(o => o.createdAt >= dateRange.from && o.createdAt <= dateRange.to);
  const pending = filtered.filter(o => o.status === "قيد الانتظار").length;
  const inProgress = filtered.filter(o => o.status === "قيد التنفيذ").length;
  const completed = filtered.filter(o => o.status === "مكتمل").length;

  return createElement(
    ReportPDF,
    {
      title: "تقرير الطلبات",
      subtitle: `${filtered.length} طلب`,
      dateRange,
      companyName: settings.businessName,
      companyNameEn: settings.businessNameEn,
      accentColor: settings.primaryColor || "#2563eb",
    },
    createElement(ReportStatRow, {
      accentColor: settings.primaryColor || "#2563eb",
      stats: [
        { label: "إجمالي الطلبات", value: fmtInt(filtered.length) },
        { label: "قيد الانتظار", value: fmtInt(pending) },
        { label: "قيد التنفيذ", value: fmtInt(inProgress) },
        { label: "مكتمل", value: fmtInt(completed) },
      ],
    }),
    createElement(ReportTable, {
      accentColor: settings.primaryColor || "#2563eb",
      columns: [
        { label: "#", width: "5%" },
        { label: "رقم التتبع", width: "15%" },
        { label: "العميل", width: "25%" },
        { label: "الوصف", width: "25%" },
        { label: "الحالة", width: "15%", align: "center" },
        { label: "التاريخ", width: "15%" },
      ],
      rows: filtered.map((o, i) => [
        String(i + 1),
        o.trackingId,
        o.clientName,
        o.description || "—",
        o.status,
        o.createdAt,
      ]),
    })
  );
}
