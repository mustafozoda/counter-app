# notify-order — remote push for new orders

Sends an Expo push to the store owner's devices when a new row is inserted into
`public.orders`. Tokens come from the `device_tokens` table (migration
`0004_device_tokens.sql`).

## Prerequisites
1. Run migration `0004_device_tokens.sql` in the Supabase SQL editor.
2. The app must be a **dev/release build** (not Expo Go) with an EAS
   `projectId` set, so it can register a push token. From `client/`:
   ```bash
   npx eas init        # adds extra.eas.projectId to app.json
   ```
   Then rebuild: `npx expo run:android --variant release`.

## Deploy the function
From `client/` (needs the Supabase CLI + `supabase login`):
```bash
supabase functions deploy notify-order --project-ref akhwzgqerwpncphigzmt --no-verify-jwt
```
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

## Wire the trigger (Supabase dashboard)
**Database → Webhooks → Create a new hook**
- Table: `public.orders`
- Events: **Insert**
- Type: **Supabase Edge Functions** → `notify-order`

## Test
Make a sale in the app (creates an `orders` row) on a second signed-in device,
or insert a test row. The owner's device should receive the push. Check
**Edge Functions → notify-order → Logs** if it doesn't.
