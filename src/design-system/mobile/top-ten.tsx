import { useId, type ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg'
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
/** Resserre le 10 sans que le zéro touche le 1 (−0,08 em du lab). */
const DOUBLE_SPACING = -0.08 * tokens.typography.numericRank.fontSize
/** Hauteur du chiffre, calée sur le token `numericRank`. */
const NUMERAL_HEIGHT = 120
const NUMERAL_BASELINE = 116

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

/** Chiffre plein et sombre, au contour clair qui s'efface sous la carte. */
function RankNumeral({ rank }: { rank: number }) {
  const { colors } = useTheme()
  const id = useId().replace(/:/g, '')
  const stroke = `${id}-stroke`
  const fill = `${id}-fill`
  const { fontSize, letterSpacing } = tokens.typography.numericRank
  return (
    <Svg
      width={digitWidth(rank) + 48}
      height={NUMERAL_HEIGHT}
      style={{ position: 'absolute', top: tokens.space[3], left: 0, overflow: 'visible' }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Defs>
        <LinearGradient id={stroke} x1="0" x2="1" y1="0" y2="0">
          <Stop offset="0" stopColor={colors.rankStroke} />
          <Stop offset="0.5" stopColor={colors.rankStroke} stopOpacity={0.35} />
          <Stop offset="1" stopColor={colors.rankStroke} stopOpacity={0.05} />
        </LinearGradient>
        <LinearGradient id={fill} x1="0" x2="1" y1="0" y2="0">
          <Stop offset="0" stopColor={colors.rankFill} />
          <Stop offset="1" stopColor={colors.bg} />
        </LinearGradient>
      </Defs>
      <SvgText
        x={0}
        y={NUMERAL_BASELINE}
        fontFamily={fontFace('Geist', '800')}
        fontSize={fontSize}
        letterSpacing={rank >= MAX ? DOUBLE_SPACING : letterSpacing}
        fill={`url(#${fill})`}
        stroke={`url(#${stroke})`}
        strokeWidth={2.5}
      >
        {String(rank)}
      </SvgText>
    </Svg>
  )
}

function Ranked({ rank, children }: { rank: number; children: ReactNode }) {
  return (
    <View style={{ paddingLeft: digitWidth(rank) }}>
      <RankNumeral rank={rank} />
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
