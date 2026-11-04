import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { Button, CodeInput, haptic, Screen, Text, tokens } from '@/design-system'
import { useOnboardingStore } from '@/features/onboarding/onboarding-store'
import { useLoginWithCode, useRequestLoginCode } from '../hooks/use-login'

const CODE_LENGTH = 6
const RESEND_SECONDS = 60

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

/** Saisie du code : validé seul au 6e chiffre. */
export function CodeScreen() {
  const email = useOnboardingStore((state) => state.email)
  const [code, setCode] = useState('')
  const [wait, setWait] = useState(RESEND_SECONDS)
  const login = useLoginWithCode()
  const resend = useRequestLoginCode()

  useEffect(() => {
    if (wait === 0) return
    const timer = setTimeout(() => setWait((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [wait])

  const onChange = (value: string) => {
    setCode(value)
    if (login.isError) login.reset()
    if (value.length === CODE_LENGTH) login.mutate({ email, code: value }, { onError: () => haptic('error') })
  }

  const error = login.error?.message

  return (
    <Screen
      nativeHeader
      scrollProps={{ keyboardShouldPersistTaps: 'handled' }}
      contentStyle={{ gap: tokens.space[6], paddingHorizontal: tokens.space[5], paddingTop: tokens.space[5], paddingBottom: tokens.space[6] }}
    >
      <View style={{ gap: tokens.space[3] }}>
        <Text variant="title1" accessibilityRole="header">
          Entre le code reçu
        </Text>
        <Text color="muted">
          Envoyé à <Text weight="600">{email}</Text>. Il reste valable 10 minutes.
        </Text>
      </View>
      <View style={{ gap: tokens.space[3] }}>
        <CodeInput autoFocus value={code} length={CODE_LENGTH} error={Boolean(error)} disabled={login.isPending} onChange={onChange} />
        {error && (
          <Text variant="caption" color="wrong" accessibilityLiveRegion="assertive">
            {error}
          </Text>
        )}
      </View>
      {wait > 0 ? (
        <Text variant="callout" color="muted" align="center">
          Renvoyer le code dans {clock(wait)}
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
                setCode('')
                login.reset()
                setWait(RESEND_SECONDS)
              },
            })
          }
        >
          Renvoyer le code
        </Button>
      )}
    </Screen>
  )
}
