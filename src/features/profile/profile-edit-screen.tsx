import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useMe } from "@/features/auth/hooks/useMe";
import { useUpdateProfile } from "@/features/profile/hooks/useUpdateProfile";
import { AppButton } from "@/ui/button";
import { AppCard } from "@/ui/card";
import { JoSegmented } from "@/ui/jo/jo-segmented";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
}) {
  const theme = useNativeTheme();
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="footnote" tone="secondary" weight="semibold">
        {label}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.tertiaryLabel}
        multiline={multiline}
        maxLength={maxLength}
        textAlignVertical={multiline ? "top" : "center"}
        style={[
          styles.input,
          {
            color: theme.colors.label,
            backgroundColor: theme.colors.fill,
            borderRadius: theme.radius.md,
            minHeight: multiline ? 104 : 44,
            paddingTop: multiline ? 12 : 0,
          },
        ]}
      />
    </View>
  );
}

export function ProfileEditScreen() {
  const theme = useNativeTheme();
  const me = useMe();
  const update = useUpdateProfile();

  const [pseudonym, setPseudonym] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState<"fr" | "en">("fr");

  useEffect(() => {
    if (!me.data) return;
    setPseudonym(me.data.pseudonym);
    setBio(me.data.bio ?? "");
    setCountry(me.data.country ?? "");
    setLanguage(me.data.language);
  }, [me.data]);

  if (me.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  if (!me.data) {
    return (
      <View style={styles.center}>
        <View style={{ gap: 16, alignItems: "center" }}>
          <AppText variant="headline">Impossible de charger le profil</AppText>
          <AppButton
            label="Réessayer"
            variant="secondary"
            onPress={() => void me.refetch()}
          />
        </View>
      </View>
    );
  }

  const save = () => {
    if (!pseudonym.trim()) return;
    update.mutate({
      userId: me.data.userId,
      current: me.data,
      values: {
        pseudonym,
        bio,
        country,
        language,
      },
    });
  };

  return (
    <KeyboardAwareScrollView
      bottomOffset={theme.spacing.lg}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        padding: theme.spacing.lg,
        paddingBottom: theme.spacing.xxl,
        gap: theme.spacing.lg,
      }}
    >
      <AppCard>
        <View style={{ gap: 18 }}>
          <Field
            label="Pseudonyme"
            value={pseudonym}
            onChangeText={setPseudonym}
            placeholder="Ton pseudo"
            maxLength={100}
          />
          <Field
            label="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Quelques mots sur toi"
            maxLength={300}
            multiline
          />
          <Field
            label="Pays"
            value={country}
            onChangeText={setCountry}
            placeholder="FR"
            maxLength={100}
          />

          <View style={{ gap: 8 }}>
            <AppText variant="footnote" tone="secondary" weight="semibold">
              Langue du contenu
            </AppText>
            <JoSegmented
              options={[
                { value: "fr", label: "Français" },
                { value: "en", label: "English" },
              ]}
              value={language}
              onChange={setLanguage}
            />
          </View>

          {update.isError ? (
            <AppText variant="footnote" tone="danger">
              Enregistrement impossible. Réessaie.
            </AppText>
          ) : null}
          {update.isSuccess ? (
            <AppText variant="footnote" tone="success">
              Profil enregistré.
            </AppText>
          ) : null}

          <AppButton
            label={update.isPending ? "Enregistrement…" : "Enregistrer"}
            loading={update.isPending}
            disabled={!pseudonym.trim()}
            onPress={save}
            fullWidth
            size="lg"
          />
        </View>
      </AppCard>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  input: {
    fontSize: 17,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
