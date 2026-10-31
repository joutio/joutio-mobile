import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useReducedMotion,
  type CSSAnimationKeyframes,
} from "react-native-reanimated";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { haptic } from "@/lib/haptics";
import { JoCategoryIcon } from "@/ui/jo/jo-category-icon";
import { JoEloAvatar } from "@/ui/jo/jo-elo-avatar";
import { AppText } from "@/ui/text";
import { EASE, EASE_POP } from "@/ui/motion";

const slide = (key: "translateX" | "translateY", from: string) =>
  ({
    from: { transform: [{ [key]: from }] },
    to: { transform: [{ [key]: "0%" }] },
  }) as CSSAnimationKeyframes;

/** Durée de la sortie : le VS se replie, puis les volets découvrent le HUD. */
export const FACE_OFF_EXIT_MS = 1450;
const FOLD_MS = 400;
const SHUTTER_MS = 800;
const HALO = 420;

/** `ff-seam` : le filet apparaît, puis s'efface une fois le VS arrivé. */
const SEAM_IN: CSSAnimationKeyframes = {
  "0%": { transform: [{ scaleX: 0 }], opacity: 1 },
  "33%": { transform: [{ scaleX: 1 }], opacity: 1 },
  "100%": { transform: [{ scaleX: 1 }], opacity: 0 },
};

const RING: CSSAnimationKeyframes = {
  from: { transform: [{ scale: 0.8 }], opacity: 0.7 },
  to: { transform: [{ scale: 2.4 }], opacity: 0 },
};

const VS_OUT: CSSAnimationKeyframes = {
  from: { transform: [{ scale: 1 }, { rotate: "0deg" }], opacity: 1 },
  to: { transform: [{ scale: 0 }, { rotate: "90deg" }], opacity: 0 },
};

const FADE_OUT: CSSAnimationKeyframes = {
  from: { opacity: 1 },
  to: { opacity: 0 },
};

const leaveTo = (to: string): CSSAnimationKeyframes => ({
  from: { transform: [{ translateY: "0%" }] },
  to: { transform: [{ translateY: to }] },
});

const VS_IN: CSSAnimationKeyframes = {
  "0%": { transform: [{ scale: 0 }, { rotate: "-90deg" }], opacity: 0 },
  "70%": { transform: [{ scale: 1.12 }, { rotate: "0deg" }], opacity: 1 },
  "100%": { transform: [{ scale: 1 }, { rotate: "0deg" }], opacity: 1 },
};

const LATE_RISE: CSSAnimationKeyframes = {
  from: { transform: [{ translateY: 12 }], opacity: 0 },
  to: { transform: [{ translateY: 0 }], opacity: 1 },
};

function entryStyle(name: CSSAnimationKeyframes, duration: number, delay = 0) {
  return {
    animationName: name,
    animationDuration: duration,
    animationDelay: delay,
    animationTimingFunction: EASE,
    animationFillMode: "both" as const,
  };
}

