import { View } from 'react-native'
import Animated, { FadeInUp, FadeOut } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ArrowClockwiseIcon, Banner, CheckCircleIcon, tokens, useTheme, WifiSlashIcon } from '@/design-system'
import type { ConnectionBannerState } from '@/shared/hooks/use-connection-banner'

const COPY: Record<Exclude<ConnectionBannerState, 'hidden'>, { title: string; message: string }> = {
  offline: { title: 'Pas de connexion', message: 'Tout se met à jour dès ton retour en ligne.' },
  reconnecting: { title: 'Reconnexion…', message: 'Le temps réel reprend dans un instant.' },
  retrying: { title: 'Nouvelle tentative…', message: 'On vérifie ta connexion.' },
  failed: { title: 'Toujours hors connexion', message: 'Vérifie ton réseau, puis réessaie.' },
  restored: { title: 'Connexion rétablie', message: 'Tout est à jour.' },
}

/**
 * Bannière de connexion globale (`etats-systeme.md`, 2026-11-07) : collée sous la barre d'état, **au-dessus** de la
 * barre du haut de l'écran, qu'elle pousse vers le bas — toujours visible, quel que soit le défilement. Elle prend la
 * safe area haute à son compte ; le layout retire alors cette safe area aux écrans dessous.
 */
export function ConnectionBanner({ state, onRetry }: { state: ConnectionBannerState; onRetry: () => void }) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  if (state === 'hidden') return null
  const copy = COPY[state]
  const restored = state === 'restored'
  return (
    <View
      style={{
        paddingTop: insets.top + tokens.space[2],
        paddingHorizontal: tokens.space[4],
        paddingBottom: tokens.space[2],
        backgroundColor: colors.bg,
      }}
    >
      <Animated.View entering={FadeInUp} exiting={FadeOut}>
        <Banner
          tone={restored ? 'success' : 'error'}
          icon={restored ? CheckCircleIcon : state === 'reconnecting' ? ArrowClockwiseIcon : WifiSlashIcon}
          title={copy.title}
          message={copy.message}
          action={restored ? undefined : { label: 'Réessayer', onPress: onRetry, loading: state === 'retrying' }}
        />
      </Animated.View>
    </View>
  )
}
