// Garde-fou : tout pull-to-refresh vibre (haptic('light')) via l'implémentation partagée.
// Un fichier hors design-system qui pose un RefreshControl ou un onRefresh doit passer par
// useGuardedRefresh / usePageRefresh / useRefreshActive (verrou + haptic), jamais par sa propre logique.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const SRC = path.join(__dirname, '..', 'src')
const SHARED = /useGuardedRefresh|usePageRefresh|useRefreshActive/
const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    return e.isDirectory() ? walk(p) : /\.tsx?$/.test(e.name) ? [p] : []
  })

const offenders = []
for (const file of walk(SRC)) {
  const rel = path.relative(SRC, file)
  if (rel.startsWith('design-system') || rel.startsWith('dev') || rel.startsWith('shared/hooks/use-refresh-active')) continue
  const code = fs.readFileSync(file, 'utf8')
  // `onRefresh` passé à Screen/ParallaxScreen/CollapsibleTabsScreen est couvert par le conteneur partagé.
  const ownControl = /RefreshControl|\brefreshing=/.test(code)
  const ownLock = /(refreshBusy|refreshingManually|setRefreshing)/.test(code)
  if ((ownControl && !SHARED.test(code)) || ownLock) offenders.push(rel)
}
assert.deepEqual(offenders, [], `Pull-to-refresh sans haptic partagé : ${offenders.join(', ')} (voir AGENTS.md § refresh)`)

// Les conteneurs partagés passent tous par useGuardedRefresh.
for (const f of ['design-system/mobile/screen.tsx', 'design-system/mobile/parallax-screen.tsx', 'design-system/mobile/page-refresh.tsx']) {
  assert.match(fs.readFileSync(path.join(SRC, f), 'utf8'), /useGuardedRefresh/, `${f} doit utiliser useGuardedRefresh`)
}
const hook = fs.readFileSync(path.join(SRC, 'design-system/mobile/guarded-refresh.ts'), 'utf8')
assert.match(hook, /haptic\('light'\)/)
console.log('refresh-haptic: ok')
