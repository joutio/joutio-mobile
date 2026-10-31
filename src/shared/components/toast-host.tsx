import { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  View,
} from "react-native";
import { CheckCircle, Info, WarningCircle } from "phosphor-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToastStore } from "@/lib/toast";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";

/** Toast Joutio, en haut de l'écran. */
export function ToastHost() {
  const theme = useNativeTheme();
  const insets = useSafeAreaInsets();
  const current = useToastStore((state) => state.current);
  const dismiss = useToastStore((state) => state.dismiss);
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!current) return;
    translateY.setValue(-16);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        damping: 18,
        stiffness: 180,
        useNativeDriver: true,
      }),
    ]).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) dismiss();
      });
    }, 3200);
    return () => clearTimeout(timer);
  }, [current, dismiss, opacity, translateY]);

  if (!current) return null;

  const color =
    current.tone === "danger"
      ? theme.colors.danger
      : current.tone === "success"
        ? theme.colors.success
        : theme.colors.accent;
  const ToneIcon =
    current.tone === "danger"
      ? WarningCircle
      : current.tone === "success"
        ? CheckCircle
        : Info;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { top: insets.top + 8 }]}
    >
      <Animated.View
        style={[
          styles.toast,
          {
            backgroundColor: theme.colors.raised,
            borderColor: theme.colors.border,
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <ToneIcon size={24} color={color} weight="fill" />
        <View style={styles.copy}>
          <AppText variant="body" weight="semibold">
            {current.title}
          </AppText>
          {current.description ? (
            <AppText variant="callout" tone="secondary">
              {current.description}
            </AppText>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 100,
    alignItems: "center",
  },
  toast: {
    width: "100%",
    maxWidth: 358,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 6,
  },
  copy: { flex: 1, minWidth: 0, gap: 2 },
});
