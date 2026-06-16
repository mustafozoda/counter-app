# manage-staff — owner-provisioned staff accounts

Lets the **store owner** create staff logins (email + password), reset
passwords, edit info/role, suspend, and delete — using the Supabase Admin API.
This needs the **service-role key**, which is why it runs server-side here and
**never** in the app. Every call verifies the caller is an active `owner` of the
target store first.

## Prerequisites
- Run migration `0005_staff_provisioning.sql` in the Supabase SQL editor.

## Deploy
From `client/` (needs the Supabase CLI + `supabase login`):
```bash
supabase functions deploy manage-staff --project-ref akhwzgqerwpncphigzmt
```
> Deploy **without** `--no-verify-jwt`: the function reads the caller's token to
> confirm they're the owner, so a valid login is required.

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are injected
automatically — no secrets to set.

## Actions (the app calls these via `supabase.functions.invoke('manage-staff', …)`)
| action | payload | effect |
|---|---|---|
| `create` | `storeId, name, email, password, role, phone?, title?, note?, avatarUrl?` | creates the auth user (email pre-confirmed) + the `store_members` row |
| `update` | `memberId, name?, email?, role?, phone?, title?, note?, active?, avatarUrl?` | edits the member; syncs auth email/name |
| `password` | `memberId, password` | resets that member's password |
| `delete` | `memberId` | removes the member (and the auth account if unused elsewhere) |

Owners can't change their own role, deactivate themselves, or delete themselves
(lock-out protection).
