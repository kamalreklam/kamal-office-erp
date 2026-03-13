"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
  ArrowRight, Plus, Trash2, Search, User, Package, Calculator,
  Save, Printer, FileText, GripVertical, Layers,
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
  const { clients, products, bundles, addInvoice, getProductImage, settings, nextInvoiceNumber } = useStore();

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

  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = discountType === "percentage" ? (subtotal * discountValue) / 100 : discountValue;
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

  function addBundle(bundle: (typeof bundles)[0]) {
    const newItems: LineItem[] = bundle.items.map((bi, idx) => {
      const product = products.find((p) => p.id === bi.productId);
      return {
        id: `li${Date.now()}-${idx}`,
        productId: bi.productId,
        productName: bi.productName,
        description: product?.description || "",
        quantity: bi.quantity,
        unitPrice: product?.price || 0,
        total: bi.quantity * (product?.price || 0),
      };
    });
    setLineItems((prev) => {
      const filtered = prev.filter((li) => li.productId !== "");
      return [...filtered, ...newItems];
    });
    newItems.forEach((item) => {
      setProductSearch((prev) => ({ ...prev, [item.id]: item.productName }));
    });
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

    addInvoice({
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      items: validItems.map((li) => ({
        id: li.id,
        productId: li.productId,
        productName: li.productName,
        description: li.description,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        total: li.total,
      })),
      subtotal,
      discountType,
      discountValue,
      discountAmount,
      total,
      status,
      notes,
    });

    toast.success(`تم حفظ الفاتورة بنجاح (${status})`);
    router.push("/invoices");
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6 page-enter">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/invoices")} className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
              <ArrowRight className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">فاتورة جديدة</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">رقم الفاتورة: {nextInvoiceNumber()}</p>
            </div>
          </div>
        </div>

        {/* Client Selection */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <User className="h-4 w-4 text-primary" />
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
                <div className="absolute top-full z-20 mt-1 w-full rounded-xl border border-border bg-white shadow-xl">
                  <div className="max-h-64 overflow-y-auto p-2">
                    {filteredClients.length === 0 ? (
                      <p className="p-4 text-center text-sm text-muted-foreground">لا يوجد عملاء مطابقين</p>
                    ) : (
                      filteredClients.map((client) => (
                        <button
                          key={client.id}
                          onClick={() => selectClient(client)}
                          className="flex w-full items-center justify-between rounded-lg p-3 text-right transition-colors hover:bg-accent"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                              {client.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{client.name}</p>
                              <p className="text-xs text-muted-foreground">{client.phone} · {client.address}</p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-[10px]">{formatCurrency(client.totalSpent)}</Badge>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {selectedClient && (
                <div className="mt-3 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {selectedClient.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{selectedClient.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedClient.phone} · {selectedClient.address}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setSelectedClient(null); setClientSearch(""); }}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
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
            <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground">
              <Layers className="h-3.5 w-3.5" />
              مجموعات:
            </span>
            {bundles.map((bundle) => (
              <button
                key={bundle.id}
                onClick={() => addBundle(bundle)}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
              >
                <Plus className="h-3 w-3" />
                {bundle.name}
              </button>
            ))}
          </div>
        )}

        {/* Line Items */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Package className="h-4 w-4 text-primary" />
              المنتجات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lineItems.map((item, index) => (
              <div
                key={item.id}
                data-product-row
                className="group rounded-xl border border-border bg-white p-4 shadow-sm transition-all hover:border-primary/20 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  {/* Row number */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
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
                        <div className="absolute top-full z-20 mt-1 w-full rounded-xl border border-border bg-white shadow-xl">
                          <div className="max-h-64 overflow-y-auto p-2">
                            {getFilteredProducts(item.id).length === 0 ? (
                              <p className="p-4 text-center text-sm text-muted-foreground">لا توجد منتجات</p>
                            ) : (
                              getFilteredProducts(item.id).map((product) => {
                                const img = getProductImage(product.id);
                                return (
                                  <button
                                    key={product.id}
                                    onClick={() => selectProduct(item.id, product)}
                                    className="flex w-full items-center gap-3 rounded-lg p-3 text-right transition-colors hover:bg-accent"
                                  >
                                    {img ? (
                                      <Image src={img} alt="" width={36} height={36} className="h-9 w-9 rounded-lg object-cover border border-border" />
                                    ) : (
                                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                        <Package className="h-4 w-4" />
                                      </div>
                                    )}
                                    <div className="flex-1 text-right">
                                      <p className="text-sm font-medium">{product.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {product.category} · المخزون: {product.stock} {product.unit}
                                      </p>
                                    </div>
                                    <span className="text-sm font-bold text-primary">{formatCurrency(product.price)}</span>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {item.description && (
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    )}

                    {/* Quantity, price, total */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">الكمية</label>
                        <Input
                          type="number" min={1} value={item.quantity}
                          onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                          className="h-10"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">سعر الوحدة ($)</label>
                        <Input
                          type="number" min={0} step={0.5} value={item.unitPrice}
                          onChange={(e) => updateUnitPrice(item.id, parseFloat(e.target.value) || 0)}
                          className="h-10"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">الإجمالي</label>
                        <div className="flex h-10 items-center rounded-lg bg-muted/60 px-3 text-sm font-bold text-foreground">
                          {formatCurrency(item.total)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => removeRow(item.id)}
                    disabled={lineItems.length <= 1}
                    className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
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
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Calculator className="h-4 w-4 text-primary" />
              ملخص الفاتورة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Discount */}
              <div className="rounded-xl border border-border p-4 space-y-3">
                <p className="text-sm font-medium">الخصم</p>
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
              <div className="rounded-xl border border-border p-4 space-y-3">
                <p className="text-sm font-medium">ملاحظات</p>
                <Textarea
                  placeholder="ملاحظات إضافية على الفاتورة..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>

            {/* Totals */}
            <div className="rounded-xl bg-muted/30 p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">المجموع الفرعي</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    الخصم {discountType === "percentage" ? `(${discountValue}%)` : ""}
                  </span>
                  <span className="font-medium text-red-600">-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              {settings.taxEnabled && taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">الضريبة ({settings.taxRate}%)</span>
                  <span className="font-medium">+{formatCurrency(taxAmount)}</span>
                </div>
              )}
              <div className="border-t border-border pt-3">
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
    </AppShell>
  );
}
