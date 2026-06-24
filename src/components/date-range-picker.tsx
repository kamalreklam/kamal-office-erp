"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Download, X, FileText, Loader2, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface DateRange {
  from: string;
  to: string;
}

export interface ExportOptions {
  includeCharts: boolean;
  detailedMode: boolean;
}

interface DateRangePickerProps {
  onExport: (range: DateRange, options: ExportOptions) => Promise<void> | void;
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
  onExport: (range: DateRange, options: ExportOptions) => Promise<void> | void;
  label: string;
  onClose: () => void;
}) {
  const presets = getPresets();
  const [range, setRange] = useState<DateRange>({ from: presets[2].from, to: presets[2].to });
  const [activePreset, setActivePreset] = useState(2);
  const [exporting, setExporting] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({ includeCharts: true, detailedMode: false });

  const close = useCallback(() => {
    onClose();
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
      await onExport(range, options);
    } finally {
      setExporting(false);
      close();
    }
  }

  return createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      className="fixed inset-0 z-[99999] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/40 backdrop-blur-sm transition-all"
    >
      <motion.div
        initial={{ y: "100%", opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: "100%", opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        dir="rtl"
        className="w-full md:w-auto md:min-w-[440px] max-w-[calc(100vw-32px)] bg-white rounded-t-3xl md:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="relative p-6 pb-5 bg-gradient-to-br from-indigo-50 to-white border-b border-indigo-100/50">
          <button
            onClick={close}
            className="absolute top-6 left-6 w-8 h-8 flex items-center justify-center rounded-full bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-100 shadow-sm transition-all border border-slate-200"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800">
                تصدير التقرير
              </h3>
              <p className="text-sm font-medium text-slate-500 mt-1">
                اختر الفترة الزمنية والخيارات
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Presets */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              فترات سريعة
            </p>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((preset, idx) => {
                const isActive = activePreset === idx;
                return (
                  <button
                    key={preset.label}
                    onClick={() => selectPreset(idx)}
                    className={`
                      relative overflow-hidden px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200
                      ${idx === 6 ? "col-span-2" : ""}
                      ${isActive 
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" 
                        : "bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200"
                      }
                    `}
                  >
                    {isActive && (
                      <motion.div layoutId="activePresetBg" className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 z-0" />
                    )}
                    <span className="relative z-10">{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-100" />
            <span className="text-xs font-bold text-slate-400 uppercase">أو فترة مخصصة</span>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          {/* Custom dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">من</label>
              <input
                type="date"
                value={range.from}
                onChange={(e) => { setRange({ ...range, from: e.target.value }); setActivePreset(-1); }}
                dir="ltr"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl h-12 px-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all force-english-digits"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">إلى</label>
              <input
                type="date"
                value={range.to}
                onChange={(e) => { setRange({ ...range, to: e.target.value }); setActivePreset(-1); }}
                dir="ltr"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl h-12 px-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all force-english-digits"
              />
            </div>
          </div>

          {/* Extra Options */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${options.includeCharts ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white group-hover:border-indigo-400'}`}>
                {options.includeCharts && <Check className="w-4 h-4 text-white" />}
              </div>
              <input type="checkbox" className="hidden" checked={options.includeCharts} onChange={e => setOptions({...options, includeCharts: e.target.checked})} />
              <span className="text-sm font-bold text-slate-700">تضمين الرسوم البيانية في التقرير</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${options.detailedMode ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white group-hover:border-indigo-400'}`}>
                {options.detailedMode && <Check className="w-4 h-4 text-white" />}
              </div>
              <input type="checkbox" className="hidden" checked={options.detailedMode} onChange={e => setOptions({...options, detailedMode: e.target.checked})} />
              <span className="text-sm font-bold text-slate-700">وضع التفاصيل (عرض كل العناصر بدلاً من الملخص)</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-0 mt-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className={`
              w-full h-14 rounded-2xl text-base font-black flex items-center justify-center gap-2 transition-all shadow-md
              ${exporting 
                ? "bg-indigo-100 text-indigo-400 cursor-not-allowed shadow-none" 
                : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98]"
              }
            `}
          >
            {exporting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                جاري التصدير...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                {label}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

export function DateRangeExportButton({ onExport, label = "تصدير PDF", className, buttonStyle }: DateRangePickerProps & { className?: string; buttonStyle?: React.CSSProperties }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setOpen(true)} 
        className={className || "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-2 text-sm font-bold text-white hover:shadow-lg hover:shadow-slate-900/20 transition-all active:scale-95"} 
        style={buttonStyle}
      >
        <FileText className="w-4 h-4 text-slate-300" />
        <span>{label}</span>
      </button>
      <AnimatePresence>
        {open && (
          <ExportDialog
            onExport={onExport}
            label={label}
            onClose={() => setOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export function formatDateRange(range: DateRange): string {
  return `من ${range.from} إلى ${range.to}`;
}
