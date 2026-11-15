import { useLocalSearchParams } from 'expo-router'
import { router } from '@/shared/navigation/router'
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
import { usePlayerIdentity } from '@/features/me'
import { useSuggestions } from '@/features/search/use-search'
import { useCreationLimits, useMyTopic, useTeam, useTeamChange } from '../hooks/use-authoring'
import type { TeamMember } from '@joutio/client/authoring'
import { topicName } from '@/shared/utils/topic-name'
import { avatarSvg } from '@/shared/utils/avatar'
import { useT } from '@/lib/i18n'

export function TeamScreen() {
  const t = useT()
  const identity = usePlayerIdentity()
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
  const name = workshop.topic ? topicName(workshop.topic.names) : t('pending.topic')
  const candidates = (suggestions.data ?? []).filter((p) => p.type === 'PLAYER' && !p.suspended && !team.data?.some((m) => m.userId === p.id))
  const remove = (member: TeamMember) =>
    showDialog({
      title: t('workshop.removeTitle', { name: member.pseudonym }),
      message: t('mobile.authoring.removeText'),
      actions: [
        { label: t('workshop.remove'), variant: 'tinted', tone: 'destructive', onPress: () => change.mutate({ member, remove: true }) },
        { label: t('topic.cancel'), variant: 'plain' },
      ],
    })
  return (
    <Screen
      header={
        <MobileTopBar
          variant="inline"
          title={t('workshop.team')}
          back={name}
          onBack={() => router.back()}
          right={
            permissions?.canManageTeam ? (
              <IconButton
                icon={UserPlusIcon}
                label={t('workshop.invite')}
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
                    label={selected.role === 'ADMIN' ? t('workshop.makeWriter') : t('mobile.authoring.makeAdmin')}
                    control="none"
                    onPress={() => {
                      change.mutate({ member: { ...selected, role: selected.role === 'ADMIN' ? 'WRITER' : 'ADMIN' } })
                      setSelected(undefined)
                    }}
                  />
                )}
                <ListRow
                  icon={TrashIcon}
                  label={t('mobile.authoring.removeFromTeam')}
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
            title={t('workshop.invite')}
            subtitle={name}
            tall
            onClose={() => setAdding(false)}
            // Recherche collée en haut, hors de la liste : les lignes défilent dessous sans la chevaucher.
            stickyHeader={<SearchField label={t('play.searchPlayer')} value={query} onChange={setQuery} placeholder={t('play.searchPlayer')} />}
          >
            {suggestions.isError && <Text>{t('mobile.authoring.searchFailed')}</Text>}
            {candidates.length > 0 && (
              <ListGroup>
                {candidates.map((player, index) => (
                  <PlayerRow
                    key={player.id}
                    name={player.label}
                    premium={identity.premium(player, player.id)}
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
              <EmptyState icon={UserPlusIcon} title={t('play.noPlayerTitle')} description={t('play.noPlayerText')} />
            )}
          </MobileSheet>
        </>
      }
      contentStyle={{ paddingHorizontal: tokens.space[5], paddingTop: tokens.space[1], paddingBottom: tokens.space[8], gap: tokens.space[6] }}
    >
      {team.isPending ? (
        <Text>{t('mobile.authoring.teamLoading')}</Text>
      ) : team.isError ? (
        <EmptyState icon={UserPlusIcon} title={t('mobile.authoring.teamUnavailable')} action={<Button onPress={() => void team.refetch()}>{t('callback.retry')}</Button>} />
      ) : (
        <>
          {(['ADMIN', 'WRITER'] as const).map((role) => {
            const members = (team.data ?? []).filter((member) =>
              role === 'ADMIN' ? member.role === 'CREATOR' || member.role === 'ADMIN' : member.role === 'WRITER',
            )
            return (
              <View key={role} style={{ gap: tokens.space[3] }}>
                <SectionHeader title={t('common.labelCount', { label: t(role === 'ADMIN' ? 'workshop.admins' : 'workshop.writers'), count: members.length })} />
                {members.length > 0 && (
                  <ListGroup surface="surface">
                    {members.map((member, index) => (
                      <PlayerRow
                        key={member.userId}
                        name={member.pseudonym}
                        premium={identity.premium(member)}
                        src={avatarSvg(member.avatarOptions, member.userId) ?? undefined}
                        sub={
                          member.role === 'CREATOR'
                            ? t('workshop.creator')
                            : member.role === 'ADMIN' && !member.premium
                              ? t('mobile.authoring.editorPremium')
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
            {t('mobile.authoring.rolesText')}
          </Text>
          <Text variant="caption" color="muted">
            {t('mobile.authoring.adminPremiumText')}
          </Text>
        </>
      )}
    </Screen>
  )
}
