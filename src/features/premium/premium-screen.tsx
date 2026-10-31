import { ScrollView, StyleSheet, View } from "react-native";
import {
  ChartLineUp,
  CircleDashed,
  CrownSimple,
  Lightning,
  Prohibit,
} from "@/ui/phosphor";
import { JoListRow } from "@/ui/jo/jo-list-row";
import { JoPill } from "@/ui/jo/jo-pill";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";

/** Premium annoncé : aucun achat, aucun prix en V1. */
export function PremiumScreen() {
  const { colors } = useNativeTheme();
  const icon = { size: 20, color: colors.secondaryLabel };
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <View style={styles.heading}>
        <View style={[styles.crown, { backgroundColor: colors.warm }]}>
          <CrownSimple size={32} color={colors.accent} weight="fill" />
        </View>
        <AppText variant="title1" weight="bold" style={styles.centered}>
          Joue sans pub, défie qui tu veux
        </AppText>
        <JoPill label="Bientôt" />
      </View>
      <View style={[styles.list, { backgroundColor: colors.surface }]}>
        <JoListRow label="Aucune publicité" control="none" icon={<Prohibit {...icon} />} />
        <JoListRow
          label="20 défis et 20 salons ouverts"
          control="none"
          icon={<Lightning {...icon} />}
        />
        <JoListRow
          label="Statistiques par sujet"
          control="none"
          icon={<ChartLineUp {...icon} />}
        />
        <JoListRow
          label="Anneau ambre autour de ton avatar"
          control="none"
          icon={<CircleDashed {...icon} />}
          last
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 24, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
  heading: { alignItems: "center", gap: 8 },
  crown: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  centered: { textAlign: "center" },
  list: { borderRadius: 16, overflow: "hidden" },
});
