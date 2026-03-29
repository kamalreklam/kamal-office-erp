"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
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
  ClipboardList,
  Layers,
  BarChart3,
  Calculator,
  Settings,
  Plus,
  Search,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/data";

const pages = [
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

const actions = [
  { href: "/invoices/new", label: "إنشاء فاتورة جديدة", icon: Plus, keywords: "new invoice create" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { products, clients, invoices } = useStore();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

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
    <>
      {/* Trigger button in header */}
      <button
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-xl px-3 py-1.5 text-xs transition-colors sm:flex"
        style={{
          background: "var(--surface-2)",
          color: "var(--text-muted)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <Search className="h-3.5 w-3.5" />
        <span>بحث...</span>
        <kbd
          className="rounded px-1.5 py-0.5 text-[10px] font-medium"
          style={{ background: "var(--surface-3)", color: "var(--text-muted)" }}
        >
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen} title="بحث سريع" description="ابحث عن صفحة أو منتج أو عميل أو فاتورة">
        <Command dir="rtl">
          <CommandInput placeholder="ابحث عن صفحة، منتج، عميل، فاتورة..." />
          <CommandList>
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
                      {formatCurrency(p.price)} · {p.stock} {p.unit}
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
      </CommandDialog>
    </>
  );
}
