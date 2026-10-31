import { SymbolView, type AndroidSymbol, type SFSymbol } from "expo-symbols";
import type { ColorValue } from "react-native";

interface NativeIconProps {
  ios: SFSymbol;
  android: AndroidSymbol;
  size?: number;
  color?: ColorValue;
  weight?: "regular" | "medium" | "semibold" | "bold";
}

/** Icône native : SF Symbols sur iOS, Material Symbols sur Android. */
export function NativeIcon({
  ios,
  android,
  size = 20,
  color,
  weight = "regular",
}: NativeIconProps) {
  return (
    <SymbolView
      name={{ ios, android }}
      size={size}
      tintColor={color}
      weight={weight}
    />
  );
}
