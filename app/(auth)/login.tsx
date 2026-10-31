import { useEffect, useRef, useState, type ComponentRef } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CaretLeft, FacebookLogo, GoogleLogo, Prohibit } from "phosphor-react-native";
import type { SessionEndReason } from "@/shared/types/session";
import { isFacebookSignInAvailable } from "@/features/auth/lib/facebook";
import { isGoogleSignInAvailable } from "@/features/auth/lib/google";
import { useNativeLogin } from "@/features/auth/hooks/useNativeLogin";
import { useSessionStore } from "@/features/auth/session-store";
import { JoBanner } from "@/ui/jo/jo-banner";
import { JoButton } from "@/ui/jo/jo-button";
import { JoCodeInput } from "@/ui/jo/jo-code-input";
import { JoDivider } from "@/ui/jo/jo-divider";
import { JoField } from "@/ui/jo/jo-field";
import { JoLockup } from "@/ui/jo/jo-lockup";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";

const emailSchema = z.object({
  email: z.string().email("Adresse email invalide"),
});

type EmailValues = z.infer<typeof emailSchema>;
type Step = "email" | "code";

const RESEND_COOLDOWN_MS = 60_000;
/** Garde le bouton « Recevoir un code » visible sous le champ email. */
const EMAIL_BOTTOM_OFFSET = 76;
/** Garde le renvoi du code visible sous les chiffres. */
const CODE_BOTTOM_OFFSET = 64;

const END_REASON_MESSAGE: Record<SessionEndReason, string> = {
  expired: "Ta session a expiré. Reconnecte-toi.",
  suspended: "Ton compte est suspendu. Consulte l'email reçu.",
  unknownUser: "Ce compte n'existe plus. Reconnecte-toi avec un autre compte.",
};

function errorMessage(error: unknown): string | null {
  return error instanceof Error ? error.message : null;
}

