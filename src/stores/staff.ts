import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { createLocalId } from '@/lib/id';
import { persistStorage } from '@/lib/storage';
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

interface StaffState {
  members: StaffMember[];
  hasHydrated: boolean;
  saveMember: (input: StaffInput) => void;
  removeMember: (id: string) => void;
  setHasHydrated: (value: boolean) => void;
}

export const useStaffStore = create<StaffState>()(
  persist(
    (set) => ({
      members: [],
      hasHydrated: false,
      saveMember: (input) =>
        set((state) => {
          if (input.id) {
            return {
              members: state.members.map((m) =>
                m.id === input.id ? { ...m, name: input.name, email: input.email, role: input.role } : m,
              ),
            };
          }
          const member: StaffMember = {
            id: createLocalId(),
            name: input.name,
            email: input.email,
            avatarUrl: null,
            role: input.role,
          };
          return { members: [...state.members, member] };
        }),
      removeMember: (id) => set((state) => ({ members: state.members.filter((m) => m.id !== id) })),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'counter.staff',
      storage: persistStorage,
      partialize: (state) => ({ members: state.members }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);
