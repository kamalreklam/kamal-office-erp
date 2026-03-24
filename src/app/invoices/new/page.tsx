"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowRight, Plus, Trash2, Search, User, Package, Calculator,
  Save, Printer, FileText, Layers, ChevronDown, Droplets,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { type InvoiceStatus, formatCurrency } from "@/lib/data";
import { toast } from "sonner";

interface LineItem {
  id: string;
  productId: string;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const { clients, products, bundles, invoices, addInvoice, updateInvoice, getProductImage, settings, nextInvoiceNumber } = useStore();

  const editingInvoice = editId ? invoices.find((inv) => inv.id === editId) : null;
  const isEdit = !!editingInvoice;

  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<(typeof clients)[0] | null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const clientRef = useRef<HTMLDivElement>(null);

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: "li1", productId: "", productName: "", description: "", quantity: 1, unitPrice: 0, total: 0 },
  ]);

  const [activeProductRow, setActiveProductRow] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState<Record<string, string>>({});

  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState(0);
  const [notes, setNotes] = useState("");
  const [showExtras, setShowExtras] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  // Pre-fill form when editing
  useEffect(() => {
    if (editingInvoice && !prefilled) {
      const client = clients.find((c) => c.id === editingInvoice.clientId);
      if (client) {
        setSelectedClient(client);
        setClientSearch(client.name);
      }
      const items: LineItem[] = editingInvoice.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
      }));
      setLineItems(items.length > 0 ? items : [{ id: "li1", productId: "", productName: "", description: "", quantity: 1, unitPrice: 0, total: 0 }]);
      const searches: Record<string, string> = {};
      items.forEach((item) => { searches[item.id] = item.productName; });
      setProductSearch(searches);
      setDiscountType(editingInvoice.discountType);
      setDiscountValue(editingInvoice.discountValue);
      setNotes(editingInvoice.notes);
      if (editingInvoice.discountValue > 0 || editingInvoice.notes) setShowExtras(true);
      setPrefilled(true);
    }
  }, [editingInvoice, clients, prefilled]);

  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const clampedDiscount = discountType === "percentage" ? Math.min(discountValue, 100) : Math.min(discountValue, subtotal);
  const discountAmount = discountType === "percentage" ? (subtotal * clampedDiscount) / 100 : clampedDiscount;
  const taxAmount = settings.taxEnabled ? ((subtotal - discountAmount) * settings.taxRate) / 100 : 0;
  const total = Math.max(0, subtotal - discountAmount + taxAmount);

  const filteredClients = clientSearch.trim()
    ? clients.filter((c) => c.name.includes(clientSearch) || c.phone.includes(clientSearch))
    : clients;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) {
        setShowClientDropdown(false);
      }
      // Close product dropdowns on outside click
      const target = e.target as HTMLElement;
      if (!target.closest("[data-product-row]")) {
        setActiveProductRow(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectClient(client: (typeof clients)[0]) {
    setSelectedClient(client);
    setClientSearch(client.name);
    setShowClientDropdown(false);
  }

  function getFilteredProducts(rowId: string) {
    const query = productSearch[rowId] || "";
    if (!query.trim()) return products.slice(0, 10);
    return products.filter(
      (p) => p.name.includes(query) || p.sku.toLowerCase().includes(query.toLowerCase()) || p.category.includes(query)
    );
  }

  function selectProduct(rowId: string, product: (typeof products)[0]) {
    setLineItems((prev) =>
      prev.map((item) =>
        item.id === rowId
          ? { ...item, productId: product.id, productName: product.name, description: product.description, unitPrice: product.price, total: item.quantity * product.price }
          : item
      )
    );
    setProductSearch((prev) => ({ ...prev, [rowId]: product.name }));
    setActiveProductRow(null);
  }

  function updateQuantity(rowId: string, quantity: number) {
    setLineItems((prev) =>
      prev.map((item) => (item.id === rowId ? { ...item, quantity, total: quantity * item.unitPrice } : item))
    );
  }

  function updateUnitPrice(rowId: string, unitPrice: number) {
    setLineItems((prev) =>
      prev.map((item) => (item.id === rowId ? { ...item, unitPrice, total: item.quantity * unitPrice } : item))
    );
  }

  function addRow() {
    setLineItems((prev) => [
      ...prev,
      { id: `li${Date.now()}`, productId: "", productName: "", description: "", quantity: 1, unitPrice: 0, total: 0 },
    ]);
  }

  function removeRow(rowId: string) {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((item) => item.id !== rowId));
    setProductSearch((prev) => { const c = { ...prev }; delete c[rowId]; return c; });
  }

  // ---- Bundle CMYK dialog ----
  const [bundleDialogOpen, setBundleDialogOpen] = useState(false);
  const [activeBundleId, setActiveBundleId] = useState<string | null>(null);
  const [bundleQty, setBundleQty] = useState<Record<string, number>>({});
  const [bundlePrice, setBundlePrice] = useState<Record<string, number>>({});

  const colorConfig: Record<string, { label: string; bg: string; dot: string }> = {
    C: { label: "Cyan", bg: "bg-cyan-500/15 dark:bg-cyan-900/30", dot: "#06b6d4" },
    M: { label: "Magenta", bg: "bg-pink-500/15 dark:bg-pink-900/30", dot: "#ec4899" },
    Y: { label: "Yellow", bg: "bg-amber-500/15 dark:bg-yellow-900/30", dot: "#eab308" },
    BK: { label: "Black", bg: "bg-gray-500/20 dark:bg-gray-800", dot: "#1f2937" },
    LC: { label: "Light Cyan", bg: "bg-sky-500/15 dark:bg-sky-900/30", dot: "#38bdf8" },
    LM: { label: "Light Magenta", bg: "bg-rose-500/15 dark:bg-rose-900/30", dot: "#fb7185" },
  };
  const colorOrder = ["C", "M", "Y", "BK", "LC", "LM"];

  function getColorKey(productName: string): string {
    const n = productName.toLowerCase();
    if (n.includes("light cyan") || n === "lc") return "LC";
    if (n.includes("light magenta") || n === "lm") return "LM";
    if (n.includes("cyan") || n === "c") return "C";
    if (n.includes("magenta") || n === "m") return "M";
    if (n.includes("yellow") || n === "y") return "Y";
    if (n.includes("black") || n === "bk") return "BK";
    return productName;
  }

  function openBundleDialog(bundleId: string) {
    const bundle = bundles.find(b => b.id === bundleId);
    if (!bundle) return;
    const qty: Record<string, number> = {};
    const price: Record<string, number> = {};
    bundle.items.forEach(bi => {
      const product = products.find(p => p.id === bi.productId);
      qty[bi.productId] = 1;
      price[bi.productId] = product?.price || 0;
    });
    setBundleQty(qty);
    setBundlePrice(price);
    setActiveBundleId(bundleId);
    setBundleDialogOpen(true);
  }

  function confirmBundleAdd() {
    const bundle = bundles.find(b => b.id === activeBundleId);
    if (!bundle) return;
    const newItems: LineItem[] = bundle.items.map((bi, idx) => {
      const product = products.find(p => p.id === bi.productId);
      const q = bundleQty[bi.productId] || 1;
      const p = bundlePrice[bi.productId] || product?.price || 0;
      return {
        id: `li${Date.now()}-${idx}`,
        productId: bi.productId,
        productName: product?.name || bi.productName,
        description: product?.description || "",
        quantity: q,
        unitPrice: p,
        total: q * p,
      };
    });
    setLineItems(prev => {
      const hasRealItems = prev.some(li => li.productId !== "");
      const kept = hasRealItems ? prev.filter(li => li.productId !== "") : [];
      return [...kept, ...newItems];
    });
    newItems.forEach(item => {
      setProductSearch(prev => ({ ...prev, [item.id]: item.productName }));
    });
    setBundleDialogOpen(false);
    toast.success(`تم إضافة مجموعة "${bundle.name}"`);
  }

  function handleSave(status: InvoiceStatus) {
    if (!selectedClient) {
      toast.error("يرجى اختيار عميل");
      return;
    }
    const validItems = lineItems.filter((li) => li.productId);
    if (validItems.length === 0) {
      toast.error("يرجى إضافة منتج واحد على الأقل");
      return;
    }

    const invoiceData = {
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      items: validItems.map((li) => ({
        id: li.id,
        productId: li.productId,
        productName: li.productName,
        description: li.description,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        total: Math.round(li.total * 100) / 100,
      })),
      subtotal: Math.round(subtotal * 100) / 100,
      discountType,
      discountValue,
      discountAmount: Math.round(discountAmount * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
      status,
      notes,
    };

    if (isEdit && editId) {
      updateInvoice(editId, invoiceData);
      toast.success("تم تحديث الفاتورة بنجاح");
      router.push(`/invoices/${editId}`);
    } else {
      addInvoice(invoiceData);
      toast.success(`تم حفظ الفاتورة بنجاح (${status})`);
      router.push("/invoices");
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-8 page-enter">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/invoices")} className="rounded-xl p-2.5 text-muted-foreground hover:bg-[var(--surface-2)]">
              <ArrowRight className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-extrabold text-foreground">{isEdit ? "تعديل الفاتورة" : "فاتورة جديدة"}</h1>
              <p className="mt-0.5 text-base text-muted-foreground">رقم الفاتورة: {isEdit ? editingInvoice?.invoiceNumber : nextInvoiceNumber()}</p>
            </div>
          </div>
        </div>

        {/* Client Selection */}
        <Card className="border border-[var(--glass-border)] shadow-sm !overflow-visible" style={{ position: "relative", zIndex: 20 }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <User className="h-5 w-5 text-primary" />
              بيانات العميل
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={clientRef} className="relative">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="ابدأ بكتابة اسم العميل أو رقم الهاتف..."
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setShowClientDropdown(true);
                    if (!e.target.value.trim()) setSelectedClient(null);
                  }}
                  onFocus={() => setShowClientDropdown(true)}
                  className="pr-9 h-11"
                />
              </div>

              {showClientDropdown && !selectedClient && (
                <div
                  className="absolute top-full mt-2 w-full rounded-xl overflow-hidden"
                  style={{
                    zIndex: 100,
                    background: "var(--surface-1)",
                    border: "1px solid var(--glass-border)",
                    boxShadow: "var(--shadow-lg)",
                  }}
                >
                  <div className="overflow-y-auto p-1.5" style={{ maxHeight: "240px" }}>
                    {filteredClients.length === 0 ? (
                      <p className="p-4 text-center text-sm text-muted-foreground">لا يوجد عملاء مطابقين</p>
                    ) : (
                      filteredClients.slice(0, 20).map((client) => (
                        <button
                          key={client.id}
                          onClick={() => selectClient(client)}
                          className="flex w-full items-center justify-between rounded-lg p-2.5 text-right transition-colors"
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold" style={{ background: "var(--info-soft)", color: "var(--blue-500)" }}>
                              {client.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{client.name}</p>
                              {client.phone && <p className="text-xs" style={{ color: "var(--text-muted)" }}><span dir="ltr">{client.phone}</span></p>}
                            </div>
                          </div>
                          <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{formatCurrency(client.totalSpent)}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {selectedClient && (
                <div className="mt-3 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {selectedClient.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-base font-bold text-foreground">{selectedClient.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedClient.phone} · {selectedClient.address}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setSelectedClient(null); setClientSearch(""); }}
                    className="rounded-xl p-2.5 text-muted-foreground hover:bg-[var(--surface-2)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bundles quick-add */}
        {bundles.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground">
              <Droplets className="h-3.5 w-3.5" />
              مجموعات:
            </span>
            {bundles.map((bundle) => (
              <button
                key={bundle.id}
                onClick={() => openBundleDialog(bundle.id)}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
              >
                <Plus className="h-3 w-3" />
                {bundle.name}
              </button>
            ))}
          </div>
        )}

        {/* Line Items */}
        <Card className="border border-[var(--glass-border)] shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Package className="h-5 w-5 text-primary" />
              المنتجات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {lineItems.map((item, index) => (
              <div
                key={item.id}
                data-product-row
                className="group rounded-xl border border-[var(--glass-border)] bg-[var(--surface-1)] p-6 shadow-sm transition-all hover:border-primary/20 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  {/* Row number */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-bold text-muted-foreground">
                    {index + 1}
                  </div>

                  <div className="flex-1 space-y-3">
                    {/* Product search */}
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="ابحث عن منتج بالاسم أو الكود..."
                        value={productSearch[item.id] ?? item.productName}
                        onChange={(e) => {
                          setProductSearch((prev) => ({ ...prev, [item.id]: e.target.value }));
                          setActiveProductRow(item.id);
                          if (item.productId) {
                            setLineItems((prev) =>
                              prev.map((li) =>
                                li.id === item.id
                                  ? { ...li, productId: "", productName: "", description: "", unitPrice: 0, total: 0 }
                                  : li
                              )
                            );
                          }
                        }}
                        onFocus={() => setActiveProductRow(item.id)}
                        className="pr-9 h-11"
                      />

                      {activeProductRow === item.id && (
                        <div
                          className="absolute top-full mt-1 w-full rounded-xl overflow-hidden"
                          style={{ zIndex: 90, background: "var(--surface-1)", border: "1px solid var(--glass-border)", boxShadow: "var(--shadow-lg)" }}
                        >
                          <div className="overflow-y-auto p-1.5" style={{ maxHeight: "220px" }}>
                            {getFilteredProducts(item.id).length === 0 ? (
                              <p className="p-4 text-center text-sm text-muted-foreground">لا توجد منتجات</p>
                            ) : (
                              getFilteredProducts(item.id).map((product) => {
                                const img = getProductImage(product.id);
                                return (
                                  <button
                                    key={product.id}
                                    onClick={() => selectProduct(item.id, product)}
                                    className="flex w-full items-center gap-3 rounded-lg p-3 text-right transition-colors hover:bg-[var(--surface-2)]"
                                  >
                                    {img ? (
                                      <img src={img} alt="" className="h-12 w-12 rounded-xl object-cover border border-[var(--glass-border)]" />
                                    ) : (
                                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                                        <Package className="h-5 w-5" />
                                      </div>
                                    )}
                                    <div className="flex-1 text-right">
                                      <p className="text-base font-medium">{product.name}</p>
                                      <p className="text-sm text-muted-foreground">
                                        {product.category} · المخزون: {product.stock} {product.unit}
                                      </p>
                                    </div>
                                    <span className="text-base font-bold text-primary">{formatCurrency(product.price)}</span>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {item.description && (
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    )}

                    {/* Quantity, price, total */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">الكمية</label>
                        <Input
                          type="number" min={1} value={item.quantity}
                          onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                          className="h-10"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">سعر الوحدة ($)</label>
                        <Input
                          type="number" min={0} step={0.5} value={item.unitPrice}
                          onChange={(e) => updateUnitPrice(item.id, parseFloat(e.target.value) || 0)}
                          className="h-10"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">الإجمالي</label>
                        <div className="flex h-10 items-center rounded-lg bg-muted/60 px-3 text-base font-bold text-foreground">
                          {formatCurrency(item.total)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => removeRow(item.id)}
                    disabled={lineItems.length <= 1}
                    className="shrink-0 rounded-xl p-2.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            <Button variant="outline" size="lg" className="w-full gap-2 border-dashed text-muted-foreground" onClick={addRow}>
              <Plus className="h-4 w-4" />
              إضافة منتج آخر
            </Button>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="border border-[var(--glass-border)] shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Calculator className="h-5 w-5 text-primary" />
              ملخص الفاتورة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Collapsible Discount & Notes */}
            <button
              type="button"
              onClick={() => setShowExtras(!showExtras)}
              className="flex w-full items-center justify-between rounded-xl border border-dashed border-[var(--glass-border)] px-5 py-3.5 text-base font-medium text-muted-foreground transition-colors hover:bg-[var(--surface-2)] hover:text-foreground"
            >
              <span>خصم وملاحظات (اختياري)</span>
              <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${showExtras ? "rotate-180" : ""}`} />
            </button>

            {showExtras && (
              <div className="grid gap-5 sm:grid-cols-2 animate-fade-in-up" style={{ animationDuration: "0.3s" }}>
                {/* Discount */}
                <div className="rounded-xl border border-[var(--glass-border)] p-6 space-y-3">
                  <p className="text-base font-medium">الخصم</p>
                  <Select value={discountType} onValueChange={(v) => v && setDiscountType(v as "percentage" | "fixed")}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">نسبة مئوية (%)</SelectItem>
                      <SelectItem value="fixed">مبلغ ثابت ($)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number" min={0} max={discountType === "percentage" ? 100 : subtotal}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    className="h-10"
                  />
                </div>

                {/* Notes */}
                <div className="rounded-xl border border-[var(--glass-border)] p-6 space-y-3">
                  <p className="text-base font-medium">ملاحظات</p>
                  <Textarea
                    placeholder="ملاحظات إضافية على الفاتورة..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
            )}

            {/* Totals */}
            <div className="rounded-xl bg-[var(--surface-2)] p-6 space-y-3">
              <div className="flex justify-between text-base">
                <span className="text-muted-foreground">المجموع الفرعي</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-base">
                  <span className="text-muted-foreground">
                    الخصم {discountType === "percentage" ? `(${discountValue}%)` : ""}
                  </span>
                  <span className="font-medium text-red-600">-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              {settings.taxEnabled && taxAmount > 0 && (
                <div className="flex justify-between text-base">
                  <span className="text-muted-foreground">الضريبة ({settings.taxRate}%)</span>
                  <span className="font-medium">+{formatCurrency(taxAmount)}</span>
                </div>
              )}
              <div className="border-t border-[var(--glass-border)] pt-3">
                <div className="flex justify-between text-xl">
                  <span className="font-bold text-foreground">الإجمالي النهائي</span>
                  <span className="font-extrabold text-primary">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pb-6">
          <Button variant="outline" size="lg" className="gap-2" onClick={() => handleSave("مسودة")}>
            <Save className="h-4 w-4" />
            حفظ كمسودة
          </Button>
          <Button variant="outline" size="lg" className="gap-2" onClick={() => handleSave("غير مدفوعة")}>
            <FileText className="h-4 w-4" />
            غير مدفوعة
          </Button>
          <Button size="lg" className="gap-2" onClick={() => handleSave("مدفوعة")}>
            <Save className="h-4 w-4" />
            مدفوعة
          </Button>
          <Button variant="outline" size="lg" className="gap-2 mr-auto" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            طباعة
          </Button>
        </div>
      </div>

      {/* Bundle CMYK Dialog */}
      <Dialog open={bundleDialogOpen} onOpenChange={setBundleDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          {(() => {
            const bundle = bundles.find(b => b.id === activeBundleId);
            if (!bundle) return null;
            const sortedItems = [...bundle.items]
              .map(bi => {
                const product = products.find(p => p.id === bi.productId);
                const ck = getColorKey(product?.name || bi.productName);
                return { ...bi, product, colorKey: ck };
              })
              .sort((a, b) => colorOrder.indexOf(a.colorKey) - colorOrder.indexOf(b.colorKey));

            const bundleTotal = sortedItems.reduce((s, bi) => {
              const q = bundleQty[bi.productId] || 1;
              const p = bundlePrice[bi.productId] || 0;
              return s + q * p;
            }, 0);

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 via-pink-500 to-yellow-500 text-white">
                      <Droplets className="h-4 w-4" />
                    </div>
                    {bundle.name}
                  </DialogTitle>
                  {bundle.description && <p className="text-sm text-muted-foreground">{bundle.description}</p>}
                </DialogHeader>

                <div className="space-y-1">
                  {/* Header */}
                  <div className="grid grid-cols-[auto_1fr_80px_80px] gap-3 items-center px-2 py-1.5">
                    <div className="w-4" />
                    <span className="text-xs font-bold text-muted-foreground">اللون</span>
                    <span className="text-xs font-bold text-muted-foreground text-center">الكمية</span>
                    <span className="text-xs font-bold text-muted-foreground text-center">السعر ($)</span>
                  </div>

                  {sortedItems.map((bi) => {
                    const cfg = colorConfig[bi.colorKey] || colorConfig.BK;
                    return (
                      <div key={bi.productId} className={`grid grid-cols-[auto_1fr_80px_80px] gap-3 items-center rounded-xl px-3 py-3 ${cfg.bg}`}>
                        <div className="h-4 w-4 rounded-full shadow-sm" style={{ backgroundColor: cfg.dot }} />
                        <div>
                          <span className="text-sm font-bold">{bi.colorKey}</span>
                          <span className="text-xs text-muted-foreground mr-2">{cfg.label}</span>
                        </div>
                        <Input
                          type="number" min={0} value={bundleQty[bi.productId] || 1}
                          onChange={e => setBundleQty(prev => ({ ...prev, [bi.productId]: parseInt(e.target.value) || 0 }))}
                          className="h-9 text-center text-sm font-bold"
                        />
                        <Input
                          type="number" min={0} step={0.25} value={bundlePrice[bi.productId] || 0}
                          onChange={e => setBundlePrice(prev => ({ ...prev, [bi.productId]: parseFloat(e.target.value) || 0 }))}
                          className="h-9 text-center text-sm"
                        />
                      </div>
                    );
                  })}

                  {/* Total */}
                  <div className="flex justify-between items-center rounded-xl bg-primary/10 px-4 py-3 mt-2">
                    <span className="text-sm font-bold">الإجمالي</span>
                    <span className="text-lg font-extrabold text-primary">{formatCurrency(bundleTotal)}</span>
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => setBundleDialogOpen(false)}>إلغاء</Button>
                  <Button onClick={confirmBundleAdd} className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    إضافة للفاتورة
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
