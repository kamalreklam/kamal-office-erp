"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  FileText,
  Users,
  MoreHorizontal,
  ClipboardList,
  Layers,
  BarChart3,
  Calculator,
  Settings,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const tabs = [
  { href: "/", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/inventory", label: "المخزون", icon: Package },
  { href: "/invoices", label: "الفواتير", icon: FileText },
  { href: "/clients", label: "العملاء", icon: Users },
];

const morePages = [
  { href: "/orders", label: "تتبع الطلبات", icon: ClipboardList },
  { href: "/bundles", label: "مجموعات المنتجات", icon: Layers },
  { href: "/reports", label: "التقارير", icon: BarChart3 },
  { href: "/accounting", label: "المحاسبة", icon: Calculator },
  { href: "/settings", label: "الإعدادات", icon: Settings },
];

export function MobileTabBar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const moreActive = morePages.some((p) => pathname.startsWith(p.href));

  return (
    <>
      {/* More Menu Overlay */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
            onClick={() => setMoreOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 rounded-t-3xl"
              style={{
                background: "var(--surface-1)",
                borderTop: "1px solid var(--glass-border)",
                paddingBottom: "env(safe-area-inset-bottom, 16px)",
              }}
              onClick={(e) => e.stopPropagation()}
              dir="rtl"
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="h-1 w-10 rounded-full" style={{ background: "var(--border-strong)" }} />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-6 pb-3">
                <h2 className="text-xl font-extrabold" style={{ color: "var(--text-primary)" }}>المزيد</h2>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Links */}
              <div className="px-4 pb-4 space-y-1">
                {morePages.map((page) => {
                  const active = pathname.startsWith(page.href);
                  return (
                    <Link
                      key={page.href}
                      href={page.href}
                      onClick={() => setMoreOpen(false)}
                      className="flex items-center gap-4 rounded-2xl px-5 py-4 transition-colors"
                      style={{
                        background: active ? "var(--accent-soft)" : "transparent",
                        color: active ? "var(--primary)" : "var(--text-primary)",
                      }}
                    >
                      <page.icon className="h-6 w-6" />
                      <span className="text-lg font-bold">{page.label}</span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40"
        style={{
          background: "var(--glass-bg)",
          backdropFilter: "var(--glass-blur)",
          borderTop: "1px solid var(--glass-border)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
        dir="rtl"
      >
        <div className="flex h-16 items-stretch justify-around">
          {tabs.map((tab) => {
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 relative"
              >
                {active && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute top-0 h-[3px] w-8 rounded-full"
                    style={{ background: "var(--primary)" }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  />
                )}
                <tab.icon
                  className="h-6 w-6"
                  style={{ color: active ? "var(--primary)" : "var(--text-muted)" }}
                />
                <span
                  className="text-[11px] font-bold"
                  style={{ color: active ? "var(--primary)" : "var(--text-muted)" }}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}

          {/* More tab */}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 relative"
          >
            {moreActive && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute top-0 h-[3px] w-8 rounded-full"
                style={{ background: "var(--primary)" }}
              />
            )}
            <MoreHorizontal
              className="h-6 w-6"
              style={{ color: moreActive ? "var(--primary)" : "var(--text-muted)" }}
            />
            <span
              className="text-[11px] font-bold"
              style={{ color: moreActive ? "var(--primary)" : "var(--text-muted)" }}
            >
              المزيد
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
