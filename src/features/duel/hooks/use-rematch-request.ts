import { useEffect, useState } from 'react'
import { useCreateChallenge, useRoomStream } from '@joutio/client/rooms'
import { toast } from '@/design-system'
import { useSecondsUntil } from '@/features/play/lib/countdown'
import { router } from '@/shared/navigation/router'
import { t } from '@/lib/i18n'

export type RematchState = 'idle' | 'pending' | 'refused'

/**
 * Revanche depuis le résultat (`docs/api/parties.md`) : `useCreateChallenge` avec la partie d'origine, puis la salle
 * suivie par son flux jusqu'à `WAITING_PLAYERS` (acceptée : elle s'ouvre) ou `DECLINED`/`EXPIRED` (échéance du
 * serveur, aucune minuterie locale). Aucune lecture de confirmation.
 */
export function useRematchRequest({
  opponentId,
  topic,
  gameId,
}: {
  opponentId: string | null
  topic: { topicId: string; name: string; category?: string }
  gameId: string
}) {
  const create = useCreateChallenge()
  const [roomId, setRoomId] = useState<string>()
  const [refused, setRefused] = useState(false)
  const stream = useRoomStream(roomId)
  // Tant que l'historique n'a pas livré `ROOM_CREATED`, la salle repliée n'a pas d'origine : son statut ne dit rien.
  const room = stream.status?.loaded && stream.state?.origin ? stream.state : null
  const status = room?.status
  const seconds = useSecondsUntil(status === 'INVITED' ? room?.expiresAt : null)

  useEffect(() => {
    if (!roomId || !status || status === 'INVITED') return
    setRoomId(undefined)
    if (status === 'DECLINED') {
      setRefused(true)
      toast.info(t('result.rematchRefused'))
    } else if (status === 'EXPIRED') toast.info(t('result.rematchNoAnswer'), { description: t('mobile.rematch.noAnswerText') })
    else if (status === 'WAITING_PLAYERS')
      router.replace({ pathname: '/room/[roomId]', params: { roomId, topicId: topic.topicId, topicName: topic.name, category: topic.category ?? '' } })
  }, [roomId, status, topic.topicId, topic.name, topic.category])

  const state: RematchState = refused ? 'refused' : roomId || create.isPending ? 'pending' : 'idle'
  const send = () => {
    if (state !== 'idle' || !opponentId) return
    create.mutate(
      { topicId: topic.topicId, opponentId, gameId },
      {
        onSuccess: ({ id }) => setRoomId(id),
        onError: () => toast.error(t('result.rematchError'), { description: t('home.errorText') }),
      },
    )
  }
  return { state, seconds, send, sending: create.isPending }
}
