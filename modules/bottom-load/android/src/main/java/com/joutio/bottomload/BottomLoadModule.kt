package com.joutio.bottomload

import android.content.Context
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.Window
import android.view.ViewGroup
import android.view.ViewTreeObserver
import android.graphics.Rect
import android.widget.ImageView
import android.widget.ScrollView
import androidx.swiperefreshlayout.widget.CircularProgressDrawable
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.views.ExpoView
import expo.modules.kotlin.viewevent.EventDispatcher
import kotlin.math.*

class BottomLoadModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("BottomLoad")
    View(BottomLoadView::class) {
      Events("onLoad", "onPull")
      Prop("scrollTag") { view: BottomLoadView, tag: Int -> view.attach(tag) }
      Prop("enabled") { view: BottomLoadView, enabled: Boolean -> view.loadEnabled = enabled }
      Prop("loading") { view: BottomLoadView, loading: Boolean -> view.setLoading(loading) }
      Prop("color") { view: BottomLoadView, color: String -> view.indicator.setColorSchemeColors(Color.parseColor(color)) }
      Prop("surface") { view: BottomLoadView, color: String -> view.disc.background = GradientDrawable().apply { shape = GradientDrawable.OVAL; setColor(Color.parseColor(color)) } }
      OnViewDestroys { view: BottomLoadView -> view.detach() }
    }
  }
}

/** Observes the actual scroll node, including when TrueSheet hosts it in a separate window. */
class BottomLoadView(context: Context, appContext: AppContext) : ExpoView(context, appContext), View.OnTouchListener {
  val onLoad by EventDispatcher()
  val onPull by EventDispatcher()
  var loadEnabled = true
  private val density = resources.displayMetrics.density
  val indicator = CircularProgressDrawable(context).apply { setStyle(CircularProgressDrawable.DEFAULT) }
  val disc = ImageView(context).apply { setImageDrawable(indicator); visibility = View.INVISIBLE; elevation = 4 * density; setPadding(8*density.toInt(),8*density.toInt(),8*density.toInt(),8*density.toInt()) }
  private var scroll: ScrollView? = null
  private var overlayHost: ViewGroup? = null
  private var lastPull = 0f
  private val reposition = ViewTreeObserver.OnPreDrawListener {
    if (disc.visibility == View.VISIBLE) position(lastPull)
    true
  }
  private var requestedTag = 0
  private var attachAttempts = 0
  private val retryAttach = Runnable { attach(requestedTag) }
  private var busy = false
  private var tracking = false
  private var horizontal = false
  private var startX = 0f
  private var lastY = 0f
  private var distance = 0f
  private val slop = ViewConfiguration.get(context).scaledTouchSlop
  private val timeout = Runnable { setLoading(false) }

