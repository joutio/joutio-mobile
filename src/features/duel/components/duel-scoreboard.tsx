import { memo } from "react";
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

const Side = memo(function Side({ name, score, tone, tier, avatarOptions, reverse }: SideProps) {
  const shown = useCountUp(score);
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
          variant="caption"
          weight="semibold"
          numberOfLines={1}
          style={styles.name}
        >
          {name}
        </AppText>
        <AppText
          variant="numeric"
          weight="bold"
          style={[styles.score, { color: SCORE_COLOR[tone] }]}
        >
          {shown}
        </AppText>
      </View>
    </View>
  );
});

interface SecondsLeftProps {
  deadline: number | null;
  frozen: boolean;
  style?: StyleProp<TextStyle>;
}

/** Secondes restantes : seule cette ligne suit l'horloge. */
export function SecondsLeft({ deadline, frozen, style }: SecondsLeftProps) {
  const now = useNow(250);
  const seconds =
    deadline && !frozen
      ? Math.min(10, Math.ceil(Math.max(0, deadline - now) / 1000))
      : 0;
  return (
    <AppText variant="numeric" weight="bold" style={style}>
      {seconds}
    </AppText>
  );
}

interface DuelScoreboardProps {
  me: Omit<SideProps, "reverse">;
  opponent: Omit<SideProps, "reverse">;
  deadline: number | null;
  frozen: boolean;
  low: boolean;
}

/** Joueurs, scores et temps restant, sous le chrono. */
export function DuelScoreboard({
  me,
  opponent,
  deadline,
  frozen,
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
  side: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 8 },
  reverse: { flexDirection: "row-reverse" },
  copy: { flex: 1, minWidth: 0 },
  alignEnd: { alignItems: "flex-end" },
  name: { color: "#FFFFFF" },
  score: { fontSize: 20, lineHeight: 28 },
  muted: { color: "#9B9B9B" },
  clock: { alignItems: "center" },
  seconds: { color: "#FFFFFF", fontSize: 24, lineHeight: 32 },
  low: { color: "#E5645A" },
});
