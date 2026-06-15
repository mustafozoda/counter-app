import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { createLocalId } from '@/lib/id';
import { persistStorage } from '@/lib/storage';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { uploadImage } from '@/lib/upload';
import { useAuthStore } from '@/stores/auth';
import { toast } from '@/stores/toast';
import type { ReceiptSettings, StaffRole, Store } from '@/types/models';

export interface StoreSetupInput {
  name: string;
  vertical: string;
  currencyCode: string;
  logoUri: string | null;
}

/** Captured during onboarding; Phase 1 turns it into the first real Product. */
export interface FirstProductDraft {
  name: string;
  price: number;
}

interface StoreProfileState {
  store: Store | null;
  firstProductDraft: FirstProductDraft | null;
  hasHydrated: boolean;
  completeSetup: (input: StoreSetupInput, firstProduct: FirstProductDraft | null) => void;
  clearFirstProductDraft: () => void;
  updateStore: (patch: Partial<Omit<Store, 'id' | 'createdAt'>>) => void;
  reset: () => void;
  setHasHydrated: (value: boolean) => void;
}

interface StoreRow {
  id: string;
  name: string;
  vertical: string;
  logo_url: string | null;
  currency_code: string;
  tax_rate: number;
  address: string | null;
  receipt: ReceiptSettings | null;
  created_at: string;
}

function rowToStore(row: StoreRow): Store {
  return {
    id: row.id,
    name: row.name,
    vertical: row.vertical,
    logoUrl: row.logo_url ?? null,
    currencyCode: row.currency_code,
    taxRate: Number(row.tax_rate ?? 0),
    address: row.address ?? null,
    receipt: row.receipt ?? { headerText: row.name, footerText: '', showLogo: true },
    createdAt: row.created_at,
  };
}

const localStore = (input: StoreSetupInput): Store => ({
  id: createLocalId(),
  name: input.name,
  vertical: input.vertical,
  logoUrl: input.logoUri,
  currencyCode: input.currencyCode,
  taxRate: 0,
  address: null,
  receipt: { headerText: input.name, footerText: 'Thank you for shopping with us!', showLogo: true },
  createdAt: new Date().toISOString(),
});

const creator = (
  set: (partial: Partial<StoreProfileState>) => void,
  get: () => StoreProfileState,
): StoreProfileState => ({
  store: null,
  firstProductDraft: null,
  hasHydrated: false,

  completeSetup: (input, firstProduct) => {
    if (!isSupabaseConfigured) {
      set({ store: localStore(input), firstProductDraft: firstProduct });
      return;
    }
    // Stash the draft now; create the store in the cloud, then upload the logo
    // (which needs the new store id), then publish the final store to state.
    set({ firstProductDraft: firstProduct });
    void (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;
        const { data, error } = await supabase.rpc('create_store', {
          p_name: input.name,
          p_vertical: input.vertical,
          p_currency_code: input.currencyCode,
          p_logo_url: null,
          p_owner_name: (session?.user.user_metadata?.name as string) ?? '',
          p_owner_email: session?.user.email ?? '',
        });
        if (error) throw error;
        let store = rowToStore(data as StoreRow);

        if (input.logoUri) {
          const logoUrl = await uploadImage(input.logoUri, store.id);
          const { error: logoErr } = await supabase
            .from('stores')
            .update({ logo_url: logoUrl })
            .eq('id', store.id);
          if (!logoErr) store = { ...store, logoUrl };
        }
        set({ store });
      } catch {
        toast.error('Setup failed', 'Could not create your store. Please try again.');
      }
    })();
  },

  clearFirstProductDraft: () => set({ firstProductDraft: null }),

  updateStore: (patch) => {
    const current = get().store;
    if (!current) return;
    // Optimistic local update so the UI responds immediately.
    set({ store: { ...current, ...patch } });
    if (!isSupabaseConfigured) return;

    void (async () => {
      try {
        let logoUrl = patch.logoUrl;
        if (typeof logoUrl === 'string' && !/^https?:\/\//i.test(logoUrl)) {
          logoUrl = await uploadImage(logoUrl, current.id);
          set({ store: { ...get().store!, logoUrl } });
        }
        const row: Record<string, unknown> = {};
        if (patch.name !== undefined) row.name = patch.name;
        if (patch.vertical !== undefined) row.vertical = patch.vertical;
        if (patch.currencyCode !== undefined) row.currency_code = patch.currencyCode;
        if (patch.taxRate !== undefined) row.tax_rate = patch.taxRate;
        if (patch.address !== undefined) row.address = patch.address;
        if (patch.receipt !== undefined) row.receipt = patch.receipt;
        if (logoUrl !== undefined) row.logo_url = logoUrl;
        await supabase.from('stores').update(row).eq('id', current.id);
      } catch {
        toast.error('Save failed', 'Could not save store settings.');
      }
    })();
  },

  reset: () => set({ store: null, firstProductDraft: null }),

  setHasHydrated: (value) => set({ hasHydrated: value }),
});

export const useStoreProfile = isSupabaseConfigured
  ? create<StoreProfileState>()((set, get) => creator(set, get))
  : create<StoreProfileState>()(
      persist((set, get) => creator(set, get), {
        name: 'counter.store-profile',
        storage: persistStorage,
        partialize: (state) => ({ store: state.store, firstProductDraft: state.firstProductDraft }),
        onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
      }),
    );

// Load the signed-in user's store from the cloud and keep it in sync with auth.
if (isSupabaseConfigured) {
  const syncFromSession = async (session: Session | null) => {
    if (!session) {
      useStoreProfile.setState({ store: null, firstProductDraft: null, hasHydrated: true });
      return;
    }
    const { data } = await supabase.from('stores').select('*').limit(1).maybeSingle();
    const store = data ? rowToStore(data as StoreRow) : null;
    if (store) {
      // Resolve the user's real role for this store and reflect it on the user
      // before we mark hydration done, so role-gated UI never flashes.
      const { data: member } = await supabase
        .from('store_members')
        .select('role')
        .eq('user_id', session.user.id)
        .limit(1)
        .maybeSingle();
      const role = (member as { role?: StaffRole } | null)?.role ?? 'owner';
      useAuthStore.setState((s) => (s.user ? { user: { ...s.user, role } } : {}));
    }
    useStoreProfile.setState({ store, hasHydrated: true });
  };

  void supabase.auth.getSession().then(({ data }) => syncFromSession(data.session));
  supabase.auth.onAuthStateChange((_event, session) => {
    void syncFromSession(session);
  });
}
