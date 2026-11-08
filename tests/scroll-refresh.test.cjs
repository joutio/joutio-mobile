const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')

function harness(callback) {
  const states = [], haptics = []
  const mocks = {
    react: { useRef: value => ({ current: value }), useState: value => [value, next => states.push(next)] },
    'react-native-reanimated': { useSharedValue: value => ({ value }), useEvent: fn => fn },
    '../haptics': { haptic: kind => haptics.push(kind) },
    '../theme/theme-provider': { useTheme: () => ({ colors: { muted: 'gray', surface: 'white' } }) },
  }
  const code = ts.transpileModule(fs.readFileSync(require.resolve('../src/design-system/mobile/page-refresh.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(id => mocks[id], module, module.exports)
  return { refresh: module.exports.usePageRefresh(callback), states, haptics }
}
const settled = () => new Promise(resolve => setImmediate(resolve))

test('system indicator stays enabled and duplicate native events start one request', async () => {
  let finish, calls = 0
  const request = new Promise(resolve => { finish = resolve })
  const h = harness(() => { calls++; return request })
  assert.equal(h.refresh.tabProps.refreshIndicatorHidden, false)
  h.refresh.tabProps.onRefresh()
  h.refresh.tabProps.onRefresh()
  await settled()
  assert.equal(calls, 1)
  assert.deepEqual(h.states, [true])
  assert.deepEqual(h.haptics, ['light'])
  finish()
  await settled()
  assert.deepEqual(h.states, [true, false])
  h.refresh.tabProps.onRefresh()
  await settled()
  assert.equal(calls, 2)
})

test('failure releases the spinner and allows another pull', async () => {
  const h = harness(() => { throw new Error('offline') })
  h.refresh.tabProps.onRefresh()
  await settled()
  assert.deepEqual(h.states, [true, false])
  h.refresh.tabProps.onRefresh()
  await settled()
  assert.deepEqual(h.states, [true, false, true, false])
})

test('pages without a callback do not arm refresh', () => {
  assert.equal(harness().refresh.tabProps.onRefresh, undefined)
})

// Execute the native callback's condition against the platform's DOWN/MOVE
// lifecycle: SwipeRefreshLayout cannot track MOVE if DOWN was rejected.
test('Android accepts the initial pointer, then rejects horizontal drags and scrolled pages', () => {
  const source = fs.readFileSync(require.resolve('../node_modules/react-native-collapsible-tabs-native/android/src/main/java/com/collapsibletabs/ui/CollapsibleTabsHostView.kt'), 'utf8')
  const block = source.slice(source.indexOf('refreshLayout.setOnChildScrollUpCallback'))
  const condition = block.match(/\n\s+(gestureDirection[^\n]+)/)[1].replace('(activeScrollView()?.scrollY ?: 0)', 'scrollY')
  const canScrollUp = new Function('gestureDirection', 'horizontalChildDrag', 'headerOffset', 'scrollY', `return ${condition}`)
  assert.equal(canScrollUp(0, false, 0, 0), false, 'DOWN must record the pointer before direction is known')
  assert.equal(canScrollUp(2, false, 0, 0), false, 'vertical MOVE at top must reach refresh')
  assert.equal(canScrollUp(1, false, 0, 0), true, 'horizontal MOVE belongs to the pager')
  assert.equal(canScrollUp(2, true, 0, 0), true, 'nested carousel keeps the gesture')
  assert.equal(canScrollUp(2, false, 10, 0), true, 'collapsed header expands before refresh')
  assert.equal(canScrollUp(2, false, 0, 10), true, 'scrolled list returns to top before refresh')
})

test('header geometry comes from the native event alongside pull feedback, with and without refresh', () => {
  for (const callback of [undefined, () => Promise.resolve()]) {
    const { refresh } = harness(callback)
    assert.equal(refresh.header.value.measured, false)
    refresh.tabProps.onHeaderOffsetChange({ offset: 95.5, collapsibleHeight: 100.5, pull: 0 })
    assert.deepEqual(refresh.header.value, { offset: 95.5, collapsibleHeight: 100.5, measured: true })
    refresh.tabProps.onHeaderOffsetChange({ offset: 0, collapsibleHeight: 120, pull: 35 })
    assert.equal(refresh.pull.value, 35)
    assert.equal(refresh.header.value.offset, 0)
    assert.equal(refresh.header.value.collapsibleHeight, 120)
  }
})

test('separator transfer follows the native docking interval, including short and headerless pages', () => {
  const code = ts.transpileModule(fs.readFileSync(require.resolve('../src/design-system/mobile/header-geometry.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const module = { exports: {} }
  new Function('module', 'exports', code)(module, module.exports)
  const progress = (offset, height = 100, pinned = true, measured = true) => module.exports.headerDockProgress({ offset, collapsibleHeight: height, measured }, pinned)
  assert.equal(progress(0, 0, true, false), 0, 'initial measurement cannot flash the lower separator')
  assert.equal(progress(0, 0), 1, 'headerless tabs are already docked')
  assert.equal(progress(91), 0)
  assert.equal(progress(92), 0)
  assert.equal(progress(96), 0.5)
  assert.equal(progress(100), 1)
  assert.equal(progress(140), 1)
  assert.equal(progress(2, 4), 0.5, 'small headers use their full collapse distance')
  assert.equal(progress(100, 100, false), 0, 'unpinned tabs never take the separator')
  assert.equal(progress(-20), 0, 'pulling does not dock the tabs')
  assert.deepEqual([100, 96, 92, 80].map(value => progress(value)), [1, 0.5, 0, 0], 'expansion reverses the transfer')
})

test('scroll-edge separator is hidden at rest and during refresh, and follows positive scrolling', () => {
  const code = ts.transpileModule(fs.readFileSync(require.resolve('../src/design-system/mobile/header-geometry.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const module = { exports: {} }
  new Function('module', 'exports', code)(module, module.exports)
  const { scrollEdgeProgress: edge, headerDockProgress: dock } = module.exports
  assert.equal(edge(0), 0)
  assert.equal(edge(-40), 0)
  assert.equal(edge(4), 0.5)
  assert.equal(edge(8), 1)
  assert.equal(edge(120), 1)
  for (const offset of [0, 4, 8, 92, 96, 100, 120, 96, 0]) {
    const transfer = dock({ offset, collapsibleHeight: 100, measured: true })
    const top = edge(offset) * (1 - transfer), bottom = edge(offset) * transfer
    assert.equal(top + bottom, edge(offset), 'transfer preserves the scroll-edge visibility')
  }
})
