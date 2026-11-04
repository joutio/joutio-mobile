import { Image } from 'expo-image'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { CategoryIcon } from '../brand/category-icon'
import { CaretRightIcon, CircleIcon, RadioButtonIcon } from '../icons'
import { HAIRLINE } from '../theme/hairline'
import { useTheme } from '../theme/theme-provider'
import { tokens, type CategoryCode } from '../tokens.generated'
import { PressableScale } from './pressable-scale'
import { Text } from './text'

export interface TopicRowProps {
  title: string
  category: CategoryCode
  /** Absente : pastille de l'univers. URL ou actif local. */
  image?: string | number
  /** Sous le titre. Par défaut, le nom de l'univers. */
  sub?: string
  /** `radio` : choix unique, à placer dans un `RadioGroup`. */
  control?: 'chevron' | 'radio'
  /** Sélection, avec `radio`. */
  on?: boolean
  /** Dernière ligne de la liste : sans filet. */
  last?: boolean
  onPress?: () => void
  style?: StyleProp<ViewStyle>
}

/** Sujet à choisir dans une liste : visuel, nom, univers, puis chevron ou radio. */
export function TopicRow({
  title,
  category,
  image,
  sub = tokens.category[category].label,
  control = 'chevron',
  on = false,
  last = false,
  onPress,
  style,
}: TopicRowProps) {
  const { colors, radius } = useTheme()
  const radio = control === 'radio'
  const SelectIcon = on ? RadioButtonIcon : CircleIcon
  return (
    <PressableScale
      accessibilityRole={radio ? 'radio' : 'link'}
      accessibilityLabel={`${title}, ${sub}`}
      accessibilityState={radio ? { checked: on } : undefined}
      pressedScale={1}
      ripple
      haptic={radio ? 'selection' : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 64,
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.space[4],
          paddingHorizontal: tokens.space[5],
          paddingVertical: tokens.space[3],
          backgroundColor: pressed ? colors.hover : 'transparent',
        },
        style,
      ]}
    >
      {image !== undefined ? (
        <Image source={typeof image === 'number' ? image : { uri: image }} contentFit="cover" style={{ width: 44, height: 44, borderRadius: radius.md }} />
      ) : (
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.md,
            backgroundColor: tokens.category[category].color,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CategoryIcon category={category} size={22} weight="fill" color={colors.onAccent} style={{ opacity: 0.8 }} />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="headline" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="caption" color="muted" numberOfLines={1}>
          {sub}
        </Text>
      </View>
      {radio ? (
        <SelectIcon size={24} weight={on ? 'fill' : 'regular'} color={on ? colors.accentInk : colors.muted} />
      ) : (
        <CaretRightIcon size={20} color={colors.muted} />
      )}
      {!last && (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: tokens.space[5] + 44 + tokens.space[4], right: 0, bottom: 0, height: HAIRLINE, backgroundColor: colors.border }}
        />
      )}
    </PressableScale>
  )
}
