import { Image } from 'expo-image'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { CategoryIcon } from '../brand/category-icon'
import { categoryInk } from '../theme/color'
import { useTheme } from '../theme/theme-provider'
import { tokens, type CategoryCode } from '../tokens.generated'
import { PressableScale } from './pressable-scale'
import { Text } from './text'

export interface TopicCardProps {
  title: string
  category: CategoryCode
  orientation?: 'portrait' | 'landscape'
  /** URL ou actif local. Absente : fond de l'univers et son icône. */
  image?: string | number
  onPress?: () => void
  /** Nom accessible, par défaut « titre, univers » (le Top 10 y ajoute le rang). */
  accessibilityLabel?: string
  style?: StyleProp<ViewStyle>
}

/** Carte de sujet : visuel (16:9 en paysage, 3:4 en portrait), univers et nom. */
export function TopicCard({ title, category, orientation = 'landscape', image, onPress, accessibilityLabel, style }: TopicCardProps) {
  const { colors, radius } = useTheme()
  const portrait = orientation === 'portrait'
  const color = tokens.category[category].color
  return (
    <PressableScale
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel ?? `${title}, ${tokens.category[category].label}`}
      disabled={!onPress}
      pressedScale={0.99}
      onPress={onPress}
      style={[{ alignSelf: 'stretch', overflow: 'hidden', borderRadius: radius.md, backgroundColor: colors.raised }, portrait && { aspectRatio: 3 / 4 }, style]}
    >
      <View
        style={[{ alignItems: 'center', justifyContent: 'center', backgroundColor: color }, portrait ? { flex: 1, minHeight: 0 } : { aspectRatio: 16 / 9 }]}
      >
        {image !== undefined ? (
          <Image
            source={typeof image === 'number' ? image : { uri: image }}
            contentFit="cover"
            style={{ position: 'absolute', inset: 0 }}
            transition={tokens.motion.micro.duration}
          />
        ) : (
          <CategoryIcon category={category} size={28} weight="fill" color={colors.onAccent} style={{ opacity: 0.8 }} />
        )}
      </View>
      <View style={{ gap: tokens.space[1], paddingHorizontal: tokens.space[4], paddingTop: tokens.space[3], paddingBottom: tokens.space[4] }}>
        <Text variant="caption" weight="600" color={categoryInk(color, colors.text)} numberOfLines={1}>
          {tokens.category[category].label}
        </Text>
        <Text variant="callout" weight="600" numberOfLines={1}>
          {title}
        </Text>
      </View>
    </PressableScale>
  )
}
