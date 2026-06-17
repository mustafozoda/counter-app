import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { i18n } from '@/i18n';
import { getActiveStoreId } from '@/lib/active-store';
import { createLocalId } from '@/lib/id';
import { persistStorage } from '@/lib/storage';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import { useStoreProfile } from '@/stores/store-profile';
import type { StaffMember } from '@/types/models';

export type Permission =
  | 'sell'
  | 'manage_inventory'
  | 'view_finance'
  | 'use_assistant'
  | 'manage_staff'
  | 'manage_settings';

/** Role → permission matrix (§7 "role-based permissions"). The default a member
 *  starts with; the owner can override individual entries per member. */
export const ROLE_PERMISSIONS: Record<StaffMember['role'], Permission[]> = {
  owner: [
    'sell',
    'manage_inventory',
    'view_finance',
    'use_assistant',
    'manage_staff',
    'manage_settings',
  ],
  manager: ['sell', 'manage_inventory', 'view_finance', 'use_assistant'],
  cashier: ['sell', 'use_assistant'],
};

/** Permissions the owner can grant/revoke per member (owner-only ones excluded). */
export const ASSIGNABLE_PERMISSIONS: Permission[] = [
  'sell',
  'manage_inventory',
  'view_finance',
  'use_assistant',
];

export const PERMISSION_LABELS: Record<Permission, string> = {
  sell: 'Ring up sales',
  manage_inventory: 'Manage inventory',
  view_finance: 'View finances',
  use_assistant: 'Use assistant',
  manage_staff: 'Manage staff',
  manage_settings: 'Change settings',
};

export function roleHasPermission(role: StaffMember['role'], permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** Effective permission for a member: explicit override wins, else role default. */
export function effectivePermission(
  role: StaffMember['role'],
  overrides: Record<string, boolean> | undefined,
  permission: Permission,
): boolean {
  const override = overrides?.[permission];
  return override !== undefined ? override : roleHasPermission(role, permission);
}

/** Fields the owner sets when creating a brand-new staff login. */
export interface NewStaffInput {
  name: string;
  email: string;
  password: string;
  role: StaffMember['role'];
  phone?: string | null;
  title?: string | null;
  note?: string | null;
  avatarUrl?: string | null;
}

/** Fields the owner can change on an existing member (no password here). */
export interface StaffPatch {
  name?: string;
  email?: string;
  role?: StaffMember['role'];
  phone?: string | null;
  title?: string | null;
  note?: string | null;
  active?: boolean;
  avatarUrl?: string | null;
}

interface MemberRow {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  avatar_url: string | null;
  role: StaffMember['role'];
  phone: string | null;
  title: string | null;
  note: string | null;
  active: boolean;
  permissions: Record<string, boolean> | null;
}

const rowToMember = (row: MemberRow): StaffMember => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  email: row.email,
  avatarUrl: row.avatar_url ?? null,
  role: row.role,
  phone: row.phone ?? null,
  title: row.title ?? null,
  note: row.note ?? null,
  active: row.active ?? true,
  permissions: row.permissions ?? {},
});

/** Call the owner-only `manage-staff` Edge Function. Returns an error message
 *  to show the user, or null on success. */
async function manage(body: Record<string, unknown>): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke('manage-staff', { body });
  if (error) return i18n.t('staff.actionFailed');
  const detail = (data as { error?: string } | null)?.error;
  return detail ?? null;
}

interface StaffState {
  members: StaffMember[];
  hasHydrated: boolean;
  createStaff: (input: NewStaffInput) => Promise<string | null>;
  updateStaff: (memberId: string, patch: StaffPatch) => Promise<string | null>;
  setStaffPassword: (memberId: string, password: string) => Promise<string | null>;
  setMemberPermissions: (
    memberId: string,
    permissions: Record<string, boolean>,
  ) => Promise<string | null>;
  deleteStaff: (memberId: string) => Promise<string | null>;
  refresh: () => Promise<void>;
  setHasHydrated: (value: boolean) => void;
}

const creator = (
  set: (partial: Partial<StaffState>) => void,
  get: () => StaffState,
): StaffState => ({
  members: [],
  hasHydrated: false,

  createStaff: async (input) => {
    if (!isSupabaseConfigured) {
      set({
        members: [
          ...get().members,
          {
            id: createLocalId(),
            userId: createLocalId(),
            name: input.name,
            email: input.email,
            avatarUrl: input.avatarUrl ?? null,
            role: input.role,
            phone: input.phone ?? null,
            title: input.title ?? null,
            note: input.note ?? null,
            active: true,
            permissions: {},
          },
        ],
      });
      return null;
    }
    const error = await manage({ action: 'create', storeId: getActiveStoreId(), ...input });
    if (!error) await get().refresh();
    return error;
  },

  updateStaff: async (memberId, patch) => {
    if (!isSupabaseConfigured) {
      set({
        members: get().members.map((m) => (m.id === memberId ? { ...m, ...patch } : m)),
      });
      return null;
    }
    const error = await manage({ action: 'update', memberId, ...patch });
    if (!error) await get().refresh();
    return error;
  },

  setStaffPassword: async (memberId, password) => {
    if (!isSupabaseConfigured) return null;
    return manage({ action: 'password', memberId, password });
  },

  setMemberPermissions: async (memberId, permissions) => {
    if (!isSupabaseConfigured) {
      set({
        members: get().members.map((m) => (m.id === memberId ? { ...m, permissions } : m)),
      });
      return null;
    }
    // Owner-only by RLS (members_update) — a direct update is enough.
    const { error } = await supabase
      .from('store_members')
      .update({ permissions })
      .eq('id', memberId);
    if (error) return i18n.t('staff.actionFailed');
    await get().refresh();
    return null;
  },

  deleteStaff: async (memberId) => {
    if (!isSupabaseConfigured) {
      set({ members: get().members.filter((m) => m.id !== memberId) });
      return null;
    }
    const error = await manage({ action: 'delete', memberId });
    if (!error) await get().refresh();
    return error;
  },

  refresh: async () => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase
      .from('store_members')
      .select('id, user_id, name, email, avatar_url, role, phone, title, note, active, permissions')
      .order('created_at');
    if (data) set({ members: (data as MemberRow[]).map(rowToMember) });
  },

  setHasHydrated: (value) => set({ hasHydrated: value }),
});

export const useStaffStore = isSupabaseConfigured
  ? create<StaffState>()((set, get) => creator(set, get))
  : create<StaffState>()(
      persist((set, get) => creator(set, get), {
        name: 'counter.staff',
        storage: persistStorage,
        partialize: (state) => ({ members: state.members }),
        onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
      }),
    );

/** Reactive effective-permission check for the signed-in user (role + overrides). */
export function usePermission(permission: Permission): boolean {
  const role = useAuthStore((s) => s.user?.role ?? 'cashier');
  const overrides = useAuthStore((s) => s.user?.permissions);
  return effectivePermission(role, overrides, permission);
}

// Reload the staff list whenever the active store changes (e.g. after sign-in).
if (isSupabaseConfigured) {
  let lastStoreId: string | null = null;
  useStoreProfile.subscribe((state) => {
    const id = state.store?.id ?? null;
    if (id !== lastStoreId) {
      lastStoreId = id;
      if (id) void useStaffStore.getState().refresh();
      else useStaffStore.setState({ members: [] });
    }
  });
}
