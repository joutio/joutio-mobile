// Reprend les actifs du lab (design/public) dans assets/.
// - Logo et carte du monde : SVG tels quels (react-native-svg-transformer).
// - Cadres Elo, médailles et rubans : rendus en PNG (3x), un SVG détaillé par avatar pèserait sur les listes.
// - Images de sujets : copiées telles quelles.
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const LAB = resolve(ROOT, '../../design/public')
const OUT = resolve(ROOT, 'assets')

/** Largeur des PNG rendus : 3x la plus grande taille d'affichage courante. */
const RASTER_WIDTH = { frame: 528, badge: 384, ruban: 480 }

const copy = (from, to) => {
  mkdirSync(dirname(to), { recursive: true })
  copyFileSync(from, to)
}

/** SVG importé comme composant : sans les métadonnées C2PA, que le transformeur ne sait pas lire. */
const copySvg = (from, to) => {
  mkdirSync(dirname(to), { recursive: true })
  const svg = readFileSync(from, 'utf8')
    .replace(/<metadata>[\s\S]*?<\/metadata>/g, '')
    .replace(/\s+xmlns:c2pa="[^"]*"/g, '')
  writeFileSync(to, svg)
}

copySvg(join(LAB, 'brand/logo-mark.svg'), join(OUT, 'brand/logo-mark.svg'))
copySvg(join(LAB, 'brand/world-map.svg'), join(OUT, 'brand/world-map.svg'))

for (const [folder, width] of Object.entries(RASTER_WIDTH)) {
  const dir = join(LAB, 'brand', folder)
  mkdirSync(join(OUT, 'brand', folder), { recursive: true })
  for (const file of readdirSync(dir).filter((name) => name.endsWith('.svg'))) {
    const png = new Resvg(readFileSync(join(dir, file)), { fitTo: { mode: 'width', value: width } }).render().asPng()
    writeFileSync(join(OUT, 'brand', folder, file.replace(/\.svg$/, '.png')), png)
  }
}

for (const file of readdirSync(join(LAB, 'topics'))) copy(join(LAB, 'topics', file), join(OUT, 'topics', file))

console.log('Actifs synchronisés dans assets/.')
