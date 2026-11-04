import type { ReactNode } from 'react'

export interface MenuItem {
  label: string
  /** Choix courant d'un menu de tri ou de filtre (coche). */
  checked?: boolean
  /** Icône système : SF Symbol sur iOS (`trash`), ressource Android (`ic_menu_delete`). */
  systemImage?: { ios?: string; android?: string }
  destructive?: boolean
  /** Ouvre un nouveau groupe (séparateur au-dessus). */
  separated?: boolean
  onPress?: () => void
}

export interface MenuProps {
  items: MenuItem[]
  title?: string
  /** Déclencheur (par exemple un `IconButton` sans `onPress`) : le toucher ouvre le menu. */
  children: ReactNode
}

/**
 * Menu contextuel **natif**, ancré sur son déclencheur : menu ⋯, tri, filtre. `.ios.tsx` (SwiftUI `Menu`) et
 * `.android.tsx` (Material `DropdownMenu`). Ordre et libellés du lab ; rendu du système (`PARITY.md` § 3).
 */
export function Menu({ children }: MenuProps) {
  return <>{children}</>
}
