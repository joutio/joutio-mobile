export interface HeaderGeometry {
  offset: number
  collapsibleHeight: number
  measured: boolean
}

/** Derniers 8 pt avant le collage, calculés dans le repère du conteneur natif. */
export function headerDockProgress(header: HeaderGeometry, pinned = true) {
  'worklet'
  if (!pinned || !header.measured) return 0
  const distance = Math.max(0, header.collapsibleHeight)
  if (distance === 0) return 1
  return Math.max(0, Math.min(1, 1 - (distance - header.offset) / Math.min(8, distance)))
}

/** Le séparateur apparaît seulement lorsque du contenu passe sous le chrome. */
export function scrollEdgeProgress(offset: number) {
  'worklet'
  return Math.max(0, Math.min(1, offset / 8))
}

/** Règle commune aux pages avec et sans en-tête repliable. */
export function headerSeparators(header: HeaderGeometry, scroll: number, pinned = true) {
  'worklet'
  const offset = Math.max(header.offset, scroll)
  const docking = headerDockProgress(header, pinned)
  const visible = scrollEdgeProgress(offset)
  return { offset, docking, top: visible * (1 - docking), bottom: visible * docking }
}

/** Aucun filet sur une barre en parallaxe tant que le titre compact n’est pas entièrement visible. */
export function compactHeaderEdge(progress: number): number {
  'worklet'
  return progress >= 1 ? 1 : 0
}
