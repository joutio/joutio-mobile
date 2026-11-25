import { useLocalSearchParams } from 'expo-router'
import { router } from '@/shared/navigation/router'
import { View } from 'react-native'
import { Button, EmptyState, SplashLogo, tokens, useTheme, WarningCircleIcon } from '@/design-system'
import { topicName } from '@/shared/utils/topic-name'
import { useGameResult, useGameStream } from '@joutio/client/game'
import { DuelResult } from './duel-result'
import { useT } from '@/lib/i18n'

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
  const t = useT()
  const params = useLocalSearchParams<ResultRouteParams>()
  const gameId = params.gameId
  const { colors } = useTheme()
  // Partie passée repliée de son historique (le flux reste muet : la partie est terminée).
  const stream = useGameStream(gameId)
  const result = useGameResult(gameId || undefined)
  const loaded = stream.status?.loaded === true

  if (!gameId || (!loaded && !stream.status?.notFound) || result.isPending) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <SplashLogo variant="loading" />
      </View>
    )
  }

  if (!loaded || !stream.state || result.isError || !result.data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, padding: tokens.space[5], justifyContent: 'center' }}>
        <EmptyState
          icon={WarningCircleIcon}
          title={t('result.loadError')}
          description={t('home.errorText')}
          action={
            <View style={{ gap: tokens.space[3], alignSelf: 'stretch' }}>
              <Button style={{ alignSelf: 'center' }} loading={result.isRefetching} onPress={() => void result.refetch()}>
                {t('callback.retry')}
              </Button>
              <Button variant="plain" tone="neutral" onPress={() => router.back()}>
                {t('play.close')}
              </Button>
            </View>
          }
        />
      </View>
    )
  }

  const data = result.data
  return (
    <DuelResult
      gameId={gameId}
      game={stream.state}
      topic={params.topicName ?? topicName(data.topic.names)}
      topicId={params.topicId ?? data.topic.topicId}
      category={params.category ?? data.topic.category ?? undefined}
      celebrate={false}
    />
  )
}
