import { useEffect, useState, type ReactNode } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { X } from "phosphor-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";
import { JoIconButton } from "./jo-icon-button";

const OPEN_MS = 320;
const CLOSE_MS = 220;
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 800;
const EASING = Easing.bezier(0.22, 1, 0.36, 1);

interface JoSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
  children: ReactNode;
}

/**
 * Feuille basse sur `Modal` : le contenu React Native y reçoit les touches, ce que la feuille
 * Expo UI ne garantissait pas dans Expo Go. On la ferme au voile, au retour ou en tirant l'en-tête.
 */
export function JoSheet({
  visible,
  onClose,
  title,
  subtitle,
  action,
  onAction,
  children,
}: JoSheetProps) {
  const { colors } = useNativeTheme();
  const { bottom } = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const offset = useSharedValue(height);
  const veil = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      offset.value = withTiming(0, { duration: OPEN_MS, easing: EASING });
      veil.value = withTiming(1, { duration: OPEN_MS });
      return;
    }
    offset.value = withTiming(height, { duration: CLOSE_MS });
    veil.value = withTiming(0, { duration: CLOSE_MS });
    const timer = setTimeout(() => setMounted(false), CLOSE_MS);
    return () => clearTimeout(timer);
  }, [height, offset, veil, visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
  }));
  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));

  const drag = Gesture.Pan()
    .runOnJS(true)
    .onUpdate((event) => {
      offset.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      if (
        event.translationY > DISMISS_DISTANCE ||
        event.velocityY > DISMISS_VELOCITY
      ) {
        onClose();
      } else {
        offset.value = withTiming(0, { duration: CLOSE_MS, easing: EASING });
      }
    });

  return (
    <Modal
      visible={mounted}
      onRequestClose={onClose}
      animationType="none"
      transparent
      statusBarTranslucent
      navigationBarTranslucent
    >
      <GestureHandlerRootView style={styles.root}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.scrim },
            veilStyle,
          ]}
        >
          <Pressable
            accessibilityLabel="Fermer"
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, paddingBottom: bottom + 16 },
            sheetStyle,
          ]}
        >
          <GestureDetector gesture={drag}>
            <View>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
              <View style={styles.header}>
                <View style={styles.copy}>
                  <AppText variant="title2" weight="semibold" numberOfLines={1}>
                    {title}
                  </AppText>
                  {subtitle ? (
                    <AppText variant="caption" tone="secondary" numberOfLines={1}>
                      {subtitle}
                    </AppText>
                  ) : null}
                </View>
                {action ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={onAction}
                    hitSlop={12}
                  >
                    <AppText
                      variant="callout"
                      weight="semibold"
                      style={{ color: colors.accentInk }}
                    >
                      {action}
                    </AppText>
                  </Pressable>
                ) : (
                  <JoIconButton
                    label="Fermer"
                    icon={<X size={20} color={colors.label} />}
                    onPress={onClose}
                  />
                )}
              </View>
            </View>
          </GestureDetector>
          {children}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    marginTop: 8,
    borderRadius: 2,
  },
  header: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    paddingLeft: 16,
    paddingRight: 8,
  },
  copy: { flex: 1, minWidth: 0 },
});
