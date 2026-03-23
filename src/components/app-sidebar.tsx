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
  Printer,
  Settings,
  Layers,
  BarChart3,
  Calculator,
  X,
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
}

export function AppSidebar({ open, onClose }: AppSidebarProps) {
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
      {/* Overlay */}
      {mounted && (
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ease-out lg:hidden",
            visible ? "opacity-100" : "opacity-0"
          )}
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 right-0 z-50 flex h-full w-[260px] flex-col transition-all duration-300 lg:shadow-none",
          open ? "translate-x-0" : "translate-x-full lg:translate-x-0",
          open ? "ease-[cubic-bezier(0.22,1,0.36,1)]" : "ease-[cubic-bezier(0.55,0,1,0.45)]"
        )}
        style={{
          background: "var(--surface-1)",
          borderLeft: "1px solid var(--border-default)",
        }}
      >
        {/* Accent edge gradient on left border */}
        <div className="absolute top-0 left-0 w-[3px] h-full" style={{ background: "var(--gradient-brand)", opacity: 0.4 }} />

        {/* Logo */}
        <div className="flex h-[68px] shrink-0 items-center justify-between px-5" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <Link href="/" className="flex items-center gap-3" onClick={onClose}>
            {settings.logo ? (
              <Image src={settings.logo} alt="Logo" width={40} height={40} className="h-10 w-10 rounded-xl object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl avatar-gradient shadow-sm">
                <Printer className="h-5 w-5" />
              </div>
            )}
            <div>
              <h1 className="text-sm font-bold leading-tight text-gradient-brand">
                {settings.businessName.split(" ")[0] || "كمال"}
              </h1>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {settings.businessName.split(" ").slice(1).join(" ") || "للتجهيزات المكتبية"}
              </p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors hover:text-foreground lg:hidden"
            style={{ color: "var(--text-muted)" }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {navItems.map((item, i) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                style={{
                  transitionDelay: open ? `${50 + i * 30}ms` : "0ms",
                  ...(isActive ? {
                    background: "var(--accent-soft)",
                    color: "var(--primary)",
                  } : {
                    color: "var(--text-secondary)",
                  }),
                }}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-all duration-200",
                  !isActive && "hover:text-foreground",
                  open ? "translate-x-0 opacity-100" : "lg:translate-x-0 lg:opacity-100"
                )}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--surface-2)"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-full" style={{ background: "var(--gradient-brand)" }} />
                )}
                <item.icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 p-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <div className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
            <p className="font-medium">{settings.businessName}</p>
            <p className="mt-0.5">{settings.address}</p>
          </div>
        </div>
      </aside>
    </>
  );
}
