"use client";

import { AppShell } from "@/components/app-shell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  Package,
  FileText,
  AlertTriangle,
  TrendingUp,
  Users,
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
  const activeOrders = orders.filter(
    (o) => o.status !== "مكتمل"
  ).length;

  return (
    <AppShell>
      <div className="space-y-6 page-enter sm:space-y-8">
        {/* Header */}
        <div className="animate-fade-in-up text-center">
          <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">لوحة التحكم</h1>
          <p className="mt-1.5 text-sm text-muted-foreground sm:mt-2 sm:text-base">
            مرحباً بك في نظام إدارة {settings.businessName}
          </p>
        </div>

        {/* Stats Cards — 2x2 grid on mobile */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4 stagger-children">
          <Card className="group border border-border/60 shadow-sm hover-lift overflow-hidden">
            <CardContent className="flex flex-col items-center p-4 sm:p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-110 sm:h-14 sm:w-14">
                <DollarSign className="h-5 w-5 sm:h-7 sm:w-7" />
              </div>
              <p className="mt-2.5 text-xs font-medium text-muted-foreground sm:text-sm">الإيرادات</p>
              <p className="mt-1 text-lg font-extrabold text-foreground animate-count-pop sm:text-2xl">
                {formatCurrency(totalRevenue)}
              </p>
              <div className="mt-1.5 hidden items-center gap-1.5 text-xs text-emerald-600 sm:flex">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>{paidCount} مدفوعة</span>
              </div>
            </CardContent>
          </Card>

          <Link href="/invoices">
            <Card className="group border border-border/60 shadow-sm hover-lift cursor-pointer overflow-hidden h-full">
              <CardContent className="flex flex-col items-center p-4 sm:p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 transition-transform group-hover:scale-110 sm:h-14 sm:w-14">
                  <FileText className="h-5 w-5 sm:h-7 sm:w-7" />
                </div>
                <p className="mt-2.5 text-xs font-medium text-muted-foreground sm:text-sm">الفواتير</p>
                <p className="mt-1 text-lg font-extrabold text-foreground animate-count-pop sm:text-2xl">
                  {invoices.length}
                </p>
                <div className="mt-1.5 hidden items-center gap-1.5 text-xs sm:flex">
                  <span className="text-emerald-600">{paidCount} مدفوعة</span>
                  <span className="text-muted-foreground/40">|</span>
                  <span className="text-amber-600">{unpaidCount} معلقة</span>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/inventory">
            <Card className="group border border-border/60 shadow-sm hover-lift cursor-pointer overflow-hidden h-full">
              <CardContent className="flex flex-col items-center p-4 sm:p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 transition-transform group-hover:scale-110 sm:h-14 sm:w-14">
                  <Package className="h-5 w-5 sm:h-7 sm:w-7" />
                </div>
                <p className="mt-2.5 text-xs font-medium text-muted-foreground sm:text-sm">المنتجات</p>
                <p className="mt-1 text-lg font-extrabold text-foreground animate-count-pop sm:text-2xl">
                  {products.length}
                </p>
                <div className="mt-1.5 hidden text-xs sm:block">
                  {lowStockItems.length > 0 ? (
                    <span className="text-red-500 font-medium">{lowStockItems.length} منخفض</span>
                  ) : (
                    <span className="text-muted-foreground">متوفرة</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/orders">
            <Card className="group border border-border/60 shadow-sm hover-lift cursor-pointer overflow-hidden h-full">
              <CardContent className="flex flex-col items-center p-4 sm:p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 transition-transform group-hover:scale-110 sm:h-14 sm:w-14">
                  <ClipboardList className="h-5 w-5 sm:h-7 sm:w-7" />
                </div>
                <p className="mt-2.5 text-xs font-medium text-muted-foreground sm:text-sm">الطلبات</p>
                <p className="mt-1 text-lg font-extrabold text-foreground animate-count-pop sm:text-2xl">
                  {activeOrders}
                </p>
                <div className="mt-1.5 hidden text-xs text-muted-foreground sm:block">
                  {clients.length} عميل
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 sm:gap-6">
          {/* Low Stock Alerts */}
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="px-4 pb-3 sm:px-6 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-bold sm:gap-2.5 sm:text-lg">
                <AlertTriangle className="h-4 w-4 text-amber-500 sm:h-5 sm:w-5" />
                تنبيهات المخزون
                {lowStockItems.length > 0 && (
                  <Badge variant="destructive" className="mr-auto text-xs px-2 py-0.5">
                    {lowStockItems.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 space-y-2.5 sm:space-y-3">
              {lowStockItems.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground sm:py-10 sm:text-base">
                  جميع المنتجات متوفرة بكميات كافية
                </p>
              ) : (
                lowStockItems.slice(0, 5).map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50/50 p-3 transition-colors hover:bg-red-50 sm:p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate sm:text-base">
                        {product.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground sm:mt-1 sm:text-sm">
                        {product.category} · الحد: {product.minStock} {product.unit}
                      </p>
                    </div>
                    <Badge variant="destructive" className="shrink-0 text-xs font-bold px-2 py-0.5 sm:text-sm sm:px-3 sm:py-1">
                      {product.stock} {product.unit}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Invoices */}
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="px-4 pb-3 sm:px-6 sm:pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-bold sm:gap-2.5 sm:text-lg">
                  <ArrowUpLeft className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
                  آخر الفواتير
                </CardTitle>
                <Link
                  href="/invoices"
                  className="text-xs font-medium text-primary hover:underline sm:text-sm"
                >
                  عرض الكل
                </Link>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="space-y-2.5 sm:space-y-3">
                {recentInvoices.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground sm:py-10 sm:text-base">
                    لا توجد فواتير بعد
                  </p>
                ) : (
                  recentInvoices.map((invoice) => (
                    <Link key={invoice.id} href={`/invoices/${invoice.id}`}>
                      <div className="flex items-center justify-between rounded-xl border border-border/60 p-3 transition-all hover:bg-accent/50 hover:shadow-sm sm:p-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground truncate sm:text-base">
                              {invoice.invoiceNumber}
                            </p>
                            <Badge
                              variant="outline"
                              className={`shrink-0 text-[10px] sm:text-xs ${getStatusColor(invoice.status)}`}
                            >
                              {invoice.status}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground sm:mt-1 sm:text-sm">
                            {invoice.clientName} · {invoice.createdAt}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-bold text-foreground sm:text-base">
                          {formatCurrency(invoice.total)}
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
