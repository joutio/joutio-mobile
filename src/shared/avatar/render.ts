import { Avatar, Style, type StyleDefinition, type StyleOptions } from '@dicebear/core'
import { getAvatarStyle, resolveAvatarStyleId, type AvatarOptions, type AvatarStyleDefinition, type AvatarStyleId } from './styles'

/* Conversion et tirage repris de joutio-web (`shared/avatar/avatar.ts`) : mêmes options, même rendu. */

const instances = new Map<AvatarStyleId, Style>()
function dicebearStyle(definition: AvatarStyleDefinition): Style {
  const existing = instances.get(definition.id)
  if (existing) return existing
  const instance = new Style(definition.definition as StyleDefinition)
  instances.set(definition.id, instance)
  return instance
}

function variantOptions(field: string, value: string | undefined, optional: boolean): Record<string, unknown> {
  if (optional && value === 'none') return { [`${field}Probability`]: 0 }
  if (!value) return {}
  return { [`${field}Variant`]: [value], [`${field}Probability`]: 100 }
}

const styleBackground = (definition: AvatarStyleDefinition) => definition.defaults.backgroundColor || '#ffffff'

/** Options compactes persistées → options DiceBear. */
export function toDicebearOptions(options: AvatarOptions): StyleOptions {
  const definition = getAvatarStyle(options.style)
  const result: Record<string, unknown> = { backgroundColor: [options.backgroundColor || styleBackground(definition)] }
  for (const field of definition.variantFields) {
    const transparentNone = definition.transparentNoneFields?.[field]
    if (transparentNone && options[field] === 'none') {
      result[`${field}Variant`] = [transparentNone.variant]
      result[`${field}Probability`] = 100
      continue
    }
    Object.assign(result, variantOptions(field, options[field], definition.optionalFields.includes(field)))
  }
  for (const field of definition.colorFields) {
    const value = options[field]
    if (value) result[field] = [value]
  }
  for (const [field, derived] of Object.entries(definition.derivedColors ?? {})) {
    result[field] = [options[derived.from] || definition.defaults[derived.from] || derived.fallback]
  }
  for (const [field, transparentNone] of Object.entries(definition.transparentNoneFields ?? {})) {
    if (options[field] !== 'none') continue
    result[transparentNone.color] = ['#00000000']
  }
  return result as StyleOptions
}

/** SVG d'un avatar DiceBear. */
export function dicebearSvg(options: AvatarOptions, seed: string): string {
  const definition = getAvatarStyle(options.style)
  return new Avatar(dicebearStyle(definition), { seed, ...toDicebearOptions(options) }).toString()
}

const pick = <T>(list: readonly T[], random: () => number): T => list[Math.floor(random() * list.length)] as T

/** Options aléatoires d'un style (bouton « Aléatoire »). */
export function randomAvatarOptions(styleId: AvatarStyleId, random: () => number = Math.random): AvatarOptions {
  const definition = getAvatarStyle(styleId)
  const options: AvatarOptions = { style: resolveAvatarStyleId(styleId) }
  for (const field of definition.variantFields) {
    const variants = definition.variants[field]
    if (!variants || variants.length === 0) continue
    options[field] = definition.optionalFields.includes(field) ? (random() < 0.35 ? pick(variants, random) : 'none') : pick(variants, random)
  }
  for (const field of definition.colorFields) {
    const palette = definition.palettes[field]
    if (palette && palette.length > 0) options[field] = pick(palette, random)
  }
  return options
}
