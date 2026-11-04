import { alpha, mix } from '../theme/color'
import type { ThemeColors } from '../theme/theme-provider'

/** Hiérarchie visuelle inspirée d'iOS, partagée par Button et IconButton (`button.md`). */
export const BUTTON_VARIANTS = ['filled', 'tinted', 'gray', 'plain'] as const
export const BUTTON_TONES = ['accent', 'neutral', 'destructive'] as const

export type ButtonVariant = (typeof BUTTON_VARIANTS)[number]
export type ButtonTone = (typeof BUTTON_TONES)[number]

export interface ButtonColors {
  background: string
  foreground: string
  /** `plain` : opacité .5 à la pression, sans fond. */
  opacity: number
}

/** `brightness(.9)` du lab. */
const darken = (color: string) => mix(color, '#000000', 0.9)

/** Variantes composées du lab (`button-styles.ts`) : variant et tone ne stylent rien seuls. */
export function buttonColors(colors: ThemeColors, variant: ButtonVariant, tone: ButtonTone, pressed: boolean): ButtonColors {
  const ink = { accent: colors.accentInk, neutral: colors.text, destructive: colors.wrong }[tone]
  switch (variant) {
    case 'filled': {
      if (tone === 'accent') return { background: pressed ? colors.accentPress : colors.accent, foreground: colors.onAccent, opacity: 1 }
      const base = tone === 'neutral' ? colors.text : colors.wrong
      return { background: pressed ? darken(base) : base, foreground: tone === 'neutral' ? colors.bg : colors.onWrong, opacity: 1 }
    }
    case 'tinted': {
      if (tone === 'neutral') return { background: alpha(colors.text, pressed ? 0.2 : 0.1), foreground: colors.text, opacity: 1 }
      const base = tone === 'accent' ? colors.accent : colors.wrong
      return { background: alpha(base, pressed ? 0.28 : 0.16), foreground: ink, opacity: 1 }
    }
    case 'gray':
      return { background: pressed ? colors.hover : colors.raised, foreground: ink, opacity: 1 }
    case 'plain':
      return { background: 'transparent', foreground: ink, opacity: pressed ? 0.5 : 1 }
  }
}
