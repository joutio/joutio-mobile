/* Repris de joutio-web (shared/avatar/styles) : garder aligné. */
import loreleiDefinition from '@dicebear/styles/lorelei.json'
import type { StyleDefinition } from '@dicebear/core'
import { collectPalettes, collectVariants } from './derive'
import { numberedVariants, variantLabelKeys } from './labels'
import { BACKGROUND_COLORS, HAIR_COLORS, INK_COLORS, SKIN_COLORS } from './palettes'
import type { AvatarStyleDefinition, AvatarStyleGroup } from './types'

/**
 * DiceBear Lorelei remplit la barbe avec la couleur `hair`. Or `hair` porte aussi la tête :
 * « Aucun » force la couleur des cheveux en transparent, ce qui efface la barbe avec eux.
 * On donne donc à la barbe sa propre couleur `beard`, dérivée de `hairColor` dans
 * `toDicebearOptions` (la barbe garde la couleur des cheveux, y compris cheveux retirés).
 */
type RawStyleElement = {
  attributes?: Record<string, unknown>
  children?: RawStyleElement[]
}

type RawStyleDefinition = {
  components?: Record<string, { variants?: Record<string, { elements?: RawStyleElement[] }> }>
  colors?: Record<string, unknown>
}

function withSeparateBeardColor(definition: StyleDefinition): StyleDefinition {
  const patched = JSON.parse(JSON.stringify(definition)) as RawStyleDefinition
  const walk = (elements: RawStyleElement[] | undefined): void => {
    for (const element of elements ?? []) {
      for (const key of ['fill', 'stroke'] as const) {
        const paint = element.attributes?.[key] as { type?: string; name?: string } | undefined
        if (paint?.type === 'color' && paint.name === 'hair') {
          paint.name = 'beard'
        }
      }
      walk(element.children)
    }
  }
  for (const variant of Object.values(patched.components?.beard?.variants ?? {})) {
    walk(variant.elements)
  }
  patched.colors = {
    ...patched.colors,
    beard: { notEqualTo: [], values: ['#18181b'] },
  }
  return patched as unknown as StyleDefinition
}

const LORELEI_DEFINITION = withSeparateBeardColor(loreleiDefinition as StyleDefinition)

const HEAD_VARIANTS = numberedVariants('variant', 4)
const EYES_VARIANTS = numberedVariants('variant', 24)
const EYEBROWS_VARIANTS = numberedVariants('variant', 13)
const NOSE_VARIANTS = numberedVariants('variant', 6)
const MOUTH_VARIANTS = [...numberedVariants('happy', 18), ...numberedVariants('sad', 9)]
const FRECKLES_VARIANTS = ['variant01'] as const
const HAIR_VARIANTS = numberedVariants('variant', 48)
const BEARD_VARIANTS = numberedVariants('variant', 2)
const GLASSES_VARIANTS = numberedVariants('variant', 5)
const EARRINGS_VARIANTS = numberedVariants('variant', 3)
const HAIR_ACCESSORIES_VARIANTS = ['flowers'] as const

const HEAD_LABEL_KEYS = variantLabelKeys('lorelei', 'head', HEAD_VARIANTS)

