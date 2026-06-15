"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/data";
import { exportCSV } from "@/lib/export";
import { toast } from "sonner";
import { DateRangeExportButton, type DateRange } from "@/components/date-range-picker";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { 
  Wallet, TrendingUp, Calculator, Clock, Receipt, TrendingDown, 
  Download, MessageCircle, AlertCircle, ChevronDown, CheckCircle2, User
} from "lucide-react";

function getMonthLabel(dateStr: string) {
  const [y, m] = dateStr.split("-");
  const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  return `${months[parseInt(m) - 1]} ${y}`;
}

function daysBetween(d1: string, d2: string) {
  return Math.floor((new Date(d2).getTime() - new Date(d1).getTime()) / 86400000);
}

export default function AccountingPage() {
  const { invoices, products, settings, clients, connectionStatus } = useStore();
  const currentYear = new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = useMemo(() => [
    { id: 'overview', label: 'الأرباح والخسائر' },
    { id: 'receivables', label: 'المستحقات والأرصدة' },
    ...(settings.taxEnabled ? [{ id: 'tax', label: 'الضريبة' }] : [])
  ], [settings.taxEnabled]);

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

  // PROFIT & LOSS STATEMENT
  const pnl = useMemo(() => {
    const paid = yearInvoices.filter((i) => i.status === "مدفوعة");
    const grossRevenue = paid.reduce((s, i) => s + i.subtotal, 0);
    const totalDiscount = paid.reduce((s, i) => s + i.discountAmount, 0);
    const taxAmount = paid.reduce((s, i) => s + (i.taxAmount ?? 0), 0);
    const netRevenue = paid.reduce((s, i) => s + i.total, 0);
    const revenueAfterTax = netRevenue - taxAmount;

    const cogs = paid.reduce((s, inv) => {
      const items = Array.isArray(inv.items) ? inv.items : [];
      return s + items.reduce((itemSum, item) => {
        const costPrice = item.isTemporary ? (item.costPrice ?? 0) : (products.find(p => p.id === item.productId)?.price ?? 0);
        return itemSum + (costPrice * item.quantity);
      }, 0);
    }, 0);

    const grossProfit = netRevenue - cogs;
    const profitMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

    return { grossRevenue, totalDiscount, netRevenue, taxAmount, revenueAfterTax, cogs, grossProfit, profitMargin, invoiceCount: paid.length };
  }, [yearInvoices, products, settings]);

  // ACCOUNTS RECEIVABLE (Unpaid Invoices with Aging)
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

  // CLIENT BALANCES
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

  // MONTHLY FINANCIAL METRICS
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

  // TAX SUMMARY
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
      ["تكلفة البضاعة المباعة", String(pnl.cogs)],
      ["إجمالي الربح", String(pnl.grossProfit)],
      ["هامش الربح %", `${pnl.profitMargin.toFixed(1)}%`],
      ...(settings.taxEnabled ? [["الضريبة المستحقة", String(pnl.taxAmount)]] : []),
      ...(settings.taxEnabled ? [["صافي الربح بعد الضريبة", String(pnl.grossProfit - pnl.taxAmount)]] : []),
    ]);
    toast.success("تم تصدير قائمة الأرباح");
  }

  const kpis = [
    { label: "صافي الإيرادات", value: formatCurrency(pnl.netRevenue), icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { label: "إجمالي الربح", value: formatCurrency(pnl.grossProfit), icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
    { label: "هامش الربح", value: `${pnl.profitMargin.toFixed(1)}%`, icon: Calculator, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    { label: "المستحقات المتأخرة", value: formatCurrency(receivables.totalReceivable), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
    { label: "تكلفة البضاعة", value: formatCurrency(pnl.cogs), icon: Receipt, color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-300' },
    { label: "الخصومات", value: formatCurrency(pnl.totalDiscount), icon: TrendingDown, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
  ];

  function shareWhatsApp() {
    const lines = [
      `💰 *التقرير المحاسبي - ${settings.businessName}*`,
      `📅 التاريخ: ${new Date().toLocaleDateString("en-GB")}`,
      `📆 السنة: ${selectedYear}`,
      "",
      `📊 *قائمة الأرباح والخسائر:*`,
      `  • إجمالي الإيرادات: ${settings.currencySymbol}${pnl.grossRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      `  • الخصومات: -${settings.currencySymbol}${pnl.totalDiscount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      `  • صافي الإيرادات: ${settings.currencySymbol}${pnl.netRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      `  • تكلفة البضاعة: -${settings.currencySymbol}${pnl.cogs.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      `  • ✅ إجمالي الربح: ${settings.currencySymbol}${pnl.grossProfit.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      `  • 📈 هامش الربح: ${pnl.profitMargin.toFixed(1)}%`,
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

  if (connectionStatus === 'loading') {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-32 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/30 min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="w-16 h-16 rounded-3xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 mb-6">
              <Calculator className="size-8" />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">المحاسبة</h1>
            <p className="mt-2 text-base font-medium text-slate-500 max-w-lg leading-relaxed">
              قائمة الأرباح والخسائر، المستحقات، والتقارير المالية المفصلة.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
                className="w-full md:w-32 appearance-none h-14 px-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <ChevronDown className="size-4 text-slate-400" />
              </div>
            </div>

            <DateRangeExportButton
              label="تقرير PDF"
              className="flex-1 md:flex-none h-14 px-6 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2"
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
            
            <button
              className="w-full md:w-auto h-14 px-6 rounded-2xl bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 font-bold hover:bg-[#25D366]/20 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2"
              onClick={shareWhatsApp}
            >
              <MessageCircle className="size-5" />
              <span>واتساب</span>
            </button>
          </div>
        </div>

        {/* Animated Tabs */}
        <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit overflow-x-auto hide-scrollbar border border-slate-200/50 shadow-inner">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-8 py-3 rounded-xl text-sm font-bold transition-colors whitespace-nowrap ${activeTab === tab.id ? 'text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="accounting-tabs"
                  className="absolute inset-0 bg-white rounded-xl shadow-sm border border-slate-200/50"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-8"
        >
          {activeTab === "overview" && (
            <>
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {kpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <div key={idx} className="bg-white rounded-[2rem] p-6 border border-slate-200/60 shadow-sm flex flex-col items-center text-center hover:border-indigo-200 hover:shadow-md transition-all group">
                <div className={`w-14 h-14 rounded-2xl ${kpi.bg} ${kpi.color} flex items-center justify-center shrink-0 mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="size-6" />
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{kpi.label}</p>
                <p className="text-2xl font-black text-slate-900 tracking-tight font-mono">{kpi.value}</p>
              </div>
            );
          })}
        </div>

        {/* P&L Statement */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Wallet className="size-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">قائمة الأرباح والخسائر</h2>
                <p className="text-sm font-bold text-slate-500">للعام {selectedYear}</p>
              </div>
            </div>
            <button
              onClick={handleExportPnL}
              className="h-10 px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 transition-colors flex items-center gap-2 text-sm"
            >
              <Download className="size-4" />
              <span>تصدير CSV</span>
            </button>
          </div>
          <div className="p-6 sm:p-8">
            <div className="space-y-3 max-w-3xl mx-auto">
              
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="font-bold text-slate-700">إجمالي الإيرادات (قبل الخصم)</span>
                <span className="font-black font-mono text-lg text-slate-900">{formatCurrency(pnl.grossRevenue)}</span>
              </div>

              <div className="flex justify-between items-center p-4 rounded-2xl">
                <span className="font-bold text-slate-500">(-) إجمالي الخصومات</span>
                <span className="font-black font-mono text-base text-rose-500">-{formatCurrency(pnl.totalDiscount)}</span>
              </div>

              <div className="flex justify-between items-center p-5 bg-indigo-50 border border-indigo-100 rounded-2xl shadow-sm">
                <span className="font-black text-indigo-700">صافي الإيرادات</span>
                <span className="font-black font-mono text-2xl text-indigo-700">{formatCurrency(pnl.netRevenue)}</span>
              </div>

              <div className="h-px bg-slate-100 my-4" />

              <div className="flex justify-between items-center p-4 rounded-2xl">
                <span className="font-bold text-slate-500">(-) تكلفة البضاعة المباعة</span>
                <span className="font-black font-mono text-base text-rose-500">-{formatCurrency(pnl.cogs)}</span>
              </div>

              <div className="flex justify-between items-center p-5 bg-emerald-50 border border-emerald-100 rounded-2xl shadow-sm">
                <span className="font-black text-emerald-700">إجمالي الربح</span>
                <span className="font-black font-mono text-2xl text-emerald-700">{formatCurrency(pnl.grossProfit)}</span>
              </div>

              <div className="flex justify-between items-center p-4 bg-emerald-50/50 rounded-2xl">
                <span className="font-bold text-emerald-600">هامش الربح</span>
                <span className="font-black font-mono text-lg text-emerald-600">{pnl.profitMargin.toFixed(1)}%</span>
              </div>

              {settings.taxEnabled && (
                <>
                  <div className="h-px bg-slate-100 my-4" />
                  <div className="flex justify-between items-center p-4 rounded-2xl">
                    <span className="font-bold text-slate-500">(-) الضريبة ({settings.taxRate}%)</span>
                    <span className="font-black font-mono text-base text-rose-500">-{formatCurrency(pnl.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center p-5 bg-emerald-50 border border-emerald-100 rounded-2xl shadow-sm">
                    <span className="font-black text-emerald-800">صافي الربح بعد الضريبة</span>
                    <span className="font-black font-mono text-2xl text-emerald-800">{formatCurrency(pnl.grossProfit - pnl.taxAmount)}</span>
                  </div>
                </>
              )}

              <p className="text-center text-xs font-bold text-slate-400 mt-6 pt-4 border-t border-slate-100">
                بناءً على {pnl.invoiceCount} فاتورة مدفوعة في {selectedYear}
              </p>
            </div>
          </div>
        </div>

        {/* Monthly Revenue Trend */}
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-200/60 shadow-sm">
          <h2 className="text-xl font-black text-slate-900 mb-6">الإيرادات والخصومات الشهرية</h2>
          <div className="h-[350px]" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyMetrics} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} dx={-10} />
                <Tooltip
                  formatter={(value, name) => {
                    const labels: Record<string, string> = { revenue: "الإيرادات", discount: "الخصومات", tax: "الضريبة" };
                    return [formatCurrency(Number(value)), labels[String(name)] || String(name)];
                  }}
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontWeight: 700, padding: '12px' }}
                  itemStyle={{ padding: '4px 0' }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} name="revenue" />
                <Line type="monotone" dataKey="discount" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3, fill: '#f43f5e', strokeWidth: 2, stroke: '#fff' }} name="discount" />
                {settings.taxEnabled && (
                  <Line type="monotone" dataKey="tax" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }} name="tax" />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
            </>
          )}

          {activeTab === "receivables" && (
            <>
        {/* Accounts Receivable */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertCircle className="size-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">المستحقات (الفواتير غير المدفوعة)</h2>
                <span className="inline-block mt-1 bg-amber-100 text-amber-700 text-xs font-black px-2.5 py-1 rounded-md">
                  {receivables.unpaid.length} فاتورة
                </span>
              </div>
            </div>
            <button
              onClick={handleExportReceivables}
              className="h-10 px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 transition-colors flex items-center gap-2 text-sm"
            >
              <Download className="size-4" />
              <span>تصدير CSV</span>
            </button>
          </div>
          <div className="p-6 sm:p-8">
            {/* Aging Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {Object.entries(receivables.aging).map(([bucket, amount]) => {
                const isCritical = bucket === '+90 يوم';
                const isWarning = bucket === '61-90 يوم';
                const bg = isCritical ? 'bg-rose-50 border-rose-200' : isWarning ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200';
                const text = isCritical ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-slate-700';
                return (
                  <div key={bucket} className={`p-4 text-center rounded-2xl border ${bg} transition-all`}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{bucket}</p>
                    <p className={`text-xl font-black font-mono tracking-tight ${text}`}>
                      {formatCurrency(amount)}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Aging Bar Chart */}
            {receivables.unpaid.length > 0 && (
              <div className="h-[250px] mb-8" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agingChartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="bucket" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(Number(value)), "المبلغ"]} 
                      contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontWeight: 700 }}
                    />
                    <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                      {agingChartData.map((entry, i) => {
                        const colors = ["#4f46e5", "#f59e0b", "#ef4444", "#991b1b"];
                        return <rect key={i} fill={colors[i]} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Receivables Table */}
            {receivables.unpaid.length > 0 ? (
              <div className="overflow-x-auto rounded-[1.5rem] border border-slate-200">
                <table className="w-full text-right text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50/80 backdrop-blur-md border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider shadow-sm">
                    <tr>
                      <th className="px-6 py-4 rounded-tr-[1.5rem]">رقم الفاتورة</th>
                      <th className="px-6 py-4">العميل</th>
                      <th className="px-6 py-4">التاريخ</th>
                      <th className="px-6 py-4">المبلغ</th>
                      <th className="px-6 py-4 text-center">التأخير</th>
                      <th className="px-6 py-4 text-center rounded-tl-[1.5rem]">الفترة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {receivables.unpaid.slice(0, 20).map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <Link href={`/invoices/${inv.id}`} className="font-black font-mono text-indigo-600 hover:text-indigo-800 transition-colors">
                            {inv.invoiceNumber}
                          </Link>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800">{inv.clientName}</td>
                        <td className="px-6 py-4 font-bold text-slate-500 font-mono text-xs">{inv.createdAt}</td>
                        <td className="px-6 py-4 font-black font-mono text-slate-900">{formatCurrency(inv.total)}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`font-black ${inv.daysOverdue > 90 ? 'text-rose-600' : inv.daysOverdue > 60 ? 'text-amber-600' : 'text-slate-700'}`}>
                            {inv.daysOverdue} يوم
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block px-3 py-1 rounded-lg text-xs font-black border ${
                            inv.agingBucket === '+90 يوم' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                            inv.agingBucket === '61-90 يوم' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                            'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {inv.agingBucket}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-[2rem]">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="size-8 text-emerald-400" />
                </div>
                <h3 className="text-lg font-black text-slate-900">كل شيء على ما يرام!</h3>
                <p className="text-sm font-bold text-slate-500 mt-1">لا توجد فواتير غير مدفوعة حالياً.</p>
              </div>
            )}
            {receivables.unpaid.length > 20 && (
              <p className="text-center text-sm font-bold text-slate-400 mt-4">
                +{receivables.unpaid.length - 20} فواتير أخرى
              </p>
            )}
          </div>
        </div>

        {/* Client Balances */}
        {clientBalances.length > 0 && (
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-200/60 shadow-sm">
            <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                <User className="size-5 text-slate-600" />
              </div>
              أرصدة العملاء المستحقة
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {clientBalances.slice(0, 10).map((c, i) => {
                const maxVal = clientBalances[0].unpaid;
                const percent = (c.unpaid / maxVal) * 100;
                return (
                  <div key={i} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold text-slate-900">{c.name}</span>
                      <div className="flex gap-4">
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">مستحق</p>
                          <p className="font-black font-mono text-amber-600">{formatCurrency(c.unpaid)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">مدفوع</p>
                          <p className="font-bold font-mono text-slate-500">{formatCurrency(c.paid)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
            </>
          )}

          {activeTab === "tax" && (
            <>
        {/* Tax Summary */}
        {taxSummary && (
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-200/60 shadow-sm">
            <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-fuchsia-50 flex items-center justify-center">
                <Receipt className="size-5 text-fuchsia-600" />
              </div>
              ملخص الضريبة للعام {selectedYear}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 text-center">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">نسبة الضريبة</p>
                <p className="text-3xl font-black text-slate-900">{taxSummary.rate}%</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 text-center">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">الإيرادات الخاضعة</p>
                <p className="text-2xl font-black font-mono text-slate-900 mt-1">{formatCurrency(taxSummary.totalTaxable)}</p>
              </div>
              <div className="bg-fuchsia-50 rounded-2xl p-5 border border-fuchsia-200 text-center">
                <p className="text-xs font-black text-fuchsia-600 uppercase tracking-widest mb-1">إجمالي الضريبة</p>
                <p className="text-2xl font-black font-mono text-fuchsia-700 mt-1">{formatCurrency(taxSummary.totalTax)}</p>
              </div>
            </div>
            
            <div className="h-[250px]" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={taxSummary.monthlyTax} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(Number(value)), "الضريبة"]}
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontWeight: 700 }}
                  />
                  <Bar dataKey="tax" fill="#c026d3" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
            </>
          )}
        </motion.div>

      </div>
    </div>
  );
}
