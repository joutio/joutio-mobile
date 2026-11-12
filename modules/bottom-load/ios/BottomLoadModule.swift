import ExpoModulesCore
import UIKit

public class BottomLoadModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BottomLoad")
    View(BottomLoadView.self) {
      Events("onLoad", "onPull")
      Prop("scrollTag") { (view: BottomLoadView, tag: Int) in view.attach(tag) }
      Prop("enabled") { (view: BottomLoadView, enabled: Bool) in view.enabled = enabled }
      Prop("loading") { (view: BottomLoadView, loading: Bool) in view.setLoading(loading) }
      Prop("color") { (view: BottomLoadView, color: UIColor) in view.spinner.color = color }
      Prop("surface") { (_: BottomLoadView, _: UIColor) in }
    }
  }
}

final class BottomLoadView: ExpoView {
  let onLoad = EventDispatcher()
  let onPull = EventDispatcher()
  let spinner = UIActivityIndicatorView(style: .medium)
  var enabled = true
  private weak var scroll: UIScrollView?
  private var busy = false
  private var requestedTag: Int?
  private var timeout: DispatchWorkItem?
  private var observation: NSKeyValueObservation?

  private func findScroll(_ view: UIView) -> UIScrollView? {
    if let result = view as? UIScrollView { return result }
    return view.subviews.lazy.compactMap { self.findScroll($0) }.first
  }
  func attach(_ tag: Int) {
    requestedTag = tag
    guard let root = appContext?.findView(withTag: tag, ofType: UIView.self), let node = findScroll(root), node !== scroll else { return }
    detach()
    scroll = node
    node.alwaysBounceVertical = true
    node.panGestureRecognizer.addTarget(self, action: #selector(panChanged))
    spinner.hidesWhenStopped = false
    node.addSubview(spinner)
    observation = node.observe(\.contentOffset, options: [.new]) { [weak self] _, _ in self?.update() }
  }
  private func update() {
    guard let node = scroll else { return }
    let end = max(-node.adjustedContentInset.top, node.contentSize.height - node.bounds.height + node.adjustedContentInset.bottom)
    let pull = max(0, node.contentOffset.y-end)
    guard let host = node.window else { return }
    if spinner.superview !== host {
      spinner.removeFromSuperview()
      host.addSubview(spinner)
    }
    var viewport = node.convert(node.bounds, to: host).intersection(host.bounds)
    var ancestor = node.superview
    while let parent = ancestor {
      if NSStringFromClass(type(of: parent)).hasSuffix("TrueSheetContainerView") {
        let sheet = parent.superview ?? parent
        viewport = sheet.convert(sheet.bounds, to: host).intersection(host.bounds)
        break
      }
      ancestor = parent.superview
    }
    // Au-dessus de ce qui recouvre le bas de la liste : son inset de contenu, ou la zone sûre (tab bar native
    // flottante, indicateur d'accueil) quand la marge de fin est un padding que UIKit ne connaît pas (2026-11-12).
    let covered = max(node.adjustedContentInset.bottom, node.safeAreaInsets.bottom)
    spinner.center = CGPoint(x: viewport.midX, y: viewport.maxY - covered - 32)
    if !busy {
      spinner.isHidden = !enabled || pull <= 0
      spinner.alpha = min(1, pull/64)
    }
    onPull(["pull": busy ? 64 : pull])
  }
  @objc private func panChanged(_ gesture: UIPanGestureRecognizer) {
    guard enabled, !busy, let node = scroll else { return }
    let end = max(-node.adjustedContentInset.top, node.contentSize.height-node.bounds.height+node.adjustedContentInset.bottom)
    let translation = gesture.translation(in: node)
    if gesture.state == .ended && node.contentOffset.y-end >= 64 && abs(translation.y)>abs(translation.x) {
      setLoading(true)
      onLoad([:])
    }
  }
  func setLoading(_ value: Bool) {
    busy = value
    timeout?.cancel()
    if value {
      spinner.isHidden = false
      spinner.alpha = 1
      spinner.startAnimating()
      update()
      let work = DispatchWorkItem { [weak self] in self?.setLoading(false) }
      timeout = work
      DispatchQueue.main.asyncAfter(deadline: .now()+12, execute: work)
    } else {
      spinner.stopAnimating()
      spinner.isHidden = true
      onPull(["pull": 0])
    }
  }
  private func detach() {
    timeout?.cancel()
    observation?.invalidate()
    scroll?.panGestureRecognizer.removeTarget(self, action: #selector(panChanged))
    spinner.removeFromSuperview()
    scroll = nil
  }
  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window == nil { detach() }
    else if let tag = requestedTag { attach(tag) }
  }
  deinit { detach() }
}
