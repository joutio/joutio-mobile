import { Banner } from '@/design-system'
import type { ConnectionBannerState } from '@/shared/hooks/use-connection-banner'

/**
 * Bannière de connexion globale (`etats-systeme.md`, `feedback.md`) : bande `Banner` en tête de chaque écran (`TopBannerFrame`),
 * **au-dessus** de sa barre du haut, qu'elle pousse vers le bas — toujours visible, quel que soit le défilement. Elle
 * porte la safe area haute (`safeTop`) ; l'écran dessous n'en tient plus compte (`useScreenTopInset`).
 */
export function ConnectionBanner({ state, onRetry, safeTop }: { state: ConnectionBannerState; onRetry: () => void; safeTop: number }) {
  if (state === 'hidden') return null
  // Entrée et sortie animées par `TopBannerFrame`.
  return <Banner connection={state} onRetry={onRetry} safeTop={safeTop} />
}
