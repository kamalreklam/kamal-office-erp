"use client";

import {
  Document,
  Page,
  Text,
  View,
  Image,
  Font,
  StyleSheet,
} from "@react-pdf/renderer";
import type { Invoice } from "@/lib/data";
import type { AppSettings } from "@/lib/store";

// Register IBM Plex Sans Arabic
Font.register({
  family: "IBM Plex Arabic",
  fonts: [
    { src: "/fonts/ibm-plex-arabic-regular.ttf", fontWeight: 400 },
    { src: "/fonts/ibm-plex-arabic-bold.ttf", fontWeight: 700 },
  ],
});

// Disable hyphenation for Arabic
Font.registerHyphenationCallback((word) => [word]);

export interface InvoicePDFSettings {
  showProductImages: boolean;
  showDiscountRow: boolean;
  showStatusBadge: boolean;
  headerStyle: "minimal" | "modern" | "classic";
  footerText: string;
  accentColor: string;
}

const defaultPdfSettings: InvoicePDFSettings = {
  showProductImages: false,
  showDiscountRow: true,
  showStatusBadge: true,
  headerStyle: "modern",
  footerText: "شكراً لتعاملكم معنا",
  accentColor: "#2563eb",
};

interface InvoicePDFProps {
  invoice: Invoice;
  settings: AppSettings;
  productImages?: Record<string, string>;
  pdfSettings?: Partial<InvoicePDFSettings>;
}

function formatNum(n: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "مدفوعة": return "مدفوعة";
    case "غير مدفوعة": return "غير مدفوعة";
    case "مسودة": return "مسودة";
    case "ملغاة": return "ملغاة";
    default: return status;
  }
}

function getStatusColor(status: string, accent: string): string {
  switch (status) {
    case "مدفوعة": return "#059669";
    case "غير مدفوعة": return "#d97706";
    case "مسودة": return "#6b7280";
    case "ملغاة": return "#dc2626";
    default: return accent;
  }
}

