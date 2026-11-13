// Haptique de bord (2026-11-13) : un retour à l'arrivée en haut ou en bas d'une page, pendant un geste du joueur,
// jamais au montage, sur une page qui ne défile pas, ni deux fois sur le même bord.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const file = path.join(__dirname, '..', 'src/design-system/mobile/scroll-edge.ts')
const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } })
const mod = { exports: {} }
new Function('module', 'exports', 'require', outputText)(mod, mod.exports, require)
const { scrollEdgeOf, arrivedEdge } = mod.exports

const at = (y, content = 2000, viewport = 800, inset = { top: 0, bottom: 0 }) => ({
  contentOffset: { x: 0, y },
  contentSize: { width: 0, height: content },
  layoutMeasurement: { width: 0, height: viewport },
  contentInset: inset,
})

assert.equal(scrollEdgeOf(at(0)), 'top')
assert.equal(scrollEdgeOf(at(-30)), 'top', 'rebond iOS en haut')
assert.equal(scrollEdgeOf(at(600)), null)
assert.equal(scrollEdgeOf(at(1200)), 'bottom')
assert.equal(scrollEdgeOf(at(1260)), 'bottom', 'rebond iOS en bas')
assert.equal(scrollEdgeOf(at(0, 500)), null, 'page qui ne défile pas')
// Inset bas (tab bar native iOS) : le bas est atteint quand le contenu finit au-dessus de la barre.
assert.equal(scrollEdgeOf(at(1200, 2000, 800, { top: 0, bottom: 80 })), null)
assert.equal(scrollEdgeOf(at(1280, 2000, 800, { top: 0, bottom: 80 })), 'bottom')
// Inset haut (en-tête natif) : le haut est à -inset.
assert.equal(scrollEdgeOf(at(-100, 2000, 800, { top: 100, bottom: 0 })), 'top')

assert.equal(arrivedEdge(null, 'bottom', true), 'bottom')
assert.equal(arrivedEdge(null, 'top', true), 'top')
assert.equal(arrivedEdge('bottom', 'bottom', true), null, 'une fois par arrivée')
assert.equal(arrivedEdge(null, 'top', false), null, 'retour en haut programmé')
assert.equal(arrivedEdge('top', null, true), null)

// Branchée sur les conteneurs partagés.
const SRC = path.join(__dirname, '..', 'src/design-system/mobile')
for (const f of ['screen.tsx', 'drag-to-load-more.tsx', 'tab-page.tsx']) assert.match(fs.readFileSync(path.join(SRC, f), 'utf8'), /useEdgeHaptics/, `${f} doit utiliser useEdgeHaptics`)
assert.match(fs.readFileSync(path.join(SRC, 'parallax-screen.tsx'), 'utf8'), /arrivedEdge/)
console.log('edge-haptics: ok')
