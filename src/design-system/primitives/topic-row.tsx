import { View, type StyleProp, type ViewStyle } from 'react-native'
import { CaretRightIcon, CircleIcon, RadioButtonIcon } from '../icons'
import { CountBadge } from './icon-button'
import { HAIRLINE } from '../theme/hairline'
import { useTheme } from '../theme/theme-provider'
import { tokens, type CategoryCode } from '../tokens.generated'
import { PressableScale } from './pressable-scale'
import { Text } from './text'
import { TopicVisual } from './topic-visual'
import { categoryKey, t } from '@/lib/i18n'
import { OfficialBadge } from '../brand/premium-badge'

export interface TopicRowProps {
  title: string
  /** Sujet éditorial de Joutio (`OfficialBadge` après le nom) ; obligatoire : chaque sujet affiché dit s'il l'est. */
  official: boolean
  category: CategoryCode
  /** Pictogramme carré du sujet : premier choix, comme `TopicTile`. */
  pictogram?: string
  /** Vignette : second choix. Absentes ou en échec : pastille de l'univers. URL ou actif local. */
  image?: string | number
  /** Sous le titre. Par défaut, le nom de l'univers. */
  sub?: string
  /** `radio` : choix unique, à placer dans un `RadioGroup`. */
  control?: 'chevron' | 'radio'
  /** Sélection, avec `radio`. */
  on?: boolean
  /** Dernière ligne de la liste : sans filet. */
  last?: boolean
  disabled?: boolean
  onPress?: () => void
  /** Actions en attente (Mes sujets › À traiter) : pastille `accent`, `9+` au-delà de 9 ; la sous-ligne ne change pas. */
  badge?: number
  style?: StyleProp<ViewStyle>
}

/** Sujet à choisir dans une liste : visuel, nom, univers, puis chevron ou radio. */
export function TopicRow({
  title,
  official,
  category,
  pictogram,
  image,
  sub = t(categoryKey(category)),
  control = 'chevron',
  on = false,
  last = false,
  onPress,
  disabled = false,
  badge,
  style,
}: TopicRowProps) {
  const { colors } = useTheme()
  const radio = control === 'radio'
  const SelectIcon = on ? RadioButtonIcon : CircleIcon
  return (
    <PressableScale
      accessibilityRole={radio ? 'radio' : 'link'}
      accessibilityLabel={`${title}, ${sub}${badge ? t('ds.toHandleSuffix', { count: badge }) : ''}`}
      accessibilityState={radio ? { checked: on } : undefined}
      disabled={disabled}
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
      <TopicVisual category={category} pictogram={pictogram} image={image} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] }}>
          <Text variant="headline" numberOfLines={1} style={{ flexShrink: 1 }}>
            {title}
          </Text>
          {official && <OfficialBadge size={16} />}
        </View>
        <Text variant="caption" color="muted" numberOfLines={1}>
          {sub}
        </Text>
      </View>
      {badge !== undefined && badge > 0 && <CountBadge count={badge} />}
      {radio ? (
        <SelectIcon size={24} weight={on ? 'fill' : 'regular'} color={on ? colors.accentInk : colors.muted} />
      ) : (
        <CaretRightIcon size={20} color={colors.muted} />
      )}
      {!last && <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: HAIRLINE, backgroundColor: colors.border }} />}
    </PressableScale>
  )
}
