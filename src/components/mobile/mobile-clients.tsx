"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useDebounce } from "@/lib/use-debounce";
import { Search, Users, Phone, MapPin, X, Plus, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { formatCurrency, getStatusColor, type Client } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DateRangeExportButton, type DateRange } from "@/components/date-range-picker";

export function MobileClients() {
  const { clients, invoices, settings, addClient, updateClient, deleteClient } = useStore();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [previewClient, setPreviewClient] = useState<Client | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const filtered = useMemo(() => {
    if (!debouncedSearch) return clients;
    const q = debouncedSearch.toLowerCase(); return clients.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.address.toLowerCase().includes(q));
  }, [clients, debouncedSearch]);

  function getClientInvoices(clientId: string) {
    return invoices.filter((i) => i.clientId === clientId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Stats */}
      <div className="rounded-2xl p-4 text-center" style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}>
        <p style={{ fontSize: 26, fontWeight: 800, color: "var(--primary)" }}>{clients.length}</p>
        <p style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 600 }}>عميل مسجل</p>
      </div>

      {/* Add client */}
      <button onClick={() => { setEditingClient(null); setShowAddForm(true); }}
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
                onClick={() => setPreviewClient(client)}
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
                        <span dir="ltr" style={{ fontSize: 14, color: "var(--text-muted)" }}>{client.phone}</span>
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

      {/* Client detail sheet */}
      {previewClient && (
        <ClientSheet
          client={previewClient}
          invoices={getClientInvoices(previewClient.id)}
          onClose={() => setPreviewClient(null)}
          onEdit={(c) => { setPreviewClient(null); setEditingClient(c); setShowAddForm(true); }}
          onDelete={(id) => { deleteClient(id); setPreviewClient(null); toast.success("تم حذف العميل"); }}
        />
      )}

      {/* Add/Edit Client Sheet */}
      {showAddForm && <ClientFormSheet client={editingClient} onClose={() => { setShowAddForm(false); setEditingClient(null); }} onSave={(data) => {
        if (editingClient) { updateClient(editingClient.id, data); toast.success("تم تحديث العميل"); }
        else { addClient(data); toast.success("تم إضافة العميل"); }
        setShowAddForm(false); setEditingClient(null);
      }} />}
    </div>
  );
}

