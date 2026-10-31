import type { ReactNode } from "react";
import { useRouter } from "expo-router";
import { JoNavBar } from "@/ui/jo/jo-nav-bar";

interface InlineNavBarProps {
  title: string;
  canGoBack: boolean;
  /** Titre de l'écran précédent. */
  backLabel?: string;
  actions?: ReactNode;
}

/** Barre compacte des écrans empilés. */
export function InlineNavBar({
  title,
  canGoBack,
  backLabel,
  actions,
}: InlineNavBarProps) {
  const router = useRouter();
  return (
    <JoNavBar
      variant="inline"
      title={title}
      backLabel={backLabel || undefined}
      onBack={canGoBack ? () => router.back() : undefined}
      actions={actions}
    />
  );
}
