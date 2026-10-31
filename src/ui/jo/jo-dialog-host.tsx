import { Modal, Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useDialogStore } from "@/lib/dialog";
import { EASE, popIn } from "@/ui/motion";
import { AppText } from "@/ui/text";
import { motion } from "@/ui/tokens";
import { useNativeTheme } from "@/ui/theme";
import { JoButton } from "./jo-button";

/** Dialogue de `Jo Dialog`, monté une fois à la racine. */
export function JoDialogHost() {
  const { colors } = useNativeTheme();
  const current = useDialogStore((state) => state.current);
  const dismiss = useDialogStore((state) => state.dismiss);
  if (!current) return null;

  const tile = {
    neutral: colors.raised,
    accent: colors.warm,
    danger: "rgba(229,100,90,0.14)",
  }[current.tone ?? "neutral"];

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={dismiss}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Fermer"
          onPress={dismiss}
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
        />
        <Animated.View
          accessibilityRole="alert"
          style={[
            styles.dialog,
            {
              backgroundColor: colors.surface,
              boxShadow: colors.shadow,
              animationName: popIn,
              animationDuration: motion.micro.duration,
              animationTimingFunction: EASE,
            },
          ]}
        >
          {current.icon ? (
            <View style={[styles.tile, { backgroundColor: tile }]}>
              {current.icon}
            </View>
          ) : null}
          <AppText variant="title2" style={styles.text}>
            {current.title}
          </AppText>
          {current.message ? (
            <AppText variant="body" tone="secondary" style={styles.text}>
              {current.message}
            </AppText>
          ) : null}
          <View style={styles.actions}>
            {current.actions.map((action) => (
              <JoButton
                key={action.label}
                label={action.label}
                variant={action.variant ?? "secondary"}
                size={action.variant === "plain" ? "M" : "L"}
                onPress={() => {
                  dismiss();
                  action.onPress?.();
                }}
              />
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  dialog: {
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
    gap: 8,
    paddingTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderRadius: 24,
  },
  tile: {
    width: 56,
    height: 56,
    marginBottom: 4,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { textAlign: "center" },
  actions: { alignSelf: "stretch", gap: 8, marginTop: 12 },
});
