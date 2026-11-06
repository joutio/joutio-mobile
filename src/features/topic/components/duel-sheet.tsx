import { useState } from 'react'
import { View } from 'react-native'
import {
  Button,
  EmptyState,
  FeedFooter,
  GlobeHemisphereWestIcon,
  LinkIcon,
  ListGroup,
  ListRow,
  MagnifyingGlassIcon,
  MobileSheet,
  PlayerRow,
  RadioGroup,
  RobotIcon,
  SearchField,
  Segmented,
  Text,
  tokens,
  UserPlusIcon,
  type Icon,
} from '@/design-system'
import type { BotDifficulty } from '@/features/duel/domain/game-dto'
import {
  useBotDifficulty,
  useChallengePlayer,
  useContacts,
  useCreatePrivateRoom,
  useStartMatchmaking,
  useStartTraining,
  type PlayTopic,
} from '@/features/play/hooks/use-play'
import { tierOf } from '@/shared/utils/tier'
import { userAvatar } from '@/shared/utils/avatar'

type Step = 'modes' | 'training' | 'player'
type Mode = 'world' | 'training' | 'room' | 'player'
type Contacts = 'following' | 'followers'

const MODES: { value: Mode; icon: Icon; label: string; sub: string }[] = [
  { value: 'world', icon: GlobeHemisphereWestIcon, label: 'Défier le monde', sub: 'Adversaire en direct, apparié par Elo' },
  { value: 'training', icon: RobotIcon, label: "S'entraîner avec un robot", sub: 'Aucune expérience gagnée' },
  { value: 'room', icon: LinkIcon, label: 'Créer un salon', sub: 'Salon privé à partager par lien' },
  { value: 'player', icon: UserPlusIcon, label: 'Défier un joueur', sub: 'Invitation nominative, à accepter ou refuser' },
]

const LEVELS: { value: BotDifficulty; label: string; sub: string }[] = [
  { value: 'EASY', label: 'Facile', sub: 'Robot détendu' },
  { value: 'NORMAL', label: 'Normal', sub: 'Équilibré' },
  { value: 'HARD', label: 'Difficile', sub: 'Robot affûté' },
]

const CONTACTS = [
  { value: 'following', label: 'Mes abonnements' },
  { value: 'followers', label: 'Mes abonnés' },
] as const

/** Choix de l'adversaire parmi les contacts, puis envoi du défi (aussi utilisé par le matchmaking). */
export function PlayerPicker({ topic, onSent }: { topic: PlayTopic; onSent: () => void }) {
  const [contacts, setContacts] = useState<Contacts>('following')
  const [query, setQuery] = useState('')
  const list = useContacts(contacts, query.trim(), true)
  const challenge = useChallengePlayer()
  const players = list.data?.pages.flatMap((page) => page.content) ?? []

  return (
    <View style={{ gap: tokens.space[4] }}>
      <SearchField value={query} onChange={setQuery} placeholder="Chercher un joueur" label="Chercher un joueur" />
      <Segmented label="Contacts" options={CONTACTS} value={contacts} onChange={setContacts} />
      {list.isPending ? null : players.length === 0 ? (
        <EmptyState
          icon={MagnifyingGlassIcon}
          title={query ? 'Aucun joueur trouvé' : contacts === 'following' ? "Tu ne suis personne pour l'instant" : "Personne ne te suit pour l'instant"}
          description={query ? 'Vérifie le pseudonyme ou essaie un autre mot.' : 'Seuls tes contacts apparaissent ici.'}
        />
      ) : (
        <>
          <ListGroup>
            {players.map((player, index) => (
              <PlayerRow
                key={player.userId}
                name={player.pseudonym}
                src={userAvatar(player)}
                tier={player.provisional ? undefined : tierOf(player.rating)}
                presence={player.presence?.status === 'ONLINE' ? 'online' : 'offline'}
                sub={player.presence?.status === 'ONLINE' ? 'En ligne' : undefined}
                chevron
                last={index === players.length - 1}
                onPress={() => challenge.mutate({ topic, opponent: { userId: player.userId, pseudonym: player.pseudonym } }, { onSuccess: onSent })}
              />
            ))}
          </ListGroup>
          <FeedFooter
            state={list.isFetchNextPageError ? 'error' : list.isFetchingNextPage ? 'loading' : list.hasNextPage ? 'more' : 'end'}
            onLoadMore={() => void list.fetchNextPage()}
            onRetry={() => void list.fetchNextPage()}
            endLabel="Tu as vu tous les joueurs"
          />
        </>
      )}
    </View>
  )
}

/**
 * « Lancer un duel » (`lancer-partie.md` § 1) : les quatre modes. Difficulté et adversaire s'ouvrent dans une feuille
 * empilée sur celle des modes ; la fermer ramène aux modes. La difficulté reste en mémoire sur l'appareil.
 */
export function DuelSheet({ open, onClose, topic }: { open: boolean; onClose: () => void; topic: PlayTopic }) {
  const [step, setStep] = useState<Step>('modes')
  const { difficulty, set: setDifficulty } = useBotDifficulty()
  const training = useStartTraining()
  const matchmaking = useStartMatchmaking()
  const room = useCreatePrivateRoom()

  const close = () => {
    setStep('modes')
    onClose()
  }
  const choose = (mode: Mode) => {
    if (mode === 'training') return setStep('training')
    if (mode === 'player') return setStep('player')
    if (mode === 'world') matchmaking.mutate(topic, { onSuccess: close })
    else room.mutate(topic, { onSuccess: close })
  }
  const busy = matchmaking.isPending || room.isPending

  return (
    <>
      <MobileSheet open={open} onClose={close} title="Lancer un duel" subtitle={topic.name}>
        <ListGroup>
          {MODES.map((mode, index) => (
            <ListRow
              key={mode.value}
              icon={mode.icon}
              label={mode.label}
              sub={mode.sub}
              control="chevron"
              disabled={busy}
              last={index === MODES.length - 1}
              onPress={() => choose(mode.value)}
            />
          ))}
        </ListGroup>
      </MobileSheet>
      <MobileSheet
        open={open && step === 'training'}
        onClose={() => setStep('modes')}
        title="Quelle difficulté ?"
        subtitle={topic.name}
        footer={
          <Button full loading={training.isPending} onPress={() => training.mutate({ topic, difficulty }, { onSuccess: close })}>
            {"Lancer l'entraînement"}
          </Button>
        }
      >
        <View style={{ gap: tokens.space[4] }}>
          <ListGroup>
            <RadioGroup label="Difficulté">
              {LEVELS.map((level, index) => (
                <ListRow
                  key={level.value}
                  icon={RobotIcon}
                  label={level.label}
                  sub={level.sub}
                  control="radio"
                  on={difficulty === level.value}
                  onToggle={() => setDifficulty(level.value)}
                  last={index === LEVELS.length - 1}
                />
              ))}
            </RadioGroup>
          </ListGroup>
          <Text variant="caption" color="muted" align="center">
            Aucune expérience gagnée : la progression vient des duels entre joueurs.
          </Text>
        </View>
      </MobileSheet>
      <MobileSheet open={open && step === 'player'} onClose={() => setStep('modes')} title="Qui veux-tu défier ?" subtitle={topic.name} tall>
        <PlayerPicker topic={topic} onSent={close} />
      </MobileSheet>
    </>
  )
}
