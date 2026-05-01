"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { ResponsiveShell } from "@/components/responsive-shell";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { MobileBundles } from "@/components/mobile/mobile-bundles";
import { MobileShell } from "@/components/mobile/mobile-shell";
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
  if (isMobile) return <MobileShell><MobileBundles /></MobileShell>;
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
        {/* Header */}
        <div className="animate-fade-in-up">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-foreground">المجموعات</h1>
              <p className="mt-1 text-sm text-muted-foreground">مجموعات منتجات جاهزة — طابعات، أحبار، خزانات</p>
              {bundles.length > 0 && (
                <div className="mt-3 flex items-center gap-4 text-sm">
                  <span><span className="text-xl font-extrabold text-foreground">{bundles.length}</span> <span className="text-muted-foreground">مجموعة</span></span>
                  <span className="h-4 w-px bg-border" />
                  <span className="text-muted-foreground">إجمالي القيمة: <span className="font-bold text-primary">{formatCurrency(totalValue)}</span></span>
                </div>
              )}
            </div>
            <Button className="gap-1.5 shrink-0" onClick={() => router.push("/bundles/new")}>
              <Plus className="h-4 w-4" />
              مجموعة جديدة
            </Button>
          </div>
        </div>

        {/* Search */}
        {bundles.length > 0 && (
          <div className="relative max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن مجموعة..." className="pr-9" />
          </div>
        )}

        {/* Empty state */}
        {bundles.length === 0 ? (
          <Card className="border border-[var(--glass-border)] shadow-sm">
            <CardContent className="flex flex-col items-center py-20 text-muted-foreground">
              <Layers className="mb-3 h-14 w-14 opacity-30" />
              <p className="text-lg font-semibold">لا توجد مجموعات بعد</p>
              <p className="mt-2 text-sm text-center max-w-xs">أنشئ مجموعة تضم طابعة وأحبار وخزانات لإضافتها دفعة واحدة للفواتير</p>
              <Button className="mt-5 gap-1.5" onClick={() => router.push("/bundles/new")}>
                <Plus className="h-4 w-4" />
                إنشاء أول مجموعة
              </Button>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">لا توجد نتائج لـ &quot;{search}&quot;</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
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
                <Card key={bundle.id} className={`border shadow-sm transition-all hover:shadow-md ${broken ? "border-amber-400/60" : "border-[var(--glass-border)]"}`}>
                  <CardContent className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${hasPrinter ? "bg-slate-700" : "bg-gradient-to-br from-cyan-500 via-pink-500 to-yellow-500"}`}>
                          {hasPrinter ? <Printer className="h-5 w-5" /> : <Droplets className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="text-sm font-bold text-foreground">{bundle.name}</h3>
                            {broken && (
                              <Badge variant="outline" className="gap-1 border-amber-400 text-amber-600 text-[10px] shrink-0">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                منتج محذوف
                              </Badge>
                            )}
                          </div>
                          {bundle.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{bundle.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-0.5">
                        <button onClick={() => router.push(`/bundles/${bundle.id}/edit`)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-[var(--surface-2)]" title="تعديل">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => confirmDelete(bundle)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950" title="حذف">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Component list */}
                    <div className="mt-4 space-y-0.5">
                      {groups.map(group => (
                        <div key={group.type}>
                          {multiType && (
                            <div className="flex items-center gap-2 py-1.5">
                              <div className="h-px flex-1 bg-border/50" />
                              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{group.label}</span>
                              <div className="h-px flex-1 bg-border/50" />
                            </div>
                          )}
                          {group.items.map((c, idx) => {
                            const cs = colorStyles[c.colorKey];
                            const price = itemSell(c, c.product);
                            const isDeleted = !c.product;
                            return (
                              <div
                                key={idx}
                                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 ${isDeleted ? "opacity-40" : ""}`}
                                style={cs ? { backgroundColor: isDark ? cs.dark : cs.light } : { backgroundColor: isDark ? "rgba(120,120,120,0.08)" : "rgba(0,0,0,0.03)" }}
                              >
                                <ItemIcon type={c.type} colorKey={c.colorKey} />
                                <span
                                  className={`flex-1 text-xs font-medium truncate ${isDeleted ? "line-through text-red-500" : ""}`}
                                  style={cs && !isDeleted ? { color: isDark ? cs.textDark : cs.textLight } : undefined}
                                >
                                  {isDeleted ? `${c.productName} (محذوف)` : (c.product?.name || c.productName)}
                                </span>
                                <span className="text-[11px] text-muted-foreground shrink-0">×{c.quantity}</span>
                                <span
                                  className="text-xs font-bold shrink-0"
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

                    {/* Footer */}
                    <div className="mt-3 flex items-center justify-between border-t border-[var(--glass-border)] pt-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{resolved.length} منتجات</Badge>
                        {bundle.discount > 0 && (
                          <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">خصم {bundle.discount}%</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {hasMarginData && (
                          <span className={`text-[11px] font-bold ${margin >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {margin.toFixed(1)}%
                          </span>
                        )}
                        <span className="text-sm font-bold text-primary">{formatCurrency(totalSell)} / طقم</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle className="text-red-600">حذف المجموعة</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">هل أنت متأكد من حذف &quot;{deletingBundle?.name}&quot;؟</p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
            <Button variant="destructive" onClick={handleDelete}>حذف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ResponsiveShell>
  );
}
