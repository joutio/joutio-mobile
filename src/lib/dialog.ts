import type { ReactNode } from "react";
import { create } from "zustand";

export interface DialogAction {
  label: string;
  variant?: "primary" | "secondary" | "plain" | "destructive";
  onPress?: () => void;
}

export interface DialogInput {
  title: string;
  message?: string;
  tone?: "neutral" | "accent" | "danger";
  icon?: ReactNode;
  actions: DialogAction[];
}

interface DialogState {
  current: DialogInput | null;
  dismiss: () => void;
}

export const useDialogStore = create<DialogState>((set) => ({
  current: null,
  dismiss: () => set({ current: null }),
}));

/** Point d'entrée impératif, sur le modèle de `showToast`. */
export function showDialog(dialog: DialogInput): void {
  useDialogStore.setState({ current: dialog });
}
