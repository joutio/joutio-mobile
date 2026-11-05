import { useState } from 'react'
import { ChallengeListRow, ListGroup, MedalIcon, NotificationRow, SparkleIcon, TrophyIcon } from '@/design-system'
import { Specimen } from './kit'

export function NotificationRowDemo() {
  const [deleted, setDeleted] = useState<string[]>([])
  const [followed, setFollowed] = useState(false)
  const rows = [
    {
      id: 'challenge',
      title: 'Sofia R. te défie',
      sub: 'Rap français · expire dans 52 min',
      player: { name: 'Sofia R.', tier: 'DIAMANT' as const, presence: 'online' as const },
      unread: true,
      cta: { label: 'Jouer' },
    },
    {
      id: 'follow',
      title: "Yanis M. s'est abonné à toi",
      sub: 'il y a 3 h',
      player: { name: 'Yanis M.', tier: 'PLATINE' as const },
      cta: { label: followed ? 'Suivi' : 'Suivre', variant: (followed ? 'gray' : 'tinted') as 'gray' | 'tinted', onPress: () => setFollowed(!followed) },
    },
    { id: 'win', title: 'Duel gagné contre Idriss B.', sub: 'Elo +14 · il y a 1 h', icon: TrophyIcon, unread: true },
    { id: 'badge', title: 'Badge Rapidité · Or', sub: '30 réponses rapides · lundi', icon: MedalIcon },
    { id: 'topic', title: 'Nouveau sujet : Films de Miyazaki', sub: 'Cinéma · dimanche', icon: SparkleIcon },
  ].filter((row) => !deleted.includes(row.id))
  return (
    <Specimen label="Balayer vers la gauche pour supprimer">
      <ListGroup surface="surface">
        {rows.map(({ id, ...row }, index) => (
          <NotificationRow key={id} {...row} onPress={() => undefined} onDelete={() => setDeleted([...deleted, id])} last={index === rows.length - 1} />
        ))}
      </ListGroup>
    </Specimen>
  )
}

export function ChallengeListRowDemo() {
  return (
    <ListGroup surface="surface">
      <ChallengeListRow
        name="Sofia R."
        tier="DIAMANT"
        presence="online"
        sub="Rap français · expire dans 52 min"
        primary={{ label: 'Accepter' }}
        secondary={{ label: 'Refuser' }}
      />
      <ChallengeListRow
        name="Idriss B."
        tier="OR"
        sub="Rois de France · en attente · 2 j"
        primaryVariant="tinted"
        primary={{ label: 'Relancer', disabled: true }}
        secondary={{ label: 'Annuler' }}
        last
      />
    </ListGroup>
  )
}
