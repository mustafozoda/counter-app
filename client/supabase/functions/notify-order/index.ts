// Supabase Edge Function: notify-order
//
// Triggered by a Database Webhook on INSERT into `public.orders`. Looks up the
// store's owner(s) and sends an Expo push to their registered devices so they
// hear about a new order even when the app is closed.
//
// Deploy + wire-up steps are in ./README.md.
//
// Runs on Deno (not part of the React Native app) — this file is excluded from
// the app's tsconfig.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async (req: Request): Promise<Response> => {
  try {
    const payload = await req.json();
    // Supabase DB webhooks send { type, table, record, old_record }.
    const record = payload.record ?? payload.new ?? null;
    const storeId: string | undefined = record?.store_id;
    if (!storeId) return new Response('no store_id', { status: 200 });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      // Service-role key bypasses RLS so we can read owners' tokens.
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: members } = await supabase
      .from('store_members')
      .select('user_id')
      .eq('store_id', storeId)
      .eq('role', 'owner');
    const ownerIds = (members ?? []).map((m: { user_id: string }) => m.user_id);
    if (ownerIds.length === 0) return new Response('no owners', { status: 200 });

    const { data: tokens } = await supabase
      .from('device_tokens')
      .select('token')
      .in('user_id', ownerIds);

    const messages = (tokens ?? [])
      .map((t: { token: string }) => t.token)
      .filter((tk: string) => typeof tk === 'string' && tk.startsWith('ExponentPushToken'))
      .map((tk: string) => ({
        to: tk,
        sound: 'default',
        title: 'New order',
        body: record.number ? `Order ${record.number} just came in.` : 'You have a new order.',
        data: { orderId: record.id },
      }));
    if (messages.length === 0) return new Response('no tokens', { status: 200 });

    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });

    return new Response('ok', { status: 200 });
  } catch (err) {
    // Always 200 so the webhook doesn't retry-storm; log for debugging.
    console.error('notify-order error', err);
    return new Response('error', { status: 200 });
  }
});
