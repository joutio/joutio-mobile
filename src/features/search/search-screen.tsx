import { useLocalSearchParams } from 'expo-router'
import { router } from '@/shared/navigation/router'
import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Button,
  ClockCounterClockwiseIcon,
  EmptyState,
  ListGroup,
  ListRow,
  MagnifyingGlassIcon,
  PlayerRow,
  SearchField,
  SectionHeader,
  Skeleton,
  toCategoryCode,
  tokens,
  TopicRow,
  useTheme,
  WarningCircleIcon,
  WifiSlashIcon,
  tabBarScrollInsets,
  useTabBarInset,
} from '@/design-system'
import { usePlayerIdentity } from '@/features/me'
import { openTopic } from '@/features/topic'
import { useOnline } from '@/shared/hooks/use-online'
import type { SuggestionView } from '@joutio/client/api-types'
import { avatarSvg } from '@/shared/utils/avatar'
import { topicName } from '@/shared/utils/topic-name'
import { useRecentSearches, useSuggestions } from './use-search'
import { useT } from '@/lib/i18n'

export type SearchStack = 'home' | 'social'

const PLAYER_PATH = { home: '/home/player/[id]', social: '/social/player/[id]' } as const

/**
 * Recherche globale (`recherche.md`, 2026-11-07) : un champ (focus à l'ouverture), les recherches récentes tant qu'il
 * est vide, puis les sujets et les joueurs (`GET /api/suggestions`). Un résultat entre dans les récentes et ouvre sa
 * fiche dans la pile de l'onglet (Accueil ou Social).
 */
export function SearchScreen({ stack }: { stack: SearchStack }) {
  const t = useT()
  const identity = usePlayerIdentity()
  // Fin de liste au-dessus de la tab bar native iOS (`useTabBarInset`).
  const tabInset = useTabBarInset()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const online = useOnline()
  const { q } = useLocalSearchParams<{ q?: string }>()
  const [query, setQuery] = useState(q ?? '')
  const results = useSuggestions(query)
  const { recents, remember, clear } = useRecentSearches()
  const items = results.data ?? []
  const topics = items.filter((item) => item.type === 'TOPIC')
  const players = items.filter((item) => item.type === 'PLAYER')

  const openItem = (item: SuggestionView) => {
    if (item.type === 'TOPIC') {
      const names = item.names ?? { fr: item.label }
      remember(topicName(names))
      openTopic(stack, { topicId: item.id, names, bannerUrl: null, imageUrl: item.imageUrl, category: item.category })
    } else {
      remember(item.label)
      router.push({ pathname: PLAYER_PATH[stack], params: { id: item.id } })
    }
  }

  const content = () => {
    if (!online) return <EmptyState icon={WifiSlashIcon} title={t('search.offline')} description={t('search.offlineText')} />
    if (!results.searching) {
      if (recents.length === 0) return <EmptyState icon={MagnifyingGlassIcon} title={t('search.emptyTitle')} description={t('search.emptyText')} />
      return (
        <View style={{ gap: tokens.space[3] }}>
          <SectionHeader
            title={t('search.recents')}
            action={
              <Button variant="plain" size="S" onPress={clear}>
                {t('search.clear')}
              </Button>
            }
          />
          <ListGroup surface="surface">
            {recents.map((item, index) => (
              <ListRow
                key={item}
                icon={ClockCounterClockwiseIcon}
                label={item}
                control="chevron"
                onPress={() => setQuery(item)}
                last={index === recents.length - 1}
              />
            ))}
          </ListGroup>
        </View>
      )
    }
    if (results.settling || results.isPending)
      return (
        <View accessibilityLabel={t('home.loading')} style={{ gap: tokens.space[3] }}>
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} shape="row" />
          ))}
        </View>
      )
    if (results.isError)
      return (
        <EmptyState
          icon={WarningCircleIcon}
          title={t('mobile.search.failed')}
          description={t('home.errorText')}
          action={
            <Button style={{ alignSelf: 'center' }} loading={results.isRefetching} onPress={() => void results.refetch()}>
              {t('callback.retry')}
            </Button>
          }
        />
      )
    if (items.length === 0)
      return (
        <EmptyState icon={MagnifyingGlassIcon} title={t('search.noResult', { query: query.trim() })} description={t('search.noResultText')} />
      )
    return (
      <>
        {topics.length > 0 && (
          <View style={{ gap: tokens.space[3] }}>
            <SectionHeader title={t('nav.topics')} />
            <ListGroup surface="surface">
              {topics.map((item, index) => (
                <TopicRow
                  key={item.id}
                  title={item.names ? topicName(item.names) : item.label}
                  official={item.official ?? false}
                  category={toCategoryCode(item.category ?? undefined)}
                  pictogram={item.pictogramUrl ?? undefined}
                  image={item.imageUrl ?? undefined}
                  sub={item.subtitle ?? undefined}
                  onPress={() => openItem(item)}
                  last={index === topics.length - 1}
                />
              ))}
            </ListGroup>
          </View>
        )}
        {players.length > 0 && (
          <View style={{ gap: tokens.space[3] }}>
            <SectionHeader title={t('board.scope')} />
            <ListGroup surface="surface">
              {players.map((item, index) => (
                <PlayerRow
                  key={item.id}
                  name={item.label}
                  premium={identity.premium(item, item.id)}
                  sub={item.suspended ? t('onboarding.ended.suspendedTitle') : (item.subtitle ?? undefined)}
                  src={avatarSvg(item.avatarOptions, item.id) ?? undefined}
                  chevron
                  onPress={() => openItem(item)}
                  last={index === players.length - 1}
                />
              ))}
            </ListGroup>
          </View>
        )}
      </>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: tokens.space[5], paddingVertical: tokens.space[2] }}>
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder={t('search.placeholder')}
          label={t('search.label')}
          autoFocus
          onCancel={() => (query ? setQuery('') : router.back())}
        />
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        {...tabBarScrollInsets(tabInset)}
        contentContainerStyle={{
          gap: tokens.space[6],
          paddingHorizontal: tokens.space[5],
          paddingTop: tokens.space[2],
          paddingBottom: tokens.space[7],
        }}
      >
        {content()}
      </ScrollView>
    </View>
  )
}
