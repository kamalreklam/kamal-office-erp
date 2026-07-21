"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Package,
  FileText,
  Users,
  Layers,
  BarChart3,
  Calculator,
  Settings,
  Plus,
  Search,
  Truck,
  ShoppingCart,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/data";

const pages = [
  { href: "/", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/inventory", label: "المخزون", icon: Package },
  { href: "/invoices", label: "الفواتير", icon: FileText },
  { href: "/clients", label: "العملاء", icon: Users },
  { href: "/suppliers", label: "الموردون", icon: Truck },
  { href: "/purchases", label: "المشتريات", icon: ShoppingCart },
  { href: "/bundles", label: "مجموعات المنتجات", icon: Layers },
  { href: "/reports", label: "التقارير", icon: BarChart3 },
  { href: "/accounting", label: "المحاسبة", icon: Calculator },
  { href: "/settings", label: "الإعدادات", icon: Settings },
];

const actions = [
  { href: "/invoices/new", label: "إنشاء فاتورة جديدة", icon: Plus, keywords: "new invoice create" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { products, clients, invoices } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }

      // Do not trigger global hotkeys if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case "i":
            e.preventDefault();
            router.push("/invoices/new");
            break;
          case "p":
            e.preventDefault();
            router.push("/inventory/new");
            break;
          case "c":
            e.preventDefault();
            router.push("/clients/new");
            break;
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [router]);

  // Close on click outside the trigger/panel — no full-page modal backdrop
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const topProducts = useMemo(() => products.slice(0, 8), [products]);
  const topClients = useMemo(() => clients.slice(0, 6), [clients]);
  const topInvoices = useMemo(
    () => [...invoices].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6),
    [invoices]
  );

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button in header */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="بحث سريع"
        className="flex items-center gap-2 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs transition-colors"
        style={{
          background: "var(--surface-2)",
          color: "var(--text-muted)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">بحث...</span>
        <kbd
          className="hidden sm:inline rounded px-1.5 py-0.5 text-[11px] font-medium"
          style={{ background: "var(--surface-3)", color: "var(--text-muted)" }}
        >
          ⌘K
        </kbd>
      </button>

      {/* Anchored dropdown panel — no full-page modal/backdrop, closes on outside click or Escape */}
      {open && (
        <div
          className="absolute end-0 top-full z-50 mt-2 w-[92vw] max-w-md rounded-2xl border shadow-2xl overflow-hidden"
          style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
        >
          <Command dir="rtl">
            <CommandInput placeholder="ابحث عن صفحة، منتج، عميل، فاتورة..." autoFocus />
            <CommandList className="max-h-[60vh]">
              <CommandEmpty>لا توجد نتائج</CommandEmpty>

              {/* Quick actions */}
              <CommandGroup heading="إجراءات سريعة">
                {actions.map((action) => (
                  <CommandItem key={action.href} onSelect={() => go(action.href)} keywords={[action.keywords]}>
                    <action.icon className="h-4 w-4" style={{ color: "var(--primary)" }} />
                    <span>{action.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandSeparator />

              {/* Pages */}
              <CommandGroup heading="الصفحات">
                {pages.map((page) => (
                  <CommandItem key={page.href} onSelect={() => go(page.href)} keywords={[page.label]}>
                    <page.icon className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                    <span>{page.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandSeparator />

              {/* Products */}
              {topProducts.length > 0 && (
                <CommandGroup heading="المنتجات">
                  {topProducts.map((p) => (
                    <CommandItem key={p.id} onSelect={() => go("/inventory")} keywords={[p.name, p.category, p.sku]}>
                      <Package className="h-4 w-4" style={{ color: "var(--purple-500)" }} />
                      <span className="flex-1 truncate">{p.name}</span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {formatCurrency(p.sellingPrice)} · {p.stock} {p.unit}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              <CommandSeparator />

              {/* Clients */}
              {topClients.length > 0 && (
                <CommandGroup heading="العملاء">
                  {topClients.map((c) => (
                    <CommandItem key={c.id} onSelect={() => go("/clients")} keywords={[c.name, c.phone, c.address]}>
                      <Users className="h-4 w-4" style={{ color: "var(--blue-500)" }} />
                      <span className="flex-1 truncate">{c.name}</span>
                      {c.phone && (
                        <span className="text-xs" dir="ltr" style={{ color: "var(--text-muted)" }}>{c.phone}</span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              <CommandSeparator />

              {/* Invoices */}
              {topInvoices.length > 0 && (
                <CommandGroup heading="الفواتير">
                  {topInvoices.map((inv) => (
                    <CommandItem key={inv.id} onSelect={() => go(`/invoices/${inv.id}`)} keywords={[inv.invoiceNumber, inv.clientName, inv.status]}>
                      <FileText className="h-4 w-4" style={{ color: "var(--green-500)" }} />
                      <span className="flex-1 truncate">{inv.invoiceNumber} — {inv.clientName}</span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {formatCurrency(inv.total)}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}
