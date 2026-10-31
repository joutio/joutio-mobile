import { useEffect, useState } from "react";
import { Modal, StyleSheet, View } from "react-native";
import Animated, {
  type CSSAnimationKeyframes,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { haptic } from "@/lib/haptics";
import { AppButton } from "@/ui/button";
import { JoBadge } from "@/ui/jo/jo-badge";
import { JoEloAvatar } from "@/ui/jo/jo-elo-avatar";
import { AppText } from "@/ui/text";
import { EASE_POP, riseIn, EASE } from "@/ui/motion";
import { tierLabel } from "@/ui/tokens";
import { DarkTheme } from "@/ui/theme";
import type { Unlock } from "../domain/unlocks";
import { FAMILY_LABEL, familyIcon } from "./family-icon";

const DROP: CSSAnimationKeyframes = {
  "0%": { transform: [{ translateY: -80 }, { scale: 0.6 }], opacity: 0 },
  "70%": { transform: [{ translateY: 6 }, { scale: 1.06 }], opacity: 1 },
  "100%": { transform: [{ translateY: 0 }, { scale: 1 }], opacity: 1 },
};

interface UnlockCeremonyProps {
  unlocks: Unlock[];
  name: string;
  avatarOptions?: string | null;
  onDone: () => void;
}

/** Séquence plein écran après un duel : un déblocage à la fois, passable. */
export function UnlockCeremony({
  unlocks,
  name,
  avatarOptions,
  onDone,
}: UnlockCeremonyProps) {
  const { top, bottom } = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const unlock = unlocks[index];

  useEffect(() => {
    if (unlock) haptic("success");
  }, [unlock]);

  if (!unlock) return null;
  const rank = unlock.kind === "rank";

  return (
    <Modal visible transparent={false} animationType="fade" onRequestClose={onDone}>
      <DarkTheme value>
        <View
          style={[
            styles.root,
            { paddingTop: top + 8, paddingBottom: bottom + 24 },
          ]}
        >
          <View style={styles.top}>
            {unlocks.length > 1 ? (
              <AppButton label="Tout passer" variant="plain" onPress={onDone} />
            ) : null}
          </View>
          <View key={index} style={styles.body}>
            <AppText variant="caption" weight="semibold" style={styles.muted}>
              {rank
                ? `${tierLabel(unlock.from)} → ${tierLabel(unlock.tier)}`
                : (FAMILY_LABEL[unlock.family] ?? unlock.family)}
            </AppText>
            <Animated.View
              style={{
                animationName: DROP,
                animationDuration: 700,
                animationTimingFunction: EASE_POP,
                animationFillMode: "both",
              }}
            >
              {rank ? (
                <JoEloAvatar
                  name={name}
                  avatarOptions={avatarOptions}
                  size={180}
                  tier={unlock.tier}
                />
              ) : (
                <JoBadge tier={unlock.tier} size={180} icon={familyIcon(unlock.family)} />
              )}
            </Animated.View>
            <Animated.View
              style={[
                styles.copy,
                {
                  animationName: riseIn,
                  animationDuration: 400,
                  animationDelay: 400,
                  animationTimingFunction: EASE,
                  animationFillMode: "both",
                },
              ]}
            >
              <AppText variant="callout" weight="semibold" style={styles.eyebrow}>
                {rank ? "Nouveau rang débloqué" : "Nouveau badge débloqué"}
              </AppText>
              <AppText weight="bold" style={styles.headline}>
                {rank ? tierLabel(unlock.tier) : unlock.label}
              </AppText>
              <AppText variant="body" style={[styles.muted, styles.centered]}>
                {rank
                  ? `Tu passes ${unlock.rating} Elo. Ton nouveau cadre est visible par tes adversaires.`
                  : unlock.next
                    ? `Prochain palier : ${unlock.next}.`
                    : "Dernier palier de cette famille."}
              </AppText>
            </Animated.View>
          </View>
          <AppButton
            label={index < unlocks.length - 1 ? "Suivant" : "Continuer"}
            size="lg"
            fullWidth
            onPress={() =>
              index < unlocks.length - 1 ? setIndex(index + 1) : onDone()
            }
          />
        </View>
      </DarkTheme>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24, backgroundColor: "#070707" },
  top: { height: 52, alignItems: "flex-end", justifyContent: "center" },
  body: { flex: 1, alignItems: "center", justifyContent: "center", gap: 24 },
  copy: { alignItems: "center", gap: 8 },
  eyebrow: { color: "#E8B04A" },
  headline: {
    color: "#FFFFFF",
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -1,
    textAlign: "center",
  },
  muted: { color: "#9B9B9B" },
  centered: { textAlign: "center" },
});
