import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useCountUp } from "@/shared/hooks/useCountUp";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RADIUS = 65;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface MasteryRingProps {
  tier: string;
  percent: number;
  gained: number;
  nextLabel?: string;
  remaining?: number;
  size?: number;
}

/** Donut de maîtrise après un duel : XP gagnée et XP restante. */
export function MasteryRing({
  tier,
  percent,
  gained,
  nextLabel,
  remaining,
  size = 164,
}: MasteryRingProps) {
  const { colors } = useNativeTheme();
  const filled = Math.max(0, Math.min(100, percent)) / 100;
  const progress = useSharedValue(0);
  const xp = useCountUp(gained, 1200);
  const arc = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  useEffect(() => {
    progress.value = withTiming(filled, {
      duration: 1200,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
  }, [filled, progress]);
  return (
    <View
      accessible
      accessibilityLabel={`Maîtrise ${tier}, ${gained} XP gagnée`}
      style={styles.root}
    >
      <View style={[styles.side, styles.end]}>
        {nextLabel ? (
          <>
            <AppText variant="caption" weight="semibold" style={styles.right}>
              Avant {nextLabel}
            </AppText>
            <AppText variant="numeric" weight="semibold" style={styles.value}>
              {remaining}
            </AppText>
          </>
        ) : null}
      </View>
      <View style={{ width: size, height: size }}>
        <Svg viewBox="0 0 160 160" style={styles.svg}>
          <Circle
            cx={80}
            cy={80}
            r={RADIUS}
            fill="none"
            stroke={colors.hover}
            strokeWidth={30}
          />
          <AnimatedCircle
            cx={80}
            cy={80}
            r={RADIUS}
            fill="none"
            stroke="#E8B04A"
            strokeWidth={30}
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            animatedProps={arc}
          />
        </Svg>
        <View style={styles.center}>
          <AppText variant="caption" weight="semibold" tone="secondary">
            Maîtrise
          </AppText>
          <AppText variant="title1" weight="bold">
            {tier}
          </AppText>
        </View>
      </View>
      <View style={styles.side}>
        <AppText
          variant="caption"
          weight="semibold"
          style={{ color: colors.accentInk }}
        >
          XP gagnée
        </AppText>
        <AppText
          variant="numeric"
          weight="semibold"
          style={[styles.value, { color: colors.accentInk }]}
        >
          +{xp}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: "row", alignItems: "center", gap: 8 },
  side: { flex: 1, minWidth: 0 },
  end: { alignItems: "flex-end" },
  right: { textAlign: "right" },
  value: { fontSize: 24, lineHeight: 32 },
  svg: { width: "100%", height: "100%", transform: [{ rotate: "-90deg" }] },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
});
