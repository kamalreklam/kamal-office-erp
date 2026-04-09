"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ResponsiveShell } from "@/components/responsive-shell";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { MobileInvoiceWizard } from "@/components/mobile/invoice-wizard/mobile-invoice-wizard";
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
  ArrowRight, Plus, Trash2, Search, Package,
  Save, Printer, FileText, Droplets,
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
  discount?: number;
  _priceInput?: string;
  isBundle?: boolean;
  bundleComponents?: { productId: string; productName: string; quantity: number }[];
  isTemporary?: boolean;
}

export default function NewInvoicePage() {
  const isMobile = useIsMobile();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  if (isMobile) {
    return <MobileInvoiceWizard editId={editId} />;
  }

  return <DesktopInvoicePage />;
}

function DesktopInvoicePage() {
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
        ...(item.isBundle ? { isBundle: true, bundleComponents: item.bundleComponents } : {}),
        ...(item.isTemporary ? { isTemporary: true } : {}),
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

  function getLineTotal(item: LineItem): number {
    const d = item.discount || 0;
    return item.quantity * item.unitPrice * (1 - d / 100);
  }

  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100)), 0);
  const clampedDiscount = discountType === "percentage" ? Math.min(discountValue, 100) : Math.min(discountValue, subtotal);
  const discountAmount = discountType === "percentage" ? (subtotal * clampedDiscount) / 100 : clampedDiscount;
  const taxAmount = settings.taxEnabled ? ((subtotal - discountAmount) * settings.taxRate) / 100 : 0;
  const total = Math.max(0, subtotal - discountAmount + taxAmount);

  const filteredClients = clientSearch.trim()
    ? clients.filter((c) => { const q = clientSearch.toLowerCase(); return c.name.toLowerCase().includes(q) || c.phone.includes(q); })
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
    const query = (productSearch[rowId] || "").toLowerCase().trim();
    if (!query) return products.slice(0, 10);
    return products.filter(
      (p) => p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query) || p.category.toLowerCase().includes(query)
    );
  }

  function selectProduct(rowId: string, product: (typeof products)[0]) {
    if (product.stock <= 0) {
      toast.error(`"${product.name}" — المخزون 0، لا يمكن إضافته`);
      return;
    }
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
      prev.map((item) => {
        if (item.id !== rowId) return item;
        if (item.isTemporary) {
          return { ...item, quantity, total: quantity * item.unitPrice };
        }
        if (item.isBundle && item.bundleComponents) {
          // Check stock for each component
          for (const comp of item.bundleComponents) {
            const product = products.find(p => p.id === comp.productId);
            if (product && comp.quantity * quantity > product.stock) {
              toast.error(`الكمية المطلوبة أكبر من مخزون "${product.name}" (${product.stock})`);
              return item;
            }
          }
          return { ...item, quantity, total: quantity * item.unitPrice };
        }
        const product = products.find(p => p.id === item.productId);
        if (product && quantity > product.stock) {
          toast.error(`الكمية المطلوبة (${quantity}) أكبر من المخزون (${product.stock})`);
          return item;
        }
        return { ...item, quantity, total: quantity * item.unitPrice };
      })
    );
  }

  function updateUnitPrice(rowId: string, value: string) {
    // Allow typing decimals freely (e.g. "4.", "4.7", "4.75")
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== rowId) return item;
        const unitPrice = parseFloat(value) || 0;
        return { ...item, unitPrice, total: item.quantity * unitPrice, _priceInput: value };
      })
    );
  }

  function updateDiscount(rowId: string, discount: number) {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== rowId) return item;
        const d = Math.min(Math.max(discount, 0), 100);
        return { ...item, discount: d, total: item.quantity * item.unitPrice * (1 - d / 100) };
      })
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

  function addTemporaryProduct() {
    const tempItem: LineItem = {
      id: `li${Date.now()}`,
      productId: "",
      productName: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      total: 0,
      isTemporary: true,
    };
    setLineItems(prev => [...prev, tempItem]);
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

    // Check for 0-stock or over-stock items
    const blocked: string[] = [];
    const overStock: string[] = [];
    bundle.items.forEach(bi => {
      const product = products.find(p => p.id === bi.productId);
      const q = bundleQty[bi.productId] || 1;
      if (product && product.stock <= 0) blocked.push(product.name);
      else if (product && q > product.stock) overStock.push(`${product.name} (متوفر: ${product.stock})`);
    });
    if (blocked.length > 0) {
      toast.error(`منتجات نفذ مخزونها: ${blocked.join("، ")}`);
      return;
    }
    if (overStock.length > 0) {
      toast.error(`الكمية أكبر من المخزون: ${overStock.join("، ")}`);
      return;
    }

    // Build bundle components and calculate total
    const components = bundle.items.map(bi => {
      const product = products.find(p => p.id === bi.productId);
      const q = bundleQty[bi.productId] || 1;
      return { productId: bi.productId, productName: product?.name || bi.productName, quantity: q };
    });

    const bundleTotal = bundle.items.reduce((s, bi) => {
      const q = bundleQty[bi.productId] || 1;
      const p = bundlePrice[bi.productId] || 0;
      return s + q * p;
    }, 0);

    const bundleItem: LineItem = {
      id: `li${Date.now()}`,
      productId: `bundle_${bundle.id}`,
      productName: bundle.name,
      description: bundle.description || bundle.items.map(bi => {
        const product = products.find(p => p.id === bi.productId);
        return product?.name || bi.productName;
      }).join(" + "),
      quantity: 1,
      unitPrice: bundleTotal,
      total: bundleTotal,
      isBundle: true,
      bundleComponents: components,
    };

    setLineItems(prev => {
      const hasRealItems = prev.some(li => li.productId !== "");
      return hasRealItems ? [...prev.filter(li => li.productId !== ""), bundleItem] : [bundleItem];
    });
    setProductSearch(prev => ({ ...prev, [bundleItem.id]: bundleItem.productName }));
    setBundleDialogOpen(false);
    toast.success(`تم إضافة مجموعة "${bundle.name}"`);
  }

  function handleSave(status: InvoiceStatus) {
    if (!selectedClient) {
      toast.error("يرجى اختيار عميل");
      return;
    }
    const validItems = lineItems.filter((li) => li.productId || li.isTemporary);
    if (validItems.length === 0) {
      toast.error("يرجى إضافة منتج واحد على الأقل");
      return;
    }

    // Temporary items need a name
    const missingNames = validItems.filter(li => li.isTemporary && !li.productName.trim());
    if (missingNames.length > 0) {
      toast.error("يرجى إدخال اسم المنتج المؤقت");
      return;
    }

    // Final stock check
    const stockErrors: string[] = [];
    validItems.forEach(li => {
      if (li.isTemporary) return; // skip temp items
      if (li.isBundle && li.bundleComponents) {
        // check each component
        li.bundleComponents.forEach(comp => {
          const product = products.find(p => p.id === comp.productId);
          if (product && product.stock <= 0) stockErrors.push(product.name);
          else if (product && comp.quantity * li.quantity > product.stock) stockErrors.push(`${product.name} (متوفر: ${product.stock})`);
        });
      } else {
        const product = products.find(p => p.id === li.productId);
        if (product && product.stock <= 0) stockErrors.push(`${product.name} (مخزون: 0)`);
        else if (product && li.quantity > product.stock) stockErrors.push(`${product.name} (طلب: ${li.quantity}, متوفر: ${product.stock})`);
      }
    });
    if (stockErrors.length > 0) {
      toast.error(`مشكلة في المخزون: ${stockErrors.join("، ")}`);
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
        ...(li.discount ? { discount: li.discount } : {}),
        ...(li.isBundle ? { isBundle: true, bundleComponents: li.bundleComponents } : {}),
        ...(li.isTemporary ? { isTemporary: true } : {}),
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
    <ResponsiveShell>
      <div className="min-h-screen" style={{ background: "#f8fafc" }}>
        {/* Sticky top bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-[#e2e8f0] bg-white/80 backdrop-blur-sm px-6 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/invoices")} className="rounded-[10px] p-2 text-[#94a3b8] hover:bg-[#f1f5f9] transition-colors">
              <ArrowRight className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold text-[#1e293b]">{isEdit ? "تعديل الفاتورة" : "فاتورة جديدة"}</h1>
            <span className="font-mono text-sm text-[#94a3b8]">{isEdit ? editingInvoice?.invoiceNumber : nextInvoiceNumber()}</span>
            <Badge className="bg-[#fef3c7] text-[#92400e] border-0 text-[11px] font-bold">مسودة</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-[10px] border-[#e2e8f0]" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" />
              طباعة
            </Button>
            <Button size="sm" className="gap-1.5 rounded-[10px] bg-[#2563eb] hover:bg-[#1d4ed8]" onClick={() => handleSave("مدفوعة")}>
              <Save className="h-3.5 w-3.5" />
              حفظ
            </Button>
          </div>
        </div>

        {/* Main card */}
        <div className="mx-auto max-w-5xl px-6 py-6">
          <div className="rounded-[14px] border border-[#e2e8f0] bg-white shadow-sm">
            {/* Header fields: 2x2 grid */}
            <div className="grid grid-cols-1 gap-5 border-b border-[#e2e8f0] p-6 sm:grid-cols-2">
              {/* Client picker */}
              <div ref={clientRef} className="relative">
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#94a3b8]">العميل</label>
                {selectedClient ? (
                  <div className="flex items-center justify-between rounded-[10px] border-[1.5px] border-[#2563eb]/30 bg-[#2563eb]/5 px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2563eb]/10 text-xs font-bold text-[#2563eb]">
                        {selectedClient.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#1e293b]">{selectedClient.name}</p>
                        <p className="text-xs text-[#94a3b8]">{selectedClient.phone}</p>
                      </div>
                    </div>
                    <button onClick={() => { setSelectedClient(null); setClientSearch(""); }} className="rounded-[8px] p-1.5 text-[#94a3b8] hover:bg-[#f1f5f9] hover:text-red-500 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                    <Input
                      placeholder="ابحث عن عميل..."
                      value={clientSearch}
                      onChange={(e) => {
                        setClientSearch(e.target.value);
                        setShowClientDropdown(true);
                        if (!e.target.value.trim()) setSelectedClient(null);
                      }}
                      onFocus={() => setShowClientDropdown(true)}
                      className="pr-9 h-10 rounded-[10px] border-[1.5px] border-[#e2e8f0] focus:border-[#2563eb]"
                    />
                  </div>
                )}

                {showClientDropdown && !selectedClient && (
                  <div className="absolute top-full mt-1 w-full rounded-[10px] border border-[#e2e8f0] bg-white shadow-lg overflow-hidden" style={{ zIndex: 100 }}>
                    <div className="overflow-y-auto p-1" style={{ maxHeight: "220px" }}>
                      {filteredClients.length === 0 ? (
                        <p className="p-3 text-center text-sm text-[#94a3b8]">لا يوجد عملاء مطابقين</p>
                      ) : (
                        filteredClients.slice(0, 20).map((client) => (
                          <button
                            key={client.id}
                            onClick={() => selectClient(client)}
                            className="flex w-full items-center justify-between rounded-[8px] p-2.5 text-right transition-colors hover:bg-[#f1f5f9]"
                          >
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2563eb]/10 text-[10px] font-bold text-[#2563eb]">
                                {client.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-[#1e293b]">{client.name}</p>
                                {client.phone && <p className="text-xs text-[#94a3b8]"><span dir="ltr">{client.phone}</span></p>}
                              </div>
                            </div>
                            <span className="text-xs font-mono font-semibold text-[#94a3b8]">{formatCurrency(client.totalSpent)}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#94a3b8]">التاريخ</label>
                <div className="flex h-10 items-center rounded-[10px] border-[1.5px] border-[#e2e8f0] bg-[#f8fafc] px-3 text-sm text-[#64748b] font-mono">
                  {new Date().toLocaleDateString("ar-SA")}
                </div>
              </div>

              {/* Payment Terms (Discount) */}
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#94a3b8]">الخصم</label>
                <div className="flex gap-2">
                  <Select value={discountType} onValueChange={(v) => v && setDiscountType(v as "percentage" | "fixed")}>
                    <SelectTrigger className="h-10 w-[130px] rounded-[10px] border-[1.5px] border-[#e2e8f0]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">نسبة %</SelectItem>
                      <SelectItem value="fixed">مبلغ ثابت</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number" min={0} max={discountType === "percentage" ? 100 : subtotal}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    className="h-10 flex-1 rounded-[10px] border-[1.5px] border-[#e2e8f0] font-mono"
                  />
                </div>
              </div>

              {/* Discount amount preview */}
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#94a3b8]">قيمة الخصم</label>
                <div className="flex h-10 items-center rounded-[10px] border-[1.5px] border-[#e2e8f0] bg-[#f8fafc] px-3 text-sm font-mono font-bold text-red-500">
                  {discountAmount > 0 ? `-${formatCurrency(discountAmount)}` : formatCurrency(0)}
                </div>
              </div>
            </div>

            {/* Line items table */}
            <div className="p-6">
              {/* Table header — hidden on mobile */}
              <div className="hidden sm:grid grid-cols-[36px_1fr_80px_100px_70px_90px_32px] gap-2 items-center px-2 py-2 rounded-[10px] bg-[#f8fafc] mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-[#94a3b8] text-center">#</span>
                <span className="text-[11px] font-bold uppercase tracking-wide text-[#94a3b8]">المنتج</span>
                <span className="text-[11px] font-bold uppercase tracking-wide text-[#94a3b8] text-center">الكمية</span>
                <span className="text-[11px] font-bold uppercase tracking-wide text-[#94a3b8] text-center">السعر</span>
                <span className="text-[11px] font-bold uppercase tracking-wide text-[#94a3b8] text-center">خصم %</span>
                <span className="text-[11px] font-bold uppercase tracking-wide text-[#94a3b8] text-center">الإجمالي</span>
                <span />
              </div>

              {/* Table rows */}
              <div className="space-y-1">
                {lineItems.map((item, index) => (
                  <div key={item.id} data-product-row className="group relative">
                    {/* Desktop row */}
                    <div className={`hidden sm:grid grid-cols-[36px_1fr_80px_100px_70px_90px_32px] gap-2 items-center rounded-[10px] px-2 py-2 transition-colors hover:bg-[#f8fafc] ${item.isTemporary ? "bg-[#fefce8]" : ""}`}>
                      {/* Row # */}
                      <span className="text-xs font-bold text-[#94a3b8] text-center font-mono">{index + 1}</span>

                      {/* Product cell */}
                      <div className="relative min-w-0">
                        {item.isTemporary ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">&#9999;&#65039;</span>
                            <Input
                              placeholder="اسم المنتج المؤقت..."
                              value={item.productName}
                              onChange={(e) => {
                                setLineItems(prev => prev.map(li =>
                                  li.id === item.id ? { ...li, productName: e.target.value } : li
                                ));
                              }}
                              className="h-8 rounded-[8px] border-transparent hover:border-[#e2e8f0] focus:border-[#2563eb] border-[1.5px] text-sm"
                            />
                            <Badge className="bg-[#f59e0b] text-white border-0 text-[10px] shrink-0">مؤقت</Badge>
                          </div>
                        ) : item.isBundle ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">&#127912;</span>
                              <span className="text-sm font-medium text-[#1e293b] truncate">{item.productName}</span>
                              <Badge className="bg-[#7c3aed] text-white border-0 text-[10px] shrink-0">باقة</Badge>
                            </div>
                            {item.bundleComponents && (
                              <p className="text-[11px] text-[#94a3b8] mt-0.5 pr-6 truncate">
                                {item.bundleComponents.map(c => `${c.productName} x${c.quantity}`).join(" . ")}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="relative">
                            <Search className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94a3b8]" />
                            <Input
                              placeholder="ابحث عن منتج..."
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
                              className="pr-7 h-8 rounded-[8px] border-transparent hover:border-[#e2e8f0] focus:border-[#2563eb] border-[1.5px] text-sm"
                            />

                            {activeProductRow === item.id && (
                              <div className="absolute top-full mt-1 w-full rounded-[10px] border border-[#e2e8f0] bg-white shadow-lg overflow-hidden" style={{ zIndex: 90 }}>
                                <div className="overflow-y-auto p-1" style={{ maxHeight: "200px" }}>
                                  {getFilteredProducts(item.id).length === 0 ? (
                                    <p className="p-3 text-center text-sm text-[#94a3b8]">لا توجد منتجات</p>
                                  ) : (
                                    getFilteredProducts(item.id).map((product) => {
                                      const img = getProductImage(product.id);
                                      const outOfStock = product.stock <= 0;
                                      return (
                                        <button
                                          key={product.id}
                                          onClick={() => selectProduct(item.id, product)}
                                          disabled={outOfStock}
                                          className={`flex w-full items-center gap-2.5 rounded-[8px] p-2.5 text-right transition-colors ${outOfStock ? "opacity-40 cursor-not-allowed" : "hover:bg-[#f1f5f9]"}`}
                                        >
                                          {img ? (
                                            <img src={img} alt="" className="h-10 w-10 rounded-[8px] object-cover border border-[#e2e8f0]" />
                                          ) : (
                                            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#f1f5f9] text-[#94a3b8]">
                                              <Package className="h-4 w-4" />
                                            </div>
                                          )}
                                          <div className="flex-1 text-right min-w-0">
                                            <p className="text-sm font-medium text-[#1e293b] truncate">{product.name}</p>
                                            <p className={`text-xs ${outOfStock ? "text-red-500 font-semibold" : "text-[#94a3b8]"}`}>
                                              {outOfStock ? "نفذ المخزون" : `${product.category} . ${product.stock} ${product.unit}`}
                                            </p>
                                          </div>
                                          {outOfStock ? (
                                            <Badge variant="destructive" className="text-[10px] shrink-0">0</Badge>
                                          ) : (
                                            <span className="text-sm font-bold font-mono text-[#2563eb]">{formatCurrency(product.price)}</span>
                                          )}
                                        </button>
                                      );
                                    })
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Quantity */}
                      <Input
                        type="number" min={1} value={item.quantity}
                        onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                        className="h-8 rounded-[8px] border-transparent hover:border-[#e2e8f0] focus:border-[#2563eb] border-[1.5px] text-center text-sm font-mono"
                      />

                      {/* Price */}
                      <Input
                        type="text"
                        inputMode="decimal"
                        dir="ltr"
                        value={item._priceInput !== undefined ? item._priceInput : (item.unitPrice || "")}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "" || /^\d*\.?\d*$/.test(v)) {
                            updateUnitPrice(item.id, v);
                          }
                        }}
                        onBlur={() => {
                          setLineItems(prev => prev.map(li =>
                            li.id === item.id ? { ...li, _priceInput: undefined } : li
                          ));
                        }}
                        placeholder="0.00"
                        className="h-8 rounded-[8px] border-transparent hover:border-[#e2e8f0] focus:border-[#2563eb] border-[1.5px] text-center text-sm font-mono"
                      />

                      {/* Discount % */}
                      <Input
                        type="number" min={0} max={100}
                        value={item.discount || 0}
                        onChange={(e) => updateDiscount(item.id, parseFloat(e.target.value) || 0)}
                        className="h-8 rounded-[8px] border-transparent hover:border-[#e2e8f0] focus:border-[#2563eb] border-[1.5px] text-center text-sm font-mono"
                      />

                      {/* Total */}
                      <span className="text-sm font-bold font-mono text-[#1e293b] text-center">{formatCurrency(getLineTotal(item))}</span>

                      {/* Delete */}
                      <button
                        onClick={() => removeRow(item.id)}
                        disabled={lineItems.length <= 1}
                        className="opacity-0 group-hover:opacity-100 rounded-[8px] p-1.5 text-[#94a3b8] hover:bg-red-50 hover:text-red-500 transition-all disabled:opacity-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Mobile card row */}
                    <div className={`sm:hidden rounded-[10px] border border-[#e2e8f0] p-4 space-y-3 ${item.isTemporary ? "bg-[#fefce8]" : "bg-white"}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#94a3b8] font-mono">#{index + 1}</span>
                        <div className="flex items-center gap-1.5">
                          {item.isBundle && <Badge className="bg-[#7c3aed] text-white border-0 text-[10px]">باقة</Badge>}
                          {item.isTemporary && <Badge className="bg-[#f59e0b] text-white border-0 text-[10px]">مؤقت</Badge>}
                          <button
                            onClick={() => removeRow(item.id)}
                            disabled={lineItems.length <= 1}
                            className="rounded-[8px] p-1.5 text-[#94a3b8] hover:text-red-500 disabled:opacity-20"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Product field */}
                      <div>
                        <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#94a3b8]">المنتج</label>
                        {item.isTemporary ? (
                          <Input
                            placeholder="اسم المنتج المؤقت..."
                            value={item.productName}
                            onChange={(e) => {
                              setLineItems(prev => prev.map(li =>
                                li.id === item.id ? { ...li, productName: e.target.value } : li
                              ));
                            }}
                            className="h-10 rounded-[10px] border-[1.5px] border-[#e2e8f0]"
                          />
                        ) : item.isBundle ? (
                          <div>
                            <div className="flex items-center gap-1.5 rounded-[10px] border-[1.5px] border-[#7c3aed]/30 bg-[#7c3aed]/5 px-3 py-2">
                              <span>&#127912;</span>
                              <span className="text-sm font-medium">{item.productName}</span>
                            </div>
                            {item.bundleComponents && (
                              <p className="text-[11px] text-[#94a3b8] mt-1">
                                {item.bundleComponents.map(c => `${c.productName} x${c.quantity}`).join(" . ")}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="relative" data-product-row>
                            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                            <Input
                              placeholder="ابحث عن منتج..."
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
                              className="pr-9 h-10 rounded-[10px] border-[1.5px] border-[#e2e8f0]"
                            />
                            {activeProductRow === item.id && (
                              <div className="absolute top-full mt-1 w-full rounded-[10px] border border-[#e2e8f0] bg-white shadow-lg overflow-hidden" style={{ zIndex: 90 }}>
                                <div className="overflow-y-auto p-1" style={{ maxHeight: "200px" }}>
                                  {getFilteredProducts(item.id).length === 0 ? (
                                    <p className="p-3 text-center text-sm text-[#94a3b8]">لا توجد منتجات</p>
                                  ) : (
                                    getFilteredProducts(item.id).map((product) => {
                                      const img = getProductImage(product.id);
                                      const outOfStock = product.stock <= 0;
                                      return (
                                        <button
                                          key={product.id}
                                          onClick={() => selectProduct(item.id, product)}
                                          disabled={outOfStock}
                                          className={`flex w-full items-center gap-2 rounded-[8px] p-2.5 text-right transition-colors ${outOfStock ? "opacity-40 cursor-not-allowed" : "hover:bg-[#f1f5f9]"}`}
                                        >
                                          {img ? (
                                            <img src={img} alt="" className="h-10 w-10 rounded-[8px] object-cover border border-[#e2e8f0]" />
                                          ) : (
                                            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#f1f5f9] text-[#94a3b8]">
                                              <Package className="h-4 w-4" />
                                            </div>
                                          )}
                                          <div className="flex-1 text-right min-w-0">
                                            <p className="text-sm font-medium truncate">{product.name}</p>
                                            <p className={`text-xs ${outOfStock ? "text-red-500" : "text-[#94a3b8]"}`}>
                                              {outOfStock ? "نفذ المخزون" : `${product.stock} ${product.unit}`}
                                            </p>
                                          </div>
                                          {!outOfStock && <span className="text-sm font-bold font-mono text-[#2563eb]">{formatCurrency(product.price)}</span>}
                                        </button>
                                      );
                                    })
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Qty / Price / Discount / Total grid */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#94a3b8]">الكمية</label>
                          <Input
                            type="number" min={1} value={item.quantity}
                            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                            className="h-10 rounded-[10px] border-[1.5px] border-[#e2e8f0] font-mono text-center"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#94a3b8]">السعر</label>
                          <Input
                            type="text" inputMode="decimal" dir="ltr"
                            value={item._priceInput !== undefined ? item._priceInput : (item.unitPrice || "")}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === "" || /^\d*\.?\d*$/.test(v)) updateUnitPrice(item.id, v);
                            }}
                            onBlur={() => {
                              setLineItems(prev => prev.map(li =>
                                li.id === item.id ? { ...li, _priceInput: undefined } : li
                              ));
                            }}
                            placeholder="0.00"
                            className="h-10 rounded-[10px] border-[1.5px] border-[#e2e8f0] font-mono text-center"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#94a3b8]">خصم %</label>
                          <Input
                            type="number" min={0} max={100}
                            value={item.discount || 0}
                            onChange={(e) => updateDiscount(item.id, parseFloat(e.target.value) || 0)}
                            className="h-10 rounded-[10px] border-[1.5px] border-[#e2e8f0] font-mono text-center"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#94a3b8]">الإجمالي</label>
                          <div className="flex h-10 items-center justify-center rounded-[10px] bg-[#f8fafc] border-[1.5px] border-[#e2e8f0] text-sm font-bold font-mono text-[#1e293b]">
                            {formatCurrency(getLineTotal(item))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add buttons row */}
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-dashed border-[#e2e8f0]">
                <button
                  onClick={addRow}
                  className="flex items-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed border-[#2563eb]/40 px-4 py-2 text-sm font-medium text-[#2563eb] hover:bg-[#2563eb]/5 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  إضافة منتج
                </button>
                {bundles.map((bundle) => (
                  <button
                    key={bundle.id}
                    onClick={() => openBundleDialog(bundle.id)}
                    className="flex items-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed border-[#7c3aed]/40 px-4 py-2 text-sm font-medium text-[#7c3aed] hover:bg-[#7c3aed]/5 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {bundle.name}
                  </button>
                ))}
                <button
                  onClick={addTemporaryProduct}
                  className="flex items-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed border-[#f59e0b]/40 px-4 py-2 text-sm font-medium text-[#f59e0b] hover:bg-[#f59e0b]/5 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  منتج مؤقت
                </button>
              </div>
            </div>

            {/* Totals right-aligned */}
            <div className="border-t border-[#e2e8f0] p-6">
              <div className="mr-auto w-full max-w-xs space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#94a3b8]">المجموع الفرعي</span>
                  <span className="font-mono font-medium text-[#1e293b]">{formatCurrency(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#94a3b8]">الخصم {discountType === "percentage" ? `(${discountValue}%)` : ""}</span>
                    <span className="font-mono font-medium text-red-500">-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                {settings.taxEnabled && taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#94a3b8]">الضريبة ({settings.taxRate}%)</span>
                    <span className="font-mono font-medium text-[#1e293b]">+{formatCurrency(taxAmount)}</span>
                  </div>
                )}
                <div className="border-t border-[#e2e8f0] pt-2">
                  <div className="flex justify-between">
                    <span className="text-base font-bold text-[#1e293b]">الإجمالي النهائي</span>
                    <span className="text-lg font-extrabold font-mono text-[#2563eb]">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="border-t border-[#e2e8f0] p-6">
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#94a3b8]">ملاحظات</label>
              <Textarea
                placeholder="ملاحظات إضافية على الفاتورة..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="resize-none rounded-[10px] border-[1.5px] border-[#e2e8f0]"
              />
            </div>

            {/* Save buttons row */}
            <div className="flex flex-wrap items-center gap-2 border-t border-[#e2e8f0] p-6">
              <Button variant="outline" className="gap-1.5 rounded-[10px] border-[#e2e8f0]" onClick={() => handleSave("مسودة")}>
                <Save className="h-3.5 w-3.5" />
                حفظ كمسودة
              </Button>
              <Button variant="outline" className="gap-1.5 rounded-[10px] border-[#e2e8f0]" onClick={() => handleSave("غير مدفوعة")}>
                <FileText className="h-3.5 w-3.5" />
                غير مدفوعة
              </Button>
              <Button variant="outline" className="gap-1.5 rounded-[10px] border-[#e2e8f0]" onClick={() => handleSave("مدفوعة جزئياً")}>
                <FileText className="h-3.5 w-3.5" />
                مدفوعة جزئياً
              </Button>
              <Button className="gap-1.5 rounded-[10px] bg-[#2563eb] hover:bg-[#1d4ed8]" onClick={() => handleSave("مدفوعة")}>
                <Save className="h-3.5 w-3.5" />
                مدفوعة
              </Button>
            </div>
          </div>
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
                          {bi.product && (
                            <span className={`text-[10px] block ${bi.product.stock <= 0 ? "text-red-500 font-bold" : "text-muted-foreground"}`}>
                              {bi.product.stock <= 0 ? "نفذ المخزون!" : `المخزون: ${bi.product.stock}`}
                            </span>
                          )}
                        </div>
                        <Input
                          type="number" min={0} value={bundleQty[bi.productId] || 1}
                          onChange={e => setBundleQty(prev => ({ ...prev, [bi.productId]: parseInt(e.target.value) || 0 }))}
                          className="h-9 text-center text-sm font-bold"
                        />
                        <Input
                          type="text"
                          inputMode="decimal"
                          dir="ltr"
                          value={bundlePrice[bi.productId] ?? 0}
                          onChange={e => {
                            const v = e.target.value;
                            if (v === "" || /^\d*\.?\d*$/.test(v)) {
                              setBundlePrice(prev => ({ ...prev, [bi.productId]: parseFloat(v) || 0 }));
                            }
                          }}
                          placeholder="0.00"
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
    </ResponsiveShell>
  );
}
