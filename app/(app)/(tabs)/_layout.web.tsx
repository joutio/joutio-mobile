import { Tabs } from "expo-router";

/** Fallback de debug : `NativeTabs` ne cible que iOS et Android. */
export default function WebTabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="(home)" options={{ title: "Accueil" }} />
      <Tabs.Screen name="(topics)" options={{ title: "Sujets" }} />
      <Tabs.Screen name="(social)" options={{ title: "Social" }} />
      <Tabs.Screen name="(challenges)" options={{ title: "Défis" }} />
      <Tabs.Screen name="(profile)" options={{ title: "Profil" }} />
    </Tabs>
  );
}
