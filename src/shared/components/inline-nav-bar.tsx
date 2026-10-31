import type { ReactNode } from "react";
import { useRouter } from "expo-router";
import { JoNavBar } from "@/ui/jo/jo-nav-bar";

interface InlineNavBarProps {
  title: string;
  canGoBack: boolean;
  actions?: ReactNode;
}

/** Barre compacte des écrans empilés. */
export function InlineNavBar({ title, canGoBack, actions }: InlineNavBarProps) {
  const router = useRouter();
  return (
    <JoNavBar
      variant="inline"
      title={title}
      onBack={canGoBack ? () => router.back() : undefined}
      actions={actions}
    />
  );
}
