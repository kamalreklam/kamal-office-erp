# Invoice Creation Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current card-based invoice creation UI with an Odoo-style form: header fields → line items table → totals. Desktop and mobile.

**Architecture:** Single-page form in one card. Desktop uses CSS grid table for line items, mobile collapses to stacked cards. All existing business logic (store, stock deduction, bundles) is reused unchanged. Only the UI components in `page.tsx` and mobile wizard are rewritten.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS v4, shadcn/ui components, Sonner toasts, Lucide icons.

**Spec:** `docs/superpowers/specs/2026-04-09-invoice-creation-redesign.md`

---

### Task 1: Add `discount` field to InvoiceItem interface

**Files:**
- Modify: `src/lib/data.ts:31-42`

- [ ] **Step 1: Add discount field to InvoiceItem**

In `src/lib/data.ts`, add `discount?: number` to the `InvoiceItem` interface:

```typescript
export interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  discount?: number; // per-line discount percentage (0-100)
  isBundle?: boolean;
  bundleComponents?: { productId: string; productName: string; quantity: number }[];
  isTemporary?: boolean;
}
```

- [ ] **Step 2: Verify build**

Run: `npx next build`
Expected: Build succeeds with no type errors. Existing code is unaffected since the field is optional.

- [ ] **Step 3: Commit**

```bash
git add src/lib/data.ts
git commit -m "feat: add per-line discount field to InvoiceItem interface"
```

---

### Task 2: Rewrite DesktopInvoicePage — Header Section

**Files:**
- Modify: `src/app/invoices/new/page.tsx`

This task replaces the entire `DesktopInvoicePage` component. Since it's a full rewrite, we replace the return JSX. The state variables and all logic functions (`selectClient`, `getFilteredProducts`, `selectProduct`, `updateQuantity`, `updatePrice`, `addRow`, `removeRow`, `addTemporaryProduct`, `openBundleDialog`, `confirmBundleAdd`, `handleSave`) stay the same — only the JSX changes.

- [ ] **Step 1: Update imports and add LineItem discount field**

At the top of the file, update the `LineItem` interface to add `discount`:

```typescript
interface LineItem {
  id: string;
  productId: string;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  _priceInput?: string;
  discount?: number;
  isBundle?: boolean;
  bundleComponents?: { productId: string; productName: string; quantity: number }[];
  isTemporary?: boolean;
}
```

Update imports — remove unused Card/CardContent/CardHeader/CardTitle, add what we need:

```typescript
import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ResponsiveShell } from "@/components/responsive-shell";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { MobileInvoiceWizard } from "@/components/mobile/invoice-wizard/mobile-invoice-wizard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowRight, Plus, Trash2, Search, Package, FileText, 
  Save, Droplets, Eye,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { type InvoiceStatus, formatCurrency } from "@/lib/data";
import { toast } from "sonner";
```

- [ ] **Step 2: Update line total calculation to include per-line discount**

In the `subtotal` calculation (around line 107), update to account for per-line discount:

```typescript
const subtotal = lineItems.reduce((sum, item) => {
  const lineDiscount = item.discount || 0;
  const lineTotal = item.quantity * item.unitPrice * (1 - lineDiscount / 100);
  return sum + lineTotal;
}, 0);
```

Add a helper to compute individual line totals:

```typescript
function getLineTotal(item: LineItem): number {
  const lineDiscount = item.discount || 0;
  return item.quantity * item.unitPrice * (1 - lineDiscount / 100);
}
```

Update `updateQuantity` to use the new formula:

```typescript
function updateQuantity(rowId: string, quantity: number) {
  setLineItems((prev) =>
    prev.map((item) => {
      if (item.id !== rowId) return item;
      const disc = item.discount || 0;
      return { ...item, quantity, total: quantity * item.unitPrice * (1 - disc / 100) };
    })
  );
}
```

Add `updateDiscount` function:

