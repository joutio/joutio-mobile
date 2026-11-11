import { useRef } from 'react'
import { useChallengePlayer } from '@/features/play/hooks/use-play'
import { TopicPickerSheet } from '@/features/topics/components/topic-picker-sheet'
import type { PlayerCardView } from '@joutio/client-domain/api-types'

/**
 * « Défier <joueur> » (`fiche-joueur.md` § 2), partagée par Social et la Fiche joueur : le choix d'un sujet envoie le
 * défi ; le toast « Défi envoyé » vient de `useChallengePlayer`.
 */
export function ChallengePlayerSheet({ player, onClose, onSent }: { player: PlayerCardView | null; onClose: () => void; onSent?: () => void }) {
  // Le joueur reste affiché pendant la fermeture : le titre ne disparaît pas avant la feuille.
  const shown = useRef(player)
  if (player) shown.current = player
  const target = shown.current
  const challenge = useChallengePlayer()
  return (
    <TopicPickerSheet
      open={Boolean(player)}
      onClose={onClose}
      title={target ? `Défier ${target.pseudonym}` : 'Défier'}
      busy={challenge.isPending}
      onPick={(topic) => {
        if (!target || challenge.isPending) return
        challenge.mutate(
          { topic, opponent: { userId: target.userId, pseudonym: target.pseudonym } },
          {
            onSuccess: () => {
              onSent?.()
              onClose()
            },
          },
        )
      }}
    />
  )
}
