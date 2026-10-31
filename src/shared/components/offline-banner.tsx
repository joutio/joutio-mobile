import { useNetworkState } from "expo-network";
import { WifiSlash } from "phosphor-react-native";
import { View } from "react-native";
import { JoBanner } from "@/ui/jo/jo-banner";
import { useNativeTheme } from "@/ui/theme";

/** Bannière hors connexion : disparaît seule au retour du réseau. */
export function OfflineBanner() {
  const { colors } = useNativeTheme();
  const network = useNetworkState();
  if (network.isConnected !== false) return null;
  return (
    <View style={{ marginTop: 8, marginRight: 8 }}>
      <JoBanner
        tone="error"
        icon={<WifiSlash size={24} color={colors.danger} />}
        title="Pas de connexion"
        message="Le contenu se charge dès ton retour en ligne."
      />
    </View>
  );
}
