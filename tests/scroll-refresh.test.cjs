const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')

function harness(hosted = true) {
  const updates = [],
    effects = [],
    haptics = []
  const context = { pull: { value: 0 }, register: (...args) => updates.push(args) }
  const jsx = (type, props) => ({ type, props })
  const mocks = {
    react: {
      createContext: () => ({}),
      useContext: () => (hosted ? context : null),
      useId: () => 'refresh',
      useEffect: (fn) => effects.push(fn),
      isValidElement: (value) => Boolean(value?.type && value.props),
      cloneElement: (element, props) => jsx(element.type, { ...element.props, ...props }),
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { RefreshControl: 'NativeRefreshControl' },
    'react-native-reanimated': {},
    '../haptics': { haptic: (kind) => haptics.push(kind) },
    '../tokens.generated': { tokens: { space: { 4: 12 } } },
    './page-refresh': { PullIndicator: 'NativePullIndicator' },
  }
  const code = ts.transpileModule(fs.readFileSync(require.resolve('../src/design-system/mobile/scroll-refresh.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)((id) => mocks[id], module, module.exports)
  return { decorate: module.exports.useScrollRefreshFeedback, updates, effects, haptics, context, jsx }
}

test('existing refresh control keeps its gesture callback and publishes loading to the native spinner', () => {
  const h = harness()
  let refreshes = 0
  const control = h.jsx('OriginalRefreshControl', { refreshing: false, onRefresh: () => refreshes++, testID: 'original' })
  const decorated = h.decorate({ refreshControl: control })
  const cleanup = h.effects[0]()
  assert.deepEqual(h.updates, [['refresh', false]])
  assert.equal(decorated.refreshControl.type, 'OriginalRefreshControl')
  assert.equal(decorated.refreshControl.props.tintColor, 'transparent')
  assert.equal(decorated.refreshControl.props.testID, 'original')
  decorated.refreshControl.props.onRefresh()
  assert.equal(refreshes, 1)
  assert.deepEqual(h.haptics, ['light'])
  cleanup()
  assert.deepEqual(h.updates.at(-1), ['refresh', undefined])
})

test('FlashList/FlatList refreshing and onRefresh produce an explicit refresh control', () => {
  const h = harness()
  let calls = 0
  const decorated = h.decorate({ refreshing: true, onRefresh: () => calls++ })
  h.effects[0]()
  assert.deepEqual(h.updates, [['refresh', true]])
  assert.equal(decorated.refreshControl.type, 'NativeRefreshControl')
  assert.equal(decorated.refreshControl.props.refreshing, true)
  decorated.refreshControl.props.onRefresh()
  assert.equal(calls, 0)
})

test('pull progress accounts for contentInset and preserves list scroll callbacks', () => {
  const h = harness()
  let forwarded
  const decorated = h.decorate({
    onRefresh() {},
    onScroll: (event) => {
      forwarded = event
    },
  })
  const event = { nativeEvent: { contentOffset: { y: -120 }, contentInset: { top: 80 } } }
  decorated.onScroll(event)
  assert.equal(h.context.pull.value, 40)
  assert.equal(forwarded, event)
  decorated.onScroll({ nativeEvent: { contentOffset: { y: 25 }, contentInset: { top: 0 } } })
  assert.equal(h.context.pull.value, 0)
})

test('a plain scroll or a scroll without a host retains its original props', () => {
  const h = harness()
  const plain = { onScroll() {}, scrollEventThrottle: 32 }
  assert.equal(h.decorate(plain), plain)
  const outside = harness(false)
  const refreshable = { onRefresh() {}, refreshing: false }
  assert.equal(outside.decorate(refreshable), refreshable)
})
