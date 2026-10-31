import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "./text";
import { useNativeTheme } from "./theme";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Contrôle segmenté Joutio : rail relief, segment actif sur surface. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const theme = useNativeTheme();
  const { colors, radius } = theme;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.raised,
          borderColor: colors.border,
          borderRadius: radius.md,
        },
      ]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              {
                borderRadius: radius.sm,
                backgroundColor: selected ? colors.surface : "transparent",
                borderWidth: selected ? 1 : 0,
                borderColor: colors.border,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <AppText
              variant="callout"
              weight={selected ? "semibold" : "medium"}
              tone={selected ? "default" : "secondary"}
              numberOfLines={1}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 4,
    padding: 4,
    borderWidth: 1,
  },
  segment: {
    flex: 1,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
});
