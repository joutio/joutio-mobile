import { Linking, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Banner, Button, ClockIcon, ProhibitIcon, Text, tokens, useTheme } from '@/design-system'
import type { SessionEndReason } from '@/shared/types/session'

const SUPPORT = 'mailto:contact@joutio.com'

/** Session coupée : plein écran, sans navigation. Le motif et l'échéance d'une suspension restent dans l'e-mail. */
export function SessionEndedScreen({ reason, onLogin }: { reason: SessionEndReason; onLogin: () => void }) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const suspended = reason === 'suspended'
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        gap: tokens.space[5],
        paddingHorizontal: tokens.space[5],
        paddingTop: insets.top + tokens.space[7],
        paddingBottom: insets.bottom + tokens.space[6],
        backgroundColor: colors.bg,
      }}
    >
      {suspended ? (
        <>
          <Banner tone="error" icon={ProhibitIcon} title="Compte suspendu" message="Consulte l'e-mail reçu pour connaître le motif et l'échéance." />
          <Text color="muted">Tes défis et salons en cours ont été annulés. Ton Elo et ta collection sont conservés pendant la suspension.</Text>
          <View style={{ gap: tokens.space[3] }}>
            <Button full variant="gray" tone="neutral" onPress={() => Linking.openURL(SUPPORT).catch(() => undefined)}>
              Contacter le support
            </Button>
            <Button full variant="plain" tone="neutral" onPress={onLogin}>
              Se déconnecter
            </Button>
          </View>
        </>
      ) : (
        <>
          <Banner tone="info" icon={ClockIcon} title="Ta session a expiré" message="Reconnecte-toi pour reprendre là où tu en étais." />
          <Button full onPress={onLogin}>
            Se reconnecter
          </Button>
        </>
      )}
    </View>
  )
}
