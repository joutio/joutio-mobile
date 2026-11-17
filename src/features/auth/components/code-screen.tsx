import { zodResolver } from '@hookform/resolvers/zod'
import { OTP_LENGTH, OTP_RESEND_SECONDS, otpSchema } from '@joutio/client/forms'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { View } from 'react-native'
import { Button, CodeInput, haptic, Screen, Text, tokens } from '@/design-system'
import { useOnboardingStore } from '@/features/onboarding/onboarding-store'
import { useLoginWithCode, useRequestLoginCode } from '../hooks/use-login'
import { useSessionStore } from '../session-store'
import { SessionEndedScreen } from './session-ended-screen'
import { useT } from '@/lib/i18n'

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

/** Saisie du code : validé seul au 6e chiffre. */
export function CodeScreen() {
  const t = useT()
  const email = useOnboardingStore((state) => state.email)
  const form = useForm({ resolver: zodResolver(otpSchema), defaultValues: { code: '' } })
  const code = useWatch({ control: form.control, name: 'code' })
  const [wait, setWait] = useState(OTP_RESEND_SECONDS)
  const login = useLoginWithCode()
  const resend = useRequestLoginCode()
  // Compte suspendu : identity refuse le code, l'écran dédié (fin et motif) remplace la saisie.
  const endReason = useSessionStore((state) => state.endReason)
  const suspension = useSessionStore((state) => state.suspension)
  const acknowledgeEnd = useSessionStore((state) => state.acknowledgeEnd)

  useEffect(() => {
    if (wait === 0) return
    const timer = setTimeout(() => setWait((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [wait])

  const submit = form.handleSubmit(({ code: value }) => login.mutate({ email, code: value }, { onError: () => haptic('error') }))
  const onChange = (value: string) => {
    form.setValue('code', value)
    if (login.isError) login.reset()
    if (value.length === OTP_LENGTH) void submit()
  }

  const error = login.error?.message

  if (endReason) return <SessionEndedScreen reason={endReason} suspension={suspension} onLogin={acknowledgeEnd} />

  return (
    <Screen
      nativeHeader
      scrollProps={{ keyboardShouldPersistTaps: 'handled' }}
      contentStyle={{ gap: tokens.space[6], paddingHorizontal: tokens.space[5], paddingTop: tokens.space[5], paddingBottom: tokens.space[6] }}
    >
      <View style={{ gap: tokens.space[3] }}>
        <Text variant="title1" accessibilityRole="header">
          {t('onboarding.code.title')}
        </Text>
        <Text color="muted">
          {t('onboarding.code.sentTo')} <Text weight="600">{email}</Text>{t('mobile.auth.code.validity')}
        </Text>
      </View>
      <View style={{ gap: tokens.space[3] }}>
        <CodeInput autoFocus value={code} length={OTP_LENGTH} error={Boolean(error)} disabled={login.isPending} onChange={onChange} />
        {error && (
          <Text variant="caption" color="wrong" accessibilityLiveRegion="assertive">
            {error}
          </Text>
        )}
      </View>
      {wait > 0 ? (
        <Text variant="callout" color="muted" align="center">
          {t('onboarding.code.resendIn', { time: clock(wait) })}
        </Text>
      ) : (
        <Button
          variant="plain"
          tone="accent"
          size="M"
          loading={resend.isPending}
          style={{ alignSelf: 'center' }}
          onPress={() =>
            resend.mutate(email, {
              onSuccess: () => {
                form.reset()
                login.reset()
                setWait(OTP_RESEND_SECONDS)
              },
            })
          }
        >
          {t('onboarding.code.resend')}
        </Button>
      )}
    </Screen>
  )
}
