"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";

interface InlineEditTextProps {
  value: string;
  onSave: (newValue: string) => void;
  className?: string;
  placeholder?: string;
}

/** Text-value sibling of InlineEdit (which is number-only) — same look/interaction, for renaming. */
export function InlineEditText({ value, onSave, className, placeholder }: InlineEditTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function startEdit() {
    setDraft(value);
    setEditing(true);
  }

  function save() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
    setEditing(false);
  }

  function cancel() {
    setEditing(false);
    setDraft(value);
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
            type="text"
            value={draft}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={save}
            className="h-7 min-w-[140px] rounded-lg border px-2 text-sm font-bold outline-none"
            style={{
              background: "var(--surface-1)",
              borderColor: "var(--primary)",
              color: "var(--text-primary)",
              boxShadow: "0 0 0 3px rgba(37, 99, 235, 0.15)",
            }}
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
          className={`cursor-pointer rounded-lg px-1 py-0.5 transition-colors hover:bg-[var(--surface-2)] ${className || ""}`}
          title="انقر للتعديل"
        >
          {value}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
