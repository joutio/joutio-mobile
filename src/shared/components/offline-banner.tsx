import type { StyleProp, ViewStyle } from 'react-native'
import { Banner, WifiSlashIcon } from '@/design-system'
import { useOnline } from '@/shared/hooks/use-online'

/**
 * Hors connexion (`etats-systeme.md`) : « Pas de connexion » avec Réessayer, en tête d'un écran de catalogue. La
 * bannière disparaît seule au retour du réseau ; les requêtes en pause reprennent d'elles-mêmes.
 */
export function OfflineBanner({
  onRetry,
  message = 'Le catalogue se charge dès ton retour en ligne.',
  style,
}: {
  onRetry: () => void
  message?: string
  style?: StyleProp<ViewStyle>
}) {
  const online = useOnline()
  if (online) return null
  return <Banner tone="error" icon={WifiSlashIcon} title="Pas de connexion" message={message} action={{ label: 'Réessayer', onPress: onRetry }} style={style} />
}
