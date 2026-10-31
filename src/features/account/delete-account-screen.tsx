import { useEffect, useRef, useState, type ComponentRef } from "react";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Warning } from "phosphor-react-native";
import { useMutation } from "@tanstack/react-query";
import { useLogout } from "@/features/auth/hooks/useLogout";
import { useMe } from "@/features/auth/hooks/useMe";
import { haptic } from "@/lib/haptics";
import { meService } from "@/lib/services/me";
import { showToast } from "@/lib/toast";
import { eloTier } from "@/shared/utils/elo";
import { AppButton } from "@/ui/button";
import { JoBanner } from "@/ui/jo/jo-banner";
import { JoCodeInput } from "@/ui/jo/jo-code-input";
import { AppText } from "@/ui/text";
import { tierLabel } from "@/ui/tokens";
import { useNativeTheme } from "@/ui/theme";

/** Suppression immédiate et définitive, confirmée par un code envoyé par e-mail. */
export function DeleteAccountScreen() {
  const router = useRouter();
  const { colors } = useNativeTheme();
  const me = useMe();
  const signOut = useLogout();
  const [code, setCode] = useState("");
  const input = useRef<ComponentRef<typeof TextInput>>(null);

  const requestCode = useMutation({ mutationFn: meService.requestDeletionCode });
  const remove = useMutation({
    mutationFn: () => meService.deleteAccount(code),
    onSuccess: () => {
      haptic("success");
      void signOut();
    },
    onError: () => {
      haptic("error");
      showToast({ title: "Code incorrect ou expiré.", tone: "danger" });
    },
  });

  useEffect(() => {
    requestCode.mutate();
    // Un seul envoi à l'ouverture de l'écran.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rating = me.data?.progression.rating ?? 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <JoBanner
        tone="error"
        icon={<Warning size={24} color={colors.danger} />}
        title="C'est immédiat et définitif"
        message={`Ton profil, ton Elo ${tierLabel(eloTier(rating))} ${rating} et ta collection disparaissent.`}
      />
      <AppText variant="callout" tone="secondary">
        Tes parties restent chez tes adversaires sous « Joueur supprimé ».
      </AppText>
      <View style={styles.code}>
        <AppText variant="callout" weight="semibold">
          {requestCode.isError
            ? "Envoi du code impossible, réessaie."
            : `Code envoyé à ${me.data?.email ?? "ton adresse"}`}
        </AppText>
        <JoCodeInput digits={code} onPress={() => input.current?.focus()} />
        <TextInput
          ref={input}
          value={code}
          onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          maxLength={6}
          autoFocus
          caretHidden
          style={styles.hidden}
        />
      </View>
      <View style={styles.actions}>
        <AppButton
          label="Supprimer définitivement"
          variant="destructive"
          size="lg"
          fullWidth
          disabled={code.length !== 6}
          loading={remove.isPending}
          onPress={() => remove.mutate()}
        />
        <AppButton
          label="Garder mon compte"
          variant="plain"
          fullWidth
          onPress={() => router.back()}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 24, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
  code: { gap: 8 },
  hidden: { position: "absolute", width: 1, height: 1, opacity: 0 },
  actions: { gap: 8 },
});
