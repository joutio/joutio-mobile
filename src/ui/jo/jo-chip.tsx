import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { CaretDown, X } from "@/ui/phosphor";
import { haptic } from "@/lib/haptics";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";

interface JoChipProps {
  label: string;
  selected?: boolean;
  count?: number;
  icon?: ReactNode;
  menu?: boolean;
  /** Pastille de catégorie, carrée à angles adoucis. */
  dot?: string;
  removable?: boolean;
  suggestion?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}

/** Filtre en pastille : sélection en texte plein, compteur en Geist Mono. */
export function JoChip({
  label,
  selected = false,
  count,
  icon,
  menu = false,
  dot,
  removable = false,
  suggestion = false,
  disabled = false,
  onPress,
}: JoChipProps) {
  const { colors } = useNativeTheme();
  const color = selected ? colors.background : colors.label;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={() => {
        haptic("selection");
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected
            ? colors.label
            : suggestion
              ? "transparent"
              : colors.raised,
          borderWidth: suggestion ? 1 : 0,
          borderColor: colors.border,
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {icon}
      {dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}
      <AppText
        variant="callout"
        weight={selected || suggestion ? "semibold" : "medium"}
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
      {removable || (selected && dot) ? <X size={14} color={color} /> : null}
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
  dot: { width: 8, height: 8, borderRadius: 2 },
  count: { fontSize: 12, lineHeight: 16, opacity: 0.7 },
});
