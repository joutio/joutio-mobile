import { memo, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { haptic } from "@/lib/haptics";
import { AppText } from "@/ui/text";
import { answerIn, EASE } from "@/ui/motion";

export type AnswerState = "rest" | "pending" | "correct" | "wrong" | "unchosen";

const COLORS: Record<AnswerState, { bg: string; fg: string }> = {
  rest: { bg: "#1F1F1F", fg: "#FFFFFF" },
  pending: { bg: "#3A3A3E", fg: "#FFFFFF" },
  correct: { bg: "#4FB286", fg: "#000000" },
  wrong: { bg: "#E5645A", fg: "#000000" },
  unchosen: { bg: "#1F1F1F", fg: "#9B9B9B" },
};

interface AnswerCardProps {
  label: string;
  state: AnswerState;
  index: number;
  /** Encoche gauche : choix du joueur. */
  mine?: boolean;
  /** Encoche droite : choix de l'adversaire. */
  theirs?: boolean;
  background: string;
  compact?: boolean;
  onPress: () => void;
}

/** Réponse du duel : entrée décalée, couleur en fondu, encoches des choix. */
export const AnswerCard = memo(function AnswerCard({
  label,
  state,
  index,
  mine = false,
  theirs = false,
  background,
  compact = false,
  onPress,
}: AnswerCardProps) {
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => haptic("selection"), index * 120);
    return () => clearTimeout(timer);
  }, [index]);

  const { bg, fg } = COLORS[state];
  const interactive = state === "rest";
  const who =
    mine && theirs
      ? ", vos deux choix"
      : mine
        ? ", ton choix"
        : theirs
          ? ", choix de l'adversaire"
          : "";

  return (
    <Animated.View
      style={[
        compact && styles.flex,
        {
          animationName: answerIn,
          animationDuration: 320,
          animationDelay: index * 120,
          animationTimingFunction: EASE,
          animationFillMode: "both",
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}${who}`}
        accessibilityState={{ disabled: !interactive }}
        disabled={!interactive}
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
      >
        <Animated.View
          style={[
            styles.card,
            compact && styles.compact,
            {
              backgroundColor: pressed ? "#272727" : bg,
              transform: [{ scale: pressed ? 0.98 : 1 }],
              transitionProperty: ["backgroundColor", "transform"],
              transitionDuration: [300, 120],
              transitionTimingFunction: EASE,
            },
          ]}
        >
          <AppText
            variant="body"
            weight="semibold"
            numberOfLines={3}
            style={[styles.label, { color: fg }]}
          >
            {label}
          </AppText>
          {mine ? (
            <View
              style={[styles.notch, styles.left, { backgroundColor: background }]}
            />
          ) : null}
          {theirs ? (
            <View
              style={[styles.notch, styles.right, { backgroundColor: background }]}
            />
          ) : null}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
});

const NOTCH = 22;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 8,
    overflow: "hidden",
  },
  compact: { minHeight: 72, paddingHorizontal: 16 },
  label: { textAlign: "center" },
  notch: {
    position: "absolute",
    top: "50%",
    width: NOTCH,
    height: NOTCH,
    marginTop: -NOTCH / 2,
    transform: [{ rotate: "45deg" }],
  },
  left: { left: -NOTCH / 2 - 2 },
  right: { right: -NOTCH / 2 - 2 },
});
