import { useContext, type ReactNode, type Ref } from 'react'
import { ScrollView, View, type ScrollViewInstance, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native'
import { HeaderHeightContext } from 'expo-router/react-navigation'
import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme/theme-provider'

export interface ScreenProps {
  header?: ReactNode
  /**
   * En-tête natif (`nativeHeaderOptions`) : pas de safe area haute ici ; le défilement passe sous l'en-tête
   * translucide iOS et pilote le repli du grand titre.
   */
  nativeHeader?: boolean
  /** Barre fixe au-dessus de la bottom nav : action, ligne du joueur, etc. */
  bottomBar?: ReactNode
  /** Écran racine d'un onglet : la barre d'onglets porte déjà la safe area basse. */
  inTabs?: boolean
  /** Feuilles, dialogs et toasts. */
  overlay?: ReactNode
  /**
   * `true` (défaut) : le contenu défile dans un ScrollView. `false` : l'écran fournit sa liste
   * (FlatList, SectionList) qui remplit la place.
   */
  scroll?: boolean
  scrollProps?: Omit<ScrollViewProps, 'children'>
  scrollRef?: Ref<ScrollViewInstance>
  contentStyle?: StyleProp<ViewStyle>
  children: ReactNode
}

/**
 * Structure d'un écran : header fixe sous la safe area haute, contenu qui défile (seule zone mobile),
 * barre basse facultative, safe area basse si l'écran n'est pas dans les onglets.
 */
export function Screen({
  header,
  nativeHeader = false,
  bottomBar,
  inTabs = false,
  overlay,
  scroll = true,
  scrollProps,
  scrollRef,
  contentStyle,
  children,
}: ScreenProps) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const headerHeight = useContext(HeaderHeightContext) ?? 0
  // iOS : l'en-tête natif est translucide et posé sur le contenu ; un contenu fixe doit le contourner.
  const underHeader = nativeHeader && Platform.OS === 'ios'
  const bottom = inTabs || bottomBar ? 0 : insets.bottom

  const scroller = (
    <ScrollView
      ref={scrollRef}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior={underHeader ? 'automatic' : 'never'}
      {...scrollProps}
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[{ paddingBottom: bottom }, contentStyle]}
    >
      {children}
    </ScrollView>
  )
  const extras = (
    <>
      {bottomBar && <View style={{ paddingBottom: inTabs ? 0 : insets.bottom, backgroundColor: colors.bg }}>{bottomBar}</View>}
      {overlay}
    </>
  )

  // En-tête natif iOS : le ScrollView doit être le **premier enfant** de l'écran, sinon l'en-tête ne le trouve pas
  // (grand titre qui ne se replie pas, pas d'effet de bord de défilement).
  if (nativeHeader && scroll) {
    return (
      <>
        {scroller}
        {extras}
      </>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {!nativeHeader && <View style={{ paddingTop: insets.top }}>{header}</View>}
      {scroll ? scroller : <View style={[{ flex: 1, paddingTop: underHeader ? headerHeight : 0, paddingBottom: bottom }, contentStyle]}>{children}</View>}
      {extras}
    </View>
  )
}
