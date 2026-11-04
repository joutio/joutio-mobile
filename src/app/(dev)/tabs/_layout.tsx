import { Tabs } from 'expo-router/js-tabs'
import { JoTabBar } from '@/design-system'
import { NAV_ITEMS } from '@/dev/catalog/row2'

const ICONS = Object.fromEntries(NAV_ITEMS.map((item) => [item.key, item.icon]))

/** Aperçu de la navigation principale : Tabs d'expo-router avec la barre custom. */
export default function DevTabsLayout() {
  return (
    <Tabs tabBar={(props) => <JoTabBar {...props} icons={ICONS} />} screenOptions={{ headerShown: false }}>
      {NAV_ITEMS.map((item) => (
        <Tabs.Screen key={item.key} name={item.key} options={{ title: item.label, tabBarBadge: 'badge' in item ? item.badge : undefined }} />
      ))}
    </Tabs>
  )
}
