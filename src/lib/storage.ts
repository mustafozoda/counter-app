import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

/**
 * Key-value persistence behind a single seam.
 *
 * AsyncStorage keeps the app runnable in Expo Go today; swap the adapter for
 * react-native-mmkv in a dev build (it is JSI-only) without touching any
 * store — every consumer goes through `persistStorage`.
 */
export const persistStorage = createJSONStorage(() => AsyncStorage);
