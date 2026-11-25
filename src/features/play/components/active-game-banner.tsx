import { useRef } from 'react'
import { usePathname } from 'expo-router'
import { useActiveGames, useGameStream } from '@joutio/client/game'
import { Banner } from '@/design-system'
import { useSessionUserId } from '@/features/auth'
import { router } from '@/shared/navigation/router'
import { topicName } from '@/shared/utils/topic-name'
import { useT } from '@/lib/i18n'

/** Flux d'une partie en cours : sa fin la retire des parties en cours (`useGameStream` de la lib). */
function GameEndWatch({ gameId }: { gameId: string }) {
  useGameStream(gameId)
  return null
}

/**
 * Parties en cours suivies hors de leur écran de duel, montées une fois dans le layout `(app)` : une partie finie
 * ailleurs (forfait de l'adversaire, partie quittée) ne reste pas dans la bande « Partie en cours ».
 */
export function ActiveGamesWatch() {
  const games = useActiveGames(useSessionUserId()).data ?? []
  return games.map((game) => <GameEndWatch key={game.gameId} gameId={game.gameId} />)
}

/** Partie en cours à proposer, hors de son propre écran de duel. */
export function useBannerGame() {
  const games = useActiveGames(useSessionUserId()).data
  const pathname = usePathname()
  return [...(games ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).find((game) => pathname !== `/duel/${game.gameId}`)
}

/**
 * Bande « Partie en cours » (`feedback.md`) : même place que la bannière de connexion, en haut de la fenêtre. Une seule
 * bande à la fois, la connexion l'emporte (choix du layout `(app)`). Garde la dernière partie pendant sa sortie.
 */
export function ActiveGameBanner({ safeTop }: { safeTop: number }) {
  const t = useT()
  const current = useBannerGame()
  const last = useRef(current)
  if (current) last.current = current
  const game = current ?? last.current
  if (!game) return null
  const name = topicName(game.topic.names)
  return (
    <Banner
      safeTop={safeTop}
      tone="live"
      title={t('ongoing.title')}
      message={name}
      action={{
        label: t('ongoing.join'),
        onPress: () =>
          router.push({
            pathname: '/duel/[gameId]',
            params: { gameId: game.gameId, topicId: game.topic.topicId, topicName: name, category: game.topic.category ?? '' },
          }),
      }}
    />
  )
}
