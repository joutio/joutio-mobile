import { Stack, useRouter } from "expo-router";
import { GearSix, MagnifyingGlass, Plus } from "@/ui/phosphor";
import { ChallengesNavBar } from "@/features/challenges/components/challenges-nav-bar";
import { MarkAllReadButton } from "@/features/notifications/components/mark-all-read-button";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { InlineNavBar } from "@/shared/components/inline-nav-bar";
import { JoIconButton } from "@/ui/jo/jo-icon-button";
import { JoNavBar } from "@/ui/jo/jo-nav-bar";
import { useNativeTheme } from "@/ui/theme";

type StackOptions = NonNullable<
  React.ComponentProps<typeof Stack.Screen>["options"]
>;

/**
 * Chaque onglet garde sa pile. Clés sans parenthèses : sans ancre valide, la pile démarre sur la
 * route au nom le plus court, soit `search` pour Défis et Profil.
 */
export const unstable_settings = {
  home: { anchor: "index" },
  topics: { anchor: "topics" },
  social: { anchor: "social" },
  challenges: { anchor: "challenges" },
  profile: { anchor: "profile" },
};

const ROOT: Record<string, string> = {
  "(home)": "index",
  "(topics)": "topics",
  "(social)": "social",
  "(challenges)": "challenges",
  "(profile)": "profile",
};

function inline(title: string): StackOptions {
  return {
    headerShown: true,
    title,
    header: ({ options, back }) => (
      <InlineNavBar
        title={options.title ?? title}
        canGoBack={Boolean(back)}
        backLabel={back?.title}
        actions={options.headerRight?.({ canGoBack: true })}
      />
    ),
  };
}

function RootBar({ segment }: { segment: string }) {
  const router = useRouter();
  const { colors } = useNativeTheme();
  if (segment === "(home)") {
    return (
      <JoNavBar
        title="Accueil"
        actions={
          <>
            <JoIconButton
              label="Rechercher"
              icon={<MagnifyingGlass size={24} color={colors.label} />}
              onPress={() => router.push("/search")}
            />
            <NotificationBell />
          </>
        }
      />
    );
  }
  if (segment === "(topics)") {
    return (
      <JoNavBar
        title="Sujets"
        actions={
          <>
            <JoIconButton
              label="Créer un sujet"
              icon={<Plus size={24} color={colors.label} />}
              onPress={() => router.push("/(app)/topic-editor")}
            />
            <NotificationBell />
          </>
        }
      />
    );
  }
  if (segment === "(social)") {
    return <JoNavBar title="Social" actions={<NotificationBell />} />;
  }
  if (segment === "(challenges)") return <ChallengesNavBar />;
  return (
    <JoNavBar
      title="Profil"
      actions={
        <JoIconButton
          label="Réglages"
          icon={<GearSix size={24} color={colors.label} />}
          onPress={() => router.push("/settings")}
        />
      }
    />
  );
}

export default function TabStack({ segment }: { segment: string }) {
  const { colors } = useNativeTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name={ROOT[segment]}
        options={{
          headerShown: true,
          header: () => <RootBar segment={segment} />,
        }}
      />
      <Stack.Screen name="topic/[id]" />
      <Stack.Screen name="search" />
      <Stack.Screen name="player/[id]" options={inline("")} />
      <Stack.Screen
        name="notifications"
        options={{
          ...inline("Notifications"),
          headerRight: () => <MarkAllReadButton />,
        }}
      />
      <Stack.Screen name="settings" options={inline("Réglages")} />
      <Stack.Screen name="premium" options={inline("Premium")} />
      <Stack.Screen name="delete-account" options={inline("Suppression")} />
      <Stack.Screen name="me/edit" options={inline("Mon profil")} />
      <Stack.Screen name="me/progression" options={inline("Progression")} />
      <Stack.Screen name="me/badges" options={inline("Badges")} />
      <Stack.Screen name="me/titles" options={inline("Titres")} />
      <Stack.Screen name="me/history" options={inline("Historique")} />
      <Stack.Screen name="me/rewards" options={inline("Récompenses")} />
      <Stack.Screen name="me/streak" options={inline("Série")} />
    </Stack>
  );
}
