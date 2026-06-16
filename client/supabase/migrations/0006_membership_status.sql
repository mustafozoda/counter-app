-- 0006_membership_status.sql — let a signed-in user learn if they're suspended.
--
-- After 0005, a suspended member fails `is_store_member`, so RLS hides their
-- store AND their store_members row — the app can't tell "suspended" apart from
-- "brand-new user with no store". This SECURITY DEFINER function reports the
-- caller's status so the app can show a proper "access suspended" screen instead
-- of the create-a-store onboarding.
--
-- Run once in the Supabase SQL editor, after 0005_staff_provisioning.sql.

create or replace function my_account_status()
returns text language sql security definer set search_path = public as $$
  select case
    when exists (select 1 from store_members where user_id = auth.uid() and active)     then 'active'
    when exists (select 1 from store_members where user_id = auth.uid() and not active)  then 'suspended'
    else 'none'
  end;
$$;

grant execute on function my_account_status() to authenticated;
