import { Image } from 'expo-image'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { ImageIcon, TrashIcon } from '../icons'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { IconButton } from './icon-button'
import { PressableScale } from './pressable-scale'
import { ProgressBar } from './progress-bar'
import { Text } from './text'
import { t, useT } from '@/lib/i18n'

export interface ImagePickerProps {
  /** Image choisie (URL ou fichier local). */
  image?: string
  /** Consigne de l'état vide. */
  hint?: string
  error?: string
  /** Envoi en cours : l'aperçu reste, estompé. */
  busy?: boolean
  /**
   * Avancement de l'envoi, de 0 à 100 (2026-11-16) : barre de progression sous la consigne (sur l'image, dans un
   * bandeau `surface`), choix et retrait inactifs. La consigne dit alors l'avancement (« Envoi de l'image · 42 % »).
   */
  progress?: number
  onPick?: () => void
  onRemove?: () => void
  style?: StyleProp<ViewStyle>
}

/** Choix d'une image, facultative. Le sélecteur de la photothèque appartient à l'écran. */
export function ImagePicker({
  image,
  hint = t('ds.addImage'),
  error,
  busy: busyProp = false,
  progress,
  onPick,
  onRemove,
  style,
}: ImagePickerProps) {
  const t = useT()
  const { colors, radius } = useTheme()
  const uploading = progress !== undefined
  const busy = busyProp || uploading
  return (
    <View style={[{ gap: tokens.space[2] }, style]}>
      {image ? (
        <View style={{ height: 160, overflow: 'hidden', borderRadius: radius.md }}>
          <Image source={{ uri: image }} contentFit="cover" style={{ width: '100%', height: '100%', opacity: busy ? 0.6 : 1 }} accessibilityIgnoresInvertColors />
          {uploading && (
            <View
              style={{
                position: 'absolute',
                left: tokens.space[3],
                right: tokens.space[3],
                bottom: tokens.space[3],
                gap: tokens.space[2],
                borderRadius: radius.sm,
                paddingHorizontal: tokens.space[4],
                paddingVertical: tokens.space[3],
                backgroundColor: colors.surface,
              }}
            >
              <Text variant="caption">{hint}</Text>
              <ProgressBar value={progress} accessibilityLabel={hint} />
            </View>
          )}
          <View style={{ position: 'absolute', top: tokens.space[3], right: tokens.space[3], flexDirection: 'row', gap: tokens.space[3] }}>
            <IconButton icon={ImageIcon} label={t('ds.changeImage')} variant="gray" size="S" onPress={onPick} disabled={busy} />
            <IconButton icon={TrashIcon} label={t('ds.removeImage')} variant="gray" size="S" onPress={onRemove} disabled={busy} />
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
          {uploading && <ProgressBar value={progress} accessibilityLabel={hint} style={{ width: 160 }} />}
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
