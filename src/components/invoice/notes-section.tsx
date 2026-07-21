"use client";

import { AlignLeft, Mic, Square } from "lucide-react";
import { useVoiceDictation } from "@/hooks/use-voice-dictation";

interface NotesSectionProps {
  notes: string;
  onChange: (notes: string) => void;
}

export function NotesSection({ notes, onChange }: NotesSectionProps) {
  const { isListening, toggleDictation, isSupported } = useVoiceDictation((text) =>
    onChange(notes + (notes ? " " : "") + text)
  );

  return (
    <div className="bg-white border border-white rounded-[2rem] p-4 sm:p-8 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <label className="text-sm font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
          <AlignLeft className="size-4" />
          ملاحظات الفاتورة
        </label>
        {isSupported && (
          <button
            type="button"
            onClick={toggleDictation}
            className={`h-10 px-4 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95 ${
              isListening ? "bg-rose-500 text-white shadow-md animate-pulse" : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
            }`}
          >
            {isListening ? <Square className="size-3.5" /> : <Mic className="size-4" />}
            {isListening ? "إيقاف الإملاء" : "إملاء صوتي"}
          </button>
        )}
      </div>
      <textarea
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        placeholder="ملاحظات تظهر على الفاتورة المطبوعة، شروط الدفع، تفاصيل التسليم..."
        rows={3}
        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white outline-none rounded-2xl p-4 text-sm font-bold text-slate-800 transition-all resize-none"
      />
    </div>
  );
}
