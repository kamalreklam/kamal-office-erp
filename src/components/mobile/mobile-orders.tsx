"use client";

import { useState, useMemo } from "react";
import { useDebounce } from "@/lib/use-debounce";
import { Search, ClipboardList, Plus, X, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { type Order, type OrderStatus, getOrderStatusColor } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DateRangeExportButton, type DateRange } from "@/components/date-range-picker";

const statusList: OrderStatus[] = ["قيد الانتظار", "قيد التنفيذ", "جاهز للاستلام", "مكتمل"];

export function MobileOrders() {
  const { orders, clients, settings, addOrder, updateOrder, deleteOrder } = useStore();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [showAdd, setShowAdd] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newClientId, setNewClientId] = useState("");

  const filtered = useMemo(() => {
    return orders
      .filter((o) => {
        const q = debouncedSearch.toLowerCase(); const matchSearch = !debouncedSearch || o.clientName.toLowerCase().includes(q) || o.description.toLowerCase().includes(q) || o.trackingId.toLowerCase().includes(q);
        const matchStatus = statusFilter === "الكل" || o.status === statusFilter;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [orders, debouncedSearch, statusFilter]);

  function cycleStatus(order: Order) {
    const idx = statusList.indexOf(order.status as OrderStatus);
    const next = statusList[(idx + 1) % statusList.length];
    updateOrder(order.id, { status: next });
    toast.success(`${order.trackingId}: ${next}`);
  }

  function handleAdd() {
    if (!newClientId || !newDesc.trim()) {
      toast.error("اختر عميل واكتب وصف الطلب");
      return;
    }
    const client = clients.find((c) => c.id === newClientId);
    addOrder({ clientId: newClientId, clientName: client?.name || "", description: newDesc, status: "قيد الانتظار" });
    toast.success("تم إضافة الطلب");
    setNewDesc("");
    setNewClientId("");
    setShowAdd(false);
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Stats */}
      <div className="flex gap-3">
        <div className="flex-1 rounded-2xl p-4 text-center bg-[var(--surface-1)] border border-[var(--glass-border)]">
          <p style={{ fontSize: 26, fontWeight: 800, color: "var(--primary)" }}>{orders.length}</p>
          <p style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 600 }}>طلب</p>
        </div>
        <div className="flex-1 rounded-2xl p-4 text-center bg-[var(--surface-1)] border border-[var(--glass-border)]">
          <p style={{ fontSize: 26, fontWeight: 800, color: "var(--amber-500)" }}>{orders.filter((o) => o.status !== "مكتمل").length}</p>
          <p style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 600 }}>نشط</p>
        </div>
      </div>

      {/* Add order */}
      <button
        onClick={() => setShowAdd(!showAdd)}
        style={{ width: "100%", height: 52, borderRadius: 16, fontSize: 17, fontWeight: 800, background: "var(--primary)", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
      >
        <Plus style={{ width: 20, height: 20 }} /> الطلب جديد
      </button>

      {/* Export actions */}
      <div className="flex gap-2" style={{ marginTop: 8 }}>
        <DateRangeExportButton 
          label="تصدير PDF" 
          buttonStyle={{ flex: 1, height: 48, borderRadius: 14, fontSize: 16, fontWeight: 700, background: "var(--surface-1)", color: "var(--primary)", border: "2px solid var(--border-default)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} 
          onExport={async (range: DateRange) => {
            try { 
              const { exportOrdersReportPDF } = await import("@/lib/pdf"); 
              await exportOrdersReportPDF(orders, range, settings); 
              toast.success("تم التصدير"); 
            } catch { 
              toast.error("فشل التصدير"); 
            }
          }} 
        />
        
        <button 
          onClick={() => {
            const lines = [`📋 *الطلبات — ${settings.businessName}*`, `عدد الطلبات: ${orders.length}`, ""];
            orders.slice(0, 10).forEach((o, i) => { lines.push(`${i + 1}. ${o.trackingId} | ${o.clientName} | ${o.status}`); });
            window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
          }} 
          style={{ flex: 1, height: 48, borderRadius: 14, fontSize: 16, fontWeight: 700, background: "#25D366", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          واتساب
        </button>
      </div>

      {showAdd && (
        <div className="rounded-2xl p-4 space-y-3 bg-[var(--surface-1)] border border-[var(--glass-border)]">
          <select
            value={newClientId}
            onChange={(e) => setNewClientId(e.target.value)}
            style={{ width: "100%", height: 48, borderRadius: 12, fontSize: 16, padding: "0 12px", background: "var(--surface-2)", color: "var(--text-primary)", border: "1px solid var(--border-default)", outline: "none" }}
          >
            <option value="">اختر عميل...</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="وصف الطلب..."
            rows={3}
            style={{ width: "100%", borderRadius: 12, fontSize: 16, padding: 12, background: "var(--surface-2)", color: "var(--text-primary)", border: "1px solid var(--border-default)", outline: "none", resize: "none" }}
          />
          <button onClick={handleAdd} style={{ width: "100%", height: 48, borderRadius: 12, fontSize: 16, fontWeight: 700, background: "var(--green-500)", color: "white", border: "none", cursor: "pointer" }}>
            حفظ الطلب
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
        <input 
          type="text" 
          placeholder="ابحث برقم التتبع أو اسم العميل..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          className="w-full rounded-2xl border pr-12 pl-4 text-[15px]"
          style={{ height: 48, background: "var(--surface-1)", borderColor: "var(--border-default)", color: "var(--text-primary)", outline: "none" }} 
        />
      </div>

      {/* Status filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {["الكل", ...statusList].map((s) => {
          const active = statusFilter === s;
          return (
            <button 
              key={s} 
              onClick={() => setStatusFilter(s)} 
              className="flex shrink-0 items-center rounded-xl px-4 py-2.5"
              style={{ fontSize: 13, fontWeight: 700, background: active ? "var(--primary)" : "var(--surface-1)", color: active ? "white" : "var(--text-secondary)", border: active ? "none" : "1px solid var(--border-subtle)", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              {s}
            </button>
          );
        })}
      </div>

      {/* Order cards */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="m3-card p-10 text-center bg-[var(--surface-1)]">
            <ClipboardList className="mx-auto h-10 w-10 mb-3 text-[var(--text-muted)] opacity-30" />
            <p className="text-[14px] font-bold text-[var(--text-muted)]">لا توجد طلبات</p>
          </div>
        ) : (
          filtered.map((order) => {
            const statusIdx = statusList.indexOf(order.status as OrderStatus);
            return (
              <div 
                key={order.id} 
                className="m3-card relative overflow-hidden bg-[var(--surface-1)] p-4 flex flex-col gap-3.5"
              >
                {/* Status indicator bar */}
                <div 
                  className="absolute top-0 right-0 left-0 h-1"
                  style={{ background: order.status === "قيد الانتظار" ? "#EAB308" : order.status === "قيد التنفيذ" ? "#0EA5E9" : order.status === "جاهز للاستلام" ? "#22C55E" : "#8B5CF6" }}
                />

                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <span className="font-mono font-black text-[15px] tracking-wide text-[var(--text-primary)]">
                      {order.trackingId}
                    </span>
                    <p className="text-[14px] font-bold text-[var(--text-primary)] mt-1 truncate">{order.clientName}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold shrink-0 ${getOrderStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>

                <div className="text-[13px] text-[var(--text-secondary)] bg-[var(--surface-2)] p-3 rounded-xl border border-[var(--border-default)] leading-relaxed">
                  {order.description}
                </div>

                {/* Progress bar line */}
                <div className="relative pt-1 pb-2">
                  <div className="absolute right-2 left-2 top-1/2 h-1 -translate-y-1/2 bg-slate-200 rounded-full" />
                  <div 
                    className="absolute right-2 top-1/2 h-1 -translate-y-1/2 bg-[var(--brand-primary)] rounded-full transition-all duration-300"
                    style={{ left: `${100 - (statusIdx / (statusList.length - 1)) * 100}%` }}
                  />
                  
                  {/* Status dots */}
                  <div className="flex justify-between relative z-10">
                    {statusList.map((st, sidx) => {
                      const isPassed = sidx <= statusIdx;
                      return (
                        <div 
                          key={st}
                          className={`h-4 w-4 rounded-full border-2 transition-all duration-300 ${
                            sidx === statusIdx ? "bg-[var(--brand-primary)] border-[var(--brand-primary)] ring-2 ring-indigo-100 scale-110" :
                            isPassed ? "bg-emerald-500 border-emerald-500" :
                            "bg-white border-slate-300"
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[var(--border-default)] pt-3 mt-1">
                  <span className="text-[11px] text-[var(--text-muted)] font-mono">{order.createdAt}</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => cycleStatus(order)} 
                      className="h-8 px-3.5 rounded-xl text-[12px] font-bold bg-[var(--brand-soft)] text-[var(--brand-primary)] hover:bg-[var(--brand-hover)]/20 transition-colors"
                    >
                      تغيير الحالة
                    </button>
                    <button 
                      onClick={() => { deleteOrder(order.id); toast.success("تم حذف الطلب"); }} 
                      className="h-8 w-8 rounded-xl flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
