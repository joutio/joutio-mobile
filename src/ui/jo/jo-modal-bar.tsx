import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";

interface JoModalBarProps {
  title: string;
  cancel?: string;
  onCancel: () => void;
  confirm: string;
  confirmDisabled?: boolean;
  onConfirm: () => void;
}

/** Variante `modal` de `Jo Nav Bar` : Annuler, titre centré et action de validation. */
export function JoModalBar({
  title,
  cancel = "Annuler",
  onCancel,
  confirm,
  confirmDisabled = false,
  onConfirm,
}: JoModalBarProps) {
  const { colors } = useNativeTheme();
  const { top } = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.bar,
        { paddingTop: top, backgroundColor: colors.background },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        hitSlop={8}
        onPress={onCancel}
        style={styles.side}
      >
        <AppText variant="body" style={{ color: colors.accentInk }}>
          {cancel}
        </AppText>
      </Pressable>
      <AppText
        variant="headline"
        accessibilityRole="header"
        numberOfLines={1}
        style={styles.title}
      >
        {title}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: confirmDisabled }}
        disabled={confirmDisabled}
        hitSlop={8}
        onPress={onConfirm}
        style={[styles.side, styles.end]}
      >
        <AppText
          variant="body"
          weight="semibold"
          style={{
            color: confirmDisabled ? colors.secondaryLabel : colors.accentInk,
          }}
        >
          {confirm}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  side: { flex: 1, height: 44, justifyContent: "center" },
  end: { alignItems: "flex-end" },
  title: { maxWidth: 180, textAlign: "center" },
});
