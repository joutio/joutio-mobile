import { StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { EASE } from "@/ui/motion";
import { useNativeTheme } from "@/ui/theme";

const DURATION = 300;

/** Bascule de `Jo List Row` : le `Switch` Android ne reprend ni sa géométrie ni son mouvement. */
export function JoSwitch({ on }: { on: boolean }) {
  const { colors } = useNativeTheme();
  return (
    <Animated.View
      style={[
        styles.track,
        {
          backgroundColor: on ? colors.accent : colors.hover,
          transitionProperty: "backgroundColor",
          transitionDuration: DURATION,
          transitionTimingFunction: EASE,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.thumb,
          {
            transform: [{ translateX: on ? 20 : 0 }],
            transitionProperty: "transform",
            transitionDuration: DURATION,
            transitionTimingFunction: EASE,
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  track: { width: 51, height: 31, padding: 2, borderRadius: 9999 },
  thumb: {
    width: 27,
    height: 27,
    borderRadius: 9999,
    backgroundColor: "#FFFFFF",
    boxShadow: "0 2px 4px rgba(0,0,0,0.25)",
  },
});
