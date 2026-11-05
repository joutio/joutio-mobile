import { View, type StyleProp, type ViewStyle } from 'react-native'
import { LockSimpleIcon } from '../icons'
import { useTheme } from '../theme/theme-provider'

/** Traitement commun à tout élément de rang verrouillé (`opacity-40 grayscale` du lab). */
export const LOCKED_STYLE = { opacity: 0.4, filter: [{ grayscale: 1 }] } satisfies ViewStyle

/** Pastille cadenas, à positionner dans un parent relatif. Décorative : le parent annonce « verrouillé ». */
export function LockBadge({ size, style }: { size: number; style?: StyleProp<ViewStyle> }) {
  const { colors, radius } = useTheme()
  return (
    <View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.full,
          backgroundColor: colors.text,
        },
        style,
      ]}
    >
      <LockSimpleIcon weight="fill" size={size / 2} color={colors.bg} />
    </View>
  )
}
