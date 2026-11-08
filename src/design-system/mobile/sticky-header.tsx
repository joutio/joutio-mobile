import { createContext } from 'react'
import type { SharedValue } from 'react-native-reanimated'

/** Transfert de séparation sur le thread UI, sans changement de géométrie. */
export const StickyHeaderContext = createContext<{ docking: SharedValue<number>; offset: SharedValue<number> } | null>(null)
