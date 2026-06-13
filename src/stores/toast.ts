import { create } from 'zustand';

import { createLocalId } from '@/lib/id';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
}

interface ToastState {
  toasts: ToastItem[];
  show: (toast: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: string) => void;
}

const MAX_VISIBLE = 3;
const AUTO_DISMISS_MS = 3500;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  show: (toast) => {
    const id = createLocalId();
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }].slice(-MAX_VISIBLE) }));
    setTimeout(() => get().dismiss(id), AUTO_DISMISS_MS);
  },

  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

/** Imperative helper so non-component code can raise toasts. */
export const toast = {
  success: (title: string, message?: string) =>
    useToastStore.getState().show({ variant: 'success', title, message }),
  error: (title: string, message?: string) =>
    useToastStore.getState().show({ variant: 'error', title, message }),
  info: (title: string, message?: string) =>
    useToastStore.getState().show({ variant: 'info', title, message }),
  warning: (title: string, message?: string) =>
    useToastStore.getState().show({ variant: 'warning', title, message }),
};
