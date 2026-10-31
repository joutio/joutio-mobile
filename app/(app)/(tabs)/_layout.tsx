import { Redirect, Tabs } from "expo-router";
import { useMe } from "@/features/auth/hooks/useMe";
import { ChallengesTabBadge } from "@/features/challenges/components/challenges-tab-badge";
import { JoTabBar } from "@/ui/jo/jo-tab-bar";

const BADGES = { "(challenges)": <ChallengesTabBadge /> };

export default function TabsLayout() {
  const me = useMe();

  if (me.data && !me.data.onboardingCompleted) {
    return <Redirect href="/(app)/onboarding" />;
  }

  return (
    <Tabs
      tabBar={(props) => <JoTabBar {...props} badges={BADGES} />}
      screenOptions={{ headerShown: false, lazy: true, freezeOnBlur: true }}
    >
      <Tabs.Screen name="(home)" />
      <Tabs.Screen name="(topics)" />
      <Tabs.Screen name="(social)" />
      <Tabs.Screen name="(challenges)" />
      <Tabs.Screen name="(profile)" />
    </Tabs>
  );
}
