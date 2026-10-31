import { StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { cubicBezier } from "react-native-reanimated";
import { JoutioMark } from "@/ui/logo";
import { breathe } from "@/ui/motion";

const BREATHE_EASE = cubicBezier(0.4, 0, 0.6, 1);

/** Logo respirant de la maquette, retardé pour ne pas clignoter quand les données arrivent vite. */
export function JoLoading() {
  return (
    <Animated.View
      accessibilityLabel="Chargement"
      style={[
        styles.root,
        {
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
