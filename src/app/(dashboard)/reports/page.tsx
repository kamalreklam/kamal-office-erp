"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/data";
import { toast } from "sonner";
import { DateRangeExportButton, type DateRange } from "@/components/date-range-picker";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  BarChart3,
  Users,
  Package,
  Share2,
  ChevronDown
} from "lucide-react";

const COLORS = [
  "#4f46e5", // Indigo 600
  "#06b6d4", // Cyan 500
  "#10b981", // Emerald 500
  "#f59e0b", // Amber 500
  "#f43f5e", // Rose 500
  "#8b5cf6", // Violet 500
  "#ec4899", // Pink 500
  "#64748b", // Slate 500
];

function getMonthLabel(dateStr: string) {
  const [y, m] = dateStr.split("-");
  const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  return `${months[parseInt(m) - 1]} ${y}`;
}

function getMonthKey(dateStr: string) {
  return dateStr.slice(0, 7);
}

export default function ReportsPage() {
  const { invoices, clients, products, orders, settings, connectionStatus } = useStore();
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

  const totalRevenue = yearInvoices.filter((i) => i.status === "مدفوعة").reduce((s, i) => s + i.total, 0);
  const totalUnpaid = yearInvoices.filter((i) => i.status === "غير مدفوعة").reduce((s, i) => s + i.total, 0);
  const invoiceCount = yearInvoices.length;
  const paidCount = yearInvoices.filter((i) => i.status === "مدفوعة").length;
  const avgInvoice = paidCount > 0 ? totalRevenue / paidCount : 0;

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

  const statusBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    yearInvoices.forEach((inv) => {
      map[inv.status] = (map[inv.status] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [yearInvoices]);

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
    { label: "إجمالي الإيرادات", value: formatCurrency(totalRevenue), icon: DollarSign, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
    { label: "المستحقات", value: formatCurrency(totalUnpaid), icon: TrendingDown, color: "text-amber-600 bg-amber-50 border-amber-200" },
    { label: "عدد الفواتير", value: invoiceCount.toString(), icon: FileText, color: "text-blue-600 bg-blue-50 border-blue-200" },
    { label: "متوسط الفاتورة", value: formatCurrency(avgInvoice), icon: BarChart3, color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  ];

  function shareWhatsApp() {
    const lines = [
      `📊 *التقرير المالي - ${settings.businessName}*`,
      `📅 التاريخ: ${new Date().toLocaleDateString("ar-SY", { numberingSystem: "latn" })}`,
      `│ السنة: ${selectedYear}`,
      "",
      `💰 *المؤشرات الرئيسية:*`,
    ];
    kpis.forEach((k) => {
      lines.push(`  • ${k.label}: ${k.value}`);
    });
    lines.push("", `📈 *أفضل العملاء:*`);
    const clientTotals = clients
      .map((c) => ({ name: c.name, total: c.totalSpent }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
    clientTotals.forEach((c, i) => {
      lines.push(`  ${i + 1}. ${c.name}: ${settings.currencySymbol}${c.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
    });
    lines.push("", `🏷️ *أكثر المنتجات مبيعاً:*`);
    const productSales: Record<string, number> = {};
    yearInvoices
      .filter((i) => i.status !== "ملغاة" && i.status !== "مسودة")
      .forEach((inv) =>
        inv.items.forEach((item) => {
          productSales[item.productName] = (productSales[item.productName] || 0) + item.quantity;
        })
      );
    Object.entries(productSales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([name, qty], i) => {
        lines.push(`  ${i + 1}. ${name}: ${qty} وحدة`);
      });
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
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="w-16 h-16 rounded-3xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 mb-6">
              <BarChart3 className="size-8" />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">التقارير المالية</h1>
            <p className="mt-2 text-base font-medium text-slate-500 max-w-lg leading-relaxed">
              تحليل شامل لأداء الأعمال والإيرادات والأصناف
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
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
              label="تصدير PDF"
              className="flex-1 md:flex-none h-14 px-6 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2"
              onExport={async (range: DateRange) => {
                try {
                  const { exportSalesReportPDF } = await import("@/lib/pdf");
                  await exportSalesReportPDF(invoices, range, settings);
                  toast.success("تم تصدير تقرير المبيعات بنجاح");
                } catch {
                  toast.error("فشل تصدير التقرير");
                }
              }}
            />

            <button
              onClick={shareWhatsApp}
              className="w-full md:w-auto h-14 px-6 rounded-2xl bg-white text-slate-700 border border-slate-200 font-bold hover:bg-slate-50 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <Share2 className="size-5 text-indigo-500" />
              <span>مشاركة واتساب</span>
            </button>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <div key={idx} className="bg-white rounded-[2rem] p-6 border border-slate-200/60 shadow-sm flex flex-col justify-between hover:border-indigo-200 hover:shadow-md transition-all group">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{kpi.label}</span>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${kpi.color} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="size-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight font-mono">
                    {kpi.value}
                  </h3>
                  {kpi.label === "إجمالي الإيرادات" && growth !== null && (
                    <div className="flex items-center gap-2 mt-3">
                      <div className={`flex items-center text-xs font-black px-2 py-1 rounded-lg border ${growth >= 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>
                        {growth >= 0 ? <TrendingUp className="size-3.5 me-1 inline" /> : <TrendingDown className="size-3.5 me-1 inline" />}
                        <span>{Math.abs(growth).toFixed(1)}%</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">من الشهر السابق</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Chart */}
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-200/60 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <h3 className="text-xl font-black text-slate-900">
              الإيرادات الشهرية لسنة {selectedYear}
            </h3>
            <div className="flex items-center gap-4 text-xs font-bold bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-indigo-600" />
                <span className="text-slate-600">مدفوعة</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-amber-400" />
                <span className="text-slate-600">غير مدفوعة</span>
              </div>
            </div>
          </div>
          <div className="h-[400px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b", fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b", fontWeight: 600 }} axisLine={false} tickLine={false} dx={-10} />
                <Tooltip
                  formatter={(value, name) => [
                    formatCurrency(Number(value)),
                    name === "revenue" ? "مدفوعة" : "غير مدفوعة",
                  ]}
                  contentStyle={{
                    borderRadius: "1rem",
                    border: "none",
                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                    fontWeight: 700,
                    padding: "12px",
                    direction: "rtl"
                  }}
                  itemStyle={{ padding: "4px 0" }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="revenue" fill="#4f46e5" radius={[8, 8, 0, 0]} name="revenue" barSize={32} />
                <Bar dataKey="unpaid" fill="#fbbf24" radius={[8, 8, 0, 0]} name="unpaid" barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dynamic Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Clients */}
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-200/60 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <Users className="size-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-black text-slate-900">أفضل العملاء (إيرادات محصلة)</h3>
            </div>
            {topClients.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-bold text-sm bg-slate-50 rounded-3xl border border-slate-100">لا توجد بيانات متاحة</div>
            ) : (
              <div className="space-y-6">
                {topClients.map((c, i) => {
                  const maxVal = topClients[0].total || 1;
                  const percent = (c.total / maxVal) * 100;
                  return (
                    <div key={i} className="group">
                      <div className="flex justify-between items-center text-sm font-bold mb-2">
                        <span className="text-slate-900">{c.name}</span>
                        <div className="text-right">
                          <span className="text-indigo-600 font-mono text-base tracking-tight">{formatCurrency(c.total)}</span>
                          <span className="text-xs text-slate-400 mr-2">({c.count} فاتورة)</span>
                        </div>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all duration-1000 group-hover:bg-indigo-600"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-200/60 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <Package className="size-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-black text-slate-900">أكثر الأصناف مبيعاً (إيرادات)</h3>
            </div>
            {topProducts.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-bold text-sm bg-slate-50 rounded-3xl border border-slate-100">لا توجد بيانات متاحة</div>
            ) : (
              <div className="space-y-6">
                {topProducts.map((p, i) => {
                  const maxVal = topProducts[0].revenue || 1;
                  const percent = (p.revenue / maxVal) * 100;
                  return (
                    <div key={i} className="group">
                      <div className="flex justify-between items-center text-sm font-bold mb-2">
                        <span className="text-slate-900 truncate max-w-[200px]">{p.name}</span>
                        <div className="text-right">
                          <span className="text-emerald-600 font-mono text-base tracking-tight">{formatCurrency(p.revenue)}</span>
                          <span className="text-xs text-slate-400 mr-2">({p.qty} وحدة)</span>
                        </div>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-1000 group-hover:bg-emerald-600"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Pie Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Status Breakdown */}
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-200/60 shadow-sm">
            <h3 className="text-xl font-black text-slate-900 mb-8">توزيع حالات الفواتير</h3>
            {statusBreakdown.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-bold text-sm bg-slate-50 rounded-3xl border border-slate-100">لا توجد بيانات متاحة</div>
            ) : (
              <div className="flex flex-col md:flex-row items-center justify-around gap-8">
                <div className="h-[220px] w-[220px]" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {statusBreakdown.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`${value} فاتورة`, "العدد"]}
                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontWeight: 700 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-3 w-full md:w-auto">
                  {statusBreakdown.map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
                        <span className="w-3 h-3 rounded-md shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        {item.name}
                      </div>
                      <span className="text-slate-900 font-black font-mono text-lg">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Revenue by Category */}
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-200/60 shadow-sm">
            <h3 className="text-xl font-black text-slate-900 mb-8">الإيرادات حسب الفئة</h3>
            {categoryRevenue.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-bold text-sm bg-slate-50 rounded-3xl border border-slate-100">لا توجد بيانات متاحة</div>
            ) : (
              <div className="flex flex-col md:flex-row items-center justify-around gap-8">
                <div className="h-[220px] w-[220px]" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryRevenue}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {categoryRevenue.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [formatCurrency(Number(value)), "الإيرادات"]} 
                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontWeight: 700 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-3 w-full md:w-auto">
                  {categoryRevenue.map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
                        <span className="w-3 h-3 rounded-md shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="truncate max-w-[120px]">{item.name}</span>
                      </div>
                      <span className="text-slate-900 font-black font-mono">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats Footer */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
          <div className="bg-white rounded-[2rem] p-6 text-center border border-slate-200/60 shadow-sm">
            <span className="text-xs font-black text-slate-400 block uppercase tracking-widest mb-2">إجمالي العملاء المسجلين</span>
            <span className="text-4xl font-black text-slate-900 font-mono tracking-tight">{clients.length}</span>
          </div>
          <div className="bg-white rounded-[2rem] p-6 text-center border border-slate-200/60 shadow-sm">
            <span className="text-xs font-black text-slate-400 block uppercase tracking-widest mb-2">إجمالي الأصناف المتاحة</span>
            <span className="text-4xl font-black text-slate-900 font-mono tracking-tight">{products.length}</span>
          </div>
          <div className="bg-indigo-50 rounded-[2rem] p-6 text-center border border-indigo-100 shadow-sm">
            <span className="text-xs font-black text-indigo-500 block uppercase tracking-widest mb-2">الطلبات النشطة (قيد التنفيذ)</span>
            <span className="text-4xl font-black text-indigo-700 font-mono tracking-tight">
              {orders.filter((o) => o.status !== "مكتمل").length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
