import { createContext } from 'react'
import type { SharedValue } from 'react-native-reanimated'

/** Les listes externes publient leur position au chrome de Screen. Les pagers possèdent leur propre géométrie. */
export const ScrollEdgeContext = createContext<SharedValue<number> | null>(null)
