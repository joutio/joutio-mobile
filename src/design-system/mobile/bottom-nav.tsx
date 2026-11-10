import type { BottomTabBarProps } from 'expo-router/js-tabs'
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Icon } from '../icons'
import { CountBadge } from '../primitives/icon-button'
import { PressableScale } from '../primitives/pressable-scale'
import { Text } from '../primitives/text'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { GlassBackground } from './glass'
import { HAIRLINE } from '../theme/hairline'

/** Hauteur au standard de la plateforme (`navigation.md` § BottomNav) : UITabBar 49 pt, Material 3 80 dp. */
export const BOTTOM_NAV_HEIGHT = Platform.OS === 'ios' ? 49 : 80
/** Écart icône-libellé et position du badge, selon la même règle. */
const LABEL_GAP = Platform.OS === 'ios' ? tokens.space[1] : tokens.space[2]
const BADGE_TOP = Platform.OS === 'ios' ? 2 : 14

export interface BottomNavItem<K extends string> {
  key: K
  label: string
  icon: Icon
  badge?: number
}

export interface BottomNavProps<K extends string> {
  items: readonly BottomNavItem<K>[]
  active: K
  onChange?: (key: K) => void
  style?: StyleProp<ViewStyle>
}

/** Navigation principale : 5 onglets, fond glass, filet haut. */
export function BottomNav<K extends string>({ items, active, onChange, style }: BottomNavProps<K>) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel="Navigation principale"
      style={[
        { flexDirection: 'row', paddingHorizontal: tokens.space[3], paddingBottom: insets.bottom, borderTopWidth: HAIRLINE, borderTopColor: colors.border },
        style,
      ]}
    >
      <GlassBackground />
      {items.map(({ key, label, icon: IconComponent, badge }) => {
        const isActive = key === active
        const color = isActive ? colors.accentInk : colors.muted
        const count = badge !== undefined && badge > 0 ? badge : undefined
        return (
          <PressableScale
            key={key}
            accessibilityRole="tab"
            accessibilityLabel={count ? `${label}, ${count > 9 ? 'plus de 9' : count} nouveaux` : label}
            accessibilityState={{ selected: isActive }}
            pressedScale={0.94}
            haptic="selection"
            onPress={() => onChange?.(key)}
            style={{ flex: 1, height: BOTTOM_NAV_HEIGHT, alignItems: 'center', justifyContent: 'center', gap: LABEL_GAP }}
          >
            <IconComponent size={24} weight={isActive ? 'fill' : 'regular'} color={color} />
            <Text variant="caption" weight={isActive ? '600' : undefined} color={color} numberOfLines={1}>
              {label}
            </Text>
            {count && <CountBadge count={count} style={{ position: 'absolute', top: BADGE_TOP, left: '50%', marginLeft: 2 }} />}
          </PressableScale>
        )
      })}
    </View>
  )
}

/**
 * `tabBar` des `Tabs` d'expo-router. Titre et badge viennent des options de chaque écran, l'icône de `icons`
 * (clé : nom de route). Toucher l'onglet actif émet `tabPress`, ce qui
 * remonte la liste en haut (`useScrollToTop`).
 */
export function JoTabBar({ state, descriptors, emitter, navigateToTab, icons }: BottomTabBarProps & { icons: Record<string, Icon> }) {
  const items = state.routes.map((route) => {
    const options = descriptors[route.key]?.options
    const icon = icons[route.name]
    if (!icon) throw new Error(`JoTabBar : icône manquante pour l'onglet « ${route.name} ».`)
    return {
      key: route.key,
      label: options?.title ?? route.name,
      icon,
      badge: typeof options?.tabBarBadge === 'number' ? options.tabBarBadge : undefined,
    }
  })
  const active = state.routes[state.index]?.key ?? ''
  return (
    <BottomNav
      items={items}
      active={active}
      onChange={(key) => {
        const route = state.routes.find((candidate) => candidate.key === key)
        if (!route) return
        const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
        if (key !== active && !event.defaultPrevented) navigateToTab(route.key)
      }}
    />
  )
}
