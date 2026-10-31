import { Platform } from "react-native";
import { Redirect } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useMe } from "@/features/auth/hooks/useMe";
import { usePendingChallenges } from "@/features/challenges/hooks/useChallenges";
import { useNativeTheme } from "@/ui/theme";

export default function TabsLayout() {
  const { colors } = useNativeTheme();
  const { total } = usePendingChallenges();
  const me = useMe();

  if (me.data && !me.data.onboardingCompleted) {
    return <Redirect href="/(app)/onboarding" />;
  }

  return (
    <NativeTabs
      tintColor={colors.accentInk}
      iconColor={colors.secondaryLabel}
      labelStyle={{ fontFamily: "Geist_500Medium", fontSize: 12 }}
      labelVisibilityMode="labeled"
      indicatorColor={colors.accentSoft}
      rippleColor={colors.accentSoft}
      badgeBackgroundColor={colors.accent}
      badgeTextColor={colors.onAccent}
      backgroundColor={Platform.OS === "android" ? colors.background : undefined}
      blurEffect="systemMaterial"
      minimizeBehavior="never"
    >
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Label>Accueil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "house", selected: "house.fill" }}
          md="home"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(topics)">
        <NativeTabs.Trigger.Label>Sujets</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "square.grid.2x2", selected: "square.grid.2x2.fill" }}
          md="grid_view"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(social)">
        <NativeTabs.Trigger.Label>Social</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "person.3", selected: "person.3.fill" }}
          md="group"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(challenges)">
        <NativeTabs.Trigger.Label>Défis</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "bolt", selected: "bolt.fill" }}
          md="bolt"
        />
        <NativeTabs.Trigger.Badge hidden={total === 0}>
          {total > 9 ? "9+" : String(total)}
        </NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(profile)">
        <NativeTabs.Trigger.Label>Profil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "person", selected: "person.fill" }}
          md="person"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
