/**
 * Vérifie que `src/ui/tokens.ts` reprend les couleurs de `design/tokens.json`.
 * Usage : `npm run check:tokens`.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const design = readFileSync(join(root, "..", "..", "design", "tokens.json"), "utf8");
const tokens = readFileSync(join(root, "src", "ui", "tokens.ts"), "utf8").toLowerCase();

const missing = [...new Set(design.match(/#[0-9a-fA-F]{6}\b/g) ?? [])].filter(
  (hex) => !tokens.includes(hex.toLowerCase()),
);

if (missing.length > 0) {
  console.error(`Couleurs absentes de tokens.ts : ${missing.join(", ")}`);
  process.exit(1);
}
console.log("Jetons alignés sur design/tokens.json.");
