"use client";

import { Save, FileText, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/data";
import type { InvoiceStatus } from "@/lib/data";

interface StepSaveProps {
  clientName: string;
  itemCount: number;
  total: number;
  onSave: (status: InvoiceStatus) => void;
  saving: boolean;
}

export function StepSave({ clientName, itemCount, total, onSave, saving }: StepSaveProps) {
  return (
    <div className="space-y-6 pt-4" dir="rtl">
      {/* Summary card */}
      <div className="rounded-3xl p-6 text-center" style={{ background: "var(--surface-1)", border: "2px solid var(--border-subtle)" }}>
        <div
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-full mb-4"
          style={{ background: "var(--accent-soft)", color: "var(--primary)" }}
        >
          <FileText className="h-10 w-10" />
        </div>
        <h2 className="font-extrabold" style={{ fontSize: 24, color: "var(--text-primary)" }}>{clientName}</h2>
        <p className="mt-1" style={{ fontSize: 16, color: "var(--text-muted)" }}>{itemCount} منتجات</p>
        <p className="mt-3 font-extrabold" style={{ fontSize: 36, color: "var(--primary)" }}>{formatCurrency(total)}</p>
      </div>

      {/* Save buttons */}
      <div className="space-y-3">
        <button
          onClick={() => onSave("مدفوعة")}
          disabled={saving}
          className="flex w-full items-center justify-center gap-3 rounded-2xl font-bold"
          style={{
            height: 60,
            fontSize: 20,
            background: "var(--green-500)",
            color: "white",
            border: "none",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}
        >
          <CheckCircle2 className="h-6 w-6" />
          مدفوعة
        </button>

        <button
          onClick={() => onSave("غير مدفوعة")}
          disabled={saving}
          className="flex w-full items-center justify-center gap-3 rounded-2xl font-bold"
          style={{
            height: 56,
            fontSize: 18,
            background: "var(--surface-1)",
            color: "var(--primary)",
            border: "2px solid var(--primary)",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}
        >
          <FileText className="h-5 w-5" />
          غير مدفوعة
        </button>

        <button
          onClick={() => onSave("مسودة")}
          disabled={saving}
          className="flex w-full items-center justify-center gap-3 rounded-2xl font-bold"
          style={{
            height: 56,
            fontSize: 18,
            background: "var(--surface-2)",
            color: "var(--text-secondary)",
            border: "2px solid var(--border-default)",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}
        >
          <Save className="h-5 w-5" />
          حفظ كمسودة
        </button>
      </div>
    </div>
  );
}
