"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/lib/use-debounce";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { type Client, formatCurrency } from "@/lib/data";
import { toast } from "sonner";
import { exportCSV } from "@/lib/export";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { MobileClients } from "@/components/mobile/mobile-clients";
import { DateRangeExportButton, type DateRange } from "@/components/date-range-picker";
import {
  Users,
  Search,
  Plus,
  Phone,
  MapPin,
  Download,
  FileText,
  MessageCircle,
  MoreVertical,
  Pencil,
  Trash2,
  ChevronDown,
  LayoutGrid,
  List as ListIcon
} from "lucide-react";

// Helper for generating consistent colors based on client name
function getClientColor(name: string) {
  const colors = [
    "bg-indigo-100 text-indigo-700 border-indigo-200",
    "bg-emerald-100 text-emerald-700 border-emerald-200",
    "bg-amber-100 text-amber-700 border-amber-200",
    "bg-rose-100 text-rose-700 border-rose-200",
    "bg-cyan-100 text-cyan-700 border-cyan-200",
    "bg-violet-100 text-violet-700 border-violet-200",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function ClientsPage() {
  const isMobile = useIsMobile();
  const { connectionStatus } = useStore();

  if (connectionStatus === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Use the premium responsive layout for both Desktop and Mobile, so we skip MobileClients.
  // This unifies the layout and styling following the "Vibrant SaaS" guidelines.
  return <PremiumClientsLayout />;
}

function PremiumClientsLayout() {
  const isMobile = useIsMobile();
  const router = useRouter();
  const { clients, invoices, orders, settings, deleteClient: removeClient, addClient } = useStore();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [sortBy, setSortBy] = useState("default");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filtered = useMemo(() => {
    const list = debouncedSearch.trim()
      ? (() => {
          const q = debouncedSearch.toLowerCase();
          return clients.filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              c.phone.includes(q) ||
              c.address.toLowerCase().includes(q)
          );
        })()
      : [...clients];
    switch (sortBy) {
      case "name": return list.sort((a, b) => a.name.localeCompare(b.name, "ar"));
      case "spent-desc": return list.sort((a, b) => b.totalSpent - a.totalSpent);
      case "spent-asc": return list.sort((a, b) => a.totalSpent - b.totalSpent);
      case "recent": return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      default: return list;
    }
  }, [clients, debouncedSearch, sortBy]);

  function handleDelete(client: Client) {
    const snapshot = { name: client.name, phone: client.phone, address: client.address, notes: client.notes };
    removeClient(client.id);
    toast.success(`تم حذف "${client.name}"`, {
      duration: 5000,
      action: {
        label: "تراجع",
        onClick: () => addClient(snapshot),
      },
    });
  }

  function shareWhatsApp() {
    const totalSpent = filtered.reduce((s, c) => s + c.totalSpent, 0);
    const lines = [
      `👥 *تقرير العملاء - ${settings.businessName}*`,
      `📅 التاريخ: ${new Date().toLocaleDateString("en-GB")}`,
      "",
      `📊 *الملخص:*`,
      `  • عدد العملاء: ${filtered.length}`,
      `  • إجمالي المبيعات: ${settings.currencySymbol}${totalSpent.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      `  • عدد الفواتير: ${invoices.length}`,
      "",
      `📋 *قائمة العملاء:*`,
    ];
    filtered.forEach((c, i) => {
      const clientInvCount = invoices.filter((inv) => inv.clientId === c.id).length;
      lines.push(`${i + 1}. *${c.name}*`);
      lines.push(`   📞 ${c.phone || "—"} | 📍 ${c.address || "—"}`);
      lines.push(`   💰 المشتريات: ${settings.currencySymbol}${c.totalSpent.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${clientInvCount} فاتورة)`);
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
  }

  async function exportClientSheet(client: Client) {
    try {
      toast.success(`جاري تصدير بيانات ${client.name}...`);
      const { exportClientSheetPDF } = await import("@/lib/pdf");
      const clientInvoices = invoices.filter((inv) => inv.clientId === client.id);
      await exportClientSheetPDF(client, clientInvoices, settings);
    } catch (e) {
      console.error("Client sheet export error:", e);
      toast.error("فشل تصدير بيانات العميل");
    }
  }

  const totalSales = clients.reduce((s, c) => s + c.totalSpent, 0);

  return (
    <div className="pb-32 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/30 min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="w-16 h-16 rounded-3xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 mb-6">
              <Users className="size-8" />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">إدارة العملاء</h1>
            <p className="mt-2 text-base font-medium text-slate-500 max-w-lg leading-relaxed">
              إدارة بيانات العملاء وتتبع مشترياتهم وفواتيرهم بكل سهولة.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button
              className="flex-1 md:flex-none h-14 px-6 rounded-2xl bg-sky-500 border border-sky-600 text-white font-bold hover:bg-sky-600 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
              onClick={() => {
                exportCSV(
                  "clients",
                  ["الاسم", "الهاتف", "العنوان", "إجمالي المشتريات", "تاريخ التسجيل"],
                  filtered.map((c) => [c.name, c.phone, c.address, String(c.totalSpent), c.createdAt])
                );
                toast.success("تم تصدير العملاء");
              }}
            >
              <Download className="size-5" />
              <span className="hidden sm:inline">تصدير CSV</span>
            </button>
            
            <button
              className="flex-1 md:flex-none h-14 px-6 rounded-2xl bg-[#25D366] text-white border border-[#1DA851] font-bold hover:bg-[#1DA851] active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
              onClick={shareWhatsApp}
            >
              <MessageCircle className="size-5" />
              <span className="hidden sm:inline">واتساب</span>
            </button>

            <DateRangeExportButton
              label="تقرير PDF"
              className="flex-1 md:flex-none h-14 px-6 rounded-2xl bg-rose-500 border border-rose-600 text-white font-bold hover:bg-rose-600 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
              onExport={async (range: DateRange) => {
                try {
                  const { exportClientsReportPDF } = await import("@/lib/pdf");
                  await exportClientsReportPDF(filtered, invoices, range, settings);
                  toast.success("تم تصدير تقرير العملاء");
                } catch {
                  toast.error("فشل تصدير التقرير");
                }
              }}
            />
            
            <button
              className="w-full md:w-auto h-14 px-8 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-[0_8px_20px_-6px_rgba(79,70,229,0.4)] flex items-center justify-center gap-2"
              onClick={() => router.push("/clients/new")}
            >
              <Plus className="size-6" />
              <span>عميل جديد</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white rounded-[2rem] p-6 border border-slate-200/60 shadow-sm flex items-center gap-5 hover:border-indigo-200 hover:shadow-md transition-all">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Users className="size-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">إجمالي العملاء</p>
              <p className="text-3xl font-black text-slate-900 tracking-tight">{clients.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-[2rem] p-6 border border-slate-200/60 shadow-sm flex items-center gap-5 hover:border-emerald-200 hover:shadow-md transition-all">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <span className="text-2xl font-black">$</span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">المبيعات</p>
              <p className="text-3xl font-black text-slate-900 font-mono tracking-tight">{formatCurrency(totalSales)}</p>
            </div>
          </div>
          <div className="bg-white rounded-[2rem] p-6 border border-slate-200/60 shadow-sm flex items-center gap-5 hover:border-amber-200 hover:shadow-md transition-all">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <FileText className="size-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">إجمالي الفواتير</p>
              <p className="text-3xl font-black text-slate-900 tracking-tight">{invoices.length}</p>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-[2rem] p-4 sm:p-6 border border-slate-200/60 shadow-sm flex flex-col lg:flex-row items-center gap-4">
          <div className="relative w-full lg:flex-1">
            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
              <Search className="size-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="البحث برقم الهاتف، الاسم، أو العنوان..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pr-12 pl-4 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="relative w-full lg:w-48">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 pr-10 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
              >
                <option value="default">الترتيب الافتراضي</option>
                <option value="name">الاسم (أ-ي)</option>
                <option value="spent-desc">الإنفاق: الأعلى</option>
                <option value="spent-asc">الإنفاق: الأقل</option>
                <option value="recent">الأحدث</option>
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                <ChevronDown className="size-4 text-slate-400" />
              </div>
            </div>

            <div className="hidden sm:flex items-center bg-slate-50 border border-slate-200 p-1 rounded-2xl">
              <button
                onClick={() => setViewMode("grid")}
                className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${
                  viewMode === "grid" 
                    ? "bg-white text-indigo-600 shadow-sm border border-slate-200/60" 
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                }`}
                title="عرض شبكة"
              >
                <LayoutGrid className="size-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${
                  viewMode === "list" 
                    ? "bg-white text-indigo-600 shadow-sm border border-slate-200/60" 
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                }`}
                title="عرض قائمة"
              >
                <ListIcon className="size-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Clients Grid/List */}
        {filtered.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-xl border border-slate-200/60 rounded-[2rem] py-24 px-6 text-center shadow-sm">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="size-10 text-slate-400" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">لا يوجد عملاء</h3>
            <p className="mt-3 text-base font-medium text-slate-500 max-w-md mx-auto leading-relaxed">
              لم يتم العثور على أي عملاء يطابقون معايير البحث الخاصة بك.
            </p>
            <button
              className="mt-8 h-12 px-8 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-[0_8px_20px_-6px_rgba(79,70,229,0.4)] inline-flex items-center justify-center gap-2"
              onClick={() => router.push("/clients/new")}
            >
              <Plus className="size-5" />
              <span>إضافة عميل</span>
            </button>
          </div>
        ) : viewMode === "list" ? (
          <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-sm overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                  <tr>
                    <th className="px-6 py-4 rounded-tr-[2rem]">العميل</th>
                    <th className="px-6 py-4">الهاتف</th>
                    <th className="px-6 py-4">العنوان</th>
                    <th className="px-6 py-4">الفواتير</th>
                    <th className="px-6 py-4">إجمالي المشتريات</th>
                    <th className="px-6 py-4 text-center rounded-tl-[2rem]">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((client) => {
                    const invCount = invoices.filter((i) => i.clientId === client.id).length;
                    const cStyle = getClientColor(client.name);
                    return (
                      <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg border shadow-sm shrink-0 ${cStyle}`}>
                              {client.name.charAt(0)}
                            </div>
                            <span className="font-bold text-slate-900 block truncate max-w-[180px]">{client.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-medium font-mono" dir="ltr">
                          {client.phone || "—"}
                        </td>
                        <td className="px-6 py-4 text-slate-600 max-w-[200px] truncate">
                          {client.address || "—"}
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-indigo-50 text-indigo-700 font-black px-3 py-1 rounded-lg">
                            {invCount}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-black font-mono text-indigo-600">
                            {formatCurrency(client.totalSpent)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => exportClientSheet(client)}
                              className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 hover:border hover:border-indigo-200 transition-all border border-transparent shadow-sm"
                              title="تصدير بيانات العميل"
                            >
                              <Download className="size-5" />
                            </button>
                            <Link
                              href={`/clients/${client.id}/edit`}
                              className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border hover:border-emerald-200 transition-all border border-transparent shadow-sm"
                              title="تعديل العميل"
                            >
                              <Pencil className="size-5" />
                            </Link>
                            <button
                              onClick={() => handleDelete(client)}
                              className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border hover:border-rose-200 transition-all border border-transparent shadow-sm"
                              title="حذف العميل"
                            >
                              <Trash2 className="size-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {viewMode === "grid" || (viewMode === "list" && isMobile) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map((client) => {
              const invCount = invoices.filter((i) => i.clientId === client.id).length;
              const ordCount = orders.filter((o) => o.clientId === client.id).length;
              const cStyle = getClientColor(client.name);

              return (
                <div key={client.id} className="bg-white rounded-[2rem] border border-slate-200/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col group">
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl border shadow-sm shrink-0 ${cStyle}`}>
                        {client.name.charAt(0)}
                      </div>
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/clients/${client.id}/edit`}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all shadow-sm"
                          title="تعديل"
                        >
                          <Pencil className="size-4" />
                        </Link>
                        <button
                          onClick={() => exportClientSheet(client)}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm"
                          title="تصدير"
                        >
                          <Download className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(client)}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all shadow-sm"
                          title="حذف"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-5">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight truncate">
                        {client.name}
                      </h3>
                      <div className="mt-3 space-y-2">
                        {client.phone && (
                          <div className="flex items-center gap-2 text-slate-500">
                            <Phone className="size-4 shrink-0 text-slate-400" />
                            <span className="text-sm font-bold font-mono text-slate-600" dir="ltr">{client.phone}</span>
                          </div>
                        )}
                        {client.address && (
                          <div className="flex items-center gap-2 text-slate-500">
                            <MapPin className="size-4 shrink-0 text-slate-400" />
                            <span className="text-sm font-medium truncate">{client.address}</span>
                          </div>
                        )}
                        {!client.phone && !client.address && (
                          <div className="text-sm text-slate-400 italic font-medium">لا توجد بيانات إضافية</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-white border border-slate-200 text-slate-600 text-xs font-black px-3 py-1.5 rounded-xl shadow-sm">
                        {invCount} فاتورة
                      </span>
                      {ordCount > 0 && (
                        <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-black px-3 py-1.5 rounded-xl shadow-sm">
                          {ordCount} طلب
                        </span>
                      )}
                    </div>
                    <div className="text-left shrink-0">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">المشتريات</span>
                      <span className="font-black text-lg font-mono text-indigo-600 tracking-tight">{formatCurrency(client.totalSpent)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
