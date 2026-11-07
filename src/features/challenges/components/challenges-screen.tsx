import { useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { RefreshControl, ScrollView, View } from 'react-native'
import {
  BellIcon,
  Button,
  ChallengeListRow,
  Chip,
  DoorOpenIcon,
  EmptyState,
  FeedFooter,
  IconButton,
  LightningIcon,
  ListGroup,
  ListRow,
  MobileTopBar,
  Screen,
  SectionHeader,
  showDialog,
  Skeleton,
  tokens,
  useTheme,
  WarningCircleIcon,
} from '@/design-system'
import { useUnreadCount } from '@/features/home/hooks/use-home'
import { useMe } from '@/features/me'
import { useCreatePrivateRoom } from '@/features/play/hooks/use-play'
import { readServerNow } from '@/lib/realtime/server-clock'
import { queryKeys } from '@/lib/query-keys'
import { TopicPickerSheet } from '@/features/topics/components/topic-picker-sheet'
import type { ChallengeView } from '@/shared/types/bff'
import { avatarSvg } from '@/shared/utils/avatar'
import { topicName } from '@/shared/utils/topic-name'
import {
  privateRooms,
  splitChallenges,
  useAcceptChallenge,
  useCancelChallenge,
  useDeclineChallenges,
  useMyChallenges,
  useMyRooms,
} from '../hooks/use-challenges'
import { CHALLENGE_LIMIT, duration } from '../lib/challenges-service'
import { clientSource, feedFooterProps, loadMoreOptions } from '@/shared/utils/paging'

type Filter = 'all' | 'received' | 'sent' | 'rooms'

const GUTTER = tokens.space[5]
/** Reçus affichés dans « Tous » ; la liste complète est sous la puce Reçus, 10 par page. */
const RECEIVED_PREVIEW = 3
const RECEIVED_PAGE = 10

function Loading() {
  return (
    <View accessibilityLabel="Chargement" style={{ gap: tokens.space[3], paddingHorizontal: GUTTER, paddingTop: tokens.space[2] }}>
      {[0, 1, 2, 3].map((index) => (
        <Skeleton key={index} shape="card" style={{ height: 112 }} />
      ))}
    </View>
  )
}

/**
 * Défis (`design/specs/screens/defis.md`) : barre « Défis » (quota en sous-titre), puces Tous / Reçus / Envoyés /
 * Salons, puis Reçus (aperçu de 3, « Tout voir » ; sous la puce Reçus, liste paginée et « Tout refuser »), Envoyés et
 * Salons privés. Rafraîchi par le flux personnel STOMP et au tiré.
 */
export function ChallengesScreen() {
  const { colors } = useTheme()
  const client = useQueryClient()
  const me = useMe(true)
  const userId = me.data?.userId ?? ''
  const challenges = useMyChallenges(Boolean(userId))
  const rooms = useMyRooms(Boolean(userId))
  const unread = useUnreadCount()
  const accept = useAcceptChallenge()
  const decline = useDeclineChallenges()
  const cancel = useCancelChallenge()
  const createRoom = useCreatePrivateRoom()
  const [filter, setFilter] = useState<Filter>('all')
  const [receivedPages, setReceivedPages] = useState(1)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const { received, sent } = splitChallenges(challenges.data, userId)
  const salons = privateRooms(rooms.data)
  const now = readServerNow()
  const loading = challenges.isPending || rooms.isPending
  const failed = (challenges.isError && !challenges.data) || (rooms.isError && !rooms.data)
  const empty = !loading && !failed && received.length + sent.length + salons.length === 0
  const shows = (section: Filter) => filter === 'all' || filter === section
  const receivedRows = filter === 'all' ? received.slice(0, RECEIVED_PREVIEW) : received.slice(0, receivedPages * RECEIVED_PAGE)
  const receivedSource = clientSource(receivedPages, setReceivedPages, filter === 'received' && receivedRows.length < received.length)
  const counts: Record<Filter, number | undefined> = { all: undefined, received: received.length, sent: sent.length, rooms: salons.length }
  const subtitle = `${sent.length} défi${sent.length > 1 ? 's' : ''} envoyé${sent.length > 1 ? 's' : ''} sur ${CHALLENGE_LIMIT} possibles`

  const refresh = async () => {
    setRefreshing(true)
    await Promise.all([client.refetchQueries({ queryKey: queryKeys.challenges() }), client.refetchQueries({ queryKey: queryKeys.rooms() })])
    setRefreshing(false)
  }

  const refuseAll = () =>
    showDialog({
      title: `Refuser les ${received.length} défis reçus ?`,
      message: 'Les joueurs seront prévenus. Tu pourras toujours les défier à ton tour.',
      icon: LightningIcon,
      tone: 'danger',
      actions: [
        { label: 'Tout refuser', variant: 'filled', tone: 'destructive', onPress: () => decline.mutate(received.map((challenge) => challenge.challengeId)) },
        { label: 'Annuler', variant: 'plain', tone: 'neutral' },
      ],
    })

  const row = (challenge: ChallengeView, kind: 'received' | 'sent', index: number, total: number) => {
    const player = kind === 'received' ? challenge.challenger : challenge.opponent
    const topic = topicName(challenge.topic.names)
    const status =
      kind === 'received' ? `expire dans ${duration(Date.parse(challenge.expiresAt) - now)}` : `en attente · ${duration(now - Date.parse(challenge.createdAt))}`
    return (
      <ChallengeListRow
        key={challenge.challengeId}
        name={player.pseudonym}
        src={avatarSvg(player.avatarOptions, player.userId) ?? undefined}
        sub={`${topic} · ${status}`}
        last={index === total - 1}
        {...(kind === 'received'
          ? {
              primary: {
                label: 'Accepter',
                loading: accept.isPending && accept.variables?.challengeId === challenge.challengeId,
                disabled: accept.isPending,
                onPress: () => accept.mutate(challenge),
              },
              secondary: { label: 'Refuser', onPress: () => decline.mutate([challenge.challengeId]) },
            }
          : {
              primaryVariant: 'tinted' as const,
              // Relancer n'existe pas côté BFF (`defis.md` § 5) : visible, inactif.
              primary: { label: 'Relancer', disabled: true },
              secondary: { label: 'Annuler', onPress: () => cancel.mutate([challenge.challengeId]) },
            })}
      />
    )
  }

  const header = (
    <View>
      <MobileTopBar
        title="Défis"
        subtitle={subtitle}
        right={
          <IconButton
            icon={BellIcon}
            label="Notifications"
            variant="plain"
            tone="neutral"
            badge={unread.data?.count ? 'dot' : undefined}
            onPress={() => router.push('/home/notifications')}
          />
        }
      />
      {!empty && !failed && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollsToTop={false}
          contentContainerStyle={{ gap: tokens.space[3], paddingHorizontal: GUTTER, paddingTop: tokens.space[2], paddingBottom: tokens.space[4] }}
        >
          {(
            [
              ['all', 'Tous'],
              ['received', 'Reçus'],
              ['sent', 'Envoyés'],
              ['rooms', 'Salons'],
            ] as const
          ).map(([value, label]) => (
            <Chip key={value} selected={filter === value} count={counts[value]} onPress={() => setFilter(value)}>
              {label}
            </Chip>
          ))}
        </ScrollView>
      )}
    </View>
  )

  return (
    <Screen
      inTabs
      header={header}
      scrollProps={{ refreshControl: <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.muted} /> }}
      loadMore={loadMoreOptions(receivedSource)}
      contentStyle={{ flexGrow: 1, paddingBottom: tokens.space[7] }}
      overlay={
        <TopicPickerSheet
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          title="Créer un salon privé"
          busy={createRoom.isPending}
          onPick={(topic) => {
            setPickerOpen(false)
            createRoom.mutate(topic)
          }}
        />
      }
    >
      {loading ? (
        <Loading />
      ) : failed ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: GUTTER }}>
          <EmptyState
            icon={WarningCircleIcon}
            title="Impossible de charger les défis"
            description="Vérifie ta connexion, puis réessaie."
            action={
              <Button style={{ alignSelf: 'center' }} loading={refreshing} onPress={() => void refresh()}>
                Réessayer
              </Button>
            }
          />
        </View>
      ) : empty ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: GUTTER }}>
          <EmptyState
            icon={LightningIcon}
            title="Aucun défi en cours"
            description="Défie un joueur depuis sa fiche, ou crée un salon privé et partage son lien."
            action={
              <View style={{ alignSelf: 'stretch', gap: tokens.space[3] }}>
                <Button full loading={createRoom.isPending} onPress={() => setPickerOpen(true)}>
                  Créer un salon privé
                </Button>
                <Button full variant="tinted" onPress={() => router.navigate('/social')}>
                  Défier un abonné
                </Button>
              </View>
            }
          />
        </View>
      ) : (
        <View style={{ gap: tokens.space[6], paddingHorizontal: GUTTER, paddingTop: tokens.space[2] }}>
          {filter === 'received' && received.length === 0 && (
            <EmptyState icon={LightningIcon} title="Aucun défi reçu" description="Les défis que d'autres joueurs t'envoient apparaîtront ici." />
          )}
          {shows('received') && received.length > 0 && (
            <View style={{ gap: tokens.space[4] }}>
              <SectionHeader
                title="Reçus"
                action={
                  filter === 'all' ? (
                    received.length > RECEIVED_PREVIEW ? (
                      <Button variant="plain" size="S" onPress={() => setFilter('received')}>
                        Tout voir
                      </Button>
                    ) : undefined
                  ) : (
                    <Button variant="plain" tone="destructive" size="S" onPress={refuseAll}>
                      Tout refuser
                    </Button>
                  )
                }
              />
              <ListGroup surface="surface">{receivedRows.map((challenge, index) => row(challenge, 'received', index, receivedRows.length))}</ListGroup>
              {filter === 'received' && <FeedFooter {...feedFooterProps(receivedSource)} endLabel="Tu as vu tous les défis reçus" />}
            </View>
          )}
          {shows('sent') && sent.length > 0 && (
            <View style={{ gap: tokens.space[4] }}>
              <SectionHeader title="Envoyés" />
              <ListGroup surface="surface">{sent.map((challenge, index) => row(challenge, 'sent', index, sent.length))}</ListGroup>
            </View>
          )}
          {filter === 'sent' && sent.length === 0 && (
            <EmptyState icon={LightningIcon} title="Aucun défi envoyé" description="Défie un joueur depuis sa fiche ou depuis Social." />
          )}
          {shows('rooms') && salons.length > 0 && (
            <View style={{ gap: tokens.space[4] }}>
              <SectionHeader title="Salons privés" />
              <ListGroup surface="surface">
                {salons.map((room, index) => (
                  <ListRow
                    key={room.roomId}
                    icon={DoorOpenIcon}
                    label={topicName(room.topic.names)}
                    sub={`En attente d'un joueur${room.expiresAt ? ` · expire dans ${duration(Date.parse(room.expiresAt) - now)}` : ''}`}
                    control="chevron"
                    onPress={() =>
                      router.push({
                        pathname: '/room/[roomId]',
                        params: {
                          roomId: room.roomId,
                          topicId: room.topic.topicId,
                          topicName: topicName(room.topic.names),
                          category: room.topic.category ?? '',
                        },
                      })
                    }
                    last={index === salons.length - 1}
                  />
                ))}
              </ListGroup>
            </View>
          )}
          {filter === 'rooms' && salons.length === 0 && (
            <EmptyState
              icon={DoorOpenIcon}
              title="Aucun salon ouvert"
              description="Crée un salon privé et partage son lien."
              action={
                <Button style={{ alignSelf: 'center' }} onPress={() => setPickerOpen(true)}>
                  Créer un salon privé
                </Button>
              }
            />
          )}
        </View>
      )}
    </Screen>
  )
}
