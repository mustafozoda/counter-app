import { create } from 'zustand';

/**
 * Hand-off between the barcode scanner modal and whoever opened it.
 *
 * - `find`: catalog lookup — the scanner resolves the code itself and
 *   navigates to the product (or offers to create one).
 * - `capture`: form fill — the scanner returns the raw code to the caller
 *   and closes.
 *
 * Callbacks are transient UI state; never persisted.
 */
export type ScanRequest =
  | { mode: 'find' }
  | { mode: 'capture'; onCapture: (code: string) => void };

interface ScannerState {
  request: ScanRequest;
  setRequest: (request: ScanRequest) => void;
  reset: () => void;
}

export const useScannerStore = create<ScannerState>((set) => ({
  request: { mode: 'find' },
  setRequest: (request) => set({ request }),
  reset: () => set({ request: { mode: 'find' } }),
}));
