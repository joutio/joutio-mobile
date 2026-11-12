import { Image } from 'expo-image'
import { useState } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { CategoryIcon } from '../brand/category-icon'
import { useTheme } from '../theme/theme-provider'
import { tokens, type CategoryCode } from '../tokens.generated'
import { PressableScale } from './pressable-scale'
import { Text } from './text'

/** Côté du visuel (`--jo-space-11`, 80 px). */
export const TOPIC_TILE_VISUAL = tokens.space[11]
/** Hauteur réservée au titre : deux lignes `callout`. */
export const TOPIC_TILE_TITLE_HEIGHT = tokens.typography.callout.lineHeight * 2

export interface TopicTileProps {
  title: string
  category: CategoryCode
  /** Pictogramme carré du sujet : premier choix. */
  pictogram?: string
  /** Bannière du sujet (celle de `TopicCard`), recadrée au carré : second choix. URL ou actif local. */
  image?: string | number
  onPress?: () => void
  style?: StyleProp<ViewStyle>
}

/**
 * Sujet compact (`design/specs/components/contenu.md`) : visuel carré, puis deux lignes réservées au titre. Repli du
 * visuel : pictogramme, sinon bannière recadrée au carré, sinon couleur et icône de l'univers. Une source qui échoue
 * passe à la suivante.
 *
 * Deux couches dans un cadre arrondi sans fond (2026-11-12, comme le lab) : la couleur d'univers **en retrait d'un
 * point**, rayon réduit d'autant, puis l'image, seule à toucher le bord. La couleur se voit à travers un pictogramme
 * détouré, jamais dans l'anticrénelage de l'arrondi (liseré aux coins en thème sombre). Sans image, elle remplit le cadre.
 */
export function TopicTile({ title, category, pictogram, image, onPress, style }: TopicTileProps) {
  const { colors, radius, categoryColor } = useTheme()
  const [failed, setFailed] = useState<readonly (string | number)[]>([])
  const source = [pictogram, image].find((url): url is string | number => url !== undefined && url !== '' && !failed.includes(url))
  const box = { width: TOPIC_TILE_VISUAL, height: TOPIC_TILE_VISUAL, borderRadius: radius.md }
  return (
    <PressableScale
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={title}
      disabled={!onPress}
      pressedScale={0.98}
      onPress={onPress}
      style={[{ alignItems: 'center', gap: tokens.space[3] }, style]}
    >
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
            transition={tokens.motion.micro.duration}
            onError={() => setFailed((list) => [...list, source])}
          />
        ) : (
          <CategoryIcon category={category} size={28} weight="fill" color={colors.onAccent} />
        )}
      </View>
      <Text variant="callout" align="center" numberOfLines={2} style={{ alignSelf: 'stretch', minHeight: TOPIC_TILE_TITLE_HEIGHT }}>
        {title}
      </Text>
    </PressableScale>
  )
}
