import { useEffect } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  type CSSAnimationKeyframes,
} from "react-native-reanimated";
import { haptic } from "@/lib/haptics";
import { AppText } from "@/ui/text";
import { EASE } from "@/ui/motion";
import { ROUND_COUNT, type RoundDot } from "../domain/game";
import { RoundDots } from "./round-dots";

const DURATION = 1900;

const LABEL: CSSAnimationKeyframes = {
  "0%": { transform: [{ translateY: 8 }], opacity: 0 },
  "12%": { transform: [{ translateY: 8 }], opacity: 0 },
  "24%": { transform: [{ translateY: 0 }], opacity: 1 },
  "80%": { transform: [{ translateY: 0 }], opacity: 1 },
  "90%": { transform: [{ translateY: -8 }], opacity: 0 },
  "100%": { transform: [{ translateY: -8 }], opacity: 0 },
};

function slideThrough(from: number, to: number): CSSAnimationKeyframes {
  return {
    "0%": { transform: [{ translateX: from }], opacity: 0 },
    "8%": { transform: [{ translateX: from }], opacity: 0 },
    "22%": { transform: [{ translateX: 0 }], opacity: 1 },
    "80%": { transform: [{ translateX: 0 }], opacity: 1 },
    "92%": { transform: [{ translateX: to }], opacity: 0 },
    "100%": { transform: [{ translateX: to }], opacity: 0 },
  };
}

const animate = (animationName: CSSAnimationKeyframes) => ({
  animationName,
  animationDuration: DURATION,
  animationTimingFunction: EASE,
  animationFillMode: "both" as const,
});

interface RoundIntroProps {
  round: number;
  topic: string;
  dots: RoundDot[];
}

/** Annonce du tour : le bandeau traverse l'écran, ×2 pour la dernière manche. */
export function RoundIntro({ round, topic, dots }: RoundIntroProps) {
  const { width } = useWindowDimensions();
  const bonus = round === ROUND_COUNT;

  useEffect(() => {
    haptic(bonus ? "heavy" : "light");
  }, [bonus, round]);

  const band: CSSAnimationKeyframes = {
    "0%": { transform: [{ translateX: -width }] },
    "14%": { transform: [{ translateX: 0 }] },
    "82%": { transform: [{ translateX: 0 }] },
    "96%": { transform: [{ translateX: width }] },
    "100%": { transform: [{ translateX: width }] },
  };

  return (
    <View key={round} style={styles.root}>
      <Animated.View style={animate(LABEL)}>
        <AppText variant="callout" weight="semibold" style={styles.topic}>
          {topic}
        </AppText>
      </Animated.View>
      <Animated.View style={[styles.band, animate(band)]}>
        <Animated.View style={animate(slideThrough(-48, 48))}>
          <AppText variant="numeric" weight="bold" style={styles.number}>
            {bonus ? "×2" : round}
          </AppText>
        </Animated.View>
        <Animated.View style={animate(slideThrough(-32, 32))}>
          <AppText variant="title1" weight="bold" style={styles.ink}>
            {bonus ? "Bonus" : "Tour"}
          </AppText>
          <AppText variant="callout" weight="semibold" style={styles.soft}>
            {bonus ? "Points doublés" : `de ${ROUND_COUNT}`}
          </AppText>
        </Animated.View>
      </Animated.View>
      <Animated.View style={[styles.dots, animate(LABEL)]}>
        <RoundDots dots={dots} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "center", gap: 24 },
  topic: { textAlign: "center", color: "#9B9B9B" },
  band: {
    height: 136,
    marginHorizontal: -20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    backgroundColor: "#E8B04A",
  },
  number: { color: "#000000", fontSize: 96, lineHeight: 108, letterSpacing: -5 },
  ink: { color: "#000000" },
  soft: { color: "rgba(0,0,0,0.7)" },
  dots: { alignItems: "center" },
});
