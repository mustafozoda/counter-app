-- 0010_member_realtime.sql — live permission updates + live suspend logout.
--
-- Each member's app subscribes (Supabase Realtime) to their own store_members
-- row. When the owner changes their permissions/role it applies live; when the
-- owner suspends them they're signed out instantly.
--
-- Two things are needed: (1) a member must be able to SELECT their OWN row even
-- when suspended, so Realtime can deliver the suspend event; (2) the table must
-- be in the realtime publication.
--
-- Run once in the Supabase SQL editor, after 0009_member_permissions.sql.

drop policy if exists members_self_select on store_members;
create policy members_self_select on store_members
  for select using (user_id = auth.uid());

-- Add to the realtime publication (ignore if already present so it's re-runnable).
do $$
begin
  alter publication supabase_realtime add table store_members;
exception
  when others then null;
end $$;
