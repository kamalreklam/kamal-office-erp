"use client";

import type { Invoice, InvoiceItem } from "@/lib/data";
import type { AppSettings } from "@/lib/store";

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, "_").replace(/\s+/g, "_");
}

function fmt(amount: number, symbol = "$"): string {
  return `${symbol}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Arabic text shaping for PDF rendering — joins letters into presentation forms
// Do NOT reverse text — @react-pdf/renderer handles RTL direction internally
let reshapeCache: ((text: string) => string) | null = null;
async function loadReshaper() {
  if (reshapeCache) return reshapeCache;
  const { convertArabic } = await import("arabic-reshaper");
  reshapeCache = (text: string) => {
    if (!text) return "";
    return convertArabic(text);
  };
  return reshapeCache;
}

async function renderAndDownload(element: React.ReactElement, filename: string) {
  const { pdf } = await import("@react-pdf/renderer");
  const blob = await pdf(element as any).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================
// INVOICE PDF
// ============================================================
export async function exportInvoicePDF(
  invoice: Invoice,
  settings: AppSettings,
  clientInfo?: { phone?: string; address?: string },
) {
  const { createElement: h } = await import("react");
  const { Document, Page, View, Text, Font, StyleSheet } = await import("@react-pdf/renderer");
  const ar = await loadReshaper();

  // Register Arabic font
  Font.register({
    family: "Arabic",
    fonts: [
      { src: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/ibmplexsansarabic/IBMPlexSansArabic-Regular.ttf", fontWeight: 400 },
      { src: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/ibmplexsansarabic/IBMPlexSansArabic-Bold.ttf", fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((word: string) => [word]);

  const c = settings.currencySymbol || "$";
  const items: InvoiceItem[] = Array.isArray(invoice.items) ? invoice.items : (invoice.items as any)?._items || [];

  const blue = "#29ABE2";
  const dark = "#1a1a2e";
  const gray = "#64748b";
  const lightGray = "#f5f7fa";

  const s = StyleSheet.create({
    page: { fontFamily: "Arabic", fontSize: 10, color: dark, backgroundColor: "#fff", position: "relative" },
    // Top strip
    topStrip: { flexDirection: "row", height: 4 },
    stripBlue: { flex: 4, backgroundColor: blue },
    stripDark: { flex: 3, backgroundColor: "#1B8AC2" },
    stripKey: { flex: 3, backgroundColor: dark },
    // Header
    header: { backgroundColor: dark, padding: "22 30 18 30", flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
    companyName: { fontSize: 16, fontWeight: 700, color: "#fff", textAlign: "right" },
    tagline: { fontSize: 8, color: blue, textAlign: "right", marginTop: 3, letterSpacing: 2 },
    contact: { fontSize: 7, color: "rgba(255,255,255,0.45)", textAlign: "right", marginTop: 4 },
    logoText: { fontSize: 18, fontWeight: 700, color: "#fff" },
    // Title bar
    titleBar: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: "12 30", backgroundColor: lightGray, borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0" },
    invoiceLabel: { fontSize: 10, fontWeight: 700, color: blue, letterSpacing: 2 },
    invoiceNum: { fontSize: 18, fontWeight: 700, color: dark, marginRight: 10 },
    invoiceDate: { fontSize: 14, color: gray },
    // Content
    content: { padding: "18 30" },
    // Client block
    clientBlock: { flexDirection: "row-reverse", borderWidth: 0.5, borderColor: "#e2e8f0", borderRadius: 4, padding: "10 16", marginBottom: 18, alignItems: "center", gap: 16, borderRightWidth: 3, borderRightColor: blue },
    clientLabel: { fontSize: 8, fontWeight: 700, color: gray, letterSpacing: 1 },
    clientName: { fontSize: 14, fontWeight: 700, color: dark },
    clientDetail: { fontSize: 9, color: gray },
    // Table
    tableHeader: { flexDirection: "row-reverse", backgroundColor: dark, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 3 },
    tableHeaderCell: { color: "rgba(255,255,255,0.8)", fontSize: 7, fontWeight: 700, textAlign: "right" },
    tableRow: { flexDirection: "row-reverse", paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 0.3, borderBottomColor: "#f0f3f7" },
    tableRowAlt: { backgroundColor: "#fafbfd" },
    tableCell: { fontSize: 10, color: dark, textAlign: "right" },
    tableCellBold: { fontSize: 10, fontWeight: 700, color: dark, textAlign: "right" },
    // Totals
    totalsBox: { width: 180, marginTop: 14, borderWidth: 0.5, borderColor: "#e2e8f0", borderRadius: 4, overflow: "hidden" },
    totalsRow: { flexDirection: "row-reverse", justifyContent: "space-between", padding: "7 14", borderBottomWidth: 0.3, borderBottomColor: "#f0f3f7" },
    totalsLabel: { fontSize: 8, color: gray },
    totalsValue: { fontSize: 9, fontWeight: 700, color: dark },
    grandTotal: { flexDirection: "row-reverse", justifyContent: "space-between", padding: "10 14", backgroundColor: dark },
    grandTotalLabel: { fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.8)" },
    grandTotalValue: { fontSize: 16, fontWeight: 700, color: blue },
    // Notes
    notesBlock: { marginTop: 14, padding: "10 14", backgroundColor: lightGray, borderRightWidth: 2, borderRightColor: blue, borderRadius: 3 },
    notesTitle: { fontSize: 7, fontWeight: 700, color: gray, letterSpacing: 1, marginBottom: 3 },
    notesText: { fontSize: 8, color: gray, lineHeight: 1.6 },
    // Footer
    footer: { position: "absolute", bottom: 10, left: 30, right: 30 },
    footerLine: { height: 0.3, backgroundColor: "#e2e8f0", marginBottom: 5 },
    footerContent: { flexDirection: "row-reverse", justifyContent: "space-between" },
    footerText: { fontSize: 7, color: gray },
    // Bottom strip
    bottomStrip: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", height: 3 },
  });

  const colWidths = ["5%", "42%", "15%", "17%", "21%"];

  const doc = h(Document, {},
    h(Page, { size: "A4", style: s.page },
      // Top strip
      h(View, { style: s.topStrip },
        h(View, { style: s.stripBlue }),
        h(View, { style: s.stripDark }),
        h(View, { style: s.stripKey }),
      ),
      // Header
      h(View, { style: s.header },
        h(View, {},
          h(Text, { style: s.companyName }, ar("برينتكس للأحبار ولوازم الطباعة")),
          h(Text, { style: s.tagline }, "INKS & PRINTING SUPPLIES"),
          h(Text, { style: s.contact }, ar("الجميلية - حلب - سوريا") + "  |  kamalreklam.ist@gmail.com  |  00905465301000"),
        ),
        h(Text, { style: s.logoText }, "PRINTIX"),
      ),
      // Title bar
      h(View, { style: s.titleBar },
        h(View, { style: { flexDirection: "row", alignItems: "baseline", gap: 10 } },
          h(Text, { style: s.invoiceNum }, invoice.invoiceNumber),
          h(Text, { style: s.invoiceLabel }, ar("فاتورة")),
        ),
        h(Text, { style: s.invoiceDate }, invoice.createdAt.split("-").reverse().join("/")),
      ),
      // Content
      h(View, { style: s.content },
        // Client
        h(View, { style: s.clientBlock },
          h(Text, { style: s.clientName }, ar(invoice.clientName)),
          h(Text, { style: s.clientLabel }, ar("العميل")),
          (clientInfo?.phone || clientInfo?.address)
            ? h(Text, { style: s.clientDetail }, [clientInfo.address, clientInfo.phone].filter(Boolean).map(t => ar(t!)).join("  ·  "))
            : null,
        ),
        // Table header
        h(View, { style: s.tableHeader },
          h(Text, { style: { ...s.tableHeaderCell, width: colWidths[4], textAlign: "left" } }, ar("المبلغ")),
          h(Text, { style: { ...s.tableHeaderCell, width: colWidths[3], textAlign: "center" } }, ar("سعر الوحدة")),
          h(Text, { style: { ...s.tableHeaderCell, width: colWidths[2], textAlign: "center" } }, ar("الكمية")),
          h(Text, { style: { ...s.tableHeaderCell, width: colWidths[1] } }, ar("الوصف")),
          h(Text, { style: { ...s.tableHeaderCell, width: colWidths[0], textAlign: "center" } }, "#"),
        ),
        // Table rows
        ...items.map((item, i) =>
          h(View, { key: i, style: [s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}], wrap: false },
            h(Text, { style: { ...s.tableCellBold, width: colWidths[4], textAlign: "left" } }, fmt(item.total, c)),
            h(Text, { style: { ...s.tableCell, width: colWidths[3], textAlign: "center" } }, fmt(item.unitPrice, c)),
            h(Text, { style: { ...s.tableCell, width: colWidths[2], textAlign: "center" } }, `${item.quantity} ${ar("وحدة")}`),
            h(Text, { style: { ...s.tableCellBold, width: colWidths[1] } }, item.productName),
            h(Text, { style: { ...s.tableCell, width: colWidths[0], textAlign: "center", color: gray, fontSize: 8 } }, String(i + 1)),
          )
        ),
        // Totals box
        h(View, { style: s.totalsBox },
          h(View, { style: s.totalsRow },
            h(Text, { style: s.totalsValue }, fmt(invoice.subtotal, c)),
            h(Text, { style: s.totalsLabel }, ar("المجموع الفرعي")),
          ),
          invoice.discountAmount > 0
            ? h(View, { style: s.totalsRow },
                h(Text, { style: { ...s.totalsValue, color: blue } }, `-${fmt(invoice.discountAmount, c)}`),
                h(Text, { style: s.totalsLabel }, ar(`الخصم ${invoice.discountType === "percentage" ? `(${invoice.discountValue}%)` : ""}`)),
              )
            : null,
          (invoice.taxAmount ?? 0) > 0
            ? h(View, { style: s.totalsRow },
                h(Text, { style: s.totalsValue }, `+${fmt(invoice.taxAmount, c)}`),
                h(Text, { style: s.totalsLabel }, ar("الضريبة")),
              )
            : null,
          h(View, { style: s.grandTotal },
            h(Text, { style: s.grandTotalValue }, fmt(invoice.total, c)),
            h(Text, { style: s.grandTotalLabel }, ar("الإجمالي")),
          ),
        ),
        // Notes
        invoice.notes
          ? h(View, { style: s.notesBlock },
              h(Text, { style: s.notesTitle }, ar("ملاحظات")),
              h(Text, { style: s.notesText }, ar(invoice.notes)),
            )
          : null,
      ),
      // Footer
      h(View, { style: s.footer, fixed: true },
        h(View, { style: s.footerLine }),
        h(View, { style: s.footerContent },
          h(Text, { style: s.footerText, render: ({ pageNumber, totalPages }: any) => `${pageNumber} / ${totalPages}` }),
          h(Text, { style: s.footerText }, ar(settings.invoiceNotes || "شكراً لتعاملكم معنا")),
        ),
      ),
      // Bottom strip
      h(View, { style: s.bottomStrip, fixed: true },
        h(View, { style: s.stripBlue }),
        h(View, { style: s.stripDark }),
        h(View, { style: s.stripKey }),
      ),
    )
  );

  const clientPart = sanitizeFilename(invoice.clientName);
  const datePart = invoice.createdAt.replace(/\//g, "-");
  await renderAndDownload(doc, `${clientPart}_${datePart}_${invoice.invoiceNumber}.pdf`);
}

// ============================================================
// REPORT PDFs — using jsPDF (simpler, no font issues)
// ============================================================
export interface ReportDateRange { from: string; to: string; }

async function createReportDoc() {
  const { jsPDF } = await import("jspdf");
  await import("jspdf-autotable");
  return new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
}

async function buildReport(
  title: string, subtitle: string, dateRange: ReportDateRange, settings: AppSettings,
  stats: { label: string; value: string }[],
  tableHead: string[][], tableBody: string[][], totalsRow?: string[],
) {
  const doc = await createReportDoc();
  const pageW = 210; const margin = 15;
  const blue = [41, 171, 226]; const dark = [26, 26, 46]; const gray = [100, 116, 139]; const lightGray = [241, 245, 249];

  doc.setFillColor(blue[0], blue[1], blue[2]); doc.rect(0, 0, pageW, 3, "F");
  let y = 14;
  doc.setFontSize(16); doc.setTextColor(blue[0], blue[1], blue[2]); doc.setFont("helvetica", "bold");
  doc.text(title, pageW - margin, y, { align: "right" });
  doc.setFontSize(9); doc.setTextColor(gray[0], gray[1], gray[2]); doc.setFont("helvetica", "normal");
  doc.text(subtitle, pageW - margin, y + 6, { align: "right" });
  doc.setFontSize(8); doc.text(`من ${dateRange.from} إلى ${dateRange.to}`, margin, y + 2, { align: "left" });
  doc.setFontSize(7); doc.text(`${settings.businessName} | ${settings.businessNameEn}`, margin, y + 6, { align: "left" });
  y = 24; doc.setDrawColor(232, 236, 241); doc.line(margin, y, pageW - margin, y);

  y = 28;
  const statW = (pageW - margin * 2) / stats.length;
  stats.forEach((stat, i) => {
    const x = pageW - margin - (i + 1) * statW;
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]); doc.rect(x + 1, y, statW - 2, 16, "F");
    doc.setFillColor(blue[0], blue[1], blue[2]); doc.rect(x + 1, y, statW - 2, 1.5, "F");
    doc.setFontSize(7); doc.setTextColor(gray[0], gray[1], gray[2]); doc.text(stat.label, x + statW / 2, y + 6, { align: "center" });
    doc.setFontSize(11); doc.setTextColor(dark[0], dark[1], dark[2]); doc.setFont("helvetica", "bold"); doc.text(stat.value, x + statW / 2, y + 13, { align: "center" });
  });

  const body = totalsRow ? [...tableBody, totalsRow] : tableBody;
  (doc as any).autoTable({
    startY: 48, head: tableHead, body, theme: "plain",
    styles: { font: "helvetica", fontSize: 8, cellPadding: 3, lineColor: [240, 243, 247], lineWidth: 0.2, textColor: dark, halign: "right" },
    headStyles: { fillColor: blue, textColor: [255, 255, 255], fontSize: 7, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 251, 253] },
    margin: { left: margin, right: margin },
    didParseCell: (data: any) => { if (totalsRow && data.section === "body" && data.row.index === tableBody.length) { data.cell.styles.fillColor = blue; data.cell.styles.textColor = [255, 255, 255]; data.cell.styles.fontStyle = "bold"; } },
  });

  const fY = 285;
  doc.setDrawColor(232, 236, 241); doc.line(margin, fY, pageW - margin, fY);
  doc.setFontSize(7); doc.setTextColor(gray[0], gray[1], gray[2]); doc.setFont("helvetica", "normal");
  doc.text(`${settings.businessName} — ${settings.businessNameEn}`, pageW - margin, fY + 4, { align: "right" });
  doc.text(new Date().toLocaleDateString("ar-SY"), margin, fY + 4, { align: "left" });
  return doc;
}

export async function exportInventoryReportPDF(products: any[], dateRange: ReportDateRange, settings: AppSettings) {
  const c = settings.currencySymbol || "$";
  const tv = products.reduce((s: number, p: any) => s + p.price * p.stock, 0);
  const ts = products.reduce((s: number, p: any) => s + p.stock, 0);
  const ls = products.filter((p: any) => p.stock <= p.minStock);
  const doc = await buildReport("تقرير المخزون", `${products.length} منتج`, dateRange, settings,
    [{ label: "المنتجات", value: String(products.length) }, { label: "المخزون", value: ts.toLocaleString() }, { label: "القيمة", value: fmt(tv, c) }, { label: "منخفض", value: String(ls.length) }],
    [["#", "المنتج", "الفئة", "السعر", "المخزون", "الوحدة", "القيمة"]],
    products.map((p: any, i: number) => [String(i + 1), p.name, p.category, fmt(p.price, c), String(p.stock), p.unit, fmt(p.price * p.stock, c)]),
    ["", `${products.length}`, "", "", String(ts), "", fmt(tv, c)]);
  doc.save(`تقرير_المخزون_${dateRange.from}_${dateRange.to}.pdf`);
}

export async function exportSalesReportPDF(invoices: Invoice[], dateRange: ReportDateRange, settings: AppSettings) {
  const c = settings.currencySymbol || "$";
  const f = invoices.filter(i => i.createdAt >= dateRange.from && i.createdAt <= dateRange.to && i.status !== "ملغاة" && i.status !== "مسودة");
  const tr = f.filter(i => i.status === "مدفوعة").reduce((s, i) => s + i.total, 0);
  const pc = f.filter(i => i.status === "مدفوعة").length;
  const ut = f.filter(i => i.status === "غير مدفوعة").reduce((s, i) => s + i.total, 0);
  const doc = await buildReport("تقرير المبيعات", `${f.length} فاتورة`, dateRange, settings,
    [{ label: "المبيعات", value: fmt(tr, c) }, { label: "الفواتير", value: String(f.length) }, { label: "المدفوعة", value: String(pc) }, { label: "المستحقات", value: fmt(ut, c) }],
    [["#", "الفاتورة", "العميل", "التاريخ", "الحالة", "الإجمالي"]],
    f.map((inv, i) => [String(i + 1), inv.invoiceNumber, inv.clientName, inv.createdAt, inv.status, fmt(inv.total, c)]),
    ["", `${f.length}`, "", "", `${pc} مدفوعة`, fmt(tr, c)]);
  doc.save(`تقرير_المبيعات_${dateRange.from}_${dateRange.to}.pdf`);
}

export async function exportClientsReportPDF(clients: any[], invoices: Invoice[], dateRange: ReportDateRange, settings: AppSettings) {
  const c = settings.currencySymbol || "$";
  const ts = clients.reduce((s: number, cl: any) => s + cl.totalSpent, 0);
  const doc = await buildReport("تقرير العملاء", `${clients.length} عميل`, dateRange, settings,
    [{ label: "العملاء", value: String(clients.length) }, { label: "المبيعات", value: fmt(ts, c) }, { label: "الفواتير", value: String(invoices.length) }],
    [["#", "العميل", "الهاتف", "العنوان", "الفواتير", "الإنفاق"]],
    clients.map((cl: any, i: number) => [String(i + 1), cl.name, cl.phone || "—", cl.address || "—", String(invoices.filter((inv: Invoice) => inv.clientId === cl.id).length), fmt(cl.totalSpent, c)]),
    ["", `${clients.length}`, "", "", String(invoices.length), fmt(ts, c)]);
  doc.save(`تقرير_العملاء_${dateRange.from}_${dateRange.to}.pdf`);
}

export async function exportAccountingReportPDF(invoices: Invoice[], dateRange: ReportDateRange, settings: AppSettings) {
  const c = settings.currencySymbol || "$";
  const f = invoices.filter(i => i.createdAt >= dateRange.from && i.createdAt <= dateRange.to && i.status !== "ملغاة" && i.status !== "مسودة");
  const pr = f.filter(i => i.status === "مدفوعة").reduce((s, i) => s + i.total, 0);
  const ur = f.filter(i => i.status === "غير مدفوعة").reduce((s, i) => s + i.total, 0);
  const d = f.reduce((s, i) => s + i.discountAmount, 0);
  const doc = await buildReport("التقرير المحاسبي", `من ${dateRange.from} إلى ${dateRange.to}`, dateRange, settings,
    [{ label: "الإيرادات", value: fmt(pr + ur, c) }, { label: "المحصّل", value: fmt(pr, c) }, { label: "المستحقات", value: fmt(ur, c) }, { label: "الخصومات", value: fmt(d, c) }],
    [["#", "الفاتورة", "العميل", "التاريخ", "الحالة", "الخصم", "الإجمالي"]],
    f.map((inv, i) => [String(i + 1), inv.invoiceNumber, inv.clientName, inv.createdAt, inv.status, inv.discountAmount > 0 ? `-${fmt(inv.discountAmount, c)}` : "—", fmt(inv.total, c)]),
    ["", `${f.length}`, "", "", "", d > 0 ? `-${fmt(d, c)}` : "—", fmt(pr + ur, c)]);
  doc.save(`التقرير_المحاسبي_${dateRange.from}_${dateRange.to}.pdf`);
}

export async function exportOrdersReportPDF(orders: any[], dateRange: ReportDateRange, settings: AppSettings) {
  const f = orders.filter((o: any) => o.createdAt >= dateRange.from && o.createdAt <= dateRange.to);
  const doc = await buildReport("تقرير الطلبات", `${f.length} طلب`, dateRange, settings,
    [{ label: "الطلبات", value: String(f.length) }, { label: "انتظار", value: String(f.filter((o: any) => o.status === "قيد الانتظار").length) }, { label: "تنفيذ", value: String(f.filter((o: any) => o.status === "قيد التنفيذ").length) }, { label: "مكتمل", value: String(f.filter((o: any) => o.status === "مكتمل").length) }],
    [["#", "التتبع", "العميل", "الوصف", "الحالة", "التاريخ"]],
    f.map((o: any, i: number) => [String(i + 1), o.trackingId, o.clientName, o.description || "—", o.status, o.createdAt]));
  doc.save(`تقرير_الطلبات_${dateRange.from}_${dateRange.to}.pdf`);
}

export async function exportClientSheetPDF(client: any, clientInvoices: Invoice[], settings: AppSettings) {
  const c = settings.currencySymbol || "$";
  const dr = { from: clientInvoices.length > 0 ? clientInvoices[clientInvoices.length - 1].createdAt : "—", to: clientInvoices.length > 0 ? clientInvoices[0].createdAt : "—" };
  const doc = await buildReport(`بيانات: ${client.name}`, `${client.phone || ""} — ${client.address || ""}`, dr, settings,
    [{ label: "المشتريات", value: fmt(client.totalSpent, c) }, { label: "الفواتير", value: String(clientInvoices.length) }, { label: "التسجيل", value: client.createdAt }],
    [["#", "الفاتورة", "التاريخ", "الحالة", "الإجمالي"]],
    clientInvoices.map((inv, i) => [String(i + 1), inv.invoiceNumber, inv.createdAt, inv.status, fmt(inv.total, c)]),
    ["", `${clientInvoices.length}`, "", "", fmt(client.totalSpent, c)]);
  doc.save(`${sanitizeFilename(client.name)}_بيانات.pdf`);
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
