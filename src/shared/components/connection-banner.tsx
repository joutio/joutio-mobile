import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Banner } from '@/design-system'
import type { ConnectionBannerState } from '@/shared/hooks/use-connection-banner'

/**
 * Bannière de connexion globale (`etats-systeme.md`, `feedback.md`) : bande `Banner` collée en haut de la fenêtre,
 * **au-dessus** de la barre du haut de l'écran, qu'elle pousse vers le bas — toujours visible, quel que soit le
 * défilement. Elle prend la safe area haute à son compte ; le layout retire alors cette safe area aux écrans dessous.
 */
export function ConnectionBanner({ state, onRetry }: { state: ConnectionBannerState; onRetry: () => void }) {
  const insets = useSafeAreaInsets()
  if (state === 'hidden') return null
  return (
    <Animated.View entering={FadeIn} exiting={FadeOut}>
      <Banner connection={state} onRetry={onRetry} safeTop={insets.top} />
    </Animated.View>
  )
}