export function InvoicePDF({
  invoice,
  settings,
  productImages = {},
  pdfSettings: userPdfSettings,
}: InvoicePDFProps) {
  const pdf = { ...defaultPdfSettings, ...userPdfSettings };
  const accent = pdf.accentColor;
  const currency = settings.currencySymbol || "$";
  const hasDiscount = pdf.showDiscountRow && invoice.discountAmount > 0;

  const s = StyleSheet.create({
    page: {
      fontFamily: "IBM Plex Arabic",
      fontSize: 10,
      paddingTop: 30,
      paddingBottom: 60,
      paddingHorizontal: 35,
      direction: "rtl" as const,
      color: "#1e293b",
    },
    // Header styles
    headerModern: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 8,
      paddingBottom: 12,
    },
    accentBand: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 4,
      backgroundColor: accent,
    },
    accentBandClassic: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 60,
      backgroundColor: accent,
      opacity: 0.08,
    },
    companySection: {
      flexDirection: "column",
      alignItems: "flex-end",
    },
    companyName: {
      fontSize: 18,
      fontWeight: 700,
      color: accent,
      textAlign: "right",
    },
    companyNameEn: {
      fontSize: 9,
      color: "#64748b",
      textAlign: "right",
      marginTop: 2,
    },
    companyDetail: {
      fontSize: 8,
      color: "#64748b",
      textAlign: "right",
      marginTop: 1,
    },
    logo: {
      width: 50,
      height: 50,
      borderRadius: 8,
      objectFit: "cover" as const,
    },
    divider: {
      height: 1,
      backgroundColor: "#e2e8f0",
      marginVertical: 10,
    },
    accentDivider: {
      height: 2,
      backgroundColor: accent,
      marginVertical: 10,
      opacity: 0.3,
    },
    // Invoice meta
    metaSection: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      marginBottom: 15,
    },
    metaBlock: {
      flexDirection: "column",
      alignItems: "flex-end",
    },
    metaBlockLeft: {
      flexDirection: "column",
      alignItems: "flex-start",
    },
    metaLabel: {
      fontSize: 8,
      color: "#94a3b8",
      marginBottom: 2,
      textAlign: "right",
    },
    metaValue: {
      fontSize: 11,
      fontWeight: 700,
      textAlign: "right",
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      fontSize: 8,
      fontWeight: 700,
      color: "white",
      alignSelf: "flex-start",
      marginTop: 4,
    },
    // Table
    tableHeader: {
      flexDirection: "row-reverse",
      backgroundColor: accent,
      paddingVertical: 7,
      paddingHorizontal: 8,
      borderRadius: 4,
    },
    tableHeaderText: {
      color: "white",
      fontSize: 8,
      fontWeight: 700,
      textAlign: "right",
    },
    tableRow: {
      flexDirection: "row-reverse",
      paddingVertical: 7,
      paddingHorizontal: 8,
      borderBottomWidth: 0.5,
      borderBottomColor: "#e2e8f0",
    },
    tableRowAlt: {
      backgroundColor: "#f8fafc",
    },
    tableCell: {
      fontSize: 9,
      textAlign: "right",
      color: "#334155",
    },
    tableCellBold: {
      fontSize: 9,
      textAlign: "right",
      fontWeight: 700,
      color: "#1e293b",
    },
    productImage: {
      width: 28,
      height: 28,
      borderRadius: 4,
      objectFit: "cover" as const,
      backgroundColor: "#f1f5f9",
    },
    // Column widths
    colNum: { width: "6%" },
    colImg: { width: "8%" },
    colDesc: { width: "40%" },
    colDescNoImg: { width: "48%" },
    colQty: { width: "12%", textAlign: "center" as const },
    colPrice: { width: "17%", textAlign: "left" as const },
    colTotal: { width: "17%", textAlign: "left" as const },
    // Totals
    totalsSection: {
      marginTop: 15,
      alignItems: "flex-start",
      width: "45%",
    },
    totalRow: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      paddingVertical: 4,
      width: "100%",
    },
    totalLabel: {
      fontSize: 9,
      color: "#64748b",
      textAlign: "right",
    },
    totalValue: {
      fontSize: 10,
      fontWeight: 700,
      textAlign: "left",
    },
    grandTotalRow: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      paddingVertical: 8,
      paddingHorizontal: 10,
      width: "100%",
      backgroundColor: accent,
      borderRadius: 4,
      marginTop: 4,
    },
    grandTotalLabel: {
      fontSize: 11,
      fontWeight: 700,
      color: "white",
      textAlign: "right",
    },
    grandTotalValue: {
      fontSize: 13,
      fontWeight: 700,
      color: "white",
      textAlign: "left",
    },
    // Notes
    notesSection: {
      marginTop: 20,
      padding: 10,
      backgroundColor: "#f8fafc",
      borderRadius: 4,
      borderLeftWidth: 3,
      borderLeftColor: accent,
    },
    notesLabel: {
      fontSize: 8,
      fontWeight: 700,
      color: "#64748b",
      marginBottom: 3,
      textAlign: "right",
    },
    notesText: {
      fontSize: 9,
      color: "#475569",
      textAlign: "right",
      lineHeight: 1.6,
    },
    // Footer
    footer: {
      position: "absolute",
      bottom: 20,
      left: 35,
      right: 35,
    },
    footerDivider: {
      height: 1,
      backgroundColor: "#e2e8f0",
      marginBottom: 8,
    },
    footerContent: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
    },
    footerText: {
      fontSize: 7,
      color: "#94a3b8",
    },
    footerContact: {
      flexDirection: "row",
      gap: 12,
    },
    pageNumber: {
      fontSize: 7,
      color: "#94a3b8",
    },
  });

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Accent band */}
        {pdf.headerStyle === "modern" && <View style={s.accentBand} fixed />}
        {pdf.headerStyle === "classic" && <View style={s.accentBandClassic} fixed />}

        {/* Header */}
        <View style={s.headerModern}>
          <View style={s.companySection}>
            <Text style={s.companyName}>{settings.businessName}</Text>
            {settings.businessNameEn && (
              <Text style={s.companyNameEn}>{settings.businessNameEn}</Text>
            )}
            <Text style={s.companyDetail}>{settings.address}</Text>
            <Text style={s.companyDetail}>{settings.phone}</Text>
          </View>
          {settings.logo && (
            <Image src={settings.logo} style={s.logo} />
          )}
        </View>

        <View style={s.accentDivider} />

        {/* Invoice Meta */}
        <View style={s.metaSection}>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>رقم الفاتورة</Text>
            <Text style={s.metaValue}>{invoice.invoiceNumber}</Text>
            <Text style={{ ...s.metaLabel, marginTop: 6 }}>تاريخ الطلب</Text>
            <Text style={s.metaValue}>{invoice.createdAt}</Text>
          </View>

          <View style={s.metaBlockLeft}>
            <Text style={{ ...s.metaLabel, textAlign: "left" }}>العميل</Text>
            <Text style={{ ...s.metaValue, textAlign: "left" }}>{invoice.clientName}</Text>
            {pdf.showStatusBadge && (
              <View
                style={{
                  ...s.statusBadge,
                  backgroundColor: getStatusColor(invoice.status, accent),
                }}
              >
                <Text>{getStatusLabel(invoice.status)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Line Items Table */}
        <View style={s.tableHeader}>
          <Text style={{ ...s.tableHeaderText, ...s.colNum }}>#</Text>
          {pdf.showProductImages && (
            <Text style={{ ...s.tableHeaderText, ...s.colImg }}>صورة</Text>
          )}
          <Text style={{ ...s.tableHeaderText, ...(pdf.showProductImages ? s.colDesc : s.colDescNoImg) }}>الوصف</Text>
          <Text style={{ ...s.tableHeaderText, ...s.colQty }}>الكمية</Text>
          <Text style={{ ...s.tableHeaderText, ...s.colPrice }}>سعر الوحدة</Text>
          <Text style={{ ...s.tableHeaderText, ...s.colTotal }}>المبلغ</Text>
        </View>

        {invoice.items.map((item, idx) => (
          <View
            key={item.id}
            style={[s.tableRow, idx % 2 === 1 ? s.tableRowAlt : {}]}
            wrap={false}
          >
            <Text style={{ ...s.tableCell, ...s.colNum }}>{idx + 1}</Text>
            {pdf.showProductImages && (
              <View style={s.colImg}>
                {productImages[item.productId] ? (
                  <Image src={productImages[item.productId]} style={s.productImage} />
                ) : (
                  <View style={{ ...s.productImage, backgroundColor: "#e2e8f0" }} />
                )}
              </View>
            )}
            <Text style={{ ...s.tableCellBold, ...(pdf.showProductImages ? s.colDesc : s.colDescNoImg) }}>
              {item.productName}
            </Text>
            <Text style={{ ...s.tableCell, ...s.colQty }}>{item.quantity}</Text>
            <Text style={{ ...s.tableCell, ...s.colPrice }}>
              {currency}{formatNum(item.unitPrice)}
            </Text>
            <Text style={{ ...s.tableCellBold, ...s.colTotal }}>
              {currency}{formatNum(item.total)}
            </Text>
          </View>
        ))}

        {/* Totals */}
        <View style={{ flexDirection: "row-reverse" }}>
          <View style={{ width: "55%" }} />
          <View style={s.totalsSection}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>المجموع الفرعي</Text>
              <Text style={s.totalValue}>{currency}{formatNum(invoice.subtotal)}</Text>
            </View>

            {hasDiscount && (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>
                  الخصم {invoice.discountType === "percentage" ? `(${invoice.discountValue}%)` : ""}
                </Text>
                <Text style={{ ...s.totalValue, color: "#dc2626" }}>
                  -{currency}{formatNum(invoice.discountAmount)}
                </Text>
              </View>
            )}

            <View style={s.grandTotalRow}>
              <Text style={s.grandTotalLabel}>الإجمالي</Text>
              <Text style={s.grandTotalValue}>{currency}{formatNum(invoice.total)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {(invoice.notes || pdf.footerText) && (
          <View style={s.notesSection}>
            {invoice.notes && (
              <>
                <Text style={s.notesLabel}>ملاحظات</Text>
                <Text style={s.notesText}>{invoice.notes}</Text>
              </>
            )}
            {pdf.footerText && !invoice.notes && (
              <Text style={s.notesText}>{pdf.footerText}</Text>
            )}
            {pdf.footerText && invoice.notes && (
              <Text style={{ ...s.notesText, marginTop: 4 }}>{pdf.footerText}</Text>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <View style={s.footerDivider} />
          <View style={s.footerContent}>
            <View style={s.footerContact}>
              <Text style={s.footerText}>{settings.phone}</Text>
              <Text style={s.footerText}>|</Text>
              <Text style={s.footerText}>{settings.address}</Text>
            </View>
            <Text
              style={s.pageNumber}
              render={({ pageNumber, totalPages }) =>
                `الصفحة ${pageNumber} / ${totalPages}`
              }
            />
          </View>
        </View>
      </Page>
    </Document>
  );
}

export { defaultPdfSettings };
export type { InvoicePDFProps };
