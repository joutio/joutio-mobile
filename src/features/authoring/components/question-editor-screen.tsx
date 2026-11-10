import { getUserId } from '@/lib/auth'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  ArchiveIcon,
  ArrowCounterClockwiseIcon,
  Button,
  Dialog,
  AnswerEditorRow,
  Field,
  ImagePicker,
  ListGroup,
  ListRow,
  MobileTopBar,
  RadioGroup,
  SectionHeader,
  Segmented,
  Text,
  toast,
  tokens,
  TrashIcon,
  useTheme,
} from '@/design-system'
import { pickImage, uploadImage } from '@/features/media/media-service'
import type { Language } from '@/shared/types/bff'
import { MAX_ALT, MAX_ANSWER, MAX_QUESTION } from '../domain/limits'
import {
  buildQuestionPlan,
  draftFromQuestion,
  emptyDraft,
  frenchFilled,
  isReady,
  missingAlt,
  TRANSLATION_STATUS_LABEL,
  translationStatus,
  type QuestionDraft,
} from '../domain/question-draft'
import { questionActions, workshopRole } from '../domain/authoring'
import { useArchiveQuestion, useDeleteQuestion, useMyTopic, useSaveQuestion, useTopicQuestions } from '../hooks/use-authoring'
import { LANGUAGES } from './topic-sheets'

/** Image de question : 5:4, comme `QuestionBlock`. */
const QUESTION_IMAGE_ASPECT: [number, number] = [5, 4]

export interface QuestionEditorRouteParams {
  topicId: string
  number?: string
  /** Vide : nouvelle question. */
  questionId?: string
  /** `1` : ouverte depuis un signalement, enregistrer clôt ses signalements ouverts. */
  resolveReports?: string
  [key: string]: string | undefined
}

/**
 * Éditeur de question (`creation.md` § 1 et § 2), en modale : image facultative, onglets Français / English, puis la
 * question, la description de l'image et les quatre réponses de la langue choisie ; « Juste » sur la bonne, commune
 * aux deux langues. Enregistrer s'active quand tout est rempli. La description d'image n'est **pas envoyée** (aucun
 * champ backend).
 */
