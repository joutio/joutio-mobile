import { usePathname } from 'expo-router'
import { View } from 'react-native'
import { useAcceptInvitation, useDeclineInvitations, useIncomingRematch } from '@joutio/client/rooms'
import { RematchPrompt, toast, tokens, useTheme, useToastStore } from '@/design-system'
import { usePlayerIdentity } from '@/features/me'
import { router } from '@/shared/navigation/router'
import { userAvatar } from '@/shared/utils/avatar'
import { topicName } from '@/shared/utils/topic-name'
import { useSecondsUntil } from '../lib/countdown'
import { useT } from '@/lib/i18n'

/**
 * Revanche reçue (`useIncomingRematch` : salle `INVITED` d'origine `REMATCH`, tenue à jour par `ROOM_STATUS`) :
 * `RematchPrompt` sur un voile. Jamais pendant un duel (écrans immersifs, toasts suspendus) : la demande attend la fin
 * s'il reste du temps. Accepter ouvre la salle (même `roomId`) ; refuser, ou laisser filer l'échéance du serveur, ferme
 * la proposition.
 */
export function IncomingRematch() {
  const t = useT()
  const { colors } = useTheme()
  const identity = usePlayerIdentity()
  const immersive = useToastStore((state) => state.suspended > 0)
  const request = useIncomingRematch().data
  const seconds = useSecondsUntil(request?.expiresAt)
  const pathname = usePathname()
  const accept = useAcceptInvitation()
  const decline = useDeclineInvitations()

  if (!request || immersive || seconds <= 0) return null
  const topic = topicName(request.topic.names)
  const onAccept = () => {
    accept.mutate(request.roomId, { onError: () => toast.error(t('mobile.rematch.unavailable')) })
    // Revanche acceptée depuis le résultat : la salle remplace la partie précédente, Quitter ne ramène pas à
    // l'ancien résultat (2026-11-16).
    const navigate = /^\/(duel|result)\//.test(pathname) ? router.replace : router.push
    navigate({
      pathname: '/room/[roomId]',
      params: { roomId: request.roomId, topicId: request.topic.topicId, topicName: topic, category: request.topic.category ?? '' },
    })
  }
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        paddingHorizontal: tokens.space[5],
        backgroundColor: colors.scrim,
        zIndex: 50,
      }}
    >
      <RematchPrompt
        name={request.opponent?.pseudonym ?? t('topic.opponent')}
        premium={identity.premium(request.opponent)}
        src={userAvatar(request.opponent ?? undefined)}
        topic={topic}
        seconds={seconds}
        accepting={accept.isPending}
        declining={decline.isPending}
        onAccept={onAccept}
        onDecline={() => decline.mutate([request.roomId], { onError: () => toast.error(t('challenges.declineError')) })}
      />
    </View>
  )
}
