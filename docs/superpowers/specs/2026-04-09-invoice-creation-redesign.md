# Invoice Creation Page Redesign — Odoo 2 Modern Blue

## Summary

Replace the current clunky invoice creation form with an Odoo-style structured form: header fields → line items table → totals. Clean, simple, professional. Same layout for desktop; card-per-item collapse for mobile.

## Design: Odoo 2 Modern Blue (Rounded)

Approved from interactive preview (`preview-final.html`).

### Layout Structure

```
┌─────────────────────────────────────────────────┐
│ ← فاتورة جديدة     INV/2026/0041   [مسودة]  [حفظ] │  ← sticky topbar
├─────────────────────────────────────────────────┤
│ العميل: [search dropdown]  │  التاريخ: [input]     │
│ شروط الدفع: [select]       │  الخصم: [input] [%/$] │  ← 2-col header
├─────────────────────────────────────────────────┤
│ #  │ المنتج              │ الكمية │ السعر │ خصم │ الإجمالي │  ← table header
│ 1  │ طقم V58.3 [باقة]    │  1     │ 34    │ 0%  │ $34      │
│ 2  │ C5890 Printer        │  1     │ 280   │ 0%  │ $280     │
│ 3  │ [search input...]    │  —     │ —     │ —   │ —        │  ← inline search
│ + إضافة منتج  │ 🎨 إضافة باقة  │ + منتج مؤقت         │  ← action buttons
├─────────────────────────────────────────────────┤
│                        المجموع: $364  │ خصم: -$18 │  ← right-aligned
│                        الإجمالي: $345.80          │     totals
├─────────────────────────────────────────────────┤
│ ملاحظات: [textarea]                               │
│ [مسودة] [مدفوعة ✓] [غير مدفوعة] [حفظ الفاتورة]   │  ← save buttons
└─────────────────────────────────────────────────┘
```

### Mobile Layout

Table collapses — each line item becomes a card:

```
┌──────────────────────┐
│ طقم V58.3 [باقة]  ✕ │
│ C×1 · M×1 · Y×1 · BK│
│ الكمية [1]  السعر [34]│
│ الإجمالي: $34        │
└──────────────────────┘
```

Header fields stack to 1 column. Save buttons stretch full-width.

---

## Features Carried Over (existing logic, no changes)

| Feature | How it works |
|---|---|
| Client search | Type in dropdown → fuzzy match name/phone (case-insensitive) |
| Product search | Type in product cell → dropdown with name/sku/category match (case-insensitive) |
| Bundle quick-add | "إضافة باقة" → opens CMYK dialog → adds as 1 line item with `bundleComponents[]` |
| Temporary products | "منتج مؤقت" → free-text name/price, `isTemporary: true`, no stock impact |
| Stock validation | Before save: check each product stock, check each bundle component stock |
| Discount | Global: % or fixed amount (clamped) |
| Tax | From `settings.taxEnabled` + `settings.taxRate` |
| Invoice number | Auto-generated from `nextInvoiceNumber()` |
| Edit mode | URL param `?edit=<id>` pre-fills all fields |
| Save statuses | Draft (مسودة), Paid (مدفوعة), Unpaid (غير مدفوعة) |
| Stock deduction | On save: regular items deduct from product, bundles deduct from each component |

## What Changes

### Desktop (`DesktopInvoicePage` in `src/app/invoices/new/page.tsx`)

**Current:** Card-based sections with separate client card, product cards with search popups, summary card.

**New:** Single form card with:

1. **Sticky top bar** — back button, title, invoice number, status badge, action buttons
2. **Header section** — 2×2 grid: Client picker, Date, Payment Terms, Discount
3. **Client picker** — shows selected client with avatar. Click "تغيير" → dropdown with search input + client list
4. **Line items table** — proper `<table>` or CSS grid with columns:
   - `#` (row number)
   - Product (inline search input → dropdown with product images, stock badges)
   - Quantity (editable input, invisible border until hover)
   - Unit Price (editable input)
   - Discount % (per-line, editable input)
   - Total (computed, read-only)
   - Delete button (visible on row hover)
5. **Add buttons** below table — "إضافة منتج" / "إضافة باقة" / "منتج مؤقت"
6. **Totals** — right-aligned box: subtotal, discount, tax, grand total
7. **Notes** — textarea
8. **Save buttons** — Draft / Paid / Unpaid / Save

### Mobile (`MobileInvoiceWizard` in `src/components/mobile/invoice-wizard/mobile-invoice-wizard.tsx`)

**Current:** Multi-step wizard with separate pages for client, products, review.

**New:** Single scrollable form (same structure as desktop) with:
- Header fields stack to 1 column
- Table header hidden — each row becomes a card with fields labeled
- Product search full-width
- Save buttons at bottom, full-width
- Bundle dialog as bottom sheet instead of centered dialog

### Product Search Dropdown (new component)

When user clicks/types in the product cell of an empty row:
- Shows search input (auto-focused)
- Results list with: product image thumbnail, name (bold match), category, stock badge (green/red), price
- Click selects product → fills row with product data
- Out-of-stock items shown but disabled with red badge

### Bundle Row Display

Bundle rows show:
- Purple "باقة" badge next to product name
- Subtitle: component list (e.g., "Cyan ×1 · Magenta ×1 · Yellow ×1 · Black ×1")
- Quantity/price editable (price = total bundle price, not per-component)

### Temporary Product Row

- Yellow-tinted background
- "مؤقت" badge next to editable name input
- Subtitle: "منتج مؤقت — بدون تأثير على المخزون"

### Per-Line Discount (new — optional, default 0)

Each row has a discount % column. Currently discount is global only.

**Data change:** Add optional `discount?: number` (percentage, 0-100) to `InvoiceItem` interface in `data.ts`.

**Calculation:**
- Line total = qty × price × (1 - lineDiscount/100)
- Subtotal = sum of line totals
- Global discount applied to subtotal
- Tax applied after global discount

**Backward compatible:** Existing invoices without per-line discount work fine (field defaults to 0).

---

## Styling

- Background: `#f8fafc`
- Card: white, `border-radius: 14px`, `border: 1px solid #e2e8f0`
- Accent: `#2563eb` (blue)
- Inputs: `border-radius: 10px`, `1.5px solid #e2e8f0`, focus = blue border + shadow
- Table inputs: transparent borders until hover/focus (Odoo-style inline editing)
- Fonts: Tajawal (Arabic), Space Mono (numbers/prices)
- Bundle badge: `#7c3aed` purple
- Temp badge: `#f59e0b` amber
- Status badges: Draft=yellow, Paid=green, Unpaid=orange

---

## Files to Modify

| File | Action |
|---|---|
| `src/app/invoices/new/page.tsx` | Rewrite `DesktopInvoicePage` component |
| `src/components/mobile/invoice-wizard/mobile-invoice-wizard.tsx` | Rewrite to single-form layout |
| `src/components/mobile/invoice-wizard/step-client.tsx` | Remove (no longer separate step) |
| `src/components/mobile/invoice-wizard/step-products.tsx` | Remove (no longer separate step) |

## Files NOT Changed

- `src/lib/store.tsx` — all invoice logic (add/update/delete, stock deduction) stays the same
- `src/lib/data.ts` — interfaces stay the same
- Bundle dialog logic — stays the same, just re-styled to match new design
- All other pages — untouched

---

## Out of Scope

- GrapesJS drag-and-drop invoice designer (future task)
- Payment tracking / partial payment flow
- Email/WhatsApp sending from this page
- Print/PDF from this page (existing invoice detail page handles this)
