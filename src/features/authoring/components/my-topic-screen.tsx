import { descriptionsDraft, topicDescription } from '@joutio/client/authoring'
import { useLocalSearchParams } from 'expo-router'
import { router } from '@/shared/navigation/router'
import { useState } from 'react'
import { View } from 'react-native'
import {
  Button,
  CrownSimpleIcon,
  FileDashedIcon,
  TrashIcon,
  Screen,
  MobileTopBar,
  showDialog,
  ImageIcon,
  ImagePicker,
  ListChecksIcon,
  ListGroup,
  ListRow,
  MobileSheet,
  ParallaxScreen,
  PencilSimpleIcon,
  Pill,
  SectionHeader,
  ShieldCheckIcon,
  SquaresFourIcon,
  StickerIcon,
  TextAlignLeftIcon,
  Text,
  toCategoryCode,
  tokens,
  UsersThreeIcon,
  type CategoryCode,
  ProgressBar,
  Notice,
} from '@/design-system'
import { pickImage, uploadImage } from '@/features/media/media-service'
import { toast } from '@/design-system'
import { topicName } from '@/shared/utils/topic-name'
import { questionStatus, workshopRole } from '@joutio/client/authoring'
import { customizedTierCount, MASTERY_TIERS, MAX_NAME, MIN_QUESTIONS, playableCount } from '@joutio/client/authoring'
import { TopicTitlesSheet } from './topic-titles-sheet'

import {
  useDeleteTopic,
  useDraftTopic,
  useTeam,
  useCreationLimits,
  useFrozen,
  useMyTopic,
  usePublishTopic,
  useTopicQuestions,
  useUpdateTopicCategory,
  useUpdateTopicDescription,
  useUpdateTopicImage,
  useUpdateTopicPictogram,
  useUpdateTopicTitles,
  useUpdateTopicNames,
} from '../hooks/use-authoring'
import { FrozenNotice } from './frozen-notice'
import { DescriptionSheet, LocalizedFieldSheet, UniverseSheet, universeLabel } from './topic-sheets'
import { useRefreshActive } from '@/shared/hooks/use-refresh-active'
import { useT } from '@/lib/i18n'

/** Vignette d'un sujet : paysage, comme `TopicCard`. */
const THUMBNAIL_ASPECT: [number, number] = [16, 9]

type TopicSheet = 'name' | 'description' | 'universe' | 'image' | 'pictogram' | 'titles'

export interface MyTopicRouteParams {
  id: string
  name?: string
  category?: string
  image?: string
  [key: string]: string | undefined
}

/**
 * Mon sujet (`creation.md` § 1) : page commune au brouillon et au publié, en `ParallaxScreen` comme la Fiche sujet.
 * Section Sujet (nom, univers, vignette, chacun en feuille), section Contenu (questions, équipe, modération). Le
 * brouillon a l'avancement « n / 7 » puis « Publier » à 7 questions approuvées.
 */
