const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

// Execute the patched Swift method itself against a minimal scroll-view model.
// This catches subtracting stale native slack after RN resets contentInset.
test('iOS content growth after an RN inset reset retains the full scroll range', { skip: process.platform !== 'darwin' }, () => {
  const source = fs.readFileSync(path.join(__dirname, '../node_modules/react-native-collapsible-tabs-native/ios/NativeCollapsibleTabsContent.swift'), 'utf8')
  function method(name) {
    const start = source.indexOf(`  private func ${name}(`)
    assert.ok(start >= 0)
    let cursor = source.indexOf('{', start),
      depth = 1
    for (cursor++; depth; cursor++) {
      if (source[cursor] === '{') depth++
      else if (source[cursor] === '}') depth--
    }
    return source.slice(start, cursor)
  }
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'joutio-slack-'))
  const file = path.join(directory, 'regression.swift')
  fs.writeFileSync(
    file,
    `
import Foundation
struct Insets { var bottom: CGFloat = 0 }
final class UIScrollView: NSObject {
  var contentInset = Insets()
  var adjustedContentInset: Insets { contentInset }
  struct Bounds { var height: CGFloat = 790 }
  var bounds = Bounds()
  var contentSize = CGSize(width: 393, height: 1100)
}
final class Harness {
  var allowFullCollapse = true
  var applyingSlack = false
  let collapsibleHeight: CGFloat = 500
  let collapseSlack = NSMapTable<UIScrollView, NSNumber>.weakToStrongObjects()
  let collapseSlackBase = NSMapTable<UIScrollView, NSNumber>.weakToStrongObjects()
${method('appliedSlack')}
${method('setAppliedSlack')}
${method('applyCollapseSlack')}
  func apply(_ scroll: UIScrollView) { applyCollapseSlack(to: scroll, page: 0) }
}
func check(_ value: CGFloat, _ expected: CGFloat, _ scenario: String) {
  precondition(abs(value - expected) < 0.01, "\\(scenario): \\(value) != \\(expected)")
}
let harness = Harness()
let scroll = UIScrollView()
harness.apply(scroll)
check(scroll.contentInset.bottom, 190, "short initial content")
scroll.contentInset.bottom = 0 // React Native reapplies its prop.
scroll.contentSize.height = 1577
harness.apply(scroll)
check(scroll.contentInset.bottom, 0, "growing content after RN reset")
check(scroll.contentSize.height + scroll.contentInset.bottom - scroll.bounds.height, 787, "full scroll range")
let direct = UIScrollView()
harness.apply(direct)
direct.contentSize.height = 1577
harness.apply(direct)
check(direct.contentInset.bottom, 0, "growing content without reset")
let inset = UIScrollView()
inset.contentInset.bottom = 24
harness.apply(inset)
inset.contentInset.bottom = 24
inset.contentSize.height = 1577
harness.apply(inset)
check(inset.contentInset.bottom, 24, "preserve the caller bottom inset")
print("Swift collapse-slack regressions OK")
`,
  )
  try {
    const result = spawnSync('swift', ['-module-cache-path', path.join(os.tmpdir(), 'joutio-swift-module-cache'), file], { encoding: 'utf8', timeout: 60000 })
    assert.equal(result.status, 0, result.stdout + result.stderr)
    assert.match(result.stdout, /regressions OK/)
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})
