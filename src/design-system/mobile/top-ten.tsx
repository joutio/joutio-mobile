import { useId, type ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import Svg, { Text as SvgText } from 'react-native-svg'
import { alpha } from '../theme/color'
import { Button } from '../primitives/button'
import { SectionHeader } from '../primitives/section-header'
import { TopicCard, type TopicCardProps } from '../primitives/topic-card'
import { fontFace } from '../theme/fonts'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { Rail } from './rail'

const MAX = 10
export const TOP_TEN_CARD_WIDTH = 172
/** Part visible du chiffre : la carte recouvre le reste, il suffit de le reconnaître. */
const DIGIT_WIDTH = { one: 42, single: 60, double: 112 }
/**
 * « 10 » en deux glyphes : le 1, décalé du bord gauche (la carte 9 ne le rogne plus), chevauche légèrement le 0, qui
 * passe **par-dessus**. Origines mesurées sur Geist 800 au token `numericRank`.
 */
const TEN_ONE_X = 6
const TEN_ZERO_X = TEN_ONE_X + 41
/**
 * Décalage vers la droite des chiffres dont le pied gauche (barre du 4, haut du 7) touche le bord du dessin : sans lui,
 * la carte précédente et le bord du SVG les rognent sur Android.
 */
const DIGIT_X: Partial<Record<number, number>> = { 4: 10, 7: 10 }
/** Hauteur du chiffre, calée sur le token `numericRank`. */
const NUMERAL_HEIGHT = 120
const NUMERAL_BASELINE = 116
/** Débord du SVG sous la carte : le chiffre continue derrière elle. */
const UNDER_CARD = 48
/** L'ombre déborde sous la carte : ses coins arrondis ne laissent pas voir un chiffre sans ombre. */
const SHADOW_UNDER = 16
/**
 * Ombre portée par la carte sur le nombre (rendu france.tv) : de son bord gauche (nulle) jusqu'à la carte (presque le
 * fond), en courbe douce (ease-in). Dessinée en fines tranches pleines plutôt qu'en dégradé translucide : le rendu
 * des dégradés varie selon le chemin d'affichage (fenêtre de l'émulateur en GPU hôte : marche d'escalier).
 */
const SHADOW_SLICES = 40
const SHADOW_MAX = 0.94
const shadowOpacity = (t: number) => SHADOW_MAX * Math.pow(Math.min(1, t), 1.6)

export interface TopTenTopic extends Pick<TopicCardProps, 'title' | 'category' | 'image'> {
  /** Identifiant stable (clé de liste). */
  id: string
}

export interface TopTenProps {
  /** Sujets du classement, dans l'ordre. Seuls les 10 premiers sont affichés. */
  topics: readonly TopTenTopic[]
  title?: string
  onSelect?: (topic: TopTenTopic, rank: number) => void
  /** Affiche « Tout voir ». */
  onSeeAll?: () => void
  style?: StyleProp<ViewStyle>
}

const digitWidth = (rank: number) => (rank >= MAX ? DIGIT_WIDTH.double : rank === 1 ? DIGIT_WIDTH.one : DIGIT_WIDTH.single)

/** Chiffre plein au contour clair, assombri près de la carte par l'ombre qu'elle porte. */
function RankNumeral({ rank }: { rank: number }) {
  const { colors } = useTheme()
  const id = useId().replace(/:/g, '')
  const { fontSize, letterSpacing } = tokens.typography.numericRank
  const width = digitWidth(rank) + UNDER_CARD
  const ten = rank >= MAX
  const glyph = (text: string, x: number) => (
    <SvgText
      x={x}
      y={NUMERAL_BASELINE}
      fontFamily={fontFace('Geist', '800')}
      fontSize={fontSize}
      letterSpacing={letterSpacing}
      fill={colors.rankFill}
      stroke={colors.rankStroke}
      strokeOpacity={0.9}
      strokeWidth={2.5}
    >
      {text}
    </SvgText>
  )
  return (
    <Svg
      width={width}
      height={NUMERAL_HEIGHT}
      style={{ position: 'absolute', top: tokens.space[3], left: 0, overflow: 'visible' }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {ten ? (
        <>
          {glyph('1', TEN_ONE_X)}
          {glyph('0', TEN_ZERO_X)}
        </>
      ) : (
        glyph(String(rank), DIGIT_X[rank] ?? 0)
      )}
    </Svg>
  )
}

/**
 * Ombre de la carte sur le nombre : couches qui partent chacune d'un peu plus à droite et vont jusqu'au bout. Leurs
 * opacités se composent (1 − Π(1 − aᵢ)) pour suivre exactement la courbe ; aucune couture d'arrondi au pixel.
 */
function CardShadow({ rank }: { rank: number }) {
  const { colors } = useTheme()
  const edge = digitWidth(rank)
  const width = edge + SHADOW_UNDER
  const slice = width / SHADOW_SLICES
  const target = (index: number) => shadowOpacity(((index + 0.5) * slice) / edge)
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: tokens.space[3], left: 0, width, height: NUMERAL_HEIGHT }}>
      {Array.from({ length: SHADOW_SLICES }, (_, index) => {
        const previous = index === 0 ? 0 : target(index - 1)
        const layer = 1 - (1 - target(index)) / (1 - previous)
        return <View key={index} style={{ position: 'absolute', top: 0, bottom: 0, left: index * slice, right: 0, backgroundColor: alpha(colors.bg, layer) }} />
      })}
    </View>
  )
}

function Ranked({ rank, children }: { rank: number; children: ReactNode }) {
  return (
    <View style={{ paddingLeft: digitWidth(rank) }}>
      <RankNumeral rank={rank} />
      <CardShadow rank={rank} />
      {children}
    </View>
  )
}

/** Classement des sujets (`accueil.md` § 3) : rail d'affiches avec le rang en chiffre géant, que la carte chevauche. */
export function TopTen({ topics, title = 'Top 10 du moment', onSelect, onSeeAll, style }: TopTenProps) {
  return (
    <View style={[{ gap: tokens.space[4] }, style]}>
      <SectionHeader
        title={title}
        style={{ paddingHorizontal: tokens.space[5] }}
        action={
          onSeeAll && (
            <Button variant="plain" size="S" style={{ marginRight: -tokens.space[4] }} onPress={onSeeAll}>
              Tout voir
            </Button>
          )
        }
      />
      <Rail itemWidth={(index) => TOP_TEN_CARD_WIDTH + digitWidth(index + 1)} label={title}>
        {topics.slice(0, MAX).map((topic, index) => (
          <Ranked key={topic.id} rank={index + 1}>
            <TopicCard
              title={topic.title}
              category={topic.category}
              image={topic.image}
              orientation="portrait"
              accessibilityLabel={`${index + 1}. ${topic.title}`}
              onPress={onSelect ? () => onSelect(topic, index + 1) : undefined}
            />
          </Ranked>
        ))}
      </Rail>
    </View>
  )
}
