"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { motion, useScroll, useSpring } from "framer-motion";
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
  Sun,
  Moon,
} from "lucide-react";
import { AppSidebar } from "./app-sidebar";
import { PageTransition } from "./page-transition";
import { CommandPalette } from "./command-palette";
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
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { settings, products, invoices, connectionStatus } = useStore();

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  const handleToggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  };

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

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });

  return (
    <div className="min-h-screen" style={{ background: "var(--ground)" }}>
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Main content — offset right for the sidebar */}
      <div
        className="transition-[margin] duration-300"
        style={{ marginRight: collapsed ? 80 : 260 }}
      >
        {/* Floating navbar */}
        <div className="sticky top-0 z-30 px-5 pt-4">
          {/* Scroll progress bar inside the navbar card */}
          <div className="relative overflow-hidden rounded-xl shadow-sm" style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border-subtle)",
          }}>
            <motion.div
              className="absolute top-0 right-0 left-0 h-[2px] origin-right"
              style={{ scaleX, background: "var(--gradient-brand)" }}
            />

            <div className="flex h-[54px] items-center justify-between px-4">
              {/* Right side: mobile menu + breadcrumb */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  title="فتح القائمة"
                  className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[var(--surface-2)] lg:hidden"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Menu className="h-5 w-5" />
                </button>

                {/* Desktop breadcrumb */}
                <div className="hidden items-center gap-2 text-sm lg:flex">
                  <span style={{ color: "var(--text-muted)" }}>
                    {settings.businessName}
                  </span>
                  <span style={{ color: "var(--border-strong)" }}>/</span>
                  <div className="flex items-center gap-1.5">
                    <PageIcon className="h-4 w-4" style={{ color: "var(--primary)" }} />
                    <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                      {page.title}
                    </span>
                  </div>
                </div>
              </div>

              {/* Center: logo (mobile only) */}
              <div className="lg:hidden">
                {settings.logo ? (
                  <img
                    src={settings.logo}
                    alt=""
                    className="h-8 w-8 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg avatar-gradient">
                    <Printer className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>

              {/* Left side: actions */}
              <div className="flex items-center gap-1">
                <CommandPalette />

                {/* Theme toggle */}
                {mounted && (
                  <button
                    type="button"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    title={theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}
                    className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[var(--surface-2)]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {theme === "dark" ? (
                      <motion.div
                        initial={{ rotate: -90, scale: 0 }}
                        animate={{ rotate: 0, scale: 1 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <Sun className="h-[18px] w-[18px]" />
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ rotate: 90, scale: 0 }}
                        animate={{ rotate: 0, scale: 1 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <Moon className="h-[18px] w-[18px]" />
                      </motion.div>
                    )}
                  </button>
                )}

                {/* Notification bell */}
                <div ref={notifRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setNotifOpen(!notifOpen)}
                    title="التنبيهات"
                    className="relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[var(--surface-2)]"
                    style={{
                      color: "var(--text-muted)",
                      background: notifOpen ? "var(--surface-2)" : undefined,
                    }}
                  >
                    <Bell
                      className={`h-[18px] w-[18px] ${alertCount > 0 && !notifOpen ? "bell-ring" : ""}`}
                    />
                    {alertCount > 0 && (
                      <span
                        className="absolute top-1 left-1 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[9px] font-bold text-white"
                        style={{ background: "var(--red-500)" }}
                      >
                        {alertCount > 9 ? "+9" : alertCount}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div
                      className="absolute left-0 top-full z-50 mt-2 w-[calc(100vw-2rem)] max-w-80 overflow-hidden rounded-2xl border sm:w-80"
                      style={{
                        background: "var(--surface-1)",
                        borderColor: "var(--glass-border)",
                        boxShadow: "var(--shadow-lg)",
                      }}
                      dir="rtl"
                    >
                      <div
                        className="flex items-center justify-between px-4 py-3"
                        style={{ borderBottom: "1px solid var(--border-subtle)" }}
                      >
                        <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                          التنبيهات
                        </h3>
                        {alertCount > 0 && (
                          <span className="badge-danger rounded-full px-2 py-0.5 text-xs font-bold">
                            {alertCount}
                          </span>
                        )}
                      </div>
                      <div className="max-h-72 overflow-y-auto sm:max-h-80">
                        {alertCount === 0 ? (
                          <div
                            className="flex flex-col items-center py-8"
                            style={{ color: "var(--text-muted)" }}
                          >
                            <Bell className="mb-2 h-8 w-8 opacity-20" />
                            <p className="text-sm">لا توجد تنبيهات</p>
                          </div>
                        ) : (
                          <div className="space-y-1 p-2">
                            {lowStock.slice(0, 5).map((p) => (
                              <Link
                                key={p.id}
                                href="/inventory"
                                onClick={() => setNotifOpen(false)}
                                className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-[var(--surface-2)] sm:p-3"
                                style={{ color: "var(--text-primary)" }}
                              >
                                <div
                                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                                  style={{
                                    background: "var(--warning-soft)",
                                    color: "var(--amber-500)",
                                  }}
                                >
                                  <AlertTriangle className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium">{p.name}</p>
                                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                    المخزون: {p.stock} {p.unit} (الحد الأدنى: {p.minStock})
                                  </p>
                                </div>
                              </Link>
                            ))}
                            {unpaidInvoices.slice(0, 5).map((inv) => (
                              <Link
                                key={inv.id}
                                href={`/invoices/${inv.id}`}
                                onClick={() => setNotifOpen(false)}
                                className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-[var(--surface-2)] sm:p-3"
                                style={{ color: "var(--text-primary)" }}
                              >
                                <div
                                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                                  style={{
                                    background: "var(--info-soft)",
                                    color: "var(--blue-500)",
                                  }}
                                >
                                  <DollarSign className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium">
                                    {inv.invoiceNumber}
                                  </p>
                                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                    {inv.clientName} · {formatCurrency(inv.total)}
                                  </p>
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Offline banner */}
        {connectionStatus === "offline" && (
          <div
            className="mx-5 mt-3 rounded-xl px-4 py-2 text-center text-sm font-medium"
            style={{ background: "var(--warning-soft)", color: "var(--amber-500)" }}
          >
            <AlertTriangle className="inline h-4 w-4 ml-1" />
            غير متصل بقاعدة البيانات — البيانات المعروضة قد تكون قديمة
          </div>
        )}

        {/* Page content */}
        <main className="p-5 md:p-6 lg:p-7">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
