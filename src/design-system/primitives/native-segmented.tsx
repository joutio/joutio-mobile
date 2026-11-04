import type { StyleProp, ViewStyle } from 'react-native'

export interface NativeSegmentedProps<T extends string> {
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  label: string
  style?: StyleProp<ViewStyle>
}

/** Contrôle segmenté natif : `.ios.tsx` (SwiftUI) et `.android.tsx` (Material 3). Aucun ailleurs. */
export function NativeSegmented<T extends string>(_props: NativeSegmentedProps<T>): null {
  return null
}
