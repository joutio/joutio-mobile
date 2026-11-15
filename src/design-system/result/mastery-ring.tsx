import { useEffect, useState } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { useReducedMotion } from '../motion'
import { Text } from '../primitives/text'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { useT } from '@/lib/i18n'

const RADIUS = 65
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
/** Remplissage de l'anneau et compteur « XP gagnée », solidaires, linéaires (`RING_REVEAL_MS`). */
const COUNT_DURATION = 1600
/** Débord toléré des libellés rayonnants dans la gouttière de la page (16 pt) : jamais jusqu'au bord de l'écran. */
const GUTTER = 8
/** Diamètre minimal de l'anneau rayonnant (celui de l'anneau compact) : en dessous, les libellés s'empilent à sa droite. */
const RING_MIN = 104
/** Point (7) et écart (8) entre le trait et le libellé. */
const LABEL_CHROME = 15

/**
 * Diamètre de l'anneau rayonnant qui garde ses libellés **mesurés** dans la largeur (2026-11-15). Il remplace une portée
 * fixe de 100 pt, qui empilait les libellés sur les écrans de 360 à 380 pt. Calcul au pire cas : un libellé à
 * l'horizontale (r + trait de 0,28 r + point, écart et texte). Ainsi l'anneau ne change pas de taille pendant
 * l'animation ni à l'arrivée de la récompense. Il rétrécit jusqu'à `RING_MIN` ; en dessous, la fonction renvoie
 * `undefined` et le composant passe à la rangée empilée.
 */
export function fitRing(requested: number, width: number, labels: { left: number; right: number }) {
  const room = width / 2 + GUTTER - LABEL_CHROME - Math.max(labels.left, labels.right)
  const size = Math.min(requested, Math.floor((2 * room) / 1.28))
  return size >= Math.min(requested, RING_MIN) ? size : undefined
}

export interface MasteryRingProps {
  /** Palier affiché au centre. */
  tier: string
  /** Palier suivant. Absent au palier maximal. */
  next?: string
  gained: number
  remaining: number
  /** Diamètre en pt. */
  size?: number
  /** `pending` : XP pas encore connue, l'anneau reste vide. */
  state?: 'pending' | 'done'
  /**
   * Écran court (iPhone Duo plié, 2026-11-14) : libellés empilés à droite de l'anneau, sans traits, pour tenir à côté
   * de l'Elo.
   */
  compact?: boolean
  style?: StyleProp<ViewStyle>
}

/** Progression de l'animation (l'affichage seul ; les valeurs viennent des props). */
function useCountUp(key: string, pending: boolean, reduced: boolean) {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    if (pending) {
      setProgress(0)
      return
    }
    if (reduced) {
      setProgress(1)
      return
    }
    let frame = 0
    let start: number | undefined
    const tick = (now: number) => {
      start ??= now
      const value = Math.min(1, (now - start) / COUNT_DURATION)
      setProgress(value)
      if (value < 1) frame = requestAnimationFrame(tick)
    }
    setProgress(0)
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [key, pending, reduced])
  return progress
}

/**
 * Maîtrise du sujet après la partie : XP gagnée (arc ambre) et XP restante avant le palier suivant. Libellés de part et
 * d'autre de l'anneau, qui rétrécit pour les garder (`fitRing`) ; trop étroit même ainsi, ils s'empilent à sa droite,
 * anneau à sa taille demandée.
 */
