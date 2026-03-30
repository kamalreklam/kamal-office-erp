"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Search, Plus, Minus, X, Package, Check,
  ChevronDown, Trash2, Save, FileText, CheckCircle2, AlertTriangle,
  Droplets,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { type InvoiceStatus, type Client, type Product, formatCurrency } from "@/lib/data";
import { toast } from "sonner";

interface CartItem {
  productId: string;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export function MobileInvoiceWizard({ editId }: { editId?: string | null }) {
  const router = useRouter();
  const { clients, products, bundles, invoices, addInvoice, updateInvoice, settings } = useStore();

  const editingInvoice = editId ? invoices.find((inv) => inv.id === editId) : null;
  const isEdit = !!editingInvoice;

  // Client
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(() => {
    if (editingInvoice) {
      return clients.find((c) => c.id === editingInvoice.clientId) || null;
    }
    return null;
  });
  const [showClients, setShowClients] = useState(false);

  // Products
  const [productSearch, setProductSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (editingInvoice) {
      const rawItems = editingInvoice.items;
      const items = Array.isArray(rawItems) ? rawItems : (rawItems as any)?._items || [];
      return items.map((item: any) => ({
        productId: item.productId,
        productName: item.productName,
        description: item.description || "",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice,
      }));
    }
    return [];
  });
  const [qtySheet, setQtySheet] = useState<{ product: Product; qty: number; price: string } | null>(null);
  const [showProducts, setShowProducts] = useState(false);

  // Extras
  const [showExtras, setShowExtras] = useState(() => !!(editingInvoice && (editingInvoice.discountValue > 0 || editingInvoice.notes)));
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">(() => editingInvoice?.discountType || "percentage");
  const [discountValue, setDiscountValue] = useState(() => editingInvoice?.discountValue || 0);
  const [notes, setNotes] = useState(() => editingInvoice?.notes || "");

  // Bundles
  const [showBundleSheet, setShowBundleSheet] = useState(false);
  const [activeBundleId, setActiveBundleId] = useState<string | null>(null);
  const [bundleQty, setBundleQty] = useState<Record<string, number>>({});
  const [bundlePrice, setBundlePrice] = useState<Record<string, string>>({});

  // Save
  const [saving, setSaving] = useState(false);

  // Calculations
  const subtotal = cart.reduce((s, i) => s + i.total, 0);
  const clampedDiscount = discountType === "percentage" ? Math.min(discountValue, 100) : Math.min(discountValue, subtotal);
  const discountAmount = discountType === "percentage" ? (subtotal * clampedDiscount) / 100 : clampedDiscount;
  const taxAmount = settings.taxEnabled ? ((subtotal - discountAmount) * settings.taxRate) / 100 : 0;
  const total = Math.max(0, subtotal - discountAmount + taxAmount);

  const filteredClients = clientSearch.trim()
    ? clients.filter((c) => c.name.includes(clientSearch) || c.phone.includes(clientSearch))
    : clients;

  const filteredProducts = productSearch.trim()
    ? products.filter((p) => p.name.includes(productSearch) || p.category.includes(productSearch))
    : products.slice(0, 15);

  function selectClient(client: Client) {
    setSelectedClient(client);
    setClientSearch(client.name);
    setShowClients(false);
  }

  function openQtySheet(product: Product) {
    if (product.stock <= 0) {
      toast.error(`"${product.name}" — نفذ المخزون`);
      return;
    }
    const existing = cart.find((c) => c.productId === product.id);
    setQtySheet({
      product,
      qty: existing?.quantity || 1,
      price: String(existing?.unitPrice ?? product.price),
    });
  }

