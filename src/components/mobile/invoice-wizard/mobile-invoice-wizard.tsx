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
    <div className="min-h-screen bg-[#f8fafc]" dir="rtl">

      {/* ─── Sticky Header ─── */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-[#e2e8f0] bg-white/80 backdrop-blur-sm px-4 py-3">
        <button
          onClick={() => router.push("/invoices")}
          className="flex h-9 w-9 items-center justify-center rounded-[10px] text-[#94a3b8] hover:bg-[#f1f5f9] transition-colors"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-[#1e293b]">{isEdit ? "تعديل الفاتورة" : "فاتورة جديدة"}</h1>
        <span className="mr-auto rounded-full bg-[#fef3c7] px-2.5 py-0.5 text-[11px] font-bold text-[#92400e]">مسودة</span>
      </div>

      <div className="px-4 pb-48 space-y-4 pt-4">

        {/* ─── 1. CLIENT SECTION ─── */}
        <div className="rounded-[14px] border border-[#e2e8f0] bg-white p-4">
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-[#94a3b8]">العميل</label>

          {selectedClient ? (
            <div className="flex items-center gap-3 rounded-[10px] border-[1.5px] border-[#2563eb]/30 bg-[#2563eb]/5 px-3 py-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2563eb]/10 text-sm font-bold text-[#2563eb]">
                {selectedClient.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#1e293b] truncate">{selectedClient.name}</p>
                {selectedClient.phone && <p dir="ltr" className="text-xs text-[#94a3b8] text-left">{selectedClient.phone}</p>}
              </div>
              <button
                onClick={() => { setSelectedClient(null); setClientSearch(""); }}
                className="rounded-[8px] p-1.5 text-[#94a3b8] hover:text-red-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div ref={clientRef} className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
              <input
                type="text"
                placeholder="ابحث عن عميل..."
                value={clientSearch}
                onChange={(e) => { setClientSearch(e.target.value); setShowClients(true); }}
                onFocus={() => setShowClients(true)}
                className="w-full rounded-[10px] border-[1.5px] border-[#e2e8f0] bg-white pr-9 pl-3 py-2.5 text-sm text-[#1e293b] outline-none focus:border-[#2563eb] transition-colors"
              />
              {showClients && (
                <div className="absolute top-full mt-1 left-0 right-0 z-20 rounded-[10px] border border-[#e2e8f0] bg-white shadow-lg overflow-hidden">
                  <div className="max-h-56 overflow-y-auto p-1">
                    {filteredClients.length === 0 ? (
                      <p className="p-3 text-center text-sm text-[#94a3b8]">لا نتائج</p>
                    ) : (
                      filteredClients.slice(0, 10).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => selectClient(c)}
                          className="flex w-full items-center gap-2.5 rounded-[8px] p-2.5 text-right transition-colors hover:bg-[#f1f5f9]"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2563eb]/10 text-[10px] font-bold text-[#2563eb]">
                            {c.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#1e293b] truncate">{c.name}</p>
                            {c.phone && <p dir="ltr" className="text-xs text-[#94a3b8] text-left">{c.phone}</p>}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── 2. PRODUCTS SECTION ─── */}
        <div className="rounded-[14px] border border-[#e2e8f0] bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-[11px] font-bold uppercase tracking-wide text-[#94a3b8]">المنتجات</label>
            {cart.length > 0 && (
              <span className="text-xs font-bold text-[#2563eb]">{cart.length} منتج</span>
            )}
          </div>

          {/* Bundle quick-add — horizontal scroll */}
          {bundles.length > 0 && (
            <div className="mb-3">
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {bundles.map((bundle) => (
                  <button
                    key={bundle.id}
                    onClick={() => openBundleSheet(bundle.id)}
                    className="flex shrink-0 items-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed border-[#7c3aed]/40 bg-[#7c3aed]/5 px-3 py-2 text-xs font-bold text-[#7c3aed] transition-colors active:bg-[#7c3aed]/10"
                  >
                    <Droplets className="h-3.5 w-3.5" />
                    {bundle.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cart items — stacked cards */}
          {cart.length > 0 && (
            <div className="space-y-2 mb-3">
              {cart.map((item) => (
                <div
                  key={item.productId}
                  className={`rounded-[10px] border-[1.5px] p-3 ${item.isTemporary ? "border-[#f59e0b]/30 bg-[#fefce8]" : item.isBundle ? "border-[#7c3aed]/30 bg-[#7c3aed]/5" : "border-[#e2e8f0] bg-white"}`}
                >
                  {/* Row 1: name + badges + delete */}
                  <div className="flex items-start gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      {item.isTemporary ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              placeholder="اسم المنتج المؤقت..."
                              value={item.productName}
                              onChange={(e) => updateCartItem(item.productId, { productName: e.target.value })}
                              className="flex-1 min-w-0 rounded-[8px] border-[1.5px] border-[#e2e8f0] bg-white px-2 py-1 text-sm font-medium text-[#1e293b] outline-none focus:border-[#2563eb]"
                            />
                            <span className="shrink-0 rounded-full bg-[#f59e0b] px-2 py-0.5 text-[10px] font-bold text-white">مؤقت</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-[#94a3b8] shrink-0">التكلفة</span>
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
                              className="w-20 rounded-[8px] border-[1.5px] border-[#e2e8f0] bg-white px-2 py-1 text-center text-sm font-mono text-[#1e293b] outline-none focus:border-[#2563eb]"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-[#1e293b] truncate">{item.productName}</p>
                          {item.isBundle && (
                            <span className="shrink-0 rounded-full bg-[#7c3aed] px-2 py-0.5 text-[10px] font-bold text-white">باقة</span>
                          )}
                        </div>
                      )}
                      {item.isBundle && item.bundleComponents && (
                        <p className="text-[11px] text-[#94a3b8] mt-0.5 truncate">
                          {item.bundleComponents.map((c) => `${c.productName} x${c.quantity}`).join(" . ")}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="shrink-0 rounded-[8px] p-1.5 text-[#94a3b8] hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Row 2: qty, price, line total */}
                  <div className="grid grid-cols-3 gap-2">
                    {/* Quantity */}
                    <div>
                      <label className="block text-[10px] font-bold text-[#94a3b8] mb-0.5">الكمية</label>
                      <div className="flex items-center rounded-[8px] border-[1.5px] border-[#e2e8f0] bg-[#f8fafc]">
                        <button
                          onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                          className="px-1.5 py-1 text-[#94a3b8] active:text-[#1e293b]"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateCartQuantity(item.productId, parseInt(e.target.value) || 1)}
                          className="w-full min-w-0 bg-transparent text-center text-sm font-bold text-[#1e293b] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          dir="ltr"
                        />
                        <button
                          onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                          className="px-1.5 py-1 text-[#94a3b8] active:text-[#1e293b]"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* Price */}
                    <div>
                      <label className="block text-[10px] font-bold text-[#94a3b8] mb-0.5">السعر</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        dir="ltr"
                        value={item._priceInput ?? String(item.unitPrice)}
                        onChange={(e) => updateCartPrice(item.productId, e.target.value)}
                        className="w-full rounded-[8px] border-[1.5px] border-[#e2e8f0] bg-[#f8fafc] px-2 py-1 text-center text-sm font-bold text-[#1e293b] outline-none focus:border-[#2563eb] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </div>

                    {/* Line total */}
                    <div>
                      <label className="block text-[10px] font-bold text-[#94a3b8] mb-0.5">الإجمالي</label>
                      <div className="flex h-[30px] items-center justify-center rounded-[8px] bg-[#2563eb]/5 text-sm font-bold font-mono text-[#2563eb]">
                        {formatCurrency(getLineTotal(item))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add product — inline search */}
          <div ref={productSearchRef} className="relative mb-2">
            {showProductSearch ? (
              <>
                <Search className="absolute right-3 top-[11px] h-4 w-4 text-[#94a3b8]" />
                <input
                  type="text"
                  placeholder="ابحث عن منتج..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  autoFocus
                  className="w-full rounded-[10px] border-[1.5px] border-[#2563eb] bg-white pr-9 pl-3 py-2.5 text-sm text-[#1e293b] outline-none"
                />
                {/* Dropdown */}
                <div className="absolute top-full mt-1 left-0 right-0 z-20 rounded-[10px] border border-[#e2e8f0] bg-white shadow-lg overflow-hidden">
                  <div className="max-h-64 overflow-y-auto p-1">
                    {filteredProducts.length === 0 ? (
                      <p className="p-3 text-center text-sm text-[#94a3b8]">لا توجد منتجات</p>
                    ) : (
                      filteredProducts.map((p) => {
                        const outOfStock = p.stock <= 0;
                        const inCart = cart.some((c) => c.productId === p.id);
                        return (
                          <button
                            key={p.id}
                            onClick={() => addProductToCart(p)}
                            disabled={outOfStock}
                            className={`flex w-full items-center gap-2.5 rounded-[8px] p-2.5 text-right transition-colors ${outOfStock ? "opacity-40 cursor-not-allowed" : "hover:bg-[#f1f5f9]"} ${inCart ? "bg-[#2563eb]/5" : ""}`}
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#f1f5f9] text-[#94a3b8]">
                              <Package className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#1e293b] truncate">{p.name}</p>
                              <p className={`text-[11px] ${outOfStock ? "text-red-500" : "text-[#94a3b8]"}`}>
                                {outOfStock ? "نفذ المخزون" : `${p.category} · المخزون: ${p.stock}`}
                              </p>
                            </div>
                            {inCart && <Check className="h-4 w-4 shrink-0 text-[#2563eb]" />}
                            <span className={`shrink-0 text-sm font-bold font-mono ${outOfStock ? "text-[#94a3b8]" : "text-[#2563eb]"}`}>
                              {formatCurrency(p.price)}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            ) : (
              <button
                onClick={() => setShowProductSearch(true)}
                className="flex w-full items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-dashed border-[#2563eb]/40 bg-[#2563eb]/5 py-2.5 text-sm font-bold text-[#2563eb] transition-colors active:bg-[#2563eb]/10"
              >
                <Plus className="h-4 w-4" />
                إضافة منتج
              </button>
            )}
          </div>

          {/* Ink set buttons */}
          {inkSets.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {inkSets.map((set) => (
                <button
                  key={set.baseName}
                  onClick={() => openInkSetSheet(set)}
                  className="flex shrink-0 items-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed border-[#06b6d4]/40 bg-[#06b6d4]/5 px-3 py-2 text-xs font-bold text-[#06b6d4] transition-colors active:bg-[#06b6d4]/10"
                >
                  <Droplets className="h-3.5 w-3.5" />
                  {set.displayName}
                </button>
              ))}
            </div>
          )}

          {/* Temporary product button */}
          <button
            onClick={addTemporaryProduct}
            className="flex w-full items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-dashed border-[#f59e0b]/40 bg-[#f59e0b]/5 py-2.5 text-sm font-bold text-[#f59e0b] transition-colors active:bg-[#f59e0b]/10"
          >
            <FileText className="h-4 w-4" />
            منتج مؤقت
          </button>
        </div>

        {/* ─── 3. DISCOUNT SECTION ─── */}
        <div className="rounded-[14px] border border-[#e2e8f0] bg-white p-4">
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-[#94a3b8]">الخصم</label>
          <div className="flex gap-2 mb-2">
            <div className="flex gap-1 rounded-[10px] border-[1.5px] border-[#e2e8f0] p-0.5">
              {(["percentage", "fixed"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setDiscountType(t)}
                  className={`rounded-[8px] px-3 py-1.5 text-xs font-bold transition-colors ${discountType === t ? "bg-[#2563eb] text-white" : "text-[#94a3b8]"}`}
                >
                  {t === "percentage" ? "%" : "$"}
                </button>
              ))}
            </div>
            <input
              type="text"
              inputMode="decimal"
              dir="ltr"
              value={discountValue || ""}
              placeholder="0"
              onChange={(e) => { const v = e.target.value; if (v === "" || /^\d*\.?\d*$/.test(v)) setDiscountValue(parseFloat(v) || 0); }}
              className="flex-1 rounded-[10px] border-[1.5px] border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-center text-sm font-bold font-mono text-[#1e293b] outline-none focus:border-[#2563eb]"
            />
          </div>
          {discountAmount > 0 && (
            <p className="text-xs font-mono font-bold text-red-500 text-left">-{formatCurrency(discountAmount)}</p>
          )}
        </div>

        {/* ─── 4. TOTALS CARD ─── */}
        {cart.length > 0 && (
          <div className="rounded-[14px] border border-[#e2e8f0] bg-white p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-[#94a3b8]">المجموع</span>
              <span className="text-sm font-bold font-mono text-[#1e293b]">{formatCurrency(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-[#94a3b8]">الخصم</span>
                <span className="text-sm font-bold font-mono text-red-500">-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            {taxAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-[#94a3b8]">الضريبة ({settings.taxRate}%)</span>
                <span className="text-sm font-bold font-mono text-[#1e293b]">+{formatCurrency(taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-[#e2e8f0] pt-2">
              <span className="text-base font-bold text-[#1e293b]">الإجمالي</span>
              <span className="text-xl font-bold font-mono text-[#2563eb]">{formatCurrency(total)}</span>
            </div>
          </div>
        )}

        {/* ─── 5. NOTES ─── */}
        <div className="rounded-[14px] border border-[#e2e8f0] bg-white p-4">
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-[#94a3b8]">ملاحظات</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ملاحظات اختيارية..."
            rows={2}
            className="w-full rounded-[10px] border-[1.5px] border-[#e2e8f0] bg-[#f8fafc] p-3 text-sm text-[#1e293b] outline-none resize-none focus:border-[#2563eb]"
          />
        </div>
      </div>

      {/* ─── FIXED BOTTOM: Save Buttons ─── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#e2e8f0] bg-white/95 backdrop-blur-sm px-4 pt-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 8px) + 12px)" }}
        dir="rtl"
      >
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => handleSave("مدفوعة")}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-emerald-500 py-2.5 text-sm font-bold text-white transition-colors active:bg-emerald-600 disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            مدفوعة
          </button>
          <button
            onClick={() => handleSave("غير مدفوعة")}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-amber-500 py-2.5 text-sm font-bold text-white transition-colors active:bg-amber-600 disabled:opacity-50"
          >
            <AlertTriangle className="h-4 w-4" />
            غير مدفوعة
          </button>
          <button
            onClick={() => handleSave("مدفوعة جزئياً")}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-[#2563eb] py-2.5 text-sm font-bold text-white transition-colors active:bg-[#1d4ed8] disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            حفظ
          </button>
        </div>
        <button
          onClick={() => handleSave("مسودة")}
          disabled={saving}
          className="flex w-full items-center justify-center gap-1.5 rounded-[10px] border-[1.5px] border-[#e2e8f0] bg-white py-2 text-sm font-bold text-[#94a3b8] transition-colors active:bg-[#f1f5f9] disabled:opacity-50"
        >
          <FileText className="h-4 w-4" />
          مسودة
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
                className="w-full max-w-lg rounded-t-[20px] bg-white p-5 pb-8" dir="rtl"
              >
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#e2e8f0]" />
                <h3 className="text-base font-bold text-[#1e293b] mb-1 flex items-center gap-2">
                  <Droplets className="h-5 w-5 text-[#7c3aed]" />
                  {bundle.name}
                </h3>
                <p className="text-xs text-[#94a3b8] mb-3">
                  {bundle.description || `مجموعة (${bundle.items.length} منتجات)`}
                </p>

                <div className="space-y-1.5 mb-4">
                  {sortedItems.map((bi) => {
                    const cfg = colorConfig[bi.colorKey] || colorConfig.BK;
                    return (
                      <div key={bi.productId} className="flex items-center gap-2.5 rounded-xl bg-[#f8fafc] px-3 py-2">
                        <div className="h-3.5 w-3.5 rounded-full shadow-sm" style={{ backgroundColor: cfg.dot }} />
                        <span className="text-sm font-medium flex-1 truncate">{bi.product?.name || bi.productName}</span>
                        <span className={`text-[10px] ${bi.product && bi.product.stock <= 0 ? "text-red-500 font-bold" : "text-[#94a3b8]"}`}>
                          {bi.product ? (bi.product.stock <= 0 ? "نفذ!" : `${bi.product.stock}`) : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#94a3b8]">سعر المجموعة ($)</label>
                <input
                  type="text" inputMode="decimal" dir="ltr"
                  value={bundleSetPrice}
                  onChange={(e) => { const v = e.target.value; if (v === "" || /^\d*\.?\d*$/.test(v)) setBundleSetPrice(v); }}
                  placeholder="0.00"
                  className="w-full rounded-[10px] border-[1.5px] border-[#e2e8f0] bg-[#f8fafc] px-3 py-2.5 text-center text-lg font-bold font-mono text-[#1e293b] outline-none focus:border-[#7c3aed] mb-1"
                />
                <p className="text-[11px] text-[#94a3b8] text-center mb-4">
                  الافتراضي = {formatCurrency(defaultTotal)}
                </p>

                <button
                  onClick={confirmBundleAdd}
                  className="w-full rounded-[12px] bg-[#7c3aed] py-3 text-sm font-bold text-white active:bg-[#6d28d9] transition-colors flex items-center justify-center gap-2"
                >
                  <Droplets className="h-4 w-4" />
                  إضافة المجموعة
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
              className="w-full max-w-lg rounded-t-[20px] bg-white p-5 pb-8" dir="rtl"
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#e2e8f0]" />
              <h3 className="text-base font-bold text-[#1e293b] mb-1 flex items-center gap-2">
                <Droplets className="h-5 w-5 text-[#06b6d4]" />
                {activeInkSet.displayName}
              </h3>
              <p className="text-xs text-[#94a3b8] mb-3">طقم أحبار ({activeInkSet.items.length} ألوان)</p>

              <div className="space-y-1.5 mb-4">
                {activeInkSet.items.map(p => {
                  const ck = getColorKey(p.name);
                  const cfg = colorConfig[ck] || colorConfig.BK;
                  return (
                    <div key={p.id} className="flex items-center gap-2.5 rounded-xl bg-[#f8fafc] px-3 py-2">
                      <div className="h-3.5 w-3.5 rounded-full shadow-sm" style={{ backgroundColor: cfg.dot }} />
                      <span className="text-sm font-medium flex-1 truncate">{p.name}</span>
                      <span className={`text-[10px] ${p.stock <= 0 ? "text-red-500 font-bold" : "text-[#94a3b8]"}`}>
                        {p.stock <= 0 ? "نفذ!" : `${p.stock}`}
                      </span>
                    </div>
                  );
                })}
              </div>

              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#94a3b8]">سعر الطقم ($)</label>
              <input
                type="text" inputMode="decimal" dir="ltr"
                value={inkSetPrice}
                onChange={(e) => { const v = e.target.value; if (v === "" || /^\d*\.?\d*$/.test(v)) setInkSetPrice(v); }}
                placeholder="0.00"
                className="w-full rounded-[10px] border-[1.5px] border-[#e2e8f0] bg-[#f8fafc] px-3 py-2.5 text-center text-lg font-bold font-mono text-[#1e293b] outline-none focus:border-[#06b6d4] mb-1"
              />
              <p className="text-[11px] text-[#94a3b8] text-center mb-4">
                الافتراضي = {formatCurrency(activeInkSet.items.reduce((s, p) => s + p.price, 0))}
              </p>

              <button
                onClick={confirmInkSetAdd}
                className="w-full rounded-[12px] bg-[#06b6d4] py-3 text-sm font-bold text-white active:bg-[#0891b2] transition-colors flex items-center justify-center gap-2"
              >
                <Droplets className="h-4 w-4" />
                إضافة الطقم
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
