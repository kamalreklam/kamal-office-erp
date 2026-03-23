"use client";

import { useState, useMemo } from "react";
import { useDebounce } from "@/lib/use-debounce";
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
import { exportReportPDF } from "@/lib/pdf";
import { DateRangeExportButton, type DateRange } from "@/components/date-range-picker";
import { createOrdersReport } from "@/lib/report-generators";

const statusOptions: OrderStatus[] = ["قيد الانتظار", "قيد التنفيذ", "جاهز للاستلام", "مكتمل"];

const statusConfig: Record<OrderStatus, { icon: typeof Clock; bg: string; borderColor: string; headerBg: string }> = {
  "قيد الانتظار": { icon: Clock, bg: "bg-[var(--warning-soft)] text-[var(--amber-500)]", borderColor: "rgba(217, 119, 6, 0.2)", headerBg: "var(--warning-soft)" },
  "قيد التنفيذ": { icon: Loader2, bg: "bg-[var(--info-soft)] text-[var(--blue-500)]", borderColor: "rgba(37, 99, 235, 0.2)", headerBg: "var(--info-soft)" },
  "جاهز للاستلام": { icon: PackageCheck, bg: "bg-[var(--success-soft)] text-[var(--green-500)]", borderColor: "rgba(5, 150, 105, 0.2)", headerBg: "var(--success-soft)" },
  "مكتمل": { icon: CheckCircle2, bg: "bg-[var(--accent-soft)] text-[var(--purple-500)]", borderColor: "rgba(139, 92, 246, 0.2)", headerBg: "rgba(139, 92, 246, 0.08)" },
};

