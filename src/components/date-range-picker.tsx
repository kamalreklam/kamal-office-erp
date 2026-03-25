"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarDays, Download, X, FileText, Loader2 } from "lucide-react";

export interface DateRange {
  from: string;
  to: string;
}

interface DateRangePickerProps {
  onExport: (range: DateRange) => Promise<void> | void;
  loading?: boolean;
  label?: string;
}

function getPresets(): { label: string; emoji: string; from: string; to: string }[] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const fmt = (date: Date) => date.toISOString().split("T")[0];

  const startOfWeek = new Date(y, m, d - now.getDay());
  const startOfMonth = new Date(y, m, 1);
  const endOfMonth = new Date(y, m + 1, 0);
  const startOfLastMonth = new Date(y, m - 1, 1);
  const endOfLastMonth = new Date(y, m, 0);
  const quarter = Math.floor(m / 3);
  const startOfQuarter = new Date(y, quarter * 3, 1);
  const startOfYear = new Date(y, 0, 1);

  return [
    { label: "اليوم", emoji: "📅", from: fmt(now), to: fmt(now) },
    { label: "هذا الأسبوع", emoji: "📆", from: fmt(startOfWeek), to: fmt(now) },
    { label: "هذا الشهر", emoji: "🗓️", from: fmt(startOfMonth), to: fmt(endOfMonth) },
    { label: "الشهر الماضي", emoji: "⏪", from: fmt(startOfLastMonth), to: fmt(endOfLastMonth) },
    { label: "هذا الربع", emoji: "📊", from: fmt(startOfQuarter), to: fmt(now) },
    { label: "هذا العام", emoji: "🎯", from: fmt(startOfYear), to: fmt(now) },
    { label: "كل الوقت", emoji: "♾️", from: "2020-01-01", to: fmt(now) },
  ];
}

export function DateRangeExportButton({ onExport, label = "تصدير PDF" }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const presets = getPresets();
  const defaultRange = presets[2]; // this month
  const [range, setRange] = useState<DateRange>({ from: defaultRange.from, to: defaultRange.to });
  const [activePreset, setActivePreset] = useState(2);

  function selectPreset(idx: number) {
    setRange({ from: presets[idx].from, to: presets[idx].to });
    setActivePreset(idx);
  }

  async function handleExport() {
    setExporting(true);
    try {
      await onExport(range);
    } finally {
      setExporting(false);
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <FileText className="h-4 w-4" />
        <span className="hidden sm:inline">{label}</span>
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-2xl p-5 space-y-4 animate-in zoom-in-95 duration-200"
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--glass-border)",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
        }}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--primary)", color: "white" }}>
              <CalendarDays className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>تصدير تقرير PDF</h3>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>اختر الفترة الزمنية</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="rounded-xl p-2 transition-colors hover:bg-[var(--surface-2)]" style={{ color: "var(--text-muted)" }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Presets Grid */}
        <div className="grid grid-cols-4 gap-1.5">
          {presets.map((preset, idx) => {
            const isActive = activePreset === idx;
            return (
              <button
                key={preset.label}
                onClick={() => selectPreset(idx)}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-2 py-2.5 text-center transition-all ${
                  idx === 6 ? "col-span-4" : idx >= 4 ? "col-span-2" : ""
                }`}
                style={{
                  background: isActive ? "var(--primary)" : "var(--surface-2)",
                  color: isActive ? "white" : "var(--text-secondary)",
                  border: isActive ? "none" : "1px solid var(--glass-border)",
                }}
              >
                <span className="text-xs">{preset.emoji}</span>
                <span className="text-[11px] font-semibold leading-tight">{preset.label}</span>
              </button>
            );
          })}
        </div>

        {/* Custom range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-semibold mb-1 block" style={{ color: "var(--text-muted)" }}>من</label>
            <Input
              type="date"
              value={range.from}
              onChange={(e) => { setRange({ ...range, from: e.target.value }); setActivePreset(-1); }}
              className="h-9 text-xs"
              dir="ltr"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold mb-1 block" style={{ color: "var(--text-muted)" }}>إلى</label>
            <Input
              type="date"
              value={range.to}
              onChange={(e) => { setRange({ ...range, to: e.target.value }); setActivePreset(-1); }}
              className="h-9 text-xs"
              dir="ltr"
            />
          </div>
        </div>

        {/* Export button */}
        <Button size="lg" className="w-full gap-2 text-sm font-bold" onClick={handleExport} disabled={exporting}>
          {exporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              جاري التصدير...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              {label}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export function formatDateRange(range: DateRange): string {
  return `من ${range.from} إلى ${range.to}`;
}
