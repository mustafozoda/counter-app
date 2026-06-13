# Counter — a Retail Operating System

One app to run an independent shop end-to-end: stock products, sell in person
(POS) and online, finance purchases with installments, and watch revenue,
expenses and profit in real time.

Built with **Expo SDK 54 · TypeScript (strict) · Expo Router · NativeWind v4 ·
Reanimated 4 · Zustand · TanStack Query · React Hook Form + Zod**.

## Run it

```bash
npm install
npx expo start          # press i / a, or scan with Expo Go
```

```bash
npm run typecheck       # tsc --noEmit
npm test                # jest
npm run lint            # expo lint
```

## Design system — "Counter DS"

- **Tokens** live in two synced layers: CSS variables in `global.css`
  (consumed by Tailwind classes like `bg-surface`, `text-ink`) and TypeScript
  mirrors in `src/theme/` for imperative APIs (icons, shadows, gradients,
  charts). Light & dark are both first-class; switching is instant via the
  Appearance override (More → Appearance).
- **Typography**: Space Grotesk (display numbers), Inter (UI), Space Mono
  (SKUs/codes) — loaded per-weight through `expo-font`. Money always renders
  with tabular figures. To swap in Clash Display/Satoshi later, drop TTFs in
  `assets/fonts/` and remap `src/theme/typography.ts`.
- **Motion**: spring-based (`src/theme/motion.ts`), staggered list entrances,
  count-up money counters driven on the UI thread, DS-wide haptic map.
- **Primitives** (`src/components/ui`): Button, IconButton, Card, StatCard
  (animated count-up + sparkline), Text, TextField (floating label), Chip,
  SegmentedControl, ProgressBar, Skeleton, EmptyState, Toast, Sheet,
  CurrencyText, AnimatedNumber, Sparkline, Logo, Screen, FloatingTabBar.

## Architecture

```
/app                    # Expo Router routes
  /(auth)               # sign-in · sign-up · forgot-password
  onboarding.tsx        # store-setup wizard (5 steps + success)
  /(merchant)
    /(tabs)             # Home · Products · [Sell] · Orders · More
    sell.tsx            # POS modal (Phase 2)
/src
  /components/ui        # Counter DS primitives
  /features             # feature modules (auth, onboarding, dashboard…)
  /stores               # zustand: auth, store-profile, preferences, toast
  /theme                # tokens: colors, type, spacing, shadows, motion
  /lib                  # formatters, haptics, storage seam, ids
  /api                  # TanStack Query client (Supabase adapter later)
  /types                # core domain model (§ data model)
  /constants            # currencies, store verticals
```

State strategy: TanStack Query for server data (wired in later phases),
Zustand for session/UI state (persisted via a storage seam —
AsyncStorage today, MMKV-ready), SQLite + sync engine arriving with the
offline-first POS phase.

## Roadmap

- [x] **Phase 0** — design system, navigation shell, auth, onboarding wizard
- [x] **Phase 1** — inventory: products, categories, variants, barcode, low stock
- [ ] **Phase 2** — POS: cart, checkout, receipts, offline
- [ ] **Phase 3** — orders & customers (CRM)
- [ ] **Phase 4** — dashboard + finance/bookkeeping
- [ ] **Phase 5** — customer financing / installments (flagship)
- [ ] **Phase 6** — suppliers/PO, promotions, analytics
- [ ] **Phase 7** — online storefront
- [ ] **Phase 8** — settings, staff/roles, notifications, i18n, sync hardening
