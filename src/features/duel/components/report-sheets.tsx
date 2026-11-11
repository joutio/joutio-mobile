import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import { Button, Field, ListGroup, ListRow, MobileSheet, Text, toast, tokens } from '@/design-system'
import { api } from '@/lib/api'
import { ENDPOINTS } from '@/lib/endpoints'
import type { QuestionReportReason, UserReportReason } from '@joutio/client-domain/api-types'

const MAX_COMMENT = 500

const PLAYER_REASONS: { value: UserReportReason; label: string; sub: string }[] = [
  { value: 'HARASSMENT', label: 'Harcèlement', sub: 'Insultes, menaces, comportement répété' },
  { value: 'HATE_SPEECH', label: 'Discours haineux', sub: 'Propos visant un groupe ou une personne' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Contenu inapproprié', sub: 'Pseudonyme, avatar ou bannière choquants' },
  { value: 'CHEATING', label: 'Triche', sub: 'Comportement déloyal pendant un duel' },
  { value: 'SPAM', label: 'Spam', sub: 'Publicité, messages répétitifs' },
  { value: 'OTHER', label: 'Autre', sub: 'Un problème qui ne rentre pas dans les autres cases' },
]

const QUESTION_REASONS: { value: QuestionReportReason; label: string; sub: string }[] = [
  { value: 'QUESTION', label: "L'énoncé", sub: 'Faute, ambiguïté, question incompréhensible' },
  { value: 'IMAGE', label: "L'image", sub: 'Absente, erronée ou de mauvaise qualité' },
  { value: 'ANSWERS', label: 'Les réponses', sub: 'Bonne réponse incorrecte ou choix incohérents' },
]

function Reasons<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { value: T; label: string; sub: string }[]
  value: readonly T[]
  onChange: (next: T[]) => void
}) {
  return (
    <ListGroup>
      {items.map((item, index) => (
        <ListRow
          key={item.value}
          label={item.label}
          sub={item.sub}
          control="check"
          on={value.includes(item.value)}
          onToggle={(on) => onChange(on ? [...value, item.value] : value.filter((reason) => reason !== item.value))}
          last={index === items.length - 1}
        />
      ))}
    </ListGroup>
  )
}

