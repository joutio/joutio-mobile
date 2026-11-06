import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import {
  Button,
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
  Text,
  toCategoryCode,
  tokens,
  UsersThreeIcon,
  type CategoryCode,
} from '@/design-system'
import { pickImage, uploadImage } from '@/features/media/media-service'
import { toast } from '@/design-system'
import { topicName } from '@/shared/utils/topic-name'
import { questionStatus } from '../domain/authoring'
import { MAX_NAME, MIN_QUESTIONS } from '../domain/limits'
import { TEAM_MOCK } from '../lib/team-mocks'
import {
  useCreationLimits,
  useMyTopic,
  useMyTopics,
  usePublishTopic,
  useTopicQuestions,
  useUpdateTopicCategory,
  useUpdateTopicImage,
  useUpdateTopicNames,
} from '../hooks/use-authoring'
import { LocalizedFieldSheet, UniverseSheet, universeLabel } from './topic-sheets'

/** Vignette d'un sujet : paysage, comme `TopicCard`. */
const THUMBNAIL_ASPECT: [number, number] = [16, 9]

type TopicSheet = 'name' | 'universe' | 'image'

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
 * brouillon a la barre « Publier », active à 7 questions approuvées.
 */
export function MyTopicScreen() {
  const params = useLocalSearchParams<MyTopicRouteParams>()
  const topicId = params.id
  const { topic } = useMyTopic(topicId)
  const all = useMyTopics()
  const questions = useTopicQuestions(topicId)
  const { premium, limits, askPremium } = useCreationLimits()
  const names = useUpdateTopicNames(topicId)
  const category = useUpdateTopicCategory(topicId)
  const image = useUpdateTopicImage(topicId)
  const publish = usePublishTopic(topicId)
  const [sheet, setSheet] = useState<TopicSheet>()
  const [uploading, setUploading] = useState(false)
  const close = () => setSheet(undefined)

  const name = topic ? topicName(topic.names) : (params.name ?? '')
  const englishName = topic?.names.en ?? ''
  const code: CategoryCode = toCategoryCode(topic?.category ?? params.category)
  const imageUrl = topic ? (topic.imageUrl ?? undefined) : params.image || undefined
  const draft = (topic?.status ?? 'DRAFT') === 'DRAFT'
  const list = questions.data ?? []
  const approved = questions.data ? list.filter((question) => questionStatus(question) === 'approved').length : (topic?.questionsCount ?? 0)
  const pending = list.filter((question) => questionStatus(question) === 'pending').length
  const reported = list.filter((question) => question.openReportCount > 0).length
  const ready = approved >= MIN_QUESTIONS
  const missing = MIN_QUESTIONS - approved
  const published = (all.data?.content ?? []).filter((item) => item.status === 'PUBLISHED').length

  const pickThumbnail = async () => {
    const asset = await pickImage(THUMBNAIL_ASPECT)
    if (!asset) return
    setUploading(true)
    try {
      const media = await uploadImage(asset)
      await image.mutateAsync(media.url)
      close()
    } catch {
      toast.error("La vignette n'a pas pu être envoyée", { description: 'JPG ou PNG, 5 Mo au plus.' })
    } finally {
      setUploading(false)
    }
  }

  const onPublish = () => {
    if (published >= limits.topics) return askPremium('topics')
    publish.mutate()
  }

  return (
    <View style={{ flex: 1 }}>
      <ParallaxScreen
        inTabs
        barTitleStart
        image={imageUrl}
        title={name}
        eyebrow={universeLabel(code)}
        onBack={() => router.back()}
        intro={
          <View style={{ flexDirection: 'row' }}>
            <Pill tone={draft ? 'neutral' : 'correct'}>{draft ? 'Brouillon' : 'Publié'}</Pill>
          </View>
        }
        bottomBar={
          draft ? (
            <View style={{ gap: tokens.space[1] }}>
              <Button full size="L" disabled={!ready} loading={publish.isPending} onPress={onPublish}>
                Publier
              </Button>
              {!ready && (
                <Text variant="caption" color="muted" align="center">
                  {`Encore ${missing} question${missing > 1 ? 's' : ''} pour publier.`}
                </Text>
              )}
            </View>
          ) : undefined
        }
      >
        <View style={{ gap: tokens.space[6], paddingHorizontal: tokens.space[5], paddingTop: tokens.space[2], paddingBottom: tokens.space[7] }}>
          <View style={{ gap: tokens.space[3] }}>
            <SectionHeader title="Sujet" />
            <ListGroup surface="surface">
              <ListRow
                icon={PencilSimpleIcon}
                label="Nom"
                control="chevron"
                value={name}
                sub={englishName ? `English : ${englishName}` : 'English : facultatif'}
                onPress={() => setSheet('name')}
              />
              <ListRow icon={SquaresFourIcon} label="Univers" control="chevron" value={universeLabel(code)} onPress={() => setSheet('universe')} />
              <ListRow icon={ImageIcon} label="Vignette" control="chevron" value={imageUrl ? 'Modifier' : 'Ajouter'} onPress={() => setSheet('image')} last />
            </ListGroup>
          </View>
          <View style={{ gap: tokens.space[3] }}>
            <SectionHeader title="Contenu" />
            <ListGroup surface="surface">
              <ListRow
                icon={ListChecksIcon}
                label="Questions"
                control="chevron"
                value={draft ? `${approved} / ${MIN_QUESTIONS}` : String(list.length || approved)}
                onPress={() => router.push({ pathname: '/profile/topics/[id]/questions', params: { id: topicId, name } })}
              />
              <ListRow
                icon={UsersThreeIcon}
                label="Équipe"
                control="chevron"
                value={premium ? String(TEAM_MOCK.length + 1) : 'Premium'}
                onPress={premium ? () => router.push({ pathname: '/profile/topics/[id]/team', params: { id: topicId, name } }) : () => askPremium('team')}
              />
              <ListRow
                icon={ShieldCheckIcon}
                label="Modération"
                control="chevron"
                value={String(pending + reported)}
                onPress={() => router.push({ pathname: '/profile/topics/[id]/moderation', params: { id: topicId, name } })}
                last
              />
            </ListGroup>
          </View>
        </View>
      </ParallaxScreen>

      <LocalizedFieldSheet
        open={sheet === 'name'}
        title="Nom"
        label="Nom"
        initial={{ fr: name, en: englishName }}
        max={MAX_NAME}
        placeholder={{ fr: 'Par exemple, Châteaux de la Loire', en: 'For example, Loire Valley castles' }}
        busy={names.isPending}
        onClose={close}
        onSave={({ fr, en }) => {
          const changes = { ...(fr !== name ? { fr } : null), ...(en && en !== englishName ? { en } : null) }
          if (Object.keys(changes).length === 0) return close()
          names.mutate(changes, { onSuccess: close })
        }}
      />
      <UniverseSheet open={sheet === 'universe'} value={code} onClose={close} onChange={(next) => next !== code && category.mutate(next)} />
      <MobileSheet open={sheet === 'image'} onClose={close} title="Vignette" subtitle="Facultative">
        <ImagePicker
          image={imageUrl}
          hint="JPG ou PNG, 5 Mo"
          busy={uploading || image.isPending}
          onPick={() => void pickThumbnail()}
          onRemove={() => image.mutate(null, { onSuccess: close })}
        />
      </MobileSheet>
    </View>
  )
}
