"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";

interface InlineEditProps {
  value: number;
  onSave: (newValue: number) => void;
  format?: (n: number) => string;
  className?: string;
  type?: "number" | "currency";
}

export function InlineEdit({ value, onSave, format, className, type = "number" }: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function startEdit() {
    setDraft(String(value));
    setEditing(true);
  }

  function save() {
    const num = parseFloat(draft);
    if (!isNaN(num) && num >= 0 && num !== value) {
      onSave(num);
    }
    setEditing(false);
  }

  function cancel() {
    setEditing(false);
    setDraft(String(value));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") save();
    if (e.key === "Escape") cancel();
  }

  return (
    <AnimatePresence mode="wait">
      {editing ? (
        <motion.div
          key="edit"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="flex items-center gap-1"
        >
          <input
            ref={inputRef}
            type="number"
            step={type === "currency" ? "0.01" : "1"}
            min="0"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={save}
            className="h-7 w-20 rounded-lg border px-2 text-sm font-medium outline-none"
            style={{
              background: "var(--surface-1)",
              borderColor: "var(--primary)",
              color: "var(--text-primary)",
              boxShadow: "0 0 0 3px rgba(37, 99, 235, 0.15)",
            }}
            dir="ltr"
          />
          <button
            onMouseDown={(e) => { e.preventDefault(); save(); }}
            className="flex h-6 w-6 items-center justify-center rounded-md transition-colors"
            style={{ background: "var(--green-500)", color: "white" }}
          >
            <Check className="h-3 w-3" />
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); cancel(); }}
            className="flex h-6 w-6 items-center justify-center rounded-md transition-colors"
            style={{ background: "var(--surface-3)", color: "var(--text-muted)" }}
          >
            <X className="h-3 w-3" />
          </button>
        </motion.div>
      ) : (
        <motion.span
          key="display"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={startEdit}
          className={`cursor-pointer rounded-lg px-1.5 py-0.5 transition-colors hover:bg-[var(--surface-2)] ${className || ""}`}
          title="انقر للتعديل"
        >
          {format ? format(value) : value}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
