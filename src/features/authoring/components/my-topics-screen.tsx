import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import {
  Button,
  EmptyState,
  IconButton,
  ListGroup,
  MobileTopBar,
  PencilSimpleIcon,
  PlusIcon,
  Screen,
  SectionHeader,
  Skeleton,
  toCategoryCode,
  tokens,
  TopicRow,
  WarningCircleIcon,
} from '@/design-system'
import type { TopicCardView } from '@joutio/client-domain/api-types'
import { topicName } from '@/shared/utils/topic-name'
import { MIN_QUESTIONS, questionsLabel } from '@joutio/client-domain/authoring'
import { todoTotal } from '@joutio/client-domain/authoring'
import { useCreateTopic, useCreationLimits, useFrozen, useMyTopics, useTopicTodo } from '../hooks/use-authoring'
import { FrozenNotice } from './frozen-notice'
import { CreateTopicSheet } from './topic-sheets'
import { useRefreshActive } from '@/shared/hooks/use-refresh-active'

const topicSub = (topic: TopicCardView) =>
  topic.status === 'DRAFT' ? `Brouillon · ${topic.questionsCount} / ${MIN_QUESTIONS} questions` : `Publié · ${questionsLabel(topic.questionsCount)}`

/** Ouvre « Mon sujet » tout de suite : nom, univers et vignette passent par la navigation. */
export function openMyTopic(topicId: string, name: string, category: string | null, imageUrl: string | null) {
  router.push({ pathname: '/workshop/[id]', params: { id: topicId, name, category: category ?? '', image: imageUrl ?? '' } })
}

/**
 * Mes sujets (`creation.md` § 1) : brouillons et publiés, + pour créer. Entrée unique par Réglages, avec la barre
 * d'onglets. Les sujets où une action est requise remontent dans « À traiter », avec une pastille ; comme les
 * autres, ils s'ouvrent sur Mon sujet.
 */
export function MyTopicsScreen() {
  const topics = useMyTopics()
  const todo = useTopicTodo()
  const pageRefresh = useRefreshActive()
  const create = useCreateTopic()
  const { premium, limits, askPremium } = useCreationLimits()
  const { frozen, published } = useFrozen()
  const [createOpen, setCreateOpen] = useState(false)
  const list = topics.data?.content ?? []

  const startCreate = () => {
    if (!premium && published >= limits.publishedTopics) return askPremium(frozen ? 'frozen' : 'topics')
    setCreateOpen(true)
  }

  const content = () => {
    if (topics.isPending)
      return (
        <View style={{ gap: tokens.space[3] }}>
          <Skeleton shape="row" />
          <Skeleton shape="row" />
        </View>
      )
    if (topics.isError)
      return (
        <EmptyState
          icon={WarningCircleIcon}
          title="Impossible de charger tes sujets"
          description="Vérifie ta connexion, puis réessaie."
          action={
            <Button style={{ alignSelf: 'center' }} loading={topics.isRefetching} onPress={() => void topics.refetch()}>
              Réessayer
            </Button>
          }
        />
      )
    if (list.length === 0)
      return (
        <EmptyState
          icon={PencilSimpleIcon}
          title="Crée ton premier sujet"
          description={`Rédige au moins ${MIN_QUESTIONS} questions pour le publier et le faire jouer.`}
          action={
            <Button full onPress={startCreate}>
              Créer un sujet
            </Button>
          }
        />
      )
    const pending = (topic: TopicCardView) => todoTotal(todo.data?.find((item) => item.topicId === topic.topicId))
    const toHandle = list.filter((topic) => pending(topic) > 0)
    const others = list.filter((topic) => pending(topic) === 0)
    const rows = (items: TopicCardView[]) => (
      <ListGroup surface="surface">
        {items.map((topic, index) => (
          <TopicRow
            key={topic.topicId}
            disabled={topic.topicId.startsWith('pending-')}
            title={topicName(topic.names)}
            category={toCategoryCode(topic.category)}
            image={topic.imageUrl ?? undefined}
            sub={topicSub(topic)}
            badge={pending(topic)}
            onPress={() => openMyTopic(topic.topicId, topicName(topic.names), topic.category, topic.imageUrl)}
            last={index === items.length - 1}
          />
        ))}
      </ListGroup>
    )
    return (
      <View style={{ gap: tokens.space[6] }}>
        {frozen && <FrozenNotice published={published} limit={limits.publishedTopics} />}
        {toHandle.length > 0 && (
          <View style={{ gap: tokens.space[3] }}>
            <SectionHeader title="À traiter" />
            {rows(toHandle)}
          </View>
        )}
        {others.length > 0 && (
          <View style={{ gap: tokens.space[3] }}>
            {toHandle.length > 0 && <SectionHeader title="Mes sujets" />}
            {rows(others)}
          </View>
        )}
      </View>
    )
  }

  return (
    <Screen
      onRefresh={pageRefresh.refresh}
      inTabs
      header={
        <MobileTopBar
          variant="inline"
          back="Réglages"
          onBack={() => router.back()}
          title="Mes sujets"
          right={<IconButton icon={PlusIcon} label="Créer un sujet" variant="plain" tone="accent" onPress={startCreate} />}
        />
      }
      overlay={
        <CreateTopicSheet
          open={createOpen}
          busy={create.isPending}
          onClose={() => setCreateOpen(false)}
          onCreate={({ name, category }) =>
            create.mutate(
              { name, category },
              {
                onSuccess: ({ id }) => {
                  setCreateOpen(false)
                  openMyTopic(id, name, category, null)
                },
              },
            )
          }
        />
      }
      contentStyle={{ paddingHorizontal: tokens.space[5], paddingTop: tokens.space[1], paddingBottom: tokens.space[7] }}
    >
      {content()}
    </Screen>
  )
}
