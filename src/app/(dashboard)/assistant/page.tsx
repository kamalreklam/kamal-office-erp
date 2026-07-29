"use client";

import { useEffect, useState } from "react";
import { AssistantChat } from "@/components/assistant-chat";
import { Cpu, Activity, Gauge } from "lucide-react";

interface UsageInfo { promptTokens: number; completionTokens: number; totalTokens: number; model: string; }
interface UsageStats {
  model: string;
  fallbackModel: string;
  totals: { promptTokens: number; completionTokens: number; totalTokens: number; requestCount: number };
}

export default function AssistantPage() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [lastUsage, setLastUsage] = useState<UsageInfo | null>(null);
  const [loadError, setLoadError] = useState(false);

  async function loadStats() {
    try {
      const res = await fetch("/api/assistant");
      if (!res.ok) throw new Error();
      setStats(await res.json());
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }

  useEffect(() => { loadStats(); }, []);

  function handleUsage(usage: UsageInfo) {
    setLastUsage(usage);
    // Re-sync with the durable server-side total rather than guessing the
    // increment client-side, so the numbers shown are always the real ones.
    loadStats();
  }

  const activeModel = lastUsage?.model || stats?.model;
  const usedFallback = !!stats && activeModel === stats.fallbackModel;

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 pt-5 sm:pt-8 pb-6 flex flex-col gap-4 h-[calc(100dvh-3.5rem)]">
      {/* Model / usage status panel — real numbers from the server, never invented */}
      <div className="shrink-0 rounded-2xl border p-3 sm:p-4" style={{ borderColor: "var(--border-subtle)", background: "var(--surface-1)" }}>
        {loadError ? (
          <p className="text-xs font-bold text-rose-500">تعذّر جلب إحصائيات الاستخدام.</p>
        ) : !stats ? (
          <p className="text-xs font-bold text-muted-foreground">جاري تحميل حالة المساعد...</p>
        ) : (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-[length:var(--text-sm)] font-bold">
            <div className="flex items-center gap-1.5">
              <Cpu className="size-3.5 text-indigo-500 shrink-0" />
              <span className="text-muted-foreground">النموذج:</span>
              <span dir="ltr" className="text-slate-900" style={{ color: "var(--text-primary, inherit)" }}>{activeModel}</span>
              {usedFallback && <span className="text-amber-600">(احتياطي)</span>}
            </div>
            <div className="flex items-center gap-1.5">
              <Activity className="size-3.5 text-emerald-500 shrink-0" />
              <span className="text-muted-foreground">الحالة:</span>
              <span className="text-emerald-600">متصل</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Gauge className="size-3.5 text-violet-500 shrink-0" />
              <span className="text-muted-foreground">إجمالي التوكنز:</span>
              <span dir="ltr" style={{ color: "var(--text-primary, inherit)" }}>{stats.totals.totalTokens.toLocaleString("en-US")}</span>
              <span className="text-muted-foreground">({stats.totals.requestCount.toLocaleString("en-US")} طلب)</span>
            </div>
            {lastUsage && (
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">آخر رسالة:</span>
                <span dir="ltr" style={{ color: "var(--text-primary, inherit)" }}>{lastUsage.totalTokens.toLocaleString("en-US")} توكن</span>
                <span className="text-muted-foreground/70" dir="ltr">({lastUsage.promptTokens.toLocaleString("en-US")}↑ / {lastUsage.completionTokens.toLocaleString("en-US")}↓)</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0">
        <AssistantChat height="100%" onUsage={handleUsage} />
      </div>
    </div>
  );
}