  fun attach(tag: Int) {
    if (requestedTag != tag) { requestedTag = tag; attachAttempts = 0 }
    val node = appContext.findView<View>(tag) as? ScrollView
    if (node == null) {
      if (attachAttempts++ < 30) postDelayed(retryAttach,16)
      return
    }
    if (scroll === node) return
    detach()
    scroll = node
    WindowRouter.attach(appContext.currentActivity?.window, this)
    overlayHost = node.rootView as? ViewGroup
    overlayHost?.overlay?.add(disc)
    node.viewTreeObserver.addOnPreDrawListener(reposition)
  }
  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    if (requestedTag != 0) { attachAttempts = 0; attach(requestedTag) }
  }
  override fun onDetachedFromWindow() { detach(); super.onDetachedFromWindow() }
  fun detach() {
    removeCallbacks(retryAttach)
    removeCallbacks(timeout)
    WindowRouter.detach(this)
    scroll?.viewTreeObserver?.takeIf { it.isAlive }?.removeOnPreDrawListener(reposition)
    overlayHost?.overlay?.remove(disc)
    overlayHost = null
    indicator.stop()
    scroll = null
    busy = false
    tracking = false
  }
  private fun position(pull: Float) {
    val node = scroll ?: return
    val actualRoot = node.rootView as? ViewGroup ?: return
    if (actualRoot !== overlayHost) {
      overlayHost?.overlay?.remove(disc)
      overlayHost = actualRoot
      actualRoot.overlay.add(disc)
    }
    val host = actualRoot
    val bounds = Rect()
    if (!node.getGlobalVisibleRect(bounds)) { disc.visibility=View.INVISIBLE; return }
    // TrueSheet measures a short scroll at its natural height. Its content
    // viewport, rather than that height, owns the bottom indicator's anchor.
    var parent = node.parent
    while (parent is View) {
      if (parent.javaClass.simpleName == "TrueSheetBottomSheetView") {
        parent.getGlobalVisibleRect(bounds)
        break
      }
      parent = parent.parent
    }
    val origin = IntArray(2)
    host.getLocationOnScreen(origin)
    val size = (40*density).toInt()
    val x = bounds.centerX()-origin[0]-size/2
    val y = (bounds.bottom-origin[1]-node.paddingBottom-16*density-size-min(pull,64*density)/2).toInt()
    disc.layout(x,y,x+size,y+size)
  }
  private fun show(pull: Float) {
    lastPull = pull
    position(pull)
    disc.visibility = View.VISIBLE
    if (!busy) {
      val progress = (pull/(64*density)).coerceIn(0f,1f)
      disc.alpha = min(1f, progress*2)
      indicator.setStartEndTrim(0f, progress*0.8f)
      indicator.progressRotation = progress*0.8f
      indicator.setArrowEnabled(true)
      indicator.arrowScale = progress
    }
    onPull(mapOf("pull" to (pull/density)))
  }
  fun setLoading(value: Boolean) {
    busy = value
    removeCallbacks(timeout)
    if (value) {
      disc.alpha = 1f
      show(64*density)
      indicator.setArrowEnabled(false)
      indicator.start()
      postDelayed(timeout,12000)
    } else {
      indicator.stop()
      disc.visibility = View.INVISIBLE
      onPull(mapOf("pull" to 0))
    }
  }
  fun hit(event: MotionEvent): Boolean {
    val node = scroll ?: return false
    val bounds = Rect()
    return node.isShown && node.getGlobalVisibleRect(bounds) && bounds.contains(event.rawX.toInt(), event.rawY.toInt())
  }
  fun observe(event: MotionEvent): Boolean = onTouch(this,event)
  override fun onTouch(v: View, event: MotionEvent): Boolean {
    val node = scroll ?: return false

    when(event.actionMasked) {
      MotionEvent.ACTION_DOWN -> { startX=event.x; lastY=event.y; distance=0f; tracking=false; horizontal=false }
      MotionEvent.ACTION_MOVE -> {
        if (!loadEnabled || busy || event.pointerCount != 1) return false
        val dy = lastY-event.y
        lastY=event.y
        if (abs(event.x-startX)>slop && abs(event.x-startX)>abs(distance+dy)) horizontal=true
        if (horizontal) return false
        if (!tracking && !node.canScrollVertically(1) && dy>0) {
          distance += dy
          if (distance>slop) {
            tracking=true
            node.parent?.requestDisallowInterceptTouchEvent(true)
            val cancel=MotionEvent.obtain(event); cancel.action=MotionEvent.ACTION_CANCEL
            node.onTouchEvent(cancel); cancel.recycle()
          }
        } else if (tracking) distance=max(0f,distance+dy)
        else distance=0f
        if (tracking) { show(distance*0.5f); return true }
      }
      MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
        if (!tracking) return false
        tracking=false
        node.parent?.requestDisallowInterceptTouchEvent(false)
        if (event.actionMasked==MotionEvent.ACTION_UP && distance*0.5f>=64*density && loadEnabled && !busy) {
          setLoading(true)
          onLoad(mapOf<String,Any>())
        } else setLoading(false)
        return true
      }
    }
    return tracking
  }
}

/** One observer at the activity window, before RN children/TrueSheet intercept a gesture.
 * Controllers remain attached to scroll nodes; no reparenting or extra sheet wrapper. */
private object WindowRouter {
  private val controls = mutableListOf<java.lang.ref.WeakReference<BottomLoadView>>()
  private var window: Window? = null
  private var callback: Window.Callback? = null
  private var original: Window.Callback? = null
  private var current: BottomLoadView? = null
  private var intercepted = false
  fun attach(next: Window?, control: BottomLoadView) {
    if (next == null) return
    controls.removeAll { it.get() == null || it.get() === control }
    controls.add(java.lang.ref.WeakReference(control))
    if (window === next && next.callback === callback) return
    window = next
    val delegate = next.callback
    original = delegate
    val wrapper = object : Window.Callback by delegate {
      override fun dispatchTouchEvent(event: MotionEvent): Boolean {
        if (event.actionMasked == MotionEvent.ACTION_DOWN) {
          current = controls.asReversed().firstNotNullOfOrNull { it.get()?.takeIf { view -> view.hit(event) } }
          intercepted = false
        }
        val consumed = current?.observe(event) == true
        if (consumed && !intercepted) {
          val cancel = MotionEvent.obtain(event); cancel.action = MotionEvent.ACTION_CANCEL
          delegate.dispatchTouchEvent(cancel); cancel.recycle()
          intercepted = true
        }
        val result = if (consumed || intercepted) true else delegate.dispatchTouchEvent(event)
        if (event.actionMasked == MotionEvent.ACTION_UP || event.actionMasked == MotionEvent.ACTION_CANCEL) { current=null; intercepted=false }
        return result
      }
    }
    callback=wrapper
    next.callback=wrapper
  }
  fun detach(control: BottomLoadView) {
    controls.removeAll { it.get() == null || it.get() === control }
    if (current === control) current=null
    if (controls.isEmpty()) {
      if (window?.callback === callback) window?.callback=original
      window=null; callback=null; original=null
    }
  }
}
