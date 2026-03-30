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
      {/* Greeting */}
      <div>
        <p style={{ fontSize: 15, color: "var(--text-muted)" }}>مرحباً بك في</p>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)" }}>{settings.businessName}</h1>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Link href="/invoices/new" className="flex-1">
          <div
            className="flex items-center justify-center gap-2 rounded-2xl"
            style={{ height: 56, fontSize: 17, fontWeight: 800, background: "var(--primary)", color: "white" }}
          >
            <Plus className="h-5 w-5" />
            فاتورة جديدة
          </div>
        </Link>
        <Link href="/inventory" className="flex-1">
          <div
            className="flex items-center justify-center gap-2 rounded-2xl"
            style={{ height: 56, fontSize: 17, fontWeight: 700, background: "var(--surface-1)", color: "var(--primary)", border: "2px solid var(--border-default)" }}
          >
            <BarChart3 className="h-5 w-5" />
            المخزون
          </div>
        </Link>
      </div>

      {/* Invoice summary card */}
      <div className="rounded-3xl p-6" style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}>
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-5 w-5" style={{ color: "var(--green-500)" }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-muted)" }}>ملخص الفواتير</span>
        </div>
        <AnimatedCounter
          value={invoices.length}
          className="block"
          style={{ fontSize: 36, fontWeight: 800, color: "var(--text-primary)" }}
        />
        <div className="flex gap-4 mt-2">
          <span style={{ fontSize: 15, color: "var(--green-500)", fontWeight: 700 }}>{paidCount} مدفوعة</span>
          <span style={{ fontSize: 15, color: "var(--amber-500)", fontWeight: 700 }}>{unpaidCount} معلقة</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <Link href="/invoices">
          <div className="rounded-2xl p-4 text-center" style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}>
            <FileText className="h-6 w-6 mx-auto mb-1" style={{ color: "var(--blue-500)" }} />
            <AnimatedCounter value={invoices.length} className="block" style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)" }} />
            <p style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>فاتورة</p>
          </div>
        </Link>
        <Link href="/inventory">
          <div className="rounded-2xl p-4 text-center" style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}>
            <Package className="h-6 w-6 mx-auto mb-1" style={{ color: "var(--purple-500)" }} />
            <AnimatedCounter value={products.length} className="block" style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)" }} />
            <p style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>منتج</p>
          </div>
        </Link>
        <Link href="/clients">
          <div className="rounded-2xl p-4 text-center" style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}>
            <Users className="h-6 w-6 mx-auto mb-1" style={{ color: "var(--green-500)" }} />
            <AnimatedCounter value={clients.length} className="block" style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)" }} />
            <p style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>عميل</p>
          </div>
        </Link>
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <div className="rounded-3xl p-5" style={{ background: "var(--danger-soft)", border: "1px solid rgba(239,68,68,0.15)" }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5" style={{ color: "var(--red-500)" }} />
            <span style={{ fontSize: 18, fontWeight: 800, color: "var(--red-500)" }}>مخزون منخفض</span>
            <span
              className="rounded-full px-2 py-0.5"
              style={{ fontSize: 13, fontWeight: 800, background: "var(--red-500)", color: "white" }}
            >
              {lowStockItems.length}
            </span>
          </div>
          <div className="space-y-2">
            {lowStockItems.slice(0, 4).map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl p-3" style={{ background: "var(--surface-1)" }}>
                <div className="min-w-0 flex-1">
                  <p className="truncate" style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{p.name}</p>
                  <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{p.category}</p>
                </div>
                <span style={{ fontSize: 16, fontWeight: 800, color: "var(--red-500)" }}>
                  {p.stock} {p.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Invoices */}
      <div className="rounded-3xl p-5" style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}>
        <div className="flex items-center justify-between mb-3">
          <span style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>آخر الفواتير</span>
          <Link href="/invoices" style={{ fontSize: 15, fontWeight: 700, color: "var(--primary)" }}>الكل</Link>
        </div>
        {recentInvoices.length === 0 ? (
          <p className="py-6 text-center" style={{ fontSize: 16, color: "var(--text-muted)" }}>لا توجد فواتير</p>
        ) : (
          <div className="space-y-2">
            {recentInvoices.map((inv) => (
              <Link key={inv.id} href={`/invoices/${inv.id}`}>
                <div className="flex items-center justify-between rounded-xl p-3" style={{ border: "1px solid var(--border-subtle)" }}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate" style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{inv.invoiceNumber}</p>
                      <Badge variant="outline" className={`text-[11px] shrink-0 ${getStatusColor(inv.status)}`}>{inv.status}</Badge>
                    </div>
                    <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{inv.clientName}</p>
                  </div>
                  <span style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)" }}>{formatCurrency(inv.total)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
