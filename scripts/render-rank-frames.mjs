/**
 * Pré-rend les cadres de `design/assets/components/Elo Avatar.dc.html`, en PNG transparents au
 * centre : SVG ne décrit pas les dégradés coniques, et un canvas par avatar pèserait sur les listes.
 * Le canevas couvre -22 %..122 % de l'avatar, le débord du halo le plus large.
 * Usage : `npm run render:frames`.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { crc32, deflateSync } from "node:zlib";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "frames");
const CANVAS = 432;
const OVERFLOW = 0.22;
const UNIT = CANVAS / (1 + 2 * OVERFLOW); // pixels pour 100 % de l'avatar
const CENTER = CANVAS / 2;

const hex = (value) => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
const lerp = (a, b, t) => a + (b - a) * t;
const edge = (d, r) => Math.min(1, Math.max(0, r - d + 0.5)); // disque antialiasé de rayon r

function conic(from, stops) {
  const positioned = stops.every((s) => Array.isArray(s))
    ? stops
    : stops.map((c, i) => [hex(c), 1, i / (stops.length - 1)]);
  return (x, y) => {
    let t = (Math.atan2(x, -y) * 180) / Math.PI - from;
    t = (((t % 360) + 360) % 360) / 360;
    let i = positioned.findIndex((s) => s[2] >= t);
    if (i <= 0) i = 1;
    const [c0, a0, p0] = positioned[i - 1];
    const [c1, a1, p1] = positioned[i];
    const k = p1 === p0 ? 0 : (t - p0) / (p1 - p0);
    return [...c0.map((v, n) => lerp(v, c1[n], k)), lerp(a0, a1, k)];
  };
}

/** Reflet : une couleur dont seule l'opacité varie. */
const shine = (rgb, ...stops) =>
  conic(0, stops.map(([alpha, position]) => [rgb, alpha, position]));

/** `radial-gradient(circle, …)` rayon farthest-corner d'une boîte de débord `spread`. */
function halo(spread, stops) {
  const radius = (0.5 + spread) * Math.SQRT2 * UNIT;
  const limit = (0.5 + spread) * UNIT;
  return (x, y) => {
    const d = Math.hypot(x, y);
    if (d > limit) return null;
    const t = d / radius;
    let i = stops.findIndex((s) => s[2] >= t);
    if (i === -1) return null;
    if (i === 0) return [...stops[0][0], stops[0][1]];
    const [c0, a0, p0] = stops[i - 1];
    const [c1, a1, p1] = stops[i];
    const k = (t - p0) / (p1 - p0);
    return [...c0.map((v, n) => lerp(v, c1[n], k)), lerp(a0, a1, k)];
  };
}

const glow = (rgb, alpha, from, to) => [
  [rgb, alpha, from],
  [rgb, 0, to],
];

const TIERS = {
  bronze: {
    hole: 0.06,
    ring: conic(200, ["#6e3412", "#d4925a", "#8a4a20", "#eab07a", "#7a3e18", "#c27a42", "#6e3412"]),
  },
  argent: {
    hole: 0.065,
    lines: [[0.06, [180, 188, 200], 0.5]],
    ring: conic(200, ["#6f7783", "#eef1f5", "#8C95A3", "#ffffff", "#6f7783", "#c9cfd8", "#6f7783"]),
  },
  or: {
    hole: 0.07,
    halo: halo(0.14, glow([232, 176, 74], 0.34, 0.34, 0.68)),
    lines: [[0.06, [232, 190, 90], 0.55]],
    ring: conic(210, ["#8a6410", "#ffe08a", "#c9971c", "#fff3c4", "#a87a12", "#ffd76a", "#8a6410"]),
  },
  platine: {
    hole: 0.075,
    halo: halo(0.16, glow([150, 170, 220], 0.36, 0.32, 0.68)),
    lines: [[0.06, [190, 204, 238], 0.6]],
    ring: conic(200, ["#56658f", "#eef2fd", "#8C9FC9", "#ffffff", "#65749f", "#d5ddf2", "#56658f"]),
    spin: shine([255, 255, 255], [0, 0], [0, 0.38], [0.85, 0.46], [0, 0.54], [0, 1]),
  },
  emeraude: {
    hole: 0.08,
    halo: halo(0.18, glow([47, 191, 119], 0.4, 0.3, 0.68)),
    lines: [
      [0.11, [95, 220, 158], 0.3],
      [0.06, [95, 220, 158], 0.65],
    ],
    ring: conic(200, ["#0a5e38", "#9df5c9", "#2FBF77", "#e4fff0", "#107446", "#5fdc9e", "#0a5e38"]),
    spin: shine(
      [230, 255, 240],
      [0, 0], [0, 0.3], [0.85, 0.38], [0, 0.46], [0, 0.8], [0.5, 0.86], [0, 0.92], [0, 1],
    ),
  },
  diamant: {
    hole: 0.085,
    halo: halo(0.22, [
      [[120, 200, 255], 0.45, 0.26],
      [[170, 140, 255], 0.18, 0.48],
      [[170, 140, 255], 0, 0.7],
    ]),
    lines: [
      [0.11, [201, 240, 255], 0.35],
      [0.06, [180, 228, 255], 0.75],
    ],
    spin: conic(0, ["#5DB4E2", "#eaf8ff", "#a58cf0", "#5DB4E2", "#c9f0ff", "#7fe0d0", "#ffffff", "#5DB4E2"]),
    counter: shine([255, 255, 255], [0, 0], [0, 0.4], [0.9, 0.47], [0, 0.54], [0, 1]),
  },
};