function ClientSheet({
  client,
  invoices: clientInvoices,
  onClose,
  onEdit,
  onDelete,
}: {
  client: Client;
  invoices: { id: string; invoiceNumber: string; clientName: string; total: number; status: import("@/lib/data").InvoiceStatus; createdAt: string }[];
  onClose: () => void;
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function close() {
    setVisible(false);
    setTimeout(onClose, 250);
  }

  return createPortal(
    <div
      onClick={close}
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        background: visible ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0)",
        backdropFilter: visible ? "blur(4px)" : "blur(0)",
        transition: "all 0.25s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100000,
          background: "var(--surface-1)",
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          maxHeight: "90vh", overflowY: "auto",
          paddingBottom: "calc(env(safe-area-inset-bottom, 8px) + 24px)",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px" }}>
          <div style={{ height: 4, width: 40, borderRadius: 4, background: "var(--border-strong)" }} />
        

        <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, fontWeight: 800, background: "var(--primary)", color: "white", flexShrink: 0,
            }}>
              {client.name.charAt(0)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>{client.name}</h2>
              {client.phone && <p dir="ltr" style={{ fontSize: 16, color: "var(--text-muted)", marginTop: 4, textAlign: "left" }}>{client.phone}</p>}
              {client.address && <p style={{ fontSize: 15, color: "var(--text-muted)", marginTop: 2 }}>{client.address}</p>}
            </div>
            <button onClick={close} style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)", color: "var(--text-muted)", border: "none", cursor: "pointer", flexShrink: 0 }}>
              <X style={{ width: 18, height: 18 }} />
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1, background: "var(--surface-2)", borderRadius: 16, padding: 16, textAlign: "center" }}>
              <p style={{ fontSize: 24, fontWeight: 800, color: "var(--primary)" }}>{formatCurrency(client.totalSpent)}</p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>إجمالي المشتريات</p>
            </div>
            <div style={{ flex: 1, background: "var(--surface-2)", borderRadius: 16, padding: 16, textAlign: "center" }}>
              <p style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)" }}>{clientInvoices.length}</p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>فاتورة</p>
            </div>
          </div>

          {/* Recent invoices */}
          {clientInvoices.length > 0 && (
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>آخر الفواتير</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {clientInvoices.slice(0, 5).map((inv) => (
                  <Link key={inv.id} href={`/invoices/${inv.id}`} onClick={close}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: 12, padding: 12, border: "1px solid var(--border-subtle)" }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{inv.invoiceNumber}</span>
                          <Badge variant="outline" className={`text-[11px] ${getStatusColor(inv.status)}`}>{inv.status}</Badge>
                        </div>
                        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{inv.createdAt}</p>
                      </div>
                      <span style={{ fontSize: 17, fontWeight: 800, color: "var(--primary)", flexShrink: 0 }}>{formatCurrency(inv.total)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* WhatsApp */}
          {/* Actions */}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => onEdit(client)} style={{ flex: 1, height: 48, borderRadius: 14, fontSize: 16, fontWeight: 700, background: "var(--accent-soft)", color: "var(--primary)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Pencil style={{ width: 16, height: 16 }} /> تعديل
            </button>
            <button onClick={() => onDelete(client.id)} style={{ height: 48, width: 48, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--danger-soft)", color: "var(--red-500)", border: "none", cursor: "pointer" }}>
              <Trash2 style={{ width: 18, height: 18 }} />
            </button>
            {client.phone && (
              <a href={`https://wa.me/${client.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer"
                style={{ flex: 1, height: 48, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 16, fontWeight: 700, background: "#25D366", color: "white", textDecoration: "none" }}>
                واتساب
              </a>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>,
    document.body
  );
}

function ClientFormSheet({ client, onClose, onSave }: {
  client: Client | null;
  onClose: () => void;
  onSave: (data: { name: string; phone: string; address: string; notes: string }) => void;
}) {
  const [visible, setVisible] = useState(false);
  const [form, setForm] = useState({ name: client?.name || "", phone: client?.phone || "", address: client?.address || "", notes: "" });

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);
  function close() { setVisible(false); setTimeout(onClose, 250); }

  function handleSave() {
    if (!form.name.trim()) { toast.error("أدخل اسم العميل"); return; }
    onSave(form);
  }

  const inputStyle = { width: "100%", height: 48, borderRadius: 12, fontSize: 16, padding: "0 14px", background: "var(--surface-2)", color: "var(--text-primary)", border: "1px solid var(--border-default)", outline: "none" };
  const labelStyle = { fontSize: 14, fontWeight: 700 as const, color: "var(--text-muted)", display: "block" as const, marginBottom: 6 };

  return createPortal(
    <div onClick={close} style={{ position: "fixed", inset: 0, zIndex: 99999, background: visible ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0)", backdropFilter: visible ? "blur(4px)" : "blur(0)", transition: "all 0.25s ease" }}>
      <div onClick={(e) => e.stopPropagation()} dir="rtl" style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100000, background: "var(--surface-1)",
        borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: "calc(env(safe-area-inset-bottom, 8px) + 24px)",
        transform: visible ? "translateY(0)" : "translateY(100%)", transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px" }}>
          <div style={{ height: 4, width: 40, borderRadius: 4, background: "var(--border-strong)" }} />
        </div>
        <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>{client ? "تعديل العميل" : "عميل جديد"}</h3>
            <button onClick={close} style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)", color: "var(--text-muted)", border: "none", cursor: "pointer" }}>
              <X style={{ width: 18, height: 18 }} />
            </button>
          </div>
          <div><label style={labelStyle}>اسم العميل</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} /></div>
          <div><label style={labelStyle}>الهاتف</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inputStyle} dir="ltr" inputMode="tel" /></div>
          <div><label style={labelStyle}>العنوان</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} style={inputStyle} /></div>
          <button onClick={handleSave} style={{ width: "100%", height: 56, borderRadius: 16, fontSize: 18, fontWeight: 800, background: "var(--primary)", color: "white", border: "none", cursor: "pointer", marginTop: 8 }}>
            {client ? "تحديث" : "إضافة العميل"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
