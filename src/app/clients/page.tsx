"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/lib/use-debounce";
import { ResponsiveShell } from "@/components/responsive-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Search, Users, Plus, Pencil, Trash2, Phone, MapPin, DollarSign,
  FileText, ChevronDown, AlertTriangle, ArrowUpDown, Download,
  LayoutGrid, List, MessageCircle, X, ImageIcon,
} from "lucide-react";
import Link from "next/link";
import { shareAsImage, formatClientWhatsAppText, shareViaWhatsApp } from "@/lib/share";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { type Client, formatCurrency } from "@/lib/data";
import { toast } from "sonner";
import { exportCSV } from "@/lib/export";
import { DateRangeExportButton, type DateRange } from "@/components/date-range-picker";
import { CardGridSkeleton } from "@/components/skeletons";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { MobileClients } from "@/components/mobile/mobile-clients";
import { AppShell } from "@/components/app-shell";

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
  const isMobile = useIsMobile();
  const { connectionStatus } = useStore();

  if (connectionStatus === "loading") {
    return <ResponsiveShell><CardGridSkeleton /></ResponsiveShell>;
  }

  if (isMobile) {
    return <AppShell><MobileClients /></AppShell>;
  }

  return <DesktopClients />;
}

function DesktopClients() {
  const router = useRouter();
  const { clients, invoices, orders, settings, deleteClient: removeClient } = useStore();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [sortBy, setSortBy] = useState("default");
  
  // New States for Redesign
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeSegment, setActiveSegment] = useState<"all" | "vip" | "active" | "inactive">("all");

  const filtered = useMemo(() => {
    let list = clients.filter((c) => {
      const q = debouncedSearch.toLowerCase();
      const matchesSearch = !debouncedSearch ||
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.address.toLowerCase().includes(q);

      const clientInvs = invoices.filter((inv) => inv.clientId === c.id);
      
      if (activeSegment === "vip") return matchesSearch && c.totalSpent >= 1000;
      if (activeSegment === "active") return matchesSearch && clientInvs.length > 0;
      if (activeSegment === "inactive") return matchesSearch && clientInvs.length === 0;
      return matchesSearch;
    });

    switch (sortBy) {
      case "name": return [...list].sort((a, b) => a.name.localeCompare(b.name, "ar"));
      case "spent-desc": return [...list].sort((a, b) => b.totalSpent - a.totalSpent);
      case "spent-asc": return [...list].sort((a, b) => a.totalSpent - b.totalSpent);
      case "recent": return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      default: return list;
    }
  }, [clients, debouncedSearch, activeSegment, sortBy, invoices]);

  // Top 3 VIP Clients Leaderboard
  const topVIPs = useMemo(() => {
    return [...clients].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 3);
  }, [clients]);

  function confirmDelete(client: Client, e: React.MouseEvent) {
    e.stopPropagation();
    setDeletingClient(client);
    setDeleteDialogOpen(true);
  }

  function handleDelete() {
    if (!deletingClient) return;
    removeClient(deletingClient.id);
    toast.success("تم حذف العميل");
    setDeleteDialogOpen(false);
    if (selectedClient?.id === deletingClient.id) {
      setSelectedClient(null);
    }
  }

  async function exportClientSheet(client: Client, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      toast.success(`جاري تصدير بيانات ${client.name}...`);
      const { exportClientSheetPDF } = await import("@/lib/pdf");
      const clientInvoices = invoices.filter(inv => inv.clientId === client.id);
      await exportClientSheetPDF(client, clientInvoices, settings);
    } catch (e) {
      console.error("Client sheet export error:", e);
      toast.error("فشل تصدير بيانات العميل");
    }
  }

  return (
    <ResponsiveShell>
      <div className="space-y-6">
        {/* Header Hero Card */}
        <div className="relative overflow-hidden rounded-[28px] border border-[var(--glass-border)] bg-white p-8 shadow-sm">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700 border border-violet-100">
                👤 دليل العملاء الذكي
              </span>
              <h1 className="mt-3 text-3xl font-black text-[var(--text-primary)]">إدارة العملاء</h1>
              <p className="mt-1.5 text-sm text-[var(--text-muted)] max-w-xl">
                تصفح قاعدة بيانات عملاء **{settings.businessName}**، تتبع مبيعاتهم، ونسب ولائهم، وصدر تقارير حسابية فورية.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2 rounded-xl h-11 px-4 text-xs font-bold" onClick={() => {
                exportCSV("clients", ["الاسم", "الهاتف", "العنوان", "إجمالي المشتريات", "تاريخ التسجيل"],
                  filtered.map((c) => [c.name, c.phone, c.address, String(c.totalSpent), c.createdAt])
                );
                toast.success("تم التصدير");
              }}>
                <Download className="h-4 w-4" /> تصدير CSV
              </Button>
              <Button className="gap-2 rounded-xl h-11 px-5 text-xs font-bold" onClick={() => router.push("/clients/new")}>
                <Plus className="h-4 w-4" /> إضافة عميل جديد
              </Button>
            </div>
          </div>
        </div>

        {/* Top VIP Leaderboard Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topVIPs.map((client, idx) => {
            const borderColors = [
              "border-amber-200",
              "border-slate-300",
              "border-orange-200"
            ];
            const textColors = [
              "text-amber-700",
              "text-slate-600",
              "text-orange-700"
            ];
            const bgBadge = [
              "bg-amber-50 border-amber-100",
              "bg-slate-50 border-slate-200",
              "bg-orange-50 border-orange-100"
            ];
            const badges = ["🏆 VIP ذهبي", "🥈 VIP فضي", "🥉 VIP برونزي"];
            return (
              <div
                key={client.id}
                onClick={() => setSelectedClient(client)}
                className={`m3-card relative overflow-hidden bg-white p-6 rounded-2xl border ${borderColors[idx] || "border-[var(--glass-border)]"} shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[140px] cursor-pointer`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className={`text-[10px] font-black tracking-wide px-2 py-0.5 rounded-full border ${bgBadge[idx] || "bg-gray-50 border-gray-200"} ${textColors[idx] || "text-gray-700"}`}>
                      {badges[idx] || "عميل مميز"}
                    </span>
                    <h3 className="text-lg font-black text-[var(--text-primary)] mt-2.5 truncate max-w-[140px] lg:max-w-[200px]">
                      {client.name}
                    </h3>
                  </div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-full text-lg font-black ${getAvatarColor(client.id)} shadow-sm`}>
                    {client.name.charAt(0)}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center text-xs text-[var(--text-muted)]">
                  <span>إجمالي المشتريات</span>
                  <span className="font-mono font-black text-primary">{formatCurrency(client.totalSpent)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Directory Controls */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Segment Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full" style={{ scrollbarWidth: "none" }}>
            {(["all", "vip", "active", "inactive"] as const).map((seg) => {
              const labels = { all: "الكل", vip: "كبار المشترين (VIP)", active: "نشطون", inactive: "غير نشطين" };
              const count = seg === "all" ? clients.length : seg === "vip" ? clients.filter(c => c.totalSpent >= 1000).length : seg === "active" ? clients.filter(c => invoices.some(i => i.clientId === c.id)).length : clients.filter(c => !invoices.some(i => i.clientId === c.id)).length;
              return (
                <button
                  key={seg}
                  onClick={() => setActiveSegment(seg)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold border transition-all ${activeSegment === seg ? "bg-primary text-white border-primary" : "bg-white text-[var(--text-secondary)] border-[var(--glass-border)] hover:bg-gray-50"}`}
                >
                  {labels[seg]} <span className={`text-[10px] px-1.5 py-0.5 rounded-full mr-1 ${activeSegment === seg ? "bg-white/20 text-white" : "bg-gray-100 text-[var(--text-muted)]"}`}>{count}</span>
                </button>
              );
            })}
          </div>

          <div className="flex gap-3 w-full md:w-auto shrink-0">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <Input placeholder="بحث بالاسم أو الهاتف..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9 rounded-xl h-10 border-[var(--glass-border)]" />
            </div>
            <Select value={sortBy} onValueChange={(v) => v && setSortBy(v)}>
              <SelectTrigger className="w-[140px] rounded-xl h-10 border-[var(--glass-border)]">
                <SelectValue placeholder="ترتيب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">الافتراضي</SelectItem>
                <SelectItem value="name">الاسم (أ-ي)</SelectItem>
                <SelectItem value="spent-desc">الأكثر شراءً</SelectItem>
                <SelectItem value="spent-asc">الأقل شراءً</SelectItem>
                <SelectItem value="recent">المضاف حديثاً</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Directory Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Side: Client directory list */}
          <div className={`space-y-3 ${selectedClient ? "lg:col-span-7" : "lg:col-span-12"} transition-all duration-300`}>
            {filtered.length === 0 ? (
              <div className="m3-card text-center py-16 bg-white border border-[var(--glass-border)]">
                <Users className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <p className="text-sm text-[var(--text-muted)]">لا يوجد عملاء يطابقون خيارات البحث الحالية.</p>
              </div>
            ) : (
              filtered.map((client) => {
                const clientInvs = invoices.filter(inv => inv.clientId === client.id);
                const isActive = selectedClient?.id === client.id;
                return (
                  <div
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className={`rounded-2xl border p-4 transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 ${isActive ? "border-primary bg-indigo-50/10 shadow-sm" : "border-[var(--glass-border)] bg-white hover:bg-gray-50/40"}`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold ${getAvatarColor(client.id)}`}>
                        {client.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-[var(--text-primary)] truncate">{client.name}</h4>
                        <p className="text-xs text-[var(--text-muted)] mt-1 flex gap-2">
                          <span>📞 {client.phone || "بدون هاتف"}</span>
                          <span>📍 {client.address || "بدون عنوان"}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-left hidden sm:block">
                        <span className="text-sm font-black text-[var(--text-primary)] block">{formatCurrency(client.totalSpent)}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">{clientInvs.length} فواتير</span>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={(e) => exportClientSheet(client, e)} className="h-8 w-8 rounded-lg bg-gray-50 hover:bg-gray-100 text-[var(--text-secondary)] flex items-center justify-center transition-colors">
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={(e) => {
                          e.stopPropagation();
                          const clientInvs = invoices.filter(inv => inv.clientId === client.id);
                          shareViaWhatsApp(formatClientWhatsAppText(client, clientInvs, settings));
                        }} className="h-8 w-8 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 flex items-center justify-center transition-colors">
                          <MessageCircle className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); router.push(`/clients/${client.id}/edit`); }} className="h-8 w-8 rounded-lg bg-gray-50 hover:bg-gray-100 text-indigo-600 flex items-center justify-center transition-colors">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={(e) => confirmDelete(client, e)} className="h-8 w-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Side: Collapsible Customer Details & Activity Panel */}
          {selectedClient && (
            <div id="client-preview-card" className="lg:col-span-5 border border-[var(--glass-border)] bg-white rounded-[24px] p-6 shadow-sm space-y-6 animate-fade-in relative">
              <div className="flex justify-between items-start border-b border-gray-50 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold ${getAvatarColor(selectedClient.id)}`}>
                    {selectedClient.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-primary)]">{selectedClient.name}</h3>
                    <span className="text-xs text-[var(--text-muted)]">مسجل منذ {selectedClient.createdAt}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedClient(null)} className="h-8 w-8 rounded-full bg-gray-50 text-[var(--text-muted)] hover:bg-gray-100 flex items-center justify-center transition-colors no-capture">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Client Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50/50 border border-gray-100 rounded-xl p-3.5">
                  <span className="text-[11px] text-[var(--text-muted)] font-bold block">إجمالي الإنفاق</span>
                  <span className="text-base font-black text-primary block mt-0.5">{formatCurrency(selectedClient.totalSpent)}</span>
                </div>
                <div className="bg-gray-50/50 border border-gray-100 rounded-xl p-3.5">
                  <span className="text-[11px] text-[var(--text-muted)] font-bold block">الفواتير المسجلة</span>
                  <span className="text-base font-black text-[var(--text-primary)] block mt-0.5">
                    {invoices.filter(i => i.clientId === selectedClient.id).length} فاتورة
                  </span>
                </div>
              </div>

              {/* Dynamic activity invoices list */}
              <div>
                <h4 className="text-xs font-bold text-[var(--text-muted)] mb-3 border-b border-gray-50 pb-2">سجل الفواتير الصادرة</h4>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {invoices.filter(i => i.clientId === selectedClient.id).length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)] py-4 text-center">لا توجد فواتير مرتبطة بهذا العميل.</p>
                  ) : (
                    invoices.filter(i => i.clientId === selectedClient.id).map(inv => (
                      <div key={inv.id} className="flex justify-between items-center p-2.5 rounded-lg border border-gray-50 hover:bg-gray-50 transition-colors">
                        <div>
                          <Link href={`/invoices/${inv.id}`} className="text-xs font-bold text-primary hover:underline block">{inv.invoiceNumber}</Link>
                          <span className="text-[10px] text-[var(--text-muted)]">{inv.createdAt}</span>
                        </div>
                        <span className="text-xs font-bold font-mono text-[var(--text-primary)]">{formatCurrency(inv.total)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="flex flex-col gap-2 pt-4 border-t border-gray-50 no-capture">
                <div className="flex gap-2">
                  <Button className="flex-1 rounded-xl h-10 text-xs font-bold keep-capture" onClick={() => router.push(`/invoices/new?clientId=${selectedClient.id}`)}>
                    <Plus className="h-4 w-4 ml-1" /> إنشاء فاتورة جديدة
                  </Button>
                  <Button variant="outline" className="flex-1 rounded-xl h-10 text-xs font-bold text-indigo-700 border-indigo-200 bg-indigo-50/10 hover:bg-indigo-50/20 keep-capture" onClick={() => router.push(`/clients/${selectedClient.id}/edit`)}>
                    <Pencil className="h-4 w-4 ml-1" /> تعديل العميل
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 rounded-xl h-10 text-xs font-bold keep-capture" onClick={(e) => exportClientSheet(selectedClient, e)}>
                    <Download className="h-4 w-4 ml-1" /> تصدير كشف حساب PDF
                  </Button>
                  <Button variant="outline" className="flex-1 rounded-xl h-10 text-xs font-bold text-green-700 border-green-200 hover:bg-green-50/20 keep-capture" onClick={() => {
                    const clientInvs = invoices.filter(inv => inv.clientId === selectedClient.id);
                    shareViaWhatsApp(formatClientWhatsAppText(selectedClient, clientInvs, settings));
                  }}>
                    <MessageCircle className="h-4 w-4 ml-1" /> مشاركة واتساب
                  </Button>
                </div>
                <Button variant="outline" className="w-full rounded-xl h-10 text-xs font-bold text-cyan-700 border-cyan-200 hover:bg-cyan-50/20 keep-capture" onClick={() => {
                  toast.promise(shareAsImage('client-preview-card', `حساب_${selectedClient.name}`), {
                    loading: 'جاري توليد الصورة...',
                    success: 'تم تصدير الصورة بنجاح',
                    error: 'فشل تصدير الصورة'
                  });
                }}>
                  <ImageIcon className="h-4 w-4 ml-1" /> تصدير كصورة حساب PNG
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle className="text-red-600">حذف العميل</DialogTitle></DialogHeader>
          <p className="text-base text-muted-foreground">هل أنت متأكد من حذف العميل &quot;{deletingClient?.name}&quot;؟</p>
          {deletingClient && invoices.filter((i) => i.clientId === deletingClient.id).length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              <AlertTriangle className="inline h-4 w-4 ml-1" />
              هذا العميل لديه {invoices.filter((i) => i.clientId === deletingClient.id).length} فاتورة مرتبطة.
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
            <Button variant="destructive" onClick={handleDelete}>حذف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ResponsiveShell>
  );
}
