import { createContext, useContext, type ComponentType } from 'react'

/**
 * Page d'onglets visible ou non. iOS ne fait remonter en haut au toucher de la barre d'état que si **un seul**
 * défilement de l'écran l'accepte (`scrollsToTop`) : les pages cachées du pager le refusent.
 */
export const TabPageActiveContext = createContext(true)

/** Défilement de page d'onglets qui n'accepte `scrollsToTop` que sur la page visible. */
export function withActivePageScrollsToTop<P extends { scrollsToTop?: boolean }>(List: ComponentType<P>) {
  const Wrapped = (props: P) => {
    const active = useContext(TabPageActiveContext)
    return <List {...props} scrollsToTop={active && props.scrollsToTop !== false} />
  }
  Wrapped.displayName = `ActivePage(${List.displayName ?? List.name ?? 'List'})`
  return Wrapped as ComponentType<P>
}
