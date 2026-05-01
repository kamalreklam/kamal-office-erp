"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/lib/use-debounce";
import { Search, Users, Phone } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/data";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { DateRangeExportButton, type DateRange } from "@/components/date-range-picker";

export function MobileClients() {
  const { clients, invoices, settings } = useStore();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);

  const filtered = useMemo(() => {
    if (!debouncedSearch) return clients;
    const q = debouncedSearch.toLowerCase();
    return clients.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.address.toLowerCase().includes(q));
  }, [clients, debouncedSearch]);

  return (
    <div className="space-y-4" dir="rtl">
      {/* Stats */}
      <div className="rounded-2xl p-4 text-center" style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}>
        <p style={{ fontSize: 26, fontWeight: 800, color: "var(--primary)" }}>{clients.length}</p>
        <p style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 600 }}>عميل مسجل</p>
      </div>

      {/* Add client */}
      <button onClick={() => router.push("/clients/new")}
        style={{ width: "100%", height: 52, borderRadius: 16, fontSize: 17, fontWeight: 800, background: "var(--primary)", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <Plus style={{ width: 20, height: 20 }} /> عميل جديد
      </button>

      {/* Export actions */}
      <div className="flex gap-2" style={{ marginTop: 8 }}>
        <DateRangeExportButton label="تصدير PDF" buttonStyle={{ flex: 1, height: 48, borderRadius: 14, fontSize: 16, fontWeight: 700, background: "var(--surface-1)", color: "var(--primary)", border: "2px solid var(--border-default)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onExport={async (range: DateRange) => {
            try { const { exportClientsReportPDF } = await import("@/lib/pdf"); await exportClientsReportPDF(clients, invoices, range, settings); toast.success("تم التصدير"); } catch { toast.error("فشل التصدير"); }
          }} />

        <button onClick={() => {
          const lines = [`👥 *العملاء — ${settings.businessName}*`, `عدد العملاء: ${clients.length}`, ""];
          clients.slice(0, 15).forEach((c, i) => { lines.push(`${i + 1}. ${c.name} | ${c.phone || "-"}`); });
          window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
        }} style={{ flex: 1, height: 48, borderRadius: 14, fontSize: 16, fontWeight: 700, background: "#25D366", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          واتساب
        </button>
      </div>

      {/* Search */}
      <div className="relative" style={{ marginTop: 8 }}>
        <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
        <input
          type="text"
          placeholder="ابحث عن عميل..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl border-2 pr-12 pl-4"
          style={{ height: 52, fontSize: 18, background: "var(--surface-1)", borderColor: "var(--border-default)", color: "var(--text-primary)", outline: "none" }}
        />
      </div>

      {/* Count */}
      <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{filtered.length} عميل</p>

      {/* Client cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-3xl p-10 text-center" style={{ background: "var(--surface-1)" }}>
            <Users className="mx-auto h-10 w-10 mb-3" style={{ color: "var(--text-muted)", opacity: 0.3 }} />
            <p style={{ fontSize: 18, color: "var(--text-muted)" }}>لا يوجد عملاء</p>
          </div>
        ) : (
          filtered.map((client) => {
            const clientInvCount = invoices.filter((i) => i.clientId === client.id).length;
            return (
              <button
                key={client.id}
                onClick={() => router.push(`/clients/${client.id}`)}
                className="w-full rounded-2xl p-4 text-right"
                style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
                    style={{ fontSize: 22, fontWeight: 800, background: "var(--accent-soft)", color: "var(--primary)" }}
                  >
                    {client.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>{client.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {client.phone && (
                        <span className="flex items-center gap-1" dir="ltr" style={{ fontSize: 14, color: "var(--text-muted)" }}>
                          <Phone style={{ width: 12, height: 12 }} />
                          {client.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <p style={{ fontSize: 18, fontWeight: 800, color: "var(--primary)" }}>{formatCurrency(client.totalSpent)}</p>
                    <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{clientInvCount} فاتورة</p>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
