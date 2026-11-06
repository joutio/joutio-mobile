import { dicebearSvg } from '@/shared/avatar/render'
import { BACKGROUND_COLORS } from '@/shared/avatar/styles/palettes'

/** Rendu des avatars (options compactes partagées avec `joutio-web`, graine = `userId`). */

export type AvatarConfig = { style?: string } & Record<string, string | undefined>

export { BACKGROUND_COLORS }

/** Silhouette de l'avatar de base (256 × 256), comme le lab et le web. */
const BASE_ICON = 'M128 136a48 48 0 1 0-48-48 48 48 0 0 0 48 48Zm0 24c-44 0-82 22-92 56a100 100 0 0 0 184 0c-10-34-48-56-92-56Z'

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

const baseSvg = (background: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" fill="${background}"/><path d="${BASE_ICON}" fill="#3f3f46"/></svg>`

/** SVG d'un avatar configuré ; `null` sans options (l'avatar s'affiche en initiales). */
export function avatarSvg(json: string | null | undefined, seed: string): string | null {
  const config = parseAvatarConfig(json)
  if (!config) return null
  const key = `${seed}:${json}`
  const cached = cache.get(key)
  if (cached) return cached
  const svg = config.style === 'base' ? baseSvg(config.backgroundColor ?? BACKGROUND_COLORS[0] ?? '#e4e4e7') : dicebearSvg(config as never, seed)
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
