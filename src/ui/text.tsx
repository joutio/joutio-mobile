import { Text, type TextProps, type TextStyle } from "react-native";
import { typography, type TypographyToken } from "./tokens";
import { useNativeTheme } from "./theme";

export type TextVariant =
  | "display"
  | "largeTitle"
  | "title"
  | "title1"
  | "title2"
  | "headline"
  | "body"
  | "callout"
  | "footnote"
  | "caption"
  | "label"
  | "numeric";

export type TextTone =
  | "default"
  | "secondary"
  | "tertiary"
  | "accent"
  | "danger"
  | "success"
  | "inverse";

export type TextWeight = "regular" | "medium" | "semibold" | "bold";

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  tone?: TextTone;
  weight?: TextWeight;
}

const VARIANT_TOKEN: Record<TextVariant, TypographyToken> = {
  display: "display",
  largeTitle: "largeTitle",
  title: "title1",
  title1: "title1",
  title2: "title2",
  headline: "headline",
  body: "body",
  callout: "callout",
  footnote: "footnote",
  caption: "caption",
  label: "caption",
  numeric: "numeric",
};

const WEIGHT_VALUE: Record<TextWeight, 400 | 500 | 600 | 700> = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

function fontFamily(font: "sans" | "mono", weight: 400 | 500 | 600 | 700): string {
  if (font === "mono") {
    if (weight === 400) return "GeistMono_400Regular";
    if (weight === 500) return "GeistMono_500Medium";
    if (weight === 600) return "GeistMono_600SemiBold";
    return "GeistMono_700Bold";
  }
  if (weight === 400) return "Geist_400Regular";
  if (weight === 500) return "Geist_500Medium";
  if (weight === 600) return "Geist_600SemiBold";
  return "Geist_700Bold";
}

export function AppText({
  variant = "body",
  tone = "default",
  weight,
  style,
  ...props
}: AppTextProps) {
  const theme = useNativeTheme();
  const { colors } = theme;
  const token = typography[VARIANT_TOKEN[variant]];
  const resolvedWeight = weight ? WEIGHT_VALUE[weight] : (token.weight as 400 | 500 | 600 | 700);

  const color =
    tone === "secondary"
      ? colors.secondaryLabel
      : tone === "tertiary"
        ? colors.tertiaryLabel
        : tone === "accent"
          ? colors.accentInk
          : tone === "danger"
            ? colors.danger
            : tone === "success"
              ? colors.success
              : tone === "inverse"
                ? colors.onAccent
                : colors.label;

  return (
    <Text
      allowFontScaling
      maxFontSizeMultiplier={1.4}
      {...props}
      style={[
        {
          color,
          fontFamily: fontFamily(token.font, resolvedWeight),
          fontSize: token.size,
          lineHeight: token.lineHeight,
          letterSpacing: Number((token.letterSpacing * token.size).toFixed(2)),
          fontVariant: token.font === "mono" ? ["tabular-nums"] : undefined,
        } satisfies TextStyle,
        style,
      ]}
    />
  );
}
