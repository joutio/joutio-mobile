import { router, useLocalSearchParams } from 'expo-router'
import { useMemo, useState } from 'react'
import { View } from 'react-native'
import {
  EmptyState,
  FeedFooter,
  IconButton,
  ListGroup,
  ListRow,
  MobileSheet,
  MobileTopBar,
  PlayerRow,
  Screen,
  SearchField,
  SectionHeader,
  ShieldCheckIcon,
  showDialog,
  Text,
  toast,
  tokens,
  TrashIcon,
  UserPlusIcon,
} from '@/design-system'
import { useMyAvatar } from '@/features/avatar/lib/avatar-preview'
import { useMe } from '@/features/me'
import { tierOf } from '@/shared/utils/tier'
import { CANDIDATES_MOCK, CANDIDATES_PAGE, TEAM_MOCK, type TeamMemberMock, type TeamRole } from '../lib/team-mocks'
import { clientSource, feedFooterProps, loadMoreOptions } from '@/shared/utils/paging'

/**
 * Équipe (`creation.md` § 1) : **maquettée**, le backend n'a pas de rôles. Administrateurs et Rédacteurs ; le
 * créateur (le joueur connecté) n'est pas modifiable. Une ligne ouvre une feuille : changer le rôle, retirer après
 * confirmation. + invite un rédacteur, 20 candidats par page.
 */
export function TeamScreen() {
  const params = useLocalSearchParams<{ id: string; name?: string }>()
  const me = useMe(true)
  const ownerAvatar = useMyAvatar()
  const [team, setTeam] = useState<readonly TeamMemberMock[]>(TEAM_MOCK)
  const [selected, setSelected] = useState<TeamMemberMock>()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [pages, setPages] = useState(1)
  const topic = params.name ?? 'Mon sujet'
  const ownerName = me.data?.pseudonym ?? ''
  const ownerTier = me.data?.progression && !me.data.progression.provisional ? tierOf(me.data.progression.rating) : undefined

  const setRole = (member: TeamMemberMock, role: TeamRole) => {
    setTeam(team.map((item) => (item.id === member.id ? { ...item, role } : item)))
    setSelected(undefined)
  }
  const confirmRemove = (member: TeamMemberMock) =>
    showDialog({
      title: `Retirer ${member.name} ?`,
      message: 'Ses questions déjà publiées restent dans le sujet.',
      icon: TrashIcon,
      tone: 'danger',
      sheet: true,
      actions: [
        { label: 'Retirer', variant: 'tinted', tone: 'destructive', onPress: () => setTeam((current) => current.filter((item) => item.id !== member.id)) },
        { label: 'Annuler', variant: 'plain', tone: 'neutral' },
      ],
    })

  const search = query.trim().toLowerCase()
  const candidates = useMemo(
    () => CANDIDATES_MOCK.filter((player) => !team.some((member) => member.id === player.id) && player.name.toLowerCase().includes(search)),
    [team, search],
  )
  const shownCandidates = candidates.slice(0, pages * CANDIDATES_PAGE)
  const candidateSource = clientSource(pages, setPages, shownCandidates.length < candidates.length)

  const admins = team.filter((member) => member.role === 'admin')
  const writers = team.filter((member) => member.role === 'writer')

  const section = (title: string, members: readonly TeamMemberMock[], withOwner = false) => (
    <View style={{ gap: tokens.space[3] }}>
      <SectionHeader title={`${title} · ${members.length + (withOwner ? 1 : 0)}`} />
      {(members.length > 0 || withOwner) && (
        <ListGroup surface="surface">
          {withOwner && <PlayerRow name={ownerName} src={ownerAvatar} tier={ownerTier} sub="Créateur" last={members.length === 0} />}
          {members.map((member, index) => (
            <PlayerRow key={member.id} name={member.name} tier={member.tier} chevron onPress={() => setSelected(member)} last={index === members.length - 1} />
          ))}
        </ListGroup>
      )}
    </View>
  )

  return (
    <Screen
      inTabs
      header={
        <MobileTopBar
          variant="inline"
          back="Sujet"
          onBack={() => router.back()}
          title="Équipe"
          right={
            <IconButton
              icon={UserPlusIcon}
              label="Inviter un rédacteur"
              variant="plain"
              tone="accent"
              onPress={() => {
                setQuery('')
                setPages(1)
                setInviteOpen(true)
              }}
            />
          }
        />
      }
      overlay={
        <>
          <MobileSheet open={selected !== undefined} onClose={() => setSelected(undefined)} title={selected?.name ?? ''}>
            {selected && (
              <ListGroup>
                <ListRow
                  icon={ShieldCheckIcon}
                  label={selected.role === 'admin' ? 'Passer rédacteur' : 'Passer administrateur'}
                  control="none"
                  onPress={() => setRole(selected, selected.role === 'admin' ? 'writer' : 'admin')}
                />
                <ListRow
                  icon={TrashIcon}
                  label="Retirer de l'équipe"
                  control="none"
                  destructive
                  onPress={() => {
                    const member = selected
                    setSelected(undefined)
                    confirmRemove(member)
                  }}
                  last
                />
              </ListGroup>
            )}
          </MobileSheet>
          <MobileSheet
            open={inviteOpen}
            onClose={() => setInviteOpen(false)}
            title="Inviter un rédacteur"
            subtitle={topic}
            tall
            loadMore={loadMoreOptions(candidateSource)}
            stickyHeader={
              <SearchField
                value={query}
                onChange={(next) => {
                  setQuery(next)
                  setPages(1)
                }}
                placeholder="Chercher un joueur"
                label="Chercher un joueur"
              />
            }
          >
            <View style={{ gap: tokens.space[3] }}>
              {candidates.length > 0 ? (
                <>
                  <ListGroup>
                    {shownCandidates.map((player, index) => (
                      <PlayerRow
                        key={player.id}
                        name={player.name}
                        tier={player.tier}
                        chevron
                        onPress={() => {
                          setTeam([...team, { ...player, role: 'writer' }])
                          setInviteOpen(false)
                          toast.success(`${player.name} rejoint l'équipe`)
                        }}
                        last={index === shownCandidates.length - 1}
                      />
                    ))}
                  </ListGroup>
                  <FeedFooter {...feedFooterProps(candidateSource)} endLabel="Tu as vu tous les joueurs" />
                </>
              ) : (
                <EmptyState icon={UserPlusIcon} title="Aucun joueur trouvé" description="Vérifie le pseudonyme ou essaie un autre mot." />
              )}
            </View>
          </MobileSheet>
        </>
      }
      contentStyle={{ gap: tokens.space[6], paddingHorizontal: tokens.space[5], paddingTop: tokens.space[1], paddingBottom: tokens.space[7] }}
    >
      {section('Administrateurs', admins, true)}
      {section('Rédacteurs', writers)}
      <Text variant="caption" color="muted">
        Un administrateur valide les questions, gère l'équipe et modère le mur. Un rédacteur propose des questions, publiées après validation.
      </Text>
    </Screen>
  )
}
