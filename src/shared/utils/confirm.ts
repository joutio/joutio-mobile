import { showDialog } from "@/lib/dialog";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

/** Confirmation Joutio : l'action d'abord, l'annulation en retrait. */
export function confirmAction({
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  destructive = false,
  onConfirm,
}: ConfirmOptions): void {
  showDialog({
    title,
    message,
    tone: destructive ? "danger" : "neutral",
    actions: [
      {
        label: confirmLabel,
        variant: destructive ? "destructive" : "primary",
        onPress: onConfirm,
      },
      { label: cancelLabel, variant: "plain" },
    ],
  });
}
