import { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import {
  Bell,
  CaretRight,
  CheckCircle,
  Info,
  Warning,
  XCircle,
} from "@/ui/phosphor";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToastStore } from "@/lib/toast";
import { JoEloAvatar } from "@/ui/jo/jo-elo-avatar";
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

  const tone = current.tone ?? "default";
  const color = {
    default: theme.colors.secondaryLabel,
    success: theme.colors.success,
    danger: theme.colors.danger,
    warning: theme.colors.accent,
    info: theme.colors.accentInk,
  }[tone];
  const neutral = tone === "default";
  const ToneIcon = {
    default: Bell,
    success: CheckCircle,
    danger: XCircle,
    warning: Warning,
    info: Info,
  }[tone];
  const press = () => {
    current.onPress?.();
    dismiss();
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { top: insets.top + 8 }]}
    >
      <Animated.View
        style={[
          styles.toast,
          {
            alignItems: current.description ? "flex-start" : "center",
            backgroundColor: theme.colors.raised,
            borderColor: theme.colors.border,
            boxShadow: theme.colors.shadow,
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        {current.actorName ? (
          <JoEloAvatar
            name={current.actorName}
            avatarOptions={current.actorAvatar}
            tier={current.actorTier}
            size={32}
          />
        ) : (
          <View
            style={[
              styles.tint,
              { backgroundColor: neutral ? theme.colors.hover : `${color}29` },
            ]}
          >
            <ToneIcon size={20} color={color} weight={neutral ? "regular" : "fill"} />
          </View>
        )}
        <Pressable
          accessibilityRole={current.onPress ? "button" : undefined}
          disabled={!current.onPress || !!current.action}
          onPress={press}
          style={styles.copy}
        >
          <AppText
            variant="body"
            weight="semibold"
            style={neutral ? undefined : { color }}
          >
            {current.title}
          </AppText>
          {current.description ? (
            <AppText variant="callout" weight="regular" tone="secondary">
              {current.description}
            </AppText>
          ) : null}
        </Pressable>
        {current.action ? (
          <Pressable
            accessibilityRole="button"
            onPress={press}
            hitSlop={8}
            style={styles.action}
          >
            <AppText
              variant="callout"
              weight="semibold"
              style={{ color: theme.colors.accentInk }}
            >
              {current.action}
            </AppText>
          </Pressable>
        ) : current.onPress ? (
          <CaretRight size={16} color={theme.colors.secondaryLabel} />
        ) : null}
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
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  tint: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  action: {
    height: 36,
    justifyContent: "center",
    paddingLeft: 8,
    paddingRight: 4,
  },
  copy: { flex: 1, minWidth: 0, gap: 2 },
});
