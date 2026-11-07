import { useEffect, useState } from 'react'
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
import { useDebounced } from '@/shared/hooks/use-debounced'
import { topicName } from '@/shared/utils/topic-name'
import { useTopics } from '../hooks/use-topics'
import { DEFAULT_TOPIC_SORT } from '../lib/topics-service'
import { feedFooterProps, loadMoreOptions, pagedQuery } from '@/shared/utils/paging'

export interface PickedTopic {
  topicId: string
  name: string
  category?: string
}

/**
 * Choix d'un sujet en grande feuille : recherche fixe, catalogue en `TopicRow` paginé (`/api/topics`) et `FeedFooter`.
 * Partagée par « Défier un joueur » et « Créer un salon privé ».
 */
export function TopicPickerSheet({
  open,
  onClose,
  title,
  subtitle = 'Choisis un sujet',
  busy = false,
  onPick,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  /** Envoi en cours : les lignes ne répondent plus. */
  busy?: boolean
  onPick: (topic: PickedTopic) => void
}) {
  const [query, setQuery] = useState('')
  const search = useDebounced(query.trim())
  const topics = useTopics({ query: search, categories: [], sort: DEFAULT_TOPIC_SORT, hideFollowed: false }, open)
  const list = topics.data?.pages.flatMap((page) => page.topics) ?? []
  const paged = pagedQuery(topics)

  // Vidée à l'ouverture, comme le lab.
  useEffect(() => {
    if (open) setQuery('')
  }, [open])

  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      tall
      loadMore={loadMoreOptions(paged)}
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
                  onPress={busy ? undefined : () => onPick({ topicId: topic.topicId, name, category: topic.category ?? undefined })}
                />
              )
            })}
          </ListGroup>
          <FeedFooter {...feedFooterProps(paged)} endLabel="Tu as vu tous les sujets" />
        </View>
      )}
    </MobileSheet>
  )
}
