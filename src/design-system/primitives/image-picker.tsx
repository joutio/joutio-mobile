import { Image } from 'expo-image'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { ImageIcon, TrashIcon } from '../icons'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { IconButton } from './icon-button'
import { PressableScale } from './pressable-scale'
import { Text } from './text'

export interface ImagePickerProps {
  /** Image choisie (URL ou fichier local). */
  image?: string
  /** Consigne de l'état vide. */
  hint?: string
  error?: string
  /** Envoi en cours : l'aperçu reste, estompé. */
  busy?: boolean
  onPick?: () => void
  onRemove?: () => void
  style?: StyleProp<ViewStyle>
}

/** Choix d'une image, facultative. Le sélecteur de la photothèque appartient à l'écran. */
export function ImagePicker({
  image,
  hint = 'Ajouter une image · facultatif · JPG ou PNG, 5 Mo',
  error,
  busy = false,
  onPick,
  onRemove,
  style,
}: ImagePickerProps) {
  const { colors, radius } = useTheme()
  return (
    <View style={[{ gap: tokens.space[2] }, style]}>
      {image ? (
        <View style={{ height: 160, overflow: 'hidden', borderRadius: radius.md, opacity: busy ? 0.6 : 1 }}>
          <Image source={{ uri: image }} contentFit="cover" style={{ width: '100%', height: '100%' }} accessibilityIgnoresInvertColors />
          <View style={{ position: 'absolute', top: tokens.space[3], right: tokens.space[3], flexDirection: 'row', gap: tokens.space[3] }}>
            <IconButton icon={ImageIcon} label="Changer l'image" variant="gray" size="S" onPress={onPick} disabled={busy} />
            <IconButton icon={TrashIcon} label="Retirer l'image" variant="gray" size="S" onPress={onRemove} disabled={busy} />
          </View>
        </View>
      ) : (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={hint}
          onPress={onPick}
          disabled={busy}
          style={{
            height: 96,
            alignItems: 'center',
            justifyContent: 'center',
            gap: tokens.space[2],
            borderRadius: radius.md,
            paddingHorizontal: tokens.space[5],
            backgroundColor: colors.raised,
            borderWidth: error ? 2 : 1,
            borderStyle: error ? 'solid' : 'dashed',
            borderColor: error ? colors.wrong : colors.border,
          }}
        >
          <ImageIcon size={20} color={colors.muted} />
          <Text variant="caption" color="muted" align="center">
            {hint}
          </Text>
        </PressableScale>
      )}
      {error && (
        <Text variant="caption" color="wrong">
          {error}
        </Text>
      )}
    </View>
  )
}
