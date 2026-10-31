import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { ShieldStar } from "phosphor-react-native";
import { tierHex } from "@/ui/tokens";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";

interface JoPillProps {
  label: string;
  /** Palier de rang : pastille métal. Sans palier : étiquette neutre. */
  tier?: string;
  icon?: ReactNode;
}

/** Étiquette de rang ou de contexte, rayon 4. */
export function JoPill({ label, tier, icon }: JoPillProps) {
  const { colors } = useNativeTheme();
  const ink = tier ? (tier === "FER" ? "#FFFFFF" : "#000000") : colors.secondaryLabel;
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: tier ? tierHex(tier) : colors.raised },
      ]}
    >
      {tier ? <ShieldStar size={14} color={ink} weight="fill" /> : icon}
      <AppText
        variant="caption"
        weight={tier ? "bold" : "semibold"}
        numberOfLines={1}
        style={{ color: ink }}
      >
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    flexShrink: 1,
  },
});
