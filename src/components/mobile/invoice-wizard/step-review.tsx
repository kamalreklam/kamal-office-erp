"use client";

import { useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/data";
import type { AppSettings } from "@/lib/store";

interface CartItem {
  productId: string;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface StepReviewProps {
  cart: CartItem[];
  onCartChange: (cart: CartItem[]) => void;
  discountType: "percentage" | "fixed";
  discountValue: number;
  onDiscountTypeChange: (t: "percentage" | "fixed") => void;
  onDiscountValueChange: (v: number) => void;
  notes: string;
  onNotesChange: (n: string) => void;
  settings: AppSettings;
  onNext: () => void;
  onBack: () => void;
}

export function StepReview({
  cart, onCartChange,
  discountType, discountValue, onDiscountTypeChange, onDiscountValueChange,
  notes, onNotesChange,
  settings, onNext,
}: StepReviewProps) {
  const [showDiscount, setShowDiscount] = useState(discountValue > 0);
  const [showNotes, setShowNotes] = useState(!!notes);

  const subtotal = cart.reduce((s, i) => s + i.total, 0);
  const clampedDiscount = discountType === "percentage" ? Math.min(discountValue, 100) : Math.min(discountValue, subtotal);
  const discountAmount = discountType === "percentage" ? (subtotal * clampedDiscount) / 100 : clampedDiscount;
  const taxAmount = settings.taxEnabled ? ((subtotal - discountAmount) * settings.taxRate) / 100 : 0;
  const total = Math.max(0, subtotal - discountAmount + taxAmount);

  function removeItem(productId: string) {
    onCartChange(cart.filter((c) => c.productId !== productId));
  }

  return (
    <div className="space-y-5 pt-2" dir="rtl">
      {/* Items */}
      <div className="space-y-2">
        {cart.map((item) => (
          <div
            key={item.productId}
            className="flex items-center gap-3 rounded-2xl p-4"
            style={{ background: "var(--surface-1)", border: "1px solid var(--border-subtle)" }}
          >
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate" style={{ fontSize: 16, color: "var(--text-primary)" }}>{item.productName}</p>
              <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
                {item.quantity} × {formatCurrency(item.unitPrice)}
              </p>
            </div>
            <span className="font-extrabold shrink-0" style={{ fontSize: 18, color: "var(--primary)" }}>
              {formatCurrency(item.total)}
            </span>
            <button onClick={() => removeItem(item.productId)} className="p-2 shrink-0" style={{ color: "var(--red-500)" }}>
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        ))}
      </div>

      {/* Discount toggle */}
      <button
        onClick={() => setShowDiscount(!showDiscount)}
        className="flex w-full items-center justify-between rounded-2xl p-4"
        style={{ background: "var(--surface-1)", border: "1px dashed var(--border-default)" }}
      >
        <span className="font-bold" style={{ fontSize: 16, color: "var(--text-secondary)" }}>خصم</span>
        <ChevronDown className={`h-5 w-5 transition-transform ${showDiscount ? "rotate-180" : ""}`} style={{ color: "var(--text-muted)" }} />
      </button>
      {showDiscount && (
        <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--surface-1)", border: "1px solid var(--border-subtle)" }}>
          <div className="flex gap-2">
            <button
              onClick={() => onDiscountTypeChange("percentage")}
              className="flex-1 rounded-xl py-3 font-bold"
              style={{
                fontSize: 16,
                background: discountType === "percentage" ? "var(--primary)" : "var(--surface-2)",
                color: discountType === "percentage" ? "white" : "var(--text-secondary)",
                border: "none",
                cursor: "pointer",
              }}
            >
              نسبة %
            </button>
            <button
              onClick={() => onDiscountTypeChange("fixed")}
              className="flex-1 rounded-xl py-3 font-bold"
              style={{
                fontSize: 16,
                background: discountType === "fixed" ? "var(--primary)" : "var(--surface-2)",
                color: discountType === "fixed" ? "white" : "var(--text-secondary)",
                border: "none",
                cursor: "pointer",
              }}
            >
              مبلغ ثابت $
            </button>
          </div>
          <input
            type="text"
            inputMode="decimal"
            value={discountValue || ""}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "" || /^\d*\.?\d*$/.test(v)) onDiscountValueChange(parseFloat(v) || 0);
            }}
            placeholder="0"
            className="w-full rounded-xl border-2 text-center font-bold"
            style={{
              height: 52,
              fontSize: 22,
              background: "var(--surface-1)",
              borderColor: "var(--border-default)",
              color: "var(--text-primary)",
              outline: "none",
            }}
            dir="ltr"
          />
        </div>
      )}

      {/* Notes toggle */}
      <button
        onClick={() => setShowNotes(!showNotes)}
        className="flex w-full items-center justify-between rounded-2xl p-4"
        style={{ background: "var(--surface-1)", border: "1px dashed var(--border-default)" }}
      >
        <span className="font-bold" style={{ fontSize: 16, color: "var(--text-secondary)" }}>ملاحظات</span>
        <ChevronDown className={`h-5 w-5 transition-transform ${showNotes ? "rotate-180" : ""}`} style={{ color: "var(--text-muted)" }} />
      </button>
      {showNotes && (
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="ملاحظات إضافية..."
          rows={3}
          className="w-full rounded-2xl border-2 p-4 resize-none"
          style={{
            fontSize: 16,
            background: "var(--surface-1)",
            borderColor: "var(--border-default)",
            color: "var(--text-primary)",
            outline: "none",
          }}
        />
      )}

      {/* Totals */}
      <div className="rounded-2xl p-5 space-y-3" style={{ background: "var(--surface-2)" }}>
        <div className="flex justify-between">
          <span style={{ fontSize: 16, color: "var(--text-muted)" }}>المجموع الفرعي</span>
          <span className="font-bold" style={{ fontSize: 18, color: "var(--text-primary)" }}>{formatCurrency(subtotal)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between">
            <span style={{ fontSize: 16, color: "var(--text-muted)" }}>الخصم</span>
            <span className="font-bold" style={{ fontSize: 18, color: "var(--red-500)" }}>-{formatCurrency(discountAmount)}</span>
          </div>
        )}
        {taxAmount > 0 && (
          <div className="flex justify-between">
            <span style={{ fontSize: 16, color: "var(--text-muted)" }}>الضريبة ({settings.taxRate}%)</span>
            <span className="font-bold" style={{ fontSize: 18, color: "var(--text-primary)" }}>+{formatCurrency(taxAmount)}</span>
          </div>
        )}
        <div className="flex justify-between pt-3" style={{ borderTop: "2px solid var(--border-default)" }}>
          <span className="font-extrabold" style={{ fontSize: 22, color: "var(--text-primary)" }}>الإجمالي</span>
          <span className="font-extrabold" style={{ fontSize: 28, color: "var(--primary)" }}>{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Next */}
      <div className="sticky bottom-20 pt-3">
        <button
          onClick={onNext}
          disabled={cart.length === 0}
          className="w-full rounded-2xl font-bold"
          style={{
            height: 56,
            fontSize: 18,
            background: cart.length > 0 ? "var(--primary)" : "var(--surface-3)",
            color: "white",
            border: "none",
            cursor: cart.length > 0 ? "pointer" : "not-allowed",
          }}
        >
          متابعة للحفظ
        </button>
      </div>
    </div>
  );
}
