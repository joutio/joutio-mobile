import { router, useLocalSearchParams } from 'expo-router'
import { ForceDark } from '@/design-system'
import { DuelChat } from '@/features/duel/components/duel-chat'

export interface ResultChatRouteParams {
  gameId: string
  opponentName?: string
  recap?: string
  [key: string]: string | undefined
}

/**
 * Chat d'après-duel, **écran poussé** au-dessus du résultat (`resultat.md` § 6) : le retour système ferme le chat
 * et retrouve le résultat intact, il ne quitte pas la partie.
 */
export default function ResultChatScreen() {
  const params = useLocalSearchParams<ResultChatRouteParams>()
  return (
    <ForceDark>
      <DuelChat gameId={params.gameId} opponentName={params.opponentName ?? 'Adversaire'} recap={params.recap ?? 'Duel terminé'} onBack={() => router.back()} />
    </ForceDark>
  )
}
