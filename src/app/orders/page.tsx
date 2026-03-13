"use client";

import { useState, useMemo } from "react";
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
  Clock, Loader2, CheckCircle2, PackageCheck, Copy,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { type OrderStatus, getOrderStatusColor } from "@/lib/data";
import { toast } from "sonner";

const statusOptions: OrderStatus[] = ["قيد الانتظار", "قيد التنفيذ", "جاهز للاستلام", "مكتمل"];

function getStatusIcon(status: OrderStatus) {
  switch (status) {
    case "قيد الانتظار": return Clock;
    case "قيد التنفيذ": return Loader2;
    case "جاهز للاستلام": return PackageCheck;
    case "مكتمل": return CheckCircle2;
  }
}

export default function OrdersPage() {
  const { orders, clients, addOrder, updateOrder, deleteOrder, settings } = useStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<(typeof orders)[0] | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<(typeof orders)[0] | null>(null);
  const [formData, setFormData] = useState({ clientId: "", description: "", status: "قيد الانتظار" as OrderStatus });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch = search === "" || o.trackingId.toLowerCase().includes(search.toLowerCase()) || o.clientName.includes(search) || o.description.includes(search);
      const matchStatus = statusFilter === "الكل" || o.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, search, statusFilter]);

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

  const allStatuses = ["الكل", ...statusOptions];

  return (
    <AppShell>
      <div className="space-y-6 page-enter">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up">
          <div>
            <h1 className="text-2xl font-bold text-foreground">تتبع الطلبات</h1>
            <p className="mt-1 text-sm text-muted-foreground">متابعة طلبات الصيانة والطباعة ({orders.length} طلب)</p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={openAddDialog}><Plus className="h-4 w-4" />طلب جديد</Button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 stagger-children">
          {statusOptions.map((status) => {
            const Icon = getStatusIcon(status);
            const count = orders.filter((o) => o.status === status).length;
            const colorMap: Record<string, string> = { "قيد الانتظار": "bg-amber-50 text-amber-600", "قيد التنفيذ": "bg-blue-50 text-blue-600", "جاهز للاستلام": "bg-emerald-50 text-emerald-600", "مكتمل": "bg-slate-100 text-slate-600" };
            return (
              <Card key={status} className="cursor-pointer border shadow-sm hover-lift" onClick={() => setStatusFilter(statusFilter === status ? "الكل" : status)}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorMap[status]}`}><Icon className="h-5 w-5" /></div>
                  <div><p className="text-xs text-muted-foreground">{status}</p><p className="text-lg font-bold">{count}</p></div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="بحث برقم التتبع، اسم العميل، أو الوصف..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {allStatuses.map((s) => {
            const isActive = statusFilter === s;
            const count = s === "الكل" ? orders.length : orders.filter((o) => o.status === s).length;
            return (
              <button key={s} onClick={() => setStatusFilter(s)} className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all ${isActive ? "bg-primary text-primary-foreground shadow-sm" : "border border-border bg-white text-muted-foreground hover:bg-accent"}`}>
                {s}<span className={`mr-1 rounded-full px-1.5 py-0.5 text-[11px] ${isActive ? "bg-white/20" : "bg-muted text-muted-foreground"}`}>{count}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-3 stagger-list">
          {filtered.length === 0 ? (
            <Card className="border shadow-sm"><CardContent className="flex flex-col items-center py-16 text-muted-foreground"><ClipboardList className="mb-3 h-10 w-10 opacity-30" /><p>لا توجد طلبات مطابقة</p></CardContent></Card>
          ) : (
            filtered.map((order) => {
              const Icon = getStatusIcon(order.status);
              const bgMap: Record<string, string> = { "قيد الانتظار": "bg-amber-50 text-amber-600", "قيد التنفيذ": "bg-blue-50 text-blue-600", "جاهز للاستلام": "bg-emerald-50 text-emerald-600", "مكتمل": "bg-slate-100 text-slate-600" };
              return (
                <Card key={order.id} className="border shadow-sm transition-all hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${bgMap[order.status]}`}><Icon className="h-6 w-6" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-bold">{order.trackingId}</span>
                          <button onClick={() => copyTrackingId(order.trackingId)} className="rounded p-1 text-muted-foreground hover:bg-accent"><Copy className="h-3.5 w-3.5" /></button>
                          <Badge variant="outline" className={`gap-1 text-xs ${getOrderStatusColor(order.status)}`}>{order.status}</Badge>
                        </div>
                        <p className="mt-1.5 text-sm font-medium text-foreground">{order.clientName}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{order.description}</p>
                        <p className="mt-2 text-[11px] text-muted-foreground">أنشئ: {order.createdAt} · آخر تحديث: {order.updatedAt}</p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1 sm:flex-row sm:items-center">
                        <button onClick={() => openEditDialog(order)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => shareOrderWhatsApp(order)} className="rounded-lg p-2 text-muted-foreground hover:bg-green-50 hover:text-green-600"><MessageCircle className="h-4 w-4" /></button>
                        <button onClick={() => confirmDelete(order)} className="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
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
          <p className="text-sm text-muted-foreground">هل أنت متأكد من حذف &quot;{deletingOrder?.trackingId}&quot;؟</p>
          <DialogFooter className="gap-2 sm:gap-0"><Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button><Button variant="destructive" onClick={handleDelete}>حذف</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
