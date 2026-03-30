"use client";

import { useState } from "react";
import { Settings, Save } from "lucide-react";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

export function MobileSettings() {
  const { settings, updateSettings } = useStore();
  const [form, setForm] = useState({
    businessName: settings.businessName,
    businessNameEn: settings.businessNameEn,
    phone: settings.phone,
    address: settings.address,
    currency: settings.currency,
    currencySymbol: settings.currencySymbol,
    taxRate: settings.taxRate,
    taxEnabled: settings.taxEnabled,
    invoicePrefix: settings.invoicePrefix,
    lowStockWarning: settings.lowStockWarning,
  });

  function handleSave() {
    updateSettings(form);
    toast.success("تم حفظ الإعدادات");
  }

  const inputStyle = {
    width: "100%", height: 48, borderRadius: 12, fontSize: 16, padding: "0 14px",
    background: "var(--surface-2)", color: "var(--text-primary)",
    border: "1px solid var(--border-default)", outline: "none",
  };

  const labelStyle = { fontSize: 14, fontWeight: 700 as const, color: "var(--text-muted)", display: "block" as const, marginBottom: 6 };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Business Info */}
      <div className="rounded-2xl p-5 space-y-4" style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" style={{ color: "var(--primary)" }} />
          <span style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>معلومات النشاط</span>
        </div>

        <div>
          <label style={labelStyle}>اسم النشاط (عربي)</label>
          <input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>اسم النشاط (English)</label>
          <input value={form.businessNameEn} onChange={(e) => setForm({ ...form, businessNameEn: e.target.value })} style={inputStyle} dir="ltr" />
        </div>
        <div>
          <label style={labelStyle}>الهاتف</label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inputStyle} dir="ltr" inputMode="tel" />
        </div>
        <div>
          <label style={labelStyle}>العنوان</label>
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} style={inputStyle} />
        </div>
      </div>

      {/* Currency & Tax */}
      <div className="rounded-2xl p-5 space-y-4" style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>العملة والضريبة</span>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={labelStyle}>العملة</label>
            <input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>الرمز</label>
            <input value={form.currencySymbol} onChange={(e) => setForm({ ...form, currencySymbol: e.target.value })} style={inputStyle} dir="ltr" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label style={{ ...labelStyle, marginBottom: 0 }}>تفعيل الضريبة</label>
          <button
            onClick={() => setForm({ ...form, taxEnabled: !form.taxEnabled })}
            style={{
              width: 52, height: 30, borderRadius: 15, border: "none", cursor: "pointer",
              background: form.taxEnabled ? "var(--green-500)" : "var(--surface-3)",
              position: "relative", transition: "background 0.2s",
            }}
          >
            <div style={{
              width: 24, height: 24, borderRadius: "50%", background: "white",
              position: "absolute", top: 3,
              right: form.taxEnabled ? 3 : "auto",
              left: form.taxEnabled ? "auto" : 3,
              transition: "all 0.2s",
            }} />
          </button>
        </div>

        {form.taxEnabled && (
          <div>
            <label style={labelStyle}>نسبة الضريبة (%)</label>
            <input type="text" inputMode="decimal" dir="ltr" value={form.taxRate}
              onChange={(e) => { const v = e.target.value; if (v === "" || /^\d*\.?\d*$/.test(v)) setForm({ ...form, taxRate: parseFloat(v) || 0 }); }}
              style={inputStyle} />
          </div>
        )}
      </div>

      {/* Invoice Settings */}
      <div className="rounded-2xl p-5 space-y-4" style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>إعدادات الفواتير</span>
        <div>
          <label style={labelStyle}>بادئة رقم الفاتورة</label>
          <input value={form.invoicePrefix} onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })} style={inputStyle} dir="ltr" />
        </div>
        <div>
          <label style={labelStyle}>حد تنبيه المخزون المنخفض</label>
          <input type="number" min={0} value={String(form.lowStockWarning)}
            onChange={(e) => setForm({ ...form, lowStockWarning: parseInt(e.target.value) || 0 as any })}
            style={inputStyle} dir="ltr" />
        </div>
      </div>

      {/* Save */}
      <button onClick={handleSave} style={{
        width: "100%", height: 56, borderRadius: 16, fontSize: 18, fontWeight: 800,
        background: "var(--primary)", color: "white", border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}>
        <Save style={{ width: 20, height: 20 }} /> حفظ الإعدادات
      </button>
    </div>
  );
}
