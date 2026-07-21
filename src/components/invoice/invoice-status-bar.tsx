"use client";

import { ArrowRight, Clock, AlertCircle, Percent, CircleCheck, CircleX, Save } from "lucide-react";
import type { InvoiceStatus } from "@/lib/data";
import type { LucideIcon } from "lucide-react";

const STATUS_OPTIONS: { id: InvoiceStatus; label: string; icon: LucideIcon; activeClass: string }[] = [
  { id: "مسودة", label: "مسودة", icon: Clock, activeClass: "bg-slate-600 text-white shadow-md" },
  { id: "غير مدفوعة", label: "معتمدة", icon: AlertCircle, activeClass: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md" },
  { id: "مدفوعة جزئياً", label: "دفع جزئي", icon: Percent, activeClass: "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md" },
  { id: "مدفوعة", label: "مدفوعة بالكامل", icon: CircleCheck, activeClass: "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md" },
  { id: "ملغاة", label: "ملغاة", icon: CircleX, activeClass: "bg-gray-500 text-white shadow-md" },
];

interface InvoiceStatusBarProps {
  invoiceNumber: string;
  isEdit: boolean;
  selectedStatus: InvoiceStatus;
  onSelectStatus: (status: InvoiceStatus) => void;
  onBack: () => void;
  onSave: () => void;
}

// One consolidated status + save control, replacing what used to be 4 separate
// save buttons split across a top bar and a page-bottom bar (حفظ مسودة / اعتماد
// at top, دفع جزئي / دفع كامل at bottom) with no single place representing "what
// status should this invoice have". Pick a status pill, then Save — one decision,
// one action, always docked at the top on both mobile and desktop.
export function InvoiceStatusBar({ invoiceNumber, isEdit, selectedStatus, onSelectStatus, onBack, onSave }: InvoiceStatusBarProps) {
  return (
    <div className="sticky top-0 z-[100] -mx-2 sm:-mx-4 px-2 sm:px-4 pb-3 pt-3 bg-gradient-to-b from-white via-white/95 to-transparent backdrop-blur-sm">
      <div className="max-w-6xl mx-auto w-full bg-white/90 backdrop-blur-xl border border-white rounded-3xl shadow-float p-3 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="size-11 shrink-0 flex items-center justify-center rounded-2xl bg-indigo-500 text-white hover:bg-indigo-600 transition-colors shadow-md"
            >
              <ArrowRight className="size-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-black bg-gradient-to-l from-indigo-700 to-blue-600 bg-clip-text text-transparent truncate">
                {isEdit ? `تعديل الفاتورة` : "فاتورة جديدة"}
              </h1>
              <p className="text-xs font-bold text-indigo-400/80 mt-0.5 truncate">رقم المرجع: {invoiceNumber}</p>
            </div>
          </div>

          <button
            onClick={onSave}
            className="shrink-0 h-11 px-5 sm:px-7 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:shadow-blue-500/20 transition-all active:scale-95"
          >
            <Save className="size-4" />
            حفظ
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {STATUS_OPTIONS.map((opt) => {
            const isActive = selectedStatus === opt.id;
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                onClick={() => onSelectStatus(opt.id)}
                className={`flex-1 min-w-[110px] sm:flex-none h-11 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                  isActive ? opt.activeClass : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
