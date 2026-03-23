"use client";

import {
  Document,
  Page,
  Text,
  View,
  Font,
  StyleSheet,
} from "@react-pdf/renderer";
import type { DateRange } from "./date-range-picker";

Font.register({
  family: "IBM Plex Arabic",
  fonts: [
    { src: "https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexsansarabic/IBMPlexSansArabic-Regular.ttf", fontWeight: 400 },
    { src: "https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexsansarabic/IBMPlexSansArabic-Bold.ttf", fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

function fmtNum(n: number, currency?: string): string {
  const formatted = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  return currency ? `${currency}${formatted}` : formatted;
}

function fmtInt(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

interface ReportPDFProps {
  title: string;
  subtitle?: string;
  dateRange: DateRange;
  companyName: string;
  companyNameEn: string;
  accentColor?: string;
  children?: React.ReactNode;
}

export function ReportPDF({
  title,
  subtitle,
  dateRange,
  companyName,
  companyNameEn,
  accentColor = "#2563eb",
  children,
}: ReportPDFProps) {
  const s = StyleSheet.create({
    page: {
      fontFamily: "IBM Plex Arabic",
      fontSize: 9,
      paddingTop: 25,
      paddingBottom: 50,
      paddingHorizontal: 30,
      direction: "rtl" as const,
      color: "#1e293b",
    },
    accentBar: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 3,
      backgroundColor: accentColor,
    },
    header: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "flex-end",
      marginBottom: 5,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: "#e2e8f0",
    },
    title: {
      fontSize: 16,
      fontWeight: 700,
      color: accentColor,
      textAlign: "right",
    },
    subtitle: {
      fontSize: 8,
      color: "#64748b",
      textAlign: "right",
      marginTop: 2,
    },
    dateRange: {
      fontSize: 8,
      color: "#64748b",
      textAlign: "left",
      backgroundColor: "#f8fafc",
      padding: "4 8",
      borderRadius: 4,
    },
    companyInfo: {
      fontSize: 7,
      color: "#94a3b8",
      textAlign: "left",
    },
    footer: {
      position: "absolute",
      bottom: 18,
      left: 30,
      right: 30,
    },
    footerLine: {
      height: 0.5,
      backgroundColor: "#e2e8f0",
      marginBottom: 6,
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
  });

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.accentBar} fixed />

        <View style={s.header} fixed>
          <View>
            <Text style={s.title}>{title}</Text>
            {subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
          </View>
          <View>
            <Text style={s.dateRange}>من {dateRange.from} إلى {dateRange.to}</Text>
            <Text style={{ ...s.companyInfo, marginTop: 2 }}>{companyName} | {companyNameEn}</Text>
          </View>
        </View>

        {children}

        <View style={s.footer} fixed>
          <View style={s.footerLine} />
          <View style={s.footerContent}>
            <Text style={s.footerText}>{companyName} — {companyNameEn}</Text>
            <Text
              style={s.footerText}
              render={({ pageNumber, totalPages }) => `الصفحة ${pageNumber} / ${totalPages}`}
            />
          </View>
        </View>
      </Page>
    </Document>
  );
}

// ============ Reusable table components for reports ============

interface TableColumn {
  label: string;
  width: string;
  align?: "right" | "left" | "center";
}

interface ReportTableProps {
  columns: TableColumn[];
  rows: string[][];
  accentColor?: string;
  totalsRow?: string[];
}

export function ReportTable({ columns, rows, accentColor = "#2563eb", totalsRow }: ReportTableProps) {
  const s = StyleSheet.create({
    header: {
      flexDirection: "row-reverse",
      backgroundColor: accentColor,
      paddingVertical: 5,
      paddingHorizontal: 6,
      borderRadius: 3,
      marginBottom: 1,
    },
    headerCell: {
      color: "white",
      fontSize: 7,
      fontWeight: 700,
    },
    row: {
      flexDirection: "row-reverse",
      paddingVertical: 5,
      paddingHorizontal: 6,
      borderBottomWidth: 0.5,
      borderBottomColor: "#e2e8f0",
    },
    rowAlt: {
      backgroundColor: "#f8fafc",
    },
    cell: {
      fontSize: 8,
      color: "#334155",
    },
    cellBold: {
      fontSize: 8,
      fontWeight: 700,
      color: "#1e293b",
    },
    totalsRow: {
      flexDirection: "row-reverse",
      paddingVertical: 6,
      paddingHorizontal: 6,
      backgroundColor: accentColor,
      borderRadius: 3,
      marginTop: 2,
    },
    totalsCell: {
      fontSize: 8,
      fontWeight: 700,
      color: "white",
    },
  });

  return (
    <View>
      <View style={s.header}>
        {columns.map((col, i) => (
          <Text key={i} style={{ ...s.headerCell, width: col.width, textAlign: col.align || "right" }}>{col.label}</Text>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={[s.row, ri % 2 === 1 ? s.rowAlt : {}]} wrap={false}>
          {row.map((cell, ci) => (
            <Text key={ci} style={{ ...(ci === 0 ? s.cellBold : s.cell), width: columns[ci].width, textAlign: columns[ci].align || "right" }}>{cell}</Text>
          ))}
        </View>
      ))}
      {totalsRow && (
        <View style={s.totalsRow}>
          {totalsRow.map((cell, ci) => (
            <Text key={ci} style={{ ...s.totalsCell, width: columns[ci].width, textAlign: columns[ci].align || "right" }}>{cell}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

// ============ Stat box for report summaries ============

interface StatBoxProps {
  label: string;
  value: string;
  accentColor?: string;
}

export function ReportStatRow({ stats, accentColor = "#2563eb" }: { stats: StatBoxProps[]; accentColor?: string }) {
  return (
    <View style={{ flexDirection: "row-reverse", gap: 8, marginBottom: 12 }}>
      {stats.map((stat, i) => (
        <View key={i} style={{
          flex: 1,
          backgroundColor: "#f8fafc",
          borderRadius: 4,
          padding: 8,
          borderTopWidth: 2,
          borderTopColor: accentColor,
        }}>
          <Text style={{ fontSize: 7, color: "#64748b", textAlign: "right" }}>{stat.label}</Text>
          <Text style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", textAlign: "right", marginTop: 2 }}>{stat.value}</Text>
        </View>
      ))}
    </View>
  );
}

export { fmtNum, fmtInt };
