"use client";

import { ResponsiveShell } from "@/components/responsive-shell";
import { Badge } from "@/components/ui/badge";
import { DashboardSkeleton } from "@/components/skeletons";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { MobileDashboard } from "@/components/mobile/mobile-dashboard";
import { AppShell } from "@/components/app-shell";
import { AnimatedCounter } from "@/components/animated-counter";
import { SortableWidgets } from "@/components/sortable-widgets";
import { motion } from "framer-motion";
import {
  DollarSign,
  Package,
  FileText,
  AlertTriangle,
  TrendingUp,
  ArrowUpLeft,
  ClipboardList,
  Users,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  getLowStockProducts,
  getTotalRevenue,
  formatCurrency,
  getStatusColor,
} from "@/lib/data";
import Link from "next/link";

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
};

export default function DashboardPage() {
  const isMobile = useIsMobile();
  const { connectionStatus } = useStore();

  if (connectionStatus === "loading") {
    return <ResponsiveShell><DashboardSkeleton /></ResponsiveShell>;
  }

  if (isMobile) {
    return <AppShell><MobileDashboard /></AppShell>;
  }

  return <DesktopDashboard />;
}

function DesktopDashboard() {
  const { invoices, products, clients, orders, settings } = useStore();

  const totalRevenue = getTotalRevenue(invoices);
  const lowStockItems = getLowStockProducts(products);
  const recentInvoices = [...invoices]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);
  const paidCount = invoices.filter((i) => i.status === "مدفوعة").length;
  const unpaidCount = invoices.filter((i) => i.status === "غير مدفوعة").length;
  const activeOrders = orders.filter((o) => o.status !== "مكتمل").length;

  return (
    <ResponsiveShell>
      <div className="space-y-6">
        {/* Welcome Header Hero Card */}
        <div className="relative overflow-hidden rounded-[28px] border border-[var(--glass-border)] bg-white p-8 shadow-sm">
          {/* Decorative CMYK Background Glows */}
          <div className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-cyan-300/10 blur-3xl" />
          <div className="absolute -left-8 -bottom-8 h-48 w-48 rounded-full bg-pink-300/10 blur-3xl" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3.5 py-1 text-xs font-bold text-indigo-700 border border-indigo-100">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse" />
                النظام نشط
              </span>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--text-primary)]">لوحة التحكم</h1>
              <p className="mt-1.5 text-sm text-[var(--text-muted)] max-w-xl">
                مرحباً بك مجدداً في نظام إدارة **{settings.businessName}**. تابع أداء المخزون والمبيعات والطلبات بنظرة سريعة.
              </p>
            </div>
            
            {/* CMYK Interactive Brand Chip */}
            <div className="flex shrink-0 items-center gap-3 rounded-2xl bg-[var(--surface-2)] p-4 border border-gray-100">
              <div className="flex gap-1">
                <span className="cmyk-dot c" />
                <span className="cmyk-dot m" />
                <span className="cmyk-dot y" />
                <span className="cmyk-dot k" />
              </div>
              <div>
                <span className="block text-[11px] font-bold text-[var(--text-muted)]">هوية الألوان</span>
                <span className="text-xs font-bold text-[var(--text-primary)]">CMYK نشط</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bento Stat Grid */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {/* Revenue Card */}
          <motion.div
            variants={cardVariants}
            className="m3-card relative overflow-hidden bg-white p-6 rounded-2xl border border-[var(--glass-border)] shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[140px]"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-[var(--text-muted)]">إجمالي الإيرادات</span>
                <h3 className="text-2xl font-black text-emerald-600 mt-1">
                  <AnimatedCounter value={totalRevenue} />
                </h3>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center text-xs text-[var(--text-muted)]">
              <span>الفواتير المدفوعة</span>
              <span className="font-bold text-emerald-600">{paidCount} فاتورة</span>
            </div>
          </motion.div>

          {/* Low Stock Items Card */}
          <motion.div
            variants={cardVariants}
            className="m3-card relative overflow-hidden bg-white p-6 rounded-2xl border border-[var(--glass-border)] shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[140px]"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-[var(--text-muted)]">تنبيهات المخزون</span>
                <h3 className={`text-2xl font-black mt-1 ${lowStockItems.length > 0 ? "text-amber-600 animate-pulse" : "text-[var(--text-primary)]"}`}>
                  {lowStockItems.length} منتجات
                </h3>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${lowStockItems.length > 0 ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-gray-50 text-gray-400 border-gray-100"}`}>
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center text-xs text-[var(--text-muted)]">
              <span>بحاجة لإعادة طلب</span>
              <span className={`font-bold ${lowStockItems.length > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                {lowStockItems.length > 0 ? "متوفر منخفض" : "المخزون ممتاز"}
              </span>
            </div>
          </motion.div>

          {/* Active Orders Card */}
          <motion.div
            variants={cardVariants}
            className="m3-card relative overflow-hidden bg-white p-6 rounded-2xl border border-[var(--glass-border)] shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[140px]"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-[var(--text-muted)]">الطلبات النشطة</span>
                <h3 className="text-2xl font-black text-indigo-600 mt-1">
                  <AnimatedCounter value={activeOrders} />
                </h3>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <ClipboardList className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center text-xs text-[var(--text-muted)]">
              <span>حالة التنفيذ</span>
              <span className="font-bold text-indigo-600">{activeOrders} قيد المتابعة</span>
            </div>
          </motion.div>

          {/* Clients Card */}
          <motion.div
            variants={cardVariants}
            className="m3-card relative overflow-hidden bg-white p-6 rounded-2xl border border-[var(--glass-border)] shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[140px]"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-[var(--text-muted)]">قاعدة العملاء</span>
                <h3 className="text-2xl font-black text-violet-600 mt-1">
                  <AnimatedCounter value={clients.length} />
                </h3>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600 border border-violet-100">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center text-xs text-[var(--text-muted)]">
              <span>نشاط المسجلين</span>
              <span className="font-bold text-violet-600">نشط بالكامل</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Dynamic Drag-and-Drop Widgets */}
        <SortableWidgets
          storageKey="dashboard-widget-order"
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          widgets={[
            {
              id: "low-stock",
              content: (
                <div className="rounded-[24px] border border-[var(--glass-border)] bg-white p-6 shadow-sm flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center gap-2.5 mb-4 border-b border-gray-50 pb-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                        <AlertTriangle className="h-4.5 w-4.5" />
                      </div>
                      <h2 className="text-base font-bold text-[var(--text-primary)]">مستويات المخزون الحرجة</h2>
                      {lowStockItems.length > 0 && (
                        <span className="mr-auto rounded-full bg-red-50 text-red-600 border border-red-100 px-2.5 py-0.5 text-xs font-bold">
                          {lowStockItems.length} تنبيهات
                        </span>
                      )}
                    </div>
                    <div className="space-y-3">
                      {lowStockItems.length === 0 ? (
                        <p className="py-8 text-center text-sm text-[var(--text-muted)]">
                          جميع المنتجات متوفرة بكميات كافية
                        </p>
                      ) : (
                        lowStockItems.slice(0, 5).map((product) => {
                          const percentage = Math.min(100, (product.stock / Math.max(product.minStock * 3, 10)) * 100);
                          return (
                            <div key={product.id} className="space-y-1.5 p-3 rounded-xl border border-gray-100 bg-gray-50/30">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-[var(--text-primary)]">{product.name}</span>
                                <span className="text-red-600 font-bold">{product.stock} / {product.minStock} {product.unit}</span>
                              </div>
                              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${percentage}%` }} />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-50 text-left">
                    <Link href="/inventory" className="text-xs font-semibold text-primary hover:underline">
                      عرض إدارة المخزون الكاملة &larr;
                    </Link>
                  </div>
                </div>
              ),
            },
            {
              id: "recent-invoices",
              content: (
                <div className="rounded-[24px] border border-[var(--glass-border)] bg-white p-6 shadow-sm flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                          <ArrowUpLeft className="h-4.5 w-4.5" />
                        </div>
                        <h2 className="text-base font-bold text-[var(--text-primary)]">آخر الفواتير الصادرة</h2>
                      </div>
                      <Link href="/invoices" className="text-xs font-semibold text-primary hover:underline">
                        المزيد
                      </Link>
                    </div>
                    <div className="space-y-2.5">
                      {recentInvoices.length === 0 ? (
                        <p className="py-8 text-center text-sm text-[var(--text-muted)]">لا توجد فواتير نشطة</p>
                      ) : (
                        recentInvoices.map((invoice) => {
                          const statusColors = invoice.status === "مدفوعة"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : invoice.status === "غير مدفوعة"
                            ? "bg-amber-50 text-amber-700 border-amber-100"
                            : "bg-gray-50 text-gray-600 border-gray-100";
                          return (
                            <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="block">
                              <div className="flex items-center justify-between rounded-xl p-3 border border-gray-100 hover:bg-gray-50/50 hover:border-gray-200 transition-all">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                                      {invoice.invoiceNumber}
                                    </p>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors}`}>
                                      {invoice.status}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                                    {invoice.clientName}
                                  </p>
                                </div>
                                <p className="shrink-0 text-sm font-black text-[var(--text-primary)]">
                                  {formatCurrency(invoice.total)}
                                </p>
                              </div>
                            </Link>
                          );
                        })
                      )}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-50 text-left">
                    <Link href="/invoices/new" className="text-xs font-semibold text-primary hover:underline">
                      إنشاء فاتورة جديدة &larr;
                    </Link>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>
    </ResponsiveShell>
  );
}
