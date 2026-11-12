import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import {
  Button,
  EmptyState,
  SearchField,
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
import type { TeamMember } from '@joutio/client-domain/authoring'
import { topicName } from '@/shared/utils/topic-name'
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
  const name = workshop.topic ? topicName(workshop.topic.names) : 'Sujet'
  const candidates = (suggestions.data ?? []).filter((p) => p.type === 'PLAYER' && !p.suspended && !team.data?.some((m) => m.userId === p.id))
  const remove = (member: TeamMember) =>
    showDialog({
      title: `Retirer ${member.pseudonym} ?`,
      message: 'Ses questions restent dans le sujet.',
      actions: [
        { label: 'Retirer', variant: 'tinted', tone: 'destructive', onPress: () => change.mutate({ member, remove: true }) },
        { label: 'Annuler', variant: 'plain' },
      ],
    })
  return (
    <Screen
      header={
        <MobileTopBar
          variant="inline"
          title="Équipe"
          back={name}
          onBack={() => router.back()}
          right={
            permissions?.canManageTeam ? (
              <IconButton
                icon={UserPlusIcon}
                label="Ajouter un rédacteur"
                variant="plain"
                tone="accent"
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
          <MobileSheet
            open={adding}
            title="Ajouter un rédacteur"
            subtitle={name}
            tall
            onClose={() => setAdding(false)}
            // Recherche collée en haut, hors de la liste : les lignes défilent dessous sans la chevaucher.
            stickyHeader={<SearchField label="Chercher un joueur" value={query} onChange={setQuery} placeholder="Chercher un joueur" />}
          >
            {suggestions.isError && <Text>La recherche a échoué. Réessaie.</Text>}
            {candidates.length > 0 && (
              <ListGroup>
                {candidates.map((player, index) => (
                  <PlayerRow
                    key={player.id}
                    name={player.label}
                    chevron
                    last={index === candidates.length - 1}
                    disabled={change.isPending}
                    src={avatarSvg(player.avatarOptions, player.id) ?? undefined}
                    onPress={() => {
                      change.mutate(
                        { member: { userId: player.id, pseudonym: player.label, avatarOptions: player.avatarOptions, role: 'WRITER', premium: false } },
                        { onSuccess: () => setAdding(false) },
                      )
                    }}
                  />
                ))}
              </ListGroup>
            )}
            {query.trim().length >= 2 && !suggestions.isPending && candidates.length === 0 && (
              <EmptyState icon={UserPlusIcon} title="Aucun joueur trouvé" description="Vérifie le pseudonyme ou essaie un autre mot." />
            )}
          </MobileSheet>
        </>
      }
      contentStyle={{ paddingHorizontal: tokens.space[5], paddingTop: tokens.space[1], paddingBottom: tokens.space[8], gap: tokens.space[6] }}
    >
      {team.isPending ? (
        <Text>Chargement de l’équipe…</Text>
      ) : team.isError ? (
        <EmptyState icon={UserPlusIcon} title="Équipe indisponible" action={<Button onPress={() => void team.refetch()}>Réessayer</Button>} />
      ) : (
        <>
          {(['ADMIN', 'WRITER'] as const).map((role) => {
            const members = (team.data ?? []).filter((member) =>
              role === 'ADMIN' ? member.role === 'CREATOR' || member.role === 'ADMIN' : member.role === 'WRITER',
            )
            return (
              <View key={role} style={{ gap: tokens.space[3] }}>
                <SectionHeader title={`${role === 'ADMIN' ? 'Administrateurs' : 'Rédacteurs'} · ${members.length}`} />
                {members.length > 0 && (
                  <ListGroup surface="surface">
                    {members.map((member, index) => (
                      <PlayerRow
                        key={member.userId}
                        name={member.pseudonym}
                        src={avatarSvg(member.avatarOptions, member.userId) ?? undefined}
                        sub={
                          member.role === 'CREATOR'
                            ? 'Créateur'
                            : member.role === 'ADMIN' && !member.premium
                              ? 'Droits de rédacteur · Premium requis'
                              : undefined
                        }
                        chevron={member.role !== 'CREATOR' && permissions?.canManageTeam}
                        last={index === members.length - 1}
                        disabled={change.isPending}
                        onPress={member.role !== 'CREATOR' && permissions?.canManageTeam ? () => setSelected(member) : undefined}
                      />
                    ))}
                  </ListGroup>
                )}
              </View>
            )
          })}
          <Text variant="caption" color="muted">
            Un administrateur valide les questions et gère l’équipe. Un rédacteur propose des questions, publiées après validation.
          </Text>
          <Text variant="caption" color="muted">
            Chaque administrateur doit être Premium. Les rédacteurs peuvent contribuer gratuitement.
          </Text>
        </>
      )}
    </Screen>
  )
}
