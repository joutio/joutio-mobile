import { router } from '@/shared/navigation/router'
import {
  BellIcon,
  CrownSimpleIcon,
  GameControllerIcon,
  LifebuoyIcon,
  ListRow,
  Notice,
  PaletteIcon,
  ShieldCheckIcon,
  showDialog,
  SignOutIcon,
  SquaresFourIcon,
  UserCircleIcon,
} from '@/design-system'
import { useLogout } from '@/features/auth'
import { useCatalogAccess } from '@/features/auth/hooks/use-catalog-access'
import { useMe } from '@/features/me'
import { usePremiumSheet } from '@/features/premium/premium-store'
import { Group, openSettingsPage, SettingsFrame, useSettingsOrigin } from './settings-frame'
import { useT } from '@/lib/i18n'

/**
 * Réglages (`reglages.md` § 1, refonte du 2026-11-13) : racine de catégories, ouverte par la roue dentée du Profil ou
 * de l'Accueil. Carte Premium, catégories (une page chacune), Création et Inviter, Aide, Se déconnecter. Les champs
 * publics du profil sont dans Éditer le profil.
 */
export function SettingsScreen() {
  const t = useT()
  const origin = useSettingsOrigin()
  const catalogAccess = useCatalogAccess()
  const data = useMe(true).data
  const logout = useLogout()
  const showPremium = usePremiumSheet((state) => state.show)
  const open = (page: Parameters<typeof openSettingsPage>[1]) => () => openSettingsPage(origin, page)

  const confirmLogout = () =>
    showDialog({
      title: t('settings.logoutTitle'),
      message: t('settings.logoutText'),
      icon: SignOutIcon,
      sheet: true,
      actions: [
        { label: t('onboarding.ended.logout'), variant: 'tinted', tone: 'destructive', onPress: () => logout.mutateAsync() },
        { label: t('topic.cancel'), variant: 'plain', tone: 'neutral' },
      ],
    })

  return (
    <SettingsFrame title={t('profile.settings')} root>
      <Notice
        tone={data?.premium ? 'success' : 'live'}
        icon={CrownSimpleIcon}
        title={data?.premium ? t('settings.premiumCardActive') : t('settings.premiumCard')}
        message={data?.premium ? t('settings.premiumCardActiveText') : t('settings.premiumCardText')}
        action={{ label: data?.premium ? t('workshop.manage') : t('settings.premiumDiscover'), onPress: () => showPremium() }}
      />
      <Group>
        <ListRow icon={UserCircleIcon} label={t('settings.account')} sub={t('settings.accountSub')} control="chevron" onPress={open('account')} />
        <ListRow icon={ShieldCheckIcon} label={t('settings.privacyCategory')} control="chevron" onPress={open('privacy')} />
        <ListRow icon={BellIcon} label={t('home.notifications')} control="chevron" onPress={open('notifications')} />
        <ListRow icon={GameControllerIcon} label={t('settings.game')} sub={t('settings.gameSub')} control="chevron" onPress={open('game')} />
        <ListRow icon={PaletteIcon} label={t('settings.display')} control="chevron" onPress={open('display')} last />
      </Group>
      <Group>
        <ListRow icon={LifebuoyIcon} label={t('settings.help')} control="chevron" onPress={open('help')} last />
      </Group>
      <Group>
        <ListRow icon={SignOutIcon} label={t('onboarding.ended.logout')} control="none" destructive onPress={confirmLogout} last />
      </Group>
      {catalogAccess && (
        <Group title="Dev">
          <ListRow icon={SquaresFourIcon} label={t('mobile.settings.catalog')} control="chevron" onPress={() => router.push('/catalog')} last />
        </Group>
      )}
    </SettingsFrame>
  )
}
