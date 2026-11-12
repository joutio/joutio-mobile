const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')

function harness() {
  const reactions = []
  let context = { docking: { value: 0 }, offset: { value: 0 } }
  const jsx = (type, props) => ({ type, props })
  const mocks = {
    react: {
      useContext: () => context, useEffect() {}, useCallback: fn => fn,
      useImperativeHandle() {}, useMemo: fn => fn(), useRef: value => ({ current: value }),
      useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { View: 'View', ScrollView: 'ScrollView', RefreshControl: 'RefreshControl', Platform: { OS: 'android' } },
    'react-native-collapsible-tabs-native': { CollapsibleTabView: 'NativeTabs' },
    'react-native-reanimated': {
      useSharedValue: value => ({ value }), useEvent: fn => fn,
      useDerivedValue: fn => ({ get value() { return fn() } }),
      useAnimatedReaction: (prepare, react) => reactions.push(() => react(prepare())),
    },
    './sticky-header': { StickyHeaderContext: { Provider: 'HeaderProvider' } },
    './scroll-edge': { ScrollEdgeContext: { Provider: 'ScrollEdgeProvider' } },
    '../primitives/joutio-tabs': { JoutioTabs: 'JoutioTabs' },
    './header-separator': { HeaderSeparator: 'HeaderSeparator' },
    '../theme/theme-provider': { useTheme: () => ({ colors: { bg: 'white', muted: 'gray', surface: 'white' } }) },
    '../tokens.generated': { tokens: { space: { 2: 4, 3: 8, 4: 12, 5: 16 } } },
    './horizontal-gesture': { HorizontalGestureContext: { Provider: 'HorizontalProvider' } },
    './scroll-to-top-pill': { ScrollToTopPill: 'ScrollToTopPill' },
    './tab-page': { TabPageActiveContext: { Provider: 'TabPageProvider' } },
    './tab-bar-inset': { useTabBarInset: () => 0, withBottomInset: (style) => style },
    '../haptics': { haptic() {} },
  }
  const load = file => {
    const module = { exports: {} }
    const code = ts.transpileModule(fs.readFileSync(require.resolve(file), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText
    new Function('require', 'module', 'exports', code)(id => {
      assert.ok(id in mocks, `Missing mock ${id}`)
      return mocks[id]
    }, module, module.exports)
    return module.exports
  }
  mocks['./header-geometry'] = load('../src/design-system/mobile/header-geometry.ts')
  mocks['./guarded-refresh'] = load('../src/design-system/mobile/guarded-refresh.ts')
  mocks['./page-refresh'] = load('../src/design-system/mobile/page-refresh.tsx')
  mocks['expo-router/react-navigation'] = { HeaderHeightContext: {} }
  mocks['react-native-keyboard-controller'] = { KeyboardAwareScrollView: 'KeyboardScroll' }
  mocks['react-native-safe-area-context'] = { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }
  mocks['./drag-to-load-more'] = { DragToLoadMore: 'LoadMore', LoadMoreScrollView: 'LoadMoreScroll' }
  const { Screen } = load('../src/design-system/mobile/screen.tsx')
  const screen = Screen({ header: jsx('Header', {}), scroll: false, children: null })
  context = find(screen, 'HeaderProvider').props.value
  const upper = find(screen, 'HeaderSeparator')
  const { TabsScrollView } = load('../src/design-system/mobile/tabs-scroll-view.tsx')
  const tree = TabsScrollView({ label: 'Pages', pages: [{ value: 'one', label: 'One', content: null }], value: 'one', onChange() {} })
  function find(node, type) {
    if (!node || typeof node !== 'object') return
    if (node.type === type) return node
    for (const child of [node.props?.children].flat(Infinity)) { const found = find(child, type); if (found) return found }
  }
  const shell = find(tree, 'NativeTabs')
  const lower = find(shell.props.renderTabBar(), 'HeaderSeparator')
  return {
    update(offset, collapsibleHeight, pageOffset = offset) {
      shell.props.onHeaderOffsetChange({ offset, collapsibleHeight, pull: 0 })
      shell.props.onScrollOffsetChange({ offset: pageOffset })
      reactions.forEach(run => run())
      return { top: upper.props.progress.value, bottom: lower.props.progress.value }
    },
  }
}

test('Social: the rendered tabs separator is absent at rest, appears below fixed tabs on scroll, then clears at top', () => {
  const h = harness()
  assert.deepEqual(h.update(0, 0, 0), { top: 0, bottom: 0 })
  assert.deepEqual(h.update(0, 0, 12), { top: 0, bottom: 1 })
  assert.deepEqual(h.update(0, 0, -30), { top: 0, bottom: 0 })
  assert.deepEqual(h.update(0, 0, 0), { top: 0, bottom: 0 })
})

test('Home: separator stays above the scrolling rank and streak until tabs dock; expansion reverses the transfer', () => {
  const h = harness()
  assert.deepEqual(h.update(0, 100), { top: 0, bottom: 0 })
  assert.deepEqual(h.update(40, 100), { top: 1, bottom: 0 })
  assert.deepEqual(h.update(96, 100), { top: 0.5, bottom: 0.5 })
  assert.deepEqual(h.update(100, 100, 250), { top: 0, bottom: 1 })
  assert.deepEqual(h.update(40, 100), { top: 1, bottom: 0 })
  assert.deepEqual(h.update(0, 100), { top: 0, bottom: 0 })
})

test('parallax separator waits for the compact title to finish its fade, including on reverse scroll', () => {
  const code = ts.transpileModule(fs.readFileSync(require.resolve('../src/design-system/mobile/header-geometry.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const module = { exports: {} }
  new Function('module', 'exports', code)(module, module.exports)
  const { compactHeaderEdge, headerSeparators } = module.exports
  const beforeTabs = headerSeparators({ offset: 40, collapsibleHeight: 100, measured: true }, 40)
  assert.equal(beforeTabs.top, 1, 'a normal header already has its separator')
  assert.deepEqual([0, 0.5, 0.999, 1, 1, 0.999, 0.5, 0].map(progress => compactHeaderEdge(progress) * beforeTabs.top), [0, 0, 0, 1, 1, 0, 0, 0])
})
