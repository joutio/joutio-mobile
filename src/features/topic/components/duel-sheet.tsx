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
import type { BotDifficulty } from '@joutio/client/game'
import {
  useBotDifficulty,
  useChallengePlayer,
  useContacts,
  useCreatePrivateRoom,
  useStartMatchmaking,
  useStartTraining,
  type PlayTopic,
} from '@/features/play/hooks/use-play'
import { usePlayerIdentity } from '@/features/me'
import { tierOf } from '@/shared/utils/tier'
import { userAvatar } from '@/shared/utils/avatar'
import { feedFooterProps, loadMoreOptions, pagedQuery } from '@/shared/utils/paging'
import { t, useT } from '@/lib/i18n'

type Step = 'modes' | 'training' | 'player'
type Mode = 'world' | 'training' | 'room' | 'player'
type Contacts = 'following' | 'followers'

const MODES = (): { value: Mode; icon: Icon; label: string; sub: string }[] => ([
  { value: 'world', icon: GlobeHemisphereWestIcon, label: t('play.modeWorld'), sub: t('mobile.duel.worldSub') },
  { value: 'player', icon: UserPlusIcon, label: t('play.modePlayer'), sub: t('play.modePlayerSub') },
  { value: 'training', icon: RobotIcon, label: t('play.modeTraining'), sub: t('play.modeTrainingSub') },
  { value: 'room', icon: LinkIcon, label: t('play.modeRoom'), sub: t('play.modeRoomSub') },
])

const LEVELS = (): { value: BotDifficulty; label: string; sub: string }[] => ([
  { value: 'EASY', label: t('play.levelEasy'), sub: t('mobile.duel.easySub') },
  { value: 'NORMAL', label: t('play.levelNormal'), sub: t('play.levelNormalSub') },
  { value: 'HARD', label: t('play.levelHard'), sub: t('mobile.duel.hardSub') },
])

const CONTACTS = () => ([
  { value: 'following', label: t('play.following') },
  { value: 'followers', label: t('play.followers') },
] as const)

/**
 * « Qui veux-tu défier ? » : choix de l'adversaire parmi les contacts, puis envoi du défi (aussi utilisé par le
 * matchmaking). Grande feuille paginée au geste (`loadMore`).
 */
export function PlayerPickerSheet({ open, onClose, topic, onSent }: { open: boolean; onClose: () => void; topic: PlayTopic; onSent: () => void }) {
  const t = useT()
  const identity = usePlayerIdentity()
  const [contacts, setContacts] = useState<Contacts>('following')
  const [query, setQuery] = useState('')
  const list = useContacts(contacts, query.trim(), open)
  const challenge = useChallengePlayer()
  const players = list.data?.pages.flatMap((page) => page.content) ?? []
  const paged = pagedQuery(list)

  return (
    <MobileSheet open={open} onClose={onClose} title={t('play.playerTitle')} subtitle={topic.name} tall loadMore={loadMoreOptions(paged)}>
      <View style={{ gap: tokens.space[4] }}>
        <SearchField value={query} onChange={setQuery} placeholder={t('play.searchPlayer')} label={t('play.searchPlayer')} />
        <Segmented label={t('play.contacts')} options={CONTACTS()} value={contacts} onChange={setContacts} />
        {list.isPending ? null : players.length === 0 ? (
          <EmptyState
            icon={MagnifyingGlassIcon}
            title={query ? t('play.noPlayerTitle') : contacts === 'following' ? t('social.followingEmptyTitle') : t('mobile.duel.noFollower')}
            description={query ? t('play.noPlayerText') : t('mobile.duel.contactsOnly')}
          />
        ) : (
          <>
            <ListGroup>
              {players.map((player, index) => (
                <PlayerRow
                  key={player.userId}
                  loading={challenge.isPending && challenge.variables?.opponent.userId === player.userId}
                  disabled={challenge.isPending}
                  name={player.pseudonym}
                  premium={identity.premium(player)}
                  src={userAvatar(player)}
                  tier={tierOf(player.rating)}
                  presence={player.presence?.status === 'ONLINE' ? 'online' : 'offline'}
                  sub={player.presence?.status === 'ONLINE' ? t('presence.online') : undefined}
                  chevron
                  last={index === players.length - 1}
                  onPress={() => challenge.mutate({ topic, opponent: { userId: player.userId, pseudonym: player.pseudonym } }, { onSuccess: onSent })}
                />
              ))}
            </ListGroup>
            <FeedFooter {...feedFooterProps(paged)} endLabel={t('play.playersEnd')} />
          </>
        )}
      </View>
    </MobileSheet>
  )
}

/**
 * « Lancer un duel » (`lancer-partie.md` § 1) : les quatre modes. Difficulté et adversaire s'ouvrent dans une feuille
 * empilée sur celle des modes ; la fermer ramène aux modes. La difficulté reste en mémoire sur l'appareil.
 */
export function DuelSheet({ open, onClose, topic }: { open: boolean; onClose: () => void; topic: PlayTopic }) {
  const t = useT()
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
      <MobileSheet open={open} onClose={close} title={t('topic.duel')} subtitle={topic.name}>
        <ListGroup>
          {MODES().map((mode, index) => (
            <ListRow
              key={mode.value}
              icon={mode.icon}
              label={mode.label}
              sub={mode.sub}
              control="chevron"
              disabled={busy}
              last={index === MODES().length - 1}
              onPress={() => choose(mode.value)}
            />
          ))}
        </ListGroup>
      </MobileSheet>
      <MobileSheet
        open={open && step === 'training'}
        onClose={() => setStep('modes')}
        title={t('play.levelTitle')}
        subtitle={topic.name}
        footer={
          <Button full loading={training.isPending} onPress={() => training.mutate({ topic, difficulty }, { onSuccess: close })}>
            {t('play.startTraining')}
          </Button>
        }
      >
        <View style={{ gap: tokens.space[4] }}>
          <ListGroup>
            <RadioGroup label={t('play.level')}>
              {LEVELS().map((level, index) => (
                <ListRow
                  key={level.value}
                  icon={RobotIcon}
                  label={level.label}
                  sub={level.sub}
                  control="radio"
                  on={difficulty === level.value}
                  onToggle={() => setDifficulty(level.value)}
                  last={index === LEVELS().length - 1}
                />
              ))}
            </RadioGroup>
          </ListGroup>
          <Text variant="caption" color="muted" align="center">
            {t('play.noXp')}
          </Text>
        </View>
      </MobileSheet>
      <PlayerPickerSheet open={open && step === 'player'} onClose={() => setStep('modes')} topic={topic} onSent={close} />
    </>
  )
}
