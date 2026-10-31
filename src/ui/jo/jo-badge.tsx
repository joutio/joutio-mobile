import { StyleSheet, View } from "react-native";
import { LockSimple } from "@/ui/phosphor";
import { Image } from "expo-image";
import { useNativeTheme } from "@/ui/theme";
import { BADGE_IMAGE } from "./medal-assets";

const INK: Record<string, string> = {
  FER: "#101215",
  BRONZE: "#35190A",
  ARGENT: "#262B34",
  OR: "#4A2F00",
  PLATINE: "#1A2342",
  EMERAUDE: "#04281A",
  DIAMANT: "#0A2A44",
};

interface JoBadgeProps {
  tier: string;
  size?: number;
  state?: "earned" | "progress" | "locked";
  /** Rendu de l'emblème de famille, dans la couleur fournie. */
  icon: (props: { size: number; color: string }) => React.ReactNode;
}

/** Médaille de rang portant l'emblème de sa famille. */
export function JoBadge({ tier, size = 56, state = "earned", icon }: JoBadgeProps) {
  const { colors } = useNativeTheme();
  const key = tier.toUpperCase();
  const height = Math.round(size * 1.1);
  const dimmed = state !== "earned";
  return (
    <View style={{ width: size, height, opacity: dimmed ? 0.35 : 1 }}>
      <Image
        source={BADGE_IMAGE[key] ?? BADGE_IMAGE.FER}
        style={{ width: size, height }}
        contentFit="contain"
        transition={0}
      />
      <View style={styles.icon}>
        {icon({ size: Math.round(size * 0.3), color: INK[key] ?? INK.OR })}
      </View>
      {state === "locked" ? (
        <View
          style={[
            styles.lock,
            {
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: size * 0.14,
              backgroundColor: colors.label,
            },
          ]}
        >
          <LockSimple
            size={Math.round(size * 0.16)}
            color={colors.background}
            weight="fill"
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: "9%",
  },
  lock: {
    position: "absolute",
    right: "4%",
    bottom: "6%",
    alignItems: "center",
    justifyContent: "center",
  },
});