export function MyTopicScreen() {
  const t = useT()
  const base = '/workshop/[id]' as const
  const params = useLocalSearchParams<MyTopicRouteParams>()
  const topicId = params.id
  const { topic, permissions, titles, closedReason, isError, refetch } = useMyTopic(topicId)
  const draftTopic = useDraftTopic(topicId)
  const deleteTopic = useDeleteTopic(topicId)
  const role = workshopRole(permissions)
  const manager = permissions?.canManage === true
  const team = useTeam(topicId)
  const pageRefresh = useRefreshActive()
  const questions = useTopicQuestions(topicId)
  const { premium, limits, askPremium } = useCreationLimits()
  const { frozen, published, locks } = useFrozen()
  const names = useUpdateTopicNames(topicId)
  const category = useUpdateTopicCategory(topicId)
  const description = useUpdateTopicDescription(topicId)
  const image = useUpdateTopicImage(topicId)
  const pictogram = useUpdateTopicPictogram(topicId)
  const updateTitles = useUpdateTopicTitles(topicId)
  const publish = usePublishTopic(topicId)
  const [sheet, setSheet] = useState<TopicSheet>()
  const [uploading, setUploading] = useState(false)
  const close = () => setSheet(undefined)

  const name = topic ? topicName(topic.names) : (params.name ?? '')
  const englishName = topic?.names.en ?? ''
  const code: CategoryCode = toCategoryCode(topic?.category ?? params.category)
  const imageUrl = topic ? (topic.imageUrl ?? undefined) : params.image || undefined
  const pictogramUrl = topic?.pictogramUrl ?? undefined
  const draft = (topic?.status ?? 'DRAFT') === 'DRAFT'
  const list = questions.data ?? []
  // Questions jouables (approuvées dans une même langue) : c'est ce que la publication exige.
  const approved = questions.data ? playableCount(list) : (topic?.questionsCount ?? 0)
  const pending = list.filter((question) => questionStatus(question) === 'pending').length
  const reported = list.filter((question) => question.openReportCount > 0).length
  const ready = approved >= MIN_QUESTIONS
  const locked = locks(topic, role)

  const pickThumbnail = async () => {
    const asset = await pickImage(THUMBNAIL_ASPECT)
    if (!asset) return
    setUploading(true)
    try {
      const media = await uploadImage(asset)
      await image.mutateAsync(media.url)
      close()
    } catch {
      toast.error(t('mobile.authoring.thumbnailUploadFailed'), { description: t('mobile.authoring.imageFormat') })
    } finally {
      setUploading(false)
    }
  }

  // Pictogramme : PNG carré seulement (transparence conservée) ; les SVG sont réservés au seed.
  const pickPictogram = async () => {
    const asset = await pickImage([1, 1], { crop: false })
    if (!asset) return
    if (asset.mimeType && asset.mimeType !== 'image/png') {
      toast.error(t('mobile.authoring.pictogramPng'), { description: t('mobile.authoring.pictogramSquare') })
      return
    }
    setUploading(true)
    try {
      const media = await uploadImage(asset)
      await pictogram.mutateAsync(media.url)
      close()
    } catch {
      toast.error(t('mobile.authoring.pictogramUploadFailed'), { description: t('mobile.authoring.pictogramFormat') })
    } finally {
      setUploading(false)
    }
  }

  const onPublish = () => {
    if (role === 'creator' && !premium && published >= limits.publishedTopics) return askPremium(frozen ? 'frozen' : 'topics')
    publish.mutate()
  }

  if (isError)
    return (
      <Screen header={<MobileTopBar variant="inline" title={t('pending.topic')} back={t('topic.back')} onBack={() => router.back()} />}>
        <Text>{t('mobile.authoring.topicUnavailableText')}</Text>
        <Button onPress={() => void refetch()}>{t('callback.retry')}</Button>
      </Screen>
    )
  return (
    <View style={{ flex: 1 }}>
      <ParallaxScreen
        onRefresh={pageRefresh.refresh}
        barTitleStart
        image={imageUrl}
        title={name}
        eyebrow={<Pill category={code}>{universeLabel(code)}</Pill>}
        onBack={() => router.back()}
        intro={
          <View style={{ flexDirection: 'row', gap: tokens.space[2] }}>
            <Pill tone={draft ? 'neutral' : 'correct'}>{draft ? t('workshop.draft') : t('workshop.publishedStatus')}</Pill>
            {permissions && role !== 'creator' && <Pill tone="neutral">{role === 'admin' ? t('workshop.roleAdmin') : t('workshop.roleWriter')}</Pill>}
          </View>
        }
        // Zone d'actions du sujet, selon le rôle : publier ou supprimer le brouillon, repasser le publié en brouillon.
        // Chaque action qui retire ou supprime passe par une confirmation.
        bottomBar={
          !manager ? undefined : draft ? (
            <View style={{ gap: tokens.space[1] }}>
              {/* Tant que le minimum manque, l'avancement remplace un bouton Publier inactif (2026-11-12). */}
              {ready ? (
                <Button full size="L" loading={publish.isPending} onPress={onPublish}>
                  {t('workshop.publish')}
                </Button>
              ) : (
                <ProgressBar
                  style={{ paddingVertical: tokens.space[2] }}
                  label={t('workshop.minimum', { count: approved, min: MIN_QUESTIONS })}
                  value={Math.min(100, (approved * 100) / MIN_QUESTIONS)}
                />
              )}
              {role === 'creator' && (
                <Button
                  full
                  variant="plain"
                  tone="destructive"
                  icon={TrashIcon}
                  loading={deleteTopic.isPending}
                  onPress={() =>
                    showDialog({
                      title: t('workshop.deleteTitle', { name }),
                      message: list.length > 1 ? t('workshop.deleteTextMany', { count: list.length }) : t('workshop.deleteTextOne'),
                      tone: 'danger',
                      icon: TrashIcon,
                      actions: [
                        {
                          label: t('workshop.delete'),
                          tone: 'destructive',
                          onPress: () => {
                            deleteTopic.mutate()
                            router.back()
                          },
                        },
                        { label: t('topic.cancel'), variant: 'plain' },
                      ],
                    })
                  }
                >
                  {t('workshop.deleteDraft')}
                </Button>
              )}
            </View>
          ) : (
            <Button
              full
              size="L"
              icon={FileDashedIcon}
              loading={draftTopic.isPending}
              variant="gray"
              tone="neutral"
              onPress={() =>
                showDialog({
                  title: t('workshop.unpublishTitle'),
                  message:
                    t('workshop.unpublishText'),
                  icon: FileDashedIcon,
                  actions: [
                    { label: t('workshop.unpublish'), onPress: () => draftTopic.mutate() },
                    { label: t('topic.cancel'), variant: 'plain' },
                  ],
                })
              }
            >
              {t('workshop.unpublish')}
            </Button>
          )
        }
      >
        <View style={{ gap: tokens.space[6], paddingHorizontal: tokens.space[5], paddingTop: tokens.space[2], paddingBottom: tokens.space[7] }}>
          {locked && <FrozenNotice published={published} limit={limits.publishedTopics} />}
          {closedReason !== null && (
            <Notice tone="error" title={t('workshop.closedTitle')} message={t('workshop.closedText', { reason: closedReason || '—' })} />
          )}
          {/* Nom, univers et vignette : réservés à ceux qui gèrent le sujet. */}
          {manager && (
            <View style={{ gap: tokens.space[3] }}>
              <SectionHeader title={t('pending.topic')} />
              <ListGroup surface="surface">
                <ListRow
                  icon={PencilSimpleIcon}
                  label={t('workshop.name')}
                  control={locked ? 'none' : 'chevron'}
                  disabled={locked}
                  value={name}
                  sub={englishName ? t('mobile.authoring.englishName', { name: englishName }) : t('workshop.englishOptional')}
                  onPress={permissions?.canManage && !locked ? () => setSheet('name') : undefined}
                />
                <ListRow
                  icon={TextAlignLeftIcon}
                  label={t('workshop.description')}
                  control={locked ? 'none' : 'chevron'}
                  disabled={locked}
                  value={topic && topicDescription(topic) ? t('settings.bannerEdit') : t('settings.bannerAdd')}
                  sub={(topic && topicDescription(topic)) ?? t('mobile.authoring.descriptionSubShort')}
                  onPress={permissions?.canManage && !locked ? () => setSheet('description') : undefined}
                />
                <ListRow
                  icon={SquaresFourIcon}
                  label={t('topics.universes')}
                  control={locked ? 'none' : 'chevron'}
                  disabled={locked}
                  value={universeLabel(code)}
                  onPress={permissions?.canManage && !locked ? () => setSheet('universe') : undefined}
                />
                <ListRow
                  icon={ImageIcon}
                  label={t('workshop.thumbnail')}
                  control={locked ? 'none' : 'chevron'}
                  disabled={locked}
                  value={imageUrl ? t('settings.bannerEdit') : t('settings.bannerAdd')}
                  onPress={permissions?.canManage && !locked ? () => setSheet('image') : undefined}
                />
                <ListRow
                  icon={StickerIcon}
                  label={t('workshop.pictogram')}
                  control={locked ? 'none' : 'chevron'}
                  disabled={locked}
                  value={pictogramUrl ? t('settings.bannerEdit') : t('settings.bannerAdd')}
                  onPress={permissions?.canManage && !locked ? () => setSheet('pictogram') : undefined}
                />
                <ListRow
                  icon={CrownSimpleIcon}
                  label={t('workshop.titles')}
                  control={locked ? 'none' : 'chevron'}
                  disabled={locked}
                  value={t('mobile.authoring.counter', { count: customizedTierCount(titles), max: MASTERY_TIERS.length })}
                  sub={t('workshop.titlesSub')}
                  onPress={permissions?.canManage && !locked ? () => setSheet('titles') : undefined}
                  last
                />
              </ListGroup>
            </View>
          )}
          <View style={{ gap: tokens.space[3] }}>
            <SectionHeader title={t('workshop.content')} />
            <ListGroup surface="surface">
              <ListRow
                icon={ListChecksIcon}
                label={t('topic.questions')}
                control="chevron"
                value={draft ? t('mobile.authoring.counter', { count: approved, max: MIN_QUESTIONS }) : String(list.length || approved)}
                onPress={() => router.push({ pathname: `${base}/questions`, params: { id: topicId, name } })}
                last={!manager}
              />
              {/* Un rédacteur propose des questions : ni équipe ni modération. */}
              {manager && (
                <ListRow
                  icon={UsersThreeIcon}
                  label={t('workshop.team')}
                  control="chevron"
                  value={String(team.data?.length ?? 1)}
                  onPress={() => router.push({ pathname: `${base}/team`, params: { id: topicId, name } })}
                />
              )}
              {manager && (
                <ListRow
                  icon={ShieldCheckIcon}
                  label={t('workshop.moderation')}
                  control="chevron"
                  badge={pending + reported}
                  onPress={() => router.push({ pathname: `${base}/moderation`, params: { id: topicId, name } })}
                  last
                />
              )}
            </ListGroup>
          </View>
        </View>
      </ParallaxScreen>

      <LocalizedFieldSheet
        open={sheet === 'name'}
        title={t('workshop.name')}
        label={t('workshop.name')}
        initial={{ fr: name, en: englishName }}
        max={MAX_NAME}
        placeholder={{ fr: t('workshop.namePlaceholder'), en: 'For example, Loire Valley castles' }}
        busy={names.isPending}
        onClose={close}
        onSave={({ fr, en }) => {
          const changes = { ...(fr !== name ? { fr } : null), ...(en && en !== englishName ? { en } : null) }
          if (Object.keys(changes).length === 0) return close()
          names.mutate(changes, { onSuccess: close })
        }}
      />
      <DescriptionSheet
        open={sheet === 'description'}
        initial={topic ? descriptionsDraft(topic) : { fr: '', en: '' }}
        busy={description.isPending}
        onClose={close}
        onSave={(changes) => {
          if (changes.length === 0) return close()
          void Promise.all(changes.map((change) => description.mutateAsync(change)))
            .then(close)
            .catch(() => undefined)
        }}
      />
      <UniverseSheet
        open={sheet === 'universe'}
        value={code}
        onClose={close}
        busy={category.isPending}
        onChange={(next) => (next !== code ? category.mutateAsync(next) : undefined)}
      />
      <MobileSheet open={sheet === 'image'} onClose={close} title={t('workshop.thumbnail')} subtitle={t('workshop.optional')}>
        <ImagePicker
          image={imageUrl}
          hint={t('settings.bannerHint')}
          busy={uploading || image.isPending}
          onPick={() => void pickThumbnail()}
          onRemove={() => image.mutate(null, { onSuccess: close })}
        />
      </MobileSheet>
      <MobileSheet open={sheet === 'pictogram'} onClose={close} title={t('workshop.pictogram')} subtitle={t('workshop.pictogramSub')}>
        <ImagePicker
          image={pictogramUrl}
          hint={t('workshop.pictogramHint')}
          busy={uploading || pictogram.isPending}
          onPick={() => void pickPictogram()}
          onRemove={() => pictogram.mutate(null, { onSuccess: close })}
        />
      </MobileSheet>
      <TopicTitlesSheet
        open={sheet === 'titles'}
        topicName={name}
        titles={titles}
        busy={updateTitles.isPending}
        onClose={close}
        onSave={(next) => updateTitles.mutate(next, { onSuccess: close })}
      />
    </View>
  )
}
