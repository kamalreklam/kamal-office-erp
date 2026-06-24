"use client";

import { useMemo, useState } from "react";
import { ResponsiveShell } from "@/components/responsive-shell";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { MobileReports } from "@/components/mobile/mobile-reports";
import { MobileShell } from "@/components/mobile/mobile-shell";
import { Card, CardContent } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/data";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, TrendingDown, Users, Package, FileText, DollarSign, BarChart3, MessageCircle, Pencil, ImageIcon,
  ChevronDown, ChevronUp, CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { DateRangeExportButton, type DateRange } from "@/components/date-range-picker";
import { shareAsImage } from "@/lib/share";
import Link from "next/link";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";

const COLORS = [
  "oklch(0.60 0.16 235)", // primary sky
  "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
];

function getMonthLabel(dateStr: string) {
  const [y, m] = dateStr.split("-");
  const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  return `${months[parseInt(m) - 1]} ${y}`;
}

function getMonthKey(dateStr: string) {
  return dateStr.slice(0, 7); // "2025-11"
}

export default function ReportsPage() {
  const isMobile = useIsMobile();
  if (isMobile) return <MobileShell><MobileReports /></MobileShell>;
  return <DesktopReports />;
}
function DailyClosingSection() {
  const { invoices, payments, settings } = useStore();
  const [open, setOpen] = useState(true);
  const today = new Date().toISOString().split("T")[0];

  const todayInvoices = useMemo(
    () => invoices.filter((i) => i.createdAt.startsWith(today)),
    [invoices, today]
  );

  const todayPayments = useMemo(
    () => payments.filter((p) => p.createdAt.startsWith(today)),
    [payments, today]
  );

  const cashRevenue = todayPayments
    .filter((p) => p.method === "نقدي")
    .reduce((s, p) => s + p.amount, 0);

  const transferRevenue = todayPayments
    .filter((p) => p.method === "حوالة")
    .reduce((s, p) => s + p.amount, 0);

  const totalRevenue = todayPayments.reduce((s, p) => s + p.amount, 0);

  const pendingCount = todayInvoices.filter((i) => i.status === "غير مدفوعة").length;

  return (
    <div className="m3-card bg-[var(--surface-1)] border border-[var(--border-default)] overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-[var(--surface-2)] transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-[var(--brand-primary)]" />
          <span className="text-[15px] font-black text-[var(--text-primary)]">إغلاق اليوم</span>
          <span className="text-[12px] text-[var(--text-muted)] font-medium">{today}</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-[var(--text-muted)]" /> : <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />}
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-5">
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="rounded-2xl bg-[var(--surface-2)] p-4 text-center">
              <p className="text-[11px] font-bold text-[var(--text-muted)]">مبيعات اليوم</p>
              <p className="text-xl font-black text-[var(--text-primary)] font-mono mt-1">{todayInvoices.length} فاتورة</p>
            </div>
            <div className="rounded-2xl bg-emerald-50/70 p-4 text-center">
              <p className="text-[11px] font-bold text-emerald-700">الإيرادات النقدية</p>
              <p className="text-xl font-black text-emerald-700 font-mono mt-1">{formatCurrency(cashRevenue, settings.currencySymbol)}</p>
            </div>
            <div className="rounded-2xl bg-sky-50/70 p-4 text-center">
              <p className="text-[11px] font-bold text-sky-700">الإيرادات بالحوالة</p>
              <p className="text-xl font-black text-sky-700 font-mono mt-1">{formatCurrency(transferRevenue, settings.currencySymbol)}</p>
            </div>
            <div className="rounded-2xl bg-amber-50/70 p-4 text-center">
              <p className="text-[11px] font-bold text-amber-700">فواتير معلقة</p>
              <p className="text-xl font-black text-amber-700 font-mono mt-1">{pendingCount}</p>
            </div>
            <div className="rounded-2xl bg-violet-50/70 p-4 text-center">
              <p className="text-[11px] font-bold text-violet-700">إجمالي اليوم</p>
              <p className="text-xl font-black text-violet-700 font-mono mt-1">{formatCurrency(totalRevenue, settings.currencySymbol)}</p>
            </div>
          </div>

          {/* Today's invoices table */}
          {todayInvoices.length === 0 ? (
            <p className="text-center text-sm text-[var(--text-muted)] py-4">لا توجد فواتير اليوم</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--border-default)]">
              <table className="w-full text-[13px]">
                <thead className="bg-[var(--surface-2)]">
                  <tr>
                    <th className="px-4 py-2.5 text-right font-bold text-[var(--text-muted)]">رقم الفاتورة</th>
                    <th className="px-4 py-2.5 text-right font-bold text-[var(--text-muted)]">العميل</th>
                    <th className="px-4 py-2.5 text-right font-bold text-[var(--text-muted)]">الإجمالي</th>
                    <th className="px-4 py-2.5 text-right font-bold text-[var(--text-muted)]">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {todayInvoices.map((inv) => (
                    <tr key={inv.id} className="border-t border-[var(--border-default)] hover:bg-[var(--surface-2)]/40">
                      <td className="px-4 py-2.5 font-mono font-bold text-[var(--brand-primary)]">{inv.invoiceNumber}</td>
                      <td className="px-4 py-2.5 text-[var(--text-primary)]">{inv.clientName}</td>
                      <td className="px-4 py-2.5 font-mono font-bold">{formatCurrency(inv.total, settings.currencySymbol)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          inv.status === "مدفوعة" ? "bg-emerald-100 text-emerald-700" :
                          inv.status === "غير مدفوعة" ? "bg-amber-100 text-amber-700" :
                          inv.status === "مدفوعة جزئياً" ? "bg-blue-100 text-blue-700" :
                          inv.status === "ملغاة" ? "bg-rose-100 text-rose-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>{inv.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-9 rounded-xl border-[var(--border-default)] text-[13px] font-bold"
              onClick={() => window.print()}
            >
              <span>🖨 طباعة إغلاق اليوم</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DesktopReports() {
  const { invoices, clients, products, orders, settings } = useStore();
  const currentYear = new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Available years from invoices
  const years = useMemo(() => {
    const yrs = new Set(invoices.map((i) => i.createdAt.slice(0, 4)));
    yrs.add(currentYear);
    return Array.from(yrs).sort().reverse();
  }, [invoices, currentYear]);

  const yearInvoices = useMemo(
    () => invoices.filter((i) => i.createdAt.startsWith(selectedYear)),
    [invoices, selectedYear]
  );

  // ---- KPI Cards ----
  const totalRevenue = yearInvoices.filter((i) => i.status === "مدفوعة").reduce((s, i) => s + i.total, 0);
  const totalUnpaid = yearInvoices.filter((i) => i.status === "غير مدفوعة").reduce((s, i) => s + i.total, 0);
  const invoiceCount = yearInvoices.length;
  const paidCount = yearInvoices.filter((i) => i.status === "مدفوعة").length;
  const avgInvoice = paidCount > 0 ? totalRevenue / paidCount : 0;

  // ---- Monthly Revenue Chart ----
  const monthlyData = useMemo(() => {
    const map = new Map<string, { revenue: number; count: number; unpaid: number }>();
    for (let m = 1; m <= 12; m++) {
      const key = `${selectedYear}-${String(m).padStart(2, "0")}`;
      map.set(key, { revenue: 0, count: 0, unpaid: 0 });
    }
    yearInvoices.forEach((inv) => {
      const key = getMonthKey(inv.createdAt);
      const entry = map.get(key);
      if (entry) {
        entry.count++;
        if (inv.status === "مدفوعة") entry.revenue += inv.total;
        if (inv.status === "غير مدفوعة") entry.unpaid += inv.total;
      }
    });
    return Array.from(map.entries()).map(([key, val]) => ({
      month: getMonthLabel(key + "-01"),
      shortMonth: key.split("-")[1],
      revenue: Math.round(val.revenue * 100) / 100,
      unpaid: Math.round(val.unpaid * 100) / 100,
      count: val.count,
    }));
  }, [yearInvoices, selectedYear]);

  // ---- Top 5 Clients by Revenue ----
  const topClients = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>();
    yearInvoices
      .filter((i) => i.status === "مدفوعة")
      .forEach((inv) => {
        const existing = map.get(inv.clientId) || { name: inv.clientName, total: 0, count: 0 };
        existing.total += inv.total;
        existing.count++;
        map.set(inv.clientId, existing);
      });
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [yearInvoices]);

  // ---- Top 5 Products by Quantity Sold ----
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    yearInvoices
      .filter((i) => i.status !== "ملغاة" && i.status !== "مسودة")
      .forEach((inv) => {
        inv.items.forEach((item) => {
          const existing = map.get(item.productId) || { name: item.productName, qty: 0, revenue: 0 };
          existing.qty += item.quantity;
          existing.revenue += item.total;
          map.set(item.productId, existing);
        });
      });
    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [yearInvoices]);

  // ---- Invoice Status Breakdown ----
  const statusBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    yearInvoices.forEach((inv) => {
      map[inv.status] = (map[inv.status] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [yearInvoices]);

  // ---- Revenue by Product Category ----
  const categoryRevenue = useMemo(() => {
    const map = new Map<string, number>();
    yearInvoices
      .filter((i) => i.status !== "ملغاة" && i.status !== "مسودة")
      .forEach((inv) => {
        inv.items.forEach((item) => {
          const product = products.find((p) => p.id === item.productId);
          const cat = product?.category || "أخرى";
          map.set(cat, (map.get(cat) || 0) + item.total);
        });
      });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [yearInvoices, products]);

  // ---- Monthly Growth ----
  const growth = useMemo(() => {
    if (monthlyData.length < 2) return null;
    const current = monthlyData.filter((d) => d.revenue > 0);
    if (current.length < 2) return null;
    const last = current[current.length - 1].revenue;
    const prev = current[current.length - 2].revenue;
    if (prev === 0) return null;
    return ((last - prev) / prev) * 100;
  }, [monthlyData]);

  const kpis = [
    { label: "إجمالي الإيرادات", value: formatCurrency(totalRevenue), icon: DollarSign, color: "text-emerald-600 bg-emerald-50/70" },
    { label: "المستحقات المعلقة", value: formatCurrency(totalUnpaid), icon: TrendingDown, color: "text-rose-600 bg-rose-50/70" },
    { label: "إجمالي الفواتير", value: invoiceCount.toString(), icon: FileText, color: "text-indigo-600 bg-indigo-50/70" },
    { label: "متوسط الفاتورة", value: formatCurrency(avgInvoice), icon: BarChart3, color: "text-violet-600 bg-violet-50/70" },
  ];

  function shareWhatsApp() {
    const lines = [
      `📊 *التقرير المالي - ${settings.businessName}*`,
      `📅 التاريخ: ${new Date().toLocaleDateString("en-GB")}`,
      `📆 السنة: ${selectedYear}`,
      "",
      `💰 *المؤشرات الرئيسية:*`,
    ];
    kpis.forEach(k => {
      lines.push(`  • ${k.label}: ${k.value}`);
    });
    lines.push(
      "",
      `📈 *أفضل العملاء:*`,
    );
    const clientTotals = clients.map(c => ({ name: c.name, total: c.totalSpent }))
      .sort((a, b) => b.total - a.total).slice(0, 5);
    clientTotals.forEach((c, i) => {
      lines.push(`  ${i + 1}. ${c.name}: ${settings.currencySymbol}${c.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
    });
    lines.push(
      "",
      `🏷️ *أكثر المنتجات مبيعاً:*`,
    );
    const productSales: Record<string, number> = {};
    yearInvoices.filter(i => i.status !== "ملغاة" && i.status !== "مسودة").forEach(inv => inv.items.forEach(item => {
      productSales[item.productName] = (productSales[item.productName] || 0) + item.quantity;
    }));
    Object.entries(productSales).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([name, qty], i) => {
      lines.push(`  ${i + 1}. ${name}: ${qty} وحدة`);
    });
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
              <h1 className="text-2xl font-black text-[var(--text-primary)] leading-tight">التقارير المالية</h1>
              <p className="text-[13px] text-[var(--text-muted)] mt-1.5 font-medium">تحليل شامل لأداء مبيعات الأحبار ومستلزمات المطابع</p>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <DateRangeExportButton
                label="تصدير تقرير PDF"
                onExport={async (range: DateRange) => {
                  try {
                    const { exportSalesReportPDF } = await import("@/lib/pdf");
                    await exportSalesReportPDF(invoices, range, settings);
                    toast.success("تم تصدير تقرير المبيعات");
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
                  toast.promise(shareAsImage('reports-capture-section', `تقارير_المبيعات_${selectedYear}`), {
                    loading: 'جاري تصدير التقرير كصورة...',
                    success: 'تم التصدير بنجاح',
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
              <Link href="/settings">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-1.5 h-9 rounded-xl border-[var(--border-default)] hover:bg-[var(--surface-2)] text-[13px] font-bold text-indigo-700" 
                >
                  <Pencil className="h-4.5 w-4.5" />
                  <span>تعديل الإعدادات</span>
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

        {/* Daily Closing Section */}
        <DailyClosingSection />

        {/* Capturable reports section */}
        <div id="reports-capture-section" className="space-y-6">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
                
                {kpi.label === "إجمالي الإيرادات" && growth !== null && (
                  <div className={`mt-2 flex items-center gap-1 text-[11px] font-bold ${growth >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {growth >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    <span>{Math.abs(growth).toFixed(1)}% عن الشهر السابق</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        {/* Monthly Revenue Chart */}
        <div className="m3-card bg-[var(--surface-1)] p-6">
          <h2 className="text-[15px] font-black text-[var(--text-primary)] mb-5">مخطط الإيرادات الشهرية</h2>
          <div className="h-[320px]" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: "bold" }} />
                <YAxis tick={{ fontSize: 11, fontWeight: "bold" }} />
                <Tooltip
                  formatter={(value, name) => [
                    formatCurrency(Number(value)),
                    name === "revenue" ? "مدفوعة" : "غير مدفوعة",
                  ]}
                  labelStyle={{ fontFamily: "IBM Plex Sans Arabic", fontWeight: "bold" }}
                  contentStyle={{ fontFamily: "IBM Plex Sans Arabic", direction: "rtl", borderRadius: "12px", border: "1px solid var(--border-default)" }}
                />
                <Legend formatter={(value) => (value === "revenue" ? "مدفوعة" : "غير مدفوعة")} />
                <Bar dataKey="revenue" fill="#4F46E5" radius={[6, 6, 0, 0]} name="revenue" />
                <Bar dataKey="unpaid" fill="#EAB308" radius={[6, 6, 0, 0]} name="unpaid" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Two Columns Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Clients */}
          <div className="m3-card bg-[var(--surface-1)] p-6">
            <div className="mb-5 flex items-center gap-2">
              <Users className="h-5 w-5 text-[var(--brand-primary)]" />
              <h2 className="text-[15px] font-black text-[var(--text-primary)]">أفضل 5 عملاء (الإنفاق الفعلي)</h2>
            </div>
            {topClients.length === 0 ? (
              <p className="py-8 text-center text-xs text-[var(--text-muted)]">لا توجد سجلات كافية بعد</p>
            ) : (
              <div className="space-y-4">
                {topClients.map((c, i) => {
                  const maxVal = topClients[0].total;
                  return (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="font-bold text-[var(--text-primary)]">{c.name}</span>
                        <span className="text-[var(--text-secondary)] font-bold font-mono">
                          {formatCurrency(c.total)} <span className="text-[10px] text-[var(--text-muted)]">({c.count} فاتورة)</span>
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)] border border-[var(--border-default)]">
                        <div
                          className="h-full rounded-full bg-[var(--brand-primary)] transition-all duration-500"
                          style={{ width: `${(c.total / maxVal) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top Products */}
          <div className="m3-card bg-[var(--surface-1)] p-6">
            <div className="mb-5 flex items-center gap-2">
              <Package className="h-5 w-5 text-[var(--brand-primary)]" />
              <h2 className="text-[15px] font-black text-[var(--text-primary)]">أعلى 5 منتجات مبيعاً</h2>
            </div>
            {topProducts.length === 0 ? (
              <p className="py-8 text-center text-xs text-[var(--text-muted)]">لا توجد سجلات مبيعات نشطة</p>
            ) : (
              <div className="space-y-4">
                {topProducts.map((p, i) => {
                  const maxVal = topProducts[0].revenue;
                  return (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="font-bold text-[var(--text-primary)]">{p.name}</span>
                        <span className="text-[var(--text-secondary)] font-bold font-mono">
                          {formatCurrency(p.revenue)} <span className="text-[10px] text-[var(--text-muted)]">({p.qty} وحدة)</span>
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)] border border-[var(--border-default)]">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${(p.revenue / maxVal) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Breakdown section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Invoice Status Pie */}
          <div className="m3-card bg-[var(--surface-1)] p-6">
            <h2 className="text-[15px] font-black text-[var(--text-primary)] mb-4">توزيع حالات الفواتير</h2>
            {statusBreakdown.length === 0 ? (
              <p className="py-8 text-center text-xs text-[var(--text-muted)]">لا توجد فواتير</p>
            ) : (
              <div className="h-[260px]" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    >
                      {statusBreakdown.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`${value} فاتورة`, "العدد"]} 
                      contentStyle={{ fontFamily: "IBM Plex Sans Arabic", borderRadius: "12px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Revenue by Category */}
          <div className="m3-card bg-[var(--surface-1)] p-6">
            <h2 className="text-[15px] font-black text-[var(--text-primary)] mb-4">توزيع الإيرادات بحسب الفئة</h2>
            {categoryRevenue.length === 0 ? (
              <p className="py-8 text-center text-xs text-[var(--text-muted)]">لا توجد مبيعات مصنفة</p>
            ) : (
              <div className="h-[260px]" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryRevenue}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    >
                      {categoryRevenue.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [formatCurrency(Number(value)), "الإيرادات"]} 
                      contentStyle={{ fontFamily: "IBM Plex Sans Arabic", borderRadius: "12px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
        {/* Quick Stats Footer */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
          <div className="m3-card p-5 text-center bg-[var(--surface-1)]">
            <span className="text-[12px] font-bold text-[var(--text-muted)] block mb-1">إجمالي العملاء المسجلين</span>
            <span className="text-2xl font-black text-[var(--text-primary)] font-mono">{clients.length}</span>
          </div>
          <div className="m3-card p-5 text-center bg-[var(--surface-1)]">
            <span className="text-[12px] font-bold text-[var(--text-muted)] block mb-1">إجمالي الأصناف المتاحة</span>
            <span className="text-2xl font-black text-[var(--text-primary)] font-mono">{products.length}</span>
          </div>
          <div className="m3-card p-5 text-center bg-[var(--surface-1)]">
            <span className="text-[12px] font-bold text-[var(--text-muted)] block mb-1">الطلبات النشطة (غير المكتملة)</span>
            <span className="text-2xl font-black text-[var(--brand-primary)] font-mono">
              {orders.filter((o) => o.status !== "مكتمل").length}
            </span>
          </div>
        </div>
      </div>
      </div>
    </ResponsiveShell>
  );
}
