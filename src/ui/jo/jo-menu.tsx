import { Modal, Pressable, StyleSheet, View } from "react-native";
import type { ReactNode } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";

export interface JoMenuItem {
  label: string;
  icon?: ReactNode;
  destructive?: boolean;
  onPress: () => void;
}

interface JoMenuProps {
  visible: boolean;
  onClose: () => void;
  items: JoMenuItem[];
}

/** Menu contextuel de `Jo Menu`, ancré sous l'action de la barre de titre. */
export function JoMenu({ visible, onClose, items }: JoMenuProps) {
  const { colors } = useNativeTheme();
  const { top } = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <Pressable
        accessibilityLabel="Fermer"
        onPress={onClose}
        style={StyleSheet.absoluteFill}
      />
      <View
        accessibilityRole="menu"
        style={[
          styles.menu,
          {
            top: top + 52,
            backgroundColor: colors.raised,
            borderColor: colors.border,
            boxShadow: colors.shadow,
          },
        ]}
      >
        {items.map((item) => (
          <Pressable
            key={item.label}
            accessibilityRole="menuitem"
            onPress={() => {
              onClose();
              item.onPress();
            }}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: pressed ? colors.hover : "transparent" },
            ]}
          >
            <AppText
              variant="body"
              tone={item.destructive ? "danger" : "default"}
              style={styles.label}
            >
              {item.label}
            </AppText>
            {item.icon}
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: "absolute",
    right: 8,
    width: 240,
    padding: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  row: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  label: { flex: 1 },
});
