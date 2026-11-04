import { Tabs } from 'expo-router/js-tabs'
import { CompassIcon, HouseIcon, JoTabBar, SwordIcon, UserIcon, UsersIcon, type Icon } from '@/design-system'
import { HOME_MOCKS } from '@/features/home/lib/home-mocks'

/** Navigation principale (`accueil.md` § 3) : 5 onglets, dans cet ordre. */
const TABS: { name: string; title: string; icon: Icon; badge?: number }[] = [
  { name: 'home', title: 'Accueil', icon: HouseIcon },
  { name: 'topics', title: 'Sujets', icon: CompassIcon },
  { name: 'social', title: 'Social', icon: UsersIcon },
  // Mock : défis en attente non exposés en compteur par le BFF (`home-mocks.ts`).
  { name: 'challenges', title: 'Défis', icon: SwordIcon, badge: HOME_MOCKS.pendingChallenges },
  { name: 'profile', title: 'Profil', icon: UserIcon },
]

const ICONS = Object.fromEntries(TABS.map((tab) => [tab.name, tab.icon]))

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <JoTabBar {...props} icons={ICONS} />} screenOptions={{ headerShown: false }}>
      {TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title, tabBarBadge: tab.badge }} />
      ))}
    </Tabs>
  )
}
