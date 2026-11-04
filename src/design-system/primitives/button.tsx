import type { ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import type { Icon } from '../icons'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { buttonColors, type ButtonTone, type ButtonVariant } from './button-styles'
import { PressableScale, slopFor, type PressableScaleProps } from './pressable-scale'
import { Spinner } from './spinner'
import { Text } from './text'

export type ButtonSize = 'L' | 'M' | 'S'

/** Hauteur visible ; M et S gardent une cible de 44 pt par `hitSlop`. */
const HEIGHT: Record<ButtonSize, number> = { L: 48, M: 40, S: 32 }
const PADDING: Record<ButtonSize, number> = { L: 20, M: tokens.space[5], S: tokens.space[4] }

export interface ButtonProps extends Omit<PressableScaleProps, 'children' | 'style'> {
  variant?: ButtonVariant
  tone?: ButtonTone
  size?: ButtonSize
  full?: boolean
  icon?: Icon
  iconPlacement?: 'leading' | 'trailing'
  /** Description sous le titre. Recommandé en L et M. */
  subtitle?: string
  meta?: string
  loading?: boolean
  /** Libellé `font-normal` (barres : Annuler, Retour). */
  regular?: boolean
  style?: StyleProp<ViewStyle>
  children: ReactNode
}

export function Button({
  variant = 'filled',
  tone = 'accent',
  size = 'L',
  full = false,
  icon: IconComponent,
  iconPlacement = 'leading',
  subtitle,
  meta,
  loading = false,
  regular = false,
  disabled,
  style,
  children,
  accessibilityLabel,
  ...props
}: ButtonProps) {
  const { colors, radius } = useTheme()
  const iconSize = size === 'S' ? 16 : 20
  const inactive = Boolean(disabled || loading)
  const label = typeof children === 'string' ? children : undefined

  return (
    <PressableScale
      {...props}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? [label, subtitle, meta].filter(Boolean).join(', ')}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      hitSlop={slopFor(HEIGHT[size])}
      pressedScale={0.98}
      style={({ pressed }) => {
        const { background } = buttonColors(colors, variant, tone, pressed)
        return [
          {
            minHeight: HEIGHT[size],
            minWidth: 44,
            paddingHorizontal: PADDING[size],
            paddingVertical: subtitle ? tokens.space[3] : 0,
            borderRadius: radius.sm,
            backgroundColor: background,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: tokens.space[3],
            opacity: inactive ? 0.4 : 1,
            // Ne s'étire pas dans une colonne ; dans une rangée, passer `alignSelf: 'center'` en `style`.
            alignSelf: full ? 'stretch' : 'flex-start',
          },
          style,
        ]
      }}
    >
      {({ pressed }) => {
        const { foreground, opacity } = buttonColors(colors, variant, tone, pressed)
        const indicator = loading ? <Spinner size={iconSize} color={foreground} /> : IconComponent && <IconComponent size={iconSize} color={foreground} />
        const textVariant = size === 'L' ? 'headline' : 'callout'
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space[3], opacity }}>
            {iconPlacement === 'leading' && indicator}
            {subtitle ? (
              <View style={{ alignItems: 'center' }}>
                <Text variant={textVariant} weight={regular ? '400' : '600'} color={foreground} numberOfLines={1}>
                  {children}
                </Text>
                <Text variant="caption" color={foreground} style={{ opacity: 0.8 }}>
                  {subtitle}
                </Text>
              </View>
            ) : (
              <Text variant={textVariant} weight={regular ? '400' : '600'} color={foreground} numberOfLines={1}>
                {children}
              </Text>
            )}
            {meta && (
              <Text variant={textVariant} mono weight="600" color={foreground} style={{ opacity: 0.65 }}>
                {meta}
              </Text>
            )}
            {iconPlacement === 'trailing' && indicator}
          </View>
        )
      }}
    </PressableScale>
  )
}
