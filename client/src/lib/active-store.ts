import { useStoreProfile } from '@/stores/store-profile';

/**
 * Id of the store the signed-in user is operating. Supabase API
 * implementations stamp this onto every insert; RLS scopes reads to it.
 *
 * Reads straight from the store-profile zustand store (set right after the
 * session loads the user's store), so the data APIs stay free of React.
 */
export function getActiveStoreId(): string {
  const storeId = useStoreProfile.getState().store?.id;
  if (!storeId) throw new Error('No active store — sign in and complete setup first.');
  return storeId;
}
