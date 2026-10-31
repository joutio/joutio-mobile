import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  type CSSAnimationKeyframes,
} from "react-native-reanimated";
import { haptic } from "@/lib/haptics";
import { JoEloAvatar } from "@/ui/jo/jo-elo-avatar";
import { AppText } from "@/ui/text";
import { EASE, EASE_POP } from "@/ui/motion";

const slide = (key: "translateX" | "translateY", from: string) =>
  ({
    from: { transform: [{ [key]: from }] },
    to: { transform: [{ [key]: "0%" }] },
  }) as CSSAnimationKeyframes;

const SEAM_IN: CSSAnimationKeyframes = {
  from: { transform: [{ scaleX: 0 }] },
  to: { transform: [{ scaleX: 1 }] },
};

const VS_IN: CSSAnimationKeyframes = {
  "0%": { transform: [{ scale: 0 }, { rotate: "-90deg" }], opacity: 0 },
  "70%": { transform: [{ scale: 1.12 }, { rotate: "0deg" }], opacity: 1 },
  "100%": { transform: [{ scale: 1 }, { rotate: "0deg" }], opacity: 1 },
};

const LATE_RISE: CSSAnimationKeyframes = {
  from: { transform: [{ translateY: 12 }], opacity: 0 },
  to: { transform: [{ translateY: 0 }], opacity: 1 },
};

function entry(name: CSSAnimationKeyframes, duration: number, delay = 0) {
  return {
    animationName: name,
    animationDuration: duration,
    animationDelay: delay,
    animationTimingFunction: EASE,
    animationFillMode: "both" as const,
  };
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
}

/** Écran VS : deux moitiés séparées par un filet ambre. */
export function FaceOff({ me, opponent, topic }: FaceOffProps) {
  useEffect(() => {
    const timer = setTimeout(() => haptic("medium"), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.root}>
      <Animated.View
        style={[styles.half, styles.top, entry(slide("translateY", "-100%"), 320)]}
      >
        <Animated.View
          style={[styles.player, entry(slide("translateX", "-110%"), 360, 190)]}
        >
          <JoEloAvatar
            name={me.name}
            avatarOptions={me.avatarOptions}
            size={112}
            tier={me.tier}
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
        style={[styles.half, styles.bottom, entry(slide("translateY", "100%"), 320)]}
      >
        <Animated.View
          style={[
            styles.player,
            styles.reverse,
            entry(slide("translateX", "110%"), 360, 270),
          ]}
        >
          <JoEloAvatar name={opponent.name} size={112} tier={opponent.tier} />
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
      <Animated.View style={[styles.seam, entry(SEAM_IN, 140, 240)]} />
      <Animated.View
        style={[
          styles.vs,
          {
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
      <Animated.View style={[styles.topicWrap, entry(LATE_RISE, 220, 760)]}>
        <AppText variant="callout" weight="semibold" style={styles.topic}>
          {topic}
        </AppText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0B0B0B" },
  half: { flex: 1, paddingHorizontal: 24 },
  top: { backgroundColor: "#131209", justifyContent: "center" },
  bottom: { backgroundColor: "#111114", justifyContent: "center" },
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
  },
  vsText: { color: "#000000" },
  topicWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    top: "50%",
    marginTop: 54,
  },
  topic: { textAlign: "center", color: "#9B9B9B" },
});
