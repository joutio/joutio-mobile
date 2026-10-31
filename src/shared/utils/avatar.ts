import { Avatar, Style, type StyleDefinition } from "@dicebear/core";

export type AvatarStyleId = "micah" | "lorelei" | "notionists";

export type AvatarConfig = { style?: string } & Record<string, string | undefined>;

export const BASE_BACKGROUND = "#e4e4e7";

export const AVATAR_BACKGROUNDS = [
  "#e4e4e7",
  "#dbeafe",
  "#dcfce7",
  "#fef9c3",
  "#fae8ff",
  "#ffe4e6",
];

/** Définitions chargées à la demande : les JSON pèsent jusqu'à 364 Ko. */
const LOADERS: Record<AvatarStyleId, () => unknown> = {
  micah: () => require("@dicebear/styles/micah.json"),
  lorelei: () => require("@dicebear/styles/lorelei.json"),
  notionists: () => require("@dicebear/styles/notionists.json"),
};

const styles = new Map<AvatarStyleId, Style>();
const cache = new Map<string, string>();
const CACHE_LIMIT = 300;

function styleOf(id: AvatarStyleId): Style {
  const existing = styles.get(id);
  if (existing) return existing;
  const style = new Style(LOADERS[id]() as StyleDefinition);
  styles.set(id, style);
  return style;
}

function resolveStyle(id: string | undefined): AvatarStyleId {
  return id === "lorelei" || id === "notionists" ? id : "micah";
}

export function parseAvatarConfig(
  json: string | null | undefined,
): AvatarConfig | null {
  if (!json) return null;
  try {
    const parsed: unknown = JSON.parse(json);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as AvatarConfig)
      : null;
  } catch {
    return null;
  }
}

/** Options compactes persistées (partagées avec le web) vers options DiceBear. */
function dicebearOptions(config: AvatarConfig, styleId: AvatarStyleId) {
  const result: Record<string, unknown> = { borderRadius: 50 };
  for (const [key, value] of Object.entries(config)) {
    if (key === "style" || !value) continue;
    if (key.endsWith("Color")) {
      result[key] = [value];
    } else if (value === "none") {
      if (styleId === "lorelei" && key === "hair") {
        result.hairColor = ["#00000000"];
      } else {
        result[`${key}Probability`] = 0;
      }
    } else {
      result[`${key}Variant`] = [value];
      result[`${key}Probability`] = 100;
    }
  }
  if (styleId === "lorelei" && config.hairColor) {
    result.beardColor = [config.hairColor];
  }
  return result;
}

/** SVG d'un avatar configuré, `null` pour l'avatar de base. */
export function avatarSvg(
  json: string | null | undefined,
  seed: string,
): string | null {
  const config = parseAvatarConfig(json);
  if (!config || config.style === "base") return null;
  const key = `${seed}:${json}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const styleId = resolveStyle(config.style);
  const svg = new Avatar(styleOf(styleId), {
    seed,
    ...dicebearOptions(config, styleId),
  }).toString();
  if (cache.size >= CACHE_LIMIT) cache.clear();
  cache.set(key, svg);
  return svg;
}
