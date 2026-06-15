# Counter — Supabase Backend Setup

This app now uses **Supabase** for real auth, a cloud database, and image
storage. Everything in the app talks to Supabase through the existing data
interfaces, so once the steps below are done the whole app is live and
multi-device. If the Supabase env vars are left blank, the app falls back to the
old local demo mode automatically.

Project: `https://akhwzgqerwpncphigzmt.supabase.co`

---

## 1. Apply the database schema (one time)

1. Open the Supabase dashboard → **SQL Editor** → **New query**.
2. Paste the entire contents of [`client/supabase/migrations/0001_init.sql`](client/supabase/migrations/0001_init.sql).
3. Click **Run**. It creates every table, Row Level Security policy, the atomic
   RPCs (sale/refund/etc.), and the `store-media` storage bucket.

> Re-running is safe — it uses `create table if not exists` / `create or replace`.

## 2. Verify the storage bucket

Dashboard → **Storage**. You should see a public bucket named **`store-media`**
(product photos and store logos upload here). If it's missing, re-run step 1.

## 3. Configure auth

Dashboard → **Authentication → Providers → Email**: make sure **Email** is
enabled.

For development, turn **off** "Confirm email" (Authentication → Sign In / Up):
sign-up then logs the user in immediately. Leave it on for production and users
will confirm via email first.

For password resets to work end-to-end, add your app's redirect URL under
**Authentication → URL Configuration** (e.g. your Expo deep link / web URL).

## 4. Client environment

`client/.env.local` is already created with your project URL and anon key:

```
EXPO_PUBLIC_SUPABASE_URL=https://akhwzgqerwpncphigzmt.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your anon key>
EXPO_PUBLIC_CHAT_API_URL=http://localhost:8787
```

The anon key is **safe to ship** in the app — Row Level Security is what
protects the data. Restart the Expo dev server after changing env files.

## 5. AI assistant server (optional, for the in-app chat)

The chat needs the FastAPI service in [`server/`](server/) deployed somewhere
(Render, Railway, Fly.io, a VPS…). To require sign-in for the assistant, set on
the server:

```
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://akhwzgqerwpncphigzmt.supabase.co
SUPABASE_ANON_KEY=<your anon key>
```

When both `SUPABASE_*` are set, `/chat` only answers requests carrying a valid
Supabase access token (the app attaches it automatically). Then point the app at
the deployed server by setting `EXPO_PUBLIC_CHAT_API_URL` in `client/.env.local`
to its URL.

---

## How it works (for future you)

- **Multi-tenancy:** every row carries a `store_id`; RLS restricts reads/writes
  to members of that store (`store_members`). The owner's membership is created
  with their store by the `create_store` RPC.
- **Atomic operations:** sales, refunds, receiving a purchase order, marking an
  installment paid, and stock adjustments run as Postgres functions, so multi-
  step changes (order + items + payments + ledger + stock + loyalty) commit
  together instead of as separate network calls.
- **Swap seam:** each `src/api/*.ts` exports `xApi = isSupabaseConfigured ? new
  SupabaseXApi() : new LocalXApi()`. The UI and React Query hooks are unchanged.
- **Auth/session:** `src/stores/auth.ts` and `src/stores/store-profile.ts` are
  backed by the Supabase session and the `stores` table when configured.

## Quick smoke test

1. `cd client && npx expo start`, open the app.
2. Sign up → complete onboarding. Check the dashboard: a row appears in `stores`
   and `store_members`.
3. Add a product with a photo → row in `products`/`product_variants`, file in
   the `store-media` bucket.
4. Ring up a sale → rows in `orders`, `order_items`, `payments`, `transactions`,
   `stock_movements`, and the variant's `stock_qty` drops.
5. Sign in on another device with the same account → the same data is there.
