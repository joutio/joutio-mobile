const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

// Exercise the real component's handlers and effect lifecycle without a native renderer.
function harness(os = 'ios') {
  let index = 0,
    focused = false,
    blurCount = 0,
    query = 'Napoléon',
    cleanupFocus
  const slots = [],
    effects = [],
    listeners = new Map(),
    frames = new Map()
  let frameId = 0,
    field,
    back
  const same = (a, b) => a?.length === b?.length && a.every((v, i) => v === b[i])
  const React = {
    useState(initial) {
      const id = index++
      slots[id] ??= { value: initial }
      return [
        slots[id].value,
        (value) => {
          slots[id].value = value
        },
      ]
    },
    useRef(initial) {
      const id = index++
      slots[id] ??= { current: initial }
      return slots[id]
    },
    useCallback(fn, deps) {
      const id = index++
      if (!slots[id] || !same(slots[id].deps, deps)) slots[id] = { value: fn, deps }
      return slots[id].value
    },
    useEffect(fn, deps) {
      const id = index++
      if (!slots[id] || !same(slots[id].deps, deps)) {
        slots[id]?.cleanup?.()
        slots[id] = { deps }
        effects.push(() => {
          slots[id].cleanup = fn()
        })
      }
    },
  }
  const jsx = (type, props) => ({ type, props })
  const transition = {
    duration() {
      return this
    },
    easing() {
      return this
    },
  }
  const mocks = {
    react: React,
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'expo-router': {
      useFocusEffect: (fn) =>
        React.useEffect(() => {
          cleanupFocus = fn()
          return cleanupFocus
        }, [fn]),
    },
    'react-native': {
      Platform: { OS: os },
      Keyboard: {
        dismiss() {},
        addListener(name, fn) {
          listeners.set(name, fn)
          return {
            remove() {
              listeners.delete(name)
            },
          }
        },
      },
      BackHandler: {
        addEventListener(_name, fn) {
          back = fn
          return { remove() {} }
        },
      },
    },
    'react-native-reanimated': {
      __esModule: true,
      default: { View: 'View' },
      Easing: { bezier() {} },
      LinearTransition: transition,
      FadeInDown: transition,
      FadeOutUp: transition,
      FadeInRight: transition,
      FadeOutRight: transition,
    },
    '../icons': {},
    '../motion': { useReducedMotion: () => false },
    '../primitives/icon-button': { IconButton: 'IconButton' },
    '../primitives/search-field': { SearchField: 'SearchField' },
    '../tokens.generated': { tokens: { space: { 3: 8, 5: 16 } } },
    './mobile-top-bar': { MobileTopBar: 'MobileTopBar' },
  }
  const source = fs.readFileSync(path.join(__dirname, '../src/design-system/mobile/search-header.tsx'), 'utf8')
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', 'requestAnimationFrame', 'cancelAnimationFrame', code)(
    (id) => {
      assert.ok(mocks[id], `Missing mock: ${id}`)
      return mocks[id]
    },
    module,
    module.exports,
    (fn) => {
      frames.set(++frameId, fn)
      return frameId
    },
    (id) => frames.delete(id),
  )
  const input = {
    isFocused: () => focused,
    blur() {
      focused = false
      blurCount++
    },
  }
  const onChange = (value) => {
    query = value
  }
  const find = (node) => {
    if (!node || typeof node !== 'object') return
    if (node.type === 'SearchField') field = node.props
    for (const child of [node.props?.children].flat(Infinity)) find(child)
  }
  const render = () => {
    index = 0
    find(module.exports.SearchHeader({ title: 'Sujets', value: query, onChange, placeholder: 'Chercher', onFilter() {} }))
    field.inputRef.current = input
    for (const effect of effects.splice(0)) effect()
    return field
  }
  render()
  return {
    render,
    focus() {
      focused = true
      field.onFocus()
      return render()
    },
    blur() {
      focused = false
      field.onBlur()
      return render()
    },
    emit(name) {
      listeners.get(name)?.()
      return render()
    },
    flush() {
      const jobs = [...frames.values()]
      frames.clear()
      jobs.forEach((fn) => fn())
      return render()
    },
    cancel() {
      field.onCancel()
      return render()
    },
    leave() {
      cleanupFocus?.()
      return render()
    },
    back() {
      const handled = back?.()
      render()
      return handled
    },
    get query() {
      return query
    },
    get blurCount() {
      return blurCount
    },
  }
}

test('a keyboard hide from the previous focus cannot cancel the new search', () => {
  const h = harness()
  assert.equal(h.focus().active, true)
  assert.equal(h.emit('keyboardDidHide').active, true)
  assert.equal(h.blurCount, 0)
  assert.equal(h.emit('keyboardDidShow').active, true)
})

test('a refocus before the deferred blur preserves the compact search header', () => {
  const h = harness()
  h.focus()
  h.blur()
  h.focus()
  assert.equal(h.flush().active, true)
  assert.equal(h.blurCount, 0)
})

test('real loss of focus restores the header and preserves the query', () => {
  const h = harness()
  h.focus()
  h.blur()
  assert.equal(h.flush().active, false)
  assert.equal(h.query, 'Napoléon')
})

test('hiding the keyboard shown for this input restores the header without clearing the query', () => {
  const h = harness()
  h.focus()
  h.emit('keyboardDidShow')
  assert.equal(h.emit('keyboardDidHide').active, false)
  assert.equal(h.blurCount, 1)
  assert.equal(h.query, 'Napoléon')
})

test('Cancel clears the query; leaving the screen preserves it and cancels a pending blur', () => {
  const h = harness()
  h.focus()
  assert.equal(h.cancel().active, false)
  assert.equal(h.query, '')
  const leaving = harness()
  leaving.focus()
  leaving.blur()
  assert.equal(leaving.leave().active, false)
  assert.equal(leaving.flush().active, false)
  assert.equal(leaving.query, 'Napoléon')
})

test('Android Back closes the keyboard first without clearing the query', () => {
  const h = harness('android')
  h.focus()
  h.emit('keyboardDidShow')
  assert.equal(h.back(), true)
  assert.equal(h.query, 'Napoléon')
  assert.equal(h.emit('keyboardDidHide').active, false)
})
