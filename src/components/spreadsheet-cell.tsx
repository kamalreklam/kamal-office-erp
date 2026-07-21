"use client";

import { useEffect, useRef, useState } from "react";

interface SpreadsheetCellProps {
  value: string | number;
  onCommit: (value: string) => void;
  type?: "text" | "number";
  align?: "start" | "center" | "end";
  className?: string;
  placeholder?: string;
  step?: string;
  min?: number;
}

// An always-editable cell styled to look like plain text until focused — no
// click-to-reveal step, no confirm/cancel buttons. Behaves like a real spreadsheet:
// every cell is already an <input>, so Tab/Shift+Tab move across the row and down
// to the next row using normal browser focus order, Enter commits and blurs,
// Escape reverts. Commits happen on blur/Enter only, never on every keystroke.
export function SpreadsheetCell({
  value, onCommit, type = "text", align = "start", className = "", placeholder, step, min,
}: SpreadsheetCellProps) {
  const [draft, setDraft] = useState(String(value));
  const ref = useRef<HTMLInputElement>(null);
  const committedRef = useRef(String(value));
  // blur() fires synchronously, before React has applied the setDraft(...) update
  // from the Escape handler below — without this flag, onBlur's commit() would
  // still see the stale (pre-revert) draft value and commit it anyway.
  const skipNextCommitRef = useRef(false);

  useEffect(() => {
    setDraft(String(value));
    committedRef.current = String(value);
  }, [value]);

  function commit() {
    if (skipNextCommitRef.current) {
      skipNextCommitRef.current = false;
      return;
    }
    if (draft !== committedRef.current) {
      onCommit(draft);
      committedRef.current = draft;
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      ref.current?.blur();
      // Move focus to the next spreadsheet cell in DOM order (same as Tab)
      const cells = Array.from(document.querySelectorAll<HTMLElement>("[data-sheet-cell]"));
      const idx = cells.indexOf(ref.current as HTMLElement);
      if (idx >= 0 && idx < cells.length - 1) cells[idx + 1].focus();
    } else if (e.key === "Escape") {
      skipNextCommitRef.current = true;
      setDraft(committedRef.current);
      ref.current?.blur();
    }
  }

  const alignClass = align === "center" ? "text-center" : align === "end" ? "text-end" : "text-start";

  return (
    <input
      ref={ref}
      data-sheet-cell
      type={type}
      inputMode={type === "number" ? "decimal" : undefined}
      step={step}
      min={min}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={commit}
      onKeyDown={onKeyDown}
      className={`w-full bg-transparent border border-transparent rounded-lg px-2 py-1.5 outline-none transition-colors hover:bg-slate-100 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 ${alignClass} ${className}`}
    />
  );
}
