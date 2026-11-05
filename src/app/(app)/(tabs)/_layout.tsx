import { Tabs } from 'expo-router/js-tabs'
import { CompassIcon, HouseIcon, JoTabBar, SwordIcon, UserIcon, UsersIcon, type Icon } from '@/design-system'
import { splitChallenges, useChallengesRealtime, useMyChallenges } from '@/features/challenges'
import { useMe } from '@/features/me'
import { useNotificationsRealtime } from '@/features/notifications'

/** Navigation principale (`accueil.md` § 3) : 5 onglets, dans cet ordre. */
const TABS: { name: string; title: string; icon: Icon }[] = [
  { name: 'home', title: 'Accueil', icon: HouseIcon },
  { name: 'topics', title: 'Sujets', icon: CompassIcon },
  { name: 'social', title: 'Social', icon: UsersIcon },
  { name: 'challenges', title: 'Défis', icon: SwordIcon },
  { name: 'profile', title: 'Profil', icon: UserIcon },
]

const ICONS = Object.fromEntries(TABS.map((tab) => [tab.name, tab.icon]))

export default function TabsLayout() {
  const userId = useMe(true).data?.userId ?? ''
  // Badge Défis : défis reçus en attente, tenus à jour par le flux personnel STOMP.
  const challenges = useMyChallenges(Boolean(userId))
  useChallengesRealtime()
  // Cloche : boîte et compteur rafraîchis par le flux personnel.
  useNotificationsRealtime()
  const received = splitChallenges(challenges.data, userId).received.length
  return (
    <Tabs tabBar={(props) => <JoTabBar {...props} icons={ICONS} />} screenOptions={{ headerShown: false }}>
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
