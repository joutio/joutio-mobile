import { useQueryClient } from '@tanstack/react-query'
import { settleRoom } from '../lib/play-cache'
import { useEffect } from 'react'
import { topicName } from '@/shared/utils/topic-name'
import { useRoom } from '../hooks/use-play'
import type { OngoingGame } from '../hooks/play-session'

interface RoomWatchProps {
  roomId: string
  onGame: (game: OngoingGame) => void
  onDone: (id: string) => void
}
export function RoomWatch({ roomId, onGame, onDone }: RoomWatchProps) {
  const client = useQueryClient()
  const { room, view, status } = useRoom(roomId)
  useEffect(() => {
    if (status?.loaded && room && room.status !== 'WAITING_PLAYERS') settleRoom(client, roomId, room.status)
  }, [client, roomId, room?.status, status?.loaded])
  const gameId = room?.gameId ?? view.data?.gameId
  useEffect(() => {
    if (gameId && view.data) {
      const { topic, updatedAt } = view.data
      onGame({ gameId, topicId: topic.topicId, topicName: topicName(topic.names), category: topic.category ?? '', createdAt: updatedAt })
      onDone(roomId)
    } else if (status?.terminalError || (room && ['CANCELLED', 'EXPIRED', 'FAILED'].includes(room.status))) onDone(roomId)
  }, [gameId, room, view.data, status?.terminalError, roomId, onGame, onDone])
  return null
}
