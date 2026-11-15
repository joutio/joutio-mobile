import { router } from '@/shared/navigation/router'
import { useState } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, EmptyState, ForceDark, HourglassLowIcon, toast, tokens, useTheme, UserCircleDashedIcon } from '@/design-system'
import { playService } from '@/features/play/lib/play-service'
import { useT } from '@/lib/i18n'

/**
 * Partie expirée (`etats-systeme.md`) : « Adversaire absent » si elle n'a jamais démarré, « Partie expirée » sinon.
 * Écran sombre, Elo inchangé. Refaire une recherche remplace le duel par l'appariement, sur le même sujet.
 */
export function DuelCancelled({ started, topicId, topicName, category }: { started: boolean; topicId?: string; topicName: string; category?: string }) {
  const t = useT()
  const insets = useSafeAreaInsets()
  const [searching, setSearching] = useState(false)

  const search = async () => {
    if (!topicId) return router.back()
    setSearching(true)
    try {
      const ticket = await playService.enqueue(topicId)
      router.replace({ pathname: '/matchmaking/[ticketId]', params: { ticketId: ticket.ticketId, topicId, topicName, category: category ?? '' } })
    } catch {
      setSearching(false)
      toast.error(t('play.matchmakingError'), { description: t('home.errorText') })
    }
  }

  return (
    <ForceDark>
      <Content insetsTop={insets.top} insetsBottom={insets.bottom}>
        <EmptyState
          icon={started ? HourglassLowIcon : UserCircleDashedIcon}
          title={started ? t('duel.expired') : t('duel.absent')}
          description={
            started
              ? t('duel.expiredText')
              : t('duel.absentText')
          }
          action={
            <View style={{ alignSelf: 'stretch', gap: tokens.space[2] }}>
              <Button full loading={searching} onPress={() => void search()}>
                {t('duel.searchAgain')}
              </Button>
              <Button full variant="plain" tone="neutral" onPress={() => router.back()}>
                {t('duel.backToTopic')}
              </Button>
            </View>
          }
        />
      </Content>
    </ForceDark>
  )
}

function Content({ insetsTop, insetsBottom, children }: { insetsTop: number; insetsBottom: number; children: React.ReactNode }) {
  const { colors } = useTheme()
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: tokens.space[5],
        paddingTop: insetsTop,
        paddingBottom: insetsBottom,
        backgroundColor: colors.bg,
      }}
    >
      {children}
    </View>
  )
}