export function QuestionEditorScreen() {
  const params = useLocalSearchParams<QuestionEditorRouteParams>()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const topicId = params.topicId
  const questionId = params.questionId || undefined
  const questions = useTopicQuestions(topicId)
  const original = questionId ? questions.data?.find((question) => question.questionId === questionId) : undefined
  const save = useSaveQuestion(topicId)
  const archive = useDeleteQuestion(topicId)
  const lifecycle = useArchiveQuestion(topicId)
  const { permissions } = useMyTopic(topicId)
  const [draft, setDraft] = useState<QuestionDraft>(() => (original ? draftFromQuestion(original) : emptyDraft()))
  const [loaded, setLoaded] = useState(!questionId || original !== undefined)
  const [language, setLanguage] = useState<Language>('fr')
  const [imageChanged, setImageChanged] = useState(false)
  const [uploading, setUploading] = useState(false)
  // Confirmations rendues dans cet écran : le `Modal` du `DialogHost` racine reste sous une modale plein écran iOS.
  const [confirm, setConfirm] = useState<'archive' | 'delete'>()

  // Question ouverte avant la fin du chargement : le brouillon part de la question dès qu'elle arrive.
  useEffect(() => {
    if (loaded || !original) return
    setDraft(draftFromQuestion(original))
    setLoaded(true)
  }, [loaded, original])

  const english = translationStatus(draft)
  const filled = frenchFilled(draft)
  const altMissing = missingAlt(draft, imageChanged)
  const mayEdit =
    !questionId ||
    Boolean(
      (permissions?.canManage && original?.status !== 'ARCHIVED') ||
      (original?.creatorId === getUserId() && (original?.status === 'PENDING' || original?.status === 'REJECTED')),
    )
  const ready = loaded && isReady(draft, imageChanged) && !uploading && mayEdit
  const actions = original ? questionActions(workshopRole(permissions), original, getUserId() ?? undefined) : []
  const missingCorrect = filled && draft.correct === undefined
  const text = draft.texts[language]
  const answers = draft.answers[language]

  const pick = async () => {
    const asset = await pickImage(QUESTION_IMAGE_ASPECT)
    if (!asset) return
    setUploading(true)
    try {
      const media = await uploadImage(asset)
      setDraft((current) => ({ ...current, imageUrl: media.url }))
      setImageChanged(true)
    } catch {
      toast.error("L'image n'a pas pu être envoyée", { description: 'JPG ou PNG, 5 Mo au plus.' })
    } finally {
      setUploading(false)
    }
  }

  const onSave = () => {
    const operations = buildQuestionPlan(original, draft)
    if (operations.length === 0) return router.back()
    // Optimiste : l'écran d'origine (Questions, Signalements) affiche déjà la question corrigée au retour.
    save.mutate({ questionId, operations, resolveReports: params.resolveReports === '1' })
    router.back()
  }

  if (questionId && (questions.isError || (!questions.isPending && !original)))
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <MobileTopBar variant="modal" title="Question indisponible" cancel="Fermer" onCancel={() => router.back()} />
        <Text>La question est indisponible ou tu n’as plus accès à son édition.</Text>
        <Button onPress={() => void questions.refetch()}>Réessayer</Button>
      </View>
    )

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <MobileTopBar
        variant="modal"
        title={`Question ${params.number ?? ''}`.trim()}
        cancel="Annuler"
        confirm="Enregistrer"
        confirmLoading={save.isPending}
        confirmDisabled={!ready || save.isPending}
        onCancel={() => router.back()}
        onConfirm={onSave}
      />
      <KeyboardAwareScrollView
        bottomOffset={tokens.space[6]}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          gap: tokens.space[4],
          paddingHorizontal: tokens.space[5],
          paddingTop: tokens.space[2],
          paddingBottom: insets.bottom + tokens.space[7],
        }}
      >
        <ImagePicker
          image={draft.imageUrl}
          hint="Image · facultative · JPG ou PNG, 5 Mo · à décrire"
          busy={uploading}
          onPick={() => void pick()}
          onRemove={() => {
            setDraft({ ...draft, imageUrl: undefined, alt: { fr: '', en: '' } })
            setImageChanged(true)
          }}
        />
        <View style={{ gap: tokens.space[2] }}>
          <Segmented<Language> label="Langue" options={LANGUAGES} value={language} onChange={setLanguage} />
          <Text variant="caption" color={english === 'partial' ? 'wrong' : 'muted'}>
            {english === 'partial'
              ? 'Anglais à terminer : traduis la question et les quatre réponses, ou vide-les pour enregistrer.'
              : `Anglais : ${TRANSLATION_STATUS_LABEL[english].toLowerCase()}. Si tu commences, traduis la question et les quatre réponses.`}
          </Text>
        </View>
        <Field
          key={language}
          label={language === 'fr' ? 'Question' : 'Question en anglais'}
          placeholder={language === 'fr' ? 'Pose ta question' : 'Ask your question'}
          hint={language === 'en' ? `En français : ${draft.texts.fr.trim() || '—'}` : undefined}
          multiline
          value={text}
          maxLength={MAX_QUESTION}
          counter={`${text.length} / ${MAX_QUESTION}`}
          onChangeText={(next) => setDraft({ ...draft, texts: { ...draft.texts, [language]: next } })}
        />
        {draft.imageUrl && (
          <Field
            key={`alt-${language}`}
            label={language === 'fr' ? "Description de l'image" : "Description de l'image en anglais"}
            placeholder={language === 'fr' ? 'Ce que montre l’image' : 'What the image shows'}
            hint={language === 'fr' ? "Lue aux joueurs qui ne voient pas l'image. Obligatoire." : `En français : ${draft.alt.fr.trim() || '—'}`}
            error={language === 'fr' && altMissing && filled ? "Décris l'image pour enregistrer." : undefined}
            value={draft.alt[language]}
            maxLength={MAX_ALT}
            counter={`${draft.alt[language].length} / ${MAX_ALT}`}
            onChangeText={(next) => setDraft({ ...draft, alt: { ...draft.alt, [language]: next } })}
          />
        )}
        <View style={{ gap: tokens.space[3] }}>
          <SectionHeader title={language === 'fr' ? 'Réponses' : 'Réponses en anglais'} subtitle="Quatre réponses. Touche « Juste » sur la bonne." />
          <RadioGroup label="Bonne réponse">
            <ListGroup surface="surface">
              {answers.map((answer, index) => (
                <AnswerEditorRow
                  key={`${language}-${index}`}
                  index={index + 1}
                  value={answer}
                  maxLength={MAX_ANSWER}
                  placeholder={language === 'en' ? draft.answers.fr[index]?.trim() || undefined : undefined}
                  correct={draft.correct === index}
                  onChange={(next) =>
                    setDraft({ ...draft, answers: { ...draft.answers, [language]: answers.map((item, position) => (position === index ? next : item)) } })
                  }
                  onMarkCorrect={() => setDraft({ ...draft, correct: index })}
                  last={index === answers.length - 1}
                />
              ))}
            </ListGroup>
          </RadioGroup>
          {missingCorrect && (
            <Text variant="caption" color="wrong">
              Choisis la bonne réponse pour enregistrer.
            </Text>
          )}
        </View>
        {original?.rejectionReason && <Text color="muted">{original.rejectionReason}</Text>}
        {actions.length > 0 && questionId && (
          // Cycle de vie, à l'écart de l'enregistrement ; archiver et supprimer passent toujours par une confirmation.
          <View style={{ gap: tokens.space[3] }}>
            <SectionHeader
              title="Gérer"
              subtitle={actions.includes('archive') ? 'Archiver retire la question des parties ; elle reste restaurable.' : undefined}
            />
            <ListGroup surface="surface">
              {actions.includes('archive') && (
                <ListRow
                  icon={ArchiveIcon}
                  label="Archiver la question"
                  control="chevron"
                  onPress={() => setConfirm('archive')}
                  last={!actions.includes('delete')}
                />
              )}
              {actions.includes('restore') && (
                <ListRow
                  icon={ArrowCounterClockwiseIcon}
                  label="Restaurer la question"
                  control="chevron"
                  onPress={() => {
                    lifecycle.mutate({ id: questionId, restore: true })
                    router.back()
                  }}
                  last={!actions.includes('delete')}
                />
              )}
              {actions.includes('delete') && (
                <ListRow
                  icon={TrashIcon}
                  label="Supprimer la question"
                  destructive
                  control="none"
                  onPress={() => setConfirm('delete')}
                  last
                />
              )}
            </ListGroup>
          </View>
        )}
      </KeyboardAwareScrollView>
      {questionId && (
        <>
          <Dialog
            open={confirm === 'archive'}
            onClose={() => setConfirm(undefined)}
            title={`Archiver la question ${params.number ?? ''} ?`.replace('  ', ' ')}
            message="Elle est retirée des parties. Tu la retrouves dans le filtre Archivées ; la restaurer la remet en attente de validation."
            icon={ArchiveIcon}
            actions={[
              {
                label: 'Archiver',
                onPress: () => {
                  lifecycle.mutate({ id: questionId })
                  router.back()
                },
              },
              { label: 'Annuler', variant: 'plain' },
            ]}
          />
          <Dialog
            open={confirm === 'delete'}
            onClose={() => setConfirm(undefined)}
            title={`Supprimer la question ${params.number ?? ''} ?`.replace('  ', ' ')}
            message="Elle disparaît du sujet et de ses statistiques. Cette action est définitive ; pour la retirer seulement des parties, archive-la."
            tone="danger"
            icon={TrashIcon}
            actions={[
              {
                label: 'Supprimer',
                tone: 'destructive',
                onPress: () => {
                  archive.mutate(questionId)
                  router.back()
                },
              },
              { label: 'Annuler', variant: 'plain' },
            ]}
          />
        </>
      )}
    </View>
  )
}
