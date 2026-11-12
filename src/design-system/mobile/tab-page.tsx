import { createContext, useContext, type ComponentType } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import { useTabBarInset, withBottomInset } from './tab-bar-inset'

/**
 * Page d'onglets visible ou non. iOS ne fait remonter en haut au toucher de la barre d'état que si **un seul**
 * défilement de l'écran l'accepte (`scrollsToTop`) : les pages cachées du pager le refusent.
 */
export const TabPageActiveContext = createContext(true)

/**
 * Défilement de page d'onglets qui n'accepte `scrollsToTop` que sur la page visible ; son contenu finit au-dessus de
 * la tab bar native iOS (`useTabBarInset`).
 */
export function withActivePageScrollsToTop<P extends { scrollsToTop?: boolean }>(List: ComponentType<P>) {
  const Wrapped = (props: P) => {
    const active = useContext(TabPageActiveContext)
    const inset = useTabBarInset()
    // Padding, pas `contentInset` : la bibliothèque des onglets repliables gère elle-même l'inset bas de ses pages.
    const contentContainerStyle = withBottomInset((props as { contentContainerStyle?: StyleProp<ViewStyle> }).contentContainerStyle, inset)
    return <List {...props} contentContainerStyle={contentContainerStyle} scrollsToTop={active && props.scrollsToTop !== false} />
  }
  Wrapped.displayName = `ActivePage(${List.displayName ?? List.name ?? 'List'})`
  return Wrapped as ComponentType<P>
}
