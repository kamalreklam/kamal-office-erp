"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
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
    { label: "كل الوقت", from: "2020-01-01", to: fmt(now) },
  ];
}

function ExportDialog({
  onExport,
  label,
  onClose,
}: {
  onExport: (range: DateRange) => Promise<void> | void;
  label: string;
  onClose: () => void;
}) {
  const presets = getPresets();
  const [range, setRange] = useState<DateRange>({ from: presets[2].from, to: presets[2].to });
  const [activePreset, setActivePreset] = useState(2);
  const [exporting, setExporting] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

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
      close();
    }
  }

  return createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: visible ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0)",
        backdropFilter: visible ? "blur(8px)" : "blur(0px)",
        transition: "all 0.2s ease",
      }}
    >
      <div
        dir="rtl"
        style={{
          width: "min(440px, calc(100vw - 32px))",
          borderRadius: "24px",
          overflow: "hidden",
          background: "var(--surface-1)",
          border: "1px solid var(--glass-border)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.4)",
          transform: visible ? "scale(1) translateY(0)" : "scale(0.93) translateY(16px)",
          opacity: visible ? 1 : 0,
          transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 24px 20px",
            background: "linear-gradient(135deg, var(--surface-2), var(--surface-3))",
            borderBottom: "1px solid var(--border-subtle)",
            position: "relative",
          }}
        >
          <button
            onClick={close}
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              width: 32,
              height: 32,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--surface-1)",
              color: "var(--text-muted)",
              border: "1px solid var(--border-subtle)",
              cursor: "pointer",
            }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--primary)",
                color: "white",
                boxShadow: "0 4px 16px rgba(37, 99, 235, 0.3)",
              }}
            >
              <CalendarDays style={{ width: 24, height: 24 }} />
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                تصدير التقرير
              </h3>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>
                اختر الفترة الزمنية للتصدير
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Presets */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10 }}>
              فترات سريعة
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {presets.map((preset, idx) => {
                const isActive = activePreset === idx;
                return (
                  <button
                    key={preset.label}
                    onClick={() => selectPreset(idx)}
                    style={{
                      gridColumn: idx === 6 ? "1 / -1" : undefined,
                      padding: "10px 14px",
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.15s ease",
                      background: isActive ? "var(--primary)" : "var(--surface-2)",
                      color: isActive ? "white" : "var(--text-secondary)",
                      border: isActive ? "2px solid var(--primary)" : "1px solid var(--border-subtle)",
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ height: 1, flex: 1, background: "var(--border-subtle)" }} />
            <span style={{ fontSize: 10, fontWeight: 500, color: "var(--text-muted)" }}>أو فترة مخصصة</span>
            <div style={{ height: 1, flex: 1, background: "var(--border-subtle)" }} />
          </div>

          {/* Custom dates */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                من
              </label>
              <input
                type="date"
                value={range.from}
                onChange={(e) => { setRange({ ...range, from: e.target.value }); setActivePreset(-1); }}
                dir="ltr"
                style={{
                  width: "100%",
                  height: 40,
                  borderRadius: 12,
                  border: "1px solid var(--border-default)",
                  background: "var(--surface-2)",
                  color: "var(--text-primary)",
                  padding: "0 12px",
                  fontSize: 12,
                  outline: "none",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                إلى
              </label>
              <input
                type="date"
                value={range.to}
                onChange={(e) => { setRange({ ...range, to: e.target.value }); setActivePreset(-1); }}
                dir="ltr"
                style={{
                  width: "100%",
                  height: 40,
                  borderRadius: 12,
                  border: "1px solid var(--border-default)",
                  background: "var(--surface-2)",
                  color: "var(--text-primary)",
                  padding: "0 12px",
                  fontSize: 12,
                  outline: "none",
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            background: "var(--surface-2)",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{
              width: "100%",
              height: 48,
              borderRadius: 14,
              fontSize: 14,
              fontWeight: 700,
              cursor: exporting ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              background: exporting ? "var(--surface-3)" : "var(--primary)",
              color: "white",
              border: "none",
              transition: "all 0.15s ease",
            }}
          >
            {exporting ? (
              <>
                <Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite" }} />
                جاري التصدير...
              </>
            ) : (
              <>
                <Download style={{ width: 20, height: 20 }} />
                {label}
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function DateRangeExportButton({ onExport, label = "تصدير PDF", buttonStyle }: DateRangePickerProps & { buttonStyle?: React.CSSProperties }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {buttonStyle ? (
        <button onClick={() => setOpen(true)} style={buttonStyle}>
          <FileText style={{ width: 18, height: 18 }} />
          {label}
        </button>
      ) : (
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">{label}</span>
        </Button>
      )}
      {open && (
        <ExportDialog
          onExport={onExport}
          label={label}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

export function formatDateRange(range: DateRange): string {
  return `من ${range.from} إلى ${range.to}`;
}
