"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, History, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { type Invoice, formatCurrency, getStatusColor } from "@/lib/data";

export default function ProductHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const { products, invoices, settings } = useStore();

  const product = products.find((p) => p.id === id);

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center" dir="rtl">
        <div className="text-center">
          <p className="text-muted-foreground">المنتج غير موجود</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/inventory">العودة للمخزون</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <Link href="/inventory" className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--glass-border)] bg-[var(--surface-1)] text-muted-foreground transition-colors hover:bg-[var(--surface-2)]">
            <ArrowRight className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-blue-600" />
            <h1 className="text-xl font-bold text-foreground">سجل مبيعات</h1>
          </div>
          <span className="text-sm text-muted-foreground">{product.name}</span>
        </div>

        <StockHistoryContent product={product} invoices={invoices} currencySymbol={settings.currencySymbol} />
      </div>
    </div>
  );
}

function StockHistoryContent({
  product,
  invoices,
  currencySymbol,
}: {
  product: { id: string; name: string; stock: number; unit: string; minStock: number };
  invoices: Invoice[];
  currencySymbol: string;
}) {
  const deductsStock = (s: string) => s !== "مسودة" && s !== "ملغاة";

  type SaleRecord = {
    invoiceId: string;
    invoiceNumber: string;
    date: string;
    clientName: string;
    qty: number;
    status: string;
    viaBundle: boolean;
    bundleName?: string;
    revenue: number;
  };

  const sales: SaleRecord[] = [];

  invoices.forEach((inv) => {
    const items = Array.isArray(inv.items) ? inv.items : (inv.items as any)?._items || [];
    items.forEach((item: any) => {
      if (!item.isBundle && item.productId === product.id) {
        sales.push({
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          date: inv.createdAt,
          clientName: inv.clientName,
          qty: item.quantity,
          status: inv.status,
          viaBundle: false,
          revenue: item.total ?? item.quantity * item.unitPrice,
        });
      }
      if (item.isBundle && item.bundleComponents) {
        const comp = (item.bundleComponents as any[]).find((c: any) => c.productId === product.id);
        if (comp) {
          sales.push({
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber,
            date: inv.createdAt,
            clientName: inv.clientName,
            qty: comp.quantity * item.quantity,
            status: inv.status,
            viaBundle: true,
            bundleName: item.productName,
            revenue: 0,
          });
        }
      }
    });
  });

  sales.sort((a, b) => b.date.localeCompare(a.date));

  const activeSales = sales.filter((s) => deductsStock(s.status));
  const totalSold = activeSales.reduce((sum, s) => sum + s.qty, 0);
  const impliedInitial = product.stock + totalSold;
  const totalRevenue = activeSales.filter((s) => !s.viaBundle).reduce((sum, s) => sum + s.revenue, 0);

  return (
    <div className="space-y-4">
      {/* Audit Summary */}
      <div className="grid grid-cols-3 gap-3 rounded-2xl border border-[var(--glass-border)] bg-[var(--surface-1)] p-5 text-center shadow-sm">
        <div>
          <p className="text-xs text-muted-foreground">المخزون الحالي</p>
          <p className={`mt-1 text-2xl font-extrabold ${product.stock <= 0 ? "text-red-600" : "text-foreground"}`}>
            {product.stock}
          </p>
          <p className="text-xs text-muted-foreground">{product.unit}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">إجمالي المباع</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-600">{totalSold}</p>
          <p className="text-xs text-muted-foreground">{product.unit}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">المخزون الأولي المتوقع</p>
          <p className="mt-1 text-2xl font-extrabold text-blue-600">{impliedInitial}</p>
          <p className="text-xs text-muted-foreground">= حالي + مباع</p>
        </div>
      </div>

      {/* Revenue */}
      <div className="flex items-center justify-between rounded-xl border border-[var(--glass-border)] bg-[var(--surface-1)] px-5 py-3 shadow-sm">
        <span className="text-sm text-muted-foreground">إجمالي الإيرادات المباشرة</span>
        <span className="text-base font-bold text-green-600">
          {currencySymbol}{totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
        </span>
      </div>

      {/* Invoice table */}
      {sales.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground rounded-2xl border border-[var(--glass-border)] bg-[var(--surface-1)]">
          <CheckCircle2 className="h-10 w-10 mb-3 opacity-30" />
          <p>لا توجد فواتير تحتوي على هذا المنتج</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--glass-border)] bg-[var(--surface-1)] shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--glass-border)] bg-[var(--surface-2)]">
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">التاريخ</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">الفاتورة</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">العميل</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">الكمية</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">النوع</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">الحالة</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s, i) => {
                const deducts = deductsStock(s.status);
                return (
                  <tr
                    key={`${s.invoiceId}-${i}`}
                    className={`border-b border-border/30 transition-colors hover:bg-[var(--surface-2)] ${!deducts ? "opacity-50" : ""}`}
                  >
                    <td className="px-4 py-3 text-muted-foreground text-xs">{s.date}</td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">{s.invoiceNumber}</td>
                    <td className="px-4 py-3 text-foreground">{s.clientName}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${deducts ? "text-amber-600" : "text-muted-foreground"}`}>
                        {deducts ? "-" : ""}{s.qty}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {s.viaBundle ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs text-purple-700">
                          طقم — {s.bundleName}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                          مباشر
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${getStatusColor(s.status as any)}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link href={`/invoices/${s.invoiceId}`} target="_blank" className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[var(--surface-2)] hover:text-foreground mx-auto">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-[var(--glass-border)] bg-[var(--surface-2)] font-semibold">
                <td colSpan={3} className="px-4 py-3 text-sm text-muted-foreground">
                  المجموع ({activeSales.length} فاتورة نشطة)
                </td>
                <td className="px-4 py-3 text-center text-amber-600 font-bold text-sm">
                  -{totalSold}
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
