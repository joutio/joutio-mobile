import { usePathname } from 'expo-router'
import { router } from '@/shared/navigation/router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Banner } from '@/design-system'
import { usePlaySession } from '../hooks/play-session'

export function useBannerGame() {
  const { games } = usePlaySession()
  const pathname = usePathname()
  return games.find((game) => pathname !== `/duel/${game.gameId}`)
}

/**
 * Bande « Partie en cours » (`feedback.md`) : même place que la bannière de connexion, en haut de la fenêtre. Une seule
 * bande à la fois : la connexion l'emporte (`hidden`).
 */
export function ActiveGameBanner({ hidden }: { hidden: boolean }) {
  const game = useBannerGame()
  const insets = useSafeAreaInsets()
  if (!game || hidden) return null
  return (
    <Banner
      safeTop={insets.top}
      tone="live"
      title="Partie en cours"
      message={game.topicName}
      action={{
        label: 'Rejoindre',
        onPress: () =>
          router.push({
            pathname: '/duel/[gameId]',
            params: { gameId: game.gameId, topicId: game.topicId, topicName: game.topicName, category: game.category },
          }),
      }}
    />
  )
}
