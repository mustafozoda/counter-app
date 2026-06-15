import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { getActiveStoreId } from '@/lib/active-store';
import { createLocalId } from '@/lib/id';
import { persistStorage } from '@/lib/storage';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useStoreProfile } from '@/stores/store-profile';
import type { StaffMember } from '@/types/models';

export type Permission =
  | 'sell'
  | 'manage_inventory'
  | 'view_finance'
  | 'manage_staff'
  | 'manage_settings';

/** Role → permission matrix (§7 "role-based permissions"). */
export const ROLE_PERMISSIONS: Record<StaffMember['role'], Permission[]> = {
  owner: ['sell', 'manage_inventory', 'view_finance', 'manage_staff', 'manage_settings'],
  manager: ['sell', 'manage_inventory', 'view_finance'],
  cashier: ['sell'],
};

export const PERMISSION_LABELS: Record<Permission, string> = {
  sell: 'Ring up sales',
  manage_inventory: 'Manage inventory',
  view_finance: 'View finances',
  manage_staff: 'Manage staff',
  manage_settings: 'Change settings',
};

export function roleHasPermission(role: StaffMember['role'], permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export interface StaffInput {
  id?: string;
  name: string;
  email: string;
  role: StaffMember['role'];
}

interface MemberRow {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  role: StaffMember['role'];
}

const rowToMember = (row: MemberRow): StaffMember => ({
  id: row.id,
  name: row.name,
  email: row.email,
  avatarUrl: row.avatar_url ?? null,
  role: row.role,
});

interface StaffState {
  members: StaffMember[];
  hasHydrated: boolean;
  saveMember: (input: StaffInput) => void;
  removeMember: (id: string) => void;
  refresh: () => Promise<void>;
  setHasHydrated: (value: boolean) => void;
}

const creator = (
  set: (partial: Partial<StaffState>) => void,
  get: () => StaffState,
): StaffState => ({
  members: [],
  hasHydrated: false,

  saveMember: (input) => {
    if (!isSupabaseConfigured) {
      set(
        input.id
          ? {
              members: get().members.map((m) =>
                m.id === input.id
                  ? { ...m, name: input.name, email: input.email, role: input.role }
                  : m,
              ),
            }
          : {
              members: [
                ...get().members,
                {
                  id: createLocalId(),
                  name: input.name,
                  email: input.email,
                  avatarUrl: null,
                  role: input.role,
                },
              ],
            },
      );
      return;
    }
    void (async () => {
      if (input.id) {
        await supabase
          .from('store_members')
          .update({ name: input.name, email: input.email, role: input.role })
          .eq('id', input.id);
      } else {
        await supabase.from('store_members').insert({
          store_id: getActiveStoreId(),
          name: input.name,
          email: input.email,
          role: input.role,
        });
      }
      await get().refresh();
    })();
  },

  removeMember: (id) => {
    if (!isSupabaseConfigured) {
      set({ members: get().members.filter((m) => m.id !== id) });
      return;
    }
    void (async () => {
      await supabase.from('store_members').delete().eq('id', id);
      await get().refresh();
    })();
  },

  refresh: async () => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase.from('store_members').select('*').order('created_at');
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
