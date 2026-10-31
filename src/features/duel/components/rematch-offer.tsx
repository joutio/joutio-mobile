import { useEffect, useRef, useState } from "react";
import { Modal, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  useAcceptChallenge,
  useDeclineChallenge,
  usePendingChallenges,
} from "@/features/challenges/hooks/useChallenges";
import { haptic } from "@/lib/haptics";
import { useNow } from "@/shared/hooks/useNow";
import { topicName } from "@/shared/utils/topic-name";
import type { Language } from "@/shared/types/bff";
import { JoButton } from "@/ui/jo/jo-button";
import { JoEloAvatar } from "@/ui/jo/jo-elo-avatar";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";

const OFFER_MS = 10_000;
const SIZE = 120;
const RADIUS = 57.5;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface RematchOfferProps {
  opponentId: string;
  topicId: string;
  language: Language;
}

/** Défi reçu de l'adversaire sur le même sujet, pendant que le résultat est affiché. */
export function RematchOffer({ opponentId, topicId, language }: RematchOfferProps) {
  const router = useRouter();
  const { colors } = useNativeTheme();
  const { received } = usePendingChallenges();
  const accept = useAcceptChallenge();
  const decline = useDeclineChallenge();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const offer = received.find(
    (challenge) =>
      challenge.challenger?.userId === opponentId &&
      challenge.topic.topicId === topicId &&
      challenge.challengeId !== dismissed,
  );
  const shownAt = useRef(0);
  const now = useNow(250);
  const left = useSharedValue(1);
  const offerId = offer?.challengeId;

  useEffect(() => {
    if (!offerId) return;
    shownAt.current = Date.now();
    haptic("medium");
    left.value = 1;
    left.value = withTiming(0, { duration: OFFER_MS, easing: Easing.linear });
  }, [left, offerId]);

  const remaining = shownAt.current
    ? Math.max(0, OFFER_MS - (now - shownAt.current))
    : OFFER_MS;

  useEffect(() => {
    if (offerId && shownAt.current && remaining === 0) setDismissed(offerId);
  }, [offerId, remaining]);

  const arc = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - left.value),
  }));

  if (!offer) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => setDismissed(offer.challengeId)}
    >
      <View style={[styles.scrim, { backgroundColor: colors.scrim }]}>
        <View
          accessibilityRole="alert"
          style={[
            styles.card,
            { backgroundColor: colors.surface, boxShadow: colors.shadow },
          ]}
        >
          <View style={styles.ring}>
            <Svg width={SIZE} height={SIZE} style={styles.arc}>
              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={colors.raised}
                strokeWidth={5}
              />
              <AnimatedCircle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke="#E8B04A"
                strokeWidth={5}
                strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                animatedProps={arc}
              />
            </Svg>
            <JoEloAvatar
              name={offer.challenger?.pseudonym ?? "Adversaire"}
              avatarOptions={offer.challenger?.avatarOptions}
              size={84}
            />
          </View>
          <AppText variant="numeric" tone="secondary" style={styles.count}>
            {Math.ceil(remaining / 1000)} s
          </AppText>
          <AppText variant="title2" style={styles.center}>
            {offer.challenger?.pseudonym ?? "Ton adversaire"} veut sa revanche
          </AppText>
          <AppText variant="callout" weight="regular" tone="secondary" style={styles.center}>
            Même sujet : {topicName(offer.topic.names, language)}
          </AppText>
          <View style={styles.actions}>
            <JoButton
              label="Accepter"
              loading={accept.isPending}
              onPress={() =>
                accept.mutate(offer.challengeId, {
                  onSuccess: (roomId) => {
                    if (roomId) router.replace(`/(app)/room/${roomId}`);
                  },
                })
              }
            />
            <JoButton
              label="Refuser"
              variant="plain"
              size="M"
              onPress={() => {
                setDismissed(offer.challengeId);
                decline.mutate(offer.challengeId);
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: "center", paddingHorizontal: 20 },
  card: {
    alignItems: "center",
    gap: 12,
    paddingTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderRadius: 24,
  },
  ring: {
    width: SIZE,
    height: SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  arc: { position: "absolute", transform: [{ rotate: "-90deg" }] },
  count: { fontSize: 12, lineHeight: 16, fontWeight: "400" },
  center: { textAlign: "center" },
  actions: { alignSelf: "stretch", gap: 8, marginTop: 4 },
});
