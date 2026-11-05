import { Image } from 'expo-image'
import { useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import { Button, EmptyState, ListGroup, ListRow, MobileSheet, SearchField, Skeleton, SwordIcon, tokens } from '@/design-system'
import { useChallengePlayer } from '@/features/play/hooks/use-play'
import type { PlayerCardView } from '@/shared/types/bff'
import { topicName } from '@/shared/utils/topic-name'
import { usePlayerTopics } from '../hooks/use-social'

/**
 * Choix du sujet avant d'envoyer un défi nominatif (`fiche-joueur.md` § 2). Les sujets joués viennent de
 * `GET /api/profiles/{id}/topics` ; la recherche et l'affichage par 20 se font côté client, la liste étant déjà
 * bornée par le profil.
 */
export function ChallengePlayerSheet({ player, onClose, onSent }: { player: PlayerCardView | null; onClose: () => void; onSent?: () => void }) {
  const topics = usePlayerTopics(player?.userId ?? '', Boolean(player))
  const challenge = useChallengePlayer()
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState(20)

  useEffect(() => {
    if (!player) return
    setQuery('')
    setVisible(20)
  }, [player])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return (topics.data ?? []).filter((topic) => !term || topicName(topic.names).toLowerCase().includes(term))
  }, [topics.data, query])
  const shown = filtered.slice(0, visible)

  const pick = (topicId: string, name: string) => {
    if (!player) return
    challenge.mutate(
      { topic: { topicId, name }, opponent: { userId: player.userId, pseudonym: player.pseudonym } },
      {
        onSuccess: () => {
          onSent?.()
          onClose()
        },
      },
    )
  }

  return (
    <MobileSheet open={Boolean(player)} onClose={onClose} title="Défier" subtitle={player?.pseudonym} tall>
      <View style={{ gap: tokens.space[4] }}>
        <SearchField value={query} onChange={setQuery} placeholder="Chercher un sujet" label="Chercher un sujet" />
        {topics.isPending ? (
          <View style={{ gap: tokens.space[2] }}>
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} shape="row" />
            ))}
          </View>
        ) : topics.isError ? (
          <EmptyState
            icon={SwordIcon}
            title="Impossible de charger les sujets"
            description="Vérifie ta connexion, puis réessaie."
            action={
              <Button style={{ alignSelf: 'center' }} loading={topics.isRefetching} onPress={() => void topics.refetch()}>
                Réessayer
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={SwordIcon}
            title={query ? 'Aucun sujet trouvé' : 'Aucun sujet joué'}
            description={query ? 'Essaie un autre mot.' : 'Ce joueur n’a encore joué aucun sujet.'}
          />
        ) : (
          <>
            <ListGroup>
              {shown.map((topic, index) => (
                <ListRow
                  key={topic.topicId}
                  label={topicName(topic.names)}
                  sub={`${topic.games} ${topic.games > 1 ? 'parties' : 'partie'}`}
                  leading={
                    topic.imageUrl ? (
                      <Image source={{ uri: topic.imageUrl }} contentFit="cover" style={{ width: 44, height: 44, borderRadius: tokens.radius.md }} />
                    ) : undefined
                  }
                  last={index === shown.length - 1}
                  onPress={() => pick(topic.topicId, topicName(topic.names))}
                />
              ))}
            </ListGroup>
            {filtered.length > visible && (
              <Button variant="plain" tone="neutral" full onPress={() => setVisible((current) => current + 20)}>
                Afficher plus de sujets
              </Button>
            )}
          </>
        )}
      </View>
    </MobileSheet>
  )
}
