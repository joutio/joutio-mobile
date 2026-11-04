import { zodResolver } from '@hookform/resolvers/zod'
import { router } from 'expo-router'
import { Controller, useForm } from 'react-hook-form'
import { View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { z } from 'zod'
import { Button, Field, HAIRLINE, Logo, SocialButton, Text, tokens, useTheme } from '@/design-system'
import { config } from '@/lib/config'
import { useOnboardingStore } from '@/features/onboarding/onboarding-store'
import { useRequestLoginCode } from '../hooks/use-login'
import { LegalNotice } from './legal-notice'

const schema = z.object({ email: z.string().trim().pipe(z.email('Adresse e-mail invalide.')) })
type LoginForm = z.infer<typeof schema>

/** Connexion : fournisseurs sociaux, puis e-mail et code. Pas de mot de passe. */
export function LoginScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const email = useOnboardingStore((state) => state.email)
  const setEmail = useOnboardingStore((state) => state.setEmail)
  const requestCode = useRequestLoginCode()
  const social = config.googleSignInEnabled || config.facebookSignInEnabled

  const { control, handleSubmit, formState } = useForm<LoginForm>({ resolver: zodResolver(schema), mode: 'onChange', defaultValues: { email } })

  const submit = () => {
    void handleSubmit(({ email: value }) => {
      setEmail(value)
      requestCode.mutate(value, { onSuccess: () => router.push('/code') })
    })()
  }

  return (
    <KeyboardAwareScrollView
      bottomOffset={tokens.space[5]}
      keyboardShouldPersistTaps="handled"
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        flexGrow: 1,
        gap: tokens.space[6],
        paddingHorizontal: tokens.space[6],
        paddingTop: insets.top + tokens.space[7],
        paddingBottom: insets.bottom + tokens.space[6],
      }}
    >
      <Logo variant="lockup" size={32} />
      <View style={{ flex: 1, justifyContent: 'center', gap: tokens.space[3] }}>
        <Text variant="largeTitle" accessibilityRole="header">
          Sept tours, dix secondes par question.
        </Text>
        <Text color="muted">Défie le monde et grimpe au classement.</Text>
      </View>
      <View style={{ gap: tokens.space[3] }}>
        {config.googleSignInEnabled && <SocialButton provider="google" />}
        {config.facebookSignInEnabled && <SocialButton provider="facebook" />}
        {social && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space[4], paddingVertical: tokens.space[3] }}>
            <View style={{ flex: 1, height: HAIRLINE, backgroundColor: colors.border }} />
            <Text variant="caption" color="muted">
              ou continuer avec
            </Text>
            <View style={{ flex: 1, height: HAIRLINE, backgroundColor: colors.border }} />
          </View>
        )}
        <Controller
          control={control}
          name="email"
          render={({ field: { value, onChange, onBlur }, fieldState }) => (
            <Field
              accessibilityLabel="Adresse e-mail"
              placeholder="toi@exemple.fr"
              keyboardType="email-address"
              inputMode="email"
              autoComplete="email"
              textContentType="emailAddress"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="send"
              onSubmitEditing={submit}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={(fieldState.isTouched && value !== '' ? fieldState.error?.message : undefined) ?? requestCode.error?.message}
            />
          )}
        />
        <Button full disabled={!formState.isValid} loading={requestCode.isPending} onPress={submit}>
          Recevoir un code
        </Button>
      </View>
      <LegalNotice />
    </KeyboardAwareScrollView>
  )
}
