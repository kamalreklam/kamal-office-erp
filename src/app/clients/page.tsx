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
  Search, Users, Plus, Pencil, Trash2, Phone, MapPin, DollarSign,
  FileText, ChevronDown, ChevronUp, Clock, CheckCircle2, PackageCheck, Loader2,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { type Client, formatCurrency, getStatusColor, getOrderStatusColor } from "@/lib/data";
import { toast } from "sonner";

const emptyClient = { name: "", phone: "", address: "" };

export default function ClientsPage() {
  const { clients, invoices, orders, addClient, updateClient, deleteClient: removeClient } = useStore();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState(emptyClient);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    return clients.filter((c) => c.name.includes(search) || c.phone.includes(search) || c.address.includes(search));
  }, [clients, search]);

  function openAddDialog() {
    setEditingClient(null);
    setFormData(emptyClient);
    setDialogOpen(true);
  }

  function openEditDialog(client: Client) {
    setEditingClient(client);
    setFormData({ name: client.name, phone: client.phone, address: client.address });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!formData.name.trim()) { toast.error("يرجى إدخال اسم العميل"); return; }
    if (editingClient) {
      updateClient(editingClient.id, formData);
      toast.success("تم تحديث بيانات العميل");
    } else {
      addClient(formData);
      toast.success("تم إضافة العميل بنجاح");
    }
    setDialogOpen(false);
  }

  function confirmDelete(client: Client) {
    setDeletingClient(client);
    setDeleteDialogOpen(true);
  }

  function handleDelete() {
    if (!deletingClient) return;
    removeClient(deletingClient.id);
    toast.success("تم حذف العميل");
    setDeleteDialogOpen(false);
  }

  function getClientTimeline(clientId: string) {
    const clientInvoices = invoices.filter((inv) => inv.clientId === clientId).map((inv) => ({
      type: "invoice" as const, date: inv.createdAt, title: inv.invoiceNumber,
      subtitle: `${inv.items.length} منتجات · ${formatCurrency(inv.total)}`,
      status: inv.status, statusColor: getStatusColor(inv.status),
    }));
    const clientOrders = orders.filter((o) => o.clientId === clientId).map((ord) => ({
      type: "order" as const, date: ord.updatedAt, title: ord.trackingId,
      subtitle: ord.description, status: ord.status, statusColor: getOrderStatusColor(ord.status),
    }));
    return [...clientInvoices, ...clientOrders].sort((a, b) => b.date.localeCompare(a.date));
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

  return (
    <AppShell>
      <div className="space-y-6 page-enter">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up">
          <div>
            <h1 className="text-2xl font-bold text-foreground">العملاء</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {clients.length} عميل مسجل · إجمالي المبيعات: {formatCurrency(clients.reduce((s, c) => s + c.totalSpent, 0))}
            </p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={openAddDialog}>
            <Plus className="h-4 w-4" />
            إضافة عميل
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3 stagger-children">
          <Card className="border shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Users className="h-5 w-5" /></div>
              <div><p className="text-xs text-muted-foreground">العملاء</p><p className="text-lg font-bold">{clients.length}</p></div>
            </CardContent>
          </Card>
          <Card className="border shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><DollarSign className="h-5 w-5" /></div>
              <div><p className="text-xs text-muted-foreground">المبيعات</p><p className="text-lg font-bold">{formatCurrency(clients.reduce((s, c) => s + c.totalSpent, 0))}</p></div>
            </CardContent>
          </Card>
          <Card className="border shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><FileText className="h-5 w-5" /></div>
              <div><p className="text-xs text-muted-foreground">الفواتير</p><p className="text-lg font-bold">{invoices.length}</p></div>
            </CardContent>
          </Card>
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="بحث بالاسم، الهاتف، أو العنوان..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
        </div>

        <div className="space-y-3 stagger-list">
          {filtered.length === 0 ? (
            <Card className="border shadow-sm">
              <CardContent className="flex flex-col items-center py-16 text-muted-foreground">
                <Users className="mb-3 h-10 w-10 opacity-30" /><p>لا يوجد عملاء مطابقين</p>
              </CardContent>
            </Card>
          ) : (
            filtered.map((client) => {
              const isExpanded = expandedClient === client.id;
              const timeline = getClientTimeline(client.id);
              const invCount = invoices.filter((i) => i.clientId === client.id).length;
              const ordCount = orders.filter((o) => o.clientId === client.id).length;

              return (
                <Card key={client.id} className="border shadow-sm transition-all hover:shadow-md">
                  <CardContent className="p-0">
                    <div className="flex items-center gap-4 p-5">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-base font-bold text-primary">
                        {client.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-foreground">{client.name}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3" /><span dir="ltr">{client.phone}</span></span>
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{client.address}</span>
                        </div>
                      </div>
                      <div className="hidden sm:flex shrink-0 flex-col items-end gap-2">
                        <span className="text-sm font-bold">{formatCurrency(client.totalSpent)}</span>
                        <div className="flex gap-1.5">
                          <Badge variant="secondary" className="text-[10px]">{invCount} فاتورة</Badge>
                          <Badge variant="secondary" className="text-[10px]">{ordCount} طلب</Badge>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button onClick={() => openEditDialog(client)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => confirmDelete(client)} className="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                        <button onClick={() => setExpandedClient(isExpanded ? null : client.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Mobile stats */}
                    <div className="flex items-center justify-between border-t border-border px-5 py-3 sm:hidden">
                      <div className="flex gap-1.5">
                        <Badge variant="secondary" className="text-[10px]">{invCount} فاتورة</Badge>
                        <Badge variant="secondary" className="text-[10px]">{ordCount} طلب</Badge>
                      </div>
                      <span className="text-sm font-bold">{formatCurrency(client.totalSpent)}</span>
                    </div>

                    {/* Timeline */}
                    {isExpanded && (
                      <div className="border-t border-border bg-muted/10 p-5">
                        <h4 className="mb-4 text-xs font-bold text-muted-foreground">سجل العمليات</h4>
                        {timeline.length === 0 ? (
                          <p className="py-6 text-center text-sm text-muted-foreground">لا توجد سجلات لهذا العميل</p>
                        ) : (
                          <div className="relative pr-8">
                            <div className="absolute right-3 top-2 bottom-2 w-0.5 bg-border" />
                            <div className="space-y-4">
                              {timeline.map((item, idx) => {
                                const Icon = item.type === "invoice" ? FileText : getOrderIcon(item.status);
                                return (
                                  <div key={idx} className="relative flex gap-3">
                                    <div className="absolute -right-6.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-primary/15">
                                      <div className="h-2 w-2 rounded-full bg-primary" />
                                    </div>
                                    <div className="flex-1 rounded-xl border border-border bg-white p-3.5 transition-colors hover:bg-accent/30">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <Icon className="h-4 w-4 text-muted-foreground" />
                                          <span className="text-sm font-medium">{item.title}</span>
                                          <Badge variant="outline" className={`text-[10px] ${item.statusColor}`}>{item.status}</Badge>
                                        </div>
                                        <span className="shrink-0 text-[11px] text-muted-foreground">{item.date}</span>
                                      </div>
                                      <p className="mt-1 text-xs text-muted-foreground">{item.subtitle}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>{editingClient ? "تعديل بيانات العميل" : "إضافة عميل جديد"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5"><label className="text-sm font-medium">الاسم</label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="اسم العميل" /></div>
            <div className="grid gap-1.5"><label className="text-sm font-medium">رقم الهاتف</label><Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="09XXXXXXXX" dir="ltr" /></div>
            <div className="grid gap-1.5"><label className="text-sm font-medium">العنوان</label><Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="حلب - الحي" /></div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave}>{editingClient ? "حفظ" : "إضافة"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle className="text-red-600">حذف العميل</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">هل أنت متأكد من حذف &quot;{deletingClient?.name}&quot;؟</p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
            <Button variant="destructive" onClick={handleDelete}>حذف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
