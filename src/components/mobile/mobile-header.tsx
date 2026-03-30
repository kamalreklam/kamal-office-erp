"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { Bell, Sun, Moon } from "lucide-react";
import { useStore } from "@/lib/store";
import { getLowStockProducts } from "@/lib/data";

const titles: Record<string, string> = {
  "/": "الرئيسية",
  "/inventory": "المخزون",
  "/invoices": "الفواتير",
  "/invoices/new": "فاتورة جديدة",
  "/clients": "العملاء",
  "/orders": "الطلبات",
  "/bundles": "المجموعات",
  "/reports": "التقارير",
  "/accounting": "المحاسبة",
  "/settings": "الإعدادات",
};

export function MobileHeader() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { products, invoices } = useStore();

  const lowStock = useMemo(() => getLowStockProducts(products), [products]);
  const unpaid = useMemo(() => invoices.filter((i) => i.status === "غير مدفوعة"), [invoices]);
  const alertCount = lowStock.length + unpaid.length;

  const title = titles[pathname] || titles["/" + pathname.split("/")[1]] || "كمال";

  return (
    <header
      className="sticky top-0 z-40"
      style={{
        background: "var(--glass-bg)",
        backdropFilter: "var(--glass-blur)",
        borderBottom: "1px solid var(--glass-border)",
      }}
    >
      <div className="flex h-14 items-center justify-between px-4" dir="rtl">
        {/* Title */}
        <h1 className="text-lg font-extrabold" style={{ color: "var(--text-primary)" }}>
          {title}
        </h1>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ color: "var(--text-muted)" }}
          >
            {theme === "dark" ? (
              <motion.div initial={{ rotate: -90, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ duration: 0.3 }}>
                <Sun className="h-5 w-5" />
              </motion.div>
            ) : (
              <motion.div initial={{ rotate: 90, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ duration: 0.3 }}>
                <Moon className="h-5 w-5" />
              </motion.div>
            )}
          </button>

          {/* Notifications */}
          <button
            className="relative flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ color: "var(--text-muted)" }}
          >
            <Bell className={`h-5 w-5 ${alertCount > 0 ? "bell-ring" : ""}`} />
            {alertCount > 0 && (
              <span
                className="absolute top-1 left-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                style={{ background: "var(--red-500)" }}
              >
                {alertCount > 9 ? "+9" : alertCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
