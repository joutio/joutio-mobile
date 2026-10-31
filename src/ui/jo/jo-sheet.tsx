import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { CaretLeft, X } from "@/ui/phosphor";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/ui/text";
import { motion } from "@/ui/tokens";
import { useNativeTheme } from "@/ui/theme";
import { JoIconButton } from "./jo-icon-button";

const OPEN_SPRING = {
  stiffness: motion.sheet.stiffness,
  damping: motion.sheet.damping,
};
const CLOSE_MS = motion.exit.duration;
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 800;
const EASING = Easing.bezier(...motion.exit.easing);

interface JoSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
  /** Étape précédente d'une feuille à plusieurs étapes. */
  onBack?: () => void;
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
  onBack,
  children,
}: JoSheetProps) {
  const { colors } = useNativeTheme();
  const { bottom } = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const offset = useSharedValue(height);
  const veil = useSharedValue(0);

  const open = () => {
    offset.value = withSpring(0, OPEN_SPRING);
    veil.value = withTiming(1, { duration: motion.micro.duration });
  };

  useEffect(() => {
    if (visible) {
      setMounted(true);
      return;
    }
    offset.value = withTiming(height, { duration: CLOSE_MS, easing: EASING });
    veil.value = withTiming(0, { duration: CLOSE_MS });
    const timer = setTimeout(() => setMounted(false), CLOSE_MS);
    return () => clearTimeout(timer);
  }, [height, offset, veil, visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
  }));
  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));

  const drag = useMemo(
    () =>
      Gesture.Pan()
        .onUpdate((event) => {
          offset.value = Math.max(0, event.translationY);
        })
        .onEnd((event) => {
          if (
            event.translationY > DISMISS_DISTANCE ||
            event.velocityY > DISMISS_VELOCITY
          ) {
            scheduleOnRN(onClose);
          } else {
            offset.value = withSpring(0, OPEN_SPRING);
          }
        }),
    [offset, onClose],
  );

  return (
    <Modal
      visible={mounted}
      onRequestClose={onClose}
      onShow={open}
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
            {
              backgroundColor: colors.surface,
              paddingBottom: bottom + 16,
              boxShadow: colors.shadow,
            },
            sheetStyle,
          ]}
        >
          <GestureDetector gesture={drag}>
            <View>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
              <View style={styles.header}>
                <View style={styles.side}>
                  {onBack ? (
                    <JoIconButton
                      label="Retour"
                      variant="filled"
                      icon={<CaretLeft size={20} color={colors.label} />}
                      onPress={onBack}
                    />
                  ) : null}
                </View>
                <View style={styles.copy}>
                  <AppText variant="headline" numberOfLines={1} style={styles.title}>
                    {title}
                  </AppText>
                  {subtitle ? (
                    <AppText
                      variant="footnote"
                      tone="secondary"
                      numberOfLines={1}
                      style={styles.title}
                    >
                      {subtitle}
                    </AppText>
                  ) : null}
                </View>
                <View style={[styles.side, styles.sideEnd]}>
                  {action ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={onAction}
                      hitSlop={12}
                      style={styles.action}
                    >
                      <AppText
                        variant="body"
                        weight="semibold"
                        numberOfLines={1}
                        style={{ color: colors.accentInk }}
                      >
                        {action}
                      </AppText>
                    </Pressable>
                  ) : (
                    <JoIconButton
                      label="Fermer"
                      variant="filled"
                      icon={<X size={20} color={colors.label} />}
                      onPress={onClose}
                    />
                  )}
                </View>
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
    height: 5,
    marginTop: 8,
    borderRadius: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 4,
    paddingBottom: 4,
    paddingHorizontal: 8,
  },
  side: { flex: 1, flexDirection: "row", minWidth: 44 },
  sideEnd: { justifyContent: "flex-end" },
  copy: { flexShrink: 1, minWidth: 0 },
  title: { textAlign: "center" },
  action: { height: 44, justifyContent: "center", paddingHorizontal: 8 },
});
