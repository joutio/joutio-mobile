import { useEffect } from 'react'
import { useGameStream } from '@/features/duel/hooks/use-game'

export function GameWatch({ gameId, onDone }: { gameId: string; onDone: (id: string) => void }) {
  const { state, status } = useGameStream(gameId)
  useEffect(() => {
    if (status?.terminalError || (status?.loaded && state && state.status !== 'IN_PROGRESS')) onDone(gameId)
  }, [gameId, onDone, state, status?.loaded, status?.terminalError])
  return null
}
