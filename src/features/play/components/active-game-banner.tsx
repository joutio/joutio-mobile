import { router, usePathname } from 'expo-router'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Banner, tokens } from '@/design-system'
import { usePlaySession } from '../hooks/play-session'

export function useBannerGame() {
  const { games } = usePlaySession()
  const pathname = usePathname()
  return games.find((game) => pathname !== `/duel/${game.gameId}`)
}

/** Same placement as the connection banner; safe area supplied by the parent when stacked. */
export function ActiveGameBanner({ belowConnection }: { belowConnection: boolean }) {
  const game = useBannerGame()
  const insets = useSafeAreaInsets()
  if (!game) return null
  return (
    <View style={{ paddingTop: (belowConnection ? 0 : insets.top) + tokens.space[2], paddingHorizontal: tokens.space[4], paddingBottom: tokens.space[2] }}>
      <Banner
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
    </View>
  )
}
