import * as Haptics from "expo-haptics";
import { create } from "zustand";
import { getItem, setItem } from "./storage";
import type { haptic as hapticTokens } from "@/ui/tokens";

export type HapticName = keyof typeof hapticTokens;

const STORAGE_KEY = "joutio.haptics";
const MIN_GAP_MS = 100;

const PLAY: Record<HapticName, () => Promise<void>> = {
  selection: () => Haptics.selectionAsync(),
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  success: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
};

interface HapticsState {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

/** Réglages › Vibrations, conservé sur l'appareil. */
export const useHapticsStore = create<HapticsState>((set) => ({
  enabled: true,
  setEnabled: (enabled) => {
    set({ enabled });
    void setItem(STORAGE_KEY, String(enabled));
  },
}));

void getItem(STORAGE_KEY).then((value) => {
  if (value !== null) useHapticsStore.setState({ enabled: value === "true" });
});

let lastAt = 0;

/** Retour haptique du design system : coupable, jamais deux à moins de 100 ms. */
export function haptic(name: HapticName): void {
  if (!useHapticsStore.getState().enabled) return;
  const now = Date.now();
  if (now - lastAt < MIN_GAP_MS) return;
  lastAt = now;
  void PLAY[name]().catch(() => undefined);
}
