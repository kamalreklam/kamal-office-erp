# Vuexy Admin Migration — Progress Tracker

**Goal:** Total framework replacement from custom "liquid glass" shell → Vuexy Admin v10.11.1 (MUI v7 + RTL + Arabic)

**Vuexy source:** `C:\Users\ihima\OneDrive\Desktop\vuexy-admin-v10.11.1\nextjs-version\typescript-version\starter-kit\src\`

---

## What's Done ✅

### Infrastructure
- [x] MUI v7 + Emotion + stylis-plugin-rtl + react-perfect-scrollbar installed
- [x] Vuexy framework files copied: `src/@core/`, `src/@layouts/`, `src/@menu/`
- [x] `src/configs/themeConfig.ts` — set to `appName: 'Kamal Office'`, `mode: 'system'`
- [x] `src/types/menuTypes.ts` — Vuexy menu type definitions
- [x] `src/components/Providers.tsx` — async server component wrapping theme + settings + nav providers
- [x] `src/components/theme/index.tsx` — MUI ThemeProvider with `cssVariables: { colorSchemeSelector: 'data' }` + RTL cache
- [x] `src/components/layout/vertical/` — Navigation, Navbar, NavbarContent, FooterContent, VerticalMenu
- [x] tsconfig.json path aliases: `@core/*`, `@layouts/*`, `@menu/*`, `@assets/*`, `@configs/*`
- [x] Arabic vertical nav in `src/data/navigation/verticalMenuData.tsx` (9 items)
- [x] `src/app/(dashboard)/layout.tsx` — Vuexy VerticalLayout with RTL Providers + StoreProvider + Toaster
- [x] Root `src/app/layout.tsx` — simplified (font only, no shell)
- [x] All 21 pages moved to `src/app/(dashboard)/`
- [x] Old shell components deleted (app-shell, app-sidebar, responsive-shell, mobile/*)
- [x] TypeScript build passes ✓

### Pages Rewritten to Pure MUI
- [x] `src/app/(dashboard)/page.tsx` — Dashboard (KPI cards, charts)
- [x] `src/app/(dashboard)/inventory/page.tsx` — Data grid, stock badges
- [x] `src/app/(dashboard)/invoices/page.tsx` — Invoice list, status chips
- [x] `src/app/(dashboard)/clients/page.tsx` — Grid/list toggle, Avatar initials
- [x] `src/app/(dashboard)/orders/page.tsx` — Kanban + list view
- [x] `src/app/(dashboard)/bundles/page.tsx` — Mixed product bundles
- [x] `src/app/(dashboard)/reports/page.tsx` — KPIs, Recharts, LinearProgress bars
- [x] `src/app/(dashboard)/accounting/page.tsx` — P&L table, aging grid
- [x] `src/app/(dashboard)/settings/page.tsx` — Switch toggles, Accordion, Chip tags

### MUI v7 API Fixes Applied
- [x] `fontWeight` prop → `sx={{ fontWeight: N }}` (20+ instances across accounting, inventory, invoices)
- [x] `InputProps` → `slotProps={{ input: { startAdornment: ... } }}`
- [x] `InputLabelProps` → `slotProps={{ inputLabel: { shrink: true } }}`
- [x] `inputProps` → `slotProps={{ htmlInput: { dir: 'ltr', min, max } }}`

---

## What Needs Fixing 🔴

### 1. Visual Appearance — Wrong Colors / Dark Mode Issue
**Problem:** App renders in dark mode (system pref) with gray circles for icon Avatars instead of Vuexy's colored boxes.

**Root cause:** `primary.lightOpacity` tokens are defined as `'rgb(var(--mui-palette-primary-mainChannel) / 0.16)'` but the `[data-mui-color-scheme]` attribute is never written to `<html>` at SSR time, so MUI's CSS vars don't initialize.

**Fix needed:**
- Add `InitColorSchemeScript` from `@mui/material/InitColorSchemeScript` to `src/app/layout.tsx`
- The attribute must be `"data"` (not `"class"`) to match `colorSchemeSelector: 'data'` in ThemeProvider
- Example:
  ```tsx
  import { InitColorSchemeScript } from '@mui/material/InitColorSchemeScript'
  // Inside <head>:
  <InitColorSchemeScript attribute="data" defaultMode="light" />
  ```

### 2. Vuexy Customizer — Not Yet Added
**Problem:** The gear icon (Vuexy Customizer) is in `src/@core/components/customizer/` but is NOT rendered in `(dashboard)/layout.tsx`.

**Fix needed:**
- Import `Customizer` from `@core/components/customizer`
- Add `<Customizer dir="rtl" />` inside the dashboard layout
- Customizer lets users toggle: light/dark mode, skin (default/bordered/semi-dark), color scheme, layout (vertical/horizontal), navbar/footer fixed options

### 3. Detail / Form Pages — Not Yet Rewritten
These pages still use shadcn/old design components and need full MUI rewrite:

| Page | File |
|------|------|
| New Invoice | `src/app/(dashboard)/invoices/new/page.tsx` |
| Invoice Detail | `src/app/(dashboard)/invoices/[id]/page.tsx` |
| New Client | `src/app/(dashboard)/clients/new/page.tsx` |
| Client Detail | `src/app/(dashboard)/clients/[id]/page.tsx` |
| New Product | `src/app/(dashboard)/inventory/new/page.tsx` |
| Product Detail | `src/app/(dashboard)/inventory/[id]/page.tsx` |
| New Order | `src/app/(dashboard)/orders/new/page.tsx` |
| New Bundle | `src/app/(dashboard)/bundles/new/page.tsx` |
| Edit Bundle | `src/app/(dashboard)/bundles/[id]/edit/page.tsx` |

### 4. Mobile Layout
The mobile-specific components were deleted but mobile responsiveness via MUI's responsive system hasn't been fully verified. Needs testing at 375px.

---

## Vuexy Palette Reference

Primary: `#7367F0`  
Success: `#28C76F`  
Warning: `#FF9F43`  
Error: `#EA5455`  
Info: `#00CFE8`  

Custom opacity tokens (in `colorSchemes.ts`):
- `primary.lightOpacity` = `rgb(var(--mui-palette-primary-mainChannel) / 0.16)`
- `primary.lighterOpacity` = `rgb(var(--mui-palette-primary-mainChannel) / 0.08)`
- Same pattern for success, warning, error, info

These ONLY work when `[data-mui-color-scheme]` is on `<html>` (fixed by adding `InitColorSchemeScript`).

---

## Next Steps (Priority Order)

1. **Add `InitColorSchemeScript`** to `src/app/layout.tsx` → fixes color token resolution
2. **Add Customizer** to `(dashboard)/layout.tsx` → gives light/dark/skin toggle UI
3. **Verify visual match** with Vuexy reference at localhost:5176
4. **Rewrite form/detail pages** (9 pages listed above) with MUI
5. **Mobile responsiveness** testing + fixes
6. **Deploy** to Vercel after all pages pass visual check

---

## Key Files

| Purpose | File |
|---------|------|
| Dashboard layout | `src/app/(dashboard)/layout.tsx` |
| Root layout | `src/app/layout.tsx` |
| Theme setup | `src/components/theme/index.tsx` |
| Core theme tokens | `src/@core/theme/index.ts` |
| Color schemes | `src/@core/theme/colorSchemes.ts` |
| Theme config | `src/configs/themeConfig.ts` |
| Nav data | `src/data/navigation/verticalMenuData.tsx` |
| Providers | `src/components/Providers.tsx` |
| Customizer | `src/@core/components/customizer/index.tsx` |
| Vertical nav | `src/components/layout/vertical/VerticalMenu.tsx` |
| Navbar | `src/components/layout/vertical/NavbarContent.tsx` |
