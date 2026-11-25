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
import { DEFAULT_TOPIC_SORT } from '@joutio/client/topics'
import { feedFooterProps, loadMoreOptions, pagedQuery } from '@/shared/utils/paging'
import { useT } from '@/lib/i18n'

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
  subtitle,
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
  const t = useT()
  const [query, setQuery] = useState('')
  const search = useDebounced(query.trim())
  const topics = useTopics({ query: search, categories: [], sort: DEFAULT_TOPIC_SORT, hideFollowed: false })
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
      subtitle={subtitle ?? t('player.pickTopic')}
      tall
      loadMore={loadMoreOptions(paged)}
      stickyHeader={<SearchField value={query} onChange={setQuery} placeholder={t('topics.search')} label={t('topics.search')} />}
    >
      {topics.isPending ? (
        <View accessibilityLabel={t('home.loading')} style={{ gap: tokens.space[3] }}>
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} shape="row" style={{ height: 64 }} />
          ))}
        </View>
      ) : topics.isError ? (
        <EmptyState
          icon={WarningCircleIcon}
          title={t('topics.errorTitle')}
          description={t('home.errorText')}
          action={
            <Button style={{ alignSelf: 'center' }} loading={topics.isRefetching} onPress={() => void topics.refetch()}>
              {t('callback.retry')}
            </Button>
          }
        />
      ) : list.length === 0 ? (
        <EmptyState icon={MagnifyingGlassIcon} title={t('topics.emptyTitle')} description={t('player.noTopicText')} />
      ) : (
        <View style={{ gap: tokens.space[4] }}>
          <ListGroup>
            {list.map((topic, index) => {
              const name = topicName(topic.names)
              return (
                <TopicRow
                  key={topic.topicId}
                  title={name}
                  official={topic.official ?? false}
                  category={toCategoryCode(topic.category)}
                  pictogram={topic.pictogramUrl ?? undefined}
                  image={topic.imageUrl ?? undefined}
                  last={index === list.length - 1}
                  onPress={busy ? undefined : () => onPick({ topicId: topic.topicId, name, category: topic.category ?? undefined })}
                />
              )
            })}
          </ListGroup>
          <FeedFooter {...feedFooterProps(paged)} endLabel={t('topics.end')} />
        </View>
      )}
    </MobileSheet>
  )
}
