// Supabase Edge Function: manage-staff
//
// Owner-provisioned staff accounts. The owner creates each staff login +
// password (and can reset it / edit info / suspend / delete) — operations that
// need the Admin API + service-role key, which must never live in the app.
//
// Every call verifies the CALLER is an active `owner` of the target store before
// doing anything. Deploy + usage in ./README.md.
//
// Deno runtime — excluded from the app's tsconfig.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

// Business/permission errors return 200 with { error } so the app can read the
// message straight off `data.error` (supabase-js hides non-2xx bodies).
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

const ROLES = ['owner', 'manager', 'cashier'];

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization' });

    // 1) Who is calling? (their JWT)
    const caller = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await caller.auth.getUser();
    if (!user) return json({ error: 'Invalid session' });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const body = await req.json();
    const action = String(body.action ?? '');

    // 2) Resolve target store (+ member row for member-scoped actions).
    let storeId: string | undefined = body.storeId;
    let member: { id: string; store_id: string; user_id: string | null } | null = null;
    if (body.memberId) {
      const { data } = await admin
        .from('store_members')
        .select('id, store_id, user_id')
        .eq('id', body.memberId)
        .maybeSingle();
      if (!data) return json({ error: 'Member not found' });
      member = data;
      storeId = data.store_id;
    }
    if (!storeId) return json({ error: 'Missing store' });

    // 3) Caller must be an ACTIVE OWNER of this store.
    const { data: ownerRow } = await admin
      .from('store_members')
      .select('id')
      .eq('store_id', storeId)
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .eq('active', true)
      .maybeSingle();
    if (!ownerRow) return json({ error: 'Only the owner can manage staff' });

    // --- create -------------------------------------------------------------
    if (action === 'create') {
      const { name, email, password, role, phone, title, note, avatarUrl } = body;
      if (!name || !email || !password) {
        return json({ error: 'Name, email and password are required' });
      }
      if (!ROLES.includes(role)) return json({ error: 'Invalid role' });

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });
      if (createErr || !created.user) {
        return json({ error: createErr?.message ?? 'Could not create account' });
      }

      const { error: memErr } = await admin.from('store_members').insert({
        store_id: storeId,
        user_id: created.user.id,
        name,
        email,
        role,
        phone: phone ?? null,
        title: title ?? null,
        note: note ?? null,
        avatar_url: avatarUrl ?? null,
        active: true,
      });
      if (memErr) {
        await admin.auth.admin.deleteUser(created.user.id); // roll back orphan
        return json({ error: memErr.message });
      }
      return json({ ok: true });
    }

    if (!member) return json({ error: 'Missing member' });
    const isSelf = member.user_id === user.id;

    // --- update info --------------------------------------------------------
    if (action === 'update') {
      const { name, email, role, phone, title, note, active, avatarUrl } = body;
      if (isSelf && role && role !== 'owner') return json({ error: "You can't change your own role" });
      if (isSelf && active === false) return json({ error: "You can't deactivate yourself" });
      if (role !== undefined && !ROLES.includes(role)) return json({ error: 'Invalid role' });

      if (member.user_id) {
        const authPatch: Record<string, unknown> = {};
        if (email) {
          authPatch.email = email;
          authPatch.email_confirm = true;
        }
        if (name) authPatch.user_metadata = { name };
        if (Object.keys(authPatch).length > 0) {
          const { error } = await admin.auth.admin.updateUserById(member.user_id, authPatch);
          if (error) return json({ error: error.message });
        }
      }

      const patch: Record<string, unknown> = {};
      if (name !== undefined) patch.name = name;
      if (email !== undefined) patch.email = email;
      if (role !== undefined) patch.role = role;
      if (phone !== undefined) patch.phone = phone;
      if (title !== undefined) patch.title = title;
      if (note !== undefined) patch.note = note;
      if (active !== undefined) patch.active = active;
      if (avatarUrl !== undefined) patch.avatar_url = avatarUrl;
      const { error } = await admin.from('store_members').update(patch).eq('id', member.id);
      if (error) return json({ error: error.message });
      return json({ ok: true });
    }

    // --- reset password -----------------------------------------------------
    if (action === 'password') {
      if (!body.password) return json({ error: 'Password required' });
      if (!member.user_id) return json({ error: 'This member has no account yet' });
      const { error } = await admin.auth.admin.updateUserById(member.user_id, {
        password: body.password,
      });
      if (error) return json({ error: error.message });
      return json({ ok: true });
    }

    // --- delete -------------------------------------------------------------
    if (action === 'delete') {
      if (isSelf) return json({ error: "You can't remove yourself" });
      await admin.from('store_members').delete().eq('id', member.id);
      if (member.user_id) {
        // Delete the auth account only if it isn't used by another store.
        const { data: others } = await admin
          .from('store_members')
          .select('id')
          .eq('user_id', member.user_id)
          .limit(1);
        if (!others || others.length === 0) {
          await admin.auth.admin.deleteUser(member.user_id);
        }
      }
      return json({ ok: true });
    }

    return json({ error: 'Unknown action' });
  } catch (err) {
    console.error('manage-staff error', err);
    return json({ error: 'Server error' }, 500);
  }
});