const groups: AvatarStyleGroup[] = [
  {
    id: 'visage',
    labelKey: 'avatar.groups.face',
    sections: [
      {
        id: 'head',
        labelKey: 'avatar.sections.head',
        variantField: 'head',
        variants: HEAD_VARIANTS,
        labelKeys: HEAD_LABEL_KEYS,
      },
      {
        id: 'eyes',
        labelKey: 'avatar.sections.eyes',
        variantField: 'eyes',
        variants: EYES_VARIANTS,
        labelKeys: variantLabelKeys('lorelei', 'eyes', EYES_VARIANTS),
      },
      {
        id: 'eyebrows',
        labelKey: 'avatar.sections.eyebrows',
        variantField: 'eyebrows',
        variants: EYEBROWS_VARIANTS,
        labelKeys: variantLabelKeys('lorelei', 'eyebrows', EYEBROWS_VARIANTS),
      },
      {
        id: 'nose',
        labelKey: 'avatar.sections.nose',
        variantField: 'nose',
        variants: NOSE_VARIANTS,
        labelKeys: variantLabelKeys('lorelei', 'nose', NOSE_VARIANTS),
      },
      {
        id: 'mouth',
        labelKey: 'avatar.sections.mouth',
        variantField: 'mouth',
        variants: MOUTH_VARIANTS,
        labelKeys: variantLabelKeys('lorelei', 'mouth', MOUTH_VARIANTS),
      },
      {
        id: 'freckles',
        labelKey: 'avatar.sections.freckles',
        variantField: 'freckles',
        variants: FRECKLES_VARIANTS,
        labelKeys: { variant01: 'avatar.options.freckles' },
        allowsNone: true,
      },
    ],
  },
  {
    id: 'cheveux',
    labelKey: 'avatar.groups.hair',
    sections: [
      {
        id: 'hair',
        labelKey: 'avatar.sections.hair',
        variantField: 'hair',
        variants: HAIR_VARIANTS,
        labelKeys: variantLabelKeys('lorelei', 'hair', HAIR_VARIANTS),
        allowsNone: true,
        colorField: 'hairColor',
        colors: HAIR_COLORS,
        colorLabelKey: 'avatar.colors.hair',
      },
      {
        id: 'beard',
        labelKey: 'avatar.sections.beard',
        variantField: 'beard',
        variants: BEARD_VARIANTS,
        labelKeys: {
          variant01: 'avatar.options.beard',
          variant02: 'avatar.options.stubble',
        },
        allowsNone: true,
      },
    ],
  },
  {
    id: 'accessoires',
    labelKey: 'avatar.groups.accessories',
    sections: [
      {
        id: 'glasses',
        labelKey: 'avatar.sections.glasses',
        variantField: 'glasses',
        variants: GLASSES_VARIANTS,
        labelKeys: variantLabelKeys('lorelei', 'glasses', GLASSES_VARIANTS),
        allowsNone: true,
      },
      {
        id: 'earrings',
        labelKey: 'avatar.sections.earrings',
        variantField: 'earrings',
        variants: EARRINGS_VARIANTS,
        labelKeys: variantLabelKeys('lorelei', 'earrings', EARRINGS_VARIANTS),
        allowsNone: true,
      },
      {
        id: 'hairAccessories',
        labelKey: 'avatar.sections.hairAccessories',
        variantField: 'hairAccessories',
        variants: HAIR_ACCESSORIES_VARIANTS,
        labelKeys: { flowers: 'avatar.options.flowers' },
        allowsNone: true,
      },
    ],
  },
  {
    id: 'couleurs',
    labelKey: 'avatar.groups.colors',
    sections: [
      {
        id: 'skin',
        labelKey: 'avatar.sections.skin',
        colorField: 'skinColor',
        colors: SKIN_COLORS,
        colorLabelKey: 'avatar.colors.skin',
      },
      {
        id: 'outline',
        labelKey: 'avatar.sections.outline',
        colorField: 'outlineColor',
        colors: INK_COLORS,
        colorLabelKey: 'avatar.colors.outline',
      },
      {
        id: 'background',
        labelKey: 'avatar.sections.background',
        colorField: 'backgroundColor',
        colors: BACKGROUND_COLORS,
        colorLabelKey: 'avatar.colors.background',
      },
    ],
  },
]

export const loreleiStyle: AvatarStyleDefinition = {
  id: 'lorelei',
  labelKey: 'avatar.styles.lorelei',
  definition: LORELEI_DEFINITION,
  variantFields: ['head', 'eyes', 'eyebrows', 'nose', 'mouth', 'freckles', 'hair', 'beard', 'glasses', 'earrings', 'hairAccessories'],
  optionalFields: ['freckles', 'hair', 'beard', 'glasses', 'earrings', 'hairAccessories'],
  // Le composant DiceBear `hair` contient aussi la tête : le retirer effacerait le visage.
  // « Aucun » est donc rendu avec une variante conservée aux cheveux transparents (crâne rasé).
  transparentNoneFields: {
    hair: { variant: 'variant01', color: 'hairColor' },
  },
  colorFields: [
    'hairColor',
    'eyesColor',
    'eyebrowsColor',
    'noseColor',
    'mouthColor',
    'frecklesColor',
    'skinColor',
    'outlineColor',
    'glassesColor',
    'earringsColor',
    'hairAccessoriesColor',
    'backgroundColor',
  ],
  derivedColors: {
    beardColor: { from: 'hairColor', fallback: '#18181b' },
  },
  variants: collectVariants(groups),
  palettes: collectPalettes(groups),
  groups,
  defaults: {
    head: 'variant01',
    eyes: 'variant01',
    eyebrows: 'variant01',
    nose: 'variant01',
    mouth: 'happy01',
    freckles: 'none',
    hair: 'variant01',
    beard: 'none',
    glasses: 'none',
    earrings: 'none',
    hairAccessories: 'none',
    hairColor: '#18181b',
    eyesColor: '#000000',
    eyebrowsColor: '#18181b',
    noseColor: '#18181b',
    mouthColor: '#18181b',
    frecklesColor: '#b45309',
    skinColor: '#f9c9b6',
    outlineColor: '#18181b',
    glassesColor: '#18181b',
    earringsColor: '#facc15',
    hairAccessoriesColor: '#ef4444',
    backgroundColor: '',
  },
}
