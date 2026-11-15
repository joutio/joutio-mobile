import { useState } from 'react'
import { View } from 'react-native'
import {
  ChatCircleIcon,
  Composer,
  DragToLoadMore,
  EmptyState,
  FeedFooter,
  FlagIcon,
  LightningIcon,
  Message,
  MobileSheet,
  showDialog,
  TabLoadMoreScrollView,
  toast,
  tokens,
  WallEvent,
  WallPost,
} from '@/design-system'
import {
  COMMENTS_PAGE_SIZE,
  WALL_COMMENTS_MOCK,
  WALL_EVENT_MOCK,
  WALL_PAGE_SIZE,
  WALL_POSTS_MOCK,
  type WallCommentMock,
  type WallPostMock,
} from '../lib/wall-mocks'
import { clientSource, feedFooterProps, loadMoreOptions } from '@/shared/utils/paging'
import { t, useT } from '@/lib/i18n'

const remainingPosts = (count: number) => t(count > 1 ? 'wall.remainingMany' : 'wall.remainingOne', { count })

/** Signaler une publication ou un commentaire (mock : rien n'est envoyé). */
export function report(what: 'publication' | 'commentaire') {
  showDialog({
    title: what === 'publication' ? t('mobile.wall.reportPost') : t('mobile.wall.reportComment'),
    message: t('mobile.wall.reportText'),
    icon: FlagIcon,
    tone: 'danger',
    actions: [
      { label: t('player.report'), tone: 'destructive', onPress: () => toast.success(t('report.sent'), { description: t('mobile.wall.reportThanks') }) },
      { label: t('topic.cancel'), variant: 'plain' },
    ],
  })
}

/** État local du mur (mock) : publications, pages, J'aime, nouvelles anecdotes. */
export function useWall(me: string) {
  const t = useT()
  const [posts, setPosts] = useState<WallPostMock[]>(WALL_POSTS_MOCK)
  const [pages, setPages] = useState(1)
  const [liked, setLiked] = useState<ReadonlySet<string>>(new Set())
  return {
    posts,
    visible: posts.slice(0, pages * WALL_PAGE_SIZE),
    hasMore: posts.length > pages * WALL_PAGE_SIZE,
    remaining: Math.max(0, posts.length - pages * WALL_PAGE_SIZE),
    pages,
    liked,
    loadMore: () => setPages((value) => value + 1),
    toggleLike: (id: string) =>
      setLiked((current) => {
        const next = new Set(current)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      }),
    publish: (text: string) =>
      setPosts((current) => [{ id: `mine-${Date.now()}`, name: me, tier: 'OR', meta: t('mobile.wall.justNow'), text, likes: 0, comments: 0 }, ...current]),
  }
}

export type Wall = ReturnType<typeof useWall>

/** Onglet Mur : l'événement récent, puis les publications par pages de 20 (`DragToLoadMore`). */
export function WallTab({ wall, onComment }: { wall: Wall; onComment: (post: WallPostMock) => void }) {
  const t = useT()
  return (
    <DragToLoadMore enabled={wall.hasMore} onLoadMore={wall.loadMore}>
      <TabLoadMoreScrollView
        showsVerticalScrollIndicator={false}
        // Le bas laisse la place au bouton flottant.
        contentContainerStyle={{ gap: tokens.space[4], paddingHorizontal: tokens.space[5], paddingTop: tokens.space[2], paddingBottom: tokens.space[12] }}
      >
        {wall.posts.length === 0 ? (
          <EmptyState icon={ChatCircleIcon} title={t('mobile.wall.empty')} description={t('mobile.wall.emptyText')} />
        ) : (
          <>
            <WallEvent {...WALL_EVENT_MOCK} icon={LightningIcon} />
            {wall.visible.map((post) => (
              <WallPost
                key={post.id}
                {...post}
                liked={wall.liked.has(post.id)}
                likes={post.likes + (wall.liked.has(post.id) ? 1 : 0)}
                onLike={() => wall.toggleLike(post.id)}
                onComment={() => onComment(post)}
                onMenu={() => report('publication')}
              />
            ))}
            <FeedFooter
              state={wall.hasMore ? 'more' : 'end'}
              pages={wall.pages}
              onLoadMore={wall.loadMore}
              onRetry={wall.loadMore}
              endLabel={t('mobile.wall.allSeen')}
              remainingLabel={wall.hasMore ? remainingPosts(wall.remaining) : undefined}
            />
          </>
        )}
      </TabLoadMoreScrollView>
    </DragToLoadMore>
  )
}

/** Feuille « Partager une anecdote ». */
export function PostSheet({ open, onClose, topic, onPublish }: { open: boolean; onClose: () => void; topic: string; onPublish: (text: string) => void }) {
  const t = useT()
  const [text, setText] = useState('')
  return (
    <MobileSheet open={open} onClose={onClose} title={t('mobile.topic.shareAnecdote')} subtitle={topic}>
      <Composer
        autoFocus
        value={text}
        onChange={setText}
        placeholder={t('mobile.wall.placeholder')}
        onSend={(value) => {
          onPublish(value.trim())
          setText('')
          onClose()
          toast.success(t('mobile.wall.published'), { description: topic })
        }}
      />
    </MobileSheet>
  )
}

/** Feuille des commentaires d'une publication : bulles du chat, 20 par page, saisie en pied. */
export function CommentsSheet({ post, me, onClose }: { post: WallPostMock | undefined; me: string; onClose: () => void }) {
  const t = useT()
  const [comment, setComment] = useState('')
  const [mine, setMine] = useState<WallCommentMock[]>([])
  const [pages, setPages] = useState(1)
  const all = [...WALL_COMMENTS_MOCK.slice(0, Math.max(post?.comments ?? 0, 3) + 20), ...mine]
  const visible = all.slice(0, pages * COMMENTS_PAGE_SIZE + mine.length)
  const hasMore = visible.length < all.length
  const source = clientSource(pages, setPages, hasMore)
  const excerpt = post ? `${post.name} · ${post.text.length > 32 ? `${post.text.slice(0, 32).trimEnd()}…` : post.text}` : undefined

  return (
    <MobileSheet
      open={post !== undefined}
      onClose={() => {
        onClose()
        setPages(1)
      }}
      title={t('mobile.wall.comments', { count: all.length })}
      subtitle={excerpt}
      tall
      loadMore={loadMoreOptions(source)}
      footer={
        <Composer
          value={comment}
          onChange={setComment}
          placeholder={t('mobile.wall.addComment')}
          onSend={(value) => {
            setMine((current) => [...current, { id: `mine-${Date.now()}`, author: me, text: value.trim(), meta: t('mobile.wall.justNow') }])
            setComment('')
          }}
        />
      }
    >
      <View style={{ gap: tokens.space[3] }}>
        {visible.map((item) => (
          <Message
            key={item.id}
            from={item.author === me ? 'me' : 'opp'}
            author={item.author}
            text={item.text}
            meta={`${item.author} · ${item.meta}`}
            onLongPress={() => report('commentaire')}
          />
        ))}
        <FeedFooter {...feedFooterProps(source)} endLabel={t('mobile.wall.allCommentsSeen')} />
      </View>
    </MobileSheet>
  )
}
