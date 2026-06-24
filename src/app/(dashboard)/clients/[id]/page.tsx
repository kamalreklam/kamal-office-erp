"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/data";
import { toast } from "sonner";
import { 
  ArrowRight, Users, Phone, MapPin, AlignLeft, 
  Download, Pencil, FileText, Package, Clock, Loader2, CheckCircle2 
} from "lucide-react";

const avatarPalette = [
  "bg-indigo-100 text-indigo-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
  "bg-violet-100 text-violet-700",
];

function getAvatarColors(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return avatarPalette[Math.abs(hash) % avatarPalette.length];
}

function InvoiceStatusBadge({ status }: { status: string }) {
  if (status === "مدفوعة") {
    return <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-black px-2 py-0.5 rounded-md">مدفوعة</span>;
  }
  if (status === "مدفوعة جزئياً") {
    return <span className="bg-amber-50 text-amber-600 border border-amber-200 text-[10px] font-black px-2 py-0.5 rounded-md">مدفوعة جزئياً</span>;
  }
  if (status === "غير مدفوعة") {
    return <span className="bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-black px-2 py-0.5 rounded-md">غير مدفوعة</span>;
  }
  return <span className="bg-slate-50 text-slate-600 border border-slate-200 text-[10px] font-black px-2 py-0.5 rounded-md">{status}</span>;
}

function OrderStatusBadge({ status }: { status: string }) {
  if (status === "مكتمل") {
    return <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-black px-2 py-0.5 rounded-md">مكتمل</span>;
  }
  if (status === "جاهز للاستلام") {
    return <span className="bg-amber-50 text-amber-600 border border-amber-200 text-[10px] font-black px-2 py-0.5 rounded-md">جاهز للاستلام</span>;
  }
  if (status === "قيد التنفيذ") {
    return <span className="bg-indigo-50 text-indigo-600 border border-indigo-200 text-[10px] font-black px-2 py-0.5 rounded-md">قيد التنفيذ</span>;
  }
  return <span className="bg-slate-50 text-slate-600 border border-slate-200 text-[10px] font-black px-2 py-0.5 rounded-md">{status}</span>;
}

function StatusIcon({ type, status }: { type: "invoice" | "order", status: string }) {
  if (type === "invoice") return <FileText className="size-5 text-indigo-500" />;
  if (status === "قيد الانتظار") return <Clock className="size-5 text-slate-500" />;
  if (status === "قيد التنفيذ") return <Loader2 className="size-5 text-indigo-500" />;
  if (status === "جاهز للاستلام") return <Package className="size-5 text-amber-500" />;
  if (status === "مكتمل") return <CheckCircle2 className="size-5 text-emerald-500" />;
  return <Clock className="size-5 text-slate-500" />;
}

