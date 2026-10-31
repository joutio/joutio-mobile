import { Alert, Platform } from "react-native";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

/** Confirmation native : Alert iOS/Android, confirm web (debug). */
export function confirmAction({
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  destructive = false,
  onConfirm,
}: ConfirmOptions): void {
  if (Platform.OS === "web") {
    const confirmFn = (
      globalThis as { confirm?: (message?: string) => boolean }
    ).confirm;
    const text = message ? `${title}\n\n${message}` : title;
    if (!confirmFn || confirmFn(text)) onConfirm();
    return;
  }

  Alert.alert(title, message, [
    { text: cancelLabel, style: "cancel" },
    {
      text: confirmLabel,
      style: destructive ? "destructive" : "default",
      onPress: onConfirm,
    },
  ]);
}
