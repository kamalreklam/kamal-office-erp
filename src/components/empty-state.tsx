"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full flex flex-col items-center justify-center py-20 px-4 glass-panel rounded-3xl border border-mist/50 shadow-sm"
    >
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
        <div className="relative w-24 h-24 bg-white shadow-primarySm rounded-[2rem] flex items-center justify-center text-primary rotate-3">
          {icon || (
            <svg
              className="w-12 h-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          )}
        </div>
      </div>

      <h3 className="text-2xl font-black text-ink-deep mb-2">{title}</h3>
      <p className="text-slate-500 text-center max-w-sm mb-8 text-sm">
        {description}
      </p>

      {(actionLabel && actionHref) ? (
        <Link
          href={actionHref}
          className="btn btn-primary h-12 px-8 rounded-2xl shadow-lift inline-flex"
        >
          <Plus className="size-5" />
          <span>{actionLabel}</span>
        </Link>
      ) : (actionLabel && onAction) ? (
        <button
          onClick={onAction}
          className="btn btn-primary h-12 px-8 rounded-2xl shadow-lift inline-flex"
        >
          <Plus className="size-5" />
          <span>{actionLabel}</span>
        </button>
      ) : null}
    </motion.div>
  );
}
