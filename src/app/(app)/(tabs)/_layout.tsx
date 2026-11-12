import { Tabs } from 'expo-router/js-tabs'
import { NativeTabs, type SFSymbolIcon } from 'expo-router/native-tabs'
import { Platform } from 'react-native'
import { CompassIcon, HouseIcon, JoTabBar, SwordIcon, UserIcon, UsersIcon, type Icon, useTheme } from '@/design-system'
import { splitChallenges, useChallengesRealtime, useMyChallenges } from '@/features/challenges'
import { useMe } from '@/features/me'

/** Navigation principale (`accueil.md` § 3) : 5 onglets, dans cet ordre. */
const TABS: { name: string; title: string; icon: Icon; sf: SFSymbolIcon['sf'] }[] = [
  { name: 'home', title: 'Accueil', icon: HouseIcon, sf: { default: 'house', selected: 'house.fill' } },
  { name: 'topics', title: 'Sujets', icon: CompassIcon, sf: { default: 'safari', selected: 'safari.fill' } },
  { name: 'social', title: 'Social', icon: UsersIcon, sf: { default: 'person.2', selected: 'person.2.fill' } },
  { name: 'challenges', title: 'Défis', icon: SwordIcon, sf: { default: 'figure.fencing', selected: 'figure.fencing' } },
  { name: 'profile', title: 'Profil', icon: UserIcon, sf: { default: 'person.crop.circle', selected: 'person.crop.circle.fill' } },
]

const ICONS = Object.fromEntries(TABS.map((tab) => [tab.name, tab.icon]))

/**
 * iOS : tab bar **native** (`UITabBarController`, Liquid Glass, SF Symbols ; 2026-11-12) — chaque onglet a sa safe
 * area, qui compte la barre, et la première liste de l'écran s'y ajuste seule. Android : `JoTabBar` de Joutio.
 */
export default function TabsLayout() {
  const { colors } = useTheme()
  const userId = useMe(true).data?.userId ?? ''
  // Badge Défis : défis reçus en attente, tenus à jour par le flux personnel STOMP.
  const challenges = useMyChallenges(Boolean(userId))
  useChallengesRealtime()
  const received = splitChallenges(challenges.data, userId).received.length

  if (Platform.OS === 'ios')
    return (
      <NativeTabs tintColor={colors.accent} badgeBackgroundColor={colors.accent}>
        {TABS.map((tab) => (
          <NativeTabs.Trigger key={tab.name} name={tab.name} contentStyle={{ backgroundColor: colors.bg }}>
            <NativeTabs.Trigger.Icon sf={tab.sf} />
            <NativeTabs.Trigger.Label>{tab.title}</NativeTabs.Trigger.Label>
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
          options={{ title: tab.title, tabBarBadge: tab.name === 'challenges' && received > 0 ? received : undefined }}
        />
      ))}
    </Tabs>
  )
}
