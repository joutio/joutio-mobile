import { memo, useRef } from "react";
import { StyleSheet, View, type StyleProp, type TextStyle } from "react-native";
import Animated from "react-native-reanimated";
import { useCountUp } from "@/shared/hooks/useCountUp";
import { useNow } from "@/shared/hooks/useNow";
import { JoEloAvatar } from "@/ui/jo/jo-elo-avatar";
import { AppText } from "@/ui/text";
import { lowPulse } from "@/ui/motion";

export type ScoreTone = "rest" | "correct" | "wrong";

export const SCORE_COLOR: Record<ScoreTone, string> = {
  rest: "#E8B04A",
  correct: "#4FB286",
  wrong: "#E5645A",
};

interface SideProps {
  name: string;
  score: number;
  tone: ScoreTone;
  tier?: string | null;
  avatarOptions?: string | null;
  reverse?: boolean;
}

/** Isolé : le décompte réécrit ce texte à chaque image, sans toucher aux avatars. */
function Score({ score, tone }: { score: number; tone: ScoreTone }) {
  const shown = useCountUp(score);
  return (
    <AppText
      variant="numeric"
      weight="bold"
      style={[styles.score, { color: SCORE_COLOR[tone] }]}
    >
      {shown}
    </AppText>
  );
}

const Side = memo(function Side({ name, score, tone, tier, avatarOptions, reverse }: SideProps) {
  return (
    <View style={[styles.side, reverse && styles.reverse]}>
      <JoEloAvatar
        name={name}
        avatarOptions={avatarOptions}
        size={44}
        tier={tier}
      />
      <View style={[styles.copy, reverse && styles.alignEnd]}>
        <AppText
          variant="callout"
          weight="bold"
          numberOfLines={1}
          style={styles.name}
        >
          {name}
        </AppText>
        <Score score={score} tone={tone} />
      </View>
    </View>
  );
});

interface SecondsLeftProps {
  deadline: number | null;
  frozen: boolean;
  /** Réponses pas encore ouvertes : 10 grisé. */
  reading?: boolean;
  style?: StyleProp<TextStyle>;
}

/** Secondes restantes : seule cette ligne suit l'horloge. */
export function SecondsLeft({
  deadline,
  frozen,
  reading = false,
  style,
}: SecondsLeftProps) {
  const now = useNow(250);
  // La révélation fige le compteur sur sa dernière valeur, sans le remettre à zéro.
  const last = useRef(10);
  if (deadline && !frozen) {
    last.current = Math.min(10, Math.ceil(Math.max(0, deadline - now) / 1000));
  }
  return (
    <AppText
      variant="numeric"
      weight="bold"
      style={[style, reading && styles.reading]}
    >
      {reading ? 10 : last.current}
    </AppText>
  );
}

interface DuelScoreboardProps {
  me: Omit<SideProps, "reverse">;
  opponent: Omit<SideProps, "reverse">;
  deadline: number | null;
  frozen: boolean;
  reading: boolean;
  low: boolean;
}

/** Joueurs, scores et temps restant, sous le chrono. */
export function DuelScoreboard({
  me,
  opponent,
  deadline,
  frozen,
  reading,
  low,
}: DuelScoreboardProps) {
  return (
    <View style={styles.board}>
      <Side {...me} />
      <View style={styles.clock}>
        <AppText variant="caption" weight="semibold" style={styles.muted}>
          Temps restant
        </AppText>
        <Animated.View
          style={
            low
              ? {
                  animationName: lowPulse,
                  animationDuration: 1000,
                  animationIterationCount: "infinite",
                }
              : undefined
          }
        >
          <SecondsLeft
            deadline={deadline}
            frozen={frozen}
            reading={reading}
            style={[styles.seconds, low && styles.low]}
          />
        </Animated.View>
      </View>
      <Side {...opponent} reverse />
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  side: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 12 },
  reverse: { flexDirection: "row-reverse" },
  copy: { flex: 1, minWidth: 0 },
  alignEnd: { alignItems: "flex-end" },
  name: { color: "#FFFFFF" },
  score: { fontSize: 20, lineHeight: 28 },
  muted: { color: "#9B9B9B" },
  clock: { alignItems: "center" },
  seconds: { color: "#FFFFFF", fontSize: 24, lineHeight: 32 },
  low: { color: "#E5645A" },
  reading: { color: "#4A4A50" },
});
