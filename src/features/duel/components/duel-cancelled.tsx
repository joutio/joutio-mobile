import { router } from '@/shared/navigation/router'
import { useState } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, EmptyState, ForceDark, HourglassLowIcon, toast, tokens, useTheme, UserCircleDashedIcon } from '@/design-system'
import { playService } from '@/features/play/lib/play-service'

/**
 * Partie expirée (`etats-systeme.md`) : « Adversaire absent » si elle n'a jamais démarré, « Partie expirée » sinon.
 * Écran sombre, Elo inchangé. Refaire une recherche remplace le duel par l'appariement, sur le même sujet.
 */
export function DuelCancelled({ started, topicId, topicName, category }: { started: boolean; topicId?: string; topicName: string; category?: string }) {
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
      toast.error("La recherche n'a pas pu démarrer", { description: 'Vérifie ta connexion, puis réessaie.' })
    }
  }

  return (
    <ForceDark>
      <Content insetsTop={insets.top} insetsBottom={insets.bottom}>
        <EmptyState
          icon={started ? HourglassLowIcon : UserCircleDashedIcon}
          title={started ? 'Partie expirée' : 'Adversaire absent'}
          description={
            started
              ? "La partie n'a pas été jouée à temps. Rien ne change pour ton Elo."
              : "La partie n'a jamais démarré : un joueur ne s'est pas présenté. Rien ne change pour ton Elo."
          }
          action={
            <View style={{ alignSelf: 'stretch', gap: tokens.space[2] }}>
              <Button full loading={searching} onPress={() => void search()}>
                Refaire une recherche
              </Button>
              <Button full variant="plain" tone="neutral" onPress={() => router.back()}>
                Retour au sujet
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
