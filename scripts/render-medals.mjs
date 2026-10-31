/**
 * Pré-rend les médailles et rubans de `design/assets` : `SvgXml` les parsait en JS à chaque
 * montage, avec une centaine de nœuds natifs par médaille.
 * Usage : `npm run render:medals`.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const design = join(root, "..", "..", "design", "assets");
const out = join(root, "assets", "medals");

const SETS = [
  { dir: "badge", width: 360 },
  { dir: "ruban", width: 660 },
];

for (const { dir, width } of SETS) {
  for (const file of readdirSync(join(design, dir))) {
    if (!file.endsWith(".svg")) continue;
    const svg = readFileSync(join(design, dir, file), "utf8");
    const png = new Resvg(svg, { fitTo: { mode: "width", value: width } })
      .render()
      .asPng();
    writeFileSync(join(out, file.replace(".svg", ".png")), png);
  }
}
