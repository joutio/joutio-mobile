import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react'
import { RefreshControl, type RefreshControlProps, type ScrollViewProps } from 'react-native'
import { useSharedValue, type SharedValue } from 'react-native-reanimated'
import { haptic } from '../haptics'
import { tokens } from '../tokens.generated'
import { PullIndicator } from './page-refresh'

interface RefreshFeedback {
  pull: SharedValue<number>
  register: (id: string, refreshing: boolean | undefined) => void
}
const Context = createContext<RefreshFeedback | null>(null)

/** Même indicateur natif que les pages à en-tête repliable, sans ajouter de View autour du scroll natif. */
export function ScrollRefreshHost({ children, top = tokens.space[4] }: { children: ReactNode; top?: number }) {
  const pull = useSharedValue(0)
  const [sources, setSources] = useState<ReadonlyMap<string, boolean>>(() => new Map())
  const register = useCallback((id: string, refreshing: boolean | undefined) => {
    setSources((previous) => {
      if (refreshing === undefined ? !previous.has(id) : previous.get(id) === refreshing) return previous
      const next = new Map(previous)
      if (refreshing === undefined) next.delete(id)
      else next.set(id, refreshing)
      return next
    })
  }, [])
  const context = useMemo(() => ({ pull, register }), [pull, register])
  return (
    <Context.Provider value={context}>
      {children}
      {sources.size > 0 && <PullIndicator pull={pull} refreshing={[...sources.values()].some(Boolean)} top={top} />}
    </Context.Provider>
  )
}

type RefreshScrollProps = ScrollViewProps & { refreshing?: boolean; onRefresh?: () => void }

/** Conserve le geste système, masque seulement son visuel et publie la traction au visuel commun. */
export function useScrollRefreshFeedback<P extends RefreshScrollProps>(props: P): P {
  const context = useContext(Context)
  const id = useId()
  const controlProps = isValidElement<RefreshControlProps>(props.refreshControl) ? props.refreshControl.props : undefined
  const onRefresh = controlProps?.onRefresh ?? props.onRefresh
  const enabled = Boolean(context && onRefresh)
  const refreshing = controlProps?.refreshing ?? props.refreshing ?? false
  useEffect(() => {
    if (!enabled) return
    context!.register(id, refreshing)
    return () => context!.register(id, undefined)
  }, [context, id, enabled, refreshing])

  if (!enabled) return props
  const refreshProps: RefreshControlProps = {
    ...controlProps,
    refreshing,
    tintColor: 'transparent',
    colors: ['transparent'],
    progressBackgroundColor: 'transparent',
    onRefresh: () => {
      if (refreshing) return
      haptic('light')
      onRefresh?.()
    },
  }
  return {
    ...props,
    refreshControl: isValidElement<RefreshControlProps>(props.refreshControl) ? (
      cloneElement(props.refreshControl, refreshProps)
    ) : (
      <RefreshControl {...refreshProps} />
    ),
    scrollEventThrottle: props.scrollEventThrottle ?? 16,
    onScroll: (event) => {
      context!.pull.value = Math.max(0, -event.nativeEvent.contentOffset.y - event.nativeEvent.contentInset.top)
      props.onScroll?.(event)
    },
  }
}

export function withScrollRefreshFeedback<P extends ScrollViewProps>(ScrollComponent: ComponentType<P>) {
  return function RefreshableScroll(props: P) {
    return <ScrollComponent {...useScrollRefreshFeedback(props)} />
  }
}
