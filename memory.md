# Inventory Reconciliation — Progress Memory

**Project:** kamal-office-erp (v0.1.0, Next.js 16.2.1 + React 19, branch `master`)
**Last updated:** 2026-06-05
**Scope:** Reconcile the Aleppo warehouse physical count against the live system stock.

---

## Source files
- **Physical count (truth):** `C:\Users\ihima\OneDrive\Desktop\جرد مستودع حلب.docx` — Aleppo warehouse, counted 2026-06-03. 86 line items across 3 tables, format `name | counted qty | row#`. No prices/codes.
- **System export:** `C:\Users\ihima\OneDrive\Desktop\inventory.csv` — confirmed to be an **exact match** of the live `products` table (79 rows, all stock values identical). The الكود (code) column is empty for every row.
- **Database:** Supabase project `pajjacoachbzjsdzoheg`. Client in `src/lib/supabase.ts`, all data logic in `src/lib/store.tsx`. Connected via anon key in `.env.local`.
  - ⚠️ Security note: every table is fully readable with the public anon key (no RLS restricting reads). The anon key ships in the browser bundle. Flagged, not yet addressed.

## Key decisions / facts established by the user
1. **Stock scope = Aleppo only.** The system is meant to track just this one warehouse, so every difference is a real discrepancy.
2. **Meaning of gaps:** where system > physical, the difference is stock that left but was never deducted (mostly sold). **Physical count is the source of truth**; the system will eventually be brought down to it.
3. **Names were changed in the docx** → must fix name mappings BEFORE computing/applying any "sold" adjustment, so items aren't mis-matched.
4. **12 new items** (not in system) → parked as the LAST task.
5. User believes system `C400 Refillable Cartridge` corresponds to the physical `EPSON AMG C400 Kartuş C/M/Y/K` lines, but the count sheet wrote the wrong name → fix names first.

## DB schema (tables)
`clients` (31), `products` (79), `invoices` (77), `orders` (37), `bundles` (6), `product_images` (9), `app_settings` (1).
- Invoice `items` stored as JSON string in shape `{ _items: [...], _taxAmount: N }`.
- Stock deduction (`store.tsx` ~L685): deducts only when status ≠ `مسودة` (draft) and ≠ `ملغاة` (cancelled). Bundles deduct each component × bundle qty. `Math.max(0, …)` clamps at 0 (oversell silently lost).
- **No purchase / stock-in / receiving flow exists** — stock only ever decreases via invoices or is set by manual product edits. This is the structural root cause of drift.

---

## Reconciliation results (physical vs system)

### Matching summary (by name)
- 67 exact name matches (71 products map to a physical line); 19 already match stock exactly.
- **54 items differ.** Almost all system > physical, in round numbers.
- **12 physical lines not in system** (new) — parked.
- **5 system products not counted:** `C400 Refillable Cartridge` (48), `Waste Ink Tank C6000` (30), `C5290 Belt` (30), `Epson C5890 WorkForce Pro Printer` (23), `EPSON WorkForce Pro WF-C5290DW` (10).
- **3 physical items counted in "طقم" (sets/kits)** not plain units: `EP 878/879 Dolan Kartuş = طقم5`, `TANK AMC 4000 = 7 طقم`, `Epson C5790 & C5890 Tank = 230 طقم`.

### Root-cause analysis of the matched-item gaps
**Bundles are NOT the cause** — all 19 bundle line items carried full components and deducted correctly.

Four patterns found:
- **Bucket 1 — stock high, ZERO recorded sales (12 items, +230 units, ~$499):** no invoice at all yet system > shelf → off-system sales or seed/data-entry over-entry. Round numbers (Eco Tank Sublimation all +35, GI-41 all +5, L805 Light +10).
- **Bucket 2 — sold heavily + residual gap (32 items, +2,465 units, ~$9,200):** the bulk of the value. Genuinely sold (V58.3 Cyan 1,046 sold; HP Magic Cyan 685), app deducted, residual gap = unrecorded sales/shrinkage.
- **Bucket 3 — physical HIGHER than system (8 items, −128 units):** EP 101 (×4, −25), EP 108 (×4, −7). Recorded "sold" (25/27) ≈ the negative gap → sale recorded but goods physically still present (not dispatched / returned / restock not entered).
- **Bucket 4 — already matching (19 items).**

**Net:** system overstates matched inventory by ≈ **$9,700**, understates by ≈ **$100**.

### Data-integrity red flags
- `Canon Pixma G3410 Printer`: **282 units recorded sold** — implausible; likely invoice quantity data-entry error. NOT yet verified per-invoice.
- High "sold" totals (V58.3 ~1,000, EP 3110 195) imply frequent restocking that was never entered (no stock-in flow).

---

## Open tasks / next steps
- [ ] (Suggested next) Pull per-invoice detail for suspicious lines (Canon 282, V58.3) to confirm data-entry errors.
- [ ] **Fix name mappings** between docx and system (the parked task). Unresolved questions:
  - C400: system has ONE `C400 Refillable Cartridge` (48) vs physical FOUR colors C/M/Y/K (28+28+27+18=101). Split into 4 SKUs, or sum into one? (101 > 48 → not a simple "sold" difference.)
  - `EPSON AMG C400 فضال جانبي` (10) = `Waste Ink Tank C6000`?
  - Printer model mapping: `EPSON C5390DW Pro` ↔ `Epson C5890 WorkForce Pro` or `WF-C5290DW`? `EPSON L8050 (color unit)` ↔ `Epson L8050 EcoTank`?
  - Leftover uncounted system items (`C5290 Belt` etc.) → sold-to-zero or missed-in-count?
- [ ] Decide where name fixes apply: mapping table (non-destructive, recommended) vs rename products in DB vs edit docx.
- [ ] Add the 12 genuinely-new items (Konica C257i line, Canon MF664cdw, AMG C400 family, etc.) — needs prices/categories/codes. **LAST task.**
- [ ] Apply final stock adjustment: bring system down to physical count once names are resolved.

## Notes
- No DB writes have been made yet — all work so far is read-only analysis.
- To re-run analysis: query Supabase directly with the anon key from `.env.local` (don't need the dev server running).
