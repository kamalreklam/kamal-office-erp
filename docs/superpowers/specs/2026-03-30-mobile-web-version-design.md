# Mobile Web Version — Design Spec

## Overview

A mobile-optimized web experience for Kamal Office ERP, served from the same Next.js codebase. Desktop users see the current UI unchanged. Mobile users (screen width < 1024px) get a dedicated touch-first layout with bottom tab navigation, large text, and big buttons.

Same URL, same Supabase database, same business logic — different shell and component rendering.

## Decisions Made

| Decision | Choice | Rationale |
|---|---|---|
| Architecture | Option A — same codebase, device-based layout | One file per feature, no duplication |
| Navigation | Bottom tab bar (iOS-style) | Thumb-friendly, instant switching |
| Tabs | الرئيسية · المخزون · الفواتير · العملاء · المزيد | Balanced access to all core sections |
| Visual style | Light Glass (primary), dark mode available | Matches desktop Liquid Glass design |
| Invoice creation | Step-by-step wizard (4 steps) | Less overwhelming on small screen |
| Design language | Big text, big buttons, touch-first | No tiny desktop inputs on mobile |

## Priority Order

1. Mobile shell (detection + bottom tab bar + MobileShell component)
2. Create Invoice wizard (mobile-optimized, 4-step flow)
3. Inventory with stock report
4. Dashboard (KPIs + quick actions)
5. Invoice list + detail view
6. Clients list + detail
7. More menu (Orders, Bundles, Accounting, Reports, Settings)

## Architecture

### Device Detection

```
useIsMobile() hook
  - Uses window.innerWidth < 1024 (matches Tailwind `lg:` breakpoint)
  - SSR-safe: defaults to false, updates on mount
  - Listens to resize events (debounced)
```

### Shell Switching

```
Each page renders:
  <AppShell>        ← desktop (lg and above)
  <MobileShell>     ← mobile (below lg)

The page component checks useIsMobile() and renders the appropriate shell.
Alternatively: a single ResponsiveShell that switches internally.
```

### File Structure

```
src/
  hooks/
    use-is-mobile.ts          ← device detection hook
  components/
    mobile-shell.tsx           ← bottom tabs + mobile header
    mobile-tab-bar.tsx         ← the 5-tab bottom bar component
    mobile-header.tsx          ← top bar (title + notification bell)
    mobile-more-menu.tsx       ← "المزيد" full-screen menu
    invoice-wizard/
      wizard-shell.tsx         ← step indicator + navigation
      step-client.tsx          ← Step 1: select client
      step-products.tsx        ← Step 2: add products
      step-review.tsx          ← Step 3: review totals
      step-save.tsx            ← Step 4: confirm + save
```

No separate route groups. Each existing page (e.g., `src/app/invoices/page.tsx`) imports the mobile variant and renders conditionally.

## Mobile Shell

### Top Header
- Height: 56px
- Left: notification bell with badge
- Center: page title (bold, 18px)
- Right: hamburger menu (hidden, only for edge cases)
- Glass background with blur

### Bottom Tab Bar
- Height: 64px + safe area inset (for iPhone notch)
- 5 tabs with icon + Arabic label
- Active tab: blue icon + blue label + subtle top indicator line
- Inactive: gray icon + gray label
- Fixed at bottom, always visible
- Glass background
- Tabs:
  1. الرئيسية (LayoutDashboard icon)
  2. المخزون (Package icon)
  3. الفواتير (FileText icon)
  4. العملاء (Users icon)
  5. المزيد (MoreHorizontal icon)

### "المزيد" (More) Menu
- Full-screen overlay sliding up from bottom
- Large list items (56px height each) with icon + label
- Pages: تتبع الطلبات, مجموعات المنتجات, التقارير, المحاسبة, الإعدادات
- Close button at top

## Mobile Design Language

### Typography
- Page titles: 26-28px, font-weight 800
- Section headers: 20px, font-weight 700
- Body text: 18px (never smaller than 15px on mobile)
- Labels: 15px, muted color
- Numbers/prices: 20-22px, tabular-nums, bold

