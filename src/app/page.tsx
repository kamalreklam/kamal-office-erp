"use client";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  Package,
  FileText,
  AlertTriangle,
  TrendingUp,
  ArrowUpLeft,
  ClipboardList,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  getLowStockProducts,
  getTotalRevenue,
  formatCurrency,
  getStatusColor,
} from "@/lib/data";
import Link from "next/link";

export default function DashboardPage() {
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
    <AppShell>
      <div className="space-y-6 page-enter sm:space-y-8">
        {/* Header */}
        <div className="animate-fade-in-up text-center">
          <h1 className="text-2xl font-extrabold sm:text-3xl" style={{ color: "var(--text-primary)" }}>لوحة التحكم</h1>
          <p className="mt-1.5 text-sm sm:mt-2 sm:text-base" style={{ color: "var(--text-secondary)" }}>
            مرحباً بك في نظام إدارة {settings.businessName}
          </p>
        </div>

        {/* Stats Cards — Gradient vibrant cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4 stagger-children">
          {/* Revenue — Teal gradient */}
          <div className="stat-card stat-card--teal group">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 sm:h-14 sm:w-14"
                style={{ background: "rgba(79, 70, 229, 0.1)", color: "var(--primary)" }}>
                <DollarSign className="h-5 w-5 sm:h-7 sm:w-7" />
              </div>
              <p className="mt-2.5 text-xs font-medium sm:text-sm" style={{ color: "var(--text-secondary)" }}>الإيرادات</p>
              <p className="mt-1 text-lg font-extrabold animate-count-up sm:text-2xl" style={{ color: "var(--text-primary)" }}>
                {formatCurrency(totalRevenue)}
              </p>
              <div className="mt-1.5 hidden items-center gap-1.5 text-xs sm:flex" style={{ color: "var(--green-500)" }}>
                <TrendingUp className="h-3.5 w-3.5" />
                <span>{paidCount} مدفوعة</span>
              </div>
            </div>
          </div>

          {/* Invoices — Blue gradient */}
          <Link href="/invoices">
            <div className="stat-card stat-card--blue group cursor-pointer h-full">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 sm:h-14 sm:w-14"
                  style={{ background: "var(--info-soft)", color: "var(--blue-500)" }}>
                  <FileText className="h-5 w-5 sm:h-7 sm:w-7" />
                </div>
                <p className="mt-2.5 text-xs font-medium sm:text-sm" style={{ color: "var(--text-secondary)" }}>الفواتير</p>
                <p className="mt-1 text-lg font-extrabold animate-count-up sm:text-2xl" style={{ color: "var(--text-primary)" }}>
                  {invoices.length}
                </p>
                <div className="mt-1.5 hidden items-center gap-1.5 text-xs sm:flex">
                  <span style={{ color: "var(--green-500)" }}>{paidCount} مدفوعة</span>
                  <span style={{ color: "var(--border-strong)" }}>|</span>
                  <span style={{ color: "var(--amber-500)" }}>{unpaidCount} معلقة</span>
                </div>
              </div>
            </div>
          </Link>

          {/* Products — Purple gradient */}
          <Link href="/inventory">
            <div className="stat-card stat-card--purple group cursor-pointer h-full">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 sm:h-14 sm:w-14"
                  style={{ background: "rgba(139, 92, 246, 0.1)", color: "var(--purple-500)" }}>
                  <Package className="h-5 w-5 sm:h-7 sm:w-7" />
                </div>
                <p className="mt-2.5 text-xs font-medium sm:text-sm" style={{ color: "var(--text-secondary)" }}>المنتجات</p>
                <p className="mt-1 text-lg font-extrabold animate-count-up sm:text-2xl" style={{ color: "var(--text-primary)" }}>
                  {products.length}
                </p>
                <div className="mt-1.5 hidden text-xs sm:block">
                  {lowStockItems.length > 0 ? (
                    <span className="font-medium" style={{ color: "var(--red-500)" }}>{lowStockItems.length} منخفض</span>
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>متوفرة</span>
                  )}
                </div>
              </div>
            </div>
          </Link>

          {/* Orders — Amber gradient */}
          <Link href="/orders">
            <div className="stat-card stat-card--amber group cursor-pointer h-full">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 sm:h-14 sm:w-14"
                  style={{ background: "var(--warning-soft)", color: "var(--amber-500)" }}>
                  <ClipboardList className="h-5 w-5 sm:h-7 sm:w-7" />
                </div>
                <p className="mt-2.5 text-xs font-medium sm:text-sm" style={{ color: "var(--text-secondary)" }}>الطلبات</p>
                <p className="mt-1 text-lg font-extrabold animate-count-up sm:text-2xl" style={{ color: "var(--text-primary)" }}>
                  {activeOrders}
                </p>
                <div className="mt-1.5 hidden text-xs sm:block" style={{ color: "var(--text-muted)" }}>
                  {clients.length} عميل
                </div>
              </div>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 sm:gap-5">
          {/* Low Stock Alerts */}
          <div className="glass-card--flat">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--warning-soft)", color: "var(--amber-500)" }}>
                <AlertTriangle className="h-4.5 w-4.5" />
              </div>
              <h2 className="text-base font-bold sm:text-lg" style={{ color: "var(--text-primary)" }}>تنبيهات المخزون</h2>
              {lowStockItems.length > 0 && (
                <span className="badge-danger mr-auto rounded-full px-2 py-0.5 text-xs font-bold">
                  {lowStockItems.length}
                </span>
              )}
            </div>
            <div className="space-y-2.5">
              {lowStockItems.length === 0 ? (
                <p className="py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                  جميع المنتجات متوفرة بكميات كافية
                </p>
              ) : (
                lowStockItems.slice(0, 5).map((product) => (
                  <div key={product.id} className="flex items-center justify-between rounded-xl p-3 transition-colors sm:p-4"
                    style={{ background: "var(--danger-soft)", border: "1px solid rgba(239, 68, 68, 0.1)" }}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate sm:text-base" style={{ color: "var(--text-primary)" }}>{product.name}</p>
                      <p className="mt-0.5 text-xs sm:mt-1 sm:text-sm" style={{ color: "var(--text-muted)" }}>
                        {product.category} · الحد: {product.minStock} {product.unit}
                      </p>
                    </div>
                    <span className="badge-danger shrink-0 rounded-full px-2.5 py-1 text-xs font-bold sm:text-sm">
                      {product.stock} {product.unit}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Invoices */}
          <div className="glass-card--flat">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--accent-soft)", color: "var(--primary)" }}>
                  <ArrowUpLeft className="h-4.5 w-4.5" />
                </div>
                <h2 className="text-base font-bold sm:text-lg" style={{ color: "var(--text-primary)" }}>آخر الفواتير</h2>
              </div>
              <Link href="/invoices" className="text-xs font-medium hover:underline sm:text-sm" style={{ color: "var(--primary)" }}>
                عرض الكل
              </Link>
            </div>
            <div className="space-y-2.5">
              {recentInvoices.length === 0 ? (
                <p className="py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>لا توجد فواتير بعد</p>
              ) : (
                recentInvoices.map((invoice) => (
                  <Link key={invoice.id} href={`/invoices/${invoice.id}`}>
                    <div className="flex items-center justify-between rounded-xl p-3 transition-all sm:p-4"
                      style={{ border: "1px solid var(--border-subtle)" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.borderColor = "var(--border-default)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate sm:text-base" style={{ color: "var(--text-primary)" }}>
                            {invoice.invoiceNumber}
                          </p>
                          <Badge variant="outline" className={`shrink-0 text-[10px] sm:text-xs ${getStatusColor(invoice.status)}`}>
                            {invoice.status}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs sm:mt-1 sm:text-sm" style={{ color: "var(--text-muted)" }}>
                          {invoice.clientName} · {invoice.createdAt}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-bold sm:text-base" style={{ color: "var(--text-primary)" }}>
                        {formatCurrency(invoice.total)}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