export default function OrdersPage() {
  const { orders, clients, addOrder, updateOrder, deleteOrder, settings } = useStore();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<(typeof orders)[0] | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<(typeof orders)[0] | null>(null);
  const [formData, setFormData] = useState({ clientId: "", description: "", status: "قيد الانتظار" as OrderStatus });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch = debouncedSearch === "" || o.trackingId.toLowerCase().includes(debouncedSearch.toLowerCase()) || o.clientName.includes(debouncedSearch) || o.description.includes(debouncedSearch);
      const matchStatus = statusFilter === "الكل" || o.status === statusFilter;
      const matchDateFrom = !dateFrom || o.createdAt >= dateFrom;
      const matchDateTo = !dateTo || o.createdAt <= dateTo;
      return matchSearch && matchStatus && matchDateFrom && matchDateTo;
    });
  }, [orders, debouncedSearch, statusFilter, dateFrom, dateTo]);

  function openAddDialog() {
    setEditingOrder(null);
    setFormData({ clientId: "", description: "", status: "قيد الانتظار" });
    setDialogOpen(true);
  }

  function openEditDialog(order: (typeof orders)[0]) {
    setEditingOrder(order);
    setFormData({ clientId: order.clientId, description: order.description, status: order.status });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!formData.clientId || !formData.description.trim()) { toast.error("يرجى ملء جميع الحقول"); return; }
    const client = clients.find((c) => c.id === formData.clientId);
    if (!client) return;
    if (editingOrder) {
      updateOrder(editingOrder.id, { clientId: formData.clientId, clientName: client.name, description: formData.description, status: formData.status });
      toast.success("تم تحديث الطلب");
    } else {
      addOrder({ clientId: formData.clientId, clientName: client.name, description: formData.description, status: formData.status });
      toast.success("تم إنشاء الطلب بنجاح");
    }
    setDialogOpen(false);
  }

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
      <Card key={order.id} className={`border border-[var(--glass-border)] shadow-sm transition-all hover:shadow-md ${compact ? "" : ""}`}>
        <CardContent className={compact ? "p-4" : "p-6"}>
          <div className={compact ? "space-y-3" : "flex items-start gap-5"}>
            {!compact && (
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${config.bg}`}>
                <Icon className="h-6 w-6" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-mono font-bold ${compact ? "text-sm" : "text-base"}`}>{order.trackingId}</span>
                <button onClick={() => copyTrackingId(order.trackingId)} className="rounded p-1 text-muted-foreground hover:bg-[var(--surface-2)]">
                  <Copy className="h-3.5 w-3.5" />
                </button>
                {!compact && (
                  <Badge variant="outline" className={`gap-1 text-xs ${getOrderStatusColor(order.status)}`}>{order.status}</Badge>
                )}
              </div>
              <p className={`mt-1.5 font-medium text-foreground ${compact ? "text-sm" : "text-base"}`}>{order.clientName}</p>
              <p className={`mt-0.5 text-muted-foreground leading-relaxed ${compact ? "text-xs line-clamp-2" : "text-sm"}`}>{order.description}</p>
              <p className={`mt-2 text-muted-foreground ${compact ? "text-[10px]" : "text-xs"}`}>
                {order.updatedAt}
              </p>
            </div>
          </div>
          {/* Actions */}
          <div className={`flex items-center gap-1 ${compact ? "mt-3 border-t border-[var(--glass-border)] pt-3" : "mt-4 border-t border-[var(--glass-border)] pt-4"}`}>
            {/* Move status buttons */}
            {statusIdx < statusOptions.length - 1 && (
              <button
                onClick={() => moveOrder(order, "next")}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
              >
                <ChevronLeft className="h-3 w-3" />
                {statusOptions[statusIdx + 1]}
              </button>
            )}
            {statusIdx > 0 && (
              <button
                onClick={() => moveOrder(order, "prev")}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-[var(--surface-2)]"
              >
                {statusOptions[statusIdx - 1]}
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
            <div className="mr-auto flex gap-0.5">
              <button onClick={() => openEditDialog(order)} className="rounded-xl p-2 text-muted-foreground hover:bg-[var(--surface-2)]"><Pencil className="h-3.5 w-3.5" /></button>
              <button onClick={() => shareOrderWhatsApp(order)} className="rounded-xl p-2 text-muted-foreground hover:bg-green-50 hover:text-green-600"><MessageCircle className="h-3.5 w-3.5" /></button>
              <button onClick={() => confirmDelete(order)} className="rounded-xl p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <AppShell>
      <div className="space-y-8 page-enter">
        <div className="animate-fade-in-up text-center">
          <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">تتبع الطلبات</h1>
          <p className="mt-1.5 text-sm text-muted-foreground sm:mt-2 sm:text-base">متابعة طلبات الصيانة والطباعة ({orders.length} طلب)</p>
          <div className="mt-4 flex justify-center gap-2">
            <DateRangeExportButton
              label="تصدير تقرير PDF"
              onExport={async (range: DateRange) => {
                const doc = createOrdersReport(orders, range, settings);
                await exportReportPDF(doc, "تقرير_الطلبات", range);
                toast.success("تم تصدير تقرير الطلبات");
              }}
            />
            {/* View toggle */}
            <div className="flex rounded-xl border border-[var(--glass-border)] bg-[var(--surface-1)] p-1">
              <button
                onClick={() => setViewMode("kanban")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${viewMode === "kanban" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">كانبان</span>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${viewMode === "list" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">قائمة</span>
              </button>
            </div>
            <Button size="sm" className="gap-1.5" onClick={openAddDialog}><Plus className="h-5 w-5" />طلب جديد</Button>
          </div>
        </div>

        {/* Search & Date Filter */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="بحث برقم التتبع، اسم العميل، أو الوصف..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-[140px] text-sm" />
            <span className="text-sm text-muted-foreground">إلى</span>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-[140px] text-sm" />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-[var(--surface-2)]">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {viewMode === "kanban" ? (
          /* ===== KANBAN VIEW ===== */
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statusOptions.map((status) => {
              const config = statusConfig[status];
              const Icon = config.icon;
              const statusOrders = ((debouncedSearch || dateFrom || dateTo) ? filtered : orders).filter((o) => o.status === status);
              return (
                <div key={status} className="rounded-2xl bg-[var(--surface-1)]" style={{ border: `1px solid ${config.borderColor}` }}>
                  {/* Column header */}
                  <div className="flex items-center gap-2.5 rounded-t-2xl px-4 py-3" style={{ background: config.headerBg }}>
                    <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${config.bg}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-bold text-foreground">{status}</span>
                    <span className="mr-auto rounded-full bg-[var(--surface-1)]/80 px-2 py-0.5 text-xs font-bold text-muted-foreground shadow-sm">
                      {statusOrders.length}
                    </span>
                  </div>
                  {/* Cards */}
                  <div className="space-y-3 p-3">
                    {statusOrders.length === 0 ? (
                      <div className="flex flex-col items-center py-8 text-muted-foreground">
                        <ClipboardList className="mb-2 h-8 w-8 opacity-15" />
                        <p className="text-xs">لا توجد طلبات</p>
                        <Button size="sm" variant="outline" className="mt-3 gap-1.5 text-xs" onClick={openAddDialog}><Plus className="h-3.5 w-3.5" />طلب جديد</Button>
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
          <>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {allStatuses.map((s) => {
                const isActive = statusFilter === s;
                const count = s === "الكل" ? orders.length : orders.filter((o) => o.status === s).length;
                return (
                  <button key={s} onClick={() => setStatusFilter(s)} className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all ${isActive ? "bg-primary text-primary-foreground shadow-sm" : "border border-border bg-[var(--surface-1)] text-muted-foreground hover:bg-[var(--surface-2)]"}`}>
                    {s}<span className={`mr-1 rounded-full px-1.5 py-0.5 text-xs ${isActive ? "bg-[var(--surface-1)]/20" : "bg-muted text-muted-foreground"}`}>{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-4 stagger-list">
              {filtered.length === 0 ? (
                <Card className="border border-[var(--glass-border)] shadow-sm">
                  <CardContent className="flex flex-col items-center py-16 text-muted-foreground">
                    <ClipboardList className="mb-3 h-10 w-10 opacity-30" />
                    <p className="text-base">لا توجد طلبات مطابقة</p>
                    <Button size="sm" className="mt-4 gap-1.5" onClick={openAddDialog}><Plus className="h-4 w-4" />طلب جديد</Button>
                  </CardContent>
                </Card>
              ) : (
                filtered.map((order) => renderOrderCard(order, false))
              )}
            </div>
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>{editingOrder ? "تعديل الطلب" : "طلب جديد"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5"><label className="text-sm font-medium">العميل</label>
              <Select value={formData.clientId} onValueChange={(v) => v && setFormData({ ...formData, clientId: v })}><SelectTrigger><SelectValue placeholder="اختر عميل..." /></SelectTrigger><SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="grid gap-1.5"><label className="text-sm font-medium">وصف الطلب</label><Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="مثال: صيانة طابعة HP" /></div>
            <div className="grid gap-1.5"><label className="text-sm font-medium">الحالة</label>
              <Select value={formData.status} onValueChange={(v) => v && setFormData({ ...formData, status: v as OrderStatus })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0"><Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button><Button onClick={handleSave}>{editingOrder ? "حفظ" : "إنشاء"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle className="text-red-600">حذف الطلب</DialogTitle></DialogHeader>
          <p className="text-base text-muted-foreground">هل أنت متأكد من حذف &quot;{deletingOrder?.trackingId}&quot;؟</p>
          <DialogFooter className="gap-2 sm:gap-0"><Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button><Button variant="destructive" onClick={handleDelete}>حذف</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
