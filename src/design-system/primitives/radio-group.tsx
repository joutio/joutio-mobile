import type { ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'

export interface RadioGroupProps {
  /** Nom accessible du groupe. */
  label: string
  style?: StyleProp<ViewStyle>
  children: ReactNode
}

/**
 * Groupe d'options à choix unique (`ListRow`, `TopicRow`, `PlanOption`, `AnswerEditorRow`…). Aucun rendu propre.
 * Sur téléphone, pas de navigation au clavier : le lecteur d'écran parcourt les options dans l'ordre.
 */
export function RadioGroup({ label, style, children }: RadioGroupProps) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={style}>
      {children}
    </View>
  )
}
