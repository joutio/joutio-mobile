/**
 * Génère les positions des pays sur la carte de matchmaking, dans le repère de
 * `world-map-data.ts`. Usage : `npm run generate:centroids`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { geoCentroid } from "d3-geo";
import countries from "i18n-iso-countries";
import { feature } from "topojson-client";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const atlas = JSON.parse(
  readFileSync(require.resolve("world-atlas/countries-110m.json"), "utf8"),
);
for (const locale of ["fr", "en"]) {
  countries.registerLocale(
    JSON.parse(readFileSync(require.resolve(`i18n-iso-countries/langs/${locale}.json`), "utf8")),
  );
}

// Projection équirectangulaire de `design/matchmaking-map.html`, centrée sur (950, 500).
const SCALE = 840 / Math.PI;
const project = ([lon, lat]) => [
  Math.round(950 + (SCALE * lon * Math.PI) / 180),
  Math.round(500 - (SCALE * lat * Math.PI) / 180),
];

// Centroïde faussé par un territoire lointain : capitale ou métropole à la place.
const OVERRIDES = { FR: [2.35, 46.6], US: [-98, 39], NO: [9, 61], RU: [50, 57] };

const entries = {};
for (const country of feature(atlas, atlas.objects.countries).features) {
  const code = countries.numericToAlpha2(country.id);
  if (!code || country.id === "010") continue;
  entries[code] = {
    name: countries.getName(code, "fr", { select: "official" }),
    en: countries.getName(code, "en", { select: "official" }),
    at: project(OVERRIDES[code] ?? geoCentroid(country)),
  };
}

const rows = Object.entries(entries)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([code, { name, en, at }]) =>
    `  ${code}: { name: ${JSON.stringify(name)}, en: ${JSON.stringify(en)}, at: [${at}] },`)
  .join("\n");

writeFileSync(
  join(root, "src/features/duel/components/country-centroids.ts"),
  `/** Généré par \`npm run generate:centroids\`, ne pas modifier à la main. */
export interface CountryPoint {
  name: string;
  en: string;
  at: readonly [number, number];
}

export const COUNTRIES: Record<string, CountryPoint> = {
${rows}
};
`,
);
