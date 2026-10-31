import { Pressable, StyleSheet, View } from "react-native";
import { haptic } from "@/lib/haptics";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";

interface JoSegmentedProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** Sélecteur segmenté : segment actif en texte plein. */
export function JoSegmented<T extends string>({
  options,
  value,
  onChange,
}: JoSegmentedProps<T>) {
  const { colors } = useNativeTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.track, { backgroundColor: colors.raised }]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              if (!selected) haptic("selection");
              onChange(option.value);
            }}
            style={[
              styles.segment,
              selected && { backgroundColor: colors.label },
            ]}
          >
            <AppText
              variant="callout"
              weight={selected ? "semibold" : "medium"}
              numberOfLines={1}
              style={{
                color: selected ? colors.background : colors.secondaryLabel,
              }}
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
  track: { flexDirection: "row", gap: 2, padding: 2, borderRadius: 10 },
  segment: {
    flex: 1,
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
