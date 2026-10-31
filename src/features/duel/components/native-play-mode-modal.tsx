import { useEffect, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { GlobeHemisphereWest, Link, Robot, UserPlus } from "phosphor-react-native";
import { ContactPickerSheet } from "@/features/challenges/components/contact-picker-sheet";
import { AppButton } from "@/ui/button";
import { JoListRow } from "@/ui/jo/jo-list-row";
import { JoSegmented } from "@/ui/jo/jo-segmented";
import { JoSheet } from "@/ui/jo/jo-sheet";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";
import type { BotDifficulty } from "@/shared/types/bff";
import { useCreateRoom, useStartBotRoom } from "../hooks/useRoom";
import { useStartMatchmaking } from "../hooks/useMatchmaking";

type PlayMode = "world" | "bot" | "private" | "challenge";

const DIFFICULTIES: { value: BotDifficulty; label: string }[] = [
  { value: "EASY", label: "Facile" },
  { value: "NORMAL", label: "Normal" },
  { value: "HARD", label: "Difficile" },
];

const CTA: Record<PlayMode, string> = {
  world: "Chercher un adversaire",
  bot: "Lancer l'entraînement",
  private: "Créer le salon",
  challenge: "Choisir un joueur",
};

interface NativePlayModeModalProps {
  visible: boolean;
  onClose: () => void;
  topicId: string;
  topicName: string;
}

/** Feuille « Lancer un duel » : le bouton suit le mode choisi. */
export function NativePlayModeModal({
  visible,
  onClose,
  topicId,
  topicName,
}: NativePlayModeModalProps) {
  const { colors } = useNativeTheme();
  const [mode, setMode] = useState<PlayMode>("world");
  const [difficulty, setDifficulty] = useState<BotDifficulty>("NORMAL");
  const [picking, setPicking] = useState(false);
  const startBot = useStartBotRoom();
  const startMatchmaking = useStartMatchmaking();
  const createRoom = useCreateRoom();

  useEffect(() => {
    if (visible) {
      setMode("world");
      setDifficulty("NORMAL");
    }
  }, [visible]);

  const pending =
    startBot.isPending || startMatchmaking.isPending || createRoom.isPending;
  const error = startBot.error ?? startMatchmaking.error ?? createRoom.error;

  const start = () => {
    if (mode === "challenge") {
      onClose();
      setPicking(true);
    } else if (mode === "bot") {
      startBot.mutate({ topicId, difficulty }, { onSuccess: onClose });
    } else if (mode === "world") {
      startMatchmaking.mutate(topicId, { onSuccess: onClose });
    } else {
      createRoom.mutate(topicId, { onSuccess: onClose });
    }
  };

  const modes: {
    value: PlayMode;
    label: string;
    sub: string;
    icon: ReactNode;
  }[] = [
    {
      value: "world",
      label: "Défier le monde",
      sub: "Adversaire en direct, apparié par Elo",
      icon: <GlobeHemisphereWest size={20} color={colors.secondaryLabel} />,
    },
    {
      value: "bot",
      label: "S'entraîner avec un robot",
      sub: "Aucune expérience gagnée",
      icon: <Robot size={20} color={colors.secondaryLabel} />,
    },
    {
      value: "private",
      label: "Créer un salon",
      sub: "Salon privé à partager par lien",
      icon: <Link size={20} color={colors.secondaryLabel} />,
    },
    {
      value: "challenge",
      label: "Défier un joueur",
      sub: "Invitation nominative : il accepte ou refuse",
      icon: <UserPlus size={20} color={colors.secondaryLabel} />,
    },
  ];

  return (
    <>
    <JoSheet
      visible={visible}
      onClose={onClose}
      title="Lancer un duel"
      subtitle={topicName}
    >
      <View style={styles.body}>
        <View style={[styles.list, { backgroundColor: colors.raised }]}>
          {modes.map((item, index) => (
            <JoListRow
              key={item.value}
              label={item.label}
              sub={item.sub}
              icon={item.icon}
              control="radio"
              on={mode === item.value}
              strong
              last={index === modes.length - 1}
              onPress={() => setMode(item.value)}
            />
          ))}
        </View>

        {mode === "bot" ? (
          <JoSegmented
            options={DIFFICULTIES}
            value={difficulty}
            onChange={setDifficulty}
          />
        ) : null}

        {error ? (
          <AppText variant="caption" tone="danger">
            Impossible de lancer le duel. Réessaie.
          </AppText>
        ) : null}

        <AppButton
          label={CTA[mode]}
          loading={pending}
          onPress={start}
          fullWidth
          size="lg"
        />
      </View>
    </JoSheet>
    <ContactPickerSheet
      visible={picking}
      onClose={() => setPicking(false)}
      topicId={topicId}
      topicName={topicName}
    />
    </>
  );
}

const styles = StyleSheet.create({
  body: { gap: 16, paddingHorizontal: 16 },
  list: { borderRadius: 16, overflow: "hidden" },
});
