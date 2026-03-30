"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft } from "lucide-react";

interface WizardShellProps {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: React.ReactNode;
}

export function WizardShell({ step, totalSteps, title, subtitle, onBack, children }: WizardShellProps) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--ground)" }} dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3" style={{ background: "var(--ground)" }}>
        <div className="flex items-center gap-3 mb-3">
          {onBack && (
            <button
              onClick={onBack}
              className="flex h-11 w-11 items-center justify-center rounded-2xl"
              style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold" style={{ color: "var(--text-primary)", fontSize: 26 }}>{title}</h1>
            {subtitle && <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)", fontSize: 15 }}>{subtitle}</p>}
          </div>
          <span className="text-sm font-bold" style={{ color: "var(--text-muted)", fontSize: 15 }}>
            {step}/{totalSteps}
          </span>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full transition-all duration-300"
              style={{
                background: i < step ? "var(--primary)" : "var(--surface-3)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
