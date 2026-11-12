import { dicebearSvg } from '@/shared/avatar/render'
import { BACKGROUND_COLORS } from '@/shared/avatar/styles/palettes'

/** Rendu des avatars (options compactes partagées avec `joutio-web`, graine = `userId`). */

export type AvatarConfig = { style?: string } & Record<string, string | undefined>

export { BACKGROUND_COLORS }


const cache = new Map<string, string>()
const CACHE_LIMIT = 600

export function parseAvatarConfig(json: string | null | undefined): AvatarConfig | null {
  if (!json) return null
  try {
    const parsed: unknown = JSON.parse(json)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as AvatarConfig) : null
  } catch {
    return null
  }
}


/**
 * SVG d'un avatar stylé ; `null` sans options ou avec le style `base` : l'avatar s'affiche en initiales, celles du
 * Profil, sans aucun réglage (`design/specs/components/primitives.md` § Identité d'un joueur, 2026-11-12).
 */
export function avatarSvg(json: string | null | undefined, seed: string): string | null {
  const config = parseAvatarConfig(json)
  if (!config || config.style === 'base') return null
  const key = `${seed}:${json}`
  const cached = cache.get(key)
  if (cached) return cached
  const svg = dicebearSvg(config as never, seed)
  if (cache.size >= CACHE_LIMIT) cache.clear()
  cache.set(key, svg)
  return svg
}

/** Joueur porteur de ses options d'avatar (`UserRefView`, `LeaderboardEntryView`, `PlayerCardView`…). */
export interface AvatarOwner {
  userId: string
  avatarOptions: string | null
}

/** Avatar d'un joueur à partir de **ses** options (graine = son `userId`) ; `undefined` : initiales. */
export function userAvatar(user: AvatarOwner | null | undefined): string | undefined {
  return user ? (avatarSvg(user.avatarOptions, user.userId) ?? undefined) : undefined
}
