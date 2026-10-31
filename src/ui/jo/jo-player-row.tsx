import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";
import { JoEloAvatar } from "./jo-elo-avatar";

interface JoPlayerRowProps {
  name: string;
  /** Nom de l'avatar quand la ligne porte une phrase plutôt qu'un pseudonyme. */
  avatarName?: string;
  avatarOptions?: string | null;
  nameLines?: number;
  subtitle?: string;
  rank?: number;
  presence?: "ONLINE" | "OFFLINE" | null;
  /** Palier Elo du cadre, `null` pour un joueur provisoire. */
  tier?: string | null;
  trailing?: ReactNode;
  onPress?: () => void;
  highlight?: boolean;
  last?: boolean;
}

/** Ligne joueur 64 px : avatar, nom, contexte et action. */
export function JoPlayerRow({
  name,
  avatarName = name,
  avatarOptions,
  nameLines = 1,
  subtitle,
  rank,
  presence,
  tier,
  trailing,
  onPress,
  highlight = false,
  last = false,
}: JoPlayerRowProps) {
  const { colors } = useNativeTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed
            ? colors.hover
            : highlight
              ? colors.accentSoft
              : "transparent",
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: colors.border,
        },
      ]}
    >
      {rank !== undefined ? (
        <AppText
          variant="numeric"
          weight="semibold"
          style={[styles.rank, rank <= 3 && { color: colors.accentInk }]}
        >
          {rank}
        </AppText>
      ) : null}
      <View>
        <JoEloAvatar
          name={avatarName}
          avatarOptions={avatarOptions}
          size={44}
          tier={tier}
        />
        {presence ? (
          <View
            style={[
              styles.presence,
              {
                borderColor: colors.surface,
                backgroundColor:
                  presence === "ONLINE" ? colors.success : "#6B6B70",
              },
            ]}
          />
        ) : null}
      </View>
      <View style={styles.copy}>
        <AppText variant="body" weight="semibold" numberOfLines={nameLines}>
          {name}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone="secondary" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  presence: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  rank: { width: 28, textAlign: "center" },
  copy: { flex: 1, minWidth: 0 },
  trailing: { flexDirection: "row", alignItems: "center", gap: 4 },
});
