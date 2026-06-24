"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Search, Plus, Minus, X, Package, Check,
  Trash2, Save, FileText, CheckCircle2, Droplets, AlertTriangle,
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
  discount?: number;
  _priceInput?: string;
  _costInput?: string;
  isBundle?: boolean;
  bundleComponents?: { productId: string; productName: string; quantity: number }[];
  isTemporary?: boolean;
  costPrice?: number;
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
  const clientRef = useRef<HTMLDivElement>(null);

  // Products
  const [productSearch, setProductSearch] = useState("");
  const [showProductSearch, setShowProductSearch] = useState(false);
  const productSearchRef = useRef<HTMLDivElement>(null);
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
        total: item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100),
        discount: item.discount || 0,
        isBundle: item.isBundle,
        bundleComponents: item.bundleComponents,
        isTemporary: item.isTemporary,
        costPrice: item.costPrice,
      }));
    }
    return [];
  });

  // Extras
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">(() => editingInvoice?.discountType || "percentage");
  const [discountValue, setDiscountValue] = useState(() => editingInvoice?.discountValue || 0);
  const [notes, setNotes] = useState(() => editingInvoice?.notes || "");

  // Bundles
  const [showBundleSheet, setShowBundleSheet] = useState(false);
  const [activeBundleId, setActiveBundleId] = useState<string | null>(null);
  const [bundleSetPrice, setBundleSetPrice] = useState("");

  // Save
  const [saving, setSaving] = useState(false);

  // Calculations — per-line discount aware
  const subtotal = cart.reduce((s, i) => s + i.quantity * i.unitPrice * (1 - (i.discount || 0) / 100), 0);
  const clampedDiscount = discountType === "percentage" ? Math.min(discountValue, 100) : Math.min(discountValue, subtotal);
  const discountAmount = discountType === "percentage" ? (subtotal * clampedDiscount) / 100 : clampedDiscount;
  const taxAmount = settings.taxEnabled ? ((subtotal - discountAmount) * settings.taxRate) / 100 : 0;
  const total = Math.max(0, subtotal - discountAmount + taxAmount);

  const filteredClients = clientSearch.trim()
    ? clients.filter((c) => { const q = clientSearch.toLowerCase(); return c.name.toLowerCase().includes(q) || c.phone.includes(q); })
    : clients;

  const filteredProducts = productSearch.trim()
    ? products.filter((p) => { const q = productSearch.toLowerCase(); return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q); })
    : products.slice(0, 15);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) {
        setShowClients(false);
      }
      if (productSearchRef.current && !productSearchRef.current.contains(e.target as Node)) {
        setShowProductSearch(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectClient(client: Client) {
    setSelectedClient(client);
    setClientSearch(client.name);
    setShowClients(false);
  }

  function addProductToCart(product: Product) {
    if (product.stock <= 0) {
      toast.error(`"${product.name}" — نفذ المخزون`);
      return;
    }
    const existing = cart.find((c) => c.productId === product.id);
    if (existing) {
      if (existing.quantity + 1 > product.stock) {
        toast.error(`الكمية أكبر من المخزون (${product.stock})`);
        return;
      }
      setCart((prev) =>
        prev.map((c) =>
          c.productId === product.id
            ? { ...c, quantity: c.quantity + 1, total: (c.quantity + 1) * c.unitPrice * (1 - (c.discount || 0) / 100) }
            : c
        )
      );
    } else {
      setCart((prev) => [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          description: product.description,
          quantity: 1,
          unitPrice: product.price,
          total: product.price,
        },
      ]);
    }
    setShowProductSearch(false);
    setProductSearch("");
    toast.success(`تم إضافة "${product.name}"`);
  }

  function addTemporaryProduct() {
    setCart((prev) => [
      ...prev,
      {
        productId: `temp_${Date.now()}`,
        productName: "",
        description: "",
        quantity: 1,
        unitPrice: 0,
        total: 0,
        isTemporary: true,
      },
    ]);
  }

  function updateCartItem(productId: string, updates: Partial<CartItem>) {
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;
        const merged = { ...item, ...updates };
        merged.total = merged.quantity * merged.unitPrice * (1 - (merged.discount || 0) / 100);
        return merged;
      })
    );
  }

  function updateCartQuantity(productId: string, quantity: number) {
    const item = cart.find((c) => c.productId === productId);
    if (!item) return;
    if (!item.isTemporary && !item.isBundle) {
      const product = products.find((p) => p.id === item.productId);
      if (product && quantity > product.stock) {
        toast.error(`الكمية (${quantity}) أكبر من المخزون (${product.stock})`);
        return;
      }
    }
    if (item.isBundle && item.bundleComponents) {
      for (const comp of item.bundleComponents) {
        const product = products.find((p) => p.id === comp.productId);
        if (product && comp.quantity * quantity > product.stock) {
          toast.error(`الكمية المطلوبة أكبر من مخزون "${product.name}" (${product.stock})`);
          return;
        }
      }
    }
    updateCartItem(productId, { quantity: Math.max(1, quantity) });
  }

  function updateCartPrice(productId: string, value: string) {
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      const unitPrice = parseFloat(value) || 0;
      updateCartItem(productId, { unitPrice, _priceInput: value });
    }
  }

  function updateCartDiscount(productId: string, discount: number) {
    const d = Math.min(Math.max(discount, 0), 100);
    updateCartItem(productId, { discount: d });
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

  // ---- Ink Sets (auto-detected CMYK groups) ----
  const colorWords = ["cyan", "magenta", "yellow", "black", "light cyan", "light magenta"];
  const colorOrder = ["C", "M", "Y", "BK", "LC", "LM"];

  const inkSets = (() => {
    const groups: Record<string, typeof products> = {};
    products.forEach(p => {
      let base = p.name.toLowerCase();
      for (const cw of colorWords) base = base.replace(cw, "").trim();
      // Strip volume/size patterns so different sizes group together
      base = base.replace(/\d+\s*ml/gi, "").trim();
      base = base.replace(/[-–—]+/g, " ").replace(/\s+/g, " ").trim();
      const cleaned = p.name.toLowerCase().replace(/\d+\s*ml/gi, "").replace(/[-–—]+/g, " ").replace(/\s+/g, " ").trim();
      if (base !== cleaned) {
        if (!groups[base]) groups[base] = [];
        groups[base].push(p);
      }
    });
    return Object.entries(groups)
      .filter(([, items]) => items.length >= 4)
      .map(([baseName, items]) => ({
        baseName,
        displayName: items[0].name.replace(/\s*(Cyan|Magenta|Yellow|Black|Light Cyan|Light Magenta)\s*/i, " ").trim() + " Set",
        items: items.sort((a, b) => colorOrder.indexOf(getColorKey(a.name)) - colorOrder.indexOf(getColorKey(b.name))),
      }));
  })();

  const [inkSetSheetOpen, setInkSetSheetOpen] = useState(false);
  const [activeInkSet, setActiveInkSet] = useState<(typeof inkSets)[0] | null>(null);
  const [inkSetPrice, setInkSetPrice] = useState("");

  function openInkSetSheet(set: (typeof inkSets)[0]) {
    setActiveInkSet(set);
    setInkSetPrice(String(set.items.reduce((s, p) => s + p.price, 0)));
    setInkSetSheetOpen(true);
  }

  function confirmInkSetAdd() {
    if (!activeInkSet) return;
    const blocked = activeInkSet.items.filter(p => p.stock <= 0).map(p => p.name);
    if (blocked.length > 0) { toast.error(`نفذ المخزون: ${blocked.join("، ")}`); return; }

    const components = activeInkSet.items.map(p => ({ productId: p.id, productName: p.name, quantity: 1 }));
    const bundleItem: CartItem = {
      productId: `inkset_${activeInkSet.baseName}`,
      productName: activeInkSet.displayName,
      description: activeInkSet.items.map(p => p.name).join(" + "),
      quantity: 1,
      unitPrice: parseFloat(inkSetPrice) || 0,
      total: parseFloat(inkSetPrice) || 0,
      isBundle: true,
      bundleComponents: components,
    };

    setCart(prev => {
      const kept = prev.filter(c => c.productId !== bundleItem.productId);
      return [...kept, bundleItem];
    });
    setInkSetSheetOpen(false);
    toast.success(`تم إضافة طقم "${activeInkSet.displayName}"`);
  }

  function openBundleSheet(bundleId: string) {
    const bundle = bundles.find((b) => b.id === bundleId);
    if (!bundle) return;
    const defaultPrice = bundle.items.reduce((s, bi) => {
      const product = products.find((p) => p.id === bi.productId);
      return s + (product?.price || 0);
    }, 0);
    setBundleSetPrice(String(defaultPrice));
    setActiveBundleId(bundleId);
    setShowBundleSheet(true);
  }

  function confirmBundleAdd() {
    const bundle = bundles.find((b) => b.id === activeBundleId);
    if (!bundle) return;

    const blocked = bundle.items
      .filter(bi => {
        const p = products.find(p => p.id === bi.productId);
        return !p || p.stock < bi.quantity;
      })
      .map(bi => bi.productName);
    if (blocked.length > 0) { toast.error(`نفذ المخزون: ${blocked.join("، ")}`); return; }

    const components = bundle.items.map((bi) => {
      const product = products.find((p) => p.id === bi.productId);
      return { productId: bi.productId, productName: product?.name || bi.productName, quantity: bi.quantity };
    });

    const bundleItem: CartItem = {
      productId: `bundle_${bundle.id}`,
      productName: bundle.name,
      description: bundle.description || bundle.items.map((bi) => {
        const product = products.find((p) => p.id === bi.productId);
        return product?.name || bi.productName;
      }).join(" + "),
      quantity: 1,
      unitPrice: parseFloat(bundleSetPrice) || 0,
      total: parseFloat(bundleSetPrice) || 0,
      isBundle: true,
      bundleComponents: components,
    };

    setCart((prev) => {
      const kept = prev.filter((c) => c.productId !== bundleItem.productId);
      return [...kept, bundleItem];
    });
    setShowBundleSheet(false);
    toast.success(`تم إضافة "${bundle.name}"`);
  }

  async function handleSave(status: InvoiceStatus) {
    if (!selectedClient) { toast.error("اختر عميل أولاً"); return; }
    if (cart.length === 0) { toast.error("أضف منتج واحد على الأقل"); return; }

    // Temporary items need a name
    const missingNames = cart.filter((li) => li.isTemporary && !li.productName.trim());
    if (missingNames.length > 0) { toast.error("يرجى إدخال اسم المنتج المؤقت"); return; }

    // In edit mode, add back old invoice's deductions to get effective available stock
    const effectiveStockMap = new Map<string, number>();
    if (isEdit && editingInvoice) {
      const oldItems = Array.isArray(editingInvoice.items) ? editingInvoice.items : [];
      (oldItems as any[]).forEach((item) => {
        if (item.isTemporary) return;
        if (item.isBundle && item.bundleComponents) {
          (item.bundleComponents as any[]).forEach((comp) => {
            const p = products.find((pr) => pr.id === comp.productId);
            if (!p) return;
            effectiveStockMap.set(comp.productId, (effectiveStockMap.get(comp.productId) ?? p.stock) + comp.quantity * item.quantity);
          });
        } else if (item.productId) {
          const p = products.find((pr) => pr.id === item.productId);
          if (!p) return;
          effectiveStockMap.set(item.productId, (effectiveStockMap.get(item.productId) ?? p.stock) + item.quantity);
        }
      });
    }

    const stockErrors: string[] = [];
    cart.forEach((item) => {
      if (item.isTemporary) return;
      if (item.isBundle && item.bundleComponents) {
        item.bundleComponents.forEach((comp) => {
          const p = products.find((pr) => pr.id === comp.productId);
          if (!p) return;
          const avail = effectiveStockMap.get(comp.productId) ?? p.stock;
          if (avail <= 0) stockErrors.push(p.name);
          else if (comp.quantity * item.quantity > avail) stockErrors.push(`${p.name} (متوفر: ${avail})`);
        });
      } else {
        const p = products.find((pr) => pr.id === item.productId);
        if (!p) return;
        const avail = effectiveStockMap.get(item.productId) ?? p.stock;
        if (avail <= 0) stockErrors.push(p.name);
        else if (item.quantity > avail) stockErrors.push(`${p.name} (${item.quantity}>${avail})`);
      }
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
          quantity: li.quantity, unitPrice: li.unitPrice,
          total: li.quantity * li.unitPrice * (1 - (li.discount || 0) / 100),
          ...(li.discount ? { discount: li.discount } : {}),
          ...(li.isBundle ? { isBundle: true, bundleComponents: li.bundleComponents } : {}),
          ...(li.isTemporary ? { isTemporary: true, ...(li.costPrice ? { costPrice: li.costPrice } : {}) } : {}),
        })),
        subtotal,
        discountType, discountValue,
        discountAmount,
        taxAmount,
        total,
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

  function getLineTotal(item: CartItem): number {
    return item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
  }

  return (
    <div className="min-h-screen bg-[var(--ground)] text-[14px] pb-64" dir="rtl">
      {/* ─── Sticky Header ─── */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--border-default)] bg-[var(--surface-1)] px-4 py-3 shadow-sm">
        <button
          onClick={() => router.push("/invoices")}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors active:scale-95"
          title="رجوع"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
        <h1 className="text-[17px] font-bold text-[var(--text-primary)]">{isEdit ? "تعديل الفاتورة" : "فاتورة جديدة"}</h1>
        <span className="mr-auto rounded-full bg-amber-100 border border-amber-200 px-3 py-0.5 text-[11px] font-bold text-amber-800">مسودة</span>
      </div>

      <div className="px-4 space-y-4 pt-4">
        {/* ─── 1. CLIENT SECTION ─── */}
        <div className="m3-card bg-[var(--surface-1)]">
          <label className="mb-2 block text-[12px] font-bold uppercase tracking-wide text-[var(--text-muted)]">العميل المستهدف</label>

          {selectedClient ? (
            <div className="flex items-center gap-3 rounded-xl border-2 border-indigo-100 bg-indigo-50/20 px-3 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-sm font-bold text-[var(--brand-primary)]">
                {selectedClient.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-[var(--text-primary)] truncate">{selectedClient.name}</p>
                {selectedClient.phone && <p dir="ltr" className="text-xs text-[var(--text-muted)] text-left font-mono mt-0.5">{selectedClient.phone}</p>}
              </div>
              <button
                onClick={() => { setSelectedClient(null); setClientSearch(""); }}
                className="rounded-xl p-1.5 text-[var(--text-muted)] hover:bg-white hover:text-red-500 transition-colors active:scale-95 shadow-sm"
                title="إزالة العميل"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div ref={clientRef} className="relative">
              <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="ابحث باسم العميل أو رقم الهاتف..."
                value={clientSearch}
                onChange={(e) => { setClientSearch(e.target.value); setShowClients(true); }}
                onFocus={() => setShowClients(true)}
                className="w-full rounded-xl border-[var(--border-default)] bg-[var(--surface-1)] pr-10 pl-3 py-2.5 text-[14px] text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)] transition-colors"
              />
              {showClients && (
                <div className="absolute top-full mt-2 left-0 right-0 z-20 rounded-xl border border-[var(--border-default)] bg-[var(--surface-1)] shadow-lg overflow-hidden max-h-56 overflow-y-auto p-1">
                  {filteredClients.length === 0 ? (
                    <p className="p-3 text-center text-[14px] text-[var(--text-muted)]">لا يوجد عملاء مطابقين</p>
                  ) : (
                    filteredClients.slice(0, 10).map((c) => (
                      <button
                        key={c.id}
                        onClick={() => selectClient(c)}
                        className="flex w-full items-center gap-2.5 rounded-lg p-2.5 text-right transition-colors hover:bg-[var(--surface-2)]"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[11px] font-bold text-[var(--brand-primary)]">
                          {c.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-bold text-[var(--text-primary)] truncate">{c.name}</p>
                          {c.phone && <p dir="ltr" className="text-xs text-[var(--text-muted)] text-left font-mono">{c.phone}</p>}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── 2. PRODUCTS SECTION ─── */}
        <div className="m3-card bg-[var(--surface-1)]">
          <div className="flex items-center justify-between mb-3">
            <label className="text-[12px] font-bold uppercase tracking-wide text-[var(--text-muted)]">قائمة المنتجات المضافة</label>
            {cart.length > 0 && (
              <span className="text-xs font-bold text-[var(--brand-primary)]">({cart.length} منتج)</span>
            )}
          </div>

          {/* Bundle quick-add */}
          {bundles.length > 0 && (
            <div className="mb-3">
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {bundles.map((bundle) => (
                  <button
                    key={bundle.id}
                    onClick={() => openBundleSheet(bundle.id)}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl border border-dashed border-purple-300 bg-purple-50/30 px-3 py-2 text-[12px] font-bold text-purple-700 transition-colors active:bg-purple-50"
                  >
                    🎁 {bundle.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cart items */}
          {cart.length > 0 && (
            <div className="space-y-3 mb-4">
              {cart.map((item) => (
                <div
                  key={item.productId}
                  className={`rounded-xl border p-3.5 space-y-3 ${item.isTemporary ? "border-amber-200 bg-amber-50/20" : item.isBundle ? "border-indigo-200 bg-indigo-50/10" : "border-[var(--border-default)] bg-[var(--surface-1)]"}`}
                >
                  {/* Item header */}
                  <div className="flex items-start gap-2 justify-between">
                    <div className="min-w-0 flex-1">
                      {item.isTemporary ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] rounded-md font-bold shrink-0 px-2 py-0.5">خارجي</span>
                            <input
                              type="text"
                              placeholder="اسم المنتج المؤقت..."
                              value={item.productName}
                              onChange={(e) => updateCartItem(item.productId, { productName: e.target.value })}
                              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-1)] px-2 py-1 text-[14px] font-bold text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] text-[var(--text-muted)] shrink-0">التكلفة:</span>
                            <input
                              type="text" inputMode="decimal" dir="ltr"
                              placeholder="0.00"
                              value={item._costInput !== undefined ? item._costInput : (item.costPrice || "")}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v === "" || /^\d*\.?\d*$/.test(v)) {
                                  updateCartItem(item.productId, { costPrice: parseFloat(v) || 0, _costInput: v });
                                }
                              }}
                              onBlur={() => updateCartItem(item.productId, { _costInput: undefined })}
                              className="w-24 rounded-lg border border-[var(--border-default)] bg-[var(--surface-1)] px-2 py-1 text-center text-xs font-mono text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="text-[14px] font-bold text-[var(--text-primary)] truncate">{item.productName}</p>
                          {item.isBundle && (
                            <span className="shrink-0 rounded-full bg-[var(--brand-primary)] px-2 py-0.5 text-[9px] font-bold text-white">طقم</span>
                          )}
                        </div>
                      )}
                      {item.isBundle && item.bundleComponents && (
                        <p className="text-[11px] text-[var(--text-muted)] mt-1 truncate">
                          {item.bundleComponents.map((c) => `${c.productName} x${c.quantity}`).join(" + ")}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="shrink-0 rounded-xl p-2 text-[var(--text-muted)] hover:bg-red-50 hover:text-red-500 transition-colors active:scale-95"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>

                  {/* Quantity & Price Controls */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border-default)]">
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">الكمية</label>
                      <div className="flex items-center rounded-lg border border-[var(--border-default)] bg-[var(--surface-2)]">
                        <button
                          onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                          className="px-2 py-1.5 text-[var(--text-muted)]"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <input
                          type="number" min={1}
                          value={item.quantity}
                          onChange={(e) => updateCartQuantity(item.productId, parseInt(e.target.value) || 1)}
                          className="w-full min-w-0 bg-transparent text-center text-sm font-bold font-mono text-[var(--text-primary)] outline-none"
                          dir="ltr"
                        />
                        <button
                          onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                          className="px-2 py-1.5 text-[var(--text-muted)]"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">سعر البيع</label>
                      <input
                        type="text" inputMode="decimal" dir="ltr"
                        value={item._priceInput ?? String(item.unitPrice)}
                        onChange={(e) => updateCartPrice(item.productId, e.target.value)}
                        className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-2)] px-2 py-1.5 text-center text-sm font-bold font-mono text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">الإجمالي</label>
                      <div className="flex h-9 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-sm font-bold font-mono text-[var(--brand-primary)]">
                        {formatCurrency(getLineTotal(item))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add product action block */}
          <div ref={productSearchRef} className="relative space-y-2">
            {showProductSearch ? (
              <>
                <div className="relative">
                  <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    placeholder="ابحث باسم المنتج أو الفئة..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    autoFocus
                    className="w-full rounded-xl border border-[var(--brand-primary)] bg-[var(--surface-1)] pr-10 pl-3 py-2.5 text-[14px] text-[var(--text-primary)] outline-none"
                  />
                </div>
                {/* Dropdown list */}
                <div className="absolute top-full mt-2 left-0 right-0 z-20 rounded-xl border border-[var(--border-default)] bg-[var(--surface-1)] shadow-xl overflow-hidden max-h-60 overflow-y-auto p-1">
                  {filteredProducts.length === 0 ? (
                    <p className="p-3 text-center text-[14px] text-[var(--text-muted)]">لا يوجد منتجات مطابقة</p>
                  ) : (
                    filteredProducts.map((p) => {
                      const outOfStock = p.stock <= 0;
                      const inCart = cart.some((c) => c.productId === p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => addProductToCart(p)}
                          disabled={outOfStock}
                          className={`flex w-full items-center gap-3 rounded-lg p-2.5 text-right transition-colors ${outOfStock ? "opacity-45 cursor-not-allowed" : "hover:bg-[var(--surface-2)]"} ${inCart ? "bg-indigo-50/50" : ""}`}
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--text-muted)]">
                            <Package className="h-4.5 w-4.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-bold text-[var(--text-primary)] truncate">{p.name}</p>
                            <p className={`text-[12px] mt-0.5 ${outOfStock ? "text-red-500 font-bold" : "text-[var(--text-muted)]"}`}>
                              {outOfStock ? "نفذ من المستودع" : `${p.category} · متوفر: ${p.stock}`}
                            </p>
                          </div>
                          {inCart && <Check className="h-4.5 w-4.5 text-[var(--brand-primary)] shrink-0" />}
                          <span className={`shrink-0 font-bold font-mono text-[14px] ${outOfStock ? "text-[var(--text-muted)]" : "text-[var(--brand-primary)]"}`}>
                            {formatCurrency(p.price)}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <button
                onClick={() => setShowProductSearch(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--brand-primary)] bg-[var(--brand-soft)] py-2.5 text-[14px] font-bold text-[var(--brand-primary)] transition-colors active:scale-95"
              >
                <Plus className="h-4 w-4" />
                إضافة منتج من المخزون
              </button>
            )}
          </div>

          {/* Quick ink sets */}
          {inkSets.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 mt-3 -mx-1 px-1">
              {inkSets.map((set) => (
                <button
                  key={set.baseName}
                  onClick={() => openInkSetSheet(set)}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl border border-dashed border-cyan-300 bg-cyan-50/30 px-3 py-2 text-[12px] font-bold text-cyan-700 transition-colors active:bg-cyan-50"
                >
                  <Droplets className="h-3.5 w-3.5" />
                  {set.displayName}
                </button>
              ))}
            </div>
          )}

          {/* Add temporary item button */}
          <button
            onClick={addTemporaryProduct}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-amber-300 bg-amber-50/20 py-2.5 text-[14px] font-bold text-amber-700 transition-colors active:scale-95 mt-3"
          >
            <FileText className="h-4 w-4" />
            إضافة منتج خارجي / مؤقت
          </button>
        </div>

        {/* ─── 3. DISCOUNT SECTION ─── */}
        <div className="m3-card bg-[var(--surface-1)]">
          <label className="mb-2 block text-[12px] font-bold uppercase tracking-wide text-[var(--text-muted)]">الخصم الإضافي للفاتورة</label>
          <div className="flex gap-2 mb-1">
            <div className="flex gap-0.5 rounded-xl border border-[var(--border-default)] p-0.5 bg-[var(--surface-2)]">
              {(["percentage", "fixed"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setDiscountType(t)}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${discountType === t ? "bg-[var(--brand-primary)] text-white" : "text-[var(--text-muted)]"}`}
                >
                  {t === "percentage" ? "%" : settings.currencySymbol}
                </button>
              ))}
            </div>
            <input
              type="text" inputMode="decimal" dir="ltr"
              value={discountValue || ""}
              placeholder="0"
              onChange={(e) => { const v = e.target.value; if (v === "" || /^\d*\.?\d*$/.test(v)) setDiscountValue(parseFloat(v) || 0); }}
              className="flex-1 rounded-xl border border-[var(--border-default)] bg-[var(--surface-2)] px-3 py-2 text-center text-[14px] font-bold font-mono text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
            />
          </div>
          {discountAmount > 0 && (
            <p className="text-xs font-mono font-bold text-red-500 text-left">خصم بقيمة: -{formatCurrency(discountAmount)}</p>
          )}
        </div>

        {/* ─── 4. TOTALS CARD ─── */}
        {cart.length > 0 && (
          <div className="m3-card bg-[var(--surface-1)] space-y-2.5">
            <div className="flex justify-between text-[14px] text-[var(--text-secondary)]">
              <span>المجموع الفرعي</span>
              <span className="font-bold font-mono">{formatCurrency(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-[14px] text-red-500">
                <span>خصم إجمالي الفاتورة</span>
                <span className="font-bold font-mono">− {formatCurrency(discountAmount)}</span>
              </div>
            )}
            {settings.taxEnabled && taxAmount > 0 && (
              <div className="flex justify-between text-[14px] text-[var(--text-secondary)]">
                <span>الضريبة ({settings.taxRate}%)</span>
                <span className="font-bold font-mono">+{formatCurrency(taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-[var(--border-default)] pt-2.5">
              <span className="text-base font-extrabold text-[var(--text-primary)]">الإجمالي النهائي</span>
              <span className="text-[20px] font-black font-mono text-[var(--brand-primary)]">{formatCurrency(total)}</span>
            </div>
          </div>
        )}

        {/* ─── 5. NOTES ─── */}
        <div className="m3-card bg-[var(--surface-1)]">
          <label className="mb-2 block text-[12px] font-bold uppercase tracking-wide text-[var(--text-muted)]">الملاحظات العامة</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="مثال: شروط الضمان، معلومات التوصيل..."
            rows={2}
            className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-2)] p-3 text-[14px] text-[var(--text-primary)] outline-none resize-none focus:border-[var(--brand-primary)]"
          />
        </div>
      </div>

      {/* ─── FIXED BOTTOM: Save Buttons ─── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--border-default)] bg-[var(--surface-1)] px-4 pt-3.5 shadow-lg"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 8px) + 12px)" }}
        dir="rtl"
      >
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => handleSave("مدفوعة")}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 text-[14px] font-bold text-white transition-colors active:scale-98 disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            حفظ مدفوعة
          </button>
          <button
            onClick={() => handleSave("غير مدفوعة")}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 py-3 text-[14px] font-bold text-white transition-colors active:scale-98 disabled:opacity-50"
          >
            <AlertTriangle className="h-4 w-4" />
            غير مدفوعة
          </button>
          <button
            onClick={() => handleSave("مدفوعة جزئياً")}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] py-3 text-[14px] font-bold text-white transition-colors active:scale-98 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            حفظ معلق
          </button>
        </div>
        <button
          onClick={() => handleSave("مسودة")}
          disabled={saving}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-2)] py-2.5 text-[14px] font-bold text-[var(--text-muted)] transition-colors active:bg-[var(--surface-3)] disabled:opacity-50"
        >
          <FileText className="h-4 w-4" />
          حفظ كمسودة
        </button>
      </div>

      {/* ─── BUNDLE SHEET — same style as ink set ─── */}
      <AnimatePresence>
        {showBundleSheet && (() => {
          const bundle = bundles.find((b) => b.id === activeBundleId);
          if (!bundle) return null;
          const sortedItems = [...bundle.items]
            .map((bi) => {
              const product = products.find((p) => p.id === bi.productId);
              const ck = getColorKey(product?.name || bi.productName);
              return { ...bi, product, colorKey: ck };
            })
            .sort((a, b) => colorOrder.indexOf(a.colorKey) - colorOrder.indexOf(b.colorKey));

          const defaultTotal = bundle.items.reduce((s, bi) => {
            const product = products.find((p) => p.id === bi.productId);
            return s + (product?.price || 0);
          }, 0);

          return (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
              onClick={() => setShowBundleSheet(false)}
            >
              <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg rounded-t-[24px] bg-[var(--surface-1)] p-5 pb-8 border-t border-[var(--border-default)]" dir="rtl"
              >
                <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[var(--surface-3)]" />
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-1 flex items-center gap-2">
                  🎁 {bundle.name}
                </h3>
                <p className="text-xs text-[var(--text-muted)] mb-4">
                  {bundle.description || `مجموعة (${bundle.items.length} منتجات)`}
                </p>

                <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                  {sortedItems.map((bi) => {
                    const cfg = colorConfig[bi.colorKey] || colorConfig.BK;
                    return (
                      <div key={bi.productId} className="flex items-center gap-2.5 rounded-xl bg-[var(--surface-2)] px-3 py-2.5">
                        <div className="h-4 w-4 rounded-full shadow-sm" style={{ backgroundColor: cfg.dot }} />
                        <span className="text-[14px] font-semibold flex-1 truncate">{bi.product?.name || bi.productName}</span>
                        <span className={`text-xs font-bold ${bi.product && bi.product.stock <= 0 ? "text-red-500 font-bold" : "text-[var(--text-muted)]"}`}>
                          {bi.product ? (bi.product.stock <= 0 ? "نفذ!" : `المخزون: ${bi.product.stock}`) : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">سعر المجموعة الإجمالي ($)</label>
                <input
                  type="text" inputMode="decimal" dir="ltr"
                  value={bundleSetPrice}
                  onChange={(e) => { const v = e.target.value; if (v === "" || /^\d*\.?\d*$/.test(v)) setBundleSetPrice(v); }}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-2)] px-3 py-3 text-center text-lg font-bold font-mono text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)] mb-1"
                />
                <p className="text-[11px] text-[var(--text-muted)] text-center mb-4">
                  الافتراضي (مجموع السعر الفردي) = {formatCurrency(defaultTotal)}
                </p>

                <button
                  onClick={confirmBundleAdd}
                  className="w-full rounded-xl bg-[var(--brand-primary)] py-3 text-[14px] font-bold text-white active:bg-[var(--brand-hover)] transition-colors flex items-center justify-center gap-2 shadow-md"
                >
                  إضافة المجموعة للفاتورة
                </button>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Ink Set Sheet */}
      <AnimatePresence>
        {inkSetSheetOpen && activeInkSet && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
            onClick={() => setInkSetSheetOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-t-[24px] bg-[var(--surface-1)] p-5 pb-8 border-t border-[var(--border-default)]" dir="rtl"
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[var(--surface-3)]" />
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-1 flex items-center gap-2">
                <Droplets className="h-5 w-5 text-cyan-500" />
                {activeInkSet.displayName}
              </h3>
              <p className="text-xs text-[var(--text-muted)] mb-4">طقم أحبار ({activeInkSet.items.length} ألوان)</p>

              <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                {activeInkSet.items.map(p => {
                  const ck = getColorKey(p.name);
                  const cfg = colorConfig[ck] || colorConfig.BK;
                  return (
                    <div key={p.id} className="flex items-center gap-2.5 rounded-xl bg-[var(--surface-2)] px-3 py-2.5">
                      <div className="h-4 w-4 rounded-full shadow-sm" style={{ backgroundColor: cfg.dot }} />
                      <span className="text-[14px] font-semibold flex-1 truncate">{p.name}</span>
                      <span className={`text-xs font-bold ${p.stock <= 0 ? "text-red-500 font-bold" : "text-[var(--text-muted)]"}`}>
                        {p.stock <= 0 ? "نفذ!" : `المخزون: ${p.stock}`}
                      </span>
                    </div>
                  );
                })}
              </div>

              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">سعر طقم الأحبار ($)</label>
              <input
                type="text" inputMode="decimal" dir="ltr"
                value={inkSetPrice}
                onChange={(e) => { const v = e.target.value; if (v === "" || /^\d*\.?\d*$/.test(v)) setInkSetPrice(v); }}
                placeholder="0.00"
                className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-2)] px-3 py-3 text-center text-lg font-bold font-mono text-[var(--text-primary)] outline-none focus:border-cyan-500 mb-1"
              />
              <p className="text-[11px] text-[var(--text-muted)] text-center mb-4">
                الافتراضي (مجموع السعر الفردي) = {formatCurrency(activeInkSet.items.reduce((s, p) => s + p.price, 0))}
              </p>

              <button
                onClick={confirmInkSetAdd}
                className="w-full rounded-xl bg-cyan-600 py-3 text-[14px] font-bold text-white active:bg-cyan-700 transition-colors flex items-center justify-center gap-2 shadow-md"
              >
                <Droplets className="h-4 w-4" />
                إضافة الطقم للفاتورة
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
