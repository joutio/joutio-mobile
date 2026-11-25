import { Tabs } from 'expo-router/js-tabs'
import { NativeTabs, type SFSymbolIcon } from 'expo-router/native-tabs'
import { Platform } from 'react-native'
import { CompassIcon, HouseIcon, JoTabBar, SwordIcon, UserIcon, UsersIcon, type Icon, useTheme } from '@/design-system'
import { useDefisBadge } from '@joutio/client/rooms'
import { useT, type MessageKey } from '@/lib/i18n'

/** Navigation principale (`accueil.md` § 3) : 5 onglets, dans cet ordre. */
const TABS: { name: string; title: MessageKey; icon: Icon; sf: SFSymbolIcon['sf'] }[] = [
  { name: 'home', title: 'nav.home', icon: HouseIcon, sf: { default: 'house', selected: 'house.fill' } },
  { name: 'topics', title: 'nav.topics', icon: CompassIcon, sf: { default: 'safari', selected: 'safari.fill' } },
  { name: 'social', title: 'nav.social', icon: UsersIcon, sf: { default: 'person.2', selected: 'person.2.fill' } },
  { name: 'challenges', title: 'nav.challenges', icon: SwordIcon, sf: { default: 'figure.fencing', selected: 'figure.fencing' } },
  { name: 'profile', title: 'nav.profile', icon: UserIcon, sf: { default: 'person.crop.circle', selected: 'person.crop.circle.fill' } },
]

const ICONS = Object.fromEntries(TABS.map((tab) => [tab.name, tab.icon]))

/**
 * iOS : tab bar **native** (`UITabBarController`, Liquid Glass, SF Symbols ; 2026-11-12) — chaque onglet a sa safe
 * area, qui compte la barre, et la première liste de l'écran s'y ajuste seule. Android : `JoTabBar` de Joutio.
 */
export default function TabsLayout() {
  const t = useT()
  const { colors } = useTheme()
  // Badge Défis : défis reçus en attente + salons où l'adversaire attend le joueur (2026-11-16), tenus à jour par le
  // flux personnel STOMP (`useJoutioSync`).
  const received = useDefisBadge().data ?? 0

  if (Platform.OS === 'ios')
    return (
      <NativeTabs tintColor={colors.accent} badgeBackgroundColor={colors.accent}>
        {TABS.map((tab) => (
          <NativeTabs.Trigger key={tab.name} name={tab.name} contentStyle={{ backgroundColor: colors.bg }}>
            <NativeTabs.Trigger.Icon sf={tab.sf} />
            <NativeTabs.Trigger.Label>{t(tab.title)}</NativeTabs.Trigger.Label>
            {tab.name === 'challenges' && received > 0 && <NativeTabs.Trigger.Badge>{String(received)}</NativeTabs.Trigger.Badge>}
          </NativeTabs.Trigger>
        ))}
      </NativeTabs>
    )

  return (
    <Tabs tabBar={(props) => <JoTabBar {...props} icons={ICONS} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{ title: t(tab.title), tabBarBadge: tab.name === 'challenges' && received > 0 ? received : undefined }}
        />
      ))}
    </Tabs>
  )
}
