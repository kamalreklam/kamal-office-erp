"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/lib/use-debounce";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { MobileOrders } from "@/components/mobile/mobile-orders";
import { useStore } from "@/lib/store";
import { type OrderStatus } from "@/lib/data";
import { toast } from "sonner";
import { DateRangeExportButton, type DateRange } from "@/components/date-range-picker";
import { motion } from "framer-motion";
import {
  Clock,
  Loader2,
  PackageCheck,
  CheckCircle2,
  Search,
  Calendar,
  X,
  Share2,
  LayoutGrid,
  List as ListIcon,
  Plus,
  Copy,
  ChevronLeft,
  ChevronRight,
  Pencil,
  MessageCircle,
  Trash2,
  ClipboardList
} from "lucide-react";

const statusOptions: OrderStatus[] = ["قيد الانتظار", "قيد التنفيذ", "جاهز للاستلام", "مكتمل"];

const statusConfig: Record<OrderStatus, { icon: any; color: string; bg: string; border: string }> = {
  "قيد الانتظار": { icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  "قيد التنفيذ": { icon: Loader2, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  "جاهز للاستلام": { icon: PackageCheck, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200" },
  "مكتمل": { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
};

export default function OrdersPage() {
  return <DesktopOrders />;
}

function DesktopOrders() {
  const router = useRouter();
  const { orders, updateOrder, deleteOrder, addOrder, settings, connectionStatus } = useStore();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const q = debouncedSearch.toLowerCase();
      const matchSearch =
        debouncedSearch === "" ||
        o.trackingId.toLowerCase().includes(q) ||
        o.clientName.toLowerCase().includes(q) ||
        o.description.toLowerCase().includes(q);
      const matchStatus = statusFilter === "الكل" || o.status === statusFilter;
      const matchDateFrom = !dateFrom || o.createdAt >= dateFrom;
      const matchDateTo = !dateTo || o.createdAt <= dateTo;
      return matchSearch && matchStatus && matchDateFrom && matchDateTo;
    });
  }, [orders, debouncedSearch, statusFilter, dateFrom, dateTo]);

  function handleDelete(order: (typeof orders)[0]) {
    const snapshot = {
      clientId: order.clientId,
      clientName: order.clientName,
      description: order.description,
      status: order.status,
    };
    deleteOrder(order.id);
    toast.success(`تم حذف الطلب "${order.trackingId}"`, {
      duration: 5000,
      action: {
        label: "تراجع",
        onClick: () => addOrder(snapshot),
      },
    });
  }

  function copyTrackingId(id: string) {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success("تم نسخ رقم التتبع");
    setTimeout(() => setCopiedId(null), 2000);
  }

  function shareOrderWhatsApp(order: (typeof orders)[0]) {
    const emoji =
      order.status === "قيد الانتظار" ? "⏳"
      : order.status === "قيد التنفيذ" ? "🔄"
      : order.status === "جاهز للاستلام" ? "✅"
      : "📦";
    const lines = [
      `📋 *تحديث طلب - ${settings.businessName}*`,
      "",
      `🔖 رقم التتبع: *${order.trackingId}*`,
      `👤 العميل: ${order.clientName}`,
      `📝 ${order.description}`,
      `${emoji} الحالة: *${order.status}*`,
      `📅 آخر تحديث: ${order.updatedAt}`,
    ];
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
  }

  function moveOrder(order: (typeof orders)[0], direction: "next" | "prev") {
    const idx = statusOptions.indexOf(order.status);
    const newIdx = direction === "next" ? idx + 1 : idx - 1;
    if (newIdx < 0 || newIdx >= statusOptions.length) return;
    updateOrder(order.id, { status: statusOptions[newIdx] });
    toast.success(`تم نقل الطلب إلى: ${statusOptions[newIdx]}`);
  }

  function shareOrdersSummaryWhatsApp() {
    const pending = orders.filter((o) => o.status === "قيد الانتظار").length;
    const inProgress = orders.filter((o) => o.status === "قيد التنفيذ").length;
    const ready = orders.filter((o) => o.status === "جاهز للاستلام").length;
    const completed = orders.filter((o) => o.status === "مكتمل").length;
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
    const active = orders.filter((o) => o.status !== "مكتمل");
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

  const allStatuses = ["الكل", ...statusOptions];

  function renderOrderCard(order: (typeof orders)[0], compact = false) {
    const config = statusConfig[order.status];
    const statusIdx = statusOptions.indexOf(order.status);
    const Icon = config.icon;

    return (
      <div 
        key={order.id} 
        className="bg-white rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all overflow-hidden mb-4 group"
      >
        <div className={`p-5 ${!compact ? 'sm:p-6' : ''}`}>
          {/* Top row: icon + details */}
          <div className={`flex items-start gap-4 ${compact ? 'flex-col sm:flex-row sm:gap-3' : ''}`}>
            {!compact && (
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${config.bg} ${config.color}`}>
                <Icon className="size-6" />
              </div>
            )}
            <div className="flex-1 min-w-0 w-full">
              {/* Tracking ID row */}
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className={`font-mono font-black text-slate-900 ${compact ? 'text-xs' : 'text-sm'}`}>
                  {order.trackingId}
                </span>
                <button
                  onClick={() => copyTrackingId(order.trackingId)}
                  className={`p-1.5 rounded-lg transition-colors ${copiedId === order.trackingId ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                  title="نسخ رقم التتبع"
                >
                  <Copy className="size-3.5" />
                </button>
                {!compact && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black border ${config.bg} ${config.color} ${config.border}`}>
                    <Icon className="size-3" />
                    {order.status}
                  </span>
                )}
              </div>

              {/* Client name */}
              <h3 className={`font-bold text-slate-900 truncate ${compact ? 'text-sm' : 'text-base'}`}>
                {order.clientName}
              </h3>

              {/* Description */}
              <p className={`text-slate-500 font-medium mt-1 leading-relaxed ${compact ? 'text-xs line-clamp-2' : 'text-sm'}`}>
                {order.description}
              </p>

              {/* Updated at */}
              <div className="flex items-center gap-1.5 mt-3 text-slate-400 font-bold">
                <Clock className="size-3.5" />
                <span className={compact ? 'text-[10px]' : 'text-xs'}>{order.updatedAt}</span>
              </div>
            </div>
          </div>

          {/* Actions row */}
          <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t border-slate-100">
            <div className="flex gap-1">
              {/* Move to next status */}
              {statusIdx < statusOptions.length - 1 && (
                <button
                  onClick={() => moveOrder(order, "next")}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors text-xs font-bold"
                >
                  <ChevronRight className="size-3.5" />
                  <span>{statusOptions[statusIdx + 1]}</span>
                </button>
              )}

              {/* Move to prev status */}
              {statusIdx > 0 && (
                <button
                  onClick={() => moveOrder(order, "prev")}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors text-xs font-bold"
                >
                  <ChevronLeft className="size-3.5" />
                  <span>{statusOptions[statusIdx - 1]}</span>
                </button>
              )}
            </div>

            {/* Icon actions pushed to end */}
            <div className="flex items-center gap-1">
              <button 
                onClick={() => router.push(`/orders/${order.id}/edit`)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                title="تعديل الطلب"
              >
                <Pencil className="size-4" />
              </button>
              <button 
                onClick={() => shareOrderWhatsApp(order)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-[#25D366]/10 hover:text-[#25D366] transition-colors"
                title="مشاركة عبر واتساب"
              >
                <MessageCircle className="size-4" />
              </button>
              <button 
                onClick={() => handleDelete(order)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                title="حذف الطلب"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (connectionStatus === 'loading') {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-32 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/30 min-h-screen" dir="rtl">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div>
            <div className="w-16 h-16 rounded-3xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 mb-6">
              <ClipboardList className="size-8" />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
              تتبع الطلبات
              <span className="bg-indigo-100 text-indigo-700 text-sm px-3 py-1 rounded-xl">
                {orders.length}
              </span>
            </h1>
            <p className="mt-2 text-base font-medium text-slate-500 max-w-lg leading-relaxed">
              متابعة طلبات الصيانة والطباعة والخدمات بكل سهولة.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            <DateRangeExportButton
              label="تقرير PDF"
              className="flex-1 sm:flex-none h-14 px-6 rounded-2xl bg-rose-500 border border-rose-600 text-white font-bold hover:bg-rose-600 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
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
            
            <button
              onClick={shareOrdersSummaryWhatsApp}
              className="flex-1 sm:flex-none h-14 px-6 rounded-2xl bg-[#25D366] text-white border border-[#1DA851] font-bold hover:bg-[#1DA851] active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Share2 className="size-5" />
              <span className="hidden sm:inline">مشاركة</span>
            </button>

            <div className="flex bg-slate-200/50 p-1 rounded-2xl border border-slate-200 h-14">
              <button
                onClick={() => setViewMode("kanban")}
                className={`w-12 flex items-center justify-center rounded-xl transition-all ${viewMode === 'kanban' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                title="عرض كانبان"
              >
                <LayoutGrid className="size-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`w-12 flex items-center justify-center rounded-xl transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                title="عرض قائمة"
              >
                <ListIcon className="size-5" />
              </button>
            </div>

            <button
              onClick={() => router.push("/orders/new")}
              className="w-full sm:w-auto h-14 px-8 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-[0_8px_20px_-6px_rgba(79,70,229,0.4)] flex items-center justify-center gap-2"
            >
              <Plus className="size-5" />
              <span>طلب جديد</span>
            </button>
          </div>
        </div>

        {/* Search + date filter */}
        <div className="bg-white rounded-[2.5rem] p-4 sm:p-6 border border-slate-200/60 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                <Search className="size-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="بحث برقم التتبع، اسم العميل، أو الوصف..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-14 pl-4 pr-12 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold text-slate-900"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-40">
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <Calendar className="size-4 text-slate-400" />
                  </div>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full h-14 pl-4 pr-10 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold text-slate-600 text-sm"
                  />
                </div>
                <span className="text-slate-400 font-bold text-sm">إلى</span>
                <div className="relative flex-1 sm:w-40">
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <Calendar className="size-4 text-slate-400" />
                  </div>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full h-14 pl-4 pr-10 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold text-slate-600 text-sm"
                  />
                </div>
              </div>
              
              {(dateFrom || dateTo) && (
                <button 
                  onClick={() => { setDateFrom(""); setDateTo(""); }}
                  className="w-14 h-14 shrink-0 rounded-2xl border border-rose-200 text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors"
                  title="مسح التواريخ"
                >
                  <X className="size-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Kanban or List view */}
        <div>
          {viewMode === "kanban" ? (
            <KanbanView
              orders={orders}
              filtered={filtered}
              debouncedSearch={debouncedSearch}
              dateFrom={dateFrom}
              dateTo={dateTo}
              renderOrderCard={renderOrderCard}
              router={router}
            />
          ) : (
            <ListView
              filtered={filtered}
              orders={orders}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              allStatuses={allStatuses}
              renderOrderCard={renderOrderCard}
              router={router}
            />
          )}
        </div>

      </div>
    </div>
  );
}

/* ===== KANBAN VIEW ===== */
interface KanbanViewProps {
  orders: ReturnType<typeof useStore>["orders"];
  filtered: ReturnType<typeof useStore>["orders"];
  debouncedSearch: string;
  dateFrom: string;
  dateTo: string;
  renderOrderCard: (order: ReturnType<typeof useStore>["orders"][0], compact?: boolean) => React.ReactNode;
  router: ReturnType<typeof useRouter>;
}

function KanbanView({ orders, filtered, debouncedSearch, dateFrom, dateTo, renderOrderCard, router }: KanbanViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
      {statusOptions.map((status) => {
        const config = statusConfig[status];
        const statusOrders = (debouncedSearch || dateFrom || dateTo ? filtered : orders).filter((o) => o.status === status);
        const Icon = config.icon;

        return (
          <div key={status} className="bg-slate-50/50 rounded-[2.5rem] border border-slate-200/60 overflow-hidden flex flex-col max-h-[800px]">
            {/* Column header */}
            <div className={`flex items-center gap-3 px-6 py-5 ${config.bg} border-b border-slate-200/60 shrink-0`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center bg-white ${config.color} shadow-sm`}>
                <Icon className="size-4" />
              </div>
              <h2 className="text-base font-black text-slate-900 flex-1 truncate">{status}</h2>
              <span className={`inline-flex items-center justify-center h-6 px-2.5 rounded-lg text-xs font-black bg-white ${config.color} shadow-sm`}>
                {statusOrders.length}
              </span>
            </div>

            {/* Cards */}
            <div className="p-4 overflow-y-auto hide-scrollbar flex-1">
              {statusOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }} className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <ClipboardList className="size-8 text-slate-300" />
                  </motion.div>
                  <p className="font-bold text-sm">لا توجد طلبات</p>
                  <button
                    onClick={() => router.push("/orders/new")}
                    className="mt-4 px-4 py-2 rounded-xl border border-slate-200 hover:bg-white hover:text-indigo-600 transition-colors flex items-center gap-2 text-sm font-bold text-slate-600 bg-slate-50"
                  >
                    <Plus className="size-4" />
                    <span>إضافة طلب</span>
                  </button>
                </div>
              ) : (
                statusOrders.map((order) => renderOrderCard(order, true))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ===== LIST VIEW ===== */
interface ListViewProps {
  filtered: ReturnType<typeof useStore>["orders"];
  orders: ReturnType<typeof useStore>["orders"];
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  allStatuses: string[];
  renderOrderCard: (order: ReturnType<typeof useStore>["orders"][0], compact?: boolean) => React.ReactNode;
  router: ReturnType<typeof useRouter>;
}

function ListView({ filtered, orders, statusFilter, setStatusFilter, allStatuses, renderOrderCard, router }: ListViewProps) {
  return (
    <div className="space-y-6">
      {/* Status filter chips */}
      <div className="flex gap-2 flex-wrap pb-2 overflow-x-auto hide-scrollbar">
        {allStatuses.map((s) => {
          const count = s === "الكل" ? orders.length : orders.filter((o) => o.status === s).length;
          const isActive = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`h-10 px-5 rounded-xl font-bold text-sm transition-all whitespace-nowrap border ${
                isActive 
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {s} <span className={isActive ? 'opacity-80' : 'text-slate-400'}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Order cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full bg-white rounded-[2.5rem] border border-slate-200/60 p-12 flex flex-col items-center justify-center text-center">
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }} className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
              <ClipboardList className="size-10 text-slate-300" />
            </motion.div>
            <h3 className="text-xl font-black text-slate-900 mb-2">لا توجد طلبات مطابقة</h3>
            <p className="text-slate-500 font-bold">حاول تغيير معايير البحث أو إضافة طلب جديد.</p>
            <button
              onClick={() => router.push("/orders/new")}
              className="mt-6 h-12 px-6 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <Plus className="size-4" />
              <span>إنشاء طلب جديد</span>
            </button>
          </div>
        ) : (
          filtered.map((order) => renderOrderCard(order, false))
        )}
      </div>
    </div>
  );
}
