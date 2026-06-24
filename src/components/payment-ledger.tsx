"use client";

import { useState } from "react";
import { Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import type { PaymentMethod } from "@/lib/store";
import { toast } from "sonner";

interface PaymentLedgerProps {
  invoiceId: string;
  invoiceTotal: number;
  invoiceNumber: string;
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  نقدي: "نقدي",
  حوالة: "حوالة",
  شيك: "شيك",
  بطاقة: "بطاقة",
};

const METHOD_BADGE: Record<PaymentMethod, string> = {
  نقدي: "bg-emerald-50 text-emerald-700 border-emerald-100",
  حوالة: "bg-blue-50 text-blue-700 border-blue-100",
  شيك: "bg-amber-50 text-amber-700 border-amber-100",
  بطاقة: "bg-purple-50 text-purple-700 border-purple-100",
};

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2 });
}

export function PaymentLedger({
  invoiceId,
  invoiceTotal,
  invoiceNumber,
}: PaymentLedgerProps) {
  const { addPayment, deletePayment, getInvoicePayments } = useStore();
  const payments = getInvoicePayments(invoiceId);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("نقدي");
  const [notes, setNotes] = useState("");

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, invoiceTotal - totalPaid);
  const isFullyPaid = totalPaid >= invoiceTotal;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      toast.error("أدخل مبلغاً صحيحاً");
      return;
    }
    addPayment({ invoiceId, amount: parsed, method, notes });
    toast.success("تم تسجيل الدفعة");
    setAmount("");
    setNotes("");
  }

  function handleDelete(id: string) {
    if (!confirm("هل تريد حذف هذه الدفعة؟")) return;
    deletePayment(id, invoiceId);
    toast.success("تم حذف الدفعة");
  }

  return (
    <div className="space-y-3" dir="rtl">
      {/* Summary bar */}
      <div className="flex gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
          المدفوع: {fmt(totalPaid)}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
          المتبقي: {fmt(remaining)}
        </span>
      </div>

      {/* Payments list */}
      {payments.length > 0 && (
        <div className="space-y-1.5">
          {payments.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-2)] px-3 py-2 text-xs"
            >
              <span className="text-[var(--text-muted)] shrink-0">{p.createdAt?.slice(0, 10) ?? ""}</span>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 font-bold ${METHOD_BADGE[p.method as PaymentMethod] ?? ""}`}
              >
                {p.method}
              </span>
              {p.notes && (
                <span className="flex-1 truncate text-[var(--text-muted)]">{p.notes}</span>
              )}
              <span className="font-mono font-bold text-[var(--text-primary)] shrink-0">
                {fmt(p.amount)}
              </span>
              <button
                onClick={() => handleDelete(p.id)}
                className="h-6 w-6 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0"
                aria-label="حذف الدفعة"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Fully paid banner or add form */}
      {isFullyPaid ? (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm font-bold text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          مدفوعة بالكامل ✓
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-2)] p-3 space-y-2">
          <p className="text-xs font-bold text-[var(--text-muted)]">إضافة دفعة</p>
          <div className="flex gap-2 flex-wrap">
            <Input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="المبلغ"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-28 h-9 rounded-lg text-xs border-[var(--border-default)]"
              required
            />
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger className="w-24 h-9 rounded-lg text-xs border-[var(--border-default)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((m) => (
                  <SelectItem key={m} value={m}>
                    {METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="ملاحظات (اختياري)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="flex-1 min-w-[100px] h-9 rounded-lg text-xs border-[var(--border-default)]"
            />
            <Button type="submit" className="h-9 rounded-lg text-xs font-bold px-3 shrink-0">
              تسجيل الدفعة
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
