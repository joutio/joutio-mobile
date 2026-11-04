import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native'
import { fontFace, type FontFamily, type FontWeight } from '../theme/fonts'
import { useTheme, type ThemeColors } from '../theme/theme-provider'
import { tokens, type TypographyName } from '../tokens.generated'

export interface TextProps extends RNTextProps {
  /** Style typographique des tokens (`.jo-type-*` du lab). */
  variant?: TypographyName
  /** Couleur du thème, ou couleur calculée (catégorie, rang). */
  color?: keyof ThemeColors | (string & {})
  /** `font-semibold` & co. du lab, par-dessus le style du token. */
  weight?: FontWeight
  /** `font-mono` du lab : Geist Mono et chiffres tabulaires, à la taille du token. */
  mono?: boolean
  align?: TextStyle['textAlign']
}

/** Style natif d'un token typographique. */
export function typeStyle(variant: TypographyName, options: { weight?: FontWeight; mono?: boolean } = {}): TextStyle {
  const token = tokens.typography[variant]
  const family: FontFamily = options.mono ? 'GeistMono' : token.fontFamily
  const tabular = options.mono || 'fontVariant' in token
  return {
    fontFamily: fontFace(family, options.weight ?? token.fontWeight),
    fontSize: token.fontSize,
    lineHeight: token.lineHeight,
    letterSpacing: token.letterSpacing,
    // Android ajoute sinon une marge de police : le texte ne se centre plus sur ses icônes.
    includeFontPadding: false,
    ...(tabular ? { fontVariant: ['tabular-nums'] } : null),
  }
}

/**
 * Style d'un `TextInput`. Sur une ligne, **sans interlignage** : iOS décale sinon le texte et le placeholder vers
 * le bas. Pas de hauteur fixe non plus (Dynamic Type) : le conteneur centre le champ.
 */
export function inputStyle(variant: TypographyName, multiline = false): TextStyle {
  const { lineHeight, ...style } = typeStyle(variant)
  return multiline
    ? { ...style, lineHeight, paddingTop: 0, paddingBottom: 0, textAlignVertical: 'top' }
    : { ...style, paddingTop: 0, paddingBottom: 0, textAlignVertical: 'center' }
}

/** Dynamic Type : le texte suit le réglage système, plafonné pour que les mises en page tiennent. */
export const MAX_FONT_SCALE = 1.6

export function Text({ variant = 'body', color = 'text', weight, mono, align, style, ...props }: TextProps) {
  const { colors } = useTheme()
  const resolved = color in colors ? colors[color as keyof ThemeColors] : color
  return (
    <RNText maxFontSizeMultiplier={MAX_FONT_SCALE} {...props} style={[typeStyle(variant, { weight, mono }), { color: resolved, textAlign: align }, style]} />
  )
}
