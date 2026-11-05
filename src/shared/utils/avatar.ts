import { Avatar, Style, type StyleDefinition } from '@dicebear/core'

/** Rendu DiceBear des avatars (options compactes partagées avec `joutio-web`, graine = `userId`). */

export type DiceBearStyleId = 'micah' | 'lorelei' | 'notionists'

export type AvatarConfig = { style?: string } & Record<string, string | undefined>

/** Nuancier de fond (Micah), repris de `joutio-web`. */
export const BACKGROUND_COLORS = ['#e4e4e7', '#dbeafe', '#dcfce7', '#fef9c3', '#fae8ff', '#ffe4e6', '#e0f2fe', '#f3f4f6', '#ffffff'] as const

/** Silhouette de l'avatar de base (256 × 256), comme le lab. */
const BASE_ICON = 'M128 136a48 48 0 1 0-48-48 48 48 0 0 0 48 48Zm0 24c-44 0-82 22-92 56a100 100 0 0 0 184 0c-10-34-48-56-92-56Z'

/** Définitions chargées à la demande : les JSON pèsent jusqu'à 364 Ko. */
const LOADERS: Record<DiceBearStyleId, () => unknown> = {
  micah: () => require('@dicebear/styles/micah.json'),
  lorelei: () => require('@dicebear/styles/lorelei.json'),
  notionists: () => require('@dicebear/styles/notionists.json'),
}

const styles = new Map<DiceBearStyleId, Style>()
const cache = new Map<string, string>()
const CACHE_LIMIT = 300

function styleDefinition(id: DiceBearStyleId): Style {
  const existing = styles.get(id)
  if (existing) return existing
  const style = new Style(LOADERS[id]() as StyleDefinition)
  styles.set(id, style)
  return style
}

const resolveStyle = (id: string | undefined): DiceBearStyleId => (id === 'lorelei' || id === 'notionists' ? id : 'micah')

export function parseAvatarConfig(json: string | null | undefined): AvatarConfig | null {
  if (!json) return null
  try {
    const parsed: unknown = JSON.parse(json)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as AvatarConfig) : null
  } catch {
    return null
  }
}

/** Options compactes persistées vers options DiceBear. */
function dicebearOptions(config: AvatarConfig, styleId: DiceBearStyleId) {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(config)) {
    if (key === 'style' || !value) continue
    if (key.endsWith('Color')) {
      result[key] = [value]
    } else if (value === 'none') {
      if (styleId === 'lorelei' && key === 'hair') result.hairColor = ['#00000000']
      else result[`${key}Probability`] = 0
    } else {
      result[`${key}Variant`] = [value]
      result[`${key}Probability`] = 100
    }
  }
  if (styleId === 'lorelei' && config.hairColor) result.beardColor = [config.hairColor]
  return result
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
  const svg =
    config.style === 'base'
      ? baseSvg(config.backgroundColor ?? BACKGROUND_COLORS[0])
      : (() => {
          const styleId = resolveStyle(config.style)
          return new Avatar(styleDefinition(styleId), { seed, ...dicebearOptions(config, styleId) }).toString()
        })()
  if (cache.size >= CACHE_LIMIT) cache.clear()
  cache.set(key, svg)
  return svg
}
