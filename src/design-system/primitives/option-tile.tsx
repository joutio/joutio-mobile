import { type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { Avatar } from './avatar'
import { PressableScale } from './pressable-scale'
import { Text } from './text'

export interface OptionTileProps {
  label: string
  /** Aperçu : URL ou SVG en ligne (avatar avec l'option appliquée). */
  image: string
  selected?: boolean
  onSelect?: () => void
  style?: StyleProp<ViewStyle>
}

/** Choix visuel d'une option, dans un groupe à choix unique. */
export function OptionTile({ label, image, selected = false, onSelect, style }: OptionTileProps) {
  const { colors, radius } = useTheme()
  return (
    <PressableScale
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      haptic="selection"
      onPress={onSelect}
      style={[
        {
          alignItems: 'center',
          gap: tokens.space[2],
          borderRadius: radius.md,
          backgroundColor: colors.surface,
          padding: tokens.space[3],
          borderWidth: 2,
          borderColor: selected ? colors.accent : 'transparent',
        },
        style,
      ]}
    >
      <Avatar name={label} src={image} size="xl" decorative style={{ width: '100%', height: undefined, aspectRatio: 1 }} />
      <Text
        variant="caption"
        weight={selected ? '600' : undefined}
        color={selected ? 'text' : 'muted'}
        numberOfLines={1}
        align="center"
        style={{ alignSelf: 'stretch' }}
      >
        {label}
      </Text>
    </PressableScale>
  )
}
