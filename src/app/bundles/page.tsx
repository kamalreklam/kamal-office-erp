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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Layers, Plus, Pencil, Trash2, Droplets, AlertTriangle } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/data";
import { toast } from "sonner";

const colorStyles: Record<string, { label: string; light: string; dark: string; textLight: string; textDark: string; dot: string }> = {
  C:  { label: "سماوي",        light: "#e0f7fa",  dark: "rgba(8,145,178,0.25)",    textLight: "#0e7490", textDark: "#67e8f9", dot: "#06b6d4" },
  M:  { label: "أرجواني",      light: "#fce4ec",  dark: "rgba(190,24,93,0.25)",    textLight: "#be185d", textDark: "#f9a8d4", dot: "#ec4899" },
  Y:  { label: "أصفر",         light: "#fff8e1",  dark: "rgba(161,98,7,0.25)",     textLight: "#a16207", textDark: "#fcd34d", dot: "#eab308" },
  BK: { label: "أسود",         light: "#f3f4f6",  dark: "rgba(75,85,99,0.35)",     textLight: "#1f2937", textDark: "#e5e7eb", dot: "#374151" },
  LC: { label: "سماوي فاتح",   light: "#e0f2fe",  dark: "rgba(14,165,233,0.2)",    textLight: "#0369a1", textDark: "#7dd3fc", dot: "#38bdf8" },
  LM: { label: "أرجواني فاتح", light: "#ffe4e6",  dark: "rgba(225,29,72,0.2)",     textLight: "#be123c", textDark: "#fda4af", dot: "#fb7185" },
};

const colorOrder = ["C", "M", "Y", "BK", "LC", "LM"];

function getColorKey(productName: string): string {
  const name = productName.toLowerCase();
  if (name.includes("light cyan")    || name === "lc") return "LC";
  if (name.includes("light magenta") || name === "lm") return "LM";
  if (name.includes("cyan")          || name === "c")  return "C";
  if (name.includes("magenta")       || name === "m")  return "M";
  if (name.includes("yellow")        || name === "y")  return "Y";
  if (name.includes("black")         || name === "bk") return "BK";
  return productName;
}

export default function BundlesPage() {
  const isMobile = useIsMobile();
  if (isMobile) return <MobileShell><MobileBundles /></MobileShell>;
  return <DesktopBundles />;
}

function DesktopBundles() {
  const { bundles, products, deleteBundle } = useStore();
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingBundle, setDeletingBundle] = useState<(typeof bundles)[0] | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

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

  function getBundleColors(bundle: (typeof bundles)[0]) {
    return bundle.items
      .map(item => {
        const product = products.find(p => p.id === item.productId);
        const colorKey = getColorKey(product?.name || item.productName);
        return { ...item, colorKey, product };
      })
      .sort((a, b) => colorOrder.indexOf(a.colorKey) - colorOrder.indexOf(b.colorKey));
  }

  function isBroken(bundle: (typeof bundles)[0]) {
    return bundle.items.some(item => !products.find(p => p.id === item.productId));
  }

  return (
    <ResponsiveShell>
      <div className="space-y-8">
        <div className="animate-fade-in-up lg:text-center">
          <h1 className="text-xl font-extrabold text-foreground lg:text-3xl">مجموعات الأحبار</h1>
          <p className="mt-1.5 text-sm text-muted-foreground sm:mt-2 sm:text-base">
            مجموعات ألوان جاهزة (CMYK) لإضافتها بسرعة للفواتير
          </p>
          <div className="mt-4 flex justify-center">
            <Button size="sm" className="gap-1.5" onClick={() => router.push("/bundles/new")}>
              <Plus className="h-5 w-5" />
              مجموعة جديدة
            </Button>
          </div>
        </div>

        {bundles.length === 0 ? (
          <Card className="border border-[var(--glass-border)] shadow-sm">
            <CardContent className="flex flex-col items-center py-20 text-muted-foreground">
              <Layers className="mb-3 h-14 w-14 opacity-30" />
              <p className="text-lg font-medium">لا توجد مجموعات بعد</p>
              <p className="mt-2 text-base">أنشئ مجموعة لتسهيل إضافة الأحبار للفواتير</p>
              <Button className="mt-4 gap-1.5" onClick={() => router.push("/bundles/new")}>
                <Plus className="h-5 w-5" />
                إضافة مجموعة
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
            {bundles.map((bundle) => {
              const colors = getBundleColors(bundle);
              const totalPrice = colors.reduce((s, c) => s + (c.product?.price || 0) * c.quantity, 0);
              const discounted = totalPrice * (1 - bundle.discount / 100);
              const broken = isBroken(bundle);

              return (
                <Card key={bundle.id} className={`border shadow-sm transition-all hover:shadow-md ${broken ? "border-amber-400/60" : "border-[var(--glass-border)]"}`}>
                  <CardContent className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 via-pink-500 to-yellow-500 text-white shadow-sm">
                          <Droplets className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-foreground">{bundle.name}</h3>
                            {broken && (
                              <Badge variant="outline" className="gap-1 border-amber-400 text-amber-600 text-[10px]">
                                <AlertTriangle className="h-3 w-3" />
                                منتج محذوف
                              </Badge>
                            )}
                          </div>
                          {bundle.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{bundle.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        <button
                          onClick={() => router.push(`/bundles/${bundle.id}/edit`)}
                          className="rounded-xl p-2 text-muted-foreground hover:bg-[var(--surface-2)]"
                          title="تعديل المجموعة"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => confirmDelete(bundle)}
                          className="rounded-xl p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                          title="حذف المجموعة"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Color grid */}
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {colors.map((c, idx) => {
                        const cs = colorStyles[c.colorKey] || colorStyles.BK;
                        return (
                          <div key={idx} className="flex items-center justify-between rounded-xl px-3 py-2.5"
                            style={{ backgroundColor: isDark ? cs.dark : cs.light }}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="h-4 w-4 rounded-full shadow-sm" style={{ backgroundColor: cs.dot }} />
                              <span className="text-sm font-bold" style={{ color: isDark ? cs.textDark : cs.textLight }}>{c.colorKey}</span>
                            </div>
                            <div className="flex items-center gap-3 text-left">
                              <span className="text-xs font-medium text-muted-foreground">
                                {c.product ? `${c.product.stock} ${c.product.unit || "عبوة"}` : "—"}
                              </span>
                              <span className="text-sm font-bold" style={{ color: isDark ? cs.textDark : cs.textLight }}>
                                {c.product ? formatCurrency(c.product.price) : "محذوف"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Footer */}
                    <div className="mt-3 flex items-center justify-between border-t border-[var(--glass-border)] pt-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{colors.length} ألوان</Badge>
                        {bundle.discount > 0 && (
                          <Badge variant="outline" className="text-xs status-badge--success">خصم {bundle.discount}%</Badge>
                        )}
                      </div>
                      <div className="text-left">
                        {bundle.discount > 0 && (
                          <span className="text-xs text-muted-foreground line-through ml-2">{formatCurrency(totalPrice)}</span>
                        )}
                        <span className="text-sm font-bold text-primary">{formatCurrency(discounted)} / طقم</span>
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
          <p className="text-base text-muted-foreground">هل أنت متأكد من حذف &quot;{deletingBundle?.name}&quot;؟</p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
            <Button variant="destructive" onClick={handleDelete}>حذف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ResponsiveShell>
  );
}
