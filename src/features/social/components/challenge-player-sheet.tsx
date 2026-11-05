import { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import {
  Button,
  EmptyState,
  FeedFooter,
  ListGroup,
  MagnifyingGlassIcon,
  MobileSheet,
  SearchField,
  Skeleton,
  toCategoryCode,
  TopicRow,
  tokens,
  WarningCircleIcon,
} from '@/design-system'
import { useChallengePlayer } from '@/features/play/hooks/use-play'
import { useTopics } from '@/features/topics/hooks/use-topics'
import { DEFAULT_TOPIC_SORT } from '@/features/topics/lib/topics-service'
import { useDebounced } from '@/shared/hooks/use-debounced'
import type { PlayerCardView } from '@/shared/types/bff'
import { topicName } from '@/shared/utils/topic-name'

/**
 * « Défier <joueur> » (`fiche-joueur.md` § 2, `challenge-sheet.tsx` du lab), partagée par Social et la Fiche joueur :
 * grande feuille, recherche fixe, catalogue en `TopicRow` paginé (`/api/topics`) et `FeedFooter`. Le choix envoie le
 * défi ; le toast « Défi envoyé » vient de `useChallengePlayer`.
 */
export function ChallengePlayerSheet({ player, onClose, onSent }: { player: PlayerCardView | null; onClose: () => void; onSent?: () => void }) {
  const open = Boolean(player)
  // Le joueur reste affiché pendant la fermeture : le titre ne disparaît pas avant la feuille.
  const shown = useRef(player)
  if (player) shown.current = player
  const target = shown.current
  const [query, setQuery] = useState('')
  const search = useDebounced(query.trim())
  const topics = useTopics({ query: search, categories: [], sort: DEFAULT_TOPIC_SORT, hideFollowed: false }, open)
  const challenge = useChallengePlayer()
  const list = topics.data?.pages.flatMap((page) => page.topics) ?? []

  // Vidée à l'ouverture, comme le lab.
  useEffect(() => {
    if (open) setQuery('')
  }, [open])

  const pick = (topicId: string, name: string) => {
    if (!target || challenge.isPending) return
    challenge.mutate(
      { topic: { topicId, name }, opponent: { userId: target.userId, pseudonym: target.pseudonym } },
      {
        onSuccess: () => {
          onSent?.()
          onClose()
        },
      },
    )
  }

  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      title={target ? `Défier ${target.pseudonym}` : 'Défier'}
      subtitle="Choisis un sujet"
      tall
      stickyHeader={<SearchField value={query} onChange={setQuery} placeholder="Chercher un sujet" label="Chercher un sujet" />}
    >
      {topics.isPending ? (
        <View accessibilityLabel="Chargement" style={{ gap: tokens.space[3] }}>
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} shape="row" style={{ height: 64 }} />
          ))}
        </View>
      ) : topics.isError ? (
        <EmptyState
          icon={WarningCircleIcon}
          title="Impossible de charger les sujets"
          description="Vérifie ta connexion, puis réessaie."
          action={
            <Button style={{ alignSelf: 'center' }} loading={topics.isRefetching} onPress={() => void topics.refetch()}>
              Réessayer
            </Button>
          }
        />
      ) : list.length === 0 ? (
        <EmptyState icon={MagnifyingGlassIcon} title="Aucun sujet trouvé" description="Essaie un autre mot." />
      ) : (
        <View style={{ gap: tokens.space[4] }}>
          <ListGroup>
            {list.map((topic, index) => {
              const name = topicName(topic.names)
              return (
                <TopicRow
                  key={topic.topicId}
                  title={name}
                  category={toCategoryCode(topic.category)}
                  image={topic.imageUrl ?? undefined}
                  last={index === list.length - 1}
                  onPress={challenge.isPending ? undefined : () => pick(topic.topicId, name)}
                />
              )
            })}
          </ListGroup>
          <FeedFooter
            state={topics.isFetchNextPageError ? 'error' : topics.isFetchingNextPage ? 'loading' : topics.hasNextPage ? 'more' : 'end'}
            onLoadMore={() => void topics.fetchNextPage()}
            onRetry={() => void topics.fetchNextPage()}
            endLabel="Tu as vu tous les sujets"
          />
        </View>
      )}
    </MobileSheet>
  )
}
