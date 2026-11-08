import { NativeSegmented, type NativeSegmentedProps } from './native-segmented'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}
export interface SegmentedProps<T extends string> extends NativeSegmentedProps<T> {}

/** Choix exclusif natif. La navigation entre pages utilise JoutioTabs. */
export function Segmented<T extends string>(props: SegmentedProps<T>) {
  return <NativeSegmented {...props} />
}
