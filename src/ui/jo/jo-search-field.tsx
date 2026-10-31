import { useState, type ComponentProps } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { MagnifyingGlass, XCircle } from "@/ui/phosphor";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";

interface JoSearchFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  /** Affiche « Annuler » quand le champ est actif. */
  onCancel?: () => void;
  inputRef?: ComponentProps<typeof TextInput>["ref"];
}

/** Variante `search` de `Jo Field` : 36 px, loupe 18 et effacement. */
export function JoSearchField({
  value,
  onChangeText,
  placeholder,
  autoFocus = false,
  onCancel,
  inputRef,
}: JoSearchFieldProps) {
  const { colors } = useNativeTheme();
  const [focused, setFocused] = useState(autoFocus);
  return (
    <View style={styles.root}>
      <View style={[styles.field, { backgroundColor: colors.raised }]}>
        <MagnifyingGlass size={18} color={colors.secondaryLabel} />
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.secondaryLabel}
          selectionColor={colors.accent}
          returnKeyType="search"
          autoCorrect={false}
          autoFocus={autoFocus}
          accessibilityLabel={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, { color: colors.label }]}
        />
        {value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Effacer"
            hitSlop={12}
            onPress={() => onChangeText("")}
          >
            <XCircle size={18} color={colors.secondaryLabel} weight="fill" />
          </Pressable>
        ) : null}
      </View>
      {onCancel && (focused || value) ? (
        <Pressable accessibilityRole="button" hitSlop={8} onPress={onCancel}>
          <AppText variant="body" style={{ color: colors.accentInk }}>
            Annuler
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: "row", alignItems: "center", gap: 12, flexShrink: 1 },
  field: {
    flex: 1,
    minWidth: 0,
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    fontFamily: "Geist_400Regular",
    fontSize: 16,
  },
});
