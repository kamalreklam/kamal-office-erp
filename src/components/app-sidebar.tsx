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

  // Track mounted state so overlay can animate out before unmounting
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      // Trigger enter animation on next frame
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <>
      {/* Overlay with fade animation */}
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
          "fixed top-0 right-0 z-50 flex h-full w-[272px] flex-col border-l border-border bg-sidebar shadow-xl transition-all duration-300 lg:shadow-none",
          open
            ? "translate-x-0 lg:translate-x-0"
            : "translate-x-full lg:translate-x-0",
          open
            ? "ease-[cubic-bezier(0.22,1,0.36,1)]"
            : "ease-[cubic-bezier(0.55,0,1,0.45)]"
        )}
      >
        {/* Logo */}
        <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-border px-5">
          <Link href="/" className="flex items-center gap-3" onClick={onClose}>
            {settings.logo ? (
              <Image
                src={settings.logo}
                alt="Logo"
                width={40}
                height={40}
                className="h-10 w-10 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Printer className="h-5 w-5" />
              </div>
            )}
            <div>
              <h1 className="text-base font-bold leading-tight text-foreground">
                {settings.businessName.split(" ")[0] || "كمال"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {settings.businessName.split(" ").slice(1).join(" ") || "للتجهيزات المكتبية"}
              </p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-4">
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
                }}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium transition-all duration-300",
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  // Stagger slide-in on mobile open
                  open
                    ? "translate-x-0 opacity-100"
                    : "lg:translate-x-0 lg:opacity-100"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-border p-5">
          <div className="text-center text-xs text-muted-foreground">
            <p className="font-medium">{settings.businessName}</p>
            <p className="mt-1">{settings.address}</p>
          </div>
        </div>
      </aside>
    </>
  );
}
