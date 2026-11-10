import { useEvent, useSharedValue } from 'react-native-reanimated'
import { useGuardedRefresh } from './guarded-refresh'
import type { HeaderGeometry } from './header-geometry'
import { useTheme } from '../theme/theme-provider'

/** Coordonne la requête ; le conteneur natif possède le geste et son indicateur système. */
export function usePageRefresh(onRefresh?: () => Promise<unknown> | void) {
  const { colors } = useTheme()
  const { refreshing, refresh } = useGuardedRefresh(onRefresh)
  const pull = useSharedValue(0)
  const header = useSharedValue<HeaderGeometry>({ offset: 0, collapsibleHeight: 0, measured: false })
  const onHeaderOffsetChange = useEvent<{ pull: number; offset: number; collapsibleHeight: number }>(
    (event) => {
      'worklet'
      pull.value = event.pull
      header.value = { offset: event.offset, collapsibleHeight: event.collapsibleHeight, measured: true }
    },
    ['topHeaderOffsetChange', 'onHeaderOffsetChange'],
  )

  if (!onRefresh) return { refreshing: false, pull, header, tabProps: { onHeaderOffsetChange } }

  return {
    refreshing,
    pull,
    header,
    tabProps: {
      refreshing,
      onRefresh: refresh,
      refreshTintColor: colors.muted,
      refreshBackgroundColor: colors.surface,
      refreshIndicatorHidden: false,
      onHeaderOffsetChange,
    },
  }
}
