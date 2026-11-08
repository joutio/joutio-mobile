import { requestPushPermission } from '@/features/notifications/lib/expo-push'
import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { ArrowCounterClockwiseIcon, BellRingingIcon, Button, LightningIcon, ListRow, MedalIcon, Text, tokens, useTheme } from '@/design-system'
import { useCompleteOnboarding } from '../hooks/use-onboarding'
import { useOnboardingStore } from '../onboarding-store'
import { Steps } from './steps'

/** Notifications : « Activer » ouvre l'alerte système, « Plus tard » passe à la suite. */
export function NotificationsStep() {
  const { colors, radius } = useTheme()
  const skipped = useOnboardingStore((state) => state.skipped)
  const complete = useCompleteOnboarding()
  const [asking, setAsking] = useState(false)

  // Après « Passer » : pas de premier thème, l'onboarding se termine ici.
  const next = () => {
    if (skipped) complete.mutate()
    else router.push('/first-topic')
  }

  const enable = async () => {
    setAsking(true)
    try {
      await requestPushPermission()
    } catch {
      // Refus ou indisponible : le réglage reste modifiable plus tard.
    } finally {
      setAsking(false)
      next()
    }
  }

  return (
    <Steps
      index={1}
      footer={
        <View style={{ gap: tokens.space[3] }}>
          <Text variant="caption" color="muted" align="center">
            Modifiable dans Réglages › Notifications.
          </Text>
          <Button full loading={asking || complete.isPending} onPress={enable}>
            Activer les notifications
          </Button>
          <Button full variant="plain" tone="neutral" disabled={complete.isPending} onPress={next}>
            Plus tard
          </Button>
        </View>
      }
    >
      <View style={{ alignItems: 'center', gap: tokens.space[4], paddingTop: tokens.space[6] }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: radius.lg,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ rotate: '-6deg' }],
          }}
        >
          <BellRingingIcon size={32} weight="fill" color={colors.onAccent} />
        </View>
        <Text variant="title1" align="center" accessibilityRole="header">
          Ne rate pas un défi
        </Text>
        <Text color="muted" align="center" style={{ maxWidth: 320 }}>
          Un défi expire au bout d'une heure. On te prévient seulement pour ce qui te concerne.
        </Text>
      </View>
      <View style={{ borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden' }}>
        <ListRow icon={LightningIcon} label="On te défie ou t'invite dans un salon" control="none" />
        <ListRow icon={ArrowCounterClockwiseIcon} label="Ton adversaire veut sa revanche" control="none" />
        <ListRow icon={MedalIcon} label="Tu changes de rang ou gagnes un badge" control="none" last />
      </View>
    </Steps>
  )
}
