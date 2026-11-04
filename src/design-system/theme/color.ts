/**
 * Équivalents natifs de `color-mix(in oklab, …)` et des opacités Tailwind (`bg-jo-accent/16`) du lab.
 * Entrées : hex (#RGB, #RRGGBB) ou `rgba(r,g,b,a)`, comme dans les tokens générés.
 */
type Rgba = [number, number, number, number]

const parse = (color: string): Rgba => {
  if (color === 'transparent') return [0, 0, 0, 0]
  if (color.startsWith('#')) {
    const hex = color.length === 4 ? color.replace(/[0-9a-f]/gi, (c) => c + c).slice(1) : color.slice(1)
    const n = Number.parseInt(hex.slice(0, 6), 16)
    const a = hex.length === 8 ? Number.parseInt(hex.slice(6), 16) / 255 : 1
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a]
  }
  const parts = color.match(/[\d.]+/g)?.map(Number) ?? []
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 1]
}

const format = ([r, g, b, a]: Rgba) => `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${Math.round(a * 1000) / 1000})`

const toLinear = (c: number) => {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}
const fromLinear = (v: number) => {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.max(0, v) ** (1 / 2.4) - 0.055
  return Math.min(255, Math.max(0, c * 255))
}

const toOklab = ([r, g, b]: Rgba): [number, number, number] => {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)]
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

const fromOklab = ([L, A, B]: [number, number, number]): [number, number, number] => {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3
  return [
    fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ]
}

/** `color` à l'opacité `amount` (0..1), comme `bg-jo-accent/16` → `alpha(accent, 0.16)`. */
export function alpha(color: string, amount: number): string {
  const [r, g, b, a] = parse(color)
  return format([r, g, b, a * amount])
}

/** `color-mix(in oklab, a weight, b)` : `weight` (0..1) est la part de `a`. Alpha prémultiplié, comme CSS. */
export function mix(a: string, b: string, weight: number): string {
  const ca = parse(a)
  const cb = parse(b)
  const w = Math.min(1, Math.max(0, weight))
  const outAlpha = ca[3] * w + cb[3] * (1 - w)
  if (outAlpha === 0) return format([0, 0, 0, 0])
  const la = toOklab(ca)
  const lb = toOklab(cb)
  const blended = la.map((v, i) => (v * ca[3] * w + (lb[i] ?? 0) * cb[3] * (1 - w)) / outAlpha) as [number, number, number]
  const [r, g, bl] = fromOklab(blended)
  return format([r, g, bl, outAlpha])
}

/** Teinte de fond légère dérivée d'une couleur de token (`tint` du lab : 16 %). */
export const tint = (color: string) => mix(color, 'transparent', 0.16)

/** Couleur d'univers assez contrastée pour du texte (`categoryInk` du lab : 70 % vers le texte). */
export const categoryInk = (category: string, text: string) => mix(category, text, 0.7)
