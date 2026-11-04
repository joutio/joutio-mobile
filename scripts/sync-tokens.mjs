// Copie les tokens natifs générés par le lab (design/tokens/build.mjs) dans l'app, sans les modifier.
// `--check` échoue si la copie diffère de la source (kit mobile, étape 0 : tokens générés, jamais recopiés).
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = resolve(ROOT, '../../design/tokens/tokens.native.ts')
const TARGET = resolve(ROOT, 'src/design-system/tokens.generated.ts')
/** Copie JSON pour app.config.ts, qui ne charge pas de module TypeScript. */
const TARGET_JSON = resolve(ROOT, 'src/design-system/tokens.generated.json')

/** Le littéral `tokens` du fichier généré est du JSON valide. */
const toJson = (ts) => {
  const body = ts.slice(ts.indexOf('{', ts.indexOf('export const tokens')), ts.lastIndexOf('} as const') + 1)
  return `${JSON.stringify(JSON.parse(body), null, 2)}\n`
}

if (!existsSync(SOURCE)) {
  console.error(`Source introuvable : ${SOURCE}. Lancer « npm run tokens » dans design/ d'abord.`)
  process.exit(1)
}

const source = readFileSync(SOURCE, 'utf8')
if (process.argv.includes('--check')) {
  const target = existsSync(TARGET) ? readFileSync(TARGET, 'utf8') : ''
  const json = existsSync(TARGET_JSON) ? readFileSync(TARGET_JSON, 'utf8') : ''
  if (target !== source || json !== toJson(source)) {
    console.error('tokens.generated.ts diffère de design/tokens/tokens.native.ts : lancer « npm run tokens:sync ».')
    process.exit(1)
  }
  console.log('Tokens à jour.')
} else {
  writeFileSync(TARGET, source)
  writeFileSync(TARGET_JSON, toJson(source))
  console.log(`Tokens copiés dans ${TARGET}.`)
}
