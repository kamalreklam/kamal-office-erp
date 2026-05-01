"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, Users, Phone, MapPin, DollarSign, FileText,
  Clock, Loader2, PackageCheck, CheckCircle2, Pencil, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { formatCurrency, getStatusColor, getOrderStatusColor } from "@/lib/data";
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
  const { id } = useParams<{ id: string }>();
  const { clients, invoices, orders, settings } = useStore();

  const client = clients.find((c) => c.id === id);

  if (!client) {
    return (
      <div className="flex min-h-screen items-center justify-center" dir="rtl">
        <div className="text-center">
          <p className="text-muted-foreground">العميل غير موجود</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/clients">العودة للعملاء</Link>
          </Button>
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
    try {
      toast.success(`جاري تصدير بيانات ${client.name}...`);
      const { exportClientSheetPDF } = await import("@/lib/pdf");
      await exportClientSheetPDF(client, clientInvoices, settings);
    } catch {
      toast.error("فشل تصدير بيانات العميل");
    }
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
          <Card className="border border-[var(--glass-border)] shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start gap-5">
                <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold ${getAvatarColor(client.id)}`}>
                  {client.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
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
                    <div className="flex shrink-0 gap-2">
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={exportSheet}>
                        <Download className="h-4 w-4" />
                        تصدير
                      </Button>
                      <Button size="sm" className="gap-1.5" asChild>
                        <Link href={`/clients/${client.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                          تعديل
                        </Link>
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