```typescript
function updateDiscount(rowId: string, discount: number) {
  setLineItems((prev) =>
    prev.map((item) => {
      if (item.id !== rowId) return item;
      const disc = Math.min(Math.max(discount, 0), 100);
      return { ...item, discount: disc, total: item.quantity * item.unitPrice * (1 - disc / 100) };
    })
  );
}
```

Update `updatePrice` to include discount:

```typescript
function updatePrice(rowId: string, value: string) {
  setLineItems((prev) =>
    prev.map((item) => {
      if (item.id !== rowId) return item;
      const price = parseFloat(value) || 0;
      const disc = item.discount || 0;
      return { ...item, unitPrice: price, _priceInput: value, total: item.quantity * price * (1 - disc / 100) };
    })
  );
}
```

- [ ] **Step 3: Update handleSave to include per-line discount**

In the `handleSave` function, update the items mapping to include discount:

```typescript
items: validItems.map((li) => ({
  id: li.id,
  productId: li.productId,
  productName: li.productName,
  description: li.description,
  quantity: li.quantity,
  unitPrice: li.unitPrice,
  total: Math.round(getLineTotal(li) * 100) / 100,
  ...(li.discount ? { discount: li.discount } : {}),
  ...(li.isBundle ? { isBundle: true, bundleComponents: li.bundleComponents } : {}),
  ...(li.isTemporary ? { isTemporary: true } : {}),
})),
```

- [ ] **Step 4: Rewrite the JSX — Top bar + Header fields**

Replace the entire `return (...)` block in `DesktopInvoicePage` with the new Odoo-style layout. Start with topbar and header:

```tsx
return (
  <ResponsiveShell>
    <div className="min-h-screen bg-[#f8fafc]" dir="rtl">
      {/* ═══ STICKY TOP BAR ═══ */}
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-[#e2e8f0] bg-white px-7 py-3">
        <button onClick={() => router.push("/invoices")} className="flex h-9 w-9 items-center justify-center rounded-[10px] border-[1.5px] border-[#e2e8f0] text-[#64748b] transition-colors hover:border-[#94a3b8] hover:bg-[#f8fafc]">
          <ArrowRight className="h-4 w-4" />
        </button>
        <h1 className="flex-1 text-xl font-extrabold text-[#1e293b]">{isEdit ? "تعديل الفاتورة" : "فاتورة جديدة"}</h1>
        <span className="font-mono text-sm font-semibold text-[#2563eb]">{isEdit ? editingInvoice?.invoiceNumber : nextInvoiceNumber()}</span>
        <span className="rounded-lg bg-[#fef3c7] px-3 py-1 text-[11px] font-bold text-[#92400e]">مسودة</span>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="gap-1.5 rounded-[10px] text-[13px]" onClick={() => router.push("/invoices")}>
            <Eye className="h-3.5 w-3.5" />
            معاينة
          </Button>
          <Button size="sm" className="gap-1.5 rounded-[10px] text-[13px]" onClick={() => handleSave("مسودة")}>
            <Save className="h-3.5 w-3.5" />
            حفظ
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-[1000px] p-6">
        <div className="overflow-hidden rounded-[14px] border border-[#e2e8f0] bg-white">

          {/* ═══ HEADER FIELDS ═══ */}
          <div className="border-b border-[#f1f5f9] p-6">
            <div className="grid grid-cols-2 gap-x-10 gap-y-4">
              {/* Client */}
              <div ref={clientRef}>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#94a3b8]">العميل</label>
                {selectedClient ? (
                  <div className="flex items-center gap-3 rounded-[10px] border-[1.5px] border-[#e2e8f0] bg-[#f8fafc] p-2.5 transition-colors hover:border-[#2563eb]">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#2563eb] to-[#7c3aed] text-[13px] font-bold text-white">{selectedClient.name.charAt(0)}</div>
                    <div className="flex-1"><p className="text-sm font-bold">{selectedClient.name}</p><p className="text-[11px] text-[#94a3b8]">{selectedClient.phone}</p></div>
                    <button onClick={() => { setSelectedClient(null); setClientSearch(""); }} className="rounded-md bg-[#eff6ff] px-2.5 py-1 text-[11px] font-semibold text-[#2563eb]">تغيير</button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                    <Input
                      placeholder="ابحث بالاسم أو رقم الهاتف..."
                      value={clientSearch}
                      onChange={(e) => { setClientSearch(e.target.value); setShowClientDropdown(true); }}
                      onFocus={() => setShowClientDropdown(true)}
                      className="h-[42px] rounded-[10px] border-[1.5px] border-[#e2e8f0] pr-9 text-sm focus:border-[#2563eb] focus:ring-[3px] focus:ring-[#2563eb]/[0.08]"
                    />
                    {showClientDropdown && (
                      <div className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded-xl border-[1.5px] border-[#e2e8f0] bg-white shadow-lg">
                        <div className="max-h-[200px] overflow-y-auto">
                          {filteredClients.length === 0 ? (
                            <p className="p-4 text-center text-sm text-[#94a3b8]">لا يوجد عملاء</p>
                          ) : filteredClients.slice(0, 15).map((client) => (
                            <button key={client.id} onClick={() => selectClient(client)} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-right transition-colors hover:bg-[#f8fafc]">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#2563eb] to-[#7c3aed] text-[11px] font-bold text-white">{client.name.charAt(0)}</div>
                              <div className="flex-1"><p className="text-[13px] font-semibold">{client.name}</p><p className="text-[11px] text-[#94a3b8]">{client.phone}</p></div>
                              <span className="font-mono text-xs font-bold text-[#2563eb]">{formatCurrency(client.totalSpent)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#94a3b8]">تاريخ الفاتورة</label>
                <Input type="date" defaultValue={new Date().toISOString().split("T")[0]} className="h-[42px] rounded-[10px] border-[1.5px] border-[#e2e8f0] text-sm" />
              </div>

              {/* Payment terms */}
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#94a3b8]">شروط الدفع</label>
                <Select defaultValue="immediate">
                  <SelectTrigger className="h-[42px] rounded-[10px] border-[1.5px] border-[#e2e8f0] text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">فوري</SelectItem>
                    <SelectItem value="30">30 يوم</SelectItem>
                    <SelectItem value="60">60 يوم</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Discount */}
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#94a3b8]">الخصم</label>
                <div className="flex gap-2">
                  <Input
                    type="number" min={0} max={discountType === "percentage" ? 100 : subtotal}
                    value={discountValue} onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    className="h-[42px] w-20 rounded-[10px] border-[1.5px] border-[#e2e8f0] text-center text-sm"
                  />
                  <Select value={discountType} onValueChange={(v: "percentage" | "fixed") => setDiscountType(v)}>
                    <SelectTrigger className="h-[42px] w-16 rounded-[10px] border-[1.5px] border-[#e2e8f0] text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">%</SelectItem>
                      <SelectItem value="fixed">$</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* ...Line items table continues in next step... */}
```

- [ ] **Step 5: Verify build compiles**

Run: `npx next build`
Expected: Compiles (even if incomplete — the rest of JSX will be added in Task 3).

- [ ] **Step 6: Commit**

```bash
git add src/lib/data.ts src/app/invoices/new/page.tsx
git commit -m "feat: invoice redesign - header section with Odoo-style form layout"
```

---

### Task 3: Rewrite DesktopInvoicePage — Line Items Table + Totals + Save

**Files:**
- Modify: `src/app/invoices/new/page.tsx`

- [ ] **Step 1: Add line items table JSX**

Continue the JSX after the header section. Add the line items table with CSS grid, totals, notes, save buttons, and the bundle dialog (reuse existing dialog logic):

