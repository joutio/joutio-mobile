import { router, useLocalSearchParams } from 'expo-router'
import { View } from 'react-native'
import { Button, EmptyState, ForceDark, SplashLogo, tokens, useTheme, WarningCircleIcon } from '@/design-system'
import { topicName } from '@/shared/utils/topic-name'
import { useGameHistory, useGameResult } from '../hooks/use-game'
import { DuelResult } from './duel-result'

export interface ResultRouteParams {
  gameId: string
  topicName?: string
  topicId?: string
  category?: string
  [key: string]: string | undefined
}

/**
 * Résultat d'une partie passée, ouvert depuis l'historique (`/result/{gameId}`). Le bilan et les événements de la
 * partie sont relus en REST, sans ouvrir l'arène ni son flux STOMP ; les déblocages ne sont pas rejoués.
 */
export function ResultScreen() {
  const params = useLocalSearchParams<ResultRouteParams>()
  const gameId = params.gameId
  const { colors } = useTheme()
  const game = useGameHistory(gameId)
  const result = useGameResult(gameId, Boolean(gameId), false)

  if (!gameId || game.isPending || result.isPending) {
    return (
      <ForceDark>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
          <SplashLogo variant="loading" />
        </View>
      </ForceDark>
    )
  }

  if (game.isError || result.isError || !game.data || !result.data) {
    return (
      <ForceDark>
        <View style={{ flex: 1, backgroundColor: colors.bg, padding: tokens.space[5], justifyContent: 'center' }}>
          <EmptyState
            icon={WarningCircleIcon}
            title="Impossible de charger cette partie"
            description="Vérifie ta connexion, puis réessaie."
            action={
              <View style={{ gap: tokens.space[3], alignSelf: 'stretch' }}>
                <Button
                  style={{ alignSelf: 'center' }}
                  loading={game.isRefetching || result.isRefetching}
                  onPress={() => {
                    void game.refetch()
                    void result.refetch()
                  }}
                >
                  Réessayer
                </Button>
                <Button variant="plain" tone="neutral" onPress={() => router.back()}>
                  Fermer
                </Button>
              </View>
            }
          />
        </View>
      </ForceDark>
    )
  }

  const data = result.data
  return (
    <DuelResult
      gameId={gameId}
      game={game.data}
      topic={params.topicName ?? topicName(data.topic.names)}
      topicId={params.topicId ?? data.topic.topicId}
      category={params.category ?? data.topic.category ?? undefined}
      celebrate={false}
    />
  )
}
