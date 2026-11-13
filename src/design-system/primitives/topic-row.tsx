import { Image } from 'expo-image'
import { useState } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { CategoryIcon } from '../brand/category-icon'
import { CaretRightIcon, CircleIcon, RadioButtonIcon } from '../icons'
import { CountBadge } from './icon-button'
import { HAIRLINE } from '../theme/hairline'
import { useTheme } from '../theme/theme-provider'
import { tokens, type CategoryCode } from '../tokens.generated'
import { PressableScale } from './pressable-scale'
import { Text } from './text'

export interface TopicRowProps {
  title: string
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
  category,
  pictogram,
  image,
  sub = tokens.category[category].label,
  control = 'chevron',
  on = false,
  last = false,
  onPress,
  disabled = false,
  badge,
  style,
}: TopicRowProps) {
  const { colors, radius, categoryColor, scheme } = useTheme()
  const radio = control === 'radio'
  const SelectIcon = on ? RadioButtonIcon : CircleIcon
  const [failed, setFailed] = useState<readonly (string | number)[]>([])
  const source = [pictogram, image].find((url): url is string | number => url !== undefined && url !== '' && !failed.includes(url))
  const box = { width: 44, height: 44, borderRadius: radius.md }
  return (
    <PressableScale
      accessibilityRole={radio ? 'radio' : 'link'}
      accessibilityLabel={`${title}, ${sub}${badge ? `, ${badge} à traiter` : ''}`}
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
      {/* Même visuel que `TopicTile` (2026-11-13) : la couleur d'univers en retrait d'un point, rayon réduit d'autant,
          visible à travers un pictogramme détouré, puis l'image, seule à toucher le bord ; sans image, la couleur remplit
          le cadre avec l'icône de l'univers. */}
      <View style={[box, { alignItems: 'center', justifyContent: 'center' }]}>
        <View
          style={{
            position: 'absolute',
            inset: source !== undefined ? 1 : 0,
            borderRadius: source !== undefined ? radius.md - 1 : radius.md,
            backgroundColor: categoryColor(category),
          }}
        />
        {source !== undefined ? (
          <Image
            key={source}
            source={typeof source === 'number' ? source : { uri: source }}
            contentFit="cover"
            style={[box, { position: 'absolute', top: 0, left: 0 }]}
            onError={() => setFailed((list) => [...list, source])}
          />
        ) : (
          <CategoryIcon category={category} size={22} weight="fill" color={colors.onAccent} style={{ opacity: 0.8 }} />
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="headline" numberOfLines={1}>
          {title}
        </Text>
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
