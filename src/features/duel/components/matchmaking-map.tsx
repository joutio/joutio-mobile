import { memo, useEffect, useRef, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import {
  Canvas,
  Image as SkiaImage,
  PaintStyle,
  Skia,
  type SkImage,
} from "@shopify/react-native-skia";
import Animated, {
  cancelAnimation,
  cubicBezier,
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
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
import { AppText } from "@/ui/text";
import { COUNTRIES, type CountryPoint } from "./country-centroids";
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
/** Le fond ne gagne rien au-delà : au-dessus, la texture coûte plus qu'elle n'affine. */
const TEXTURE_DENSITY = 2;
const HALO_SIZE = 420;
/** `radial-gradient(circle, …)` s'étend jusqu'au coin de sa boîte. */
const HALO_RADIUS = (HALO_SIZE / 2) * Math.SQRT2;
const FOUND_PAN_MS = 700;
const FOUND_PIN_MS = 250;
const FOUND_TAG_MS = 550;
/** Durée de la transition d'entrée : le travail lourd attend qu'elle soit finie. */
const TRANSITION_MS = 350;

const PIN_IN: CSSAnimationKeyframes = {
  from: { transform: [{ scale: 0 }] },
  to: { transform: [{ scale: 1 }] },
};

const PIN_FADE: CSSAnimationKeyframes = {
  from: { opacity: 0 },
  to: { opacity: 1 },
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
  /** Options d'avatar : DiceBear par défaut, celles du joueur pour l'adversaire. */
  avatar?: string | null;
  life?: number;
}

export interface FoundOpponent {
  name: string;
  avatarOptions?: string | null;
  ring: string;
  country?: string | null;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/** Le pays du profil est un code ou un nom libre, selon sa saisie. */
function findCountry(country?: string | null): CountryPoint | null {
  if (!country) return null;
  const exact = COUNTRIES[country.trim().toUpperCase()];
  if (exact) return exact;
  const wanted = normalize(country);
  return (
    Object.values(COUNTRIES).find(
      (entry) =>
        normalize(entry.name) === wanted || normalize(entry.en) === wanted,
    ) ?? null
  );
}

function renderLand(width: number, height: number, scale: number) {
  const land = Skia.Path.MakeFromSVGString(LAND_PATH);
  const surface = Skia.Surface.MakeOffscreen(width, height);
  if (!land || !surface) return null;
  const canvas = surface.getCanvas();
  canvas.scale(scale, scale);
  const fill = Skia.Paint();
  fill.setColor(Skia.Color(LAND));
  canvas.drawPath(land, fill);
  const stroke = Skia.Paint();
  stroke.setColor(Skia.Color(BG));
  stroke.setStyle(PaintStyle.Stroke);
  stroke.setStrokeWidth(0.7 / (scale / TEXTURE_DENSITY) / TEXTURE_DENSITY);
  canvas.drawPath(land, stroke);
  surface.flush();
  return surface.makeImageSnapshot().makeNonTextureImage();
}

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

const PinView = memo(function PinView({
  pin,
  animated,
}: {
  pin: Pin;
  animated: boolean;
}) {
  const leaves = pin.life !== undefined;
  return (
    <Animated.View
      style={[
        styles.pin,
        { left: pin.x - 17, top: pin.y - 42 },
        leaves
          ? {
              animationName: PIN_OUT,
              animationDuration: 400,
              animationDelay: pin.life,
              animationFillMode: "both",
            }
          : undefined,
      ]}
    >
      <Animated.View
        style={[
          styles.pinInner,
          animated
            ? {
                animationName: PIN_FADE,
                animationDuration: 300,
                animationFillMode: "both",
              }
            : undefined,
        ]}
      >
        <Animated.View
          style={[
            styles.pinInner,
            animated
              ? {
                  animationName: PIN_IN,
                  animationDuration: 520,
                  animationTimingFunction: POP,
                  animationFillMode: "both",
                }
              : undefined,
          ]}
        >
          <View style={[styles.head, { backgroundColor: pin.ring }]} />
          <View style={styles.face}>
            <NativeAvatar
              name={pin.seed}
              avatarOptions={pin.avatar ?? AVATAR}
              size={26}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
});

const Fades = memo(function Fades() {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
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
      <Rect width="100%" height="100%" fill="url(#horizontal)" />
      <Rect width="100%" height="100%" fill="url(#vertical)" />
    </Svg>
  );
});

const Halo = memo(function Halo() {
  return (
    <Svg width={HALO_SIZE} height={HALO_SIZE}>
      <Defs>
        <RadialGradient
          id="halo"
          gradientUnits="userSpaceOnUse"
          cx={HALO_SIZE / 2}
          cy={HALO_SIZE / 2}
          r={HALO_RADIUS}
        >
          <Stop offset="0" stopColor={GLOW} stopOpacity={0.16} />
          <Stop offset="0.65" stopColor={GLOW} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#halo)" />
    </Svg>
  );
});

interface MatchmakingMapProps {
  /** Adversaire trouvé : la carte s'arrête et se centre sur son pays. */
  found?: FoundOpponent | null;
}

/** Fond de la recherche : portage de `design/matchmaking-map.html`. */
export const MatchmakingMap = memo(function MatchmakingMap({
  found,
}: MatchmakingMapProps) {
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const mapWidth = Math.round(height * 1.9);
  const scale = height / MAP_HEIGHT;
  const start = mapWidth * 0.3;
  const nextId = useRef(0);
  const lastSpot = useRef<readonly [number, number] | null>(null);
  const [land, setLand] = useState<SkImage | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [target, setTarget] = useState<Pin | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const offset = useSharedValue(start);
  const haloY = useSharedValue(height * 0.46);
  const landOpacity = useSharedValue(0);
  const searching = !found;

  // Après la transition : parser le tracé pendant le montage retarderait l'ouverture.
  useEffect(() => {
    const task = setTimeout(() => {
      setLand(
        renderLand(
          mapWidth * TEXTURE_DENSITY,
          height * TEXTURE_DENSITY,
          scale * TEXTURE_DENSITY,
        ),
      );
      landOpacity.value = withTiming(1, { duration: 300 });
    }, TRANSITION_MS);
    return () => clearTimeout(task);
  }, [height, landOpacity, mapWidth, scale]);

  useEffect(() => {
    if (!searching || reducedMotion) return;
    offset.value = withRepeat(
      withTiming(offset.value + mapWidth, {
        duration: (mapWidth / SPEED) * 1000,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
    return () => cancelAnimation(offset);
  }, [mapWidth, offset, reducedMotion, searching]);

  useEffect(() => {
    if (!searching) return;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const spawn = () => {
      const current = offset.value;
      const visible = PLAYER_SPOTS.filter(([x]) => {
        const screen = ((x * scale - current) % mapWidth + mapWidth) % mapWidth;
        return screen > 30 && screen < width - 30;
      });
      if (visible.length === 0) return;
      const spot = pick(visible);
      lastSpot.current = spot;
      const [x, y] = spot;
      const turns = Math.floor((current - x * scale) / mapWidth) + 1;
      const pin: Pin = {
        id: nextId.current++,
        x: x * scale + turns * mapWidth + Math.random() * 16 - 8,
        y: y * scale + Math.random() * 10 - 5,
        ring: pick(RINGS),
        seed: pick(SEEDS),
        life: 1800 + Math.random() * 1600,
      };
      setPins((list) => [...list, pin]);
      const timer = setTimeout(() => {
        timers.delete(timer);
        setPins((list) => list.filter((item) => item.id !== pin.id));
      }, (pin.life ?? 0) + 450);
      timers.add(timer);
    };
    const task = setTimeout(() => {
      for (let index = 0; index < 5; index += 1) {
        timers.add(setTimeout(spawn, index * 180));
      }
      const interval = setInterval(spawn, SPAWN_MS);
      timers.add(interval);
    }, TRANSITION_MS);
    return () => {
      clearTimeout(task);
      timers.forEach((timer) => {
        clearTimeout(timer);
        clearInterval(timer);
      });
    };
  }, [mapWidth, offset, scale, searching, width]);

  const name = found?.name;
  const ring = found?.ring;
  const avatar = found?.avatarOptions;
  const countryName = found?.country;

  useEffect(() => {
    if (!name || !ring) return;
    const country = findCountry(countryName);
    const [x, y] =
      country?.at ?? lastSpot.current ?? ([950, 460] as const);
    const current = offset.value;
    const base = x * scale - width / 2;
    const stop = base + Math.round((current - base) / mapWidth) * mapWidth;
    const pinX = stop + width / 2;
    const pan = reducedMotion ? 0 : FOUND_PAN_MS;
    cancelAnimation(offset);
    offset.value = withTiming(stop, { duration: pan, easing: Easing.out(Easing.cubic) });
    haloY.value = withDelay(
      0,
      withTiming(y * scale, { duration: pan, easing: Easing.out(Easing.cubic) }),
    );
    setPins([]);
    const pinTimer = setTimeout(
      () =>
        setTarget({
          id: nextId.current++,
          x: pinX,
          y: y * scale,
          ring,
          seed: name,
          avatar,
        }),
      FOUND_PIN_MS,
    );
    const tagTimer = setTimeout(
      () => setTag(country ? `${name} · ${country.name}` : name),
      FOUND_TAG_MS,
    );
    return () => {
      clearTimeout(pinTimer);
      clearTimeout(tagTimer);
    };
  }, [
    avatar,
    countryName,
    haloY,
    mapWidth,
    name,
    offset,
    reducedMotion,
    ring,
    scale,
    width,
  ]);

  /** Les deux copies de la carte se relaient : le décalage ne vit que modulo sa largeur. */
  const wrapped = useDerivedValue(
    () => ((offset.value % mapWidth) + mapWidth) % mapWidth,
  );
  const first = useDerivedValue(() => [{ translateX: -wrapped.value }]);
  const second = useDerivedValue(() => [
    { translateX: mapWidth - wrapped.value },
  ]);
  const opacity = useDerivedValue(() => landOpacity.value);
  const stripStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -offset.value }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: haloY.value - HALO_SIZE / 2 }],
  }));

  return (
    <View style={[StyleSheet.absoluteFill, styles.root]} pointerEvents="none">
      {land ? (
        <Canvas style={StyleSheet.absoluteFill}>
          {[first, second].map((transform, index) => (
            <SkiaImage
              key={index}
              image={land}
              x={0}
              y={0}
              width={mapWidth}
              height={height}
              fit="fill"
              transform={transform}
              opacity={opacity}
            />
          ))}
        </Canvas>
      ) : null}
      <Animated.View style={[styles.strip, { width: mapWidth * 2 }, stripStyle]}>
        {pins.map((pin) => (
          <PinView key={pin.id} pin={pin} animated={!reducedMotion} />
        ))}
        {target ? <PinView pin={target} animated={!reducedMotion} /> : null}
        {target && tag ? (
          <Animated.View
            style={[
              styles.tag,
              {
                top: target.y + 6,
                left: target.x,
                animationName: PIN_FADE,
                animationDuration: reducedMotion ? 0 : 400,
                animationFillMode: "both",
              },
            ]}
          >
            <AppText variant="caption" numberOfLines={1} style={styles.tagText}>
              {tag}
            </AppText>
          </Animated.View>
        ) : null}
      </Animated.View>
      <Animated.View
        style={[styles.halo, { left: (width - HALO_SIZE) / 2 }, haloStyle]}
      >
        <Halo />
      </Animated.View>
      <Fades />
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
    boxShadow: "0 6px 14px rgba(0,0,0,0.5)",
  },
  face: {
    position: "absolute",
    left: 4,
    top: 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  halo: { position: "absolute", top: 0 },
  tag: {
    position: "absolute",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    transform: [{ translateX: "-50%" }],
  },
  tagText: { color: "#000000" },
});