function over(dst, offset, [r, g, b, a]) {
  const under = dst[offset + 3] / 255;
  const alpha = a + under * (1 - a);
  if (alpha === 0) return;
  for (const [i, v] of [r, g, b].entries()) {
    dst[offset + i] = (v * a + dst[offset + i] * under * (1 - a)) / alpha;
  }
  dst[offset + 3] = alpha * 255;
}

function draw(paint) {
  const data = new Uint8ClampedArray(CANVAS * CANVAS * 4);
  for (let py = 0; py < CANVAS; py += 1) {
    for (let px = 0; px < CANVAS; px += 1) {
      const color = paint(px + 0.5 - CENTER, py + 0.5 - CENTER);
      if (color) over(data, (py * CANVAS + px) * 4, color);
    }
  }
  return data;
}

/** Anneau plein du bord de l'avatar jusqu'au trou central. */
function annulus(gradient, hole) {
  const outer = UNIT / 2;
  const inner = outer - hole * UNIT;
  return (x, y) => {
    const d = Math.hypot(x, y);
    const coverage = edge(d, outer) * (1 - edge(d, inner));
    if (coverage === 0) return null;
    const [r, g, b, a] = gradient(x, y);
    return [r, g, b, a * coverage];
  };
}

function staticLayer({ hole, halo: glowLayer, lines = [], ring }) {
  const outer = UNIT / 2;
  const band = ring ? annulus(ring, hole) : null;
  const stroke = (UNIT / 64) * 0.5;
  return (x, y) => {
    const d = Math.hypot(x, y);
    const layers = [];
    if (glowLayer && d > outer - hole * UNIT) layers.push(glowLayer(x, y));
    for (const [spread, rgb, alpha] of lines) {
      const radius = outer + spread * UNIT;
      const coverage = edge(Math.abs(d - radius), stroke);
      if (coverage > 0) layers.push([...rgb, alpha * coverage]);
    }
    if (band) layers.push(band(x, y));
    let result = null;
    for (const layer of layers) {
      if (!layer) continue;
      if (!result) {
        result = [...layer];
        continue;
      }
      const [r, g, b, a] = layer;
      const alpha = a + result[3] * (1 - a);
      for (const [i, v] of [r, g, b].entries()) {
        result[i] = alpha === 0 ? 0 : (v * a + result[i] * result[3] * (1 - a)) / alpha;
      }
      result[3] = alpha;
    }
    return result;
  };
}

function png(data) {
  const row = CANVAS * 4;
  const raw = Buffer.alloc((row + 1) * CANVAS);
  for (let y = 0; y < CANVAS; y += 1) {
    Buffer.from(data.buffer, y * row, row).copy(raw, y * (row + 1) + 1);
  }
  const chunk = (type, body) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(body.length);
    head.write(type, 4);
    const tail = Buffer.alloc(4);
    tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])));
    return Buffer.concat([head, body, tail]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(CANVAS, 0);
  header.writeUInt32BE(CANVAS, 4);
  header.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const [tier, spec] of Object.entries(TIERS)) {
  writeFileSync(join(OUT, `${tier}.png`), png(draw(staticLayer(spec))));
  if (spec.spin) {
    writeFileSync(join(OUT, `${tier}-spin.png`), png(draw(annulus(spec.spin, spec.hole))));
  }
  if (spec.counter) {
    writeFileSync(join(OUT, `${tier}-counter.png`), png(draw(annulus(spec.counter, spec.hole))));
  }
}
