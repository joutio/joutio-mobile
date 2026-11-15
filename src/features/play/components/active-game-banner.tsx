import { useRef } from 'react'
import { usePathname } from 'expo-router'
import { router } from '@/shared/navigation/router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Banner } from '@/design-system'
import { usePlaySession } from '../hooks/play-session'
import { useT } from '@/lib/i18n'

export function useBannerGame() {
  const { games } = usePlaySession()
  const pathname = usePathname()
  return games.find((game) => pathname !== `/duel/${game.gameId}`)
}

/**
 * Bande « Partie en cours » (`feedback.md`) : même place que la bannière de connexion, en haut de la fenêtre. Une seule
 * bande à la fois, la connexion l'emporte (choix de `TopBannerHost`). Garde la dernière partie pendant sa sortie.
 */
export function ActiveGameBanner() {
  const t = useT()
  const current = useBannerGame()
  const last = useRef(current)
  if (current) last.current = current
  const game = current ?? last.current
  const insets = useSafeAreaInsets()
  if (!game) return null
  return (
      <Banner
        safeTop={insets.top}
        tone="live"
        title={t('ongoing.title')}
        message={game.topicName}
        action={{
          label: t('ongoing.join'),
          onPress: () =>
            router.push({
              pathname: '/duel/[gameId]',
              params: { gameId: game.gameId, topicId: game.topicId, topicName: game.topicName, category: game.category },
            }),
        }}
      />
  )
}
