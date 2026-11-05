/* Repris de joutio-web (shared/avatar/styles) : garder aligné. */
import micahDefinition from '@dicebear/styles/micah.json'
import type { StyleDefinition } from '@dicebear/core'
import { collectPalettes, collectVariants } from './derive'
import { BACKGROUND_COLORS, BROW_COLORS, EARRING_COLORS, EYES_COLORS, GLASSES_COLORS, HAIR_COLORS, MOUTH_COLORS, SHIRT_COLORS, SKIN_COLORS } from './palettes'
import type { AvatarStyleDefinition, AvatarStyleGroup } from './types'

const HAIR_VARIANTS = ['dannyPhantom', 'dougFunny', 'fonze', 'full', 'mrClean', 'mrT', 'pixie', 'turban'] as const

const EYEBROWS_VARIANTS = ['down', 'eyelashesDown', 'eyelashesUp', 'up'] as const

const EYES_VARIANTS = ['eyes', 'eyesShadow', 'round', 'smiling', 'smilingShadow'] as const

const NOSE_VARIANTS = ['curve', 'pointed', 'tound'] as const

const MOUTH_VARIANTS = ['frown', 'laughing', 'nervous', 'pucker', 'sad', 'smile', 'smirk', 'surprised'] as const

const FACIAL_HAIR_VARIANTS = ['beard', 'scruff'] as const

const GLASSES_VARIANTS = ['round', 'square'] as const

const EARRINGS_VARIANTS = ['hoop', 'stud'] as const

const EARS_VARIANTS = ['attached', 'detached'] as const

const CLOTHES_VARIANTS = ['collared', 'crew', 'open'] as const

