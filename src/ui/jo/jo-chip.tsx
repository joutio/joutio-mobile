import type { ReactNode } from "react";
import { Pressable, StyleSheet } from "react-native";
import { CaretDown } from "phosphor-react-native";
import { haptic } from "@/lib/haptics";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";

interface JoChipProps {
  label: string;
  selected?: boolean;
  count?: number;
  icon?: ReactNode;
  menu?: boolean;
  onPress?: () => void;
}

/** Filtre en pastille : sélection en texte plein, compteur en Geist Mono. */
export function JoChip({
  label,
  selected = false,
  count,
  icon,
  menu = false,
  onPress,
}: JoChipProps) {
  const { colors } = useNativeTheme();
  const color = selected ? colors.background : colors.label;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        haptic("selection");
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.label : colors.raised,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {icon}
      <AppText
        variant="callout"
        weight={selected ? "semibold" : "medium"}
        style={{ color }}
      >
        {label}
      </AppText>
      {count ? (
        <AppText variant="numeric" style={[styles.count, { color }]}>
          {count}
        </AppText>
      ) : null}
      {menu ? <CaretDown size={14} color={color} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 9999,
  },
  count: { fontSize: 12, lineHeight: 16, opacity: 0.7 },
});
