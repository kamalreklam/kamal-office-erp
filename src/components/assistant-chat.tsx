"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import type { Invoice } from "@/lib/data";
import { exportInvoicePDF, shareInvoiceWhatsApp } from "@/lib/pdf";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Send, User, Loader2, FileText, Download, MessageCircle, ExternalLink, Tag, Zap,
} from "lucide-react";

// Renders the small subset of markdown Gemini tends to emit (bold, bullet lines)
// without pulling in a full markdown renderer for a plain-text chat bubble.
function FormattedText({ text }: { text: string }) {
  const boldSplit = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {boldSplit.map((chunk, i) =>
        chunk.startsWith("**") && chunk.endsWith("**") ? (
          <strong key={i}>{chunk.slice(2, -2)}</strong>
        ) : (
          <React.Fragment key={i}>{chunk}</React.Fragment>
        )
      )}
    </>
  );
}

interface RenamedProduct {
  success: boolean;
  productId: string;
  oldName: string;
  newName: string;
  invoicesUpdated: number;
  purchaseOrdersUpdated: number;
  bundlesUpdated: number;
}

interface QuickAction { label: string; href: string; }

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  invoice?: (Invoice & { skipped_products?: string[] }) | null;
  renamedProduct?: RenamedProduct | null;
  actions?: QuickAction[];
}

const DEFAULT_SUGGESTIONS = [
  "شو وضعي المالي هلق؟",
  "في مشاكل بالنظام لازم أعرفها؟",
  "شو أكتر منتج عم يبيع؟",
  "شو المنتجات يلي مخزونها عم يخلص؟",
];

const DEFAULT_WELCOME =
  "أهلاً فيك! أنا مساعدك الذكي، اسألني عن وضعك المالي أو المخزون أو العملاء، أو اطلب مني افحص النظام كله وأقلك وين المشاكل — مثلاً: \"شو في مشاكل بالنظام؟\" أو \"أنشئ فاتورة للعميل أحمد بـ 3 قطع من ورق A4\".";

interface AssistantChatProps {
  className?: string;
  height?: string;
  welcomeText?: string;
  suggestions?: string[];
  onProductRenamed?: (result: RenamedProduct) => void;
  compact?: boolean;
}

export function AssistantChat({
  className = "",
  height = "calc(100vh - 3.5rem)",
  welcomeText = DEFAULT_WELCOME,
  suggestions = DEFAULT_SUGGESTIONS,
  onProductRenamed,
  compact = false,
}: AssistantChatProps) {
  const { settings, injectInvoice } = useStore();
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", text: welcomeText }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    const nextMessages: ChatMessage[] = [...messages, { role: "user", text: msg }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.map((m) => ({ role: m.role, text: m.text })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الاتصال بالمساعد");
      const invoice = data.invoice as (Invoice & { skipped_products?: string[] }) | null;
      const renamedProduct = data.renamedProduct as RenamedProduct | null;
      const actions = (data.actions as QuickAction[] | undefined) || [];
      if (invoice) injectInvoice(invoice);
      if (renamedProduct?.success) onProductRenamed?.(renamedProduct);
      setMessages((prev) => [...prev, { role: "assistant", text: data.text || "", invoice, renamedProduct, actions }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ في المساعد الذكي");
      setMessages((prev) => [...prev, { role: "assistant", text: "عذراً، حدث خطأ أثناء المعالجة. حاول مرة أخرى." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`flex flex-col ${className}`} style={{ height }}>
      {!compact && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-violet-600 to-indigo-600 p-5 sm:p-6 text-white shadow-lg shadow-indigo-500/20 shrink-0 mb-4">
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/15">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black !text-white">المساعد الذكي</h1>
              <p className="text-xs sm:text-sm text-indigo-100/90">مستشار مالي، مدقق حسابات، وكاتب فواتير — يعتمد فقط على بياناتك الحقيقية</p>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto rounded-2xl border p-3 sm:p-4 space-y-4" style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}>
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div
              className={`flex size-8 shrink-0 items-center justify-center rounded-full ${m.role === "user" ? "bg-indigo-600 text-white" : "bg-gradient-to-br from-violet-500 to-indigo-600 text-white"}`}
            >
              {m.role === "user" ? <User className="size-4" /> : <Sparkles className="size-4" />}
            </div>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "bg-indigo-600 text-white" : ""}`}
              style={m.role === "assistant" ? { background: "var(--surface-2)", color: "var(--text-primary, inherit)" } : undefined}
            >
              <FormattedText text={m.text} />

              {m.invoice && (
                <div className="mt-3 rounded-xl border p-3 space-y-2" style={{ borderColor: "var(--border-subtle)", background: "var(--surface-1)" }}>
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <FileText className="size-3.5 text-indigo-500" />
                    <span>مسودة فاتورة #{m.invoice.invoiceNumber}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {m.invoice.clientName} — {m.invoice.items.length} صنف — الإجمالي {m.invoice.total.toLocaleString("en-US")} {settings.currencySymbol}
                  </div>
                  {m.invoice.skipped_products && m.invoice.skipped_products.length > 0 && (
                    <div className="text-xs text-amber-600">لم يتم العثور على: {m.invoice.skipped_products.join("، ")}</div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 text-xs rounded-lg"
                      onClick={() => m.invoice && exportInvoicePDF(m.invoice, settings).catch(() => toast.error("فشل تصدير PDF"))}
                    >
                      <Download className="size-3.5" /> تحميل PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 text-xs rounded-lg"
                      onClick={() => m.invoice && shareInvoiceWhatsApp(m.invoice, settings)}
                    >
                      <MessageCircle className="size-3.5" /> مشاركة واتساب
                    </Button>
                    <Link href={`/invoices/${m.invoice.id}`} className="inline-flex items-center gap-1.5 h-8 px-3 text-xs rounded-lg border hover:bg-accent transition-colors" style={{ borderColor: "var(--border-subtle)" }}>
                      <ExternalLink className="size-3.5" /> فتح الفاتورة
                    </Link>
                  </div>
                </div>
              )}

              {m.renamedProduct && (
                <div className="mt-3 rounded-xl border p-3 space-y-1.5" style={{ borderColor: "var(--border-subtle)", background: "var(--surface-1)" }}>
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Tag className="size-3.5 text-emerald-500" />
                    <span>{m.renamedProduct.oldName} ← {m.renamedProduct.newName}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    تم التحديث في {m.renamedProduct.invoicesUpdated} فاتورة، {m.renamedProduct.purchaseOrdersUpdated} طلب شراء، {m.renamedProduct.bundlesUpdated} مجموعة
                  </div>
                </div>
              )}

              {m.actions && m.actions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {m.actions.map((a) => (
                    <Link
                      key={a.href}
                      href={a.href}
                      className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                    >
                      <Zap className="size-3.5" /> {a.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
              <Sparkles className="size-4" />
            </div>
            <div className="rounded-2xl px-4 py-2.5" style={{ background: "var(--surface-2)" }}>
              <Loader2 className="size-4 animate-spin text-indigo-500" />
            </div>
          </div>
        )}
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 shrink-0 mt-3">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="text-xs rounded-full border px-3 py-1.5 hover:bg-accent transition-colors"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex items-end gap-2 shrink-0 mt-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
          }}
          placeholder="اكتب سؤالك أو اطلب إنشاء فاتورة أو إعادة تسمية منتج..."
          rows={1}
          className="min-h-11 max-h-32 resize-none rounded-xl"
          disabled={loading}
        />
        <Button onClick={() => send()} disabled={loading || !input.trim()} className="h-11 w-11 shrink-0 rounded-xl p-0">
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
