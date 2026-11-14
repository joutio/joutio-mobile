/** Raisons de fin de session, affichées en plein écran. Fermées : jamais de message technique brut. */
export type SessionEndReason = 'expired' | 'suspended' | 'unknownUser'

/** Suspension annoncée par le serveur : fin (ISO, absente : définitive) et code du motif (jamais la note de modération). */
export interface SuspensionInfo {
  until?: string
  reason?: string
}
