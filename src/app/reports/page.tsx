"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/data";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, TrendingDown, Users, Package, FileText, DollarSign, BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { exportReportPDF } from "@/lib/pdf";
import { DateRangeExportButton, type DateRange } from "@/components/date-range-picker";
import { createSalesReport } from "@/lib/report-generators";
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
  const { invoices, clients, products, orders } = useStore();
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
  const avgInvoice = invoiceCount > 0 ? totalRevenue / yearInvoices.filter((i) => i.status === "مدفوعة").length || 0 : 0;

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
      .filter((i) => i.status !== "ملغاة")
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
      .filter((i) => i.status !== "ملغاة")
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
    { label: "إجمالي الإيرادات", value: formatCurrency(totalRevenue), icon: DollarSign, color: "text-emerald-600 bg-emerald-50" },
    { label: "المستحقات", value: formatCurrency(totalUnpaid), icon: TrendingDown, color: "text-amber-600 bg-amber-50" },
    { label: "عدد الفواتير", value: invoiceCount.toString(), icon: FileText, color: "text-sky-600 bg-sky-50" },
    { label: "متوسط الفاتورة", value: formatCurrency(avgInvoice), icon: BarChart3, color: "text-violet-600 bg-violet-50" },
  ];

  return (
    <AppShell>
      <div className="space-y-8 page-enter">
        {/* Header */}
        <div className="animate-fade-in-up text-center">
          <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">التقارير المالية</h1>
          <p className="mt-1.5 text-sm text-muted-foreground sm:mt-2 sm:text-base">
            تحليل شامل لأداء الأعمال والإيرادات
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <DateRangeExportButton
              label="تصدير تقرير PDF"
              onExport={async (range: DateRange) => {
                const doc = createSalesReport(invoices, range, settings);
                await exportReportPDF(doc, "تقرير_المبيعات", range);
                toast.success("تم تصدير تقرير المبيعات");
              }}
            />
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
                {kpi.label === "إجمالي الإيرادات" && growth !== null && (
                  <div className={`mt-1 flex items-center gap-1 text-xs font-medium ${growth >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {growth >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(growth).toFixed(1)}% عن الشهر السابق
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Monthly Revenue Chart */}
        <Card className="border border-[var(--glass-border)] shadow-sm">
          <CardContent className="p-6">
            <h2 className="mb-6 text-lg font-bold text-foreground">الإيرادات الشهرية</h2>
            <div className="h-[350px]" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value, name) => [
                      formatCurrency(Number(value)),
                      name === "revenue" ? "مدفوعة" : "غير مدفوعة",
                    ]}
                    labelStyle={{ fontFamily: "Almarai" }}
                    contentStyle={{ fontFamily: "Almarai", direction: "rtl" }}
                  />
                  <Legend formatter={(value) => (value === "revenue" ? "مدفوعة" : "غير مدفوعة")} />
                  <Bar dataKey="revenue" fill="oklch(0.60 0.16 235)" radius={[6, 6, 0, 0]} name="revenue" />
                  <Bar dataKey="unpaid" fill="#f59e0b" radius={[6, 6, 0, 0]} name="unpaid" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Clients */}
          <Card className="border border-[var(--glass-border)] shadow-sm">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">أفضل العملاء</h2>
              </div>
              {topClients.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">لا توجد بيانات</p>
              ) : (
                <div className="space-y-3">
                  {topClients.map((c, i) => {
                    const maxVal = topClients[0].total;
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-foreground">{c.name}</span>
                          <span className="text-muted-foreground">{formatCurrency(c.total)} ({c.count} فاتورة)</span>
                        </div>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${(c.total / maxVal) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card className="border border-[var(--glass-border)] shadow-sm">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">أفضل المنتجات</h2>
              </div>
              {topProducts.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">لا توجد بيانات</p>
              ) : (
                <div className="space-y-3">
                  {topProducts.map((p, i) => {
                    const maxVal = topProducts[0].revenue;
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-foreground">{p.name}</span>
                          <span className="text-muted-foreground">{formatCurrency(p.revenue)} ({p.qty} وحدة)</span>
                        </div>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${(p.revenue / maxVal) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Invoice Status Pie */}
          <Card className="border border-[var(--glass-border)] shadow-sm">
            <CardContent className="p-6">
              <h2 className="mb-4 text-lg font-bold text-foreground">توزيع حالات الفواتير</h2>
              {statusBreakdown.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">لا توجد بيانات</p>
              ) : (
                <div className="h-[280px]" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      >
                        {statusBreakdown.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} فاتورة`, "العدد"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Revenue by Category */}
          <Card className="border border-[var(--glass-border)] shadow-sm">
            <CardContent className="p-6">
              <h2 className="mb-4 text-lg font-bold text-foreground">الإيرادات حسب الفئة</h2>
              {categoryRevenue.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">لا توجد بيانات</p>
              ) : (
                <div className="h-[280px]" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryRevenue}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      >
                        {categoryRevenue.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [formatCurrency(Number(value)), "الإيرادات"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats Footer */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border border-[var(--glass-border)] shadow-sm">
            <CardContent className="p-5 text-center">
              <p className="text-sm text-muted-foreground">إجمالي العملاء</p>
              <p className="mt-1 text-2xl font-extrabold text-foreground">{clients.length}</p>
            </CardContent>
          </Card>
          <Card className="border border-[var(--glass-border)] shadow-sm">
            <CardContent className="p-5 text-center">
              <p className="text-sm text-muted-foreground">إجمالي المنتجات</p>
              <p className="mt-1 text-2xl font-extrabold text-foreground">{products.length}</p>
            </CardContent>
          </Card>
          <Card className="border border-[var(--glass-border)] shadow-sm">
            <CardContent className="p-5 text-center">
              <p className="text-sm text-muted-foreground">الطلبات النشطة</p>
              <p className="mt-1 text-2xl font-extrabold text-foreground">
                {orders.filter((o) => o.status !== "مكتمل").length}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