export function MasteryRing({ tier, next, gained, remaining, size: requested = 180, state = 'done', compact = false, style }: MasteryRingProps) {
  const t = useT()
  const { colors } = useTheme()
  const reduced = useReducedMotion()
  const pending = state === 'pending'
  const progress = useCountUp(`${gained}/${remaining}`, pending, reduced)
  const [width, setWidth] = useState(0)
  // Largeur des deux libellés rayonnants à leur valeur finale, mesurée hors écran.
  const [labels, setLabels] = useState({ left: 0, right: 0 })
  const measured = width > 0 && labels.left > 0 && labels.right > 0
  const fitted = measured ? fitRing(requested, width, labels) : requested
  const narrow = fitted === undefined
  const size = compact || narrow ? requested : fitted

  const total = gained + remaining
  const shownGained = Math.round(gained * progress)
  const percent = pending ? 0 : (total > 0 ? (gained / total) * 100 : 100) * progress
  const rad = Math.PI / 180
  // Ancrages des libellés sur l'anneau, comme le lab : XP gagnée à droite, restante à gauche.
  const gainedAngle = Math.max(36, 1.8 * percent) * rad
  const remainingAngle = Math.max(216, 180 + 1.8 * percent) * rad
  const line = Math.round(size * 0.14)
  const opacity = pending ? 0 : Math.min(1, progress / 0.25)
  const half = size / 2

  const label = pending
    ? `Maîtrise ${tier}, points d'expérience en cours de calcul`
    : `Maîtrise ${tier}, ${gained} points d'expérience gagnés, ${next ? `${remaining} avant ${next}` : 'palier max'}`
  const ring = (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 160 160" style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={80} cy={80} r={RADIUS} fill="none" stroke={colors.text} strokeWidth={30} />
        <Circle
          cx={80}
          cy={80}
          r={RADIUS}
          fill="none"
          stroke={colors.accent}
          strokeWidth={30}
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={CIRCUMFERENCE * (1 - percent / 100)}
        />
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: tokens.space[1] }}>
        <Text variant="caption" weight="600" color="muted">
          {t('topic.mastery')}
        </Text>
        <Text variant={compact ? 'headline' : 'title2'} weight="700">
          {tier}
        </Text>
      </View>
    </View>
  )

  const stacked = (
    <>
      {ring}
      <View style={{ gap: tokens.space[3], opacity }}>
        <View>
          <Text variant="caption" weight="600" color="accentInk" numberOfLines={1}>
            {t('mobile.ds.xpGained')}
          </Text>
          <Text variant="title2" mono weight="600" color="accentInk">
            +{shownGained}
          </Text>
        </View>
        <View>
          <Text variant="caption" weight="600" numberOfLines={1}>
            {next ? t('mobile.ds.before', { next }) : t('mobile.ds.maxTier')}
          </Text>
          <Text variant="title2" mono weight="600">
            {total - shownGained}
          </Text>
        </View>
      </View>
    </>
  )

  // Forcé (écran court, à côté de l'Elo) : la rangée seule, à sa largeur.
  if (compact)
    return (
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={label}
        style={[{ flexDirection: 'row', alignItems: 'center', gap: tokens.space[4] }, style]}
      >
        {stacked}
      </View>
    )

  const measure = (event: { nativeEvent: { layout: { width: number } } }) => setWidth(event.nativeEvent.layout.width)
  const measureLabel = (side: 'left' | 'right') => (event: { nativeEvent: { layout: { width: number } } }) => {
    const value = Math.ceil(event.nativeEvent.layout.width)
    setLabels((current) => (current[side] === value ? current : { ...current, [side]: value }))
  }
  // Libellés rayonnants à leur valeur finale, invisibles et hors du flux : leur largeur règle l'anneau (`fitRing`).
  const probe = (
    <View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ position: 'absolute', opacity: 0, left: 0, top: 0 }}
    >
      <View onLayout={measureLabel('left')} style={{ position: 'absolute', alignItems: 'flex-end' }}>
        <Text variant="caption" weight="600" numberOfLines={1}>
          {next ? t('mobile.ds.before', { next }) : t('mobile.ds.maxTier')}
        </Text>
        <Text variant="largeTitle" mono weight="600">
          {total}
        </Text>
      </View>
      <View onLayout={measureLabel('right')} style={{ position: 'absolute' }}>
        <Text variant="caption" weight="600" numberOfLines={1}>
          {t('mobile.ds.xpGained')}
        </Text>
        <Text variant="largeTitle" mono weight="600">
          +{gained}
        </Text>
      </View>
    </View>
  )

  // Trop étroit pour les libellés rayonnants : même rangée, centrée ; la mesure reste sur toute la largeur.
  if (narrow)
    return (
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={label}
        onLayout={measure}
        style={[{ alignSelf: 'stretch', height: requested, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: tokens.space[5] }, style]}
      >
        {probe}
        {stacked}
      </View>
    )

  // Anneau réduit pour ses libellés : centré dans la hauteur demandée, le reste de la page ne bouge pas.
  const inset = (requested - size) / 2

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      onLayout={measure}
      // Invisible jusqu'à la mesure : l'anneau ne s'affiche pas à une taille qu'il quitterait aussitôt.
      style={[{ alignSelf: 'stretch', height: requested, paddingTop: inset, alignItems: 'center', opacity: measured ? 1 : 0 }, style]}
    >
      {probe}
      {ring}
      {/* Restante : à gauche, ancrée sur l'anneau. */}
      <View
        style={{
          position: 'absolute',
          right: '50%',
          marginRight: -half * Math.sin(remainingAngle),
          top: inset + (1 - Math.cos(remainingAngle)) * half - 24,
          flexDirection: 'row',
          alignItems: 'center',
          opacity,
        }}
      >
        <View style={{ marginRight: tokens.space[3], alignItems: 'flex-end' }}>
          <Text variant="caption" weight="600" numberOfLines={1}>
            {next ? t('mobile.ds.before', { next }) : t('mobile.ds.maxTier')}
          </Text>
          <Text variant="largeTitle" mono weight="600">
            {total - shownGained}
          </Text>
        </View>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.text }} />
        <View style={{ width: line, height: 2, backgroundColor: colors.text }} />
      </View>
      {/* Gagnée : à droite. */}
      <View
        style={{
          position: 'absolute',
          left: '50%',
          marginLeft: half * Math.sin(gainedAngle),
          top: inset + (1 - Math.cos(gainedAngle)) * half - 24,
          flexDirection: 'row',
          alignItems: 'center',
          opacity,
        }}
      >
        <View style={{ width: line, height: 2, backgroundColor: colors.accent }} />
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent }} />
        <View style={{ marginLeft: tokens.space[3] }}>
          <Text variant="caption" weight="600" color="accentInk" numberOfLines={1}>
            {t('mobile.ds.xpGained')}
          </Text>
          <Text variant="largeTitle" mono weight="600" color="accentInk">
            +{shownGained}
          </Text>
        </View>
      </View>
    </View>
  )
}
