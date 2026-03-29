"use client";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { DashboardSkeleton } from "@/components/skeletons";
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
  const { invoices, products, clients, orders, settings, connectionStatus } = useStore();

  if (connectionStatus === "loading") {
    return <AppShell><DashboardSkeleton /></AppShell>;
  }

  const totalRevenue = getTotalRevenue(invoices);
  const lowStockItems = getLowStockProducts(products);
  const recentInvoices = [...invoices]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);
  const paidCount = invoices.filter((i) => i.status === "مدفوعة").length;
  const unpaidCount = invoices.filter((i) => i.status === "غير مدفوعة").length;
  const activeOrders = orders.filter((o) => o.status !== "مكتمل").length;

  return (
    <AppShell>
      <div className="space-y-5 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl" style={{ color: "var(--text-primary)" }}>لوحة التحكم</h1>
          <p className="mt-1 text-sm sm:text-base" style={{ color: "var(--text-secondary)" }}>
            مرحباً بك في نظام إدارة {settings.businessName}
          </p>
        </div>

        {/* Bento Grid */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
          className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4 xl:grid-rows-[auto_auto_auto]"
        >

          {/* Revenue — Large card spanning 2 cols on xl */}
          <motion.div
            variants={cardVariants}
            className="col-span-2 stat-card stat-card--teal group"
          >
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 sm:h-16 sm:w-16"
                style={{ background: "rgba(79, 70, 229, 0.1)", color: "var(--primary)" }}>
                <DollarSign className="h-7 w-7 sm:h-8 sm:w-8" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium sm:text-sm" style={{ color: "var(--text-secondary)" }}>إجمالي الإيرادات</p>
                <AnimatedCounter
                  value={totalRevenue}
                  format={formatCurrency}
                  className="text-2xl font-extrabold sm:text-3xl block mt-0.5"
                  style={{ color: "var(--text-primary)" }}
                />
                <div className="mt-1.5 flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1" style={{ color: "var(--green-500)" }}>
                    <TrendingUp className="h-3.5 w-3.5" />
                    {paidCount} مدفوعة
                  </span>
                  <span style={{ color: "var(--amber-500)" }}>{unpaidCount} معلقة</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Invoices */}
          <motion.div variants={cardVariants}>
            <Link href="/invoices" className="block h-full">
              <div className="stat-card stat-card--blue group h-full">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 sm:h-12 sm:w-12"
                    style={{ background: "var(--info-soft)", color: "var(--blue-500)" }}>
                    <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <p className="mt-2 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>الفواتير</p>
                  <AnimatedCounter
                    value={invoices.length}
                    className="mt-0.5 text-xl font-extrabold sm:text-2xl block"
                    style={{ color: "var(--text-primary)" }}
                  />
                  <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                    <span style={{ color: "var(--green-500)" }}>{paidCount}</span>
                    <span style={{ color: "var(--border-strong)" }}>|</span>
                    <span style={{ color: "var(--amber-500)" }}>{unpaidCount}</span>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Products */}
          <motion.div variants={cardVariants}>
            <Link href="/inventory" className="block h-full">
              <div className="stat-card stat-card--purple group h-full">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 sm:h-12 sm:w-12"
                    style={{ background: "rgba(139, 92, 246, 0.1)", color: "var(--purple-500)" }}>
                    <Package className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <p className="mt-2 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>المنتجات</p>
                  <AnimatedCounter
                    value={products.length}
                    className="mt-0.5 text-xl font-extrabold sm:text-2xl block"
                    style={{ color: "var(--text-primary)" }}
                  />
                  <div className="mt-1 text-[11px]">
                    {lowStockItems.length > 0 ? (
                      <span className="font-medium" style={{ color: "var(--red-500)" }}>{lowStockItems.length} منخفض</span>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>متوفرة</span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Orders — small */}
          <motion.div variants={cardVariants}>
            <Link href="/orders" className="block h-full">
              <div className="stat-card stat-card--amber group h-full">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 sm:h-12 sm:w-12"
                    style={{ background: "var(--warning-soft)", color: "var(--amber-500)" }}>
                    <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <p className="mt-2 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>الطلبات</p>
                  <AnimatedCounter
                    value={activeOrders}
                    className="mt-0.5 text-xl font-extrabold sm:text-2xl block"
                    style={{ color: "var(--text-primary)" }}
                  />
                  <div className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>نشطة</div>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Clients — small */}
          <motion.div variants={cardVariants}>
            <Link href="/clients" className="block h-full">
              <div className="stat-card group h-full" style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}>
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 sm:h-12 sm:w-12"
                    style={{ background: "rgba(16, 185, 129, 0.1)", color: "var(--green-500)" }}>
                    <Users className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <p className="mt-2 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>العملاء</p>
                  <AnimatedCounter
                    value={clients.length}
                    className="mt-0.5 text-xl font-extrabold sm:text-2xl block"
                    style={{ color: "var(--text-primary)" }}
                  />
                  <div className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>عميل</div>
                </div>
              </div>
            </Link>
          </motion.div>

        </motion.div>

        {/* Draggable widget sections */}
        <SortableWidgets
          storageKey="dashboard-widget-order"
          className="space-y-4"
          widgets={[
            {
              id: "low-stock",
              content: (
                <div className="glass-card--flat">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--warning-soft)", color: "var(--amber-500)" }}>
                      <AlertTriangle className="h-4.5 w-4.5" />
                    </div>
                    <h2 className="text-sm font-bold sm:text-base" style={{ color: "var(--text-primary)" }}>تنبيهات المخزون</h2>
                    {lowStockItems.length > 0 && (
                      <span className="badge-danger mr-auto rounded-full px-2 py-0.5 text-xs font-bold">
                        {lowStockItems.length}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {lowStockItems.length === 0 ? (
                      <p className="py-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                        جميع المنتجات متوفرة بكميات كافية
                      </p>
                    ) : (
                      lowStockItems.slice(0, 4).map((product) => (
                        <div key={product.id} className="flex items-center justify-between rounded-xl p-2.5 transition-colors sm:p-3"
                          style={{ background: "var(--danger-soft)", border: "1px solid rgba(239, 68, 68, 0.1)" }}>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{product.name}</p>
                            <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                              {product.category} · الحد: {product.minStock}
                            </p>
                          </div>
                          <span className="badge-danger shrink-0 rounded-full px-2 py-0.5 text-xs font-bold">
                            {product.stock} {product.unit}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ),
            },
            {
              id: "recent-invoices",
              content: (
                <div className="glass-card--flat">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--accent-soft)", color: "var(--primary)" }}>
                        <ArrowUpLeft className="h-4.5 w-4.5" />
                      </div>
                      <h2 className="text-sm font-bold sm:text-base" style={{ color: "var(--text-primary)" }}>آخر الفواتير</h2>
                    </div>
                    <Link href="/invoices" className="text-xs font-medium hover:underline sm:text-sm" style={{ color: "var(--primary)" }}>
                      عرض الكل
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {recentInvoices.length === 0 ? (
                      <p className="col-span-full py-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>لا توجد فواتير بعد</p>
                    ) : (
                      recentInvoices.map((invoice) => (
                        <Link key={invoice.id} href={`/invoices/${invoice.id}`}>
                          <div className="flex items-center justify-between rounded-xl p-3 transition-all"
                            style={{ border: "1px solid var(--border-subtle)" }}
                            onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.borderColor = "var(--border-default)"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                                  {invoice.invoiceNumber}
                                </p>
                                <Badge variant="outline" className={`shrink-0 text-[10px] ${getStatusColor(invoice.status)}`}>
                                  {invoice.status}
                                </Badge>
                              </div>
                              <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                                {invoice.clientName}
                              </p>
                            </div>
                            <p className="shrink-0 text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                              {formatCurrency(invoice.total)}
                            </p>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>
    </AppShell>
  );
}
