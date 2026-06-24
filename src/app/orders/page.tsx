"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/lib/use-debounce";
import { ResponsiveShell } from "@/components/responsive-shell";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { MobileOrders } from "@/components/mobile/mobile-orders";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, ClipboardList, Plus, Pencil, Trash2, MessageCircle,
  Clock, Loader2, CheckCircle2, PackageCheck, Copy, LayoutGrid, List,
  ChevronLeft, ChevronRight, CalendarDays, X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { type OrderStatus, getOrderStatusColor } from "@/lib/data";
import { toast } from "sonner";
import { DateRangeExportButton, type DateRange } from "@/components/date-range-picker";

const statusOptions: OrderStatus[] = ["قيد الانتظار", "قيد التنفيذ", "جاهز للاستلام", "مكتمل"];

const statusConfig: Record<OrderStatus, { icon: typeof Clock; bg: string; borderColor: string; headerBg: string }> = {
  "قيد الانتظار": { icon: Clock, bg: "bg-[var(--warning-soft)] text-[var(--amber-500)]", borderColor: "rgba(217, 119, 6, 0.2)", headerBg: "var(--warning-soft)" },
  "قيد التنفيذ": { icon: Loader2, bg: "bg-[var(--info-soft)] text-[var(--blue-500)]", borderColor: "rgba(37, 99, 235, 0.2)", headerBg: "var(--info-soft)" },
  "جاهز للاستلام": { icon: PackageCheck, bg: "bg-[var(--success-soft)] text-[var(--green-500)]", borderColor: "rgba(5, 150, 105, 0.2)", headerBg: "var(--success-soft)" },
  "مكتمل": { icon: CheckCircle2, bg: "bg-[var(--accent-soft)] text-[var(--purple-500)]", borderColor: "rgba(139, 92, 246, 0.2)", headerBg: "rgba(139, 92, 246, 0.08)" },
};

export default function OrdersPage() {
  const isMobile = useIsMobile();
  if (isMobile) return <AppShell><MobileOrders /></AppShell>;
  return <DesktopOrders />;
}

