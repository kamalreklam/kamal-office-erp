# 📋 Kamal Office Redesign: Hand-off & Session Continuity Guide

> [!IMPORTANT]
> This document serves as a complete history, context guide, and next-step checklist for any incoming AI assistant to continue the project without loss of context. **Please update and maintain this file at each step.**

---

## 🚀 1. Project Objective & Vision
Overhaul and modernize the Kamal Office ERP system inside `D:\PROJECTS\kamal-office-new`. Create a pixel-perfect Google Material Design 3 (M3) Right-to-Left (RTL) Arabic layout. 
**Avoid generic shadcn components, gray placeholder boxes, or basic alignments.** Build custom, visually stunning components, smooth micro-animations, vibrant gradients, HSL tailored colors, and rounded corners (24px-28px) for an outstanding user experience.

---

## 🎨 2. Design System & Constraints (Non-Negotiable)
- **Palette**: No dark mode toggle; locked to premium warm grey-lavender surface (`#F8F9FA` or HSL `(240, 15%, 97%)`), pure white surfaces, and vibrant indigo accent (`#4F46E5`), alongside dynamic CMYK ink color dots.
- **Typography**: Minimum font size is **14px**; font family is exclusively **IBM Plex Sans Arabic** (Western Arabic digits `1, 2, 3` only; no Hindi digits).
- **RTL Support**: Sidebar is on the right, layout is fully RTL (`dir="rtl"`).
- **Supabase Rules**: DO NOT modify the Supabase database schema or perform database migrations. All logic must be handled on the client side.

---

## ⚙️ 3. Environment & Active State
- **Workspace Location**: `D:\PROJECTS\kamal-office-new` (Never edit files directly inside `d:\Kamal\kamal-office`).
- **Local Dev Server**: Runs on `http://localhost:3000` (`npm run dev`).
- **Database Backend**: Connected to Supabase backend `https://pajjacoachbzjsdzoheg.supabase.co`.

---

## 🛠️ 4. Active Milestone & Planned Architecture
We are rewriting all core pages from scratch to implement Material Design 3 layout.

### A. Dashboard (`src/app/page.tsx` & `src/components/mobile/mobile-dashboard.tsx`)
- [x] **Completed**: Replaced standard stats elements with Material Design 3 cards, bento grids, welcome hero banner with CMYK glows, clean rounded borders, and custom Arabic status pills.

### B. Invoices (`src/app/invoices/page.tsx`, `/new/page.tsx` & `/components/mobile/mobile-invoices.tsx`)
- [x] **Completed Stats**: Summary cards at the top of the Invoices page match the dashboard stats card style (`min-h-[140px]`, icon on top left, title + value, bottom metadata row).
- [x] **Completed Sharing & Action Suite**: Added sharing as PDF, PNG image (via `html2canvas` module), WhatsApp text formatted template, and quick Edit links. Integrated into the Desktop preview panel and Mobile details bottom sheet (`InvoiceSheet`).
- [x] **Completed Margin Analysis**: Added estimated cost, expected net profit, and profit margin percentage analysis dynamically calculated from item costs to both Desktop and Mobile views.
- **Next Up**: Refactor invoice creator wizard layout.

### C. Clients (`src/app/clients/page.tsx` & `/app/clients/[id]/page.tsx`)
- [x] **Completed Stats**: Adjusted VIP Leaderboard cards at the top of the Clients page to match the dashboard stats cards style (`min-h-[140px]`).
- [x] **Completed Sharing & Action Suite**: Added sharing as PDF statement, PNG image card capture, WhatsApp text formatted template, and Edit client link. Available in Desktop preview panel and Mobile client detail page.

### D. Inventory (`src/app/inventory/page.tsx` & `/components/mobile/mobile-inventory.tsx`)
- [x] **Completed Sharing & Actions**: Grid cards on PC and Mobile product cards now feature WhatsApp description sharing and PNG card capture/export.
- [x] **Completed Stock Management**: Dynamic stock level progress bars, SKU category filters, and quick inline editing.

### E. Accounting & Financials (`src/app/accounting/page.tsx` & `/components/mobile/mobile-accounting.tsx`)
- [x] **Completed P&L Image Sharing**: Capture P&L statements as PNG images.
- [x] **Completed WhatsApp Sharing**: WhatsApp text summary of active financial KPIs (revenue, collected, outstanding, tax summaries).
- [x] **Completed Type Safety**: Resolved undefined properties (`clientBalances` and `taxSummary`) inside the Desktop component to restore type safety.

### F. Reports (`src/app/reports/page.tsx`)
- [x] **Completed Layout Restoration**: Corrected missing page closing tags and restored the Quick Stats Footer (Total Clients, Products, Active Orders) within the capturable reports section.

---

## 🎯 5. Step-by-Step Instructions for the Next AI Assistant
1. **Read `implementation_plan.md`** and review current layout screenshots to align with the visual style.
2. Edit **only** files under `D:\PROJECTS\kamal-office-new`.
3. When you make changes, verify that the project still builds using `npm run build`.
4. Keep this hand-off file (`handoff-continuity.md`) updated with each step you complete and what you plan to do next.
