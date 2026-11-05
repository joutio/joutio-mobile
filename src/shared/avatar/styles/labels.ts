/* Repris de joutio-web (shared/avatar/styles) : garder aligné. */
import type { TranslationKey } from './types'

/** Clé de la tuile « aucun » (attribut retiré). */
export const NONE_LABEL_KEY: TranslationKey = 'avatar.none'

/** Onglet « Style » (sélecteur de style, géré par la page). */
export const STYLE_GROUP_ID = 'style'

/** Variantes numérotées (`numberedVariants("variant", 3)` → variant01…variant03). */
export function numberedVariants(prefix: string, count: number): readonly string[] {
  return Array.from({ length: count }, (_, index) => `${prefix}${String(index + 1).padStart(2, '0')}`)
}

type VariantStyleId = 'lorelei' | 'notionists'

/**
 * Clés de libellé descriptif des variantes d'une section
 * (`avatar.variants.<style>.<field>.<variant>`).
 *
 * Le catalogue FR/EN est la source de vérité : le test de complétude
 * (`avatar-labels.test.ts`) vérifie que chaque clé existe dans les deux langues.
 */
export function variantLabelKeys(style: VariantStyleId, field: string, variants: readonly string[]): Record<string, TranslationKey> {
  return Object.fromEntries(variants.map((variant) => [variant, `avatar.variants.${style}.${field}.${variant}`])) as Record<string, TranslationKey>
}

/** Clé lisible pour les variantes génériques (`variant03` → `avatar.humanized.variant`, 3). */
export interface HumanizedVariant {
  key: TranslationKey
  number: number
}

export function humanizeVariant(variant: string): HumanizedVariant | null {
  const match = /^(variant|happy|sad)(\d+)$/.exec(variant)
  if (!match) return null
  const [, prefix, digits] = match
  const key = prefix === 'happy' ? 'avatar.humanized.happy' : prefix === 'sad' ? 'avatar.humanized.sad' : 'avatar.humanized.variant'
  return { key, number: Number(digits) }
}
