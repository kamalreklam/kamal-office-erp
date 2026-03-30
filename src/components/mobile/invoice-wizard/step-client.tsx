"use client";

import { useState } from "react";
import { Search, Check } from "lucide-react";
import type { Client } from "@/lib/data";
import { formatCurrency } from "@/lib/data";

interface StepClientProps {
  clients: Client[];
  selected: Client | null;
  onSelect: (client: Client) => void;
  onNext: () => void;
}

export function StepClient({ clients, selected, onSelect, onNext }: StepClientProps) {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? clients.filter((c) => c.name.includes(search) || c.phone.includes(search))
    : clients;

  return (
    <div className="space-y-4 pt-2" dir="rtl">
      {/* Search */}
      <div className="relative">
        <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
        <input
          type="text"
          placeholder="ابحث عن عميل..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl border-2 pr-12 pl-4"
          style={{
            height: 52,
            fontSize: 18,
            background: "var(--surface-1)",
            borderColor: "var(--border-default)",
            color: "var(--text-primary)",
            outline: "none",
          }}
        />
      </div>

      {/* Client list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="py-12 text-center" style={{ fontSize: 18, color: "var(--text-muted)" }}>
            لا يوجد عملاء مطابقين
          </p>
        ) : (
          filtered.slice(0, 20).map((client) => {
            const isSelected = selected?.id === client.id;
            return (
              <button
                key={client.id}
                onClick={() => onSelect(client)}
                className="flex w-full items-center gap-4 rounded-2xl p-4 text-right transition-all"
                style={{
                  background: isSelected ? "var(--accent-soft)" : "var(--surface-1)",
                  border: isSelected ? "2px solid var(--primary)" : "2px solid var(--border-subtle)",
                }}
              >
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-bold"
                  style={{
                    fontSize: 22,
                    background: isSelected ? "var(--primary)" : "var(--surface-3)",
                    color: isSelected ? "white" : "var(--text-secondary)",
                  }}
                >
                  {client.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate" style={{ fontSize: 18, color: "var(--text-primary)" }}>
                    {client.name}
                  </p>
                  {client.phone && (
                    <p dir="ltr" className="text-left" style={{ fontSize: 15, color: "var(--text-muted)" }}>
                      {client.phone}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-left">
                  {isSelected ? (
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full"
                      style={{ background: "var(--primary)", color: "white" }}
                    >
                      <Check className="h-5 w-5" />
                    </div>
                  ) : (
                    <p className="font-bold" style={{ fontSize: 16, color: "var(--primary)" }}>
                      {formatCurrency(client.totalSpent)}
                    </p>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Next button */}
      {selected && (
        <div className="sticky bottom-20 pt-3">
          <button
            onClick={onNext}
            className="w-full rounded-2xl font-bold"
            style={{
              height: 56,
              fontSize: 18,
              background: "var(--primary)",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            متابعة — {selected.name}
          </button>
        </div>
      )}
    </div>
  );
}
