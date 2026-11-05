/* Repris de joutio-web (shared/avatar/styles) : garder aligné. */
import type { AvatarStyleGroup } from './types'

/** Champs variants → valeurs, à partir des sections visibles de l'éditeur. */
export function collectVariants(groups: AvatarStyleGroup[]): Record<string, readonly string[]> {
  const variants: Record<string, readonly string[]> = {}
  for (const group of groups) {
    for (const section of group.sections) {
      if (section.variantField && section.variants) {
        variants[section.variantField] = section.variants
      }
    }
  }
  return variants
}

/** Champs couleur → palettes, à partir des sections visibles de l'éditeur. */
export function collectPalettes(groups: AvatarStyleGroup[]): Record<string, readonly string[]> {
  const palettes: Record<string, readonly string[]> = {}
  for (const group of groups) {
    for (const section of group.sections) {
      if (section.colorField && section.colors) {
        palettes[section.colorField] = section.colors
      }
    }
  }
  return palettes
}
