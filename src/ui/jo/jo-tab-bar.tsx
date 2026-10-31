import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import {
  House,
  Lightning,
  SquaresFour,
  User,
  UsersThree,
  type Icon,
} from "@/ui/phosphor";
import { haptic } from "@/lib/haptics";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";

const BAR_HEIGHT = 49;

const TABS: Record<string, { label: string; icon: Icon }> = {
  "(home)": { label: "Accueil", icon: House },
  "(topics)": { label: "Sujets", icon: SquaresFour },
  "(social)": { label: "Social", icon: UsersThree },
  "(challenges)": { label: "Défis", icon: Lightning },
  "(profile)": { label: "Profil", icon: User },
};

interface JoTabBarProps extends BottomTabBarProps {
  /** Pastilles par route, rendues à part pour ne pas redessiner la barre. */
  badges?: Partial<Record<string, ReactNode>>;
}

/** Barre d'onglets de `design/assets/components/Jo Tab Bar.dc.html`. */
export function JoTabBar({
  state,
  emitter,
  navigateToTab,
  insets,
  badges,
}: JoTabBarProps) {
  const { colors } = useNativeTheme();

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        {
          height: BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          backgroundColor: colors.glass,
          borderTopColor: colors.separator,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const focused = state.index === index;
        const Glyph = tab.icon;
        const color = focused ? colors.accentInk : colors.secondaryLabel;

        const press = () => {
          const event = emitter.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (focused || event.defaultPrevented) return;
          haptic("selection");
          navigateToTab(route.key);
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: focused }}
            onPress={press}
            style={({ pressed }) => [
              styles.tab,
              pressed && styles.pressed,
            ]}
          >
            <Glyph
              size={24}
              color={color}
              weight={focused ? "fill" : "regular"}
            />
            <AppText
              variant="caption"
              weight={focused ? "semibold" : "medium"}
              style={{ color }}
            >
              {tab.label}
            </AppText>
            {badges?.[route.name]}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Compteur ambre d'un onglet : `top:4px`, à 4 px à droite du centre. */
export function JoTabBadge({ count }: { count: number }) {
  const { colors } = useNativeTheme();
  if (count <= 0) return null;
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.accent, borderColor: colors.background },
      ]}
    >
      <AppText
        variant="caption"
        weight="semibold"
        style={[styles.badgeText, { color: colors.onAccent }]}
      >
        {count > 9 ? "9+" : count}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    paddingHorizontal: 8,
    borderTopWidth: 1,
  },
  tab: {
    flex: 1,
    height: BAR_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  pressed: {
    transform: [{ scale: 0.94 }],
  },
  badge: {
    position: "absolute",
    top: 2,
    left: "50%",
    marginLeft: 2,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 4,
    borderRadius: 9999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    lineHeight: 18,
  },
});
