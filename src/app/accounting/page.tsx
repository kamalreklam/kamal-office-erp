"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { formatCurrency, getStatusColor } from "@/lib/data";
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, Clock,
  FileText, Download, Calculator, Receipt, Wallet, CreditCard, MessageCircle,
} from "lucide-react";
import { exportCSV } from "@/lib/export";
import { toast } from "sonner";
import { DateRangeExportButton, type DateRange } from "@/components/date-range-picker";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from "recharts";

function getMonthLabel(dateStr: string) {
  const [y, m] = dateStr.split("-");
  const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  return `${months[parseInt(m) - 1]} ${y}`;
}

function daysBetween(d1: string, d2: string) {
  return Math.floor((new Date(d2).getTime() - new Date(d1).getTime()) / 86400000);
}

export default function AccountingPage() {
  const { invoices, settings, clients } = useStore();
  const currentYear = new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const years = useMemo(() => {
    const yrs = new Set(invoices.map((i) => i.createdAt.slice(0, 4)));
    yrs.add(currentYear);
    return Array.from(yrs).sort().reverse();
  }, [invoices, currentYear]);

  const yearInvoices = useMemo(
    () => invoices.filter((i) => i.createdAt.startsWith(selectedYear)),
    [invoices, selectedYear]
  );

  const today = new Date().toISOString().slice(0, 10);

  // =============================================
  // PROFIT & LOSS STATEMENT
  // =============================================
  const pnl = useMemo(() => {
    const paid = yearInvoices.filter((i) => i.status === "مدفوعة");
    const grossRevenue = paid.reduce((s, i) => s + i.subtotal, 0);
    const totalDiscount = paid.reduce((s, i) => s + i.discountAmount, 0);
    const taxAmount = paid.reduce((s, i) => s + (i.taxAmount ?? 0), 0);
    const netRevenue = paid.reduce((s, i) => s + i.total, 0);
    const revenueAfterTax = netRevenue - taxAmount;

    return { grossRevenue, totalDiscount, netRevenue, taxAmount, revenueAfterTax, invoiceCount: paid.length };
  }, [yearInvoices, settings]);

  // =============================================
  // ACCOUNTS RECEIVABLE (Unpaid Invoices with Aging)
  // =============================================
  const receivables = useMemo(() => {
    const unpaid = invoices
      .filter((i) => i.status === "غير مدفوعة")
      .map((i) => ({
        ...i,
        daysOverdue: daysBetween(i.createdAt, today),
        agingBucket: (() => {
          const days = daysBetween(i.createdAt, today);
          if (days <= 30) return "0-30 يوم";
          if (days <= 60) return "31-60 يوم";
          if (days <= 90) return "61-90 يوم";
          return "+90 يوم";
        })(),
      }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    const totalReceivable = unpaid.reduce((s, i) => s + i.total, 0);
    const aging = {
      "0-30 يوم": unpaid.filter((i) => i.daysOverdue <= 30).reduce((s, i) => s + i.total, 0),
      "31-60 يوم": unpaid.filter((i) => i.daysOverdue > 30 && i.daysOverdue <= 60).reduce((s, i) => s + i.total, 0),
      "61-90 يوم": unpaid.filter((i) => i.daysOverdue > 60 && i.daysOverdue <= 90).reduce((s, i) => s + i.total, 0),
      "+90 يوم": unpaid.filter((i) => i.daysOverdue > 90).reduce((s, i) => s + i.total, 0),
    };

    return { unpaid, totalReceivable, aging };
  }, [invoices, today]);

  // =============================================
  // CLIENT BALANCES
  // =============================================
  const clientBalances = useMemo(() => {
    const map = new Map<string, { name: string; paid: number; unpaid: number; total: number }>();
    invoices.forEach((inv) => {
      if (inv.status === "ملغاة" || inv.status === "مسودة") return;
      const existing = map.get(inv.clientId) || { name: inv.clientName, paid: 0, unpaid: 0, total: 0 };
      existing.total += inv.total;
      if (inv.status === "مدفوعة") existing.paid += inv.total;
      if (inv.status === "غير مدفوعة") existing.unpaid += inv.total;
      map.set(inv.clientId, existing);
    });
    return Array.from(map.values())
      .filter((c) => c.unpaid > 0)
      .sort((a, b) => b.unpaid - a.unpaid);
  }, [invoices]);

  // =============================================
  // MONTHLY FINANCIAL METRICS
  // =============================================
  const monthlyMetrics = useMemo(() => {
    const map = new Map<string, { revenue: number; discount: number; tax: number; invoices: number }>();
    for (let m = 1; m <= 12; m++) {
      const key = `${selectedYear}-${String(m).padStart(2, "0")}`;
      map.set(key, { revenue: 0, discount: 0, tax: 0, invoices: 0 });
    }
    yearInvoices
      .filter((i) => i.status === "مدفوعة")
      .forEach((inv) => {
        const key = inv.createdAt.slice(0, 7);
        const entry = map.get(key);
        if (entry) {
          entry.revenue += inv.total;
          entry.discount += inv.discountAmount;
          entry.tax += inv.taxAmount ?? 0;
          entry.invoices++;
        }
      });
    return Array.from(map.entries()).map(([key, val]) => ({
      month: getMonthLabel(key + "-01"),
      ...val,
      revenue: Math.round(val.revenue * 100) / 100,
      discount: Math.round(val.discount * 100) / 100,
      tax: Math.round(val.tax * 100) / 100,
    }));
  }, [yearInvoices, selectedYear, settings]);

  // =============================================
  // TAX SUMMARY
  // =============================================
  const taxSummary = useMemo(() => {
    if (!settings.taxEnabled) return null;
    const taxableInvoices = yearInvoices.filter((i) => i.status === "مدفوعة");
    const totalTax = taxableInvoices.reduce((s, i) => s + (i.taxAmount ?? 0), 0);
    const totalTaxable = taxableInvoices.reduce((s, i) => s + i.total - (i.taxAmount ?? 0), 0);
    const monthlyTax = monthlyMetrics.map((m) => ({ month: m.month, tax: m.tax }));
    return { totalTaxable, totalTax, rate: settings.taxRate, monthlyTax };
  }, [yearInvoices, settings, monthlyMetrics]);

  // Aging chart data
  const agingChartData = Object.entries(receivables.aging).map(([bucket, amount]) => ({
    bucket,
    amount: Math.round(amount * 100) / 100,
  }));

  function handleExportReceivables() {
    exportCSV("accounts-receivable", ["رقم الفاتورة", "العميل", "التاريخ", "المبلغ", "أيام التأخر", "الفترة"],
      receivables.unpaid.map((inv) => [inv.invoiceNumber, inv.clientName, inv.createdAt, String(inv.total), String(inv.daysOverdue), inv.agingBucket])
    );
    toast.success("تم تصدير المستحقات");
  }

  function handleExportPnL() {
    exportCSV("profit-loss", ["البند", "المبلغ"], [
      ["إجمالي الإيرادات (قبل الخصم)", String(pnl.grossRevenue)],
      ["إجمالي الخصومات", String(pnl.totalDiscount)],
      ["صافي الإيرادات", String(pnl.netRevenue)],
      ...(settings.taxEnabled ? [["الضريبة المستحقة", String(pnl.taxAmount)]] : []),
      ...(settings.taxEnabled ? [["الإيرادات بعد الضريبة", String(pnl.revenueAfterTax)]] : []),
    ]);
    toast.success("تم تصدير قائمة الأرباح");
  }

  const kpis = [
    { label: "صافي الإيرادات", value: formatCurrency(pnl.netRevenue), icon: DollarSign, color: "text-emerald-600 bg-emerald-50" },
    { label: "المستحقات المتأخرة", value: formatCurrency(receivables.totalReceivable), icon: Clock, color: "text-amber-600 bg-amber-50" },
    { label: "إجمالي الخصومات", value: formatCurrency(pnl.totalDiscount), icon: Receipt, color: "text-sky-600 bg-sky-50" },
    { label: settings.taxEnabled ? `الضريبة (${settings.taxRate}%)` : "الضريبة", value: settings.taxEnabled ? formatCurrency(pnl.taxAmount) : "معطلة", icon: Calculator, color: "text-violet-600 bg-violet-50" },
  ];

  function shareWhatsApp() {
    const lines = [
      `💰 *التقرير المحاسبي - ${settings.businessName}*`,
      `📅 التاريخ: ${new Date().toLocaleDateString("ar-SY")}`,
      `📆 السنة: ${selectedYear}`,
      "",
      `📊 *قائمة الأرباح والخسائر:*`,
      `  • إجمالي الإيرادات: ${settings.currencySymbol}${pnl.grossRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      `  • الخصومات: -${settings.currencySymbol}${pnl.totalDiscount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      `  • صافي الإيرادات: ${settings.currencySymbol}${pnl.netRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
    ];
    if (settings.taxEnabled) {
      lines.push(`  • الضريبة (${settings.taxRate}%): ${settings.currencySymbol}${pnl.taxAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
    }
    lines.push(
      "",
      `🔔 *المستحقات:*`,
      `  • إجمالي المستحقات: ${settings.currencySymbol}${receivables.totalReceivable.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      `  • عدد الفواتير المعلقة: ${receivables.unpaid.length}`,
    );
    if (receivables.unpaid.length > 0) {
      lines.push("", `📋 *الفواتير غير المدفوعة:*`);
      receivables.unpaid.slice(0, 10).forEach((inv, i) => {
        lines.push(`  ${i + 1}. ${inv.invoiceNumber} | ${inv.clientName} | ${settings.currencySymbol}${inv.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
      });
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
  }

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="animate-fade-in-up text-center">
          <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">المحاسبة</h1>
          <p className="mt-1.5 text-sm text-muted-foreground sm:mt-2 sm:text-base">
            قائمة الأرباح والخسائر · المستحقات · الضرائب
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <DateRangeExportButton
              label="تصدير تقرير PDF"
              onExport={async (range: DateRange) => {
                try {
                  const { exportAccountingReportPDF } = await import("@/lib/pdf");
                  await exportAccountingReportPDF(invoices, range, settings);
                  toast.success("تم تصدير التقرير المحاسبي");
                } catch {
                  toast.error("فشل تصدير التقرير");
                }
              }}
            />
            <Button variant="outline" size="sm" className="gap-1.5" onClick={shareWhatsApp}>
              <MessageCircle className="h-5 w-5 text-green-600" />
              <span className="hidden sm:inline">مشاركة واتساب</span>
            </Button>
            <Select value={selectedYear} onValueChange={(v) => v && setSelectedYear(v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 stagger-list">
          {kpis.map((kpi) => (
            <Card key={kpi.label} className="border border-[var(--glass-border)] shadow-sm hover-lift">
              <CardContent className="flex flex-col items-center p-4 sm:p-6">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl sm:h-12 sm:w-12 ${kpi.color}`}>
                  <kpi.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <p className="mt-2.5 text-xs font-medium text-muted-foreground sm:text-sm">{kpi.label}</p>
                <p className="mt-1 text-lg font-extrabold text-foreground sm:text-xl">{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* P&L Statement */}
        <Card className="border border-[var(--glass-border)] shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">قائمة الأرباح والخسائر — {selectedYear}</h2>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportPnL}>
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">تصدير</span>
              </Button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-[var(--surface-2)] p-4">
                <span className="text-sm font-medium text-foreground">إجمالي الإيرادات (قبل الخصم)</span>
                <span className="text-lg font-bold text-foreground">{formatCurrency(pnl.grossRevenue)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl p-4">
                <span className="text-sm text-muted-foreground">(-) إجمالي الخصومات</span>
                <span className="text-base font-medium text-red-600">-{formatCurrency(pnl.totalDiscount)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-primary/5 p-4 border border-primary/10">
                <span className="text-sm font-bold text-primary">صافي الإيرادات</span>
                <span className="text-lg font-extrabold text-primary">{formatCurrency(pnl.netRevenue)}</span>
              </div>
              {settings.taxEnabled && (
                <>
                  <div className="flex items-center justify-between rounded-xl p-4">
                    <span className="text-sm text-muted-foreground">(-) الضريبة ({settings.taxRate}%)</span>
                    <span className="text-base font-medium text-red-600">-{formatCurrency(pnl.taxAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-4 border border-emerald-100">
                    <span className="text-sm font-bold text-emerald-700">الإيرادات بعد الضريبة</span>
                    <span className="text-lg font-extrabold text-emerald-700">{formatCurrency(pnl.revenueAfterTax)}</span>
                  </div>
                </>
              )}
              <div className="mt-2 text-xs text-muted-foreground text-center">
                بناءً على {pnl.invoiceCount} فاتورة مدفوعة في {selectedYear}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Revenue Trend */}
        <Card className="border border-[var(--glass-border)] shadow-sm">
          <CardContent className="p-6">
            <h2 className="mb-6 text-lg font-bold text-foreground">الإيرادات والخصومات الشهرية</h2>
            <div className="h-[300px]" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyMetrics} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value, name) => {
                      const labels: Record<string, string> = { revenue: "الإيرادات", discount: "الخصومات", tax: "الضريبة" };
                      return [formatCurrency(Number(value)), labels[String(name)] || String(name)];
                    }}
                    contentStyle={{ fontFamily: "Almarai", direction: "rtl" }}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="oklch(0.60 0.16 235)" strokeWidth={2.5} dot={{ r: 4 }} name="revenue" />
                  <Line type="monotone" dataKey="discount" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="discount" />
                  {settings.taxEnabled && (
                    <Line type="monotone" dataKey="tax" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} name="tax" />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Accounts Receivable */}
        <Card className="border border-[var(--glass-border)] shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-amber-600" />
                <h2 className="text-lg font-bold text-foreground">المستحقات (فواتير غير مدفوعة)</h2>
                <Badge variant="outline" className="status-badge--warning">
                  {receivables.unpaid.length} فاتورة
                </Badge>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportReceivables}>
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">تصدير</span>
              </Button>
            </div>

            {/* Aging Summary */}
            <div className="grid gap-3 sm:grid-cols-4 mb-6">
              {Object.entries(receivables.aging).map(([bucket, amount]) => (
                <div key={bucket} className={`rounded-xl p-4 text-center ${
                  bucket === "+90 يوم" ? "bg-red-50 border border-red-100" :
                  bucket === "61-90 يوم" ? "bg-amber-50 border border-amber-100" :
                  "bg-muted/40 border border-[var(--glass-border)]"
                }`}>
                  <p className="text-xs text-muted-foreground">{bucket}</p>
                  <p className={`mt-1 text-lg font-bold ${
                    bucket === "+90 يوم" ? "text-red-700" :
                    bucket === "61-90 يوم" ? "text-amber-700" : "text-foreground"
                  }`}>{formatCurrency(amount)}</p>
                </div>
              ))}
            </div>

            {/* Aging Bar Chart */}
            {receivables.unpaid.length > 0 && (
              <div className="h-[200px] mb-6" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agingChartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), "المبلغ"]} />
                    <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                      {agingChartData.map((entry, i) => {
                        const colors = ["oklch(0.60 0.16 235)", "#f59e0b", "#ef4444", "#dc2626"];
                        return <rect key={i} fill={colors[i]} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Receivables Table */}
            {receivables.unpaid.length > 0 ? (
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[var(--surface-2)]">
                      <TableHead className="text-right font-bold">رقم الفاتورة</TableHead>
                      <TableHead className="text-right font-bold">العميل</TableHead>
                      <TableHead className="text-right font-bold">التاريخ</TableHead>
                      <TableHead className="text-right font-bold">المبلغ</TableHead>
                      <TableHead className="text-right font-bold">أيام التأخر</TableHead>
                      <TableHead className="text-right font-bold">الفترة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receivables.unpaid.slice(0, 20).map((inv) => (
                      <TableRow key={inv.id} className="transition-colors hover:bg-[var(--surface-2)]/30">
                        <TableCell>
                          <Link href={`/invoices/${inv.id}`} className="font-medium text-primary hover:underline">
                            {inv.invoiceNumber}
                          </Link>
                        </TableCell>
                        <TableCell>{inv.clientName}</TableCell>
                        <TableCell className="text-muted-foreground">{inv.createdAt}</TableCell>
                        <TableCell className="font-bold">{formatCurrency(inv.total)}</TableCell>
                        <TableCell>
                          <span className={`font-medium ${inv.daysOverdue > 90 ? "text-red-600" : inv.daysOverdue > 60 ? "text-amber-600" : "text-foreground"}`}>
                            {inv.daysOverdue} يوم
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${
                            inv.agingBucket === "+90 يوم" ? "status-badge--danger" :
                            inv.agingBucket === "61-90 يوم" ? "status-badge--warning" :
                            "bg-slate-50 text-slate-600 border-slate-200"
                          }`}>
                            {inv.agingBucket}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {receivables.unpaid.length > 20 && (
                  <p className="mt-3 text-center text-sm text-muted-foreground">
                    +{receivables.unpaid.length - 20} فواتير أخرى
                  </p>
                )}
              </div>
            ) : (
              <div className="py-10 text-center text-muted-foreground">
                <DollarSign className="mx-auto mb-3 h-10 w-10 opacity-20" />
                <p>لا توجد فواتير غير مدفوعة</p>
              </div>
            )}

            {/* Mobile Receivables */}
            <div className="flex flex-col gap-3 md:hidden">
              {receivables.unpaid.slice(0, 10).map((inv) => (
                <Link key={inv.id} href={`/invoices/${inv.id}`} className="block">
                  <div className="rounded-xl border border-[var(--glass-border)] p-4 hover:bg-[var(--surface-2)]/30 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-foreground">{inv.invoiceNumber}</p>
                        <p className="text-sm text-muted-foreground">{inv.clientName}</p>
                      </div>
                      <Badge variant="outline" className={`text-xs ${
                        inv.agingBucket === "+90 يوم" ? "status-badge--danger" : "status-badge--warning"
                      }`}>
                        {inv.daysOverdue} يوم
                      </Badge>
                    </div>
                    <div className="mt-2 flex justify-between text-sm">
                      <span className="text-muted-foreground">{inv.createdAt}</span>
                      <span className="font-bold">{formatCurrency(inv.total)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Client Balances */}
        {clientBalances.length > 0 && (
          <Card className="border border-[var(--glass-border)] shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <h2 className="text-lg font-bold text-foreground">أرصدة العملاء المستحقة</h2>
              </div>
              <div className="space-y-3">
                {clientBalances.slice(0, 10).map((c, i) => {
                  const maxVal = clientBalances[0].unpaid;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">{c.name}</span>
                        <div className="flex gap-4 text-sm">
                          <span className="text-muted-foreground">مدفوع: {formatCurrency(c.paid)}</span>
                          <span className="font-bold text-amber-600">مستحق: {formatCurrency(c.unpaid)}</span>
                        </div>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-amber-500 transition-all"
                          style={{ width: `${(c.unpaid / maxVal) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tax Summary */}
        {taxSummary && (
          <Card className="border border-[var(--glass-border)] shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Calculator className="h-5 w-5 text-violet-600" />
                <h2 className="text-lg font-bold text-foreground">ملخص الضريبة — {selectedYear}</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-3 mb-6">
                <div className="rounded-xl bg-[var(--surface-2)] p-4 text-center border border-[var(--glass-border)]">
                  <p className="text-xs text-muted-foreground">نسبة الضريبة</p>
                  <p className="mt-1 text-2xl font-extrabold text-foreground">{taxSummary.rate}%</p>
                </div>
                <div className="rounded-xl bg-[var(--surface-2)] p-4 text-center border border-[var(--glass-border)]">
                  <p className="text-xs text-muted-foreground">الإيرادات الخاضعة للضريبة</p>
                  <p className="mt-1 text-lg font-bold text-foreground">{formatCurrency(taxSummary.totalTaxable)}</p>
                </div>
                <div className="rounded-xl bg-violet-50 p-4 text-center border border-violet-100">
                  <p className="text-xs text-muted-foreground">إجمالي الضريبة المستحقة</p>
                  <p className="mt-1 text-lg font-extrabold text-violet-700">{formatCurrency(taxSummary.totalTax)}</p>
                </div>
              </div>
              <div className="h-[220px]" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={taxSummary.monthlyTax} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), "الضريبة"]} />
                    <Bar dataKey="tax" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
