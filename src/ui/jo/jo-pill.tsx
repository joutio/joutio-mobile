import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { CrownSimple, ShieldStar } from "@/ui/phosphor";
import { tierHex } from "@/ui/tokens";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";

type JoPillKind =
  | "tier"
  | "provisional"
  | "premium"
  | "tag"
  | "gain"
  | "zero"
  | "loss"
  | "bonus"
  | "new";

interface JoPillProps {
  label: string;
  kind?: JoPillKind;
  /** Palier de rang : pastille métal. */
  tier?: string;
  icon?: ReactNode;
}

/** Étiquette de `Jo Pill` : rang, statut ou delta chiffré, rayon 4. */
export function JoPill({ label, kind, tier, icon }: JoPillProps) {
  const { colors } = useNativeTheme();
  const resolved = kind ?? (tier ? "tier" : "tag");
  const metal = tier ? tierHex(tier) : colors.raised;
  const { background, ink, border, mono } = {
    tier: { background: metal, ink: tier === "FER" ? "#FFFFFF" : "#000000" },
    provisional: {
      background: "transparent",
      ink: colors.secondaryLabel,
      border: colors.border,
    },
    premium: { background: colors.accent, ink: "#000000" },
    tag: { background: colors.raised, ink: colors.secondaryLabel },
    gain: {
      background: "rgba(79,178,134,0.16)",
      ink: colors.success,
      mono: true,
    },
    zero: {
      background: colors.raised,
      ink: colors.secondaryLabel,
      mono: true,
    },
    loss: {
      background: "rgba(229,100,90,0.16)",
      ink: colors.danger,
      mono: true,
    },
    bonus: {
      background: "rgba(232,176,74,0.16)",
      ink: colors.accentInk,
      mono: true,
    },
    new: { background: colors.accent, ink: "#000000" },
  }[resolved] as {
    background: string;
    ink: string;
    border?: string;
    mono?: boolean;
  };
  const glyph =
    resolved === "tier" ? (
      <ShieldStar size={14} color={ink} weight="fill" />
    ) : resolved === "premium" ? (
      <CrownSimple size={14} color={ink} weight="fill" />
    ) : (
      icon
    );
  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: background,
          borderColor: border,
          borderWidth: border ? 1 : 0,
          paddingLeft: glyph ? 4 : 8,
        },
      ]}
    >
      {glyph}
      <AppText
        variant={mono ? "numeric" : "caption"}
        weight={resolved === "tier" || resolved === "new" ? "bold" : "semibold"}
        numberOfLines={1}
        style={[mono && styles.mono, { color: ink }]}
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
    paddingRight: 8,
    borderRadius: 4,
    flexShrink: 1,
  },
  mono: { fontSize: 14, lineHeight: 16 },
});
