import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import {
  Button,
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
  Text,
  toCategoryCode,
  tokens,
  UsersThreeIcon,
  type CategoryCode,
} from '@/design-system'
import { pickImage, uploadImage } from '@/features/media/media-service'
import { toast } from '@/design-system'
import { topicName } from '@/shared/utils/topic-name'
import { questionStatus, workshopRole } from '@joutio/client-domain/authoring'
import { MAX_NAME, MIN_QUESTIONS } from '@joutio/client-domain/authoring'

import {
  useDeleteTopic,
  useDraftTopic,
  useTeam,
  useCreationLimits,
  useMyTopic,
  useMyTopics,
  usePublishTopic,
  useTopicQuestions,
  useUpdateTopicCategory,
  useUpdateTopicImage,
  useUpdateTopicPictogram,
  useUpdateTopicNames,
} from '../hooks/use-authoring'
import { LocalizedFieldSheet, UniverseSheet, universeLabel } from './topic-sheets'
import { useRefreshActive } from '@/shared/hooks/use-refresh-active'

/** Vignette d'un sujet : paysage, comme `TopicCard`. */
const THUMBNAIL_ASPECT: [number, number] = [16, 9]

type TopicSheet = 'name' | 'universe' | 'image' | 'pictogram'

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
  const base = '/workshop/[id]' as const
  const params = useLocalSearchParams<MyTopicRouteParams>()
  const topicId = params.id
  const { topic, permissions, isError, refetch } = useMyTopic(topicId)
  const draftTopic = useDraftTopic(topicId)
  const deleteTopic = useDeleteTopic(topicId)
  const role = workshopRole(permissions)
  const manager = permissions?.canManage === true
  const team = useTeam(topicId)
  const all = useMyTopics()
  const pageRefresh = useRefreshActive()
  const questions = useTopicQuestions(topicId)
  const { premium, limits, askPremium } = useCreationLimits()
  const names = useUpdateTopicNames(topicId)
  const category = useUpdateTopicCategory(topicId)
  const image = useUpdateTopicImage(topicId)
  const pictogram = useUpdateTopicPictogram(topicId)
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

  // Pictogramme : PNG carré seulement (transparence conservée) ; les SVG sont réservés au seed.
  const pickPictogram = async () => {
    const asset = await pickImage([1, 1], { crop: false })
    if (!asset) return
    if (asset.mimeType && asset.mimeType !== 'image/png') {
      toast.error('Le pictogramme doit être un PNG', { description: 'Carré, 5 Mo au plus.' })
      return
    }
    setUploading(true)
    try {
      const media = await uploadImage(asset)
      await pictogram.mutateAsync(media.url)
      close()
    } catch {
      toast.error("Le pictogramme n'a pas pu être envoyé", { description: 'PNG carré, 5 Mo au plus.' })
    } finally {
      setUploading(false)
    }
  }

  const onPublish = () => {
    if (published >= limits.topics) return askPremium('topics')
    publish.mutate()
  }

  if (isError)
    return (
      <Screen header={<MobileTopBar variant="inline" title="Sujet" back="Retour" onBack={() => router.back()} />}>
        <Text>Le sujet est indisponible ou tu ne fais plus partie de son équipe.</Text>
        <Button onPress={() => void refetch()}>Réessayer</Button>
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
            <Pill tone={draft ? 'neutral' : 'correct'}>{draft ? 'Brouillon' : 'Publié'}</Pill>
            {permissions && role !== 'creator' && <Pill tone="neutral">{role === 'admin' ? 'Administrateur' : 'Rédacteur'}</Pill>}
          </View>
        }
        // Zone d'actions du sujet, selon le rôle : publier ou supprimer le brouillon, repasser le publié en brouillon.
        // Chaque action qui retire ou supprime passe par une confirmation.
        bottomBar={
          !manager ? undefined : draft ? (
            <View style={{ gap: tokens.space[1] }}>
              <Button full size="L" disabled={!ready} loading={publish.isPending} onPress={onPublish}>
                Publier
              </Button>
              {!ready && (
                <Text variant="caption" color="muted" align="center">
                  {`Encore ${missing} question${missing > 1 ? 's' : ''} pour publier.`}
                </Text>
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
                      title: `Supprimer « ${name} » ?`,
                      message: `Le brouillon et ses ${list.length} question${list.length > 1 ? 's' : ''} sont supprimés. Cette action est définitive.`,
                      tone: 'danger',
                      icon: TrashIcon,
                      actions: [
                        {
                          label: 'Supprimer',
                          tone: 'destructive',
                          onPress: () => {
                            deleteTopic.mutate()
                            router.back()
                          },
                        },
                        { label: 'Annuler', variant: 'plain' },
                      ],
                    })
                  }
                >
                  Supprimer le brouillon
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
                  title: 'Repasser en brouillon ?',
                  message:
                    "Le sujet quitte le catalogue : plus de nouvelles parties ni d'invitations. Les parties en cours se terminent. Tu pourras le republier.",
                  icon: FileDashedIcon,
                  actions: [
                    { label: 'Repasser en brouillon', onPress: () => draftTopic.mutate() },
                    { label: 'Annuler', variant: 'plain' },
                  ],
                })
              }
            >
              Repasser en brouillon
            </Button>
          )
        }
      >
        <View style={{ gap: tokens.space[6], paddingHorizontal: tokens.space[5], paddingTop: tokens.space[2], paddingBottom: tokens.space[7] }}>
          {/* Nom, univers et vignette : réservés à ceux qui gèrent le sujet. */}
          {manager && (
            <View style={{ gap: tokens.space[3] }}>
              <SectionHeader title="Sujet" />
              <ListGroup surface="surface">
                <ListRow
                  icon={PencilSimpleIcon}
                  label="Nom"
                  control="chevron"
                  value={name}
                  sub={englishName ? `English : ${englishName}` : 'English : facultatif'}
                  onPress={permissions?.canManage ? () => setSheet('name') : undefined}
                />
                <ListRow
                  icon={SquaresFourIcon}
                  label="Univers"
                  control="chevron"
                  value={universeLabel(code)}
                  onPress={permissions?.canManage ? () => setSheet('universe') : undefined}
                />
                <ListRow
                  icon={ImageIcon}
                  label="Vignette"
                  control="chevron"
                  value={imageUrl ? 'Modifier' : 'Ajouter'}
                  onPress={permissions?.canManage ? () => setSheet('image') : undefined}
                />
                <ListRow
                  icon={StickerIcon}
                  label="Pictogramme"
                  control="chevron"
                  value={pictogramUrl ? 'Modifier' : 'Ajouter'}
                  onPress={permissions?.canManage ? () => setSheet('pictogram') : undefined}
                  last
                />
              </ListGroup>
            </View>
          )}
          <View style={{ gap: tokens.space[3] }}>
            <SectionHeader title="Contenu" />
            <ListGroup surface="surface">
              <ListRow
                icon={ListChecksIcon}
                label="Questions"
                control="chevron"
                value={draft ? `${approved} / ${MIN_QUESTIONS}` : String(list.length || approved)}
                onPress={() => router.push({ pathname: `${base}/questions`, params: { id: topicId, name } })}
                last={!manager}
              />
              {/* Un rédacteur propose des questions : ni équipe ni modération. */}
              {manager && (
                <ListRow
                  icon={UsersThreeIcon}
                  label="Équipe"
                  control="chevron"
                  value={String(team.data?.length ?? 1)}
                  onPress={() => router.push({ pathname: `${base}/team`, params: { id: topicId, name } })}
                />
              )}
              {manager && (
                <ListRow
                  icon={ShieldCheckIcon}
                  label="Modération"
                  control="chevron"
                  value={String(pending + reported)}
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
      <UniverseSheet
        open={sheet === 'universe'}
        value={code}
        onClose={close}
        busy={category.isPending}
        onChange={(next) => (next !== code ? category.mutateAsync(next) : undefined)}
      />
      <MobileSheet open={sheet === 'image'} onClose={close} title="Vignette" subtitle="Facultative">
        <ImagePicker
          image={imageUrl}
          hint="JPG ou PNG, 5 Mo"
          busy={uploading || image.isPending}
          onPick={() => void pickThumbnail()}
          onRemove={() => image.mutate(null, { onSuccess: close })}
        />
      </MobileSheet>
      <MobileSheet open={sheet === 'pictogram'} onClose={close} title="Pictogramme" subtitle="Facultatif, affiché dans la grille des sujets">
        <ImagePicker
          image={pictogramUrl}
          hint="PNG carré, 5 Mo"
          busy={uploading || pictogram.isPending}
          onPick={() => void pickPictogram()}
          onRemove={() => pictogram.mutate(null, { onSuccess: close })}
        />
      </MobileSheet>
    </View>
  )
}
