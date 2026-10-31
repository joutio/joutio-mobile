import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import { haptic } from "@/lib/haptics";
import { showToast } from "@/lib/toast";
import { AppButton } from "@/ui/button";
import { JoListRow } from "@/ui/jo/jo-list-row";
import { JoSheet } from "@/ui/jo/jo-sheet";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";

const REASONS = [
  { value: "CHEATING", label: "Triche ou aide extérieure" },
  { value: "INAPPROPRIATE_CONTENT", label: "Pseudo ou avatar inapproprié" },
  { value: "HARASSMENT", label: "Harcèlement" },
  { value: "HATE_SPEECH", label: "Propos haineux" },
  { value: "SPAM", label: "Spam" },
  { value: "OTHER", label: "Autre" },
];

const MAX_COMMENT = 280;

interface ReportPlayerSheetProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  name: string;
  gameId?: string;
}

/** Signalement anonyme : un motif, précision facultative. */
export function ReportPlayerSheet({
  visible,
  onClose,
  userId,
  name,
  gameId,
}: ReportPlayerSheetProps) {
  const { colors } = useNativeTheme();
  const [reason, setReason] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  const send = useMutation({
    mutationFn: () =>
      api.post<unknown>(ENDPOINTS.profiles.reports(userId), {
        reasons: [reason],
        comment: comment.trim() || undefined,
        gameId,
      }),
    onSuccess: () => {
      haptic("success");
      showToast({ title: "Signalement envoyé", tone: "success" });
      onClose();
    },
    onError: () =>
      showToast({ title: "Signalement impossible, réessaie.", tone: "danger" }),
  });

  return (
    <JoSheet visible={visible} onClose={onClose} title={`Signaler ${name}`}>
      <View style={styles.body}>
        <View style={[styles.list, { backgroundColor: colors.raised }]}>
          {REASONS.map((item, index) => (
            <JoListRow
              key={item.value}
              label={item.label}
              control="radio"
              on={reason === item.value}
              last={index === REASONS.length - 1}
              onPress={() => setReason(item.value)}
            />
          ))}
        </View>
        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder="Précisions facultatives"
          placeholderTextColor={colors.secondaryLabel}
          selectionColor={colors.accent}
          maxLength={MAX_COMMENT}
          multiline
          style={[styles.input, { color: colors.label, backgroundColor: colors.raised }]}
        />
        <AppText variant="footnote" tone="secondary" style={styles.note}>
          {name} ne saura pas que c'est toi.
        </AppText>
        <AppButton
          label="Envoyer le signalement"
          size="lg"
          fullWidth
          disabled={!reason}
          loading={send.isPending}
          onPress={() => send.mutate()}
        />
      </View>
    </JoSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12, paddingHorizontal: 16 },
  list: { borderRadius: 16, overflow: "hidden" },
  input: {
    minHeight: 72,
    padding: 12,
    borderRadius: 12,
    fontFamily: "Geist_400Regular",
    fontSize: 16,
    textAlignVertical: "top",
  },
  note: { textAlign: "center" },
});
