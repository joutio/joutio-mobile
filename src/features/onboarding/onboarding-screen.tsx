import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Lightning, Robot, Timer } from "phosphor-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMe } from "@/features/auth/hooks/useMe";
import { useStartBotRoom } from "@/features/duel/hooks/useRoom";
import { queryKeys } from "@/lib/query-keys";
import { meService } from "@/lib/services/me";
import { showToast } from "@/lib/toast";
import type { TopicCardView } from "@/shared/types/bff";
import { AppButton } from "@/ui/button";
import { JoChip } from "@/ui/jo/jo-chip";
import { JoLoading } from "@/ui/jo/jo-loading";
import { JoPill } from "@/ui/jo/jo-pill";
import { JoTopicCard } from "@/ui/jo/jo-topic-card";
import { AppText } from "@/ui/text";
import { categories, type CategoryCode } from "@/ui/tokens";
import { useNativeTheme } from "@/ui/theme";
import { HOME_HREF } from "@/lib/navigation";

const MAX_UNIVERSES = 3;
const CODES = Object.keys(categories) as CategoryCode[];

function Dots({ index }: { index: number }) {
  const { colors } = useNativeTheme();
  return (
    <View style={styles.dots}>
      {[0, 1].map((dot) => (
        <View
          key={dot}
          style={[
            styles.dot,
            { backgroundColor: dot === index ? colors.accent : colors.hover },
          ]}
        />
      ))}
    </View>
  );
}

/** Deux étapes : univers, puis premier thème recommandé contre un bot. */
export function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useNativeTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const me = useMe();
  const language = me.data?.language ?? "fr";
  const startBot = useStartBotRoom();
  const [step, setStep] = useState<0 | 1>(0);
  const [universes, setUniverses] = useState<string[]>([]);
  const [picked, setPicked] = useState<TopicCardView | null>(null);

  const recommendations = useQuery({
    queryKey: queryKeys.recommendations(universes),
    queryFn: () => meService.recommendations(universes),
    enabled: step === 1 && universes.length > 0,
  });

  const finish = useMutation({
    mutationFn: meService.completeOnboarding,
    onSuccess: (view) => queryClient.setQueryData(queryKeys.me(), view),
  });

  const saveInterests = useMutation({
    mutationFn: () => meService.saveInterests(universes),
    onSuccess: () => setStep(1),
    onError: () =>
      showToast({ title: "Enregistrement impossible, réessaie.", tone: "danger" }),
  });

  const leave = () =>
    finish.mutate(undefined, {
      onSuccess: () => router.replace(HOME_HREF),
    });

  const toggle = (code: string) =>
    setUniverses((current) =>
      current.includes(code)
        ? current.filter((item) => item !== code)
        : current.length < MAX_UNIVERSES
          ? [...current, code]
          : current,
    );

  const suggestions = recommendations.data ?? [];
  const main = picked ?? suggestions[0] ?? null;
  const others = suggestions.filter((topic) => topic.topicId !== main?.topicId);

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom + 16,
          backgroundColor: colors.background,
        },
      ]}
    >
      <View style={styles.top}>
        <Dots index={step} />
        <AppButton
          label={step === 0 ? "Passer" : "Explorer l'accueil"}
          variant="plain"
          disabled={finish.isPending}
          onPress={leave}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {step === 0 ? (
          <>
            <View style={styles.heading}>
              <AppText variant="largeTitle" weight="bold">
                Quels univers te tentent ?
              </AppText>
              <AppText variant="body" tone="secondary">
                Choisis 1 à 3 univers. Ils personnalisent ton accueil et nous
                servent à te proposer ton premier thème.
              </AppText>
            </View>
            <View style={styles.chips}>
              {CODES.map((code) => (
                <JoChip
                  key={code}
                  label={categories[code].label}
                  selected={universes.includes(code)}
                  onPress={() => toggle(code)}
                />
              ))}
            </View>
          </>
        ) : (
          <>
            <View style={styles.heading}>
              <AppText variant="largeTitle" weight="bold">
                Ton premier thème
              </AppText>
              <AppText variant="body" tone="secondary">
                D'après tes choix, voici le thème qu'on te propose pour
                commencer. Contre un bot, sans Elo ni XP.
              </AppText>
            </View>
            {recommendations.isPending ? <JoLoading /> : null}
            {main ? (
              <JoTopicCard topic={main} language={language} size="M" onPress={() => undefined} />
            ) : null}
            <View style={styles.tags}>
              <JoPill
                label="Bot · normal"
                icon={<Robot size={14} color={colors.secondaryLabel} />}
              />
              <JoPill
                label="7 manches · 10 s"
                icon={<Timer size={14} color={colors.secondaryLabel} />}
              />
            </View>
            {others.length > 0 ? (
              <View style={[styles.list, { backgroundColor: colors.surface }]}>
                {others.map((topic, index) => (
                  <JoTopicCard
                    key={topic.topicId}
                    topic={topic}
                    language={language}
                    size="row"
                    last={index === others.length - 1}
                    onPress={() => setPicked(topic)}
                  />
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step === 0 ? (
          <AppButton
            label={`Continuer · ${universes.length} / ${MAX_UNIVERSES}`}
            size="lg"
            fullWidth
            disabled={universes.length === 0}
            loading={saveInterests.isPending}
            onPress={() => saveInterests.mutate()}
          />
        ) : (
          <AppButton
            label="Découvrir le duel"
            size="lg"
            fullWidth
            disabled={!main}
            loading={finish.isPending || startBot.isPending}
            icon={<Lightning size={20} color={colors.onAccent} weight="fill" />}
            onPress={() => {
              if (!main) return;
              finish.mutate(undefined, {
                onSuccess: () => {
                  router.replace(HOME_HREF);
                  startBot.mutate({ topicId: main.topicId, difficulty: "NORMAL" });
                },
              });
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 24,
    paddingRight: 8,
  },
  dots: { flexDirection: "row", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  content: { gap: 24, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  heading: { gap: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tags: { flexDirection: "row", gap: 8 },
  list: { borderRadius: 16, overflow: "hidden" },
  footer: { paddingHorizontal: 24 },
});
