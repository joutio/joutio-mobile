import type { UserRefView } from '@joutio/client/api-types'
import { Button, EmptyState, PlayerRow, ProhibitIcon, Skeleton, WarningCircleIcon } from '@/design-system'
import { usePlayerIdentity } from '@/features/me'
import { useBlockedPlayers, useBlockPlayer } from '@/features/social/hooks/use-social'
import { useT } from '@/lib/i18n'
import { userAvatar } from '@/shared/utils/avatar'
import { Group, SettingsFrame } from './settings-frame'

/**
 * Joueurs bloqués (`reglages.md` § 1, Confidentialité et sécurité ; lab `reglages.tsx`) : un `PlayerRow` par joueur avec
 * « Débloquer », qui retire la ligne tout de suite ; `EmptyState` quand la liste est vide.
 */
export function BlockedPlayersScreen() {
  const t = useT()
  const blocked = useBlockedPlayers()
  const players = blocked.data ?? []
  return (
    <SettingsFrame title={t('privacy.blocked')} back={t('settings.privacyCategory')}>
      {blocked.isPending ? (
        <Skeleton shape="row" style={{ height: 64 }} />
      ) : blocked.isError ? (
        <EmptyState
          icon={WarningCircleIcon}
          title={t('social.errorTitle')}
          description={t('home.errorText')}
          action={
            <Button loading={blocked.isRefetching} onPress={() => void blocked.refetch()}>
              {t('common.retry')}
            </Button>
          }
        />
      ) : players.length === 0 ? (
        <EmptyState icon={ProhibitIcon} title={t('privacy.blockedEmpty')} description={t('privacy.blockedEmptyText')} />
      ) : (
        <Group footer={t('privacy.blockedFooter')}>
          {players.map((player, index) => (
            <BlockedRow key={player.userId} player={player} last={index === players.length - 1} />
          ))}
        </Group>
      )}
    </SettingsFrame>
  )
}

function BlockedRow({ player, last }: { player: UserRefView; last: boolean }) {
  const t = useT()
  const identity = usePlayerIdentity()
  const unblock = useBlockPlayer(player)
  return (
    <PlayerRow
      name={player.pseudonym}
      premium={identity.premium(player)}
      src={userAvatar(player)}
      onPress={identity.open(player.userId)}
      cta={{ label: t('player.unblock'), onPress: () => unblock.mutate(false) }}
      last={last}
    />
  )
}
