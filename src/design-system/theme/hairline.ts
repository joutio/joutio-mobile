import { StyleSheet } from 'react-native'

/** Filet natif : un pixel physique (0,33 pt sur un écran @3x), à la place du 1 px du lab. */
export const HAIRLINE = StyleSheet.hairlineWidth

/** Contour intérieur fin (`ring-1 ring-inset` du lab). */
export const hairlineRing = (color: string) => `inset 0 0 0 ${HAIRLINE}px ${color}`
