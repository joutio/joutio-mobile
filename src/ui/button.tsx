import type { ComponentProps } from "react";
import { JoButton, type JoButtonSize } from "./jo/jo-button";

type AppButtonSize = "sm" | "md" | "lg";

const SIZE: Record<AppButtonSize, JoButtonSize> = { sm: "S", md: "M", lg: "L" };

interface AppButtonProps
  extends Omit<ComponentProps<typeof JoButton>, "size" | "fullWidth"> {
  size?: AppButtonSize;
  fullWidth?: boolean;
}

/** Tailles historiques au-dessus de `JoButton`, seule implémentation du bouton. */
export function AppButton({
  size = "md",
  fullWidth = false,
  ...props
}: AppButtonProps) {
  return <JoButton {...props} size={SIZE[size]} fullWidth={fullWidth} />;
}
