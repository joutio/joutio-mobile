import { activityDate, streakDayUnlocked, useActivity } from '@joutio/client/profile'
import { Image } from 'expo-image'
import { useEffect, useState } from 'react'
import { readServerNow } from '@/lib/realtime/server-clock'

/**
 * Instant serveur rafraîchi à `intervalMs` : horloge **locale** de l'écran (chrono, scènes), corrigée du décalage
 * serveur. Aucun appel réseau : seul le temps qui passe est relu.
 */
export function useServerNow(intervalMs = 100) {
  const [now, setNow] = useState(readServerNow)
  useEffect(() => {
    const timer = setInterval(() => setNow(readServerNow()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}

/**
 * Précharge les images des questions dès la création de la partie (`GAME_CREATED` les donne dans l'ordre des
 * manches), pendant le face-à-face : une connexion faible ne coûte pas de temps de réponse. La première d'abord (elle
 * arrive en premier), puis les autres ensemble ; un échec est retenté une fois.
 */
export function usePrefetchQuestionImages(urls: readonly string[]) {
  const key = urls.join('|')
  useEffect(() => {
    const unique = [...new Set(key.split('|').filter(Boolean))]
    if (unique.length === 0) return
    let cancelled = false
    const prefetch = async (batch: string[]) => {
      if (batch.length === 0 || cancelled) return
      const ok = await Image.prefetch(batch, 'memory-disk').catch(() => false)
      if (!ok && !cancelled) await Image.prefetch(batch, 'memory-disk').catch(() => false)
    }
    const [first, ...rest] = unique
    void prefetch(first ? [first] : []).then(() => prefetch(rest))
    return () => {
      cancelled = true
    }
  }, [key])
}

/**
 * Nouveau jour de série ouvert par cette partie (2026-11-13, `resultat.md` § 1) : l'activité est relue **une fois**
 * pour la partie (le cache du profil peut dater d'avant le duel), puis la règle partagée tranche. Jamais pour un
 * entraînement contre le bot, qui ne compte pas dans la série.
 */
export function useStreakUnlock(userId: string | undefined, enabled: boolean) {
  const activity = useActivity(enabled ? userId : undefined)
  const { refetch } = activity
  useEffect(() => {
    if (enabled && userId) void refetch()
  }, [enabled, userId, refetch])
  const fetched = activity.isFetchedAfterMount && !activity.isFetching
  return {
    isFetched: fetched || activity.isError,
    data: fetched && activity.data ? streakDayUnlocked(activity.data, activityDate(readServerNow())) : undefined,
  }
}
