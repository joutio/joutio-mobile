import { usePlayerIdentity } from '@/features/me'
import { userAvatar } from '@/shared/utils/avatar'
import { usePlayerProfile } from './use-social'

/**
 * Avatar d'un joueur connu seulement par son identifiant (parties : le flux du duel ne porte pas les options) : son
 * profil est lu une fois et partagé par le cache (`['profiles', userId, 'profile']`). Bot ou inconnu : initiales.
 */
export function usePlayerAvatar(userId: string | null | undefined, enabled = true): string | undefined {
  const profile = usePlayerProfile(userId ?? '', enabled && Boolean(userId))
  return profile.data ? userAvatar({ userId: profile.data.userId, avatarOptions: profile.data.avatarOptions }) : undefined
}

/** Joueur Premium connu seulement par son identifiant (même profil en cache que `usePlayerAvatar`). */
export function usePlayerPremium(userId: string | null | undefined, enabled = true): boolean {
  const profile = usePlayerProfile(userId ?? '', enabled && Boolean(userId))
  return usePlayerIdentity().premium(profile.data, userId)
}