function DesktopOrders() {
  const router = useRouter();
  const { orders, updateOrder, deleteOrder, settings } = useStore();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingOrder, setDeletingOrder] = useState<(typeof orders)[0] | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const q = debouncedSearch.toLowerCase(); const matchSearch = debouncedSearch === "" || o.trackingId.toLowerCase().includes(q) || o.clientName.toLowerCase().includes(q) || o.description.toLowerCase().includes(q);
      const matchStatus = statusFilter === "الكل" || o.status === statusFilter;
      const matchDateFrom = !dateFrom || o.createdAt >= dateFrom;
      const matchDateTo = !dateTo || o.createdAt <= dateTo;
      return matchSearch && matchStatus && matchDateFrom && matchDateTo;
    });
  }, [orders, debouncedSearch, statusFilter, dateFrom, dateTo]);

  function confirmDelete(order: (typeof orders)[0]) { setDeletingOrder(order); setDeleteDialogOpen(true); }

  function handleDelete() {
    if (!deletingOrder) return;
    deleteOrder(deletingOrder.id);
    toast.success("تم حذف الطلب");
    setDeleteDialogOpen(false);
  }

  function copyTrackingId(id: string) {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success("تم نسخ رقم التتبع");
    setTimeout(() => setCopiedId(null), 2000);
  }

  function shareOrderWhatsApp(order: (typeof orders)[0]) {
    const emoji = order.status === "قيد الانتظار" ? "⏳" : order.status === "قيد التنفيذ" ? "🔄" : order.status === "جاهز للاستلام" ? "✅" : "📦";
    const lines = [`📋 *تحديث طلب - ${settings.businessName}*`, "", `🔖 رقم التتبع: *${order.trackingId}*`, `👤 العميل: ${order.clientName}`, `📝 ${order.description}`, `${emoji} الحالة: *${order.status}*`, `📅 آخر تحديث: ${order.updatedAt}`];
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
  }

  function moveOrder(order: (typeof orders)[0], direction: "next" | "prev") {
    const idx = statusOptions.indexOf(order.status);
    const newIdx = direction === "next" ? idx + 1 : idx - 1;
    if (newIdx < 0 || newIdx >= statusOptions.length) return;
    updateOrder(order.id, { status: statusOptions[newIdx] });
    toast.success(`تم نقل الطلب إلى: ${statusOptions[newIdx]}`);
  }

  const allStatuses = ["الكل", ...statusOptions];

  function renderOrderCard(order: (typeof orders)[0], compact = false) {
    const config = statusConfig[order.status];
    const Icon = config.icon;
    const statusIdx = statusOptions.indexOf(order.status);
    return (
      <div 
        key={order.id} 
        className="m3-card relative overflow-hidden bg-[var(--surface-1)] p-5 hover-lift transition-all duration-300"
      >
        {/* Colorful status accent top bar */}
        <div 
          className="absolute top-0 right-0 left-0 h-1.5"
          style={{ background: order.status === "قيد الانتظار" ? "#EAB308" : order.status === "قيد التنفيذ" ? "#0EA5E9" : order.status === "جاهز للاستلام" ? "#22C55E" : "#8B5CF6" }}
        />
        
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5">
              {!compact && (
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${config.bg} shadow-sm`}>
                  <Icon className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-black text-[15px] tracking-wider text-[var(--text-primary)]">
                    {order.trackingId}
                  </span>
                  <button 
                    onClick={() => copyTrackingId(order.trackingId)} 
                    className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors"
                    title="نسخ رقم التتبع"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${getOrderStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
                <p className="mt-1 font-bold text-[14px] text-[var(--text-primary)]">{order.clientName}</p>
              </div>
            </div>
            
            <div className="flex gap-1 shrink-0">
              <button 
                onClick={() => router.push(`/orders/${order.id}/edit`)} 
                className="rounded-xl p-2 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] transition-colors active:scale-95"
                title="تعديل"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button 
                onClick={() => shareOrderWhatsApp(order)} 
                className="rounded-xl p-2 text-[var(--text-muted)] hover:bg-emerald-50 hover:text-emerald-600 transition-colors active:scale-95"
                title="واتساب"
              >
                <MessageCircle className="h-4 w-4" />
              </button>
              <button 
                onClick={() => confirmDelete(order)} 
                className="rounded-xl p-2 text-[var(--text-muted)] hover:bg-red-50 hover:text-red-600 transition-colors active:scale-95"
                title="حذف"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="text-[13px] text-[var(--text-secondary)] bg-[var(--surface-2)] p-3.5 rounded-2xl border border-[var(--border-default)] leading-relaxed">
            {order.description}
          </div>

          {/* Progress Timeline steps */}
          <div className="pt-2">
            <p className="text-[11px] font-bold text-[var(--text-muted)] mb-2.5">مرحلة إنجاز الطلب</p>
            <div className="relative flex items-center justify-between">
              {/* Timeline Connector Line */}
              <div className="absolute right-3 left-3 top-1/2 h-0.5 -translate-y-1/2 bg-slate-200 dark:bg-slate-700 z-0" />
              <div 
                className="absolute right-3 top-1/2 h-0.5 -translate-y-1/2 bg-[var(--brand-primary)] transition-all duration-500 z-0" 
                style={{ left: `${100 - (statusIdx / (statusOptions.length - 1)) * 100}%` }}
              />
              
              {statusOptions.map((st, sidx) => {
                const isPassed = sidx <= statusIdx;
                const isCurrent = sidx === statusIdx;
                return (
                  <div key={st} className="relative z-10 flex flex-col items-center">
                    <div 
                      className={`flex h-6.5 w-6.5 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-300 border-2 ${
                        isCurrent ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] ring-4 ring-indigo-100" :
                        isPassed ? "bg-emerald-500 text-white border-emerald-500" :
                        "bg-[var(--surface-1)] text-[var(--text-muted)] border-slate-300"
                      }`}
                      style={{ width: "24px", height: "24px" }}
                      title={st}
                    >
                      {isPassed && !isCurrent ? "✓" : sidx + 1}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick status actions */}
          <div className="flex items-center justify-between border-t border-[var(--border-default)] pt-3.5 mt-1">
            <span className="text-[11px] text-[var(--text-muted)] font-mono">{order.updatedAt}</span>
            <div className="flex gap-2">
              {statusIdx > 0 && (
                <Button 
                  onClick={() => moveOrder(order, "prev")}
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 rounded-xl text-[12px] px-3 border-[var(--border-default)] hover:bg-[var(--surface-2)]"
                >
                  {statusOptions[statusIdx - 1]}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              )}
              {statusIdx < statusOptions.length - 1 && (
                <Button 
                  onClick={() => moveOrder(order, "next")}
                  size="sm"
                  className="h-8 gap-1 rounded-xl text-[12px] px-3 bg-[var(--brand-soft)] hover:bg-[var(--brand-hover)]/20 text-[var(--brand-primary)] border-none"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  {statusOptions[statusIdx + 1]}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function shareOrdersSummaryWhatsApp() {
    const pending = orders.filter(o => o.status === "قيد الانتظار").length;
    const inProgress = orders.filter(o => o.status === "قيد التنفيذ").length;
    const ready = orders.filter(o => o.status === "جاهز للاستلام").length;
    const completed = orders.filter(o => o.status === "مكتمل").length;
    const lines = [
      `📋 *تقرير الطلبات - ${settings.businessName}*`,
      `📅 التاريخ: ${new Date().toLocaleDateString("en-GB")}`,
      "",
      `📊 *الملخص:*`,
      `  • إجمالي الطلبات: ${orders.length}`,
      `  • ⏳ قيد الانتظار: ${pending}`,
      `  • 🔄 قيد التنفيذ: ${inProgress}`,
      `  • ✅ جاهز للاستلام: ${ready}`,
      `  • 📦 مكتمل: ${completed}`,
    ];
    const active = orders.filter(o => o.status !== "مكتمل");
    if (active.length > 0) {
      lines.push("", `📋 *الطلبات النشطة:*`);
      active.forEach((o, i) => {
        const emoji = o.status === "قيد الانتظار" ? "⏳" : o.status === "قيد التنفيذ" ? "🔄" : "✅";
        lines.push(`${i + 1}. ${o.trackingId} | ${o.clientName} | ${emoji} ${o.status}`);
        if (o.description) lines.push(`   📝 ${o.description}`);
      });
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
  }

  return (
    <ResponsiveShell>
      <div className="space-y-6">
        {/* Title widget banner */}
        <div className="relative overflow-hidden rounded-3xl bg-[var(--surface-1)] border border-[var(--border-default)] p-6 shadow-sm">
          {/* Subtle CMYK theme glows in background */}
          <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-cyan-400/10 blur-[60px]" />
          <div className="absolute left-10 -bottom-20 h-40 w-40 rounded-full bg-pink-400/10 blur-[60px]" />
          
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-[var(--text-primary)] leading-tight">تتبع الطلبات</h1>
              <p className="text-[13px] text-[var(--text-muted)] mt-1.5 font-medium">متابعة طلبات الصيانة والطباعة في الوقت الفعلي ({orders.length} طلب)</p>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <DateRangeExportButton
                label="تصدير تقرير PDF"
                onExport={async (range: DateRange) => {
                  try {
                    const { exportOrdersReportPDF } = await import("@/lib/pdf");
                    await exportOrdersReportPDF(orders, range, settings);
                    toast.success("تم تصدير تقرير الطلبات");
                  } catch {
                    toast.error("فشل تصدير التقرير");
                  }
                }}
              />
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1.5 h-9 rounded-xl border-[var(--border-default)] hover:bg-[var(--surface-2)]" 
                onClick={shareOrdersSummaryWhatsApp}
              >
                <MessageCircle className="h-4.5 w-4.5 text-emerald-600" />
                <span>مشاركة واتساب</span>
              </Button>
              
              <div className="flex rounded-xl border border-[var(--border-default)] bg-[var(--surface-2)] p-1 shrink-0">
                <button
                  onClick={() => setViewMode("kanban")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${viewMode === "kanban" ? "bg-[var(--brand-primary)] text-white shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span>لوحة كانبان</span>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${viewMode === "list" ? "bg-[var(--brand-primary)] text-white shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
                >
                  <List className="h-4 w-4" />
                  <span>قائمة خطية</span>
                </button>
              </div>
              
              <Button 
                size="sm" 
                className="gap-1.5 h-9 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] text-white" 
                onClick={() => router.push("/orders/new")}
              >
                <Plus className="h-5 w-5" />
                <span>طلب صيانة جديد</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input 
              placeholder="بحث برقم التتبع، اسم العميل، أو تفاصيل العطل..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="pr-10 h-10 rounded-xl border-[var(--border-default)] bg-[var(--surface-1)] text-[14px] focus:border-[var(--brand-primary)]" 
            />
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <CalendarDays className="h-4 w-4 text-[var(--text-muted)]" />
            <Input 
              type="date" 
              value={dateFrom} 
              onChange={(e) => setDateFrom(e.target.value)} 
              className="h-10 w-[140px] text-sm rounded-xl border-[var(--border-default)] bg-[var(--surface-1)]" 
            />
            <span className="text-xs text-[var(--text-muted)]">إلى</span>
            <Input 
              type="date" 
              value={dateTo} 
              onChange={(e) => setDateTo(e.target.value)} 
              className="h-10 w-[140px] text-sm rounded-xl border-[var(--border-default)] bg-[var(--surface-1)]" 
            />
            {(dateFrom || dateTo) && (
              <button 
                onClick={() => { setDateFrom(""); setDateTo(""); }} 
                className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {viewMode === "kanban" ? (
          /* ===== KANBAN VIEW ===== */
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {statusOptions.map((status) => {
              const config = statusConfig[status];
              const Icon = config.icon;
              const statusOrders = ((debouncedSearch || dateFrom || dateTo) ? filtered : orders).filter((o) => o.status === status);
              return (
                <div 
                  key={status} 
                  className="rounded-3xl bg-[var(--surface-1)] p-4 flex flex-col min-h-[400px] border border-[var(--border-default)] shadow-sm"
                >
                  {/* Column header */}
                  <div className="flex items-center gap-2 rounded-2xl px-3 py-2.5 mb-4 bg-[var(--surface-2)]">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${config.bg} shadow-sm`}>
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <span className="text-[13px] font-extrabold text-[var(--text-primary)]">{status}</span>
                    <span className="mr-auto rounded-full bg-[var(--surface-1)] px-2.5 py-0.5 text-[11px] font-black text-[var(--text-secondary)] shadow-sm font-mono">
                      {statusOrders.length}
                    </span>
                  </div>
                  
                  {/* Cards container */}
                  <div className="space-y-4 flex-1">
                    {statusOrders.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <ClipboardList className="mb-2 h-10 w-10 text-[var(--text-muted)] opacity-20" />
                        <p className="text-[12px] text-[var(--text-muted)]">لا توجد طلبات</p>
                      </div>
                    ) : (
                      statusOrders.map((order) => renderOrderCard(order, true))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ===== LIST VIEW ===== */
          <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {allStatuses.map((s) => {
                const isActive = statusFilter === s;
                const count = s === "الكل" ? orders.length : orders.filter((o) => o.status === s).length;
                return (
                  <button 
                    key={s} 
                    onClick={() => setStatusFilter(s)} 
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition-all border ${
                      isActive ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-sm" : "border-[var(--border-default)] bg-[var(--surface-1)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
                    }`}
                  >
                    {s}
                    <span className={`mr-1 rounded-full px-1.5 py-0.5 text-[10px] font-mono ${isActive ? "bg-white/20 text-white" : "bg-[var(--surface-2)] text-[var(--text-muted)]"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {filtered.length === 0 ? (
              <div className="m3-card bg-[var(--surface-1)] flex flex-col items-center py-16 text-center">
                <ClipboardList className="mb-3 h-12 w-12 text-[var(--text-muted)] opacity-35" />
                <p className="text-[15px] font-bold text-[var(--text-secondary)]">لا توجد طلبات مطابقة للبحث</p>
                <Button size="sm" className="mt-4 gap-1.5 rounded-xl bg-[var(--brand-primary)] text-white" onClick={() => router.push("/orders/new")}>
                  <Plus className="h-4.5 w-4.5" />
                  <span>طلب صيانة جديد</span>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map((order) => renderOrderCard(order, false))}
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm rounded-3xl" dir="rtl">
          <DialogHeader><DialogTitle className="text-red-600 font-extrabold text-[16px]">حذف الطلب نهائياً</DialogTitle></DialogHeader>
          <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed mt-2">هل أنت متأكد من حذف الطلب ذو رقم التتبع &quot;{deletingOrder?.trackingId}&quot;؟ لا يمكن التراجع عن هذا الإجراء.</p>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" className="rounded-xl h-10 text-[14px] border-[var(--border-default)]" onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
            <Button variant="destructive" className="rounded-xl h-10 text-[14px] bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}>تأكيد الحذف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ResponsiveShell>
  );
}