/** Remet le formulaire à zéro à chaque ouverture. */
function useReset(open: boolean, reset: () => void) {
  useEffect(() => {
    if (open) reset()
    // Seule l'ouverture compte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
}

/**
 * Signaler un joueur depuis le résultat d'un duel (`POST /api/profiles/{id}/reports`, motifs `UserReportReason`, le duel
 * en contexte). Bloquer n'existe pas encore côté BFF (V1.1) : depuis la fiche joueur, l'offre de blocage passe par le mock
 * `features/social/lib/block-mocks.ts` ; ailleurs, seulement « Fermer ».
 */
export function ReportPlayerSheet({
  open,
  onClose,
  userId,
  name,
  gameId,
  subtitle,
  onBlock,
}: {
  open: boolean
  onClose: () => void
  userId: string
  name: string
  /** Duel de contexte, absent depuis une fiche joueur. */
  gameId?: string
  subtitle?: string
  /** Proposé après l'envoi (fiche joueur) : ferme la feuille puis ouvre la confirmation de blocage. */
  onBlock?: () => void
}) {
  const [reasons, setReasons] = useState<UserReportReason[]>([])
  // « Bloquer » : la confirmation (un `Modal`) s'ouvre une fois la feuille retirée, pas pendant sa fermeture.
  const blockAfterClose = useRef(false)
  const [comment, setComment] = useState('')
  const [sent, setSent] = useState(false)
  useReset(open, () => {
    setReasons([])
    setComment('')
    setSent(false)
  })
  const report = useMutation({
    mutationFn: () =>
      api.post<unknown>(ENDPOINTS.reports.player(userId), {
        reasons,
        comment: comment.trim() || undefined,
        gameId: gameId || undefined,
      }),
    onSuccess: () => setSent(true),
    onError: () => toast.error("Le signalement n'a pas pu être envoyé", { description: 'Vérifie ta connexion, puis réessaie.' }),
  })
  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      onDismissed={() => {
        if (!blockAfterClose.current) return
        blockAfterClose.current = false
        onBlock?.()
      }}
      title={sent ? 'Signalement envoyé' : `Signaler ${name}`}
      subtitle={sent ? undefined : subtitle}
      footer={
        sent ? (
          onBlock ? (
            <View style={{ gap: tokens.space[3] }}>
              <Button
                full
                variant="tinted"
                tone="destructive"
                onPress={() => {
                  blockAfterClose.current = true
                  onClose()
                }}
              >
                {`Bloquer ${name}`}
              </Button>
              <Button full variant="plain" tone="neutral" onPress={onClose}>
                Fermer
              </Button>
            </View>
          ) : (
            <Button full variant="gray" tone="neutral" onPress={onClose}>
              Fermer
            </Button>
          )
        ) : (
          <Button full disabled={reasons.length === 0} loading={report.isPending} onPress={() => report.mutate()}>
            Envoyer le signalement
          </Button>
        )
      }
    >
      {sent ? (
        <Text variant="callout" color="muted" align="center">
          {onBlock ? "Merci. Notre équipe va l'examiner. Tu peux aussi bloquer ce joueur." : "Merci. Notre équipe va l'examiner."}
        </Text>
      ) : (
        <View style={{ gap: tokens.space[4] }}>
          <Reasons items={PLAYER_REASONS} value={reasons} onChange={setReasons} />
          <Field
            label="Précisions"
            placeholder="Facultatif · ce qui s'est passé"
            multiline
            value={comment}
            maxLength={MAX_COMMENT}
            counter={`${comment.length} / ${MAX_COMMENT}`}
            onChangeText={setComment}
          />
          <Text variant="caption" color="muted" align="center">
            {name} ne saura pas qui l'a signalé.
          </Text>
        </View>
      )}
    </MobileSheet>
  )
}

/**
 * Signaler la question d'une manche (`POST /api/questions/{id}/reports`), empilé sur Détails du duel. Plusieurs motifs ;
 * « L'image » seulement si la question en a une.
 */
export function ReportQuestionSheet({
  open,
  onClose,
  questionId,
  gameId,
  hasImage,
  subtitle,
  onSent,
}: {
  open: boolean
  onClose: () => void
  questionId: string | null
  gameId: string
  hasImage: boolean
  subtitle: string
  onSent: () => void
}) {
  const [reasons, setReasons] = useState<QuestionReportReason[]>([])
  const [comment, setComment] = useState('')
  const [sent, setSent] = useState(false)
  useReset(open, () => {
    setReasons([])
    setComment('')
    setSent(false)
  })
  const report = useMutation({
    mutationFn: () =>
      api.post<unknown>(ENDPOINTS.reports.question(questionId ?? ''), { gameId, reasons, comment: comment.trim() || undefined, language: 'fr' }),
    onSuccess: () => {
      setSent(true)
      onSent()
    },
    onError: () => toast.error("Le signalement n'a pas pu être envoyé", { description: 'Vérifie ta connexion, puis réessaie.' }),
  })
  const items = QUESTION_REASONS.filter((item) => hasImage || item.value !== 'IMAGE')
  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      title={sent ? 'Signalement envoyé' : 'Signaler la question'}
      subtitle={sent ? undefined : subtitle}
      footer={
        sent ? (
          <Button full variant="gray" tone="neutral" onPress={onClose}>
            Fermer
          </Button>
        ) : (
          <Button full disabled={reasons.length === 0 || !questionId} loading={report.isPending} onPress={() => report.mutate()}>
            Envoyer le signalement
          </Button>
        )
      }
    >
      {sent ? (
        <Text variant="callout" color="muted" align="center">
          Merci. Le créateur du sujet et notre équipe vont la vérifier.
        </Text>
      ) : (
        <View style={{ gap: tokens.space[4] }}>
          <Text variant="callout" color="muted" align="center">
            Aide-nous à corriger le contenu. Le créateur du sujet ne voit pas ton identité.
          </Text>
          <Reasons items={items} value={reasons} onChange={setReasons} />
          <Field
            label="Précisions"
            placeholder="Facultatif"
            multiline
            value={comment}
            maxLength={MAX_COMMENT}
            counter={`${comment.length} / ${MAX_COMMENT}`}
            onChangeText={setComment}
          />
        </View>
      )}
    </MobileSheet>
  )
}
