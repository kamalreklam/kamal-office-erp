"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ResponsiveShell } from "@/components/responsive-shell";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { MobileAccounting } from "@/components/mobile/mobile-accounting";
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
  FileText, Download, Calculator, Receipt, Wallet, CreditCard, MessageCircle, Pencil, ImageIcon,
} from "lucide-react";
import { exportCSV } from "@/lib/export";
import { toast } from "sonner";
import { DateRangeExportButton, type DateRange } from "@/components/date-range-picker";
import { shareAsImage } from "@/lib/share";
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
  const isMobile = useIsMobile();
  if (isMobile) return <AppShell><MobileAccounting /></AppShell>;
  return <DesktopAccounting />;
}
function DesktopAccounting() {
  const { invoices, products, settings, clients } = useStore();
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

    // COGS: sum of cost prices for all sold items
    const cogs = paid.reduce((s, inv) => {
      const items = Array.isArray(inv.items) ? inv.items : [];
      return s + items.reduce((itemSum, item) => {
        // Temporary products store their own costPrice; regular products use DB price
        const costPrice = item.isTemporary ? (item.costPrice ?? 0) : (products.find(p => p.id === item.productId)?.price ?? 0);
        return itemSum + (costPrice * item.quantity);
      }, 0);
    }, 0);

    const grossProfit = netRevenue - cogs;
    const profitMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

    return { grossRevenue, totalDiscount, netRevenue, taxAmount, revenueAfterTax, cogs, grossProfit, profitMargin, invoiceCount: paid.length };
  }, [yearInvoices, products, settings]);

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
          if (days <= 30) return "0-30 يوماً";
          if (days <= 60) return "31-60 يوماً";
          if (days <= 90) return "61-90 يوماً";
          return "أكثر من 90 يوماً";
        })(),
      }));

    const totalReceivable = unpaid.reduce((s, i) => s + i.total, 0);

    const bucketSums = unpaid.reduce(
      (acc, inv) => {
        acc[inv.agingBucket] = (acc[inv.agingBucket] || 0) + inv.total;
        return acc;
      },
      { "0-30 يوماً": 0, "31-60 يوماً": 0, "61-90 يوماً": 0, "أكثر من 90 يوماً": 0 } as Record<string, number>
    );

    return { unpaid, totalReceivable, bucketSums };
  }, [invoices, today]);

  // =============================================
  // REVENUE BY CLIENT
  // =============================================
  const clientRevenue = useMemo(() => {
    const map = new Map<string, { name: string; totalSpent: number }>();
    yearInvoices
      .filter((i) => i.status === "مدفوعة")
      .forEach((inv) => {
        const existing = map.get(inv.clientId) || { name: inv.clientName, totalSpent: 0 };
        map.set(inv.clientId, {
          name: inv.clientName,
          totalSpent: existing.totalSpent + inv.total,
        });
      });
    return Array.from(map.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);
  }, [yearInvoices]);

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

  const clientBalances = useMemo(() => {
    const balancesMap = new Map<string, { id: string; name: string; paid: number; unpaid: number }>();
    yearInvoices.forEach((inv) => {
      const existing = balancesMap.get(inv.clientId) || { id: inv.clientId, name: inv.clientName, paid: 0, unpaid: 0 };
      if (inv.status === "مدفوعة") {
        existing.paid += inv.total;
      } else if (inv.status === "غير مدفوعة" || inv.status === "مدفوعة جزئياً") {
        existing.unpaid += inv.total;
      }
      balancesMap.set(inv.clientId, existing);
    });
    return Array.from(balancesMap.values())
      .filter((c) => c.unpaid > 0)
      .sort((a, b) => b.unpaid - a.unpaid);
  }, [yearInvoices]);

  const taxSummary = useMemo(() => {
    if (!settings.taxEnabled) return null;
    const taxableInvoices = yearInvoices.filter((i) => i.status === "مدفوعة");
    const totalTaxable = taxableInvoices.reduce((sum, i) => sum + i.subtotal, 0);
    const totalTax = taxableInvoices.reduce((sum, i) => sum + (i.taxAmount ?? 0), 0);
    
    // Monthly tax
    const monthlyTaxMap = new Map<string, number>();
    for (let m = 1; m <= 12; m++) {
      const key = `${selectedYear}-${String(m).padStart(2, "0")}`;
      monthlyTaxMap.set(key, 0);
    }
    taxableInvoices.forEach((inv) => {
      const key = inv.createdAt.slice(0, 7);
      const entry = monthlyTaxMap.get(key);
      if (entry !== undefined) {
        monthlyTaxMap.set(key, entry + (inv.taxAmount ?? 0));
      }
    });

    const monthlyTax = Array.from(monthlyTaxMap.entries()).map(([key, val]) => ({
      month: getMonthLabel(key + "-01"),
      tax: Math.round(val * 100) / 100,
    }));

    return {
      rate: settings.taxRate,
      totalTaxable,
      totalTax,
      monthlyTax,
    };
  }, [yearInvoices, selectedYear, settings]);

  // Aging chart data
  const agingChartData = Object.entries(receivables.bucketSums).map(([bucket, amount]) => ({
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
    exportCSV(
      `حساب_الأرباح_والخسائر_${selectedYear}`,
      ["البند المحاسبي", "المبلغ"],
      [
        ["إجمالي المبيعات", String(pnl.grossRevenue)],
        ["الخصومات", `-${pnl.totalDiscount}`],
        ["صافي المبيعات المحصلة", String(pnl.netRevenue)],
        ["تكلفة البضاعة المباعة (COGS)", `-${pnl.cogs}`],
        ["الأرباح التشغيلية الصافية", String(pnl.grossProfit)],
        ["هامش الربح", `${pnl.profitMargin.toFixed(2)}%`],
      ]
    );
    toast.success("تم تصدير الحساب كـ CSV");
  }

  const kpis = [
    {
      label: "الأرباح الصافية",
      value: formatCurrency(pnl.grossProfit),
      icon: DollarSign,
      color: "bg-emerald-50 text-emerald-600 border border-emerald-100",
    },
    {
      label: "إجمالي المبيعات",
      value: formatCurrency(pnl.netRevenue),
      icon: TrendingUp,
      color: "bg-indigo-50 text-indigo-600 border border-indigo-100",
    },
    {
      label: "المستحقات المعلقة",
      value: formatCurrency(receivables.totalReceivable),
      icon: Clock,
      color: "bg-amber-50 text-amber-600 border border-amber-100",
    },
  ];

  function shareWhatsApp() {
    const lines = [
      `*${settings.businessName}*`,
      `📊 *الملخص والتقرير المالي السنوي (${selectedYear})*`,
      `----------------------------------------`,
      `⚙️ *قائمة الأرباح والخسائر:*`,
      `  • صافي المبيعات: ${settings.currencySymbol}${pnl.netRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      `  • التكلفة التقديرية (COGS): ${settings.currencySymbol}${pnl.cogs.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      `  • الأرباح الصافية: ${settings.currencySymbol}${pnl.grossProfit.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      `  • هامش الربح الإجمالي: ${pnl.profitMargin.toFixed(1)}%`,
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
    <ResponsiveShell>
      <div className="space-y-6">
        {/* Banner header widget */}
        <div className="relative overflow-hidden rounded-3xl bg-[var(--surface-1)] border border-[var(--border-default)] p-6 shadow-sm">
          {/* Subtle CMYK theme glows in background */}
          <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-cyan-400/10 blur-[60px]" />
          <div className="absolute left-10 -bottom-20 h-40 w-40 rounded-full bg-pink-400/10 blur-[60px]" />
          
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-[var(--text-primary)] leading-tight">المحاسبة</h1>
              <p className="text-[13px] text-[var(--text-muted)] mt-1.5 font-medium">قائمة الأرباح والخسائر والمستحقات والضرائب المترتبة</p>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
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
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1.5 h-9 rounded-xl border-[var(--border-default)] hover:bg-[var(--surface-2)] text-[13px] font-bold" 
                onClick={() => {
                  toast.promise(shareAsImage('pnl-statement-card', `تقرير_الأرباح_والخسائر_${selectedYear}`), {
                    loading: 'جاري تصدير التقرير كصورة...',
                    success: 'تم تصدير الصورة بنجاح',
                    error: 'فشل تصدير الصورة'
                  });
                }}
              >
                <ImageIcon className="h-4.5 w-4.5 text-cyan-600" />
                <span>حفظ كصورة</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1.5 h-9 rounded-xl border-[var(--border-default)] hover:bg-[var(--surface-2)] text-[13px] font-bold" 
                onClick={shareWhatsApp}
              >
                <MessageCircle className="h-4.5 w-4.5 text-emerald-600" />
                <span>مشاركة واتساب</span>
              </Button>
              <Link href="/invoices">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-1.5 h-9 rounded-xl border-[var(--border-default)] hover:bg-[var(--surface-2)] text-[13px] font-bold text-indigo-700" 
                >
                  <Pencil className="h-4.5 w-4.5" />
                  <span>تعديل الفواتير</span>
                </Button>
              </Link>
              <Select value={selectedYear} onValueChange={(v) => v && setSelectedYear(v)}>
                <SelectTrigger className="w-[120px] h-9 rounded-xl border-[var(--border-default)] bg-[var(--surface-1)] text-[13px] font-bold">
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
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {kpis.map((kpi) => (
            <div 
              key={kpi.label} 
              className="m3-card bg-[var(--surface-1)] p-5 flex flex-col items-center hover-lift transition-all duration-300"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${kpi.color} shadow-sm`}>
                <kpi.icon className="h-6 w-6" />
              </div>
              <p className="mt-3 text-[12px] font-bold text-[var(--text-muted)]">{kpi.label}</p>
              <p className="mt-1 text-lg font-black text-[var(--text-primary)] font-mono">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* P&L Statement */}
        <div id="pnl-statement-card" className="m3-card bg-[var(--surface-1)] p-6">
          <div className="flex items-center justify-between mb-5 border-b border-[var(--border-default)] pb-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-[var(--brand-primary)]" />
              <h2 className="text-[15px] font-black text-[var(--text-primary)]">قائمة الأرباح والخسائر — {selectedYear}</h2>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1.5 h-8.5 rounded-xl border-[var(--border-default)] hover:bg-[var(--surface-2)] text-[12px] font-bold" 
              onClick={handleExportPnL}
            >
              <Download className="h-4 w-4" />
              <span>تصدير CSV</span>
            </Button>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-[var(--surface-2)] px-4 py-3 border border-[var(--border-default)]">
              <span className="text-[13px] font-bold text-[var(--text-secondary)]">إجمالي الإيرادات (قبل الخصم)</span>
              <span className="text-[15px] font-black text-[var(--text-primary)] font-mono">{formatCurrency(pnl.grossRevenue)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2 text-[13px]">
              <span className="text-[var(--text-muted)] font-medium">(-) إجمالي الخصومات</span>
              <span className="font-bold text-red-600 font-mono">-{formatCurrency(pnl.totalDiscount)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-indigo-50/40 px-4 py-3 border border-indigo-100">
              <span className="text-[13px] font-bold text-[var(--brand-primary)]">صافي الإيرادات</span>
              <span className="text-[16px] font-black text-[var(--brand-primary)] font-mono">{formatCurrency(pnl.netRevenue)}</span>
            </div>

            <div className="my-2 h-px bg-[var(--border-default)]" />
            <div className="flex items-center justify-between px-4 py-2 text-[13px]">
              <span className="text-[var(--text-muted)] font-medium">(-) تكلفة البضاعة المباعة (المواد الأولية والأحبار)</span>
              <span className="font-bold text-red-600 font-mono">-{formatCurrency(pnl.cogs)}</span>
            </div>
            
            <div className="flex items-center justify-between rounded-xl bg-emerald-50/50 px-4 py-3 border border-emerald-100">
              <span className="text-[13px] font-bold text-emerald-700">إجمالي الربح</span>
              <span className="text-[16px] font-black text-emerald-700 font-mono">{formatCurrency(pnl.grossProfit)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2 text-[13px]">
              <span className="text-[var(--text-secondary)] font-medium">هامش الربح التشغيلي</span>
              <span className="font-black text-emerald-600 font-mono">{pnl.profitMargin.toFixed(1)}%</span>
            </div>

            {settings.taxEnabled && (
              <>
                <div className="my-2 h-px bg-[var(--border-default)]" />
                <div className="flex items-center justify-between px-4 py-2 text-[13px]">
                  <span className="text-[var(--text-muted)] font-medium">(-) الضريبة المستحقة ({settings.taxRate}%)</span>
                  <span className="font-bold text-red-600 font-mono">-{formatCurrency(pnl.taxAmount)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-emerald-50/70 px-4 py-3 border border-emerald-200">
                  <span className="text-[13px] font-bold text-emerald-800">صافي الربح بعد الضريبة</span>
                  <span className="text-[16px] font-black text-emerald-800 font-mono">{formatCurrency(pnl.grossProfit - pnl.taxAmount)}</span>
                </div>
              </>
            )}
            <div className="mt-3 text-[11px] text-[var(--text-muted)] text-center font-medium">
              تم الاحتساب بناءً على {pnl.invoiceCount} فاتورة مدفوعة ومصدرة في {selectedYear}
            </div>
          </div>
        </div>

        {/* Monthly Revenue Trend */}
        <div className="m3-card bg-[var(--surface-1)] p-6">
          <h2 className="text-[15px] font-black text-[var(--text-primary)] mb-5">الإيرادات والخصومات الشهرية</h2>
          <div className="h-[300px]" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyMetrics} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: "bold" }} />
                <YAxis tick={{ fontSize: 11, fontWeight: "bold" }} />
                <Tooltip
                  formatter={(value, name) => {
                    const labels: Record<string, string> = { revenue: "الإيرادات", discount: "الخصومات", tax: "الضريبة" };
                    return [formatCurrency(Number(value)), labels[String(name)] || String(name)];
                  }}
                  contentStyle={{ fontFamily: "IBM Plex Sans Arabic", direction: "rtl", borderRadius: "12px" }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#4F46E5" strokeWidth={2.5} dot={{ r: 4 }} name="revenue" />
                <Line type="monotone" dataKey="discount" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="discount" />
                {settings.taxEnabled && (
                  <Line type="monotone" dataKey="tax" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} name="tax" />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Accounts Receivable */}
        <div className="m3-card bg-[var(--surface-1)] p-6">
          <div className="flex items-center justify-between mb-5 border-b border-[var(--border-default)] pb-4">
            <div className="flex items-center gap-2.5">
              <CreditCard className="h-5 w-5 text-amber-600" />
              <h2 className="text-[15px] font-black text-[var(--text-primary)]">المستحقات (فواتير غير مدفوعة)</h2>
              <span className="inline-flex items-center justify-center rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 text-[10px] font-black font-mono">
                {receivables.unpaid.length} فاتورة معلقة
              </span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1.5 h-8.5 rounded-xl border-[var(--border-default)] hover:bg-[var(--surface-2)] text-[12px] font-bold" 
              onClick={handleExportReceivables}
            >
              <Download className="h-4 w-4" />
              <span>تصدير المستحقات</span>
            </Button>
          </div>

          {/* Aging Summary Grid */}
          <div className="grid gap-3 sm:grid-cols-4 mb-6">
            {Object.entries(receivables.bucketSums).map(([bucket, amount]) => (
              <div 
                key={bucket} 
                className={`rounded-2xl p-4 text-center border ${
                  bucket === "أكثر من 90 يوماً" ? "bg-red-50/60 border-red-100 text-red-800" :
                  bucket === "61-90 يوماً" ? "bg-amber-50/60 border-amber-100 text-amber-800" :
                  "bg-[var(--surface-2)] border-[var(--border-default)] text-[var(--text-primary)]"
                }`}
              >
                <p className="text-[11px] font-bold text-[var(--text-muted)]">{bucket}</p>
                <p className="mt-1 text-base font-black font-mono">{formatCurrency(amount)}</p>
              </div>
            ))}
          </div>

          {/* Aging Bar Chart */}
          {receivables.unpaid.length > 0 && (
            <div className="h-[200px] mb-6 border-b border-[var(--border-default)] pb-4" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agingChartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11, fontWeight: "bold" }} />
                  <YAxis tick={{ fontSize: 11, fontWeight: "bold" }} />
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), "المبلغ"]} />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {agingChartData.map((entry, i) => {
                      const colors = ["#4F46E5", "#EAB308", "#EF4444", "#DC2626"];
                      return <rect key={i} fill={colors[i]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Receivables Table */}
          {receivables.unpaid.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-[var(--surface-2)] border-b border-[var(--border-default)] text-[12px] font-bold text-[var(--text-muted)]">
                    <th className="p-3">رقم الفاتورة</th>
                    <th className="p-3">العميل</th>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">المبلغ</th>
                    <th className="p-3">أيام التأخر</th>
                    <th className="p-3">الفترة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)] text-[13px]">
                  {receivables.unpaid.slice(0, 15).map((inv) => (
                    <tr key={inv.id} className="hover:bg-[var(--surface-2)]/30 transition-colors">
                      <td className="p-3">
                        <Link href={`/invoices/${inv.id}`} className="font-bold text-[var(--brand-primary)] hover:underline">
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="p-3 font-medium text-[var(--text-primary)]">{inv.clientName}</td>
                      <td className="p-3 text-[var(--text-muted)] font-mono">{inv.createdAt}</td>
                      <td className="p-3 font-black font-mono text-[var(--text-primary)]">{formatCurrency(inv.total)}</td>
                      <td className="p-3">
                        <span className={`font-bold ${inv.daysOverdue > 90 ? "text-red-600" : inv.daysOverdue > 60 ? "text-amber-600" : "text-[var(--text-primary)]"}`}>
                          {inv.daysOverdue} يوم
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          inv.agingBucket === "+90 يوم" ? "bg-red-50 text-red-700" :
                          inv.agingBucket === "61-90 يوم" ? "bg-amber-50 text-amber-700" :
                          "bg-slate-100 text-slate-700"
                        }`}>
                          {inv.agingBucket}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {receivables.unpaid.length > 15 && (
                <p className="mt-3.5 text-center text-xs text-[var(--text-muted)] font-medium">
                  +{receivables.unpaid.length - 15} فواتير معلقة أخرى
                </p>
              )}
            </div>
          ) : (
            <div className="py-10 text-center text-[var(--text-muted)]">
              <DollarSign className="mx-auto mb-3 h-10 w-10 opacity-20" />
              <p className="text-sm font-medium">ممتاز! لا توجد فواتير معلقة الدفع حالياً</p>
            </div>
          )}
        </div>

        {/* Client Balances */}
        {clientBalances.length > 0 && (
          <div className="m3-card bg-[var(--surface-1)] p-6">
            <div className="flex items-center gap-2 mb-5">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <h2 className="text-[15px] font-black text-[var(--text-primary)]">أرصدة العملاء المستحقة</h2>
            </div>
            
            <div className="space-y-4">
              {clientBalances.slice(0, 8).map((c, i) => {
                const maxVal = clientBalances[0].unpaid;
                return (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-bold text-[var(--text-primary)]">{c.name}</span>
                      <div className="flex gap-4 font-mono font-bold">
                        <span className="text-[var(--text-muted)]">مدفوع: {formatCurrency(c.paid)}</span>
                        <span className="text-amber-600">مستحق: {formatCurrency(c.unpaid)}</span>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)] border border-[var(--border-default)]">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all duration-500"
                        style={{ width: `${(c.unpaid / maxVal) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tax Summary */}
        {taxSummary && (
          <div className="m3-card bg-[var(--surface-1)] p-6">
            <div className="flex items-center gap-2 mb-5 border-b border-[var(--border-default)] pb-4">
              <Calculator className="h-5 w-5 text-violet-600" />
              <h2 className="text-[15px] font-black text-[var(--text-primary)]">ملخص الضرائب — {selectedYear}</h2>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-3 mb-6">
              <div className="rounded-2xl bg-[var(--surface-2)] p-4 text-center border border-[var(--border-default)]">
                <p className="text-[11px] font-bold text-[var(--text-muted)]">نسبة الضريبة الافتراضية</p>
                <p className="mt-1 text-2xl font-black text-[var(--text-primary)] font-mono">{taxSummary.rate}%</p>
              </div>
              <div className="rounded-2xl bg-[var(--surface-2)] p-4 text-center border border-[var(--border-default)]">
                <p className="text-[11px] font-bold text-[var(--text-muted)]">الإيرادات الخاضعة للضريبة</p>
                <p className="mt-1 text-lg font-black text-[var(--text-primary)] font-mono">{formatCurrency(taxSummary.totalTaxable)}</p>
              </div>
              <div className="rounded-2xl bg-violet-50/50 p-4 text-center border border-violet-100">
                <p className="text-[11px] font-bold text-violet-700">إجمالي الضريبة المستحقة</p>
                <p className="mt-1 text-lg font-black text-violet-700 font-mono">{formatCurrency(taxSummary.totalTax)}</p>
              </div>
            </div>
            
            <div className="h-[220px]" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={taxSummary.monthlyTax} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: "bold" }} />
                  <YAxis tick={{ fontSize: 11, fontWeight: "bold" }} />
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), "الضريبة"]} />
                  <Bar dataKey="tax" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </ResponsiveShell>
  );
}
