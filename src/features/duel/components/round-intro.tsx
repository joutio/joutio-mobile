import { useEffect } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  type CSSAnimationKeyframes,
} from "react-native-reanimated";
import { haptic } from "@/lib/haptics";
import { JoCategoryIcon } from "@/ui/jo/jo-category-icon";
import { Lightning } from "@/ui/phosphor";
import { AppText } from "@/ui/text";
import { EASE } from "@/ui/motion";
import { ROUND_COUNT, type RoundDot } from "../domain/game";
import { RoundDots } from "./round-dots";

const DURATION = 1900;

/** `mi-lab` */
const LABEL: CSSAnimationKeyframes = {
  "0%": { transform: [{ translateY: 8 }], opacity: 0 },
  "12%": { transform: [{ translateY: 8 }], opacity: 0 },
  "24%": { transform: [{ translateY: 0 }], opacity: 1 },
  "80%": { transform: [{ translateY: 0 }], opacity: 1 },
  "90%": { transform: [{ translateY: -8 }], opacity: 0 },
  "100%": { transform: [{ translateY: -8 }], opacity: 0 },
};

/** `mi-num` */
const NUMBER: CSSAnimationKeyframes = {
  "0%": { transform: [{ translateX: -48 }], opacity: 0 },
  "6%": { transform: [{ translateX: -48 }], opacity: 0 },
  "20%": { transform: [{ translateX: 0 }], opacity: 1 },
  "80%": { transform: [{ translateX: 0 }], opacity: 1 },
  "92%": { transform: [{ translateX: 48 }], opacity: 0 },
  "100%": { transform: [{ translateX: 48 }], opacity: 0 },
};

/** `mi-txt` */
const TEXT: CSSAnimationKeyframes = {
  "0%": { transform: [{ translateX: -32 }], opacity: 0 },
  "10%": { transform: [{ translateX: -32 }], opacity: 0 },
  "24%": { transform: [{ translateX: 0 }], opacity: 1 },
  "78%": { transform: [{ translateX: 0 }], opacity: 1 },
  "90%": { transform: [{ translateX: 32 }], opacity: 0 },
  "100%": { transform: [{ translateX: 32 }], opacity: 0 },
};

/** `mi-band` : le clip-path de la maquette, en deux translations opposées. */
function wipe(distance: number): CSSAnimationKeyframes {
  return {
    "0%": { transform: [{ translateX: -distance }] },
    "14%": { transform: [{ translateX: 0 }] },
    "82%": { transform: [{ translateX: 0 }] },
    "96%": { transform: [{ translateX: distance }] },
    "100%": { transform: [{ translateX: distance }] },
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
  category?: string | null;
  color: string;
  dots: RoundDot[];
}

/** Annonce du tour : le bandeau se découvre puis s'efface, sans bouger. */
export function RoundIntro({ round, topic, category, color, dots }: RoundIntroProps) {
  const { width } = useWindowDimensions();
  const bonus = round === ROUND_COUNT;

  useEffect(() => {
    haptic(bonus ? "heavy" : "light");
  }, [bonus, round]);

  return (
    <View key={round} style={styles.root}>
      <Animated.View style={[styles.label, animate(LABEL)]}>
        <View style={[styles.tile, { backgroundColor: color }]}>
          <JoCategoryIcon category={category} size={14} />
        </View>
        <AppText variant="callout" weight="semibold" style={styles.topic}>
          {topic}
        </AppText>
      </Animated.View>
      <Animated.View style={[styles.window, animate(wipe(width))]}>
        <Animated.View style={[styles.band, animate(wipe(-width))]}>
          <Animated.View style={animate(NUMBER)}>
            <AppText variant="numeric" weight="bold" style={styles.number}>
              {round}
            </AppText>
          </Animated.View>
          <Animated.View style={animate(TEXT)}>
            <AppText variant="title1" weight="bold" style={styles.word}>
              Tour
            </AppText>
            <AppText variant="callout" weight="semibold" style={styles.soft}>
              de {ROUND_COUNT}
            </AppText>
          </Animated.View>
        </Animated.View>
      </Animated.View>
      <Animated.View style={[styles.dots, animate(LABEL)]}>
        <RoundDots dots={dots} compact />
        {bonus ? (
          <View style={styles.bonus}>
            <Lightning size={16} color="#E8B04A" weight="fill" />
            <AppText variant="callout" weight="bold" style={styles.bonusText}>
              Question bonus · points doublés
            </AppText>
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "center", gap: 24 },
  label: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  tile: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  topic: { color: "#9B9B9B" },
  window: { height: 136, marginHorizontal: -12, overflow: "hidden" },
  band: {
    height: 136,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    backgroundColor: "#E8B04A",
  },
  number: { color: "#000000", fontSize: 96, lineHeight: 96, letterSpacing: -5.76 },
  word: { color: "#000000", lineHeight: 28 },
  soft: { color: "rgba(0,0,0,0.7)" },
  dots: { alignItems: "center", gap: 12 },
  bonus: {
    height: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: 9999,
    backgroundColor: "rgba(232,176,74,0.16)",
  },
  bonusText: { color: "#E8B04A" },
});
