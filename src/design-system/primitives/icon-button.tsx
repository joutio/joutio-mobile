import { View, type StyleProp, type ViewStyle } from 'react-native'
import type { Icon } from '../icons'
import { ThemeScope, useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { buttonColors, type ButtonTone, type ButtonVariant } from './button-styles'
import { PressableScale, slopFor, type PressableScaleProps } from './pressable-scale'
import { Text } from './text'

export type IconButtonSize = 'L' | 'M' | 'S'

const SIZE: Record<IconButtonSize, number> = { L: 48, M: 44, S: 36 }
const ICON_SIZE: Record<IconButtonSize, number> = { L: 24, M: 22, S: 18 }

export interface IconButtonProps extends Omit<PressableScaleProps, 'children' | 'style' | 'accessibilityLabel'> {
  icon: Icon
  /** Nom accessible, obligatoire : le bouton n'a pas de texte visible. */
  label: string
  variant?: ButtonVariant
  tone?: ButtonTone
  size?: IconButtonSize
  badge?: number | 'dot'
  /** Sur une image : pastille sombre et icône blanche, dans les deux thèmes. */
  media?: boolean
  /** Icône pleine (état actif). */
  filled?: boolean
  style?: StyleProp<ViewStyle>
}

function IconButtonBody({
  icon: IconComponent,
  label,
  variant = 'plain',
  tone = 'neutral',
  size = 'M',
  badge,
  media = false,
  filled = false,
  disabled,
  style,
  ...props
}: IconButtonProps) {
  const { colors, radius } = useTheme()
  const px = SIZE[size]
  const badgeLabel = badge === 'dot' ? 'nouveau' : typeof badge === 'number' && badge > 0 ? `${badge}` : undefined

  return (
    <PressableScale
      {...props}
      accessibilityRole="button"
      accessibilityLabel={badgeLabel ? `${label}, ${badgeLabel}` : label}
      disabled={disabled}
      hitSlop={slopFor(px, px)}
      pressedScale={0.94}
      style={({ pressed }) => [
        {
          width: px,
          height: px,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: media ? colors.scrim : buttonColors(colors, variant, tone, pressed).background,
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      {({ pressed }) => {
        const { foreground, opacity } = buttonColors(colors, variant, tone, pressed)
        return (
          <>
            <View style={{ opacity }}>
              <IconComponent size={ICON_SIZE[size]} color={foreground} weight={filled ? 'fill' : 'regular'} />
            </View>
            {badge === 'dot' && (
              <View
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 8,
                  height: 8,
                  borderRadius: radius.full,
                  backgroundColor: colors.wrong,
                  borderWidth: 2,
                  borderColor: colors.bg,
                  boxSizing: 'content-box',
                }}
              />
            )}
            {typeof badge === 'number' && badge > 0 && <CountBadge count={badge} style={{ position: 'absolute', top: -2, right: -2 }} />}
          </>
        )
      }}
    </PressableScale>
  )
}

/** Pastille de compteur ambre, partagée avec BottomNav. */
export function CountBadge({ count, style }: { count: number; style?: StyleProp<ViewStyle> }) {
  const { colors, radius } = useTheme()
  return (
    <View
      style={[
        {
          minWidth: 22,
          height: 22,
          paddingHorizontal: tokens.space[2],
          borderRadius: radius.full,
          backgroundColor: colors.accent,
          borderWidth: 2,
          borderColor: colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <Text variant="caption" weight="600" color="onAccent" style={{ lineHeight: 18 }}>
        {count > 9 ? '9+' : count}
      </Text>
    </View>
  )
}

export function IconButton(props: IconButtonProps) {
  // Sur image : thème sombre forcé, pour une icône blanche sur la pastille.
  return props.media ? (
    <ThemeScope scheme="dark">
      <IconButtonBody {...props} />
    </ThemeScope>
  ) : (
    <IconButtonBody {...props} />
  )
}
