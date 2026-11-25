import { router } from '@/shared/navigation/router'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, EmptyState, ForceDark, HourglassLowIcon, tokens, useTheme, UserCircleDashedIcon, TopBannerFrame, useScreenTopInset } from '@/design-system'
import { useStartMatchmaking } from '@/features/play/hooks/use-play'
import { useT } from '@/lib/i18n'

/**
 * Partie expirée (`etats-systeme.md`) : « Adversaire absent » si elle n'a jamais démarré, « Partie expirée » sinon.
 * Écran sombre, Elo inchangé. Refaire une recherche remplace le duel par l'appariement, sur le même sujet.
 */
export function DuelCancelled({ started, topicId, topicName, category }: { started: boolean; topicId?: string; topicName: string; category?: string }) {
  const t = useT()
  const insets = useSafeAreaInsets()
  const screenTop = useScreenTopInset()
  const matchmaking = useStartMatchmaking()
  // Refaire une recherche remplace le duel par l'appariement : le duel est quitté, puis la recherche s'ouvre.
  const search = () => {
    if (!topicId) return router.back()
    matchmaking.mutate({ topicId, name: topicName, category }, { onSuccess: () => router.back() })
  }

  return (
    <ForceDark>
      <Content insetsTop={screenTop} insetsBottom={insets.bottom}>
        <EmptyState
          icon={started ? HourglassLowIcon : UserCircleDashedIcon}
          title={started ? t('duel.expired') : t('duel.absent')}
          description={started ? t('duel.expiredText') : t('duel.absentText')}
          action={
            <View style={{ alignSelf: 'stretch', gap: tokens.space[2] }}>
              <Button full loading={matchmaking.isPending} onPress={search}>
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
    <TopBannerFrame style={{ backgroundColor: colors.bg }}>
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
    </TopBannerFrame>
  )
}
