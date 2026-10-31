import { StyleSheet } from "react-native";
import Animated, { cubicBezier, useReducedMotion } from "react-native-reanimated";
import { JoutioMark } from "@/ui/logo";
import { breathe } from "@/ui/motion";

const BREATHE_EASE = cubicBezier(0.4, 0, 0.6, 1);

/** Logo respirant de la maquette, retardé pour ne pas clignoter quand les données arrivent vite. */
export function JoLoading() {
  const reduced = useReducedMotion();
  return (
    <Animated.View
      accessibilityLabel="Chargement"
      style={[
        styles.root,
        reduced ? undefined : {
          animationName: breathe,
          animationDuration: 1600,
          animationDelay: 400,
          animationIterationCount: "infinite",
          animationTimingFunction: BREATHE_EASE,
          animationFillMode: "backwards",
        },
      ]}
    >
      <JoutioMark size={64} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { paddingVertical: 32, alignItems: "center" },
});