function formatTimer(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function LoginScreen() {
  const theme = useNativeTheme();
  const { requestCode, loginWithCode, loginWithGoogle, loginWithFacebook } =
    useNativeLogin();
  const endReason = useSessionStore((state) => state.endReason);

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const codeInputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const lastSubmittedCode = useRef<string | null>(null);

  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  useEffect(() => {
    if (step !== "code") return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [step]);

  useEffect(() => {
    if (step !== "code") return;
    if (code.length !== 6) {
      lastSubmittedCode.current = null;
      return;
    }
    if (lastSubmittedCode.current === code) return;
    lastSubmittedCode.current = code;
    loginWithCode.mutate({ email, code });
    // `loginWithCode` est volontairement hors dépendances : le garde-fou
    // ci-dessus évite une boucle de soumission après une erreur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, email, step]);

  const remainingSeconds = Math.max(
    0,
    Math.ceil((resendAvailableAt - now) / 1000),
  );
  const googleAvailable = isGoogleSignInAvailable();
  const facebookAvailable = isFacebookSignInAvailable();
  const pending =
    requestCode.isPending ||
    loginWithCode.isPending ||
    loginWithGoogle.isPending ||
    loginWithFacebook.isPending;
  const error =
    errorMessage(loginWithCode.error) ??
    errorMessage(loginWithGoogle.error) ??
    errorMessage(loginWithFacebook.error) ??
    errorMessage(requestCode.error);

  const onSubmitEmail = async (values: EmailValues) => {
    try {
      const normalized = values.email.trim();
      await requestCode.mutateAsync(normalized);
      setEmail(normalized);
      setCode("");
      lastSubmittedCode.current = null;
      loginWithCode.reset();
      loginWithGoogle.reset();
      loginWithFacebook.reset();
      setStep("code");
      setResendAvailableAt(Date.now() + RESEND_COOLDOWN_MS);
      setNow(Date.now());
      setTimeout(() => codeInputRef.current?.focus(), 250);
    } catch {
      // L'erreur est portée par la mutation.
    }
  };

  const onResend = async () => {
    if (remainingSeconds > 0) return;
    try {
      await requestCode.mutateAsync(email);
      setResendAvailableAt(Date.now() + RESEND_COOLDOWN_MS);
      setNow(Date.now());
    } catch {
      // L'erreur est portée par la mutation.
    }
  };

  const backToEmail = () => {
    setStep("email");
    setEmail("");
    setCode("");
    lastSubmittedCode.current = null;
    loginWithCode.reset();
    loginWithGoogle.reset();
    loginWithFacebook.reset();
    requestCode.reset();
  };

  const onGoogle = () => {
    if (!googleAvailable) {
      Alert.alert(
        "Disponible dans l'application native",
        "La connexion Google nécessite un build natif (pas Expo Go). Utilise le code par e-mail.",
      );
      return;
    }
    loginWithGoogle.mutate();
  };

  const onFacebook = () => {
    if (!facebookAvailable) {
      Alert.alert(
        "Disponible dans l'application native",
        "La connexion Facebook nécessite un build natif (pas Expo Go). Utilise le code par e-mail.",
      );
      return;
    }
    loginWithFacebook.mutate();
  };

  const openLegal = (path: "terms" | "privacy") => {
    void Linking.openURL(`https://joutio.com/${path}/`);
  };

  if (endReason === "suspended") {
    return (
      <SafeAreaView
        edges={["top", "bottom"]}
        style={[styles.ended, { backgroundColor: theme.colors.background }]}
      >
        <JoLockup />
        <View style={styles.endedBody}>
          <JoBanner
            tone="error"
            icon={<Prohibit size={24} color={theme.colors.danger} />}
            title="Compte suspendu"
            message="Consulte l'e-mail reçu pour connaître le motif et l'échéance."
          />
          <AppText variant="callout" tone="secondary">
            Tes défis et salons en cours ont été annulés. Ton Elo et ta collection
            sont conservés pendant la suspension.
          </AppText>
        </View>
        <JoButton
          label="Contacter le support"
          variant="secondary"
          onPress={() => void Linking.openURL("mailto:support@joutio.com")}
        />
        <JoButton
          label="Changer de compte"
          variant="plain"
          onPress={() => useSessionStore.setState({ endReason: null })}
        />
      </SafeAreaView>
    );
  }

  if (step === "code") {
    return (
      <SafeAreaView
        edges={["top", "bottom"]}
        style={{ flex: 1, backgroundColor: theme.colors.background }}
      >
        <View style={styles.codeNav}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Revenir à la connexion"
            onPress={backToEmail}
            style={styles.codeBack}
          >
            <CaretLeft size={24} color={theme.colors.accentInk} />
            <AppText
              variant="headline"
              weight="semibold"
              style={{ color: theme.colors.accentInk }}
            >
              Connexion
            </AppText>
          </Pressable>
        </View>

        <KeyboardAwareScrollView
          bottomOffset={CODE_BOTTOM_OFFSET}
          contentContainerStyle={styles.codeContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        >
            <View style={{ gap: 8 }}>
              <AppText
                weight="bold"
                style={{
                  fontSize: 30,
                  lineHeight: 36,
                  letterSpacing: -0.6,
                }}
              >
                Entre le code reçu
              </AppText>
              <AppText
                variant="body"
                tone="secondary"
                style={{ fontSize: 16, lineHeight: 24 }}
              >
                Envoyé à{" "}
                <AppText weight="semibold" style={{ color: theme.colors.label }}>
                  {email}
                </AppText>
                . Il reste valable 10 minutes.
              </AppText>
            </View>

            <View style={{ gap: 8 }}>
              <JoCodeInput
                digits={code}
                error={Boolean(loginWithCode.error)}
                onPress={() => codeInputRef.current?.focus()}
              />
              <TextInput
                ref={codeInputRef}
                value={code}
                onChangeText={(value) => {
                  loginWithCode.reset();
                  setCode(value.replace(/[^0-9]/g, "").slice(0, 6));
                }}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                maxLength={6}
                autoFocus
                caretHidden
                style={styles.hiddenInput}
              />
              {loginWithCode.error ? (
                <AppText
                  variant="footnote"
                  tone="danger"
                  style={{ fontSize: 12, lineHeight: 16 }}
                >
                  {error}
                </AppText>
              ) : null}
            </View>

            <AppText
              style={{
                fontFamily: "Geist_400Regular",
                fontSize: 14,
                lineHeight: 20,
                color: theme.colors.secondaryLabel,
              }}
            >
              {remainingSeconds > 0 ? (
                <>
                  Renvoyer le code dans{" "}
                  <AppText
                    style={{
                      fontFamily: "GeistMono_500Medium",
                      color: theme.colors.label,
                    }}
                  >
                    {formatTimer(remainingSeconds)}
                  </AppText>
                </>
              ) : (
                <Text onPress={() => void onResend()}>
                  Renvoyer le code
                </Text>
              )}
            </AppText>

            <View style={{ flex: 1 }} />
        </KeyboardAwareScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
    >
      <KeyboardAwareScrollView
        bottomOffset={EMAIL_BOTTOM_OFFSET}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      >
        <JoLockup />

        <View style={styles.hero}>
          <AppText
            weight="bold"
            style={{
              fontSize: 36,
              lineHeight: 40,
              letterSpacing: -1.08,
            }}
          >
            Sept tours,{"\n"}dix secondes{"\n"}par question.
          </AppText>
          <AppText
            variant="body"
            tone="secondary"
            style={{ fontSize: 16, lineHeight: 24 }}
          >
            Défie le monde et grimpe au classement.
          </AppText>
        </View>

        {endReason ? (
          <AppText
            variant="footnote"
            tone="danger"
            style={{ fontSize: 14, lineHeight: 20 }}
          >
            {END_REASON_MESSAGE[endReason]}
          </AppText>
        ) : null}

        <View style={{ gap: 8 }}>
          <JoButton
            label="Continuer avec Google"
            variant="secondary"
            icon={
              <GoogleLogo
                size={20}
                color={theme.colors.label}
              />
            }
            onPress={onGoogle}
            disabled={pending}
          />
          <JoButton
            label="Continuer avec Facebook"
            variant="secondary"
            icon={
              <FacebookLogo
                size={20}
                color={theme.colors.label}
              />
            }
            onPress={onFacebook}
            disabled={pending}
          />

          <JoDivider />

          <Controller
            control={emailForm.control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <JoField
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="toi@exemple.fr"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="send"
                onSubmitEditing={() => {
                  void emailForm.handleSubmit(onSubmitEmail)();
                }}
                editable={!pending}
                error={emailForm.formState.errors.email?.message}
                onClear={() => onChange("")}
              />
            )}
          />

          <JoButton
            label={requestCode.isPending ? "Envoi…" : "Recevoir un code"}
            loading={requestCode.isPending}
            disabled={pending}
            onPress={() => {
              void emailForm.handleSubmit(onSubmitEmail)();
            }}
          />

          {error ? (
            <AppText
              variant="footnote"
              tone="danger"
              style={{ fontSize: 12, lineHeight: 16, textAlign: "center" }}
            >
              {error}
            </AppText>
          ) : null}
        </View>

        <AppText
          tone="secondary"
          style={{
            fontSize: 12,
            lineHeight: 16,
            textAlign: "center",
          }}
        >
          En continuant, tu acceptes les{" "}
          <Text
            onPress={() => openLegal("terms")}
            style={styles.legalLink}
          >
            conditions d'utilisation
          </Text>{" "}
          et la{" "}
          <Text
            onPress={() => openLegal("privacy")}
            style={styles.legalLink}
          >
            politique de confidentialité
          </Text>
          .
        </AppText>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ended: { flex: 1, gap: 8, paddingHorizontal: 24, paddingVertical: 32 },
  endedBody: { flex: 1, justifyContent: "center", gap: 16 },
  content: {
    flexGrow: 1,
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 42,
    gap: 24,
  },
  hero: {
    flex: 1,
    justifyContent: "center",
    gap: 8,
  },
  legalLink: {
    textDecorationLine: "underline",
  },
  codeNav: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  codeBack: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  codeContent: {
    flexGrow: 1,
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 0,
    gap: 24,
  },
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
});
