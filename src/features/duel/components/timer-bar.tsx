import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { EASE } from "@/ui/motion";

const ROUND_MS = 10_000;

interface TimerBarProps {
  deadline: number | null;
  /** Réponses ouvertes : la barre descend jusqu'à l'échéance. */
  running: boolean;
  /** Manche révélée : la barre reste figée. */
  frozen: boolean;
  low: boolean;
  /** Part du temps restante à la première réponse : repère pâle derrière la barre. */
  first?: number | null;
}

/** Chrono de manche, animé sur le fil d'interface. */
export function TimerBar({
  deadline,
  running,
  frozen,
  low,
  first,
}: TimerBarProps) {
  const progress = useSharedValue(1);

  useEffect(() => {
    if (frozen) {
      cancelAnimation(progress);
    } else if (running && deadline) {
      const remaining = Math.max(0, deadline - Date.now());
      progress.value = Math.min(1, remaining / ROUND_MS);
      progress.value = withTiming(0, {
        duration: remaining,
        easing: Easing.linear,
      });
    } else {
      progress.value = 1;
    }
  }, [deadline, frozen, progress, running]);

  const fill = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

  return (
    <View style={styles.track}>
      {first ? (
        <View style={[styles.first, { width: `${first * 100}%` }]} />
      ) : null}
      <Animated.View
        style={[
          styles.fill,
          {
            // Avant l'ouverture des réponses, la barre reste invisible (`qr-bar`).
            backgroundColor:
              !running && !frozen ? "transparent" : low ? "#E5645A" : "#FFFFFF",
            transitionProperty: "backgroundColor",
            transitionDuration: 300,
            transitionTimingFunction: EASE,
          },
          fill,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 5, overflow: "hidden" },
  first: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  fill: { height: "100%", transformOrigin: "0% 50%" },
});
