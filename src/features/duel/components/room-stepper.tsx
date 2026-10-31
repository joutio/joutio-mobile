import { StyleSheet, View } from "react-native";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";
import type { RoomStatus } from "@/shared/types/bff";

const STEPS = ["Joueurs", "Profils", "Questions", "Lancement"];

function stepIndex(status: RoomStatus): number {
  switch (status) {
    case "WAITING_PLAYERS":
      return 0;
    case "FETCHING_PLAYERS":
      return 1;
    case "FETCHING_PLAYED_QUESTIONS":
    case "FETCHING_QUESTIONS":
      return 2;
    case "CREATING_GAME":
    case "GAME_CREATED":
      return 3;
    case "COMPLETED":
      return 4;
    default:
      return 0;
  }
}

/** Progression de la préparation d'une salle, en jetons Joutio. */
export function RoomStepper({ status }: { status: RoomStatus }) {
  const { colors } = useNativeTheme();
  const active = stepIndex(status);
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {STEPS.map((label, index) => {
          const done = index < active;
          const current = index === active;
          return (
            <View key={label} style={styles.step}>
              <View
                style={[
                  styles.circle,
                  {
                    backgroundColor:
                      done || current ? colors.accent : colors.raised,
                  },
                ]}
              >
                <AppText
                  variant="caption"
                  weight="bold"
                  style={{ color: done || current ? colors.onAccent : colors.label }}
                >
                  {done ? "✓" : index + 1}
                </AppText>
              </View>
              {index < STEPS.length - 1 ? (
                <View
                  style={[
                    styles.line,
                    { backgroundColor: done ? colors.accent : colors.raised },
                  ]}
                />
              ) : null}
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: "row" }}>
        {STEPS.map((label, index) => (
          <AppText
            key={label}
            variant="caption"
            tone={index <= active ? "default" : "secondary"}
            style={{ flex: 1, textAlign: "center" }}
          >
            {label}
          </AppText>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  step: { flex: 1, flexDirection: "row", alignItems: "center" },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  line: { height: 2, flex: 1 },
});
