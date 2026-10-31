import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { AppText } from "@/ui/text";
import { RIBBON_IMAGE } from "./medal-assets";

const INK: Record<string, string> = {
  FER: "#E8EAEE",
  BRONZE: "#35190A",
  ARGENT: "#262B34",
  OR: "#4A2F00",
  PLATINE: "#1A2342",
  EMERAUDE: "#04281A",
  DIAMANT: "#0A2A44",
};

interface JoTitleRibbonProps {
  tier: string;
  text: string;
  width?: number;
}

/** Ruban de titre, teinté par le métal du palier. */
export function JoTitleRibbon({ tier, text, width = 220 }: JoTitleRibbonProps) {
  const key = tier.toUpperCase();
  const height = Math.round((width * 56) / 220);
  return (
    <View style={{ width, height }}>
      <Image
        source={RIBBON_IMAGE[key] ?? RIBBON_IMAGE.OR}
        style={{ width, height }}
        contentFit="contain"
        transition={0}
      />
      <View style={styles.label}>
        <AppText
          weight="bold"
          numberOfLines={1}
          style={{
            color: INK[key] ?? INK.OR,
            fontSize: Math.max(11, Math.round((width * 12) / 220)),
            lineHeight: Math.max(14, Math.round((width * 16) / 220)),
          }}
        >
          {text}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    position: "absolute",
    left: "16%",
    right: "16%",
    top: 0,
    height: "83%",
    alignItems: "center",
    justifyContent: "center",
  },
});
