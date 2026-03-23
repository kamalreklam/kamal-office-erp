"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarDays, Download, X } from "lucide-react";

export interface DateRange {
  from: string;
  to: string;
}

interface DateRangePickerProps {
  onExport: (range: DateRange) => void;
  loading?: boolean;
  label?: string;
}

function getPresets(): { label: string; from: string; to: string }[] {
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
    { label: "اليوم", from: fmt(now), to: fmt(now) },
    { label: "هذا الأسبوع", from: fmt(startOfWeek), to: fmt(now) },
    { label: "هذا الشهر", from: fmt(startOfMonth), to: fmt(endOfMonth) },
    { label: "الشهر الماضي", from: fmt(startOfLastMonth), to: fmt(endOfLastMonth) },
    { label: "هذا الربع", from: fmt(startOfQuarter), to: fmt(now) },
    { label: "هذا العام", from: fmt(startOfYear), to: fmt(now) },
  ];
}

export function DateRangeExportButton({ onExport, loading, label = "تصدير PDF" }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const presets = getPresets();
  const defaultRange = presets[2]; // this month
  const [range, setRange] = useState<DateRange>({ from: defaultRange.from, to: defaultRange.to });

  function handleExport() {
    onExport(range);
    setOpen(false);
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">{label}</span>
      </Button>
    );
  }

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--glass-border)",
        boxShadow: "var(--shadow-lg)",
        minWidth: 300,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4" style={{ color: "var(--primary)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>اختر الفترة</span>
        </div>
        <button onClick={() => setOpen(false)} className="p-1 rounded-lg" style={{ color: "var(--text-muted)" }}>
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset) => {
          const isActive = range.from === preset.from && range.to === preset.to;
          return (
            <button
              key={preset.label}
              onClick={() => setRange({ from: preset.from, to: preset.to })}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all"
              style={{
                background: isActive ? "var(--primary)" : "var(--surface-2)",
                color: isActive ? "white" : "var(--text-secondary)",
              }}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Custom range */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="text-[10px] font-medium mb-0.5 block" style={{ color: "var(--text-muted)" }}>من</label>
          <Input
            type="date"
            value={range.from}
            onChange={(e) => setRange({ ...range, from: e.target.value })}
            className="h-8 text-xs"
            dir="ltr"
          />
        </div>
        <div className="flex-1">
          <label className="text-[10px] font-medium mb-0.5 block" style={{ color: "var(--text-muted)" }}>إلى</label>
          <Input
            type="date"
            value={range.to}
            onChange={(e) => setRange({ ...range, to: e.target.value })}
            className="h-8 text-xs"
            dir="ltr"
          />
        </div>
      </div>

      <Button size="sm" className="w-full gap-1.5" onClick={handleExport} disabled={loading}>
        <Download className="h-3.5 w-3.5" />
        {loading ? "جاري التصدير..." : label}
      </Button>
    </div>
  );
}

export function formatDateRange(range: DateRange): string {
  return `من ${range.from} إلى ${range.to}`;
}