  function confirmAdd() {
    if (!qtySheet) return;
    const { product, qty, price: priceStr } = qtySheet;
    const price = parseFloat(priceStr) || 0;
    if (qty > product.stock) {
      toast.error(`الكمية (${qty}) أكبر من المخزون (${product.stock})`);
      return;
    }
    const item: CartItem = {
      productId: product.id,
      productName: product.name,
      description: product.description,
      quantity: qty,
      unitPrice: price,
      total: qty * price,
    };
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.productId === product.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = item; return n; }
      return [...prev, item];
    });
    setQtySheet(null);
    setShowProducts(false);
    setProductSearch("");
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  }

  const colorConfig: Record<string, { label: string; dot: string }> = {
    C: { label: "Cyan", dot: "#06b6d4" },
    M: { label: "Magenta", dot: "#ec4899" },
    Y: { label: "Yellow", dot: "#eab308" },
    BK: { label: "Black", dot: "#1f2937" },
    LC: { label: "Light Cyan", dot: "#38bdf8" },
    LM: { label: "Light Magenta", dot: "#fb7185" },
  };

  function getColorKey(name: string): string {
    const n = name.toLowerCase();
    if (n.includes("light cyan")) return "LC";
    if (n.includes("light magenta")) return "LM";
    if (n.includes("cyan")) return "C";
    if (n.includes("magenta")) return "M";
    if (n.includes("yellow")) return "Y";
    if (n.includes("black")) return "BK";
    return "BK";
  }

  function openBundleSheet(bundleId: string) {
    const bundle = bundles.find((b) => b.id === bundleId);
    if (!bundle) return;
    const qty: Record<string, number> = {};
    const price: Record<string, string> = {};
    bundle.items.forEach((bi) => {
      const product = products.find((p) => p.id === bi.productId);
      qty[bi.productId] = 1;
      price[bi.productId] = String(product?.price || 0);
    });
    setBundleQty(qty);
    setBundlePrice(price);
    setActiveBundleId(bundleId);
    setShowBundleSheet(true);
  }

  function confirmBundleAdd() {
    const bundle = bundles.find((b) => b.id === activeBundleId);
    if (!bundle) return;

    const blocked: string[] = [];
    const overStock: string[] = [];
    bundle.items.forEach((bi) => {
      const product = products.find((p) => p.id === bi.productId);
      const q = bundleQty[bi.productId] || 1;
      if (product && product.stock <= 0) blocked.push(product.name);
      else if (product && q > product.stock) overStock.push(`${product.name} (${q}>${product.stock})`);
    });
    if (blocked.length > 0) { toast.error(`نفذ المخزون: ${blocked.join("، ")}`); return; }
    if (overStock.length > 0) { toast.error(`تجاوز المخزون: ${overStock.join("، ")}`); return; }

    const newItems: CartItem[] = bundle.items.map((bi) => {
      const product = products.find((p) => p.id === bi.productId);
      const q = bundleQty[bi.productId] || 1;
      const p = parseFloat(bundlePrice[bi.productId]) || product?.price || 0;
      return {
        productId: bi.productId,
        productName: product?.name || bi.productName,
        description: product?.description || "",
        quantity: q,
        unitPrice: p,
        total: q * p,
      };
    });

    setCart((prev) => {
      const kept = prev.filter((c) => !newItems.some((n) => n.productId === c.productId));
      return [...kept, ...newItems];
    });
    setShowBundleSheet(false);
    toast.success(`تم إضافة "${bundle.name}"`);
  }

  async function handleSave(status: InvoiceStatus) {
    if (!selectedClient) { toast.error("اختر عميل أولاً"); return; }
    if (cart.length === 0) { toast.error("أضف منتج واحد على الأقل"); return; }

    const stockErrors: string[] = [];
    cart.forEach((item) => {
      const p = products.find((pr) => pr.id === item.productId);
      if (p && p.stock <= 0) stockErrors.push(p.name);
      else if (p && item.quantity > p.stock) stockErrors.push(`${p.name} (${item.quantity}>${p.stock})`);
    });
    if (stockErrors.length > 0) { toast.error(`مشكلة مخزون: ${stockErrors.join("، ")}`); return; }

    setSaving(true);
    try {
      const invoiceData = {
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        items: cart.map((li) => ({
          id: `li${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          productId: li.productId, productName: li.productName, description: li.description,
          quantity: li.quantity, unitPrice: li.unitPrice, total: Math.round(li.total * 100) / 100,
        })),
        subtotal: Math.round(subtotal * 100) / 100,
        discountType, discountValue,
        discountAmount: Math.round(discountAmount * 100) / 100,
        taxAmount: Math.round(taxAmount * 100) / 100,
        total: Math.round(total * 100) / 100,
        status, notes,
      };

      if (isEdit && editId) {
        updateInvoice(editId, invoiceData);
        toast.success("تم تحديث الفاتورة");
        router.push(`/invoices/${editId}`);
      } else {
        addInvoice(invoiceData);
        toast.success(`تم حفظ الفاتورة (${status})`);
        router.push("/invoices");
      }
    } finally { setSaving(false); }
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--ground)" }} dir="rtl">

      {/* ─── Header ─── */}
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3" style={{ background: "var(--ground)" }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/invoices")}
            className="flex h-11 w-11 items-center justify-center rounded-2xl"
            style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)" }}>{isEdit ? "تعديل الفاتورة" : "فاتورة جديدة"}</h1>
        </div>
      </div>

      <div className="px-4 pb-32 space-y-4">

        {/* ─── 1. CLIENT SECTION ─── */}
        <section
          className="rounded-3xl p-5"
          style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}
        >
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>العميل</p>

          {selectedClient ? (
            <div className="flex items-center gap-3">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
                style={{ fontSize: 24, fontWeight: 700, background: "var(--primary)", color: "white" }}
              >
                {selectedClient.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>{selectedClient.name}</p>
                {selectedClient.phone && <p dir="ltr" style={{ fontSize: 14, color: "var(--text-muted)", textAlign: "left" }}>{selectedClient.phone}</p>}
              </div>
              <button
                onClick={() => { setSelectedClient(null); setClientSearch(""); }}
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="ابحث عن عميل..."
                value={clientSearch}
                onChange={(e) => { setClientSearch(e.target.value); setShowClients(true); }}
                onFocus={() => setShowClients(true)}
                className="w-full rounded-2xl border-2 pr-12 pl-4"
                style={{ height: 52, fontSize: 18, background: "var(--surface-2)", borderColor: "var(--border-default)", color: "var(--text-primary)", outline: "none" }}
              />
              {showClients && (
                <div
                  className="absolute top-full mt-2 left-0 right-0 rounded-2xl overflow-hidden max-h-64 overflow-y-auto z-20"
                  style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)", boxShadow: "var(--shadow-lg)" }}
                >
                  {filteredClients.slice(0, 10).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selectClient(c)}
                      className="flex w-full items-center gap-3 p-4 text-right"
                      style={{ borderBottom: "1px solid var(--border-subtle)" }}
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ fontSize: 18, fontWeight: 700, background: "var(--surface-3)", color: "var(--text-secondary)" }}>
                        {c.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{c.name}</p>
                        {c.phone && <p dir="ltr" style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "left" }}>{c.phone}</p>}
                      </div>
                    </button>
                  ))}
                  {filteredClients.length === 0 && (
                    <p className="p-6 text-center" style={{ fontSize: 16, color: "var(--text-muted)" }}>لا نتائج</p>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ─── 2. PRODUCTS SECTION ─── */}
        <section
          className="rounded-3xl p-5"
          style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)" }}>المنتجات</p>
            {cart.length > 0 && (
              <span style={{ fontSize: 14, fontWeight: 800, color: "var(--primary)" }}>{cart.length} منتج</span>
            )}
          </div>

          {/* Cart items */}
          {cart.length > 0 && (
            <div className="space-y-2 mb-4">
              {cart.map((item) => {
                const product = products.find((p) => p.id === item.productId);
                return (
                  <div
                    key={item.productId}
                    className="flex items-center gap-3 rounded-2xl p-4"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", cursor: "pointer" }}
                  >
                    <div
                      className="flex-1 min-w-0"
                      onClick={() => {
                        if (product) {
                          setQtySheet({ product, qty: item.quantity, price: String(item.unitPrice) });
                        }
                      }}
                    >
                      <p style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.4 }}>{item.productName}</p>
                      <p style={{ fontSize: 16, color: "var(--text-muted)", marginTop: 4 }}>
                        {item.quantity} × {formatCurrency(item.unitPrice)}
                      </p>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)", marginTop: 4, display: "inline-block" }}>✎ اضغط للتعديل</span>
                    </div>
                    <span style={{ fontSize: 20, fontWeight: 800, color: "var(--primary)", flexShrink: 0 }}>{formatCurrency(item.total)}</span>
                    <button onClick={() => removeFromCart(item.productId)} style={{ padding: 10, color: "var(--red-500)" }}>
                      <Trash2 style={{ width: 20, height: 20 }} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add product button */}
          <button
            onClick={() => setShowProducts(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl"
            style={{
              height: 56, fontSize: 18, fontWeight: 700,
              background: "var(--accent-soft)", color: "var(--primary)",
              border: "2px dashed var(--primary)", cursor: "pointer",
            }}
          >
            <Plus className="h-5 w-5" />
            إضافة منتج
          </button>

          {/* Bundle quick-add */}
          {bundles.length > 0 && (
            <div className="mt-3">
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>مجموعات سريعة</p>
              <div className="flex flex-wrap gap-2">
                {bundles.map((bundle) => (
                  <button
                    key={bundle.id}
                    onClick={() => openBundleSheet(bundle.id)}
                    className="flex items-center gap-2 rounded-xl px-4 py-2.5"
                    style={{
                      background: "var(--surface-2)",
                      border: "1px dashed var(--border-default)",
                      color: "var(--text-secondary)",
                      fontSize: 14, fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    <Droplets className="h-4 w-4" style={{ color: "var(--primary)" }} />
                    {bundle.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ─── 3. EXTRAS (Discount + Notes) ─── */}
        <button
          onClick={() => setShowExtras(!showExtras)}
          className="flex w-full items-center justify-between rounded-3xl p-5"
          style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}
        >
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-secondary)" }}>خصم وملاحظات</span>
          <ChevronDown className={`h-5 w-5 transition-transform ${showExtras ? "rotate-180" : ""}`} style={{ color: "var(--text-muted)" }} />
        </button>

        {showExtras && (
          <section className="rounded-3xl p-5 space-y-4" style={{ background: "var(--surface-1)", border: "1px solid var(--glass-border)" }}>
            {/* Discount type */}
            <div className="flex gap-2">
              {(["percentage", "fixed"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setDiscountType(t)}
                  className="flex-1 rounded-xl py-3"
                  style={{
                    fontSize: 16, fontWeight: 700,
                    background: discountType === t ? "var(--primary)" : "var(--surface-2)",
                    color: discountType === t ? "white" : "var(--text-secondary)",
                    border: "none", cursor: "pointer",
                  }}
                >
                  {t === "percentage" ? "نسبة %" : "مبلغ $"}
                </button>
              ))}
            </div>
            <input
              type="text" inputMode="decimal" dir="ltr"
              value={discountValue || ""} placeholder="0"
              onChange={(e) => { const v = e.target.value; if (v === "" || /^\d*\.?\d*$/.test(v)) setDiscountValue(parseFloat(v) || 0); }}
              className="w-full rounded-xl border-2 text-center"
              style={{ height: 52, fontSize: 22, fontWeight: 700, background: "var(--surface-1)", borderColor: "var(--border-default)", color: "var(--text-primary)", outline: "none" }}
            />
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات..."
              rows={2}
              className="w-full rounded-xl border-2 p-4 resize-none"
              style={{ fontSize: 16, background: "var(--surface-1)", borderColor: "var(--border-default)", color: "var(--text-primary)", outline: "none" }}
            />
          </section>
        )}

        {/* ─── 4. TOTALS ─── */}
        {cart.length > 0 && (
          <section className="rounded-3xl p-5 space-y-3" style={{ background: "var(--surface-2)" }}>
            <div className="flex justify-between">
              <span style={{ fontSize: 16, color: "var(--text-muted)" }}>المجموع</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{formatCurrency(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between">
                <span style={{ fontSize: 16, color: "var(--text-muted)" }}>الخصم</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: "var(--red-500)" }}>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            {taxAmount > 0 && (
              <div className="flex justify-between">
                <span style={{ fontSize: 16, color: "var(--text-muted)" }}>الضريبة</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>+{formatCurrency(taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between pt-3" style={{ borderTop: "2px solid var(--border-default)" }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>الإجمالي</span>
              <span style={{ fontSize: 30, fontWeight: 800, color: "var(--primary)" }}>{formatCurrency(total)}</span>
            </div>
          </section>
        )}
      </div>

      {/* ─── FIXED BOTTOM: Save Buttons ─── */}
      {selectedClient && cart.length > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-30 px-4 pt-3 space-y-2"
          style={{
            background: "var(--ground)",
            borderTop: "1px solid var(--glass-border)",
            paddingBottom: "calc(env(safe-area-inset-bottom, 8px) + 12px)",
          }}
        >
          <div className="flex gap-2">
            <button
              onClick={() => handleSave("مدفوعة")}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl"
              style={{ height: 56, fontSize: 18, fontWeight: 800, background: "var(--green-500)", color: "white", border: "none", cursor: "pointer", opacity: saving ? 0.6 : 1 }}
            >
              <CheckCircle2 className="h-5 w-5" /> مدفوعة
            </button>
            <button
              onClick={() => handleSave("غير مدفوعة")}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl"
              style={{ height: 56, fontSize: 18, fontWeight: 800, background: "var(--primary)", color: "white", border: "none", cursor: "pointer", opacity: saving ? 0.6 : 1 }}
            >
              <FileText className="h-5 w-5" /> آجل
            </button>
          </div>
          <button
            onClick={() => handleSave("مسودة")}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-2xl"
            style={{ height: 48, fontSize: 16, fontWeight: 700, background: "var(--surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border-default)", cursor: "pointer", opacity: saving ? 0.6 : 1 }}
          >
            <Save className="h-4 w-4" /> مسودة
          </button>
        </div>
      )}

      {/* ─── PRODUCT PICKER BOTTOM SHEET ─── */}
      <AnimatePresence>
        {showProducts && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
            onClick={() => { setShowProducts(false); setProductSearch(""); }}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 rounded-t-3xl"
              style={{ background: "var(--surface-1)", maxHeight: "85vh", display: "flex", flexDirection: "column", paddingBottom: "env(safe-area-inset-bottom, 8px)" }}
              onClick={(e) => e.stopPropagation()}
              dir="rtl"
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="h-1 w-10 rounded-full" style={{ background: "var(--border-strong)" }} />
              </div>
              <div className="px-5 pb-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>اختر منتج</h3>
                  <button onClick={() => { setShowProducts(false); setProductSearch(""); }} className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                  <input
                    type="text" placeholder="ابحث..." value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    autoFocus
                    className="w-full rounded-2xl border-2 pr-12 pl-4"
                    style={{ height: 48, fontSize: 16, background: "var(--surface-2)", borderColor: "var(--border-default)", color: "var(--text-primary)", outline: "none" }}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-2">
                {filteredProducts.map((p) => {
                  const out = p.stock <= 0;
                  const inCart = cart.some((c) => c.productId === p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => openQtySheet(p)}
                      disabled={out}
                      className="flex w-full items-center gap-3 rounded-2xl p-4 text-right"
                      style={{
                        background: inCart ? "var(--accent-soft)" : "var(--surface-2)",
                        border: inCart ? "2px solid var(--primary)" : "1px solid var(--border-subtle)",
                        opacity: out ? 0.35 : 1, cursor: out ? "not-allowed" : "pointer",
                      }}
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--surface-3)", color: "var(--text-muted)" }}>
                        <Package className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate" style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{p.name}</p>
                        <p style={{ fontSize: 13, color: out ? "var(--red-500)" : "var(--text-muted)" }}>
                          {out ? "نفذ المخزون" : `المخزون: ${p.stock} · ${p.category}`}
                        </p>
                      </div>
                      {inCart && <Check className="h-5 w-5 shrink-0" style={{ color: "var(--primary)" }} />}
                      <span className="shrink-0" style={{ fontSize: 16, fontWeight: 800, color: out ? "var(--text-muted)" : "var(--primary)" }}>
                        {formatCurrency(p.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── QUANTITY SHEET ─── */}
      <AnimatePresence>
        {qtySheet && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60]"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            onClick={() => setQtySheet(null)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 rounded-t-3xl p-6"
              style={{ background: "var(--surface-1)", paddingBottom: "calc(env(safe-area-inset-bottom, 8px) + 24px)" }}
              onClick={(e) => e.stopPropagation()}
              dir="rtl"
            >
              <div className="flex justify-center mb-4">
                <div className="h-1 w-10 rounded-full" style={{ background: "var(--border-strong)" }} />
              </div>
              <h3 className="truncate" style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
                {qtySheet.product.name}
              </h3>
              <p style={{ fontSize: 15, color: "var(--text-muted)", marginBottom: 20 }}>
                المخزون: {qtySheet.product.stock} {qtySheet.product.unit}
              </p>

              {/* Qty */}
              <label style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: 8 }}>الكمية</label>
              <div className="flex items-center gap-3 mb-5">
                <button
                  onClick={() => setQtySheet({ ...qtySheet, qty: Math.max(1, qtySheet.qty - 1) })}
                  className="flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ background: "var(--surface-2)", color: "var(--text-primary)" }}
                >
                  <Minus className="h-6 w-6" />
                </button>
                <input
                  type="number" min={1} max={qtySheet.product.stock} value={qtySheet.qty}
                  onChange={(e) => setQtySheet({ ...qtySheet, qty: Math.min(parseInt(e.target.value) || 1, qtySheet.product.stock) })}
                  className="flex-1 rounded-2xl border-2 text-center"
                  style={{ height: 56, fontSize: 28, fontWeight: 800, background: "var(--surface-1)", borderColor: "var(--border-default)", color: "var(--text-primary)", outline: "none" }}
                  dir="ltr"
                />
                <button
                  onClick={() => setQtySheet({ ...qtySheet, qty: Math.min(qtySheet.product.stock, qtySheet.qty + 1) })}
                  className="flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ background: "var(--surface-2)", color: "var(--text-primary)" }}
                >
                  <Plus className="h-6 w-6" />
                </button>
              </div>

              {/* Price */}
              <label style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: 8 }}>سعر الوحدة ($)</label>
              <input
                type="text" inputMode="decimal" dir="ltr"
                value={qtySheet.price}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^\d*\.?\d*$/.test(v)) setQtySheet({ ...qtySheet, price: v });
                }}
                className="w-full rounded-2xl border-2 text-center mb-5"
                style={{ height: 52, fontSize: 22, fontWeight: 700, background: "var(--surface-1)", borderColor: "var(--border-default)", color: "var(--text-primary)", outline: "none" }}
              />

              {/* Total */}
              <div className="flex items-center justify-between mb-5">
                <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-muted)" }}>الإجمالي</span>
                <span style={{ fontSize: 28, fontWeight: 800, color: "var(--primary)" }}>
                  {formatCurrency(qtySheet.qty * (parseFloat(qtySheet.price) || 0))}
                </span>
              </div>

              <button
                onClick={confirmAdd}
                className="w-full rounded-2xl"
                style={{ height: 56, fontSize: 18, fontWeight: 800, background: "var(--primary)", color: "white", border: "none", cursor: "pointer" }}
              >
                {cart.some((c) => c.productId === qtySheet.product.id) ? "تحديث" : "إضافة"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── BUNDLE SHEET ─── */}
      <AnimatePresence>
        {showBundleSheet && (() => {
          const bundle = bundles.find((b) => b.id === activeBundleId);
          if (!bundle) return null;
          const colorOrder = ["C", "M", "Y", "BK", "LC", "LM"];
          const sortedItems = [...bundle.items]
            .map((bi) => {
              const product = products.find((p) => p.id === bi.productId);
              const ck = getColorKey(product?.name || bi.productName);
              return { ...bi, product, colorKey: ck };
            })
            .sort((a, b) => colorOrder.indexOf(a.colorKey) - colorOrder.indexOf(b.colorKey));

          const bundleTotal = sortedItems.reduce((s, bi) => {
            const q = bundleQty[bi.productId] || 1;
            const p = parseFloat(bundlePrice[bi.productId]) || 0;
            return s + q * p;
          }, 0);

          return (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60]"
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
              onClick={() => setShowBundleSheet(false)}
            >
              <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="absolute bottom-0 left-0 right-0 rounded-t-3xl"
                style={{ background: "var(--surface-1)", maxHeight: "85vh", overflow: "auto", paddingBottom: "calc(env(safe-area-inset-bottom, 8px) + 24px)" }}
                onClick={(e) => e.stopPropagation()}
                dir="rtl"
              >
                <div className="flex justify-center pt-3 pb-2">
                  <div className="h-1 w-10 rounded-full" style={{ background: "var(--border-strong)" }} />
                </div>

                <div className="px-5 pb-5">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ background: "linear-gradient(135deg, #06b6d4, #ec4899, #eab308)", color: "white" }}
                    >
                      <Droplets className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>{bundle.name}</h3>
                      {bundle.description && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{bundle.description}</p>}
                    </div>
                    <button onClick={() => setShowBundleSheet(false)} className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Color rows */}
                  <div className="space-y-2 mb-4">
                    {sortedItems.map((bi) => {
                      const cfg = colorConfig[bi.colorKey] || colorConfig.BK;
                      const outOfStock = bi.product && bi.product.stock <= 0;
                      return (
                        <div
                          key={bi.productId}
                          className="flex items-center gap-3 rounded-2xl p-3"
                          style={{
                            background: "var(--surface-2)",
                            border: "1px solid var(--border-subtle)",
                            opacity: outOfStock ? 0.4 : 1,
                          }}
                        >
                          <div className="h-5 w-5 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
                          <div className="flex-1 min-w-0">
                            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{cfg.label}</span>
                            {bi.product && (
                              <span className="block" style={{ fontSize: 11, color: outOfStock ? "var(--red-500)" : "var(--text-muted)" }}>
                                {outOfStock ? "نفذ!" : `المخزون: ${bi.product.stock}`}
                              </span>
                            )}
                          </div>
                          <input
                            type="number" min={0}
                            max={bi.product?.stock || 999}
                            value={bundleQty[bi.productId] || 1}
                            onChange={(e) => setBundleQty((prev) => ({ ...prev, [bi.productId]: parseInt(e.target.value) || 0 }))}
                            disabled={!!outOfStock}
                            className="rounded-xl border text-center"
                            style={{ width: 64, height: 40, fontSize: 16, fontWeight: 700, background: "var(--surface-1)", borderColor: "var(--border-default)", color: "var(--text-primary)", outline: "none" }}
                            dir="ltr"
                          />
                          <input
                            type="text" inputMode="decimal" dir="ltr"
                            value={bundlePrice[bi.productId] ?? "0"}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === "" || /^\d*\.?\d*$/.test(v)) setBundlePrice((prev) => ({ ...prev, [bi.productId]: v }));
                            }}
                            disabled={!!outOfStock}
                            className="rounded-xl border text-center"
                            style={{ width: 72, height: 40, fontSize: 14, fontWeight: 700, background: "var(--surface-1)", borderColor: "var(--border-default)", color: "var(--text-primary)", outline: "none" }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Total */}
                  <div className="flex items-center justify-between rounded-2xl p-4 mb-4" style={{ background: "var(--accent-soft)" }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "var(--primary)" }}>الإجمالي</span>
                    <span style={{ fontSize: 24, fontWeight: 800, color: "var(--primary)" }}>{formatCurrency(bundleTotal)}</span>
                  </div>

                  {/* Confirm */}
                  <button
                    onClick={confirmBundleAdd}
                    className="w-full rounded-2xl"
                    style={{ height: 56, fontSize: 18, fontWeight: 800, background: "var(--primary)", color: "white", border: "none", cursor: "pointer" }}
                  >
                    إضافة المجموعة
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
