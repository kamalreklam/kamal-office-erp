"use client";

import Link from "next/link";
import { Plus, BarChart3, Package, FileText, Users, ClipboardList, AlertTriangle, TrendingUp } from "lucide-react";
import { AnimatedCounter } from "@/components/animated-counter";
import { useStore } from "@/lib/store";
import { getLowStockProducts, formatCurrency, getStatusColor } from "@/lib/data";
import { Badge } from "@/components/ui/badge";

export function MobileDashboard() {
  const { invoices, products, clients, orders, settings } = useStore();

  const lowStockItems = getLowStockProducts(products);
  const recentInvoices = [...invoices].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);
  const paidCount = invoices.filter((i) => i.status === "مدفوعة").length;
  const unpaidCount = invoices.filter((i) => i.status === "غير مدفوعة").length;
  const activeOrders = orders.filter((o) => o.status !== "مكتمل").length;

  return (
    <div className="space-y-5" dir="rtl">
      {/* Greeting Card */}
      <div className="relative overflow-hidden rounded-[24px] border border-[var(--glass-border)] bg-white p-5 shadow-sm">
        <p style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 700 }}>مرحباً بك في نظام إدارة</p>
        <h1 className="mt-1" style={{ fontSize: 24, fontWeight: 900, color: "var(--text-primary)" }}>{settings.businessName}</h1>
      </div>

      {/* Quick Actions Buttons */}
      <div className="flex gap-3">
        <Link href="/invoices/new" className="flex-1">
          <div
            className="flex items-center justify-center gap-2 rounded-2xl transition-all duration-200 active:scale-95 shadow-sm"
            style={{ height: 52, fontSize: 15, fontWeight: 800, background: "var(--primary)", color: "white" }}
          >
            <Plus className="h-5 w-5" />
            فاتورة جديدة
          </div>
        </Link>
        <Link href="/inventory" className="flex-1">
          <div
            className="flex items-center justify-center gap-2 rounded-2xl transition-all duration-200 active:scale-95 border border-[var(--glass-border)]"
            style={{ height: 52, fontSize: 15, fontWeight: 700, background: "white", color: "var(--primary)" }}
          >
            <BarChart3 className="h-5 w-5" />
            المخزون
          </div>
        </Link>
      </div>

      {/* Invoice summary card */}
      <div className="rounded-[24px] p-5 bg-white border border-[var(--glass-border)] shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4.5 w-4.5" style={{ color: "var(--green-500)" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)" }}>إجمالي المعاملات</span>
        </div>
        <div className="flex items-baseline gap-1">
          <AnimatedCounter
            value={invoices.length}
            className="block"
            style={{ fontSize: 32, fontWeight: 900, color: "var(--text-primary)" }}
          />
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>فاتورة مصدرة</span>
        </div>
        <div className="flex gap-4 mt-3 pt-3 border-t border-gray-50">
          <span style={{ fontSize: 13, color: "var(--green-500)", fontWeight: 700 }}>{paidCount} مدفوعة</span>
          <span style={{ fontSize: 13, color: "var(--amber-500)", fontWeight: 700 }}>{unpaidCount} معلقة</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2.5">
        <Link href="/invoices">
          <div className="rounded-2xl p-4 text-center bg-white border border-[var(--glass-border)] shadow-sm">
            <FileText className="h-5 w-5 mx-auto mb-1" style={{ color: "var(--blue-500)" }} />
            <AnimatedCounter value={invoices.length} className="block" style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }} />
            <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>الفواتير</p>
          </div>
        </Link>
        <Link href="/inventory">
          <div className="rounded-2xl p-4 text-center bg-white border border-[var(--glass-border)] shadow-sm">
            <Package className="h-5 w-5 mx-auto mb-1" style={{ color: "var(--purple-500)" }} />
            <AnimatedCounter value={products.length} className="block" style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }} />
            <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>المخزون</p>
          </div>
        </Link>
        <Link href="/clients">
          <div className="rounded-2xl p-4 text-center bg-white border border-[var(--glass-border)] shadow-sm">
            <Users className="h-5 w-5 mx-auto mb-1" style={{ color: "var(--green-500)" }} />
            <AnimatedCounter value={clients.length} className="block" style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }} />
            <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>العملاء</p>
          </div>
        </Link>
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <div className="rounded-[24px] p-5 bg-red-50/30 border border-red-100">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5" style={{ color: "var(--red-500)" }} />
            <span style={{ fontSize: 15, fontWeight: 800, color: "var(--red-500)" }}>المخزون الحرج</span>
            <span
              className="rounded-full px-2.5 py-0.5 mr-auto"
              style={{ fontSize: 11, fontWeight: 800, background: "var(--red-500)", color: "white" }}
            >
              {lowStockItems.length} تنبيهات
            </span>
          </div>
          <div className="space-y-2">
            {lowStockItems.slice(0, 3).map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl p-3 bg-white border border-red-100/50">
                <div className="min-w-0 flex-1">
                  <p className="truncate" style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", textAlign: "right" }}>{p.name}</p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "right" }}>{p.category}</p>
                </div>
                <span className="font-mono" style={{ fontSize: 14, fontWeight: 800, color: "var(--red-500)" }}>
                  {p.stock} / {p.minStock} {p.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Invoices */}
      <div className="rounded-[24px] p-5 bg-white border border-[var(--glass-border)] shadow-sm">
        <div className="flex items-center justify-between mb-3.5">
          <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>آخر العمليات الصادرة</span>
          <Link href="/invoices" style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>الكل</Link>
        </div>
        {recentInvoices.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--text-muted)]">لا توجد فواتير نشطة</p>
        ) : (
          <div className="space-y-2">
            {recentInvoices.map((inv) => {
              const statusColors = inv.status === "مدفوعة"
                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                : inv.status === "غير مدفوعة"
                ? "bg-amber-50 text-amber-700 border-amber-100"
                : "bg-gray-50 text-gray-600 border-gray-100";
              return (
                <Link key={inv.id} href={`/invoices/${inv.id}`} className="block">
                  <div className="flex items-center justify-between rounded-xl p-3 border border-gray-100 bg-gray-50/10 active:bg-gray-50">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate" style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", textAlign: "right" }}>{inv.invoiceNumber}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${statusColors}`}>{inv.status}</span>
                      </div>
                      <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "right" }}>{inv.clientName}</p>
                    </div>
                    <span className="font-mono text-sm font-black text-[var(--text-primary)]">{formatCurrency(inv.total)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
