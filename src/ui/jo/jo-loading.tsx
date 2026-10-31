import { ActivityIndicator, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { useNativeTheme } from "@/ui/theme";
import { riseIn } from "@/ui/motion";

/** Chargement retardé : rien ne clignote quand les données arrivent vite. */
export function JoLoading() {
  const { colors } = useNativeTheme();
  return (
    <Animated.View
      style={[
        styles.root,
        {
          animationName: riseIn,
          animationDuration: 200,
          animationDelay: 300,
          animationFillMode: "both",
        },
      ]}
    >
      <ActivityIndicator color={colors.accent} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { paddingVertical: 32, alignItems: "center" },
});
