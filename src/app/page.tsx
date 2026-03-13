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
      <div className="space-y-6 page-enter">
        {/* Header */}
        <div className="animate-fade-in-up">
          <h1 className="text-2xl font-bold text-foreground">لوحة التحكم</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            مرحباً بك في نظام إدارة {settings.businessName}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger-children">
          <Card className="group border border-border shadow-sm hover-lift">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي الإيرادات</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {formatCurrency(totalRevenue)}
                  </p>
                  <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                    <TrendingUp className="h-3 w-3" />
                    <span>الفواتير المدفوعة</span>
                  </div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-110">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Link href="/invoices">
            <Card className="group border border-border shadow-sm hover-lift cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">الفواتير</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                      {invoices.length}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5 text-xs">
                      <span className="text-emerald-600">{paidCount} مدفوعة</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-amber-600">{unpaidCount} معلقة</span>
                    </div>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-transform group-hover:scale-110">
                    <FileText className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/inventory">
            <Card className="group border border-border shadow-sm hover-lift cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">المنتجات</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                      {products.length}
                    </p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {lowStockItems.length > 0 ? (
                        <span className="text-red-600">
                          {lowStockItems.length} منخفض المخزون
                        </span>
                      ) : (
                        <span>جميع المنتجات متوفرة</span>
                      )}
                    </div>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600 transition-transform group-hover:scale-110">
                    <Package className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/orders">
            <Card className="group border border-border shadow-sm hover-lift cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">الطلبات النشطة</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                      {activeOrders}
                    </p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {clients.length} عميل مسجل
                    </div>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 transition-transform group-hover:scale-110">
                    <ClipboardList className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* Low Stock Alerts */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                تنبيهات المخزون المنخفض
                {lowStockItems.length > 0 && (
                  <Badge variant="destructive" className="mr-auto text-[11px] px-2">
                    {lowStockItems.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {lowStockItems.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  جميع المنتجات متوفرة بكميات كافية
                </p>
              ) : (
                lowStockItems.slice(0, 5).map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50/50 p-3 transition-colors hover:bg-red-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {product.category} · الحد الأدنى: {product.minStock} {product.unit}
                      </p>
                    </div>
                    <Badge variant="destructive" className="text-xs font-bold">
                      {product.stock} {product.unit}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Invoices */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  <ArrowUpLeft className="h-4 w-4 text-primary" />
                  آخر الفواتير
                </CardTitle>
                <Link
                  href="/invoices"
                  className="text-xs text-primary hover:underline"
                >
                  عرض الكل
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentInvoices.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    لا توجد فواتير بعد
                  </p>
                ) : (
                  recentInvoices.map((invoice) => (
                    <Link key={invoice.id} href={`/invoices/${invoice.id}`}>
                      <div className="flex items-center justify-between rounded-xl border border-border p-3 transition-all hover:bg-accent/50 hover:shadow-sm">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground">
                              {invoice.invoiceNumber}
                            </p>
                            <Badge
                              variant="outline"
                              className={`text-[11px] ${getStatusColor(invoice.status)}`}
                            >
                              {invoice.status}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {invoice.clientName} · {invoice.createdAt}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-foreground">
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
