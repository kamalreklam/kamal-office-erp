"use client";

import React, { useState, useMemo } from "react";
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
  Search, Users, Plus, Pencil, Trash2, Phone, MapPin, DollarSign,
  FileText, ChevronDown, ChevronUp, Clock, CheckCircle2, PackageCheck, Loader2, AlertTriangle, ArrowUpDown, Download,
  LayoutGrid, List,
} from "lucide-react";
import Link from "next/link";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { type Client, formatCurrency, getStatusColor, getOrderStatusColor } from "@/lib/data";
import { toast } from "sonner";
import { exportCSV } from "@/lib/export";
import { DateRangeExportButton, type DateRange } from "@/components/date-range-picker";

const emptyClient = { name: "", phone: "", address: "", notes: "" };

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

export default function ClientsPage() {
  const { clients, invoices, orders, settings, addClient, updateClient, deleteClient: removeClient } = useStore();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState(emptyClient);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("default");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filtered = useMemo(() => {
    const list = debouncedSearch.trim()
      ? clients.filter((c) => c.name.includes(debouncedSearch) || c.phone.includes(debouncedSearch) || c.address.includes(debouncedSearch))
      : [...clients];
    switch (sortBy) {
      case "name": return list.sort((a, b) => a.name.localeCompare(b.name, "ar"));
      case "spent-desc": return list.sort((a, b) => b.totalSpent - a.totalSpent);
      case "spent-asc": return list.sort((a, b) => a.totalSpent - b.totalSpent);
      case "recent": return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      default: return list;
    }
  }, [clients, debouncedSearch, sortBy]);

  function openAddDialog() {
    setEditingClient(null);
    setFormData(emptyClient);
    setDialogOpen(true);
  }

  function openEditDialog(client: Client) {
    setEditingClient(client);
    setFormData({ name: client.name, phone: client.phone, address: client.address, notes: client.notes || "" });
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
      type: "invoice" as const, id: inv.id, date: inv.createdAt, title: inv.invoiceNumber,
      subtitle: `${inv.items.length} منتجات · ${formatCurrency(inv.total)}`,
      status: inv.status, statusColor: getStatusColor(inv.status),
      href: `/invoices/${inv.id}`,
    }));
    const clientOrders = orders.filter((o) => o.clientId === clientId).map((ord) => ({
      type: "order" as const, id: ord.id, date: ord.updatedAt, title: ord.trackingId,
      subtitle: ord.description, status: ord.status, statusColor: getOrderStatusColor(ord.status),
      href: "/orders",
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
      <div className="space-y-8 page-enter">
        <div className="animate-fade-in-up text-center">
          <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">العملاء</h1>
          <p className="mt-1.5 text-sm text-muted-foreground sm:mt-2 sm:text-base">
            {clients.length} عميل مسجل · إجمالي المبيعات: {formatCurrency(clients.reduce((s, c) => s + c.totalSpent, 0))}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
              exportCSV("clients", ["الاسم", "الهاتف", "العنوان", "إجمالي المشتريات", "تاريخ التسجيل"],
                filtered.map((c) => [c.name, c.phone, c.address, String(c.totalSpent), c.createdAt])
              );
              toast.success("تم تصدير العملاء");
            }}>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">تصدير CSV</span>
            </Button>
            <DateRangeExportButton
              label="تصدير تقرير PDF"
              onExport={async (range: DateRange) => {
                const { createClientsReport } = await import("@/lib/report-generators");
                const { exportReportPDF } = await import("@/lib/pdf");
                const doc = createClientsReport(filtered, invoices, range, settings);
                await exportReportPDF(doc, "تقرير_العملاء", range);
                toast.success("تم تصدير تقرير العملاء");
              }}
            />
            <Button size="sm" className="gap-1.5" onClick={openAddDialog}>
              <Plus className="h-5 w-5" />
              إضافة عميل
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4 stagger-children">
          <Card className="border border-[var(--glass-border)] shadow-sm">
            <CardContent className="flex flex-col items-center p-4 sm:p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--info-soft)] text-[var(--blue-500)] sm:h-12 sm:w-12"><Users className="h-5 w-5" /></div>
              <p className="mt-2.5 text-xs font-medium text-muted-foreground sm:text-sm">العملاء</p>
              <p className="mt-1 text-lg font-bold sm:text-xl">{clients.length}</p>
            </CardContent>
          </Card>
          <Card className="border border-[var(--glass-border)] shadow-sm">
            <CardContent className="flex flex-col items-center p-4 sm:p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--success-soft)] text-[var(--green-500)] sm:h-12 sm:w-12"><DollarSign className="h-5 w-5" /></div>
              <p className="mt-2.5 text-xs font-medium text-muted-foreground sm:text-sm">المبيعات</p>
              <p className="mt-1 text-lg font-bold sm:text-xl">{formatCurrency(clients.reduce((s, c) => s + c.totalSpent, 0))}</p>
            </CardContent>
          </Card>
          <Card className="border border-[var(--glass-border)] shadow-sm">
            <CardContent className="flex flex-col items-center p-4 sm:p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(139,92,246,0.1)] text-[var(--purple-500)] sm:h-12 sm:w-12"><FileText className="h-5 w-5" /></div>
              <p className="mt-2.5 text-xs font-medium text-muted-foreground sm:text-sm">الفواتير</p>
              <p className="mt-1 text-lg font-bold sm:text-xl">{invoices.length}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="بحث بالاسم، الهاتف، أو العنوان..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
          </div>
          <Select value={sortBy} onValueChange={(v) => v && setSortBy(v)}>
            <SelectTrigger className="w-[160px] gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="ترتيب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">الافتراضي</SelectItem>
              <SelectItem value="name">الاسم (أ-ي)</SelectItem>
              <SelectItem value="spent-desc">الإنفاق: الأعلى</SelectItem>
              <SelectItem value="spent-asc">الإنفاق: الأقل</SelectItem>
              <SelectItem value="recent">الأحدث</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex rounded-xl border border-[var(--glass-border)] overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex h-10 w-10 items-center justify-center transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-[var(--surface-1)] text-muted-foreground hover:bg-[var(--surface-2)]"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex h-10 w-10 items-center justify-center transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-[var(--surface-1)] text-muted-foreground hover:bg-[var(--surface-2)]"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Client Display */}
        {filtered.length === 0 ? (
          <Card className="border border-[var(--glass-border)] shadow-sm">
            <CardContent className="flex flex-col items-center py-16 text-muted-foreground">
              <Users className="mb-3 h-10 w-10 opacity-30" /><p className="text-base">لا يوجد عملاء مطابقين</p>
              <Button size="sm" className="mt-4 gap-1.5" onClick={openAddDialog}><Plus className="h-4 w-4" />إضافة عميل</Button>
            </CardContent>
          </Card>
        ) : viewMode === "list" ? (
          /* ===== LIST VIEW ===== */
          <Card className="border border-[var(--glass-border)] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--glass-border)] bg-[var(--surface-2)]">
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">#</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">العميل</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">الهاتف</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">العنوان</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">الفواتير</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">إجمالي الإنفاق</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">تاريخ التسجيل</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((client, idx) => {
                    const invCount = invoices.filter((i) => i.clientId === client.id).length;
                    const isExpanded = expandedClient === client.id;
                    const timeline = isExpanded ? getClientTimeline(client.id) : [];
                    return (
                      <React.Fragment key={client.id}>
                        <tr className={`border-b border-border/40 transition-colors hover:bg-[var(--surface-2)] ${isExpanded ? "bg-[var(--surface-2)]/30" : ""}`}>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${getAvatarColor(client.id)}`}>
                                {client.name.charAt(0)}
                              </div>
                              <span className="font-semibold text-foreground">{client.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground" dir="ltr">{client.phone || "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{client.address || "—"}</td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary" className="text-xs">{invCount}</Badge>
                          </td>
                          <td className="px-4 py-3 font-semibold text-primary">{formatCurrency(client.totalSpent)}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{client.createdAt}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => openEditDialog(client)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[var(--surface-2)] hover:text-foreground">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => confirmDelete(client)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => setExpandedClient(isExpanded ? null : client.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[var(--surface-2)]">
                                {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={8} className="bg-muted/10 p-0">
                              <div className="p-5">
                                <h4 className="mb-3 text-sm font-bold text-muted-foreground">سجل العمليات</h4>
                                {timeline.length === 0 ? (
                                  <p className="py-4 text-center text-sm text-muted-foreground">لا توجد سجلات لهذا العميل</p>
                                ) : (
                                  <div className="relative pr-8">
                                    <div className="absolute right-3 top-2 bottom-2 w-0.5 bg-border" />
                                    <div className="space-y-3">
                                      {timeline.map((item, tidx) => {
                                        const Icon = item.type === "invoice" ? FileText : getOrderIcon(item.status);
                                        return (
                                          <Link key={tidx} href={item.href} className="relative flex gap-3 group/tl">
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
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-[var(--surface-2)] border-t border-[var(--glass-border)]">
                    <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-muted-foreground">
                      الإجمالي ({filtered.length} عميل)
                    </td>
                    <td className="px-4 py-3 text-sm font-bold">
                      {filtered.reduce((s, c) => s + invoices.filter((i) => i.clientId === c.id).length, 0)}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-primary">
                      {formatCurrency(filtered.reduce((s, c) => s + c.totalSpent, 0))}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        ) : (
          /* ===== GRID (CARD) VIEW ===== */
          <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 stagger-list">
            {filtered.map((client) => {
              const isExpanded = expandedClient === client.id;
              const timeline = getClientTimeline(client.id);
              const invCount = invoices.filter((i) => i.clientId === client.id).length;
              const ordCount = orders.filter((o) => o.clientId === client.id).length;

              return (
                <Card key={client.id} className="border border-[var(--glass-border)] shadow-sm transition-all hover:shadow-md">
                  <CardContent className="p-0">
                    <div className="flex items-center gap-4 p-4 sm:p-5">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-bold ${getAvatarColor(client.id)}`}>
                        {client.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-foreground sm:text-base truncate">{client.name}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground sm:text-sm">
                          {client.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /><span dir="ltr">{client.phone}</span></span>}
                          {client.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{client.address}</span>}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button onClick={() => openEditDialog(client)} className="rounded-xl p-2 text-muted-foreground hover:bg-[var(--surface-2)]"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => confirmDelete(client)} className="rounded-xl p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setExpandedClient(isExpanded ? null : client.id)} className="rounded-xl p-2 text-muted-foreground hover:bg-[var(--surface-2)]">
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Stats bar */}
                    <div className="flex items-center justify-between border-t border-[var(--glass-border)] px-4 py-2.5 sm:px-5">
                      <div className="flex gap-1.5">
                        <Badge variant="secondary" className="text-xs">{invCount} فاتورة</Badge>
                        <Badge variant="secondary" className="text-xs">{ordCount} طلب</Badge>
                      </div>
                      <span className="text-sm font-bold text-primary sm:text-base">{formatCurrency(client.totalSpent)}</span>
                    </div>

                    {/* Timeline */}
                    {isExpanded && (
                      <div className="border-t border-[var(--glass-border)] bg-muted/10 p-4 sm:p-5">
                        <h4 className="mb-3 text-sm font-bold text-muted-foreground">سجل العمليات</h4>
                        {timeline.length === 0 ? (
                          <p className="py-4 text-center text-sm text-muted-foreground">لا توجد سجلات لهذا العميل</p>
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
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>{editingClient ? "تعديل بيانات العميل" : "إضافة عميل جديد"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5"><label className="text-sm font-medium">الاسم</label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="اسم العميل" /></div>
            <div className="grid gap-1.5"><label className="text-sm font-medium">رقم الهاتف</label><Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="09XXXXXXXX" dir="ltr" /></div>
            <div className="grid gap-1.5"><label className="text-sm font-medium">العنوان</label><Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="حلب - الحي" /></div>
            <div className="grid gap-1.5"><label className="text-sm font-medium">ملاحظات</label><Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="ملاحظات إضافية عن العميل..." /></div>
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
          <p className="text-base text-muted-foreground">هل أنت متأكد من حذف &quot;{deletingClient?.name}&quot;؟</p>
          {deletingClient && invoices.filter((i) => i.clientId === deletingClient.id).length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              <AlertTriangle className="inline h-4 w-4 ml-1" />
              هذا العميل لديه {invoices.filter((i) => i.clientId === deletingClient.id).length} فاتورة مرتبطة
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
            <Button variant="destructive" onClick={handleDelete}>حذف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
