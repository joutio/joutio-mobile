/* Repris de joutio-web (shared/avatar/styles) : garder aligné. */
import type { StyleDefinition } from '@dicebear/core'
export type TranslationKey = string

export type AvatarStyleId = 'micah' | 'lorelei' | 'notionists'

/**
 * Options d'avatar persistées : le style (défaut `micah` si absent) et une valeur
 * par attribut variant/couleur. Le jeu de champs dépend du style
 * (cf. `AvatarStyleDefinition.variantFields` / `colorFields`).
 */
export type AvatarOptions = { style?: AvatarStyleId } & Record<string, string | undefined>

export interface AvatarStyleSection {
  id: string
  labelKey: TranslationKey
  variantField?: string
  variants?: readonly string[]
  /** Clés de traduction par variante (sinon libellé humanisé). */
  labelKeys?: Record<string, TranslationKey>
  allowsNone?: boolean
  colorField?: string
  colors?: readonly string[]
  colorLabelKey?: TranslationKey
}

export interface AvatarStyleGroup {
  id: string
  labelKey: TranslationKey
  sections: AvatarStyleSection[]
}

/**
 * Champ optionnel dont le composant contient la tête : le retirer (`<field>Probability: 0`)
 * effacerait le visage (cas de `hair` chez Lorelei). `none` est donc rendu avec une variante
 * conservée et sa couleur passée en transparent (crâne rasé).
 */
export interface TransparentNoneField {
  /** Variante conservée pour garder la tête. */
  variant: string
  /** Option couleur rendue transparente (ex. `hairColor`). */
  color: string
}

export interface AvatarStyleDefinition {
  id: AvatarStyleId
  labelKey: TranslationKey
  /** Définition DiceBear du style (JSON importé). */
  definition: StyleDefinition
  /** Composants variants gérés (`<field>Variant`). */
  variantFields: readonly string[]
  /** Composants pouvant être retirés (`<field>Probability: 0`). */
  optionalFields: readonly string[]
  /** Champs optionnels structurels : `none` conserve la tête via une variante transparente. */
  transparentNoneFields?: Record<string, TransparentNoneField>
  /** Options couleur gérées (`<field>` = nom d'option DiceBear, ex. `hairColor`). */
  colorFields: readonly string[]
  /**
   * Options couleur **dérivées** d'une autre option (ex. barbe Lorelei = couleur des cheveux),
   * recalculées à chaque rendu et jamais persistées.
   */
  derivedColors?: Record<string, { from: string; fallback: string }>
  /** Variantes disponibles par champ (dérivé des groupes). */
  variants: Record<string, readonly string[]>
  /** Palettes proposées par champ couleur (dérivé des groupes). */
  palettes: Record<string, readonly string[]>
  groups: AvatarStyleGroup[]
  /** Preset de référence (« Réinitialiser »), sans `style`. */
  defaults: AvatarOptions
}
