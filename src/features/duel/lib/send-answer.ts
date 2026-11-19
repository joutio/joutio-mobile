import type { ApiError } from '@joutio/client/api-types'

/* Repris à l'identique entre joutio-web et joutio-mobile (features/duel/lib/send-answer.ts) : garder aligné. */

/** Durée d'une tentative d'envoi de réponse (ms) : au-delà, la requête est abandonnée puis renvoyée. */
export const ANSWER_ATTEMPT_TIMEOUT_MS = 2500

/** Pause entre deux tentatives (ms). */
export const ANSWER_RETRY_DELAY_MS = 300

/** Échec passager : réseau coupé, délai dépassé ou erreur serveur. Un refus métier (4xx) ne se renvoie pas. */
export function isTransientAnswerFailure(error: unknown): boolean {
  const status = (error as Partial<ApiError> | undefined)?.statusCode
  return status == null || status === 408 || status >= 500
}

export interface SendAnswerOptions {
  /** Une tentative ; le signal l'abandonne au bout de `ANSWER_ATTEMPT_TIMEOUT_MS`. */
  send: (signal: AbortSignal) => Promise<void>
  /** Instant serveur courant (ms epoch). */
  serverNow: () => number
  /** Fin de la fenêtre de réponse (ms epoch) : plus de renvoi au-delà. `null` : une seule tentative. */
  deadline: number | null
  attemptTimeoutMs?: number
  retryDelayMs?: number
}

/**
 * Envoie une réponse en la renvoyant tant que la manche est ouverte : le serveur l'enregistre une seule fois (renvoi
 * sans effet) et refuse une autre manche, un renvoi est donc toujours sûr. Rejette sur un refus métier ou à
 * l'échéance (connexion limitée, 2026-11-19).
 */
export async function sendAnswer({
  send,
  serverNow,
  deadline,
  attemptTimeoutMs = ANSWER_ATTEMPT_TIMEOUT_MS,
  retryDelayMs = ANSWER_RETRY_DELAY_MS,
}: SendAnswerOptions): Promise<void> {
  for (;;) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), attemptTimeoutMs)
    try {
      await send(controller.signal)
      return
    } catch (error) {
      if (!isTransientAnswerFailure(error) || deadline == null || serverNow() + retryDelayMs >= deadline) throw error
    } finally {
      clearTimeout(timer)
    }
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
  }
}
