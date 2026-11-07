import { useQuery } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AppState } from 'react-native'
import { useConnectionStore } from '@/lib/ws'
import { usePersonalNotifications } from '@/lib/realtime/personal-notifications'
import { challengesService } from '@/features/challenges/lib/challenges-service'
import { gameService } from '@/features/duel/lib/game-service'
import { topicName } from '@/shared/utils/topic-name'
import { RoomWatch } from '../components/room-watch'
import { GameWatch } from '../components/game-watch'

export interface OngoingGame {
  gameId: string
  topicId: string
  topicName: string
  category: string
  createdAt: string
}

interface PlaySession {
  games: OngoingGame[]
  trackRoom: (roomId: string) => void
}

const Context = createContext<PlaySession>({ games: [], trackRoom: () => undefined })
export const usePlaySession = () => useContext(Context)

/** Scoped to the signed-in player. Room/game streams survive navigation, never poll. */
export function PlaySessionProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [roomIds, setRoomIds] = useState<string[]>([])
  const [games, setGames] = useState<OngoingGame[]>([])
  const finished = useRef(new Set<string>())
  const retiredRooms = useRef(new Set<string>())
  const connection = useConnectionStore((state) => state.status)
  const active = useQuery({ queryKey: ['active-games', userId], queryFn: gameService.active, enabled: Boolean(userId) })
  const rooms = useQuery({ queryKey: ['tracked-rooms', userId], queryFn: challengesService.rooms, enabled: Boolean(userId) })
  const refresh = useCallback(() => {
    if (!userId) return
    void active.refetch()
    void rooms.refetch()
  }, [userId, active.refetch, rooms.refetch])
  useEffect(() => {
    if (connection === 'online') refresh()
  }, [connection, refresh])
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh()
    })
    return () => subscription.remove()
  }, [refresh])
  usePersonalNotifications(userId, (notification, deleted) => {
    if (!deleted && notification.type === 'ROOM_ACCEPTED') refresh()
  })

  const trackRoom = useCallback((id: string) => {
    if (!retiredRooms.current.has(id)) setRoomIds((ids) => (ids.includes(id) ? ids : [...ids, id]))
  }, [])
  const retireRoom = useCallback((id: string) => {
    retiredRooms.current.add(id)
    setRoomIds((ids) => ids.filter((item) => item !== id))
  }, [])
  const rememberGame = useCallback((game: OngoingGame) => {
    if (finished.current.has(game.gameId)) return
    setGames((items) => (items.some((item) => item.gameId === game.gameId) ? items : [...items, game]))
  }, [])
  const finishGame = useCallback((id: string) => {
    finished.current.add(id)
    setGames((items) => items.filter((item) => item.gameId !== id))
  }, [])

  useEffect(() => {
    for (const game of active.data ?? [])
      rememberGame({
        gameId: game.gameId,
        topicId: game.topic.topicId,
        topicName: topicName(game.topic.names),
        category: game.topic.category ?? '',
        createdAt: game.createdAt,
      })
  }, [active.data, rememberGame])
  useEffect(() => {
    for (const room of rooms.data ?? []) {
      if (!['CANCELLED', 'EXPIRED', 'FAILED'].includes(room.status)) trackRoom(room.roomId)
    }
  }, [rooms.data, trackRoom])
  const value = useMemo(() => ({ games: [...games].sort((a, b) => a.createdAt.localeCompare(b.createdAt)), trackRoom }), [games, trackRoom])
  return (
    <Context.Provider value={value}>
      {roomIds.map((id) => (
        <RoomWatch key={id} roomId={id} onGame={rememberGame} onDone={retireRoom} />
      ))}
      {games.map((game) => (
        <GameWatch key={game.gameId} gameId={game.gameId} onDone={finishGame} />
      ))}
      {children}
    </Context.Provider>
  )
}
