"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
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
  X,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";

const navItems = [
  { href: "/", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/inventory", label: "المخزون", icon: Package },
  { href: "/invoices", label: "الفواتير", icon: FileText },
  { href: "/clients", label: "العملاء", icon: Users },
  { href: "/orders", label: "تتبع الطلبات", icon: ClipboardList },
  { href: "/bundles", label: "مجموعات المنتجات", icon: Layers },
  { href: "/reports", label: "التقارير", icon: BarChart3 },
  { href: "/accounting", label: "المحاسبة", icon: Calculator },
  { href: "/settings", label: "الإعدادات", icon: Settings },
];

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function AppSidebar({ open, onClose, collapsed, onToggleCollapse }: AppSidebarProps) {
  const pathname = usePathname();
  const { settings } = useStore();

  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <>
      {/* Mobile overlay */}
      {mounted && (
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ease-out lg:hidden",
            visible ? "opacity-100" : "opacity-0"
          )}
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 right-0 z-50 flex h-dvh flex-col",
          "transition-[width,transform] duration-300 ease-in-out",
          collapsed ? "lg:w-20" : "lg:w-[260px]",
          "w-[260px]",
          open
            ? "translate-x-0 shadow-[0_0_40px_rgba(0,0,0,0.2)]"
            : "translate-x-full lg:translate-x-0 lg:shadow-none"
        )}
        style={{
          background: "var(--surface-1)",
          borderInlineStart: "1px solid var(--border-subtle)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        {/* ── Brand / Logo header ─────────────── */}
        <div
          className="flex h-[64px] shrink-0 items-center px-5"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          {/* Logo mark + text */}
          <Link
            href="/"
            onClick={onClose}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-3",
              collapsed && "lg:justify-center"
            )}
          >
            {settings.logo ? (
              <Image
                src={settings.logo}
                alt="Logo"
                width={34}
                height={34}
                className="h-[34px] w-[34px] shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div
                className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg"
                style={{ background: "var(--primary)" }}
              >
                <Printer className="h-[18px] w-[18px] text-white" />
              </div>
            )}

            <div
              className={cn(
                "min-w-0 overflow-hidden transition-[max-width,opacity] duration-300",
                collapsed ? "lg:max-w-0 lg:opacity-0" : "max-w-[180px] opacity-100"
              )}
            >
              <span
                className="block truncate text-[15px] font-semibold leading-tight"
                style={{ color: "var(--primary)" }}
              >
                {settings.businessName || "كمال"}
              </span>
            </div>
          </Link>

          {/* Mobile close */}
          <button
            type="button"
            title="إغلاق"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-[var(--surface-2)] lg:hidden"
            style={{ color: "var(--text-muted)" }}
          >
            <X className="h-4 w-4" />
          </button>

          {/* Desktop collapse toggle */}
          <button
            type="button"
            title="تصغير"
            onClick={onToggleCollapse}
            className={cn(
              "hidden h-8 w-8 shrink-0 items-center justify-center rounded-md transition-all lg:flex",
              "hover:bg-[var(--surface-2)]",
              collapsed && "lg:hidden"
            )}
            style={{ color: "var(--text-muted)" }}
          >
            <ChevronLeft className="h-[18px] w-[18px]" />
          </button>
        </div>

        {/* ── Navigation ─────────────────────── */}
        <nav
          className={cn(
            "flex flex-1 flex-col overflow-y-auto py-2",
            collapsed ? "lg:px-2 px-3" : "px-3"
          )}
        >
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "group mt-1 flex items-center gap-3 rounded-md px-3 py-[9px]",
                  "text-[13.5px] font-medium transition-colors duration-150",
                  collapsed && "lg:justify-center lg:px-0",
                  isActive
                    ? "text-[var(--primary)]"
                    : "hover:bg-[var(--surface-2)]"
                )}
                style={
                  isActive
                    ? {
                        background: "rgba(115,103,240,0.12)",
                        color: "var(--primary)",
                      }
                    : { color: "var(--text-secondary)" }
                }
              >
                <item.icon
                  className={cn(
                    "shrink-0 transition-all duration-300",
                    isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100",
                    collapsed ? "lg:h-5 lg:w-5 h-[18px] w-[18px]" : "h-[18px] w-[18px]"
                  )}
                />
                <span
                  className={cn(
                    "truncate transition-[max-width,opacity] duration-300",
                    collapsed ? "lg:max-w-0 lg:opacity-0 lg:overflow-hidden" : "max-w-full opacity-100"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* ── Footer ─────────────────────────── */}
        <div style={{ borderTop: "1px solid var(--border-subtle)" }}>
          {collapsed ? (
            /* Expand button when icon-only mode */
            <div className="hidden lg:flex px-2 py-3">
              <button
                type="button"
                title="توسيع"
                onClick={onToggleCollapse}
                className="flex h-9 w-full items-center justify-center rounded-md transition-colors hover:bg-[var(--surface-2)]"
                style={{ color: "var(--text-muted)" }}
              >
                <ChevronLeft className="h-4 w-4 rotate-180" />
              </button>
            </div>
          ) : (
            <div className="px-5 py-3">
              <p
                className="truncate text-[11px] font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                {settings.businessName}
              </p>
              {settings.address && (
                <p
                  className="mt-0.5 truncate text-[11px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  {settings.address}
                </p>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