const groups: AvatarStyleGroup[] = [
  {
    id: 'visage',
    labelKey: 'avatar.groups.face',
    sections: [
      {
        id: 'eyes',
        labelKey: 'avatar.sections.eyes',
        variantField: 'eyes',
        variants: EYES_VARIANTS,
        labelKeys: {
          eyes: 'avatar.options.plain',
          eyesShadow: 'avatar.options.shadowed',
          round: 'avatar.options.round',
          smiling: 'avatar.options.smiling',
          smilingShadow: 'avatar.options.smilingShadowed',
        },
        colorField: 'eyesColor',
        colors: EYES_COLORS,
        colorLabelKey: 'avatar.colors.eyes',
      },
      {
        id: 'eyebrows',
        labelKey: 'avatar.sections.eyebrows',
        variantField: 'eyebrows',
        variants: EYEBROWS_VARIANTS,
        labelKeys: {
          down: 'avatar.options.browsDown',
          eyelashesDown: 'avatar.options.lashesDown',
          eyelashesUp: 'avatar.options.lashesUp',
          up: 'avatar.options.browsUp',
        },
        colorField: 'eyebrowsColor',
        colors: BROW_COLORS,
        colorLabelKey: 'avatar.colors.eyebrows',
      },
      {
        id: 'nose',
        labelKey: 'avatar.sections.nose',
        variantField: 'nose',
        variants: NOSE_VARIANTS,
        labelKeys: {
          curve: 'avatar.options.curved',
          pointed: 'avatar.options.pointed',
          tound: 'avatar.options.rounded',
        },
      },
      {
        id: 'mouth',
        labelKey: 'avatar.sections.mouth',
        variantField: 'mouth',
        variants: MOUTH_VARIANTS,
        labelKeys: {
          frown: 'avatar.options.frown',
          laughing: 'avatar.options.laughing',
          nervous: 'avatar.options.nervous',
          pucker: 'avatar.options.pucker',
          sad: 'avatar.options.sad',
          smile: 'avatar.options.smile',
          smirk: 'avatar.options.smirk',
          surprised: 'avatar.options.surprised',
        },
        colorField: 'mouthColor',
        colors: MOUTH_COLORS,
        colorLabelKey: 'avatar.colors.mouth',
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
        labelKeys: {
          dannyPhantom: 'avatar.options.danny',
          dougFunny: 'avatar.options.doug',
          fonze: 'avatar.options.fonzie',
          full: 'avatar.options.fullHair',
          mrClean: 'avatar.options.shaved',
          mrT: 'avatar.options.mrT',
          pixie: 'avatar.options.pixie',
          turban: 'avatar.options.turban',
        },
        colorField: 'hairColor',
        colors: HAIR_COLORS,
        colorLabelKey: 'avatar.colors.hair',
      },
      {
        id: 'facialHair',
        labelKey: 'avatar.sections.beard',
        variantField: 'facialHair',
        variants: FACIAL_HAIR_VARIANTS,
        labelKeys: {
          beard: 'avatar.options.beard',
          scruff: 'avatar.options.stubble',
        },
        allowsNone: true,
        colorField: 'facialHairColor',
        colors: HAIR_COLORS,
        colorLabelKey: 'avatar.colors.beard',
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
        labelKeys: {
          round: 'avatar.options.roundGlasses',
          square: 'avatar.options.squareGlasses',
        },
        allowsNone: true,
        colorField: 'glassesColor',
        colors: GLASSES_COLORS,
        colorLabelKey: 'avatar.colors.glasses',
      },
      {
        id: 'earrings',
        labelKey: 'avatar.sections.earrings',
        variantField: 'earrings',
        variants: EARRINGS_VARIANTS,
        labelKeys: {
          hoop: 'avatar.options.hoops',
          stud: 'avatar.options.studs',
        },
        allowsNone: true,
        colorField: 'earringColor',
        colors: EARRING_COLORS,
        colorLabelKey: 'avatar.colors.earrings',
      },
      {
        id: 'ears',
        labelKey: 'avatar.sections.ears',
        variantField: 'ears',
        variants: EARS_VARIANTS,
        labelKeys: {
          attached: 'avatar.options.attached',
          detached: 'avatar.options.detached',
        },
      },
    ],
  },
  {
    id: 'vetements',
    labelKey: 'avatar.groups.clothes',
    sections: [
      {
        id: 'clothes',
        labelKey: 'avatar.sections.clothes',
        variantField: 'clothes',
        variants: CLOTHES_VARIANTS,
        labelKeys: {
          collared: 'avatar.options.collared',
          crew: 'avatar.options.crew',
          open: 'avatar.options.open',
        },
        colorField: 'shirtColor',
        colors: SHIRT_COLORS,
        colorLabelKey: 'avatar.colors.clothes',
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
        colorField: 'baseColor',
        colors: SKIN_COLORS,
        colorLabelKey: 'avatar.colors.skin',
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

export const micahStyle: AvatarStyleDefinition = {
  id: 'micah',
  labelKey: 'avatar.styles.micah',
  definition: micahDefinition as StyleDefinition,
  variantFields: ['hair', 'eyebrows', 'eyes', 'nose', 'mouth', 'facialHair', 'glasses', 'earrings', 'ears', 'clothes'],
  optionalFields: ['facialHair', 'glasses', 'earrings'],
  colorFields: [
    'hairColor',
    'eyebrowsColor',
    'eyesColor',
    'mouthColor',
    'facialHairColor',
    'glassesColor',
    'earringColor',
    'shirtColor',
    'baseColor',
    'backgroundColor',
  ],
  variants: collectVariants(groups),
  palettes: collectPalettes(groups),
  groups,
  defaults: {
    hair: 'fonze',
    hairColor: '#18181b',
    eyebrows: 'up',
    eyebrowsColor: '#18181b',
    eyes: 'eyes',
    eyesColor: '#000000',
    nose: 'curve',
    mouth: 'laughing',
    mouthColor: '#000000',
    facialHair: 'none',
    facialHairColor: '#f472b6',
    glasses: 'none',
    glassesColor: '#000000',
    earrings: 'none',
    earringColor: '#38bdf8',
    ears: 'attached',
    clothes: 'collared',
    shirtColor: '#ef4444',
    baseColor: '#e8b18c',
    backgroundColor: '#ffffff',
  },
}
