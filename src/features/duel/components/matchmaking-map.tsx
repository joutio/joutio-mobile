import { memo, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { Canvas, Group, Path, Skia } from "@shopify/react-native-skia";
import Animated, {
  cubicBezier,
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  type CSSAnimationKeyframes,
} from "react-native-reanimated";
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { NativeAvatar } from "@/ui/avatar";
import { LAND_PATH, MAP_HEIGHT, PLAYER_SPOTS } from "./world-map-data";

/** Valeurs de `design/matchmaking-map.html`. */
const SPEED = 18;
const SPAWN_MS = 420;
const LAND = "#222220";
const BG = "#000000";
const GLOW = "#E8B04A";
const RINGS = ["#3F444C", "#B86A32", "#8C95A3", "#D9A826", "#8C9FC9", "#2FBF77", "#5DB4E2"];
const SEEDS = ["Lucas", "Ines", "Hugo", "Nora", "Yanis", "Kenji", "Sofia", "Leo", "Amira", "Theo", "Jade", "Omar", "Lina", "Mateo", "Zoe", "Sami"];
const AVATAR = JSON.stringify({ style: "notionists", backgroundColor: "#f0f0f0" });
const POP = cubicBezier(0.34, 1.56, 0.64, 1);

const PIN_IN: CSSAnimationKeyframes = {
  from: { transform: [{ scale: 0 }], opacity: 0 },
  to: { transform: [{ scale: 1 }], opacity: 1 },
};

const PIN_OUT: CSSAnimationKeyframes = {
  from: { transform: [{ scale: 1 }], opacity: 1 },
  to: { transform: [{ scale: 0.6 }], opacity: 0 },
};

interface Pin {
  id: number;
  x: number;
  y: number;
  ring: string;
  seed: string;
  life: number;
}

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function PinView({ pin }: { pin: Pin }) {
  return (
    <Animated.View
      style={[
        styles.pin,
        {
          left: pin.x - 17,
          top: pin.y - 42,
          animationName: PIN_OUT,
          animationDuration: 400,
          animationDelay: pin.life,
          animationFillMode: "both",
        },
      ]}
    >
      <Animated.View
        style={[
          styles.pinInner,
          {
            animationName: PIN_IN,
            animationDuration: 520,
            animationTimingFunction: POP,
            animationFillMode: "both",
          },
        ]}
      >
        <View style={[styles.head, { backgroundColor: pin.ring }]} />
        <View style={styles.face}>
          <NativeAvatar name={pin.seed} avatarOptions={AVATAR} size={26} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const Overlay = memo(function Overlay({
  haloY,
  haloRadius,
}: {
  haloY: number;
  haloRadius: number;
}) {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient
          id="halo"
          gradientUnits="userSpaceOnUse"
          cx="50%"
          cy={haloY}
          r={haloRadius}
        >
          <Stop offset="0" stopColor={GLOW} stopOpacity={0.16} />
          <Stop offset="0.65" stopColor={GLOW} stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id="horizontal" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={BG} />
          <Stop offset="0.14" stopColor={BG} stopOpacity={0} />
          <Stop offset="0.86" stopColor={BG} stopOpacity={0} />
          <Stop offset="1" stopColor={BG} />
        </LinearGradient>
        <LinearGradient id="vertical" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={BG} />
          <Stop offset="0.18" stopColor={BG} stopOpacity={0} />
          <Stop offset="0.7" stopColor={BG} stopOpacity={0} />
          <Stop offset="1" stopColor={BG} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#halo)" />
      <Rect width="100%" height="100%" fill="url(#horizontal)" />
      <Rect width="100%" height="100%" fill="url(#vertical)" />
    </Svg>
  );
});

/** Fond de la recherche : portage de `design/matchmaking-map.html`, carte dessinée au GPU. */
export const MatchmakingMap = memo(function MatchmakingMap() {
  const { width, height } = useWindowDimensions();
  const mapWidth = Math.round(height * 1.9);
  const scale = height / MAP_HEIGHT;
  const start = mapWidth * 0.3;
  const land = useMemo(() => Skia.Path.MakeFromSVGString(LAND_PATH), []);
  const nextId = useRef(0);
  const [pins, setPins] = useState<Pin[]>([]);
  const offset = useSharedValue(start);

  useEffect(() => {
    offset.value = withRepeat(
      withTiming(start + mapWidth, {
        duration: (mapWidth / SPEED) * 1000,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, [mapWidth, offset, start]);

  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const spawn = () => {
      const current = offset.value;
      const visible = PLAYER_SPOTS.filter(([x]) => {
        const screen = ((x * scale - current) % mapWidth + mapWidth) % mapWidth;
        return screen > 30 && screen < width - 30;
      });
      if (visible.length === 0) return;
      const [x, y] = pick(visible);
      const stripX = x * scale < current ? x * scale + mapWidth : x * scale;
      const pin: Pin = {
        id: nextId.current++,
        x: stripX + Math.random() * 16 - 8,
        y: y * scale + Math.random() * 10 - 5,
        ring: pick(RINGS),
        seed: pick(SEEDS),
        life: 1800 + Math.random() * 1600,
      };
      setPins((list) => [...list, pin]);
      const timer = setTimeout(() => {
        timers.delete(timer);
        setPins((list) => list.filter((item) => item.id !== pin.id));
      }, pin.life + 450);
      timers.add(timer);
    };
    for (let index = 0; index < 5; index += 1) {
      timers.add(setTimeout(spawn, index * 180));
    }
    const interval = setInterval(spawn, SPAWN_MS);
    return () => {
      clearInterval(interval);
      timers.forEach(clearTimeout);
    };
  }, [mapWidth, offset, scale, width]);

  const first = useDerivedValue(() => [
    { translateX: -offset.value },
    { scale },
  ]);
  const second = useDerivedValue(() => [
    { translateX: mapWidth - offset.value },
    { scale },
  ]);
  const stripStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -offset.value }],
  }));

  return (
    <View style={[StyleSheet.absoluteFill, styles.root]} pointerEvents="none">
      {land ? (
        <Canvas style={StyleSheet.absoluteFill}>
          {[first, second].map((transform, index) => (
            <Group key={index} transform={transform}>
              <Path path={land} color={LAND} />
              <Path
                path={land}
                color={BG}
                style="stroke"
                strokeWidth={0.7 / scale}
              />
            </Group>
          ))}
        </Canvas>
      ) : null}
      <Animated.View style={[styles.strip, { width: mapWidth * 2 }, stripStyle]}>
        {pins.map((pin) => (
          <PinView key={pin.id} pin={pin} />
        ))}
      </Animated.View>
      <Overlay haloY={height * 0.46} haloRadius={210} />
    </View>
  );
});

const styles = StyleSheet.create({
  root: { overflow: "hidden", backgroundColor: BG },
  strip: { position: "absolute", top: 0, left: 0, bottom: 0 },
  pin: { position: "absolute", width: 34, height: 42, transformOrigin: "50% 100%" },
  pinInner: { width: 34, height: 42, transformOrigin: "50% 100%" },
  head: {
    position: "absolute",
    width: 34,
    height: 34,
    borderTopLeftRadius: 17,
    borderTopRightRadius: 17,
    borderBottomRightRadius: 17,
    borderBottomLeftRadius: 4,
    transform: [{ rotate: "-45deg" }],
    elevation: 6,
  },
  face: { position: "absolute", left: 4, top: 4, elevation: 7 },
});
