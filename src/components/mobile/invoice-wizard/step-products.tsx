"use client";

import { useState } from "react";
import { Search, Plus, Minus, X, Package, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Product } from "@/lib/data";
import { formatCurrency } from "@/lib/data";

interface CartItem {
  productId: string;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface StepProductsProps {
  products: Product[];
  cart: CartItem[];
  onCartChange: (cart: CartItem[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepProducts({ products, cart, onCartChange, onNext, onBack }: StepProductsProps) {
  const [search, setSearch] = useState("");
  const [qtySheet, setQtySheet] = useState<{ product: Product; qty: number; price: number } | null>(null);

  const filtered = search.trim()
    ? products.filter((p) => p.name.includes(search) || p.category.includes(search) || p.sku.includes(search))
    : products.slice(0, 20);

  const cartTotal = cart.reduce((s, i) => s + i.total, 0);

  function openQtySheet(product: Product) {
    if (product.stock <= 0) return;
    const existing = cart.find((c) => c.productId === product.id);
    setQtySheet({
      product,
      qty: existing?.quantity || 1,
      price: existing?.unitPrice || product.price,
    });
  }

  function confirmAdd() {
    if (!qtySheet) return;
    const { product, qty, price } = qtySheet;
    const existing = cart.findIndex((c) => c.productId === product.id);
    const newCart = [...cart];
    const item: CartItem = {
      productId: product.id,
      productName: product.name,
      description: product.description,
      quantity: qty,
      unitPrice: price,
      total: qty * price,
    };
    if (existing >= 0) {
      newCart[existing] = item;
    } else {
      newCart.push(item);
    }
    onCartChange(newCart);
    setQtySheet(null);
  }

  function removeFromCart(productId: string) {
    onCartChange(cart.filter((c) => c.productId !== productId));
  }

  return (
    <div className="space-y-4 pt-2" dir="rtl">
      {/* Cart summary */}
      {cart.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: "var(--accent-soft)", border: "1px solid var(--primary)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold" style={{ fontSize: 16, color: "var(--primary)" }}>
              المنتجات المضافة ({cart.length})
            </span>
            <span className="font-extrabold" style={{ fontSize: 20, color: "var(--primary)" }}>
              {formatCurrency(cartTotal)}
            </span>
          </div>
          <div className="space-y-1">
            {cart.map((item) => (
              <div key={item.productId} className="flex items-center justify-between rounded-xl p-2" style={{ background: "var(--surface-1)" }}>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block" style={{ color: "var(--text-primary)" }}>{item.productName}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{item.quantity} × {formatCurrency(item.unitPrice)}</span>
                </div>
                <button onClick={() => removeFromCart(item.productId)} className="p-2" style={{ color: "var(--red-500)" }}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
        <input
          type="text"
          placeholder="ابحث عن منتج..."
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

      {/* Product list */}
      <div className="space-y-2">
        {filtered.map((product) => {
          const outOfStock = product.stock <= 0;
          const inCart = cart.some((c) => c.productId === product.id);
          return (
            <button
              key={product.id}
              onClick={() => openQtySheet(product)}
              disabled={outOfStock}
              className="flex w-full items-center gap-3 rounded-2xl p-4 text-right transition-all"
              style={{
                background: inCart ? "var(--accent-soft)" : "var(--surface-1)",
                border: inCart ? "2px solid var(--primary)" : "2px solid var(--border-subtle)",
                opacity: outOfStock ? 0.4 : 1,
                cursor: outOfStock ? "not-allowed" : "pointer",
              }}
            >
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
              >
                <Package className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate" style={{ fontSize: 16, color: "var(--text-primary)" }}>{product.name}</p>
                <p style={{ fontSize: 14, color: outOfStock ? "var(--red-500)" : "var(--text-muted)" }}>
                  {outOfStock ? "نفذ المخزون" : `${product.category} · المخزون: ${product.stock}`}
                </p>
              </div>
              <div className="shrink-0 text-left">
                {outOfStock ? (
                  <AlertTriangle className="h-5 w-5" style={{ color: "var(--red-500)" }} />
                ) : (
                  <span className="font-bold" style={{ fontSize: 18, color: "var(--primary)" }}>
                    {formatCurrency(product.price)}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Next button */}
      {cart.length > 0 && (
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
            متابعة — {cart.length} منتجات · {formatCurrency(cartTotal)}
          </button>
        </div>
      )}

      {/* Quantity Bottom Sheet */}
      <AnimatePresence>
        {qtySheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
            onClick={() => setQtySheet(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 rounded-t-3xl p-6"
              style={{
                background: "var(--surface-1)",
                paddingBottom: "calc(env(safe-area-inset-bottom, 16px) + 24px)",
              }}
              onClick={(e) => e.stopPropagation()}
              dir="rtl"
            >
              {/* Handle */}
              <div className="flex justify-center mb-4">
                <div className="h-1 w-10 rounded-full" style={{ background: "var(--border-strong)" }} />
              </div>

              <h3 className="font-extrabold mb-1" style={{ fontSize: 22, color: "var(--text-primary)" }}>
                {qtySheet.product.name}
              </h3>
              <p className="mb-5" style={{ fontSize: 15, color: "var(--text-muted)" }}>
                المخزون: {qtySheet.product.stock} {qtySheet.product.unit}
              </p>

              {/* Quantity */}
              <div className="mb-5">
                <label className="block mb-2 font-bold" style={{ fontSize: 15, color: "var(--text-muted)" }}>الكمية</label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setQtySheet({ ...qtySheet, qty: Math.max(1, qtySheet.qty - 1) })}
                    className="flex h-14 w-14 items-center justify-center rounded-2xl"
                    style={{ background: "var(--surface-2)", color: "var(--text-primary)", fontSize: 24 }}
                  >
                    <Minus className="h-6 w-6" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={qtySheet.product.stock}
                    value={qtySheet.qty}
                    onChange={(e) => {
                      const v = Math.min(parseInt(e.target.value) || 1, qtySheet.product.stock);
                      setQtySheet({ ...qtySheet, qty: v });
                    }}
                    className="flex-1 rounded-2xl border-2 text-center font-extrabold"
                    style={{
                      height: 56,
                      fontSize: 28,
                      background: "var(--surface-1)",
                      borderColor: "var(--border-default)",
                      color: "var(--text-primary)",
                      outline: "none",
                    }}
                    dir="ltr"
                  />
                  <button
                    onClick={() => setQtySheet({ ...qtySheet, qty: Math.min(qtySheet.product.stock, qtySheet.qty + 1) })}
                    className="flex h-14 w-14 items-center justify-center rounded-2xl"
                    style={{ background: "var(--surface-2)", color: "var(--text-primary)", fontSize: 24 }}
                  >
                    <Plus className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Price */}
              <div className="mb-6">
                <label className="block mb-2 font-bold" style={{ fontSize: 15, color: "var(--text-muted)" }}>سعر الوحدة ($)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={qtySheet.price}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^\d*\.?\d*$/.test(v)) {
                      setQtySheet({ ...qtySheet, price: parseFloat(v) || 0 });
                    }
                  }}
                  className="w-full rounded-2xl border-2 text-center font-bold"
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

              {/* Total + Confirm */}
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold" style={{ fontSize: 18, color: "var(--text-muted)" }}>الإجمالي</span>
                <span className="font-extrabold" style={{ fontSize: 26, color: "var(--primary)" }}>
                  {formatCurrency(qtySheet.qty * qtySheet.price)}
                </span>
              </div>

              <button
                onClick={confirmAdd}
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
                {cart.some((c) => c.productId === qtySheet.product.id) ? "تحديث" : "إضافة للفاتورة"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
