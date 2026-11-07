import { useState } from 'react'
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable'
import { CaretRightIcon, TrashIcon, type Icon } from '../icons'
import { HAIRLINE } from '../theme/hairline'
import { useTheme } from '../theme/theme-provider'
import { tokens, type TierCode } from '../tokens.generated'
import { Avatar, type Presence } from './avatar'
import { PressableScale } from './pressable-scale'
import { Text } from './text'

const DELETE_WIDTH = 80

export interface NotificationRowProps {
  title: string
  sub?: string
  /** Notification système. Ignorée si `player` est fourni. */
  icon?: Icon
  /** Joueur à l'origine de la notification. */
  player?: { name: string; src?: string; tier?: TierCode; presence?: Presence }
  unread?: boolean
  onPress?: () => void
  /** Révélée en balayant vers la gauche ; aussi proposée aux lecteurs d'écran (action « Supprimer »). */
  onDelete?: () => void
  last?: boolean
  style?: StyleProp<ViewStyle>
}

/**
 * Ligne de la boîte de réception : toucher ouvre l'écran qui propose l'action (défis, salon, fiche joueur), balayer
 * révèle Supprimer. **Aucun bouton d'action dans la ligne** (2026-11-07) : la notification ne fait que rediriger.
 */
export function NotificationRow({ title, sub, icon: IconComponent, player, unread = false, onPress, onDelete, last = false, style }: NotificationRowProps) {
  const { colors, radius } = useTheme()
  const [pressed, setPressed] = useState(false)
  const dimmed = pressed && Platform.OS !== 'android'

  const row = (
    <View style={[{ minHeight: 64, justifyContent: 'center', backgroundColor: colors.surface }, style]}>
      {/* Zone pressable sous le contenu : ripple d'un bord à l'autre, l'action reste au-dessus. */}
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={[title, sub, unread ? 'non lue' : undefined].filter(Boolean).join(', ')}
        accessibilityActions={onDelete ? [{ name: 'delete', label: 'Supprimer' }] : undefined}
        onAccessibilityAction={(event) => event.nativeEvent.actionName === 'delete' && onDelete?.()}
        pressedScale={1}
        ripple
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="box-none"
        style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space[3], paddingVertical: tokens.space[3], paddingHorizontal: tokens.space[5] }}
      >
        <View
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: tokens.space[4], opacity: dimmed ? 0.6 : 1 }}
        >
          {player ? (
            <Avatar name={player.name} src={player.src} tier={player.tier} presence={player.presence} size="list" decorative />
          ) : (
            <View style={{ width: 44, height: 44, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.raised }}>
              {IconComponent && <IconComponent size={22} color={colors.muted} />}
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="headline" weight={unread ? undefined : '400'} numberOfLines={1}>
              {title}
            </Text>
            {sub && (
              <Text variant="caption" color="muted" numberOfLines={1}>
                {sub}
              </Text>
            )}
          </View>
          {unread && <View style={{ width: 8, height: 8, borderRadius: radius.full, backgroundColor: colors.accent }} />}
        </View>
        <CaretRightIcon size={16} color={colors.muted} style={{ alignSelf: 'center' }} />
      </View>
      {!last && <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: HAIRLINE, backgroundColor: colors.border }} />}
    </View>
  )

  if (!onDelete) return row
  return (
    <ReanimatedSwipeable
      friction={1.6}
      rightThreshold={DELETE_WIDTH / 2}
      overshootRight={false}
      renderRightActions={() => (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Supprimer : ${title}`}
          pressedScale={1}
          onPress={onDelete}
          style={({ pressed: down }) => ({
            width: DELETE_WIDTH,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.wrong,
            opacity: down ? 0.85 : 1,
          })}
        >
          <TrashIcon size={22} color={colors.onWrong} />
        </PressableScale>
      )}
    >
      {row}
    </ReanimatedSwipeable>
  )
}
