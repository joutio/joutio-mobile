import { View, type DimensionValue } from "react-native";
import { useNativeTheme } from "@/ui/theme";

interface JoSkeletonProps {
  width?: DimensionValue;
  height: number;
  radius?: number;
}

/** Bloc statique de la maquette : `var(--jo-surface)`, sans animation. */
export function JoSkeleton({ width, height, radius = 16 }: JoSkeletonProps) {
  const { colors } = useNativeTheme();
  return (
    <View
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: colors.surface,
      }}
    />
  );
}