```tsx
          {/* ═══ LINE ITEMS TABLE ═══ */}
          <div>
            {/* Table header — desktop only */}
            <div className="hidden md:grid grid-cols-[36px_1fr_80px_100px_70px_90px_32px] gap-0 border-b border-[#e2e8f0] bg-[#f8fafc] px-7 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
              <div>#</div>
              <div>المنتج</div>
              <div className="text-center">الكمية</div>
              <div className="text-center">سعر الوحدة</div>
              <div className="text-center">خصم %</div>
              <div className="text-left">الإجمالي</div>
              <div></div>
            </div>

            {/* Rows */}
            {lineItems.map((item, index) => (
              <div
                key={item.id}
                data-product-row
                className={`group grid grid-cols-1 md:grid-cols-[36px_1fr_80px_100px_70px_90px_32px] items-center gap-2 md:gap-0 border-b border-[#f8fafc] px-7 py-2.5 transition-colors hover:bg-[#fafbff] ${item.isTemporary ? "bg-[#fffbeb]" : ""}`}
              >
                {/* # */}
                <div className="hidden md:block text-xs font-semibold text-[#cbd5e1]">{index + 1}</div>

                {/* Product cell */}
                <div className="relative" data-product-row>
                  {item.isTemporary ? (
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#fef3c7] text-sm">✏️</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <Input
                            placeholder="اسم المنتج المؤقت..."
                            value={item.productName}
                            onChange={(e) => setLineItems(prev => prev.map(li => li.id === item.id ? { ...li, productName: e.target.value } : li))}
                            className="h-8 border-transparent bg-transparent text-[13px] font-semibold hover:border-[#e2e8f0] focus:border-[#2563eb] focus:bg-white"
                          />
                          <span className="shrink-0 rounded bg-[#f59e0b] px-1.5 py-0.5 text-[9px] font-bold text-white">مؤقت</span>
                        </div>
                        <p className="text-[10px] text-[#94a3b8]">منتج مؤقت — بدون تأثير على المخزون</p>
                      </div>
                    </div>
                  ) : item.isBundle ? (
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#eff6ff] to-[#f5f3ff] text-sm">🎨</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-semibold">{item.productName}</span>
                          <span className="rounded bg-[#7c3aed] px-1.5 py-0.5 text-[9px] font-bold text-white">باقة</span>
                        </div>
                        {item.bundleComponents && (
                          <p className="text-[10px] text-[#94a3b8]">{item.bundleComponents.map(c => `${c.productName.split(" - ").pop()?.split(" ").pop() || c.productName} ×${c.quantity}`).join(" · ")}</p>
                        )}
                      </div>
                    </div>
                  ) : item.productId ? (
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f1f5f9]">
                        {(() => { const img = getProductImage(item.productId); return img ? <img src={img} alt="" className="h-9 w-9 rounded-lg object-cover" /> : <Package className="h-4 w-4 text-[#94a3b8]" />; })()}
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold">{item.productName}</p>
                        <p className="text-[10px] text-[#94a3b8]">{products.find(p => p.id === item.productId)?.category}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <Input
                        placeholder="ابحث عن منتج بالاسم أو الكود..."
                        value={productSearch[item.id] ?? ""}
                        onChange={(e) => { setProductSearch(prev => ({ ...prev, [item.id]: e.target.value })); setActiveProductRow(item.id); }}
                        onFocus={() => setActiveProductRow(item.id)}
                        className="h-9 border-[1.5px] border-[#2563eb] bg-white pr-8 text-[13px] shadow-[0_0_0_2px_rgba(37,99,235,0.08)]"
                      />
                      <Search className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94a3b8]" />
                      {activeProductRow === item.id && (
                        <div className="absolute top-full z-10 mt-1 w-[360px] overflow-hidden rounded-xl border-[1.5px] border-[#e2e8f0] bg-white shadow-lg">
                          <div className="max-h-[220px] overflow-y-auto">
                            {getFilteredProducts(item.id).length === 0 ? (
                              <p className="p-4 text-center text-sm text-[#94a3b8]">لا توجد منتجات</p>
                            ) : getFilteredProducts(item.id).map((product) => {
                              const img = getProductImage(product.id);
                              const outOfStock = product.stock <= 0;
                              return (
                                <button
                                  key={product.id}
                                  onClick={() => selectProduct(item.id, product)}
                                  disabled={outOfStock}
                                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-right transition-colors ${outOfStock ? "cursor-not-allowed opacity-40" : "hover:bg-[#f8fafc]"}`}
                                >
                                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f1f5f9]">
                                    {img ? <img src={img} alt="" className="h-9 w-9 rounded-lg object-cover" /> : <Package className="h-4 w-4 text-[#94a3b8]" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="truncate text-xs font-semibold">{product.name}</p>
                                    <p className="text-[10px] text-[#94a3b8]">{product.category}</p>
                                  </div>
                                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${outOfStock ? "bg-[#fee2e2] text-[#dc2626]" : product.stock <= 5 ? "bg-[#fee2e2] text-[#dc2626]" : "bg-[#d1fae5] text-[#059669]"}`}>{product.stock}</span>
                                  <span className="font-mono text-[13px] font-extrabold text-[#2563eb]">{formatCurrency(product.price)}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Qty */}
                <div>
                  <label className="mb-1 block text-[10px] font-semibold text-[#94a3b8] md:hidden">الكمية</label>
                  <Input
                    type="number" min={1} value={item.quantity}
                    onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                    disabled={!item.productId && !item.isTemporary}
                    className="h-8 border-transparent bg-transparent text-center text-[13px] font-bold hover:border-[#e2e8f0] focus:border-[#2563eb] focus:bg-white disabled:opacity-30"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="mb-1 block text-[10px] font-semibold text-[#94a3b8] md:hidden">السعر</label>
                  <Input
                    type="text" inputMode="decimal" dir="ltr"
                    value={item._priceInput ?? String(item.unitPrice)}
                    onChange={(e) => updatePrice(item.id, e.target.value)}
                    disabled={!item.productId && !item.isTemporary}
                    className="h-8 border-transparent bg-transparent text-center text-[13px] font-bold hover:border-[#e2e8f0] focus:border-[#2563eb] focus:bg-white disabled:opacity-30"
                  />
                </div>

                {/* Discount % */}
                <div>
                  <label className="mb-1 block text-[10px] font-semibold text-[#94a3b8] md:hidden">خصم %</label>
                  <Input
                    type="number" min={0} max={100}
                    value={item.discount || 0}
                    onChange={(e) => updateDiscount(item.id, parseInt(e.target.value) || 0)}
                    disabled={!item.productId && !item.isTemporary}
                    className="h-8 border-transparent bg-transparent text-center text-[13px] hover:border-[#e2e8f0] focus:border-[#2563eb] focus:bg-white disabled:opacity-30"
                  />
                </div>

                {/* Total */}
                <div>
                  <label className="mb-1 block text-[10px] font-semibold text-[#94a3b8] md:hidden">الإجمالي</label>
                  <span className="block text-left font-mono text-sm font-extrabold text-[#1e293b]">
                    {item.productId || item.isTemporary ? formatCurrency(getLineTotal(item)) : "—"}
                  </span>
                </div>

                {/* Delete */}
                <button
                  onClick={() => removeRow(item.id)}
                  disabled={lineItems.length <= 1}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#cbd5e1] opacity-0 transition-all hover:bg-[#fef2f2] hover:text-[#ef4444] group-hover:opacity-100 disabled:opacity-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {/* Add buttons */}
            <div className="flex flex-wrap gap-2.5 border-t border-[#f1f5f9] px-7 py-3.5">
              <button onClick={addRow} className="flex items-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed border-[#d1d5db] bg-white px-4 py-2 text-xs font-semibold text-[#64748b] transition-all hover:border-[#2563eb] hover:bg-[#eff6ff] hover:text-[#2563eb]">
                <Plus className="h-3.5 w-3.5" /> إضافة منتج
              </button>
              {bundles.length > 0 && bundles.map(bundle => (
                <button key={bundle.id} onClick={() => openBundleDialog(bundle.id)} className="flex items-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed border-[#c4b5fd] bg-white px-4 py-2 text-xs font-semibold text-[#7c3aed] transition-all hover:border-[#7c3aed] hover:bg-[#f5f3ff]">
                  <Droplets className="h-3.5 w-3.5" /> {bundle.name}
                </button>
              ))}
              <button onClick={addTemporaryProduct} className="flex items-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed border-[#fcd34d] bg-white px-4 py-2 text-xs font-semibold text-[#b45309] transition-all hover:border-[#f59e0b] hover:bg-[#fffbeb]">
                <Plus className="h-3.5 w-3.5" /> منتج مؤقت
              </button>
            </div>
          </div>

          {/* ═══ TOTALS ═══ */}
          <div className="flex justify-end px-7 py-5">
            <div className="w-[300px]">
              <div className="flex justify-between py-1.5 text-[13px] text-[#64748b]">
                <span>المجموع الفرعي ({lineItems.filter(li => li.productId || li.isTemporary).length} أصناف)</span>
                <span className="font-mono font-bold">{formatCurrency(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between py-1.5 text-[13px] text-[#ef4444]">
                  <span>خصم {discountType === "percentage" ? `${discountValue}%` : ""}</span>
                  <span className="font-mono font-bold">−{formatCurrency(discountAmount)}</span>
                </div>
              )}
              {settings.taxEnabled && taxAmount > 0 && (
                <div className="flex justify-between py-1.5 text-[13px] text-[#2563eb]">
                  <span>ضريبة {settings.taxRate}%</span>
                  <span className="font-mono font-bold">+{formatCurrency(taxAmount)}</span>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between rounded-[10px] bg-[#f8fafc] px-4 py-3 text-xl font-extrabold text-[#1e293b]">
                <span>الإجمالي</span>
                <span className="font-mono">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* ═══ NOTES ═══ */}
          <div className="px-7 pb-5">
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#94a3b8]">ملاحظات</label>
            <Textarea
              placeholder="ملاحظات داخلية أو للعميل..."
              value={notes} onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="resize-none rounded-[10px] border-[1.5px] border-[#e2e8f0] text-[13px] focus:border-[#2563eb]"
            />
          </div>

          {/* ═══ SAVE BUTTONS ═══ */}
          <div className="flex flex-wrap gap-2 border-t border-[#f1f5f9] px-7 py-4">
            <div className="flex-1" />
            <Button variant="outline" className="gap-1.5 rounded-[10px]" onClick={() => handleSave("مسودة")}>مسودة</Button>
            <Button className="gap-1.5 rounded-[10px] bg-[#059669] hover:bg-[#047857]" onClick={() => handleSave("مدفوعة")}>مدفوعة ✓</Button>
            <Button variant="outline" className="gap-1.5 rounded-[10px] border-[#f59e0b] text-[#b45309] hover:bg-[#fffbeb]" onClick={() => handleSave("غير مدفوعة")}>غير مدفوعة</Button>
            <Button className="gap-1.5 rounded-[10px]" onClick={() => handleSave("مسودة")}>
              <Save className="h-4 w-4" /> حفظ الفاتورة
            </Button>
          </div>
        </div>
      </div>

      {/* ═══ BUNDLE DIALOG (reuse existing) ═══ */}
      <Dialog open={bundleDialogOpen} onOpenChange={setBundleDialogOpen}>
        {/* Keep the exact same dialog content — no changes needed */}
      </Dialog>
    </div>
  </ResponsiveShell>
);
```

Note: Keep the existing bundle Dialog content exactly as-is from the current code. Just copy it into the new return block.

- [ ] **Step 2: Verify build**

Run: `npx next build`
Expected: Build succeeds.

- [ ] **Step 3: Run dev server and visually verify**

Run: `npx next dev --turbopack`
Navigate to `http://localhost:3000/invoices/new`
Verify: Form renders with header fields, table, totals, save buttons.

- [ ] **Step 4: Commit**

```bash
git add src/app/invoices/new/page.tsx
git commit -m "feat: invoice redesign - line items table, totals, save buttons"
```

---

### Task 4: Rewrite Mobile Invoice Wizard

**Files:**
- Modify: `src/components/mobile/invoice-wizard/mobile-invoice-wizard.tsx`

The mobile version uses the same Odoo form layout but with responsive adjustments:
- Header fields stack to 1 column
- Table header hidden, each row is a card
- Full-width save buttons

- [ ] **Step 1: Rewrite the mobile wizard as a single-form layout**

Replace the entire `MobileInvoiceWizard` component. Keep all the same state and logic functions (client search, cart management, bundle dialog, save), but replace the multi-step wizard JSX with a single scrollable form matching the desktop layout.

Key structural changes:
- Remove step-based navigation (no more `showClients`, `showProducts`, `showBundleSheet` state for navigation)
- Keep `cart` state as the line items array
- Add `discount` field to `CartItem` interface
- Single scrollable page: client picker → product list → totals → save

The mobile version should have:
- Stacked 1-column header fields
- Each cart item as a card with labeled fields (product name, qty, price, discount, total)
- Inline product search (same as desktop but full-width)
- Bundle buttons as horizontal scroll
- Bottom save buttons (full-width)

- [ ] **Step 2: Verify build**

Run: `npx next build`
Expected: Build succeeds.

- [ ] **Step 3: Test on mobile viewport**

Open dev tools, switch to mobile viewport (iPhone 14 Pro).
Navigate to `/invoices/new`.
Verify: Form renders correctly, scrollable, all fields work.

- [ ] **Step 4: Commit**

```bash
git add src/components/mobile/invoice-wizard/mobile-invoice-wizard.tsx
git commit -m "feat: mobile invoice redesign - single scrollable form layout"
```

---

### Task 5: Clean up unused files and final verification

**Files:**
- Delete: `src/components/mobile/invoice-wizard/step-client.tsx`
- Delete: `src/components/mobile/invoice-wizard/step-products.tsx`
- Modify: `src/app/invoices/new/page.tsx` (remove any unused imports)

- [ ] **Step 1: Check if step-client and step-products are imported anywhere else**

Search for imports of `StepClient` and `StepProducts` in the codebase. If only imported in `mobile-invoice-wizard.tsx` (which we rewrote), delete them.

- [ ] **Step 2: Delete unused step files**

```bash
rm src/components/mobile/invoice-wizard/step-client.tsx
rm src/components/mobile/invoice-wizard/step-products.tsx
```

- [ ] **Step 3: Remove unused imports from page.tsx**

Check `src/app/invoices/new/page.tsx` for any imports that are no longer used (e.g., `Card`, `CardContent`, `CardHeader`, `CardTitle` if not used). Remove them.

- [ ] **Step 4: Delete preview HTML files**

```bash
rm preview-odoo-1.html preview-odoo-2.html preview-odoo-3.html preview-final.html
```

- [ ] **Step 5: Full build verification**

Run: `npx next build`
Expected: Build succeeds with no errors.

- [ ] **Step 6: Full functional test**

Test all these scenarios:
1. Create new invoice — select client, add products, add bundle, add temporary product, set discount, save as paid
2. Edit existing invoice — navigate to `/invoices/new?edit=<id>`, verify all fields pre-fill correctly
3. Stock validation — try to add out-of-stock product, verify error toast
4. Bundle — click bundle button, adjust qty/price per color, confirm, verify it appears as 1 line item
5. Temporary product — add temp product, enter name/price, verify it saves correctly
6. Per-line discount — set 10% on a row, verify line total updates correctly
7. Mobile — repeat tests 1-6 on mobile viewport

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: clean up unused files and preview HTMLs after invoice redesign"
```
