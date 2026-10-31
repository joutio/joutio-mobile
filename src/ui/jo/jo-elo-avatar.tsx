import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { NativeAvatar } from "@/ui/avatar";
import { LockSimple } from "@/ui/phosphor";
import { spin } from "@/ui/motion";
import { tierHex } from "@/ui/tokens";
import { useNativeTheme } from "@/ui/theme";
import { RANK_FRAMES } from "./rank-frames";

const FRAME_OVERFLOW = 0.22;
const SIMPLE_BELOW = 40;

interface JoEloAvatarProps {
  name: string;
  avatarOptions?: string | null;
  size?: number;
  /** Palier Elo : cadre métal. Sans palier, cadre provisoire en pointillés. */
  tier?: string | null;
  /** Reflets en rotation : réservé aux grands avatars, jamais aux listes. */
  animated?: boolean;
  locked?: boolean;
}

/** Avatar cerclé du métal de rang, selon `Elo Avatar`. */
export function JoEloAvatar({
  name,
  avatarOptions,
  size = 44,
  tier,
  animated = false,
  locked = false,
}: JoEloAvatarProps) {
  const { colors } = useNativeTheme();
  const reducedMotion = useReducedMotion();
  const key = tier?.toUpperCase();
  const spec = key ? RANK_FRAMES[key] : undefined;

  if (size < SIMPLE_BELOW) {
    const width = Math.max(1, Math.min(4, size * 0.05));
    return (
      <View style={{ width: size, height: size }}>
        <Portrait
          name={name}
          avatarOptions={avatarOptions}
          size={size}
          locked={locked}
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            inset: -width,
            borderWidth: width,
            borderRadius: 9999,
            borderColor: key ? tierHex(key) : colors.border,
          }}
        />
      </View>
    );
  }

  const inset = (spec?.inset ?? 0.08) * size;
  const box = size * (1 + 2 * FRAME_OVERFLOW);
  const layer = {
    position: "absolute" as const,
    left: -size * FRAME_OVERFLOW,
    top: -size * FRAME_OVERFLOW,
    width: box,
    height: box,
  };
  const moving = animated && !reducedMotion;

  return (
    <View style={{ width: size, height: size }}>
      {!spec ? (
        <View style={[styles.provisional, { borderColor: colors.border }]} />
      ) : key === "FER" ? (
        <View style={[StyleSheet.absoluteFill, styles.fer]} />
      ) : null}
      {spec?.frame ? (
        <Animated.View
          pointerEvents="none"
          style={[
            layer,
            spec.pulse && moving
              ? {
                  animationName: pulse,
                  animationDuration: 2400,
                  animationIterationCount: "infinite",
                  animationDirection: "alternate",
                  animationTimingFunction: "ease-in-out",
                }
              : undefined,
          ]}
        >
          <Image source={spec.frame} style={styles.fill} transition={0} />
        </Animated.View>
      ) : null}
      {spec?.spin ? (
        <Layer style={layer} {...spec.spin} moving={moving} />
      ) : null}
      {spec?.counter ? (
        <Layer style={layer} {...spec.counter} moving={moving} reverse />
      ) : null}
      <View style={{ position: "absolute", left: inset, top: inset }}>
        <Portrait
          name={name}
          avatarOptions={avatarOptions}
          size={size - 2 * inset}
          locked={locked}
        />
      </View>
      {locked ? (
        <View
          style={[
            styles.lock,
            {
              width: size * 0.3,
              height: size * 0.3,
              backgroundColor: colors.label,
              borderColor: colors.background,
            },
          ]}
        >
          <LockSimple
            size={size * 0.18}
            color={colors.background}
            weight="fill"
          />
        </View>
      ) : null}
    </View>
  );
}

const pulse = {
  from: { opacity: 0.55 },
  to: { opacity: 1 },
};

interface LayerProps {
  source: number;
  duration: number;
  moving: boolean;
  reverse?: boolean;
  style: object;
}

function Layer({ source, duration, moving, reverse = false, style }: LayerProps) {
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        style,
        moving
          ? {
              animationName: spin,
              animationDuration: duration,
              animationIterationCount: "infinite",
              animationTimingFunction: "linear",
              animationDirection: reverse ? "reverse" : "normal",
            }
          : undefined,
      ]}
    >
      <Image source={source} style={styles.fill} transition={0} />
    </Animated.View>
  );
}

interface PortraitProps {
  name: string;
  avatarOptions?: string | null;
  size: number;
  locked: boolean;
}

/** Détouré ici : le SVG DiceBear remplit un carré. */
function Portrait({ name, avatarOptions, size, locked }: PortraitProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        opacity: locked ? 0.55 : 1,
      }}
    >
      <NativeAvatar name={name} avatarOptions={avatarOptions} size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { width: "100%", height: "100%" },
  provisional: {
    ...StyleSheet.absoluteFill,
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 9999,
  },
  fer: { borderRadius: 9999, backgroundColor: "#3F444C" },
  lock: {
    position: "absolute",
    right: 0,
    bottom: 0,
    borderRadius: 9999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
