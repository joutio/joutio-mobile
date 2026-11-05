import { useQuery } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Avatar, Button, CATEGORY_ICONS, EmptyState, LightningIcon, LinkIcon, Pill, Skeleton, Text, toCategoryCode, tokens, useTheme } from '@/design-system'
import { useSessionStore } from '@/features/auth'
import { useMe } from '@/features/me'
import { usePendingJoin } from '@/shared/stores/pending-join-store'
import { topicName } from '@/shared/utils/topic-name'
import { playService } from '../lib/play-service'

const RULES = '7 manches de 10 secondes, la dernière compte double. Le plus rapide à bien répondre marque le plus de points.'

function Unavailable() {
  return (
    <EmptyState
      fill
      icon={LinkIcon}
      title="Ce salon n'est plus disponible"
      description="Il a expiré, ou un autre joueur l'a déjà rejoint."
      action={
        <Button full onPress={() => router.replace('/topics')}>
          Explorer les sujets
        </Button>
      }
    />
  )
}

/**
 * Rejoindre un salon (`lancer-partie.md` § 2), ouvert par un lien partagé (`joutio://join/{roomId}`), hors onglets.
 * Sans compte : même invitation, la connexion ramène ici.
 */
export function JoinScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const authenticated = useSessionStore((state) => state.authenticated)
  const me = useMe(authenticated)
  const setPending = usePendingJoin((state) => state.set)
  const room = useQuery({ queryKey: ['rooms', roomId], queryFn: () => playService.room(roomId), enabled: authenticated, retry: 1 })

  const view = room.data
  const unavailable = room.isError || (view && (view.status !== 'WAITING_PLAYERS' || view.gameId !== null))
  const host = view?.opponent?.pseudonym
  const category = toCategoryCode(view?.topic.category)
  const join = () => {
    if (!authenticated) {
      setPending(roomId)
      router.push('/login')
      return
    }
    setPending(null)
    router.replace({
      pathname: '/room/[roomId]',
      params: { roomId, topicId: view?.topic.topicId ?? '', topicName: view ? topicName(view.topic.names) : '', category: view?.topic.category ?? '' },
    })
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        paddingTop: insets.top + tokens.space[7],
        paddingBottom: insets.bottom + tokens.space[6],
        paddingHorizontal: tokens.space[5],
      }}
    >
      {unavailable ? (
        <Unavailable />
      ) : (
        <>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: tokens.space[5] }}>
            {authenticated && room.isPending ? <Skeleton shape="circle" width={140} /> : <Avatar name={host ?? 'Joutio'} size="preview" decorative />}
            <Text variant="title1" align="center" accessibilityRole="header">
              {host ? `${host} t'invite à un duel` : 'Tu es invité à un duel'}
            </Text>
            {view && <Pill icon={CATEGORY_ICONS[tokens.category[category].icon]}>{topicName(view.topic.names)}</Pill>}
            <Text color="muted" align="center" style={{ maxWidth: 320 }}>
              {RULES}
            </Text>
          </View>
          <View style={{ gap: tokens.space[3] }}>
            <Button full icon={LightningIcon} disabled={authenticated && (room.isPending || (me.data ? !me.data.onboardingCompleted : false))} onPress={join}>
              {authenticated ? 'Rejoindre le duel' : 'Se connecter pour rejoindre'}
            </Button>
            {!authenticated && (
              <Text variant="caption" color="muted" align="center">
                Pas encore de compte ? Tu le crées en 20 secondes.
              </Text>
            )}
          </View>
        </>
      )}
    </View>
  )
}
