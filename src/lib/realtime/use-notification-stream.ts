import { useEffect, useState, useSyncExternalStore } from 'react'
import { NotificationStream, type NotificationStreamOptions } from './notification-stream'

/**
 * Monte un `NotificationStream` le temps de vie du composant : état replié de l'agrégat (salle, ticket, partie) et
 * statut du flux. `aggregateId` vide : aucun flux.
 */
export function useNotificationStream<T, S>(options: NotificationStreamOptions<T, S> | null) {
  const key = options ? `${options.topic}` : ''
  const [stream, setStream] = useState<NotificationStream<T, S> | null>(null)

  useEffect(() => {
    if (!options) {
      setStream(null)
      return
    }
    const next = new NotificationStream(options)
    setStream(next)
    next.start()
    return () => next.stop()
    // Un flux par sujet : les options (fonctions) changent à chaque rendu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const noop = () => () => undefined
  const state = useSyncExternalStore(stream?.subscribe ?? noop, () => stream?.getSnapshot() ?? null)
  const status = useSyncExternalStore(stream?.subscribe ?? noop, () => stream?.getStatus() ?? null)
  return { state, status, refresh: () => stream?.refresh() }
}