### Buttons
- Primary: min-height 56px, full-width, rounded-2xl, 18px font
- Secondary: min-height 52px, rounded-xl
- Touch targets: minimum 48x48px
- Active state: scale(0.97) spring animation

### Cards
- Rounded-2xl (16px radius)
- Padding: 16-20px
- Full-width (no side margins smaller than 12px)
- Subtle shadow, glass border

### Inputs
- Height: 52px minimum
- Font size: 18px (prevents iOS zoom on focus)
- Large clear buttons
- Rounded-xl (14px radius)

### Colors
- Same Liquid Glass variables as desktop
- Primary: #2563eb (blue)
- Background: #F0F5FF
- Cards: white with subtle shadow
- Dark mode follows system toggle

## Invoice Wizard (Priority 1)

### Step 1: Select Client
- Large search bar at top (48px height, 16px font)
- Client list as big cards (not tiny rows)
- Each card: avatar circle + name (18px bold) + phone + total spent
- Card height: ~72px, full-width
- Tap to select, selected shows blue check + blue border
- "متابعة" button at bottom (52px, full-width, blue)

### Step 2: Add Products
- Search bar at top
- Product cards: image + name (16px bold) + category + stock badge + price
- Tap product → opens quantity sheet (bottom sheet)
- Quantity sheet: product name, +/- stepper buttons (big, 48px), price input, "إضافة" button
- Added products show as chips/mini-cards below search
- Stock validation: 0-stock products grayed out with "نفذ" badge
- Quantity cannot exceed stock
- Bundle quick-add button at top
- "متابعة" button at bottom

### Step 3: Review & Totals
- List of added items (product name, qty × price = total)
- Swipe-to-remove on each item
- Subtotal, discount toggle, tax display
- Grand total in large bold text (24px)
- Discount: expandable section with type selector + input
- Notes: expandable text area

### Step 4: Save
- Summary card (client, items count, total)
- 3 large buttons stacked vertically:
  - مدفوعة (green, primary)
  - غير مدفوعة (blue, outline)
  - حفظ كمسودة (gray, outline)
- Each button 52px height, full-width, with icon

### Wizard Navigation
- Top progress bar: 4 dots/steps, current highlighted
- Back arrow in header (right side for RTL)
- Swipe left/right between steps (optional, nice-to-have)

## Inventory + Stock Report (Priority 2)

### Inventory List
- Search bar at top (48px)
- Category chips (horizontal scroll, wrapping)
- Products as cards (not table):
  - Product name (16px bold)
  - Category badge
  - Price (bold, blue)
  - Stock: large number with unit, red if low
  - Tap to expand: shows edit stock/price inline
- Pull-to-refresh gesture

### Stock Report
- Quick button on inventory page: "📊 تقرير المخزون"
- Shows: total products, total value, low stock count
- Category breakdown (bar chart or list)
- Export PDF button (uses existing PDF system)

## Dashboard (Priority 3)

### Mobile Dashboard Layout
- Greeting + business name at top
- 2 quick action buttons (full-width, stacked):
  - "+ فاتورة جديدة" (blue, primary)
  - "📊 تقرير المخزون" (outline)
- 2x2 stat cards grid (revenue, invoices, products, orders)
- Low stock alerts (cards, not table)
- Recent invoices (cards with tap-to-view)

## Shared Patterns

### Navigation
- All internal links use Next.js `<Link>` (no full page reloads)
- Page transitions via existing Framer Motion PageTransition component
- Back navigation: browser back button + explicit back arrows in headers

### Data
- Same Supabase store (useStore hook)
- Same data types, same API routes
- No data duplication

### Animations
- Page transitions: existing Framer Motion setup
- Bottom sheet: slide up from bottom with spring physics
- Tab switch: content fades in
- Buttons: scale spring on press
- Pull-to-refresh: native browser behavior

### PWA
- Existing manifest.json and service worker
- Add to homescreen works on both iOS and Android
- Standalone display mode (no browser chrome)
