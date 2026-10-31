import { View } from "react-native";
import { AppText } from "../text";
import { useNativeTheme } from "../theme";

/** Divider « ou continuer avec » du design (12/16, filets 1 px). */
export function JoDivider({ label = "ou continuer avec" }: { label?: string }) {
  const theme = useNativeTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 8,
      }}
    >
      <View
        style={{ flex: 1, height: 1, backgroundColor: theme.colors.separator }}
      />
      <AppText
        variant="footnote"
        tone="secondary"
        style={{ fontSize: 12, lineHeight: 16 }}
      >
        {label}
      </AppText>
      <View
        style={{ flex: 1, height: 1, backgroundColor: theme.colors.separator }}
      />
    </View>
  );
}
