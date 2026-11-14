import { Image } from 'expo-image'
import { useState, type ReactNode } from 'react'
import { View } from 'react-native'
import { CategoryIcon } from '../brand/category-icon'
import { useTheme } from '../theme/theme-provider'
import type { CategoryCode } from '../tokens.generated'

export interface TopicVisualProps {
  category: CategoryCode
  /** Pictogramme carré du sujet : premier choix, comme `TopicTile`. */
  pictogram?: string
  /** Vignette : second choix. Absentes ou en échec : pastille de l'univers. URL ou actif local. */
  image?: string | number
  /** Pastille posée sur le coin (robot de `MatchRow`). */
  children?: ReactNode
}

/**
 * Visuel 44 pt d'un sujet dans une ligne (`TopicRow`, `MatchRow`), même visuel que `TopicTile` (2026-11-13) : la couleur
 * d'univers en retrait d'un point, rayon réduit d'autant, visible à travers un pictogramme détouré, puis l'image, seule à
 * toucher le bord ; sans image, la couleur remplit le cadre avec l'icône de l'univers.
 */
export function TopicVisual({ category, pictogram, image, children }: TopicVisualProps) {
  const { colors, radius, categoryColor } = useTheme()
  const [failed, setFailed] = useState<readonly (string | number)[]>([])
  const source = [pictogram, image].find((url): url is string | number => url !== undefined && url !== '' && !failed.includes(url))
  const box = { width: 44, height: 44, borderRadius: radius.md }
  return (
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
      {children}
    </View>
  )
}
