import { haptic } from '../haptics'
import { requireNativeViewManager } from 'expo-modules-core'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type Ref } from 'react'
import { findNodeHandle, ScrollView, View, type ScrollViewInstance, type ScrollViewProps, type StyleProp, type ViewProps, type ViewStyle } from 'react-native'
import { createTabList } from 'react-native-collapsible-tabs-native'
import { useSharedValue, type SharedValue } from 'react-native-reanimated'
import { useTheme } from '../theme/theme-provider'
import { withActivePageScrollsToTop } from './tab-page'
import { useScrollRefreshFeedback } from './scroll-refresh'

export const LOAD_MORE_THRESHOLD = 64
interface NativeProps extends ViewProps {
  scrollTag: number
  enabled: boolean
  loading: boolean
  color: string
  surface: string
  onLoad: () => void
  onPull: (event: { nativeEvent: { pull: number } }) => void
}
const NativeControl = requireNativeViewManager<NativeProps>('BottomLoad')
interface LoadContext {
  pull: SharedValue<number>
  register: (tag: number) => void
  load: () => void
}
const Context = createContext<LoadContext | null>(null)
export const useLoadMorePull = () => useContext(Context)?.pull ?? null
export const useLoadMoreAction = () => useContext(Context)?.load ?? null
export interface DragToLoadMoreProps {
  enabled: boolean
  loading?: boolean
  resetKey?: unknown
  onLoadMore: () => unknown
  style?: StyleProp<ViewStyle>
  /** Preserve the direct scroll child required by TrueSheet. */
  overlay?: boolean
  children: ReactNode
}

/** Native gesture/indicator; React only coordinates the request. Appending never scrolls the list. */
export function DragToLoadMore({ enabled, loading = false, onLoadMore, style, overlay = false, resetKey, children }: DragToLoadMoreProps) {
  const { colors } = useTheme()
  const pull = useSharedValue(0)
  const [tag, register] = useState(0)
  const [busy, setBusy] = useState(false)
  const locked = useRef(false)
  const cycle = useRef(0)
  const latest = useRef({ enabled, loading, onLoadMore })
  latest.current = { enabled, loading, onLoadMore }
  const finish = useCallback(
    (id: number) => {
      if (cycle.current !== id) return
      locked.current = false
      setBusy(false)
      pull.value = 0
    },
    [pull],
  )
  const load = useCallback(() => {
    if (locked.current || latest.current.loading) return
    locked.current = true
    haptic('light')
    const id = ++cycle.current
    setBusy(true)
    pull.value = LOAD_MORE_THRESHOLD
    let result: unknown
    try {
      result = latest.current.onLoadMore()
    } catch {
      finish(id)
      return
    }
    // Await promises, including React Query's result. Legacy void/local callbacks
    // get two commit frames; their controlled loading prop remains authoritative.
    Promise.resolve(result)
      .catch(() => undefined)
      .finally(() => {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (result !== undefined || !latest.current.loading) finish(id)
          }),
        )
      })
  }, [finish, pull])
  useEffect(() => {
    if (!loading && locked.current) finish(cycle.current)
  }, [loading, finish])
  useEffect(() => {
    if (!busy) return
    const id = cycle.current
    const timer = setTimeout(() => finish(id), 12_000)
    return () => clearTimeout(timer)
  }, [busy, finish])
  useEffect(() => {
    cycle.current += 1
    locked.current = false
    setBusy(false)
    pull.value = 0
    return () => {
      cycle.current += 1
    }
  }, [resetKey, pull])
  const value = useMemo(() => ({ pull, register, load }), [pull, load])
  const content = (
    <>
      {children}
      {tag > 0 && (
        <NativeControl
          pointerEvents="none"
          style={{ position: 'absolute', width: 0, height: 0 }}
          scrollTag={tag}
          enabled={enabled && !loading}
          // Only the initiating surface owns the indicator. A shared query may
          // also update a screen underneath the sheet.
          loading={busy}
          color={colors.muted}
          surface={colors.surface}
          onLoad={load}
          onPull={(event) => {
            pull.value = event.nativeEvent.pull
          }}
          accessibilityLabel="Chargement de la suite"
          accessibilityState={{ busy }}
        />
      )}
    </>
  )
  return <Context.Provider value={value}>{overlay ? content : <View style={[{ flex: 1 }, style]}>{content}</View>}</Context.Provider>
}

/** The same native scroll node is shared with FlashList, tabs and TrueSheet. */
export function LoadMoreScrollView({ ref, ...props }: ScrollViewProps & { ref?: Ref<ScrollViewInstance | null> }) {
  const register = useContext(Context)?.register
  const refreshProps = useScrollRefreshFeedback(props)
  const setRef = useCallback(
    (node: ScrollViewInstance | null) => {
      register?.(node ? (findNodeHandle(node) ?? 0) : 0)
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [ref, register],
  )
  return <ScrollView {...refreshProps} ref={setRef} scrollEventThrottle={props.scrollEventThrottle ?? 16} />
}
export const TabLoadMoreScrollView = withActivePageScrollsToTop(createTabList(LoadMoreScrollView))
