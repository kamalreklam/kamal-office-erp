"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { ResponsiveShell } from "@/components/responsive-shell";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { MobileBundles } from "@/components/mobile/mobile-bundles";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Layers, Plus, Pencil, Trash2, Droplets, AlertTriangle, Search, Printer, Package } from "lucide-react";
import { useStore, type BundleItem } from "@/lib/store";
import { type Product, formatCurrency } from "@/lib/data";
import { toast } from "sonner";

// ── Shared helpers ────────────────────────────────────────────────────────────

const colorOrder = ["C", "M", "Y", "BK", "LC", "LM"];
const typeOrder = ["printer", "ink", "tank", "other"] as const;

export const colorStyles: Record<string, { light: string; dark: string; textLight: string; textDark: string; dot: string }> = {
  C:  { light: "#e0f7fa", dark: "rgba(8,145,178,0.2)",   textLight: "#0e7490", textDark: "#67e8f9", dot: "#06b6d4" },
  M:  { light: "#fce4ec", dark: "rgba(190,24,93,0.2)",   textLight: "#be185d", textDark: "#f9a8d4", dot: "#ec4899" },
  Y:  { light: "#fff8e1", dark: "rgba(161,98,7,0.2)",    textLight: "#a16207", textDark: "#fcd34d", dot: "#eab308" },
  BK: { light: "#f3f4f6", dark: "rgba(75,85,99,0.3)",    textLight: "#1f2937", textDark: "#e5e7eb", dot: "#374151" },
  LC: { light: "#e0f2fe", dark: "rgba(14,165,233,0.2)",  textLight: "#0369a1", textDark: "#7dd3fc", dot: "#38bdf8" },
  LM: { light: "#ffe4e6", dark: "rgba(225,29,72,0.2)",   textLight: "#be123c", textDark: "#fda4af", dot: "#fb7185" },
};

export function getColorKey(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("light cyan")    || n === "lc") return "LC";
  if (n.includes("light magenta") || n === "lm") return "LM";
  if (n.includes("cyan")          || n === "c")  return "C";
  if (n.includes("magenta")       || n === "m")  return "M";
  if (n.includes("yellow")        || n === "y")  return "Y";
  if (n.includes("black")         || n === "bk") return "BK";
  return "";
}

export function detectType(product: Product): NonNullable<BundleItem["componentType"]> {
  const cat = product.category.toLowerCase();
  const name = product.name.toLowerCase();
  if (cat.includes("printer") || cat === "printers") return "printer";
  if (name.includes("tank") || cat.includes("tank")) return "tank";
  if (getColorKey(name) !== "") return "ink";
  return "other";
}

export type ResolvedItem = BundleItem & {
  product?: Product;
  colorKey: string;
  type: NonNullable<BundleItem["componentType"]>;
};

export function resolveItems(items: BundleItem[], products: Product[]): ResolvedItem[] {
  return items
    .map(item => {
      const product = products.find(p => p.id === item.productId);
      const colorKey = getColorKey(item.productName);
      const type = (item.componentType ?? (product ? detectType(product) : "other")) as NonNullable<BundleItem["componentType"]>;
      return { ...item, product, colorKey, type };
    })
    .sort((a, b) => {
      const ti = typeOrder.indexOf(a.type);
      const tj = typeOrder.indexOf(b.type);
      if (ti !== tj) return ti - tj;
      const ci = colorOrder.indexOf(a.colorKey);
      const cj = colorOrder.indexOf(b.colorKey);
      return (ci === -1 ? 99 : ci) - (cj === -1 ? 99 : cj);
    });
}

export const itemSell = (item: BundleItem, product?: Product) =>
  item.sellingPrice ?? product?.price ?? 0;
export const itemCost = (item: BundleItem, product?: Product) =>
  item.costPrice ?? product?.price ?? 0;

// ── Page ─────────────────────────────────────────────────────────────────────

export default function BundlesPage() {
  const isMobile = useIsMobile();
  if (isMobile) return <AppShell><MobileBundles /></AppShell>;
  return <DesktopBundles />;
}

function ItemIcon({ type, colorKey, size = "sm" }: { type: ResolvedItem["type"]; colorKey: string; size?: "sm" | "md" }) {
  const cs = colorStyles[colorKey];
  const cls = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  if (type === "printer") return <Printer className={`${cls} shrink-0 text-slate-500`} />;
  if (type === "tank")    return <Droplets className={`${cls} shrink-0 text-blue-400`} />;
  if (cs) return <div className={size === "md" ? "h-3.5 w-3.5 rounded-full shrink-0" : "h-3 w-3 rounded-full shrink-0"} style={{ backgroundColor: cs.dot }} />;
  return <Package className={`${cls} shrink-0 text-muted-foreground`} />;
}

