import { View } from "react-native";
import { JoutioMark } from "../logo";
import { AppText } from "../text";

/** Lockup Joutio : mark 32 + wordmark Geist 20/24, comme `logo-lockup.svg`. */
export function JoLockup() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <JoutioMark size={32} />
      <AppText
        style={{
          fontFamily: "Geist_700Bold",
          fontSize: 20,
          lineHeight: 24,
          letterSpacing: -1,
        }}
      >
        joutio
      </AppText>
    </View>
  );
}
