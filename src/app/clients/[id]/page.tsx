"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, Users, Phone, MapPin, DollarSign, FileText,
  Clock, Loader2, PackageCheck, CheckCircle2, Pencil, Download, MessageCircle, ImageIcon,
} from "lucide-react";
import { shareAsImage, formatClientWhatsAppText, shareViaWhatsApp } from "@/lib/share";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { formatCurrency, getStatusColor, getOrderStatusColor } from "@/lib/data";
import type { Payment } from "@/lib/store";
import { toast } from "sonner";

const avatarColors = [
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
  "bg-indigo-100 text-indigo-700",
  "bg-orange-100 text-orange-700",
];

function getAvatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function getOrderIcon(status: string) {
  switch (status) {
    case "قيد الانتظار": return Clock;
    case "قيد التنفيذ": return Loader2;
    case "جاهز للاستلام": return PackageCheck;
    case "مكتمل": return CheckCircle2;
    default: return Clock;
  }
}

export default function ClientDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { clients, invoices, orders, settings, getInvoicePayments } = useStore();

  const client = clients.find((c) => c.id === id);

  if (!client) {
    return (
      <div className="flex min-h-screen items-center justify-center" dir="rtl">
        <div className="text-center">
          <p className="text-muted-foreground">العميل غير موجود</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/clients")}>العودة للعملاء</Button>
        </div>
      </div>
    );
  }

  const clientInvoices = invoices.filter((inv) => inv.clientId === id);
  const clientOrders = orders.filter((o) => o.clientId === id);

  const timeline = [
    ...clientInvoices.map((inv) => ({
      type: "invoice" as const,
      id: inv.id,
      date: inv.createdAt,
      title: inv.invoiceNumber,
      subtitle: `${inv.items.length} منتجات · ${formatCurrency(inv.total)}`,
      status: inv.status,
      statusColor: getStatusColor(inv.status),
      href: `/invoices/${inv.id}`,
    })),
    ...clientOrders.map((ord) => ({
      type: "order" as const,
      id: ord.id,
      date: ord.updatedAt,
      title: ord.trackingId,
      subtitle: ord.description,
      status: ord.status,
      statusColor: getOrderStatusColor(ord.status),
      href: "/orders",
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  async function exportSheet() {
    if (!client) return;
    try {
      toast.success(`جاري تصدير بيانات ${client.name}...`);
      const { exportClientSheetPDF } = await import("@/lib/pdf");
      await exportClientSheetPDF(client, clientInvoices, settings);
    } catch {
      toast.error("فشل تصدير بيانات العميل");
    }
  }

  function shareWhatsApp() {
    if (!client) return;
    const text = formatClientWhatsAppText(client, clientInvoices, settings);
    shareViaWhatsApp(text);
  }

  function shareImage() {
    if (!client) return;
    toast.promise(shareAsImage('client-detail-card-capture', `حساب_${client.name}`), {
      loading: 'جاري تصدير الحساب كصورة...',
      success: 'تم التصدير كصورة بنجاح',
      error: 'فشل تصدير الصورة'
    });
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <Link href="/clients" className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--glass-border)] bg-[var(--surface-1)] text-muted-foreground transition-colors hover:bg-[var(--surface-2)]">
            <ArrowRight className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">ملف العميل</h1>
          </div>
        </div>

        <div className="space-y-5">
          {/* Client Info Card */}
          <Card id="client-detail-card-capture" className="border border-[var(--glass-border)] shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start gap-5">
                <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold ${getAvatarColor(client.id)}`}>
                  {client.name.charAt(0)}
                </div>
                <div className="flex-1 w-full">
                  <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-foreground">{client.name}</h2>
                      <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                        {client.phone && (
                          <span className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5" />
                            <span dir="ltr">{client.phone}</span>
                          </span>
                        )}
                        {client.address && (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            {client.address}
                          </span>
                        )}
                      </div>
                      {client.notes && (
                        <p className="mt-2 text-sm text-muted-foreground">{client.notes}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap shrink-0 gap-1.5 no-capture w-full md:w-auto mt-2 md:mt-0">
                      <Button variant="outline" size="sm" className="gap-1 px-2.5 h-8 text-xs font-bold" onClick={exportSheet}>
                        <Download className="h-3.5 w-3.5" />
                        PDF
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1 px-2.5 h-8 text-xs font-bold text-green-700 border-green-200 hover:bg-green-50/20" onClick={shareWhatsApp}>
                        <MessageCircle className="h-3.5 w-3.5" />
                        واتساب
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1 px-2.5 h-8 text-xs font-bold text-cyan-700 border-cyan-200 hover:bg-cyan-50/20" onClick={shareImage}>
                        <ImageIcon className="h-3.5 w-3.5" />
                        صورة
                      </Button>
                      <Button size="sm" className="gap-1 px-2.5 h-8 text-xs font-bold" onClick={() => router.push(`/clients/${client.id}/edit`)}>
                        <Pencil className="h-3.5 w-3.5" />
                        تعديل
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-[var(--glass-border)] pt-5">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">الفواتير</p>
                  <p className="mt-1 text-xl font-extrabold text-foreground">{clientInvoices.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">الطلبات</p>
                  <p className="mt-1 text-xl font-extrabold text-foreground">{clientOrders.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">إجمالي الإنفاق</p>
                  <p className="mt-1 text-xl font-extrabold text-primary">{formatCurrency(client.totalSpent)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statement of Account */}
          {clientInvoices.length > 0 && (() => {
            const rows = clientInvoices.map((inv) => {
              const invPayments: Payment[] = getInvoicePayments(inv.id);
              const paid = invPayments.reduce((s, p) => s + p.amount, 0);
              const remaining = inv.total - paid;
              return { inv, paid, remaining };
            });
            const totalTotal = rows.reduce((s, r) => s + r.inv.total, 0);
            const totalPaid = rows.reduce((s, r) => s + r.paid, 0);
            const totalRemaining = rows.reduce((s, r) => s + r.remaining, 0);
            return (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-muted-foreground">كشف الحساب</h3>
                  <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs font-bold" onClick={() => window.print()}>
                    🖨 طباعة الكشف
                  </Button>
                </div>
                <Card className="border border-[var(--glass-border)] shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="bg-muted/40 border-b border-[var(--glass-border)]">
                          <th className="px-4 py-2.5 text-right font-bold text-muted-foreground">رقم الفاتورة</th>
                          <th className="px-4 py-2.5 text-right font-bold text-muted-foreground">التاريخ</th>
                          <th className="px-4 py-2.5 text-right font-bold text-muted-foreground">الإجمالي</th>
                          <th className="px-4 py-2.5 text-right font-bold text-muted-foreground">المدفوع</th>
                          <th className="px-4 py-2.5 text-right font-bold text-muted-foreground">المتبقي</th>
                          <th className="px-4 py-2.5 text-right font-bold text-muted-foreground">الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(({ inv, paid, remaining }) => (
                          <tr key={inv.id} className="border-b border-[var(--glass-border)] hover:bg-muted/20">
                            <td className="px-4 py-2.5 font-mono font-bold text-primary">{inv.invoiceNumber}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{inv.createdAt.slice(0, 10)}</td>
                            <td className="px-4 py-2.5 font-mono font-bold">{formatCurrency(inv.total, settings.currencySymbol)}</td>
                            <td className="px-4 py-2.5 font-mono text-emerald-700 font-bold">{formatCurrency(paid, settings.currencySymbol)}</td>
                            <td className={`px-4 py-2.5 font-mono font-bold ${remaining > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                              {formatCurrency(remaining, settings.currencySymbol)}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${getStatusColor(inv.status)}`}>
                                {inv.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/40 font-bold border-t-2 border-[var(--glass-border)]">
                          <td className="px-4 py-2.5 font-black" colSpan={2}>الإجمالي</td>
                          <td className="px-4 py-2.5 font-mono font-black">{formatCurrency(totalTotal, settings.currencySymbol)}</td>
                          <td className="px-4 py-2.5 font-mono font-black text-emerald-700">{formatCurrency(totalPaid, settings.currencySymbol)}</td>
                          <td className={`px-4 py-2.5 font-mono font-black ${totalRemaining > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                            {formatCurrency(totalRemaining, settings.currencySymbol)}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </Card>
              </div>
            );
          })()}

          {/* Timeline */}
          <div>
            <h3 className="mb-3 text-sm font-bold text-muted-foreground">سجل العمليات</h3>
            {timeline.length === 0 ? (
              <Card className="border border-[var(--glass-border)] shadow-sm">
                <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
                  <DollarSign className="mb-3 h-10 w-10 opacity-30" />
                  <p>لا توجد سجلات لهذا العميل</p>
                </CardContent>
              </Card>
            ) : (
              <div className="relative pr-8">
                <div className="absolute right-3 top-2 bottom-2 w-0.5 bg-border" />
                <div className="space-y-3">
                  {timeline.map((item, idx) => {
                    const Icon = item.type === "invoice" ? FileText : getOrderIcon(item.status);
                    return (
                      <Link key={idx} href={item.href} className="relative flex gap-3 group/tl">
                        <div className="absolute -right-6.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-primary/15">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        </div>
                        <div className="flex-1 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-1)] p-3 transition-colors group-hover/tl:bg-[var(--surface-2)]/30 group-hover/tl:border-primary/20">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm font-medium">{item.title}</span>
                              <Badge variant="outline" className={`text-[10px] ${item.statusColor}`}>{item.status}</Badge>
                            </div>
                            <span className="shrink-0 text-[10px] text-muted-foreground">{item.date}</span>
                          </div>
                          <p className="mt-1.5 text-xs text-muted-foreground">{item.subtitle}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
