import type { AvatarOptions, AvatarStyleDefinition, AvatarStyleId } from './types'

export type { AvatarOptions, AvatarStyleDefinition, AvatarStyleGroup, AvatarStyleId, AvatarStyleSection } from './types'
export { humanizeVariant, NONE_LABEL_KEY } from './labels'

export const AVATAR_STYLE_IDS: AvatarStyleId[] = ['micah', 'lorelei', 'notionists']

/** Micah reste le style par défaut (options persistées sans `style`), comme sur le web. */
export const DEFAULT_AVATAR_STYLE: AvatarStyleId = 'micah'

/**
 * Définitions chargées à la demande, en synchrone (Metro les embarque) : les JSON de Lorelei (~115 Ko) et Notionists
 * (~364 Ko) ne sont évalués qu'au premier avatar de ce style.
 */
const LOADERS: Record<AvatarStyleId, () => AvatarStyleDefinition> = {
  micah: () => (require('./micah') as typeof import('./micah')).micahStyle,
  lorelei: () => (require('./lorelei') as typeof import('./lorelei')).loreleiStyle,
  notionists: () => (require('./notionists') as typeof import('./notionists')).notionistsStyle,
}
const loaded = new Map<AvatarStyleId, AvatarStyleDefinition>()

export function isAvatarStyleId(value: unknown): value is AvatarStyleId {
  return typeof value === 'string' && (AVATAR_STYLE_IDS as readonly string[]).includes(value)
}

export const resolveAvatarStyleId = (id: string | undefined): AvatarStyleId => (isAvatarStyleId(id) ? id : DEFAULT_AVATAR_STYLE)

export function getAvatarStyle(id: string | undefined): AvatarStyleDefinition {
  const styleId = resolveAvatarStyleId(id)
  const existing = loaded.get(styleId)
  if (existing) return existing
  const definition = LOADERS[styleId]()
  loaded.set(styleId, definition)
  return definition
}

/** Preset de « Réinitialiser » d'un style, `style` compris. */
export function defaultOptionsFor(id: AvatarStyleId): AvatarOptions {
  return { ...getAvatarStyle(id).defaults, style: id }
}