function Glow({ id, color }: { id: string; color: string }) {
  return (
    <Svg width={HALO} height={HALO}>
      <Defs>
        <RadialGradient
          id={id}
          gradientUnits="userSpaceOnUse"
          cx={HALO / 2}
          cy={HALO / 2}
          r={(HALO / 2) * Math.SQRT2}
        >
          <Stop offset="0" stopColor={color} stopOpacity={0.22} />
          <Stop offset="0.65" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

interface FaceOffPlayer {
  name: string;
  detail?: string;
  tier?: string | null;
  avatarOptions?: string | null;
}

interface FaceOffProps {
  me: FaceOffPlayer;
  opponent: FaceOffPlayer;
  topic: string;
  category?: string | null;
  color: string;
  /** Les volets s'ouvrent et découvrent le HUD déjà en place. */
  leaving: boolean;
}

/** Écran VS : deux volets séparés par un filet ambre. */
export function FaceOff({
  me,
  opponent,
  topic,
  category,
  color,
  leaving,
}: FaceOffProps) {
  const reducedMotion = useReducedMotion();
  const entry = (name: CSSAnimationKeyframes, duration: number, delay = 0) =>
    reducedMotion ? undefined : entryStyle(name, duration, delay);

  useEffect(() => {
    const timer = setTimeout(() => haptic("medium"), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => haptic("light"), FOLD_MS);
    return () => clearTimeout(timer);
  }, [leaving]);

  const fade = entry(FADE_OUT, FOLD_MS);
  const open = (to: string) => entry(leaveTo(to), SHUTTER_MS, FOLD_MS);

  return (
    <View style={styles.root} pointerEvents={leaving ? "none" : "auto"}>
      <Animated.View
        style={[
          styles.half,
          styles.top,
          leaving
            ? open("-100%")
            : entry(slide("translateY", "-100%"), 320),
        ]}
      >
        <View style={styles.glowTop}>
          <Glow id="ff-top" color="#E8B04A" />
        </View>
        <Animated.View
          style={[styles.player, entry(slide("translateX", "-110%"), 360, 190)]}
        >
          <JoEloAvatar
            name={me.name}
            avatarOptions={me.avatarOptions}
            size={112}
            tier={me.tier}
            animated
          />
          <View style={styles.copy}>
            <AppText variant="title1" weight="bold" numberOfLines={2} style={styles.name}>
              {me.name}
            </AppText>
            {me.detail ? (
              <AppText variant="numeric" style={styles.mine}>
                {me.detail}
              </AppText>
            ) : null}
          </View>
        </Animated.View>
      </Animated.View>
      <Animated.View
        style={[
          styles.half,
          styles.bottom,
          leaving ? open("100%") : entry(slide("translateY", "100%"), 320),
        ]}
      >
        <View style={styles.glowBottom}>
          <Glow id="ff-bottom" color="#8C9FC9" />
        </View>
        <Animated.View
          style={[
            styles.player,
            styles.reverse,
            entry(slide("translateX", "110%"), 360, 270),
          ]}
        >
          <JoEloAvatar
            name={opponent.name}
            avatarOptions={opponent.avatarOptions}
            size={112}
            tier={opponent.tier}
            animated
          />
          <View style={[styles.copy, styles.alignEnd]}>
            <AppText
              variant="title1"
              weight="bold"
              numberOfLines={2}
              style={[styles.name, styles.right]}
            >
              {opponent.name}
            </AppText>
            {opponent.detail ? (
              <AppText variant="numeric" style={styles.theirs}>
                {opponent.detail}
              </AppText>
            ) : null}
          </View>
        </Animated.View>
      </Animated.View>
      {leaving ? (
        <Animated.View style={[styles.seam, fade]} />
      ) : (
        <Animated.View style={[styles.seam, entry(SEAM_IN, 405, 243)]} />
      )}
      {leaving ? null : (
        <Animated.View style={[styles.ring, entry(RING, 460, 675)]} />
      )}
      <Animated.View
        style={[
          styles.vs,
          reducedMotion
            ? undefined
            : leaving
            ? {
                animationName: VS_OUT,
                animationDuration: FOLD_MS,
                animationTimingFunction: EASE,
                animationFillMode: "both",
              }
            : {
                animationName: VS_IN,
                animationDuration: 300,
                animationDelay: 480,
                animationTimingFunction: EASE_POP,
                animationFillMode: "both",
              },
        ]}
      >
        <AppText variant="title1" weight="bold" style={styles.vsText}>
          VS
        </AppText>
      </Animated.View>
      <Animated.View
        style={[styles.topicWrap, leaving ? fade : entry(LATE_RISE, 220, 760)]}
      >
        <View style={styles.chip}>
          <View style={[styles.chipTile, { backgroundColor: color }]}>
            <JoCategoryIcon category={category} size={12} />
          </View>
          <AppText variant="caption" numberOfLines={1} style={styles.name}>
            {topic} · 7 manches
          </AppText>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, zIndex: 3 },
  half: { flex: 1, paddingHorizontal: 24, overflow: "hidden" },
  top: { backgroundColor: "#131209", justifyContent: "flex-start", paddingTop: 74 },
  bottom: { backgroundColor: "#111114", justifyContent: "flex-end", paddingBottom: 64 },
  glowTop: { position: "absolute", left: "-30%", top: "10%" },
  glowBottom: { position: "absolute", right: "-30%", bottom: "6%" },
  player: { flexDirection: "row", alignItems: "center", gap: 16 },
  reverse: { flexDirection: "row-reverse" },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  alignEnd: { alignItems: "flex-end" },
  name: { color: "#FFFFFF" },
  right: { textAlign: "right" },
  mine: { color: "#E8B04A", fontSize: 14, lineHeight: 20 },
  theirs: { color: "#C9D4F0", fontSize: 14, lineHeight: 20 },
  seam: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    height: 2,
    marginTop: -1,
    backgroundColor: "#E8B04A",
  },
  vs: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 76,
    height: 76,
    marginLeft: -38,
    marginTop: -38,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8B04A",
    boxShadow: "0 0 0 8px rgba(232,176,74,0.16)",
  },
  ring: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 76,
    height: 76,
    marginLeft: -38,
    marginTop: -38,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: "#E8B04A",
  },
  vsText: { color: "#000000" },
  topicWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    top: "50%",
    marginTop: 54,
    alignItems: "center",
  },
  chip: {
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 12,
    borderRadius: 9999,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  chipTile: {
    width: 24,
    height: 24,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
});
