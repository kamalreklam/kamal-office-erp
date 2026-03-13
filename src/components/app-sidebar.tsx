"use client";

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
  { href: "/settings", label: "الإعدادات", icon: Settings },
];

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function AppSidebar({ open, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const { settings } = useStore();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 right-0 z-50 flex h-full w-[260px] flex-col border-l border-border bg-white shadow-sm transition-transform duration-300 ease-in-out lg:translate-x-0 lg:shadow-none",
          open ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5">
          <Link href="/" className="flex items-center gap-2.5" onClick={onClose}>
            {settings.logo ? (
              <Image
                src={settings.logo}
                alt="Logo"
                width={36}
                height={36}
                className="h-9 w-9 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Printer className="h-5 w-5" />
              </div>
            )}
            <div>
              <h1 className="text-sm font-bold leading-tight text-foreground">
                {settings.businessName.split(" ")[0] || "كمال"}
              </h1>
              <p className="text-[11px] text-muted-foreground">
                {settings.businessName.split(" ").slice(1).join(" ") || "للتجهيزات المكتبية"}
              </p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3 stagger-list">
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
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <item.icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-border p-4">
          <div className="text-center text-[11px] text-muted-foreground">
            <p>{settings.businessName}</p>
            <p className="mt-0.5">{settings.address}</p>
          </div>
        </div>
      </aside>
    </>
  );
}
