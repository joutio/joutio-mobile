import { useEffect, useState, type ComponentRef, type RefObject } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { WarningCircle, XCircle } from "@/ui/phosphor";
import { haptic } from "@/lib/haptics";
import { AppText } from "../text";
import { useNativeTheme } from "../theme";

interface JoFieldProps extends Omit<TextInputProps, "style"> {
  label?: string;
  counter?: string;
  error?: string | null;
  help?: string;
  onClear?: () => void;
  inputRef?: RefObject<ComponentRef<typeof TextInput> | null>;
}

/**
 * Port de `design/assets/components/Jo Field.dc.html` (variante texte).
 * Hauteur 52, radius 12, fond raised, padding 12/8/12/16, focus ring accent 2 px.
 */
export function JoField({
  label,
  counter,
  error,
  help,
  onClear,
  inputRef,
  value,
  editable = true,
  onFocus,
  onBlur,
  ...props
}: JoFieldProps) {
  const theme = useNativeTheme();
  const { colors } = theme;
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(error);

  useEffect(() => {
    if (hasError) haptic("error");
  }, [hasError]);

  const showClear = Boolean(value) && !hasError && editable;

  return (
    <View style={styles.root}>
      {label ? (
        <View style={styles.labelRow}>
          <AppText
            variant="callout"
            weight="semibold"
            style={{ fontSize: 14, lineHeight: 20 }}
          >
            {label}
          </AppText>
          {counter ? (
            <AppText
              variant="footnote"
              tone={hasError ? "danger" : "secondary"}
              style={{
                fontFamily: "GeistMono_500Medium",
                fontSize: 12,
                lineHeight: 16,
              }}
            >
              {counter}
            </AppText>
          ) : null}
        </View>
      ) : null}

      <View
        style={[
          styles.field,
          {
            backgroundColor: colors.raised,
            opacity: editable ? 1 : 0.4,
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          value={value}
          editable={editable}
          placeholderTextColor={colors.secondaryLabel}
          selectionColor={colors.accent}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[
            styles.input,
            {
              color: colors.label,
            },
          ]}
          {...props}
        />

        {showClear ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Effacer"
            hitSlop={8}
            onPress={onClear}
            style={styles.clear}
          >
            <XCircle size={20} weight="fill" color={colors.secondaryLabel} />
          </Pressable>
        ) : null}

        {hasError || focused ? (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              styles.ring,
              { borderColor: hasError ? colors.danger : colors.accent },
            ]}
          />
        ) : null}
      </View>

      {hasError ? (
        <View style={styles.messageRow}>
          <WarningCircle size={16} weight="fill" color={colors.danger} />
          <AppText
            variant="footnote"
            tone="danger"
            style={{ fontSize: 12, lineHeight: 16 }}
          >
            {error}
          </AppText>
        </View>
      ) : help ? (
        <AppText
          variant="footnote"
          tone="secondary"
          style={{ fontSize: 12, lineHeight: 16 }}
        >
          {help}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 8, width: "100%" },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  field: {
    minHeight: 52,
    borderRadius: 12,
    paddingLeft: 16,
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    minWidth: 0,
    padding: 0,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "Geist_400Regular",
  },
  clear: { paddingHorizontal: 4, paddingVertical: 2 },
  ring: {
    borderRadius: 12,
    borderWidth: 2,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});
