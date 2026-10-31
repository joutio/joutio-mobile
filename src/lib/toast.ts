import { create } from "zustand";

export type ToastTone =
  | "default"
  | "success"
  | "danger"
  | "warning"
  | "info";

export interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  action?: string;
  /** Toast cliquable, ou action si `action` est défini. */
  onPress?: () => void;
  actorName?: string;
  actorAvatar?: string | null;
  actorTier?: string;
}

interface ToastState {
  current: (ToastInput & { id: number }) | null;
  show: (toast: ToastInput) => void;
  dismiss: () => void;
}

let nextId = 0;

export const useToastStore = create<ToastState>((set) => ({
  current: null,
  show: (toast) => set({ current: { ...toast, id: ++nextId } }),
  dismiss: () => set({ current: null }),
}));

/** Point d'entrée impératif pour les hooks de données et services. */
export function showToast(toast: ToastInput): void {
  useToastStore.getState().show(toast);
}