function DesktopBundles() {
  const { bundles, products, deleteBundle } = useStore();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [search, setSearch] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingBundle, setDeletingBundle] = useState<(typeof bundles)[0] | null>(null);

  const filtered = search
    ? bundles.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))
    : bundles;

  const totalValue = bundles.reduce((sum, bundle) => {
    const items = resolveItems(bundle.items, products);
    const raw = items.reduce((s, it) => s + itemSell(it, it.product) * it.quantity, 0);
    return sum + raw * (1 - bundle.discount / 100);
  }, 0);

  function isBroken(bundle: (typeof bundles)[0]) {
    return bundle.items.some(item => !products.find(p => p.id === item.productId));
  }

  function confirmDelete(bundle: (typeof bundles)[0]) {
    setDeletingBundle(bundle);
    setDeleteDialogOpen(true);
  }

  function handleDelete() {
    if (!deletingBundle) return;
    deleteBundle(deletingBundle.id);
    toast.success("تم حذف المجموعة");
    setDeleteDialogOpen(false);
  }

  return (
    <ResponsiveShell>
      <div className="space-y-6">
        {/* Banner header widget */}
        <div className="relative overflow-hidden rounded-3xl bg-[var(--surface-1)] border border-[var(--border-default)] p-6 shadow-sm">
          {/* Cyan/Magenta CMYK flows in background */}
          <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-cyan-400/10 blur-[60px]" />
          <div className="absolute left-10 -bottom-20 h-40 w-40 rounded-full bg-pink-400/10 blur-[60px]" />
          
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-[var(--text-primary)] leading-tight">المجموعات</h1>
              <p className="text-[13px] text-[var(--text-muted)] mt-1.5 font-medium">مجموعات منتجات جاهزة للتعبئة أو الشحن المباشر للعميل</p>
              {bundles.length > 0 && (
                <div className="mt-3.5 flex items-center gap-4 text-xs font-bold text-[var(--text-secondary)]">
                  <span>
                    عدد المجموعات: <span className="text-sm font-black text-[var(--text-primary)] font-mono">{bundles.length}</span>
                  </span>
                  <span className="h-3 w-px bg-[var(--border-default)]" />
                  <span>
                    إجمالي القيمة: <span className="text-sm font-black text-[var(--brand-primary)] font-mono">{formatCurrency(totalValue)}</span>
                  </span>
                </div>
              )}
            </div>
            
            <Button 
              className="gap-1.5 h-9 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] text-white font-bold text-[13px]" 
              onClick={() => router.push("/bundles/new")}
            >
              <Plus className="h-4.5 w-4.5" />
              <span>مجموعة جديدة</span>
            </Button>
          </div>
        </div>

        {/* Search */}
        {bundles.length > 0 && (
          <div className="relative max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <Input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="ابحث عن مجموعة بالاسم..." 
              className="pr-9 h-10 rounded-xl border-[var(--border-default)] bg-[var(--surface-1)] text-[14px]" 
            />
          </div>
        )}

        {/* Empty state */}
        {bundles.length === 0 ? (
          <div className="m3-card bg-[var(--surface-1)] flex flex-col items-center py-20 text-center">
            <Layers className="mb-4 h-14 w-14 text-[var(--text-muted)] opacity-30" />
            <p className="text-lg font-black text-[var(--text-primary)]">لا توجد مجموعات بعد</p>
            <p className="mt-2 text-[13px] text-[var(--text-muted)] max-w-xs leading-relaxed">أنشئ مجموعة تضم طابعات ومحابر متوافقة لتسهيل إدراجها داخل الفاتورة بنقرة واحدة</p>
            <Button 
              className="mt-5 gap-1.5 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] text-white font-bold" 
              onClick={() => router.push("/bundles/new")}
            >
              <Plus className="h-4 w-4" />
              <span>إنشاء أول مجموعة</span>
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-[var(--text-muted)] font-medium">لا توجد نتائج مطابقة لـ &quot;{search}&quot;</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(bundle => {
              const resolved = resolveItems(bundle.items, products);
              const broken = isBroken(bundle);
              const hasPrinter = resolved.some(it => it.type === "printer");
              const multiType = new Set(resolved.map(it => it.type)).size > 1;

              const rawSell = resolved.reduce((s, it) => s + itemSell(it, it.product) * it.quantity, 0);
              const totalSell = rawSell * (1 - bundle.discount / 100);
              const hasMarginData = resolved.some(it => it.costPrice !== undefined);
              const rawCost = resolved.reduce((s, it) => s + itemCost(it, it.product) * it.quantity, 0);
              const margin = rawSell > 0 ? ((rawSell - rawCost) / rawSell * 100) : 0;

              const groups = typeOrder
                .map(t => ({ type: t, label: t === "printer" ? "طابعة" : t === "ink" ? "حبر" : t === "tank" ? "خزان" : "أخرى", items: resolved.filter(it => it.type === t) }))
                .filter(g => g.items.length > 0);

              return (
                <div 
                  key={bundle.id} 
                  className={`m3-card relative overflow-hidden bg-[var(--surface-1)] p-5 hover-lift transition-all duration-300 border ${
                    broken ? "border-amber-400" : "border-[var(--border-default)]"
                  }`}
                >
                  {/* Accent gradient top line */}
                  <div 
                    className="absolute top-0 right-0 left-0 h-1.5"
                    style={{ background: hasPrinter ? "linear-gradient(90deg, #1E293B, #475569)" : "linear-gradient(90deg, #0EA5E9, #DB2777, #EAB308)" }}
                  />

                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 pt-1">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm ${
                        hasPrinter ? "bg-slate-800" : "bg-gradient-to-br from-cyan-500 via-pink-500 to-yellow-500"
                      }`}>
                        {hasPrinter ? <Printer className="h-5 w-5" /> : <Droplets className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="text-[14px] font-black text-[var(--text-primary)] truncate">{bundle.name}</h3>
                          {broken && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-[9px] font-bold">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              غير مكتمل
                            </span>
                          )}
                        </div>
                        {bundle.description && (
                          <p className="text-[11px] text-[var(--text-muted)] line-clamp-1 mt-0.5 font-medium">{bundle.description}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex shrink-0 gap-0.5">
                      <button 
                        onClick={() => router.push(`/bundles/${bundle.id}/edit`)} 
                        className="rounded-xl p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] transition-colors active:scale-95" 
                        title="تعديل"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => confirmDelete(bundle)} 
                        className="rounded-xl p-1.5 text-[var(--text-muted)] hover:bg-red-50 hover:text-red-600 transition-colors active:scale-95" 
                        title="حذف"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Component list */}
                  <div className="mt-4 space-y-1.5">
                    {groups.map(group => (
                      <div key={group.type} className="space-y-1">
                        {multiType && (
                          <div className="flex items-center gap-2 py-1">
                            <span className="text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)]">{group.label}</span>
                            <div className="h-px flex-1 bg-[var(--border-default)]" />
                          </div>
                        )}
                        {group.items.map((c, idx) => {
                          const cs = colorStyles[c.colorKey];
                          const price = itemSell(c, c.product);
                          const isDeleted = !c.product;
                          return (
                            <div
                              key={idx}
                              className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-[12px] transition-colors ${
                                isDeleted ? "bg-red-50/50 border border-red-100" : "bg-[var(--surface-2)] border border-[var(--border-default)]"
                              }`}
                            >
                              <ItemIcon type={c.type} colorKey={c.colorKey} />
                              <span
                                className={`flex-1 font-bold truncate ${isDeleted ? "line-through text-red-500" : "text-[var(--text-primary)]"}`}
                                style={cs && !isDeleted ? { color: isDark ? cs.textDark : cs.textLight } : undefined}
                              >
                                {isDeleted ? `${c.productName} (محذوف)` : (c.product?.name || c.productName)}
                              </span>
                              <span className="text-[11px] font-mono text-[var(--text-muted)] shrink-0 font-bold">×{c.quantity}</span>
                              <span
                                className="font-mono font-black shrink-0"
                                style={cs && !isDeleted ? { color: isDark ? cs.textDark : cs.textLight } : undefined}
                              >
                                {formatCurrency(price)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  {/* Card Footer */}
                  <div className="mt-4 flex items-center justify-between border-t border-[var(--border-default)] pt-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center bg-[var(--surface-2)] text-[var(--text-secondary)] font-bold px-2 py-0.5 rounded-lg text-[11px] border border-[var(--border-default)]">
                        {resolved.length} منتجات
                      </span>
                      {bundle.discount > 0 && (
                        <span className="inline-flex items-center justify-center bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-lg text-[11px] border border-emerald-100">
                          خصم {bundle.discount}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {hasMarginData && (
                        <span className={`text-[11px] font-black font-mono ${margin >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {margin.toFixed(1)}% هامش
                        </span>
                      )}
                      <span className="text-[14px] font-black text-[var(--brand-primary)] font-mono">
                        {formatCurrency(totalSell)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm rounded-3xl" dir="rtl">
          <DialogHeader><DialogTitle className="text-red-600 font-black text-[16px]">حذف المجموعة</DialogTitle></DialogHeader>
          <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed mt-2">هل أنت متأكد من حذف المجموعة &quot;{deletingBundle?.name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.</p>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" className="rounded-xl h-10 border-[var(--border-default)] text-[14px]" onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
            <Button variant="destructive" className="rounded-xl h-10 bg-red-600 hover:bg-red-700 text-white text-[14px]" onClick={handleDelete}>تأكيد الحذف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ResponsiveShell>
  );
}
