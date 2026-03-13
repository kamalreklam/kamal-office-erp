"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Menu,
  LayoutDashboard,
  Package,
  FileText,
  Users,
  ClipboardList,
  Layers,
  BarChart3,
  Calculator,
  Settings,
  Printer,
  Bell,
  AlertTriangle,
  DollarSign,
  X,
} from "lucide-react";
import { AppSidebar } from "./app-sidebar";
import { useStore } from "@/lib/store";
import { getLowStockProducts, formatCurrency } from "@/lib/data";

const pageMap: Record<string, { title: string; icon: typeof LayoutDashboard }> = {
  "/": { title: "لوحة التحكم", icon: LayoutDashboard },
  "/inventory": { title: "المخزون", icon: Package },
  "/invoices": { title: "الفواتير", icon: FileText },
  "/clients": { title: "العملاء", icon: Users },
  "/orders": { title: "تتبع الطلبات", icon: ClipboardList },
  "/bundles": { title: "مجموعات المنتجات", icon: Layers },
  "/reports": { title: "التقارير", icon: BarChart3 },
  "/accounting": { title: "المحاسبة", icon: Calculator },
  "/settings": { title: "الإعدادات", icon: Settings },
};

function getPageInfo(pathname: string) {
  if (pageMap[pathname]) return pageMap[pathname];
  const base = "/" + pathname.split("/")[1];
  if (pageMap[base]) return pageMap[base];
  return { title: "كمال للتجهيزات المكتبية", icon: LayoutDashboard };
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { settings, products, invoices } = useStore();
  const page = getPageInfo(pathname);
  const PageIcon = page.icon;

  const lowStock = useMemo(() => getLowStockProducts(products), [products]);
  const unpaidInvoices = useMemo(
    () => invoices.filter((i) => i.status === "غير مدفوعة"),
    [invoices]
  );
  const alertCount = lowStock.length + unpaidInvoices.length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="lg:mr-[272px]">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-border/60 bg-white/80 glass">
          <div className="flex h-[72px] items-center justify-between px-3 sm:px-5 md:px-7 lg:px-10">
            {/* Right side: menu button */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>

              {/* Desktop: breadcrumb-style page indicator */}
              <div className="hidden items-center gap-2.5 text-sm lg:flex">
                <span className="text-muted-foreground">{settings.businessName}</span>
                <span className="text-muted-foreground/40">/</span>
                <div className="flex items-center gap-2">
                  <PageIcon className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-foreground">{page.title}</span>
                </div>
              </div>
            </div>

            {/* Center: logo (mobile only) */}
            <div className="lg:hidden">
              {settings.logo ? (
                <img src={settings.logo} alt="" className="h-11 w-11 rounded-xl object-cover" />
              ) : (
                <Printer className="h-6 w-6 text-primary" />
              )}
            </div>

            {/* Left side: actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Notification bell */}
              <div ref={notifRef} className="relative">
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Bell className="h-[18px] w-[18px]" />
                  {alertCount > 0 && (
                    <span className="absolute top-1 left-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white ring-2 ring-white sm:top-1.5 sm:left-1.5 sm:h-[18px] sm:min-w-[18px] sm:text-[10px]">
                      {alertCount > 9 ? "+9" : alertCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute left-0 top-full z-50 mt-2 w-[calc(100vw-2rem)] max-w-80 rounded-xl border border-border bg-white shadow-2xl dropdown-enter sm:w-80" dir="rtl">
                    <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                      <h3 className="text-sm font-bold text-foreground">التنبيهات</h3>
                      {alertCount > 0 && (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                          {alertCount}
                        </span>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto sm:max-h-80">
                      {alertCount === 0 ? (
                        <div className="flex flex-col items-center py-8 text-muted-foreground">
                          <Bell className="mb-2 h-8 w-8 opacity-20" />
                          <p className="text-sm">لا توجد تنبيهات</p>
                        </div>
                      ) : (
                        <div className="p-2 space-y-1">
                          {lowStock.slice(0, 5).map((p) => (
                            <Link
                              key={p.id}
                              href="/inventory"
                              onClick={() => setNotifOpen(false)}
                              className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-accent sm:p-3"
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 sm:h-9 sm:w-9 sm:rounded-xl">
                                <AlertTriangle className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  المخزون: {p.stock} {p.unit} (الحد الأدنى: {p.minStock})
                                </p>
                              </div>
                            </Link>
                          ))}
                          {lowStock.length > 5 && (
                            <Link
                              href="/inventory"
                              onClick={() => setNotifOpen(false)}
                              className="block px-3 py-2 text-center text-xs font-medium text-primary hover:underline"
                            >
                              +{lowStock.length - 5} منتجات أخرى بمخزون منخفض
                            </Link>
                          )}
                          {unpaidInvoices.slice(0, 5).map((inv) => (
                            <Link
                              key={inv.id}
                              href={`/invoices/${inv.id}`}
                              onClick={() => setNotifOpen(false)}
                              className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-accent sm:p-3"
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 sm:h-9 sm:w-9 sm:rounded-xl">
                                <DollarSign className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground truncate">{inv.invoiceNumber}</p>
                                <p className="text-xs text-muted-foreground">
                                  {inv.clientName} · {formatCurrency(inv.total)}
                                </p>
                              </div>
                            </Link>
                          ))}
                          {unpaidInvoices.length > 5 && (
                            <Link
                              href="/invoices"
                              onClick={() => setNotifOpen(false)}
                              className="block px-3 py-2 text-center text-xs font-medium text-primary hover:underline"
                            >
                              +{unpaidInvoices.length - 5} فواتير غير مدفوعة أخرى
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Desktop: logo */}
              <div className="hidden h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm lg:flex">
                {settings.logo ? (
                  <img src={settings.logo} alt="Logo" className="h-9 w-9 rounded-xl object-cover" />
                ) : (
                  <Printer className="h-4 w-4" />
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="p-5 md:p-7 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
