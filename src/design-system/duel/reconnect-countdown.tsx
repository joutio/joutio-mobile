import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { WifiSlashIcon } from '../icons'
import { Banner } from '../primitives/banner'
import { Button } from '../primitives/button'
import { Text } from '../primitives/text'
import { ForceDark, useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'

export interface ReconnectCountdownProps {
  variant?: 'lost' | 'expired'
  /** Secondes restantes de la manche ; absent hors manche (attente de l'adversaire, préparation). */
  seconds?: number
  /** Ligne d'attente, par exemple « Sofia R. t'attend · Manche 3 sur 7 ». Absente : pas de bandeau. */
  waiting?: { title: string; message: string }
  /** Hors duel : « Quitter » au lieu de « Abandonner le duel ». */
  leaveLabel?: string
  onLeave?: () => void
  onReconnect?: () => void
}

function Body({ variant = 'lost', seconds, waiting, leaveLabel = 'Abandonner le duel', onLeave, onReconnect }: ReconnectCountdownProps) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const lost = variant === 'lost'
  return (
    <View
      accessibilityViewIsModal
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        gap: tokens.space[6],
        paddingHorizontal: tokens.space[6],
        paddingTop: insets.top + 48,
        paddingBottom: insets.bottom + tokens.space[5],
        backgroundColor: colors.bg,
      }}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: tokens.space[4] }}>
        <WifiSlashIcon size={40} color={colors.wrong} />
        {lost && seconds !== undefined && (
          <View
            accessible
            accessibilityRole="timer"
            accessibilityLabel={`${seconds} ${seconds > 1 ? 'secondes restantes' : 'seconde restante'} dans la manche`}
            style={{ alignItems: 'center', gap: tokens.space[4] }}
          >
            <Text variant="numericGiant">{seconds}</Text>
            <Text variant="callout" color="muted">
              {seconds > 1 ? 'secondes' : 'seconde'}
            </Text>
          </View>
        )}
        <Text variant="title2" weight="700" align="center" accessibilityRole="header">
          {lost ? 'Connexion perdue' : 'Ta session a expiré'}
        </Text>
        <Text variant="callout" color="muted" align="center" style={{ maxWidth: 300 }}>
          {lost
            ? seconds !== undefined
              ? 'Le duel reprend tout seul dès que le réseau revient. Sans retour à temps, la manche compte comme sans réponse.'
              : 'On reprend tout seul dès que le réseau revient.'
            : 'Reconnecte-toi pour reprendre le duel.'}
        </Text>
      </View>
      {waiting && <Banner tone="live" title={waiting.title} message={waiting.message} />}
      {lost ? (
        onLeave && (
          <Button variant="tinted" tone="destructive" size="L" full onPress={onLeave}>
            {leaveLabel}
          </Button>
        )
      ) : (
        <Button size="L" full onPress={onReconnect}>
          Se reconnecter
        </Button>
      )}
    </View>
  )
}

/**
 * Perte du temps réel (heartbeat manqué, socket fermé) pendant une partie ou sa préparation : plein écran sombre,
 * reprise automatique dès que la connexion revient. Toujours sombre.
 */
export function ReconnectCountdown(props: ReconnectCountdownProps) {
  return (
    <ForceDark>
      <Body {...props} />
    </ForceDark>
  )
}
