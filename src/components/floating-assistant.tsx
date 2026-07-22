"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { AssistantChat } from "./assistant-chat";
import { useStore } from "@/lib/store";

// A Messenger-style floating chat bubble available on every page — click to pop
// open a compact chat panel, click again (or the X) to collapse. Hidden on the
// dedicated /assistant page itself, since that already IS the assistant.
export function FloatingAssistant() {
  const [open, setOpen] = useState(false);
  const { updateProduct } = useStore();
  const pathname = usePathname();

  if (pathname === "/assistant") return null;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-24 end-4 sm:end-6 z-[60] flex flex-col overflow-hidden rounded-3xl border bg-white shadow-2xl"
            style={{
              borderColor: "var(--border-subtle)",
              width: "min(calc(100vw - 2rem), 400px)",
              height: "min(calc(100dvh - 7rem), 640px)",
            }}
          >
            <div className="flex shrink-0 items-center justify-between bg-gradient-to-l from-violet-600 to-indigo-600 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-xl bg-white/15">
                  <Sparkles className="size-4" />
                </div>
                <span className="text-sm font-black">المساعد الذكي</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="إغلاق"
                className="flex size-8 items-center justify-center rounded-lg hover:bg-white/15 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 p-3">
              <AssistantChat
                compact
                height="100%"
                onProductRenamed={(r) => updateProduct(r.productId, { name: r.newName })}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileTap={{ scale: 0.9 }}
        aria-label={open ? "إغلاق المساعد الذكي" : "افتح المساعد الذكي"}
        className="fixed bottom-4 end-4 sm:bottom-6 sm:end-6 z-[60] flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-transform"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? "close" : "open"}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {open ? <X className="size-6" /> : <Sparkles className="size-6" />}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </>
  );
}
