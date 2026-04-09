"use client";

import { useState, useMemo } from "react";
import { useDebounce } from "@/lib/use-debounce";
import { Search, ClipboardList, Plus, X, Check } from "lucide-react";
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
        <div className="flex-1 rounded-2xl p-4 text-center" style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}>
          <p style={{ fontSize: 26, fontWeight: 800, color: "var(--primary)" }}>{orders.length}</p>
          <p style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 600 }}>طلب</p>
        </div>
        <div className="flex-1 rounded-2xl p-4 text-center" style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}>
          <p style={{ fontSize: 26, fontWeight: 800, color: "var(--amber-500)" }}>{orders.filter((o) => o.status !== "مكتمل").length}</p>
          <p style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 600 }}>نشط</p>
        </div>
      </div>

      {/* Add order */}
      <button
        onClick={() => setShowAdd(!showAdd)}
        style={{ width: "100%", height: 52, borderRadius: 16, fontSize: 17, fontWeight: 800, background: "var(--primary)", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
      >
        <Plus style={{ width: 20, height: 20 }} /> طلب جديد
      </button>

      {/* Export actions */}
      <div className="flex gap-2" style={{ marginTop: 8 }}>
        <DateRangeExportButton label="تصدير PDF" buttonStyle={{ flex: 1, height: 48, borderRadius: 14, fontSize: 16, fontWeight: 700, background: "var(--surface-1)", color: "var(--primary)", border: "2px solid var(--border-default)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onExport={async (range: DateRange) => {
            try { const { exportOrdersReportPDF } = await import("@/lib/pdf"); await exportOrdersReportPDF(orders, range, settings); toast.success("تم التصدير"); } catch { toast.error("فشل التصدير"); }
          }} />
        
        <button onClick={() => {
          const lines = [`📋 *الطلبات — ${settings.businessName}*`, `عدد الطلبات: ${orders.length}`, ""];
          orders.slice(0, 10).forEach((o, i) => { lines.push(`${i + 1}. ${o.trackingId} | ${o.clientName} | ${o.status}`); });
          window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
        }} style={{ flex: 1, height: 48, borderRadius: 14, fontSize: 16, fontWeight: 700, background: "#25D366", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          واتساب
        </button>
      </div>

      {showAdd && (
        <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}>
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
        <input type="text" placeholder="ابحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-2xl border-2 pr-12 pl-4"
          style={{ height: 52, fontSize: 18, background: "var(--surface-1)", borderColor: "var(--border-default)", color: "var(--text-primary)", outline: "none" }} />
      

      {/* Status filter */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {["الكل", ...statusList].map((s) => {
          const active = statusFilter === s;
          return (
            <button key={s} onClick={() => setStatusFilter(s)} className="flex shrink-0 items-center rounded-xl px-4 py-2.5"
              style={{ fontSize: 14, fontWeight: 700, background: active ? "var(--primary)" : "var(--surface-1)", color: active ? "white" : "var(--text-secondary)", border: active ? "none" : "1px solid var(--border-subtle)", cursor: "pointer", whiteSpace: "nowrap" }}>
              {s}
            </button>
          );
        })}
      </div>

      {/* Order cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-3xl p-10 text-center" style={{ background: "var(--surface-1)" }}>
            <ClipboardList className="mx-auto h-10 w-10 mb-3" style={{ color: "var(--text-muted)", opacity: 0.3 }} />
            <p style={{ fontSize: 18, color: "var(--text-muted)" }}>لا توجد طلبات</p>
          </div>
        ) : (
          filtered.map((order) => (
            <div key={order.id} className="rounded-2xl p-4" style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}>
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                  <p style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>{order.trackingId}</p>
                  <p style={{ fontSize: 16, color: "var(--text-secondary)", marginTop: 2 }}>{order.clientName}</p>
                </div>
                <Badge variant="outline" className={`text-xs shrink-0 ${getOrderStatusColor(order.status)}`}>{order.status}</Badge>
              </div>
              <p style={{ fontSize: 15, color: "var(--text-muted)", lineHeight: 1.5 }}>{order.description}</p>
              <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{order.createdAt}</span>
                <div className="flex gap-2">
                  <button onClick={() => cycleStatus(order)} style={{ height: 36, paddingInline: 12, borderRadius: 10, fontSize: 13, fontWeight: 700, background: "var(--accent-soft)", color: "var(--primary)", border: "none", cursor: "pointer" }}>
                    تغيير الحالة
                  </button>
                  <button onClick={() => { deleteOrder(order.id); toast.success("تم حذف الطلب"); }} style={{ height: 36, width: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--danger-soft)", color: "var(--red-500)", border: "none", cursor: "pointer" }}>
                    <X style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      </div>
    </div>
  );
}
