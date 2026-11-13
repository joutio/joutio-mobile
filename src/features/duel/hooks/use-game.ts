import { activityDate, streakDayUnlocked } from '@joutio/client-domain/profile'
import { profileService } from '@/features/profile/lib/profile-service'
import { queryKeys } from '@/lib/query-keys'
import type { MeView, PlayerProfileView, TopicOverviewView } from '@joutio/client-domain/api-types'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { useEffect, useState, useRef } from 'react'
import { ENDPOINTS } from '@/lib/endpoints'
import { readServerNow } from '@/lib/realtime/server-clock'
import { useNotificationStream } from '@/lib/realtime/use-notification-stream'
import { emptyGame, applyGameNotification } from '@joutio/client-domain/game'
import type { GameState } from '@joutio/client-domain/game'
import type { GameNotification } from '@joutio/client-domain/game'
import { gameService } from '../lib/game-service'

/** Partie repliée de ses notifications : historique REST à l'ouverture (et à chaque reconnexion), puis STOMP. */
export function useGameStream(gameId: string) {
  return useNotificationStream<GameNotification, GameState>(
    gameId
      ? {
          aggregateId: gameId,
          topic: ENDPOINTS.games.topic(gameId),
          initial: emptyGame,
          load: gameService.notifications,
          apply: applyGameNotification,
          // Partie fraîchement créée : la projection peut avoir quelques centaines de ms de retard.
          notFoundGraceMs: 5_000,
        }
      : null,
  )
}

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

/** Bilan autoritaire d'un duel terminé ; la récompense arrive après la projection (quelques secondes). */
export function useGameResult(gameId: string, enabled: boolean, waitForReward = true) {
  const client = useQueryClient()
  const applied = useRef<string | null>(null)
  const result = useQuery({
    queryKey: ['games', gameId, 'result'],
    queryFn: () => gameService.result(gameId),
    enabled,
    retry: 3,
    // La récompense est calculée après la fin : on relit tant qu'elle n'est pas là, puis plus jamais. Une partie
    // consultée depuis l'historique est immuable : inutile de sonder une récompense qui n'arrivera plus.
    refetchInterval: (query) => (waitForReward && query.state.data && query.state.data.reward === null && !query.state.data.botGame ? 1_500 : false),
  })
  useEffect(() => {
    const data = result.data
    if (!waitForReward || !data || (!data.botGame && !data.reward) || applied.current === gameId) return
    applied.current = gameId
    const me = client.getQueryData<MeView>(queryKeys.me())
    if (me) {
      client.setQueryData<MeView>(queryKeys.me(), { ...me, progression: data.progression })
      client.setQueryData<PlayerProfileView>(queryKeys.profiles.profile(me.userId), (profile) =>
        profile ? { ...profile, progression: data.progression } : profile,
      )
    }
    client.setQueryData<TopicOverviewView>(queryKeys.topic.overview(data.topic.topicId), (view) =>
      view?.myProgress
        ? {
            ...view,
            myProgress: {
              ...view.myProgress,
              xp: data.topicMastery.xp,
              tierProgressPercent: data.topicMastery.tierProgressPercent,
              tierRemainingXp: data.topicMastery.tierRemainingXp,
            },
          }
        : view,
    )
    // Une partie terminée est un résultat calculé par le serveur, pas une mutation du joueur : les vues qu'elle touche
    // se relisent une fois le bilan arrivé (écran actif tout de suite, les autres à leur prochain affichage). Sans ça,
    // l'historique, les parties du sujet, le classement, la série et les sujets joués restaient figés jusqu'au tiré.
    if (me) void client.invalidateQueries({ queryKey: ['profiles', me.userId] })
    void client.invalidateQueries({ queryKey: queryKeys.topic.all(data.topic.topicId) })
    void client.invalidateQueries({ queryKey: queryKeys.home() })
    void client.invalidateQueries({ queryKey: ['active-games'] })
    void client.invalidateQueries({ queryKey: queryKeys.rooms() })
  }, [client, gameId, result.data, waitForReward])
  return result
}

/**
 * Partie passée, repliée depuis l'historique REST des notifications (aucun STOMP) : la revue des manches,
 * les séries et le bilan n'ont plus besoin du flux temps réel.
 */
export function useGameHistory(gameId: string) {
  return useQuery({
    queryKey: ['games', gameId, 'notifications'],
    queryFn: () => gameService.notifications(gameId),
    enabled: Boolean(gameId),
    staleTime: Infinity,
    select: (envelopes) =>
      [...envelopes]
        .sort((left, right) => left.sequenceNumber - right.sequenceNumber)
        .reduce((state, envelope) => applyGameNotification(state, envelope.payload), emptyGame(gameId)),
  })
}

/**
 * Précharge les images des questions dès la création de la partie (`GAME_CREATED` les donne dans l'ordre des
 * manches), pendant le face-à-face : une connexion faible ne coûte pas de temps de réponse. La première d'abord (elle
 * arrive en premier), puis les autres ensemble ; un échec est retenté une fois.
 */
export function usePrefetchQuestionImages(urls: readonly string[]) {
  const key = urls.join('|')
  useEffect(() => {
    const unique = [...new Set(urls.filter(Boolean))]
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
    // Les URL ne changent qu'avec la partie.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}

/**
 * Nouveau jour de série ouvert par cette partie (2026-11-13, `resultat.md` § 1) : l'activité est relue **une fois** pour
 * la partie (jamais le cache du profil, qui peut dater d'avant le duel), puis la règle partagée tranche. Jamais pour un
 * entraînement contre le bot, qui ne compte pas dans la série.
 */
export function useStreakUnlock(gameId: string, userId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['games', gameId, 'streak-unlock'],
    queryFn: async () => streakDayUnlocked(await profileService.activity(userId ?? ''), activityDate(readServerNow())),
    enabled: enabled && Boolean(userId),
    staleTime: Infinity,
    retry: 1,
  })
}
