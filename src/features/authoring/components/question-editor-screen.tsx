import { getUserId } from '@/lib/auth'
import { useLocalSearchParams } from 'expo-router'
import { router } from '@/shared/navigation/router'
import { zodResolver } from '@hookform/resolvers/zod'
import { questionDraftSchema } from '@joutio/client/forms'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
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
  FIELD_TOOLBAR_HEIGHT,
  FieldToolbar,
  focusNextField,
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
  TopBannerFrame,
  useScreenTopInset,
} from '@/design-system'
import { pickImage, uploadImage } from '@/features/media/media-service'
import type { Language } from '@joutio/client/api-types'
import { MAX_ALT, MAX_ANSWER, MAX_QUESTION } from '@joutio/client/authoring'
import {
  buildQuestionPlan,
  draftFromQuestion,
  emptyDraft,
  frenchFilled,
  missingAlt,
  translationStatus,
  type QuestionDraft,
} from '@joutio/client/authoring'
import { questionActions, workshopRole } from '@joutio/client/authoring'
import { useArchiveQuestion, useCreationLimits, useDeleteQuestion, useFrozen, useMyTopic, useSaveQuestion, useTopicQuestions } from '../hooks/use-authoring'
import { FrozenNotice } from './frozen-notice'
import { LANGUAGES } from './topic-sheets'
import { TRANSLATION_LABEL, useT } from '@/lib/i18n'

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
  const t = useT()
  const params = useLocalSearchParams<QuestionEditorRouteParams>()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const screenTop = useScreenTopInset()
  const topicId = params.topicId
  const questionId = params.questionId || undefined
  const questions = useTopicQuestions(topicId)
  const original = questionId ? questions.data?.find((question) => question.questionId === questionId) : undefined
  const save = useSaveQuestion(topicId)
  const archive = useDeleteQuestion(topicId)
  const lifecycle = useArchiveQuestion(topicId)
  const { topic, permissions } = useMyTopic(topicId)
  const { limits } = useCreationLimits()
  const { published, locks } = useFrozen()
  const locked = locks(topic, workshopRole(permissions))
  // Image enregistrée : une autre URL est une image choisie ici, dont la description devient obligatoire.
  const form = useForm<QuestionDraft>({
    resolver: zodResolver(questionDraftSchema(original?.imageUrl ?? undefined)),
    mode: 'onChange',
    defaultValues: original ? draftFromQuestion(original) : emptyDraft(),
  })
  const [texts, answersByLanguage, correct, imageUrl, alt] = useWatch({ control: form.control, name: ['texts', 'answers', 'correct', 'imageUrl', 'alt'] })
  const draft: QuestionDraft = { texts, answers: answersByLanguage, correct, imageUrl, alt }
  const validate = { shouldValidate: true }
  const [loaded, setLoaded] = useState(!questionId || original !== undefined)
  const [language, setLanguage] = useState<Language>('fr')
  const imageChanged = imageUrl !== (original?.imageUrl ?? undefined)
  // Avancement de l'envoi d'image (0 à 100) ; `undefined` hors envoi.
  const [progress, setProgress] = useState<number | undefined>(undefined)
  const uploading = progress !== undefined
  // Confirmations rendues dans cet écran : le `Modal` du `DialogHost` racine reste sous une modale plein écran iOS.
  const [confirm, setConfirm] = useState<'archive' | 'delete'>()

  // Question ouverte avant la fin du chargement : le brouillon part de la question dès qu'elle arrive.
  useEffect(() => {
    if (loaded || !original) return
    form.reset(draftFromQuestion(original))
    setLoaded(true)
  }, [form, loaded, original])

  const english = translationStatus(draft)
  const filled = frenchFilled(draft)
  const altMissing = missingAlt(draft, imageChanged)
  const mayEdit =
    !questionId ||
    Boolean(
      (permissions?.canManage && original?.status !== 'ARCHIVED') ||
      (original?.creatorId === getUserId() && (original?.status === 'PENDING' || original?.status === 'REJECTED')),
    )
  const ready = loaded && form.formState.isValid && !uploading && mayEdit && !locked
  const actions = original ? questionActions(workshopRole(permissions), original, getUserId() ?? undefined) : []
  const missingCorrect = filled && draft.correct === undefined
  const text = draft.texts[language]
  const answers = draft.answers[language]

  const pick = async () => {
    const asset = await pickImage(QUESTION_IMAGE_ASPECT)
    if (!asset) return
    setProgress(0)
    try {
      const media = await uploadImage(asset, setProgress)
      form.setValue('imageUrl', media.url, validate)
    } catch {
      toast.error(t('settings.imageError'), { description: t('mobile.authoring.imageFormat') })
    } finally {
      setProgress(undefined)
    }
  }

  const onSave = form.handleSubmit((values) => {
    const operations = buildQuestionPlan(original, values)
    if (operations.length === 0) return router.back()
    // Optimiste : l'écran d'origine (Questions, Signalements) affiche déjà la question corrigée au retour.
    save.mutate({ questionId, operations, resolveReports: params.resolveReports === '1' })
    router.back()
  })

  if (questionId && (questions.isError || (!questions.isPending && !original)))
    return (
      <TopBannerFrame style={{ backgroundColor: colors.bg }}>
        <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: screenTop }}>
          <MobileTopBar variant="modal" title={t('workshop.questionUnavailable')} cancel={t('play.close')} onCancel={() => router.back()} />
          <Text>{t('workshop.questionUnavailableText')}</Text>
          <Button onPress={() => void questions.refetch()}>{t('callback.retry')}</Button>
        </View>
      </TopBannerFrame>
    )

  return (
    <TopBannerFrame style={{ backgroundColor: colors.bg }}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: screenTop }}>
        <MobileTopBar
          variant="modal"
          title={params.number ? t('workshop.questionNumber', { number: params.number }) : t('workshop.question')}
          cancel={t('topic.cancel')}
          confirm={t('settings.save')}
          confirmLoading={save.isPending}
          confirmDisabled={!ready || save.isPending}
          onCancel={() => router.back()}
          onConfirm={() => void onSave()}
        />
        <KeyboardAwareScrollView
          // Le champ actif reste au-dessus de la barre ‹ › OK.
          bottomOffset={tokens.space[6] + FIELD_TOOLBAR_HEIGHT}
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
            hint={uploading ? t('media.uploadingPercent', { percent: progress }) : t('workshop.imageHint')}
            progress={progress}
            onPick={() => void pick()}
            onRemove={() => {
              form.setValue('imageUrl', undefined, validate)
              form.setValue('alt', { fr: '', en: '' }, validate)
            }}
          />
          <View style={{ gap: tokens.space[2] }}>
            <Segmented<Language> label={t('settings.language')} options={LANGUAGES} value={language} onChange={setLanguage} />
            <Text variant="caption" color={english === 'partial' ? 'wrong' : 'muted'}>
              {english === 'partial' ? t('workshop.englishPartial') : t('workshop.englishStatus', { status: t(TRANSLATION_LABEL[english]) })}
            </Text>
          </View>
          <Field
            key={language}
            label={language === 'fr' ? t('workshop.question') : t('workshop.questionEnglish')}
            placeholder={language === 'fr' ? t('workshop.questionPlaceholder') : 'Ask your question'}
            hint={language === 'en' ? t('workshop.inFrench', { text: draft.texts.fr.trim() || '—' }) : undefined}
            multiline
            value={text}
            maxLength={MAX_QUESTION}
            counter={t('mobile.authoring.counter', { count: text.length, max: MAX_QUESTION })}
            onChangeText={(next) => form.setValue(`texts.${language}`, next, validate)}
          />
          {draft.imageUrl && (
            <Field
              key={`alt-${language}`}
              label={language === 'fr' ? t('workshop.alt') : t('workshop.altEnglish')}
              placeholder={language === 'fr' ? t('workshop.altPlaceholder') : 'What the image shows'}
              hint={language === 'fr' ? t('workshop.altHint') : t('workshop.inFrench', { text: draft.alt.fr.trim() || '—' })}
              error={language === 'fr' && altMissing && filled ? t('workshop.altMissing') : undefined}
              value={draft.alt[language]}
              maxLength={MAX_ALT}
              counter={t('mobile.authoring.counter', { count: draft.alt[language].length, max: MAX_ALT })}
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={focusNextField}
              onChangeText={(next) => form.setValue(`alt.${language}`, next, validate)}
            />
          )}
          <View style={{ gap: tokens.space[3] }}>
            <SectionHeader title={language === 'fr' ? t('workshop.answers') : t('workshop.answersEnglish')} subtitle={t('workshop.answersHint')} />
            <RadioGroup label={t('workshop.correctAnswer')}>
              <ListGroup surface="surface">
                {answers.map((answer, index) => (
                  <AnswerEditorRow
                    key={`${language}-${index}`}
                    index={index + 1}
                    value={answer}
                    maxLength={MAX_ANSWER}
                    placeholder={language === 'en' ? draft.answers.fr[index]?.trim() || undefined : undefined}
                    correct={draft.correct === index}
                    onChange={(next) => form.setValue(`answers.${language}.${index}`, next, validate)}
                    onMarkCorrect={() => form.setValue('correct', index, validate)}
                    // Réponses 1 à 3 : « Suivant » passe à la réponse d'après ; la dernière ferme le clavier.
                    returnKeyType={index === answers.length - 1 ? 'done' : 'next'}
                    submitBehavior={index === answers.length - 1 ? 'blurAndSubmit' : 'submit'}
                    onSubmitEditing={index === answers.length - 1 ? undefined : focusNextField}
                    last={index === answers.length - 1}
                  />
                ))}
              </ListGroup>
            </RadioGroup>
            {missingCorrect && (
              <Text variant="caption" color="wrong">
                {t('workshop.correctMissing')}
              </Text>
            )}
          </View>
          {original?.rejectionReason && <Text color="muted">{original.rejectionReason}</Text>}
          {locked && <FrozenNotice published={published} limit={limits.publishedTopics} />}
          {actions.length > 0 && questionId && (
            // Cycle de vie, à l'écart de l'enregistrement ; archiver et supprimer passent toujours par une confirmation.
            <View style={{ gap: tokens.space[3] }}>
              <SectionHeader title={t('workshop.manage')} subtitle={actions.includes('archive') ? t('workshop.manageHint') : undefined} />
              <ListGroup surface="surface">
                {actions.includes('archive') && (
                  <ListRow
                    icon={ArchiveIcon}
                    label={t('workshop.archiveQuestion')}
                    control="chevron"
                    onPress={() => setConfirm('archive')}
                    last={!actions.includes('delete')}
                  />
                )}
                {actions.includes('restore') && (
                  <ListRow
                    icon={ArrowCounterClockwiseIcon}
                    label={t('workshop.restoreQuestion')}
                    control="chevron"
                    onPress={() => {
                      lifecycle.mutate({ id: questionId, restore: true })
                      router.back()
                    }}
                    last={!actions.includes('delete')}
                  />
                )}
                {actions.includes('delete') && (
                  <ListRow icon={TrashIcon} label={t('workshop.deleteQuestion')} destructive control="none" onPress={() => setConfirm('delete')} last />
                )}
              </ListGroup>
            </View>
          )}
        </KeyboardAwareScrollView>
        <FieldToolbar />
        {questionId && (
          <>
            <Dialog
              open={confirm === 'archive'}
              onClose={() => setConfirm(undefined)}
              title={t('workshop.archiveTitle', { number: params.number ?? '' }).replace('  ', ' ')}
              message={t('workshop.archiveText')}
              icon={ArchiveIcon}
              actions={[
                {
                  label: t('workshop.archive'),
                  onPress: () => {
                    lifecycle.mutate({ id: questionId })
                    router.back()
                  },
                },
                { label: t('topic.cancel'), variant: 'plain' },
              ]}
            />
            <Dialog
              open={confirm === 'delete'}
              onClose={() => setConfirm(undefined)}
              title={t('workshop.deleteQuestionTitle', { number: params.number ?? '' }).replace('  ', ' ')}
              message={t('workshop.deleteQuestionText')}
              tone="danger"
              icon={TrashIcon}
              actions={[
                {
                  label: t('workshop.delete'),
                  tone: 'destructive',
                  onPress: () => {
                    archive.mutate(questionId)
                    router.back()
                  },
                },
                { label: t('topic.cancel'), variant: 'plain' },
              ]}
            />
          </>
        )}
      </View>
    </TopBannerFrame>
  )
}