export default function ClientDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { clients, invoices, orders, settings } = useStore();

  const client = clients.find((c) => c.id === id);

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-slate-500 font-bold">العميل غير موجود</p>
        <button
          onClick={() => router.push("/clients")}
          className="h-12 px-6 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-all shadow-sm"
        >
          العودة للعملاء
        </button>
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
      href: `/invoices/${inv.id}`,
    })),
    ...clientOrders.map((ord) => ({
      type: "order" as const,
      id: ord.id,
      date: ord.updatedAt,
      title: ord.trackingId,
      subtitle: ord.description,
      status: ord.status,
      href: "/orders",
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  async function exportSheet() {
    try {
      toast.success(`جاري تصدير بيانات ${client!.name}...`);
      const { exportClientSheetPDF } = await import("@/lib/pdf");
      await exportClientSheetPDF(client, clientInvoices, settings);
    } catch {
      toast.error("فشل تصدير بيانات العميل");
    }
  }

  const avatarColorClass = getAvatarColors(client.id);

  return (
    <div className="pb-32 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/30 min-h-screen" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push("/clients")}
            className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300 transition-all shadow-sm flex items-center justify-center active:scale-95 shrink-0"
            title="رجوع للعملاء"
          >
            <ArrowRight className="size-5" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm shrink-0">
            <Users className="size-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight truncate">ملف العميل</h1>
            <p className="text-sm font-bold text-slate-500 mt-0.5 truncate">سجل العميل والعمليات المرتبطة به</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Info Column */}
          <div className="lg:col-span-7 space-y-8">
            <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-slate-100 shadow-sm space-y-6">
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-5">
                  <div className={`w-16 h-16 rounded-3xl flex items-center justify-center font-black text-3xl border border-white/50 shadow-sm shrink-0 ${avatarColorClass}`}>
                    {client.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight truncate">
                      {client.name}
                    </h2>
                    <p className="text-xs font-bold text-slate-400 mt-1">تاريخ التسجيل: {client.createdAt}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={exportSheet}
                    className="w-11 h-11 flex items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all shadow-sm"
                    title="تصدير السجل"
                  >
                    <Download className="size-5" />
                  </button>
                  <button
                    onClick={() => router.push(`/clients/${client.id}/edit`)}
                    className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm"
                    title="تعديل البيانات"
                  >
                    <Pencil className="size-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {client.phone && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                      <Phone className="size-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">رقم الهاتف</span>
                      <span className="block text-sm font-bold text-slate-700 font-mono" dir="ltr">{client.phone}</span>
                    </div>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                      <MapPin className="size-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">العنوان</span>
                      <span className="block text-sm font-bold text-slate-700">{client.address}</span>
                    </div>
                  </div>
                )}
                {client.notes && (
                  <div className="flex items-start gap-3 mt-4 p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
                    <AlignLeft className="size-5 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-sm font-medium text-amber-900 leading-relaxed">
                      {client.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-slate-100 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 mb-6">سجل العمليات</h3>
              
              {timeline.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                    <FileText className="size-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-500">لا توجد سجلات لهذا العميل</p>
                </div>
              ) : (
                <div className="relative border-r-2 border-slate-100 mr-4 pr-6 space-y-6">
                  {timeline.map((item, idx) => (
                    <div key={idx} className="relative">
                      {/* Timeline dot */}
                      <div className="absolute top-4 -right-[33px] w-4 h-4 rounded-full bg-white border-4 border-indigo-500" />
                      
                      <Link href={item.href} className="block group">
                        <div className="p-4 rounded-2xl bg-white border border-slate-100 group-hover:border-indigo-200 group-hover:shadow-md transition-all shadow-sm">
                          <div className="flex items-center justify-between gap-4 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <StatusIcon type={item.type} status={item.status} />
                              <span className="font-bold text-slate-900 truncate">{item.title}</span>
                              {item.type === "invoice" ? (
                                <InvoiceStatusBadge status={item.status} />
                              ) : (
                                <OrderStatusBadge status={item.status} />
                              )}
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 shrink-0 uppercase tracking-widest">{item.date}</span>
                          </div>
                          <p className="text-sm font-medium text-slate-500 pr-7">{item.subtitle}</p>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Stats Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2rem] p-8 text-white shadow-xl shadow-indigo-600/20">
              <span className="block text-sm font-bold text-indigo-200 uppercase tracking-wider mb-2">إجمالي المشتريات</span>
              <span className="block text-4xl font-black font-mono tracking-tight">{formatCurrency(client.totalSpent)}</span>
              <div className="mt-8 pt-6 border-t border-indigo-500/30 flex items-center justify-between">
                <div>
                  <span className="block text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1">الفواتير</span>
                  <span className="block text-xl font-black">{clientInvoices.length}</span>
                </div>
                <div className="w-px h-8 bg-indigo-500/30" />
                <div>
                  <span className="block text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1">الطلبات</span>
                  <span className="block text-xl font-black">{clientOrders.length}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm space-y-4">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">إجراءات سريعة</h4>
              <button 
                onClick={() => router.push(`/invoices/new?client=${client.id}`)}
                className="w-full h-12 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-bold flex items-center justify-start gap-3 px-4 transition-colors"
              >
                <FileText className="size-5" />
                إنشاء فاتورة جديدة
              </button>
              <button 
                onClick={() => router.push(`/orders/new?client=${client.id}`)}
                className="w-full h-12 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-bold flex items-center justify-start gap-3 px-4 transition-colors"
              >
                <Package className="size-5" />
                إضافة طلب صيانة
              </button>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
