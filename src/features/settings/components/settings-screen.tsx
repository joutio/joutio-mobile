import { router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { View } from 'react-native'
import {
  ArrowCounterClockwiseIcon,
  Avatar,
  Button,
  CheckCircleIcon,
  CrownSimpleIcon,
  FileTextIcon,
  LightningIcon,
  ListGroup,
  ListRow,
  MedalIcon,
  MobileTopBar,
  PencilSimpleIcon,
  RobotIcon,
  Screen,
  SectionHeader,
  Segmented,
  ShieldCheckIcon,
  showDialog,
  SignOutIcon,
  SpeakerHighIcon,
  Text,
  tokens,
  TrashIcon,
  useDeviceSettings,
  useTheme,
  useThemeStore,
  VibrateIcon,
  type ThemePreference,
} from '@/design-system'
import { useLogout } from '@/features/auth'
import { useMyAvatar } from '@/features/avatar/lib/avatar-preview'
import { useMe } from '@/features/me'
import { useAutoTrain } from '@/features/play/hooks/use-play'
import { usePremiumSheet } from '@/features/premium/premium-store'
import { useNotificationPreferences, useSetNotificationPreference, useUpdateMe } from '@/features/profile/hooks/use-profile'
import { config } from '@/lib/config'
import type { Language } from '@/shared/types/bff'
import { tierOf } from '@/shared/utils/tier'
import { useProfileFields } from './profile-fields'

const LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
] as const

const APPEARANCE = [
  { value: 'dark', label: 'Sombre' },
  { value: 'light', label: 'Clair' },
  { value: 'system', label: 'Système' },
] as const

const openPage = (path: string) => void WebBrowser.openBrowserAsync(`${config.siteUrl}${path}`)

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: tokens.space[4] }}>
      <SectionHeader title={title} />
      {children}
    </View>
  )
}

/**
 * Réglages (`reglages.md`) : identité et avatar, champs du profil, langue, apparence, duel, notifications et compte.
 * Sons, vibrations, détails des réponses, Revanches et Rangs et badges sont des réglages de l'appareil (§ 5).
 */
export function SettingsScreen() {
  const { colors, radius } = useTheme()
  const me = useMe(true)
  const data = me.data
  const avatar = useMyAvatar()
  const logout = useLogout()
  const autoTrain = useAutoTrain()
  const device = useDeviceSettings()
  const appearance = useThemeStore((state) => state.preference)
  const setAppearance = useThemeStore((state) => state.setPreference)
  const language = useUpdateMe('language')
  const preferences = useNotificationPreferences()
  const setPreference = useSetNotificationPreference()
  const showPremium = usePremiumSheet((state) => state.show)
  const { rows, sheets } = useProfileFields(data)
  const rooms = preferences.data?.find((item) => item.category === 'ROOM')?.enabled ?? true
  const tier = data?.progression && !data.progression.provisional ? tierOf(data.progression.rating) : undefined

  const confirmLogout = () =>
    showDialog({
      title: 'Se déconnecter ?',
      message: 'Tes parties et ta progression restent liées à ton compte.',
      icon: SignOutIcon,
      sheet: true,
      actions: [
        { label: 'Se déconnecter', variant: 'tinted', tone: 'destructive', onPress: () => logout.mutate() },
        { label: 'Annuler', variant: 'plain', tone: 'neutral' },
      ],
    })

  return (
    <Screen
      inTabs
      header={<MobileTopBar variant="inline" back="Profil" onBack={() => router.back()} title="Réglages" />}
      overlay={sheets}
      contentStyle={{ gap: tokens.space[6], paddingHorizontal: tokens.space[5], paddingTop: tokens.space[3], paddingBottom: tokens.space[7] }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.space[4],
          borderRadius: radius.lg,
          backgroundColor: colors.surface,
          padding: tokens.space[4],
        }}
      >
        <Avatar name={data?.pseudonym ?? 'Moi'} src={avatar} tier={tier} size="lg" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="headline" numberOfLines={1}>
            {data?.pseudonym ?? ''}
          </Text>
          <Text variant="caption" color="muted" numberOfLines={1}>
            {data?.email ?? ''}
          </Text>
        </View>
        <Button size="S" variant="gray" tone="neutral" style={{ alignSelf: 'center' }} onPress={() => router.push('/avatar')}>
          Avatar
        </Button>
      </View>

      <Section title="Profil">{rows}</Section>

      <Section title="Langue">
        <Segmented<Language> label="Langue" options={LANGUAGES} value={data?.language ?? 'fr'} onChange={(next) => language.mutate(next)} />
      </Section>

      <Section title="Apparence">
        <Segmented<ThemePreference> label="Apparence" options={APPEARANCE} value={appearance} onChange={setAppearance} />
      </Section>

      <Section title="Duel">
        <ListGroup surface="surface">
          <ListRow icon={SpeakerHighIcon} label="Sons du duel" control="toggle" on={device.sounds} onToggle={(sounds) => device.set({ sounds })} />
          <ListRow icon={VibrateIcon} label="Vibrations" control="toggle" on={device.haptics} onToggle={(haptics) => device.set({ haptics })} />
          <ListRow
            icon={CheckCircleIcon}
            label="Icônes et points des réponses"
            sub="Coche, croix et points à la révélation"
            control="toggle"
            on={device.answerDetails}
            onToggle={(answerDetails) => device.set({ answerDetails })}
          />
          <ListRow
            icon={RobotIcon}
            label="Entraînement si aucun adversaire"
            sub="Après 10 s sans joueur, sans XP ni série"
            control="toggle"
            on={autoTrain.enabled}
            onToggle={autoTrain.set}
            last
          />
        </ListGroup>
      </Section>

      <Section title="Notifications">
        <ListGroup surface="surface">
          <ListRow
            icon={LightningIcon}
            label="Défis et salons"
            control="toggle"
            on={rooms}
            onToggle={(enabled) => setPreference.mutate({ category: 'ROOM', enabled })}
          />
          <ListRow
            icon={ArrowCounterClockwiseIcon}
            label="Revanches"
            control="toggle"
            on={device.notifyRematches}
            onToggle={(notifyRematches) => device.set({ notifyRematches })}
          />
          <ListRow
            icon={MedalIcon}
            label="Rangs et badges"
            control="toggle"
            on={device.notifyRanks}
            onToggle={(notifyRanks) => device.set({ notifyRanks })}
            last
          />
        </ListGroup>
      </Section>

      <Section title="Compte">
        <ListGroup surface="surface">
          <ListRow icon={CrownSimpleIcon} label="Premium" control="chevron" value={data?.premium ? 'Actif' : 'Bientôt'} onPress={() => showPremium()} />
          <ListRow icon={PencilSimpleIcon} label="Mes sujets" control="value" value="Bientôt" disabled />
          <ListRow icon={ShieldCheckIcon} label="Confidentialité et données" control="chevron" onPress={() => openPage('/privacy')} />
          <ListRow icon={FileTextIcon} label="Conditions d'utilisation" control="chevron" onPress={() => openPage('/terms')} />
          <ListRow icon={SignOutIcon} label="Se déconnecter" control="none" destructive onPress={confirmLogout} last />
        </ListGroup>
        <ListGroup surface="surface">
          <ListRow icon={TrashIcon} label="Supprimer mon compte" control="none" destructive onPress={() => router.push('/profile/settings/delete')} last />
        </ListGroup>
        {config.catalogEnabled && (
          <Button full variant="tinted" onPress={() => router.push('/catalog')}>
            Catalogue des composants
          </Button>
        )}
      </Section>
    </Screen>
  )
}
