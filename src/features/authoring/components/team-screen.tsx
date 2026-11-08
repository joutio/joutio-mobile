import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import {
  Button,
  EmptyState,
  Field,
  IconButton,
  ListGroup,
  ListRow,
  MobileSheet,
  MobileTopBar,
  PlayerRow,
  Screen,
  SectionHeader,
  ShieldCheckIcon,
  showDialog,
  Text,
  tokens,
  TrashIcon,
  UserPlusIcon,
} from '@/design-system'
import { useSuggestions } from '@/features/search/use-search'
import { useCreationLimits, useMyTopic, useTeam, useTeamChange } from '../hooks/use-authoring'
import type { TeamMember } from '../domain/authoring'
import { avatarSvg } from '@/shared/utils/avatar'

export function TeamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const workshop = useMyTopic(id)
  const { askPremium } = useCreationLimits()
  const team = useTeam(id)
  const change = useTeamChange(id)
  const [selected, setSelected] = useState<TeamMember>()
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')
  const suggestions = useSuggestions(query)
  const permissions = workshop.permissions
  const candidates = (suggestions.data ?? []).filter((p) => p.type === 'PLAYER' && !p.suspended && !team.data?.some((m) => m.userId === p.id))
  const remove = (member: TeamMember) =>
    showDialog({
      title: `Retirer ${member.pseudonym} ?`,
      message: 'Ses questions restent dans le sujet.',
      actions: [
        { label: 'Retirer', onPress: () => change.mutate({ member, remove: true }) },
        { label: 'Annuler', variant: 'plain' },
      ],
    })
  return (
    <Screen
      inTabs
      header={
        <MobileTopBar
          variant="inline"
          title="Équipe"
          back="Sujet"
          onBack={() => router.replace({ pathname: '/profile/topics/[id]', params: { id } })}
          right={
            permissions?.canManageTeam ? (
              <IconButton
                icon={UserPlusIcon}
                label="Ajouter un rédacteur"
                onPress={() => (permissions?.canAddMembers ? setAdding(true) : askPremium('team'))}
              />
            ) : undefined
          }
        />
      }
      overlay={
        <>
          <MobileSheet open={Boolean(selected)} title={selected?.pseudonym ?? ''} onClose={() => setSelected(undefined)}>
            {selected && (
              <ListGroup>
                {permissions?.canAddMembers && (
                  <ListRow
                    icon={ShieldCheckIcon}
                    label={selected.role === 'ADMIN' ? 'Passer rédacteur' : 'Passer administrateur (Premium)'}
                    control="none"
                    onPress={() => {
                      change.mutate({ member: { ...selected, role: selected.role === 'ADMIN' ? 'WRITER' : 'ADMIN' } })
                      setSelected(undefined)
                    }}
                  />
                )}
                <ListRow
                  icon={TrashIcon}
                  label="Retirer de l’équipe"
                  destructive
                  control="none"
                  onPress={() => {
                    remove(selected)
                    setSelected(undefined)
                  }}
                  last
                />
              </ListGroup>
            )}
          </MobileSheet>
          <MobileSheet open={adding} title="Ajouter un rédacteur" onClose={() => setAdding(false)}>
            <Field label="Pseudonyme" value={query} onChangeText={setQuery} placeholder="Chercher un joueur" />
            {suggestions.isError && <Text>La recherche a échoué. Réessaie.</Text>}
            {candidates.map((player) => (
              <PlayerRow
                key={player.id}
                name={player.label}
                src={avatarSvg(player.avatarOptions, player.id) ?? undefined}
                onPress={() => {
                  change.mutate(
                    { member: { userId: player.id, pseudonym: player.label, avatarOptions: player.avatarOptions, role: 'WRITER', premium: false } },
                    { onSuccess: () => setAdding(false) },
                  )
                }}
              />
            ))}
            {query.trim().length >= 2 && !suggestions.isPending && candidates.length === 0 && <Text>Aucun joueur trouvé</Text>}
          </MobileSheet>
        </>
      }
      contentStyle={{ paddingHorizontal: tokens.space[5], gap: tokens.space[4] }}
    >
      {team.isPending ? (
        <Text>Chargement de l’équipe…</Text>
      ) : team.isError ? (
        <EmptyState icon={UserPlusIcon} title="Équipe indisponible" action={<Button onPress={() => void team.refetch()}>Réessayer</Button>} />
      ) : (
        <>
          {(['CREATOR', 'ADMIN', 'WRITER'] as const).map((role) => (
            <View key={role} style={{ gap: tokens.space[2] }}>
              <SectionHeader title={role === 'CREATOR' ? 'Créateur' : role === 'ADMIN' ? 'Administrateurs' : 'Rédacteurs'} />
              {(team.data ?? [])
                .filter((m) => m.role === role)
                .map((member) => (
                  <PlayerRow
                    key={member.userId}
                    name={member.pseudonym}
                    src={avatarSvg(member.avatarOptions, member.userId) ?? undefined}
                    sub={role === 'ADMIN' && !member.premium ? 'Droits de rédacteur · Premium requis' : undefined}
                    onPress={role !== 'CREATOR' && permissions?.canManageTeam ? () => setSelected(member) : undefined}
                  />
                ))}
            </View>
          ))}
          <Text color="muted">Chaque administrateur doit être Premium. Les rédacteurs peuvent contribuer gratuitement.</Text>
        </>
      )}
    </Screen>
  )
}
