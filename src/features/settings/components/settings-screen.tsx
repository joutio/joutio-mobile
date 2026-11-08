import { router } from 'expo-router'
import { PushPermissionRow } from '@/features/notifications/components/push-permission-row'
import { usePushRematches } from '@/features/notifications/hooks/use-push-preferences'
import * as WebBrowser from 'expo-web-browser'
import { useState } from 'react'
import { View } from 'react-native'
import {
  ArrowCounterClockwiseIcon,
  CheckCircleIcon,
  CrownSimpleIcon,
  FileTextIcon,
  LightningIcon,
  ListGroup,
  ListRow,
  MedalIcon,
  MobileTopBar,
  MobileSheet,
  RadioGroup,
  GlobeHemisphereWestIcon,
  PaletteIcon,
  SquaresFourIcon,
  PencilSimpleIcon,
  RobotIcon,
  Screen,
  SectionHeader,
  ShieldCheckIcon,
  showDialog,
  SignOutIcon,
  SpeakerHighIcon,
  tokens,
  TrashIcon,
  useDeviceSettings,
  useThemeStore,
  VibrateIcon,
} from '@/design-system'
import { useLogout } from '@/features/auth'
import { useMe } from '@/features/me'
import { useAutoTrain } from '@/features/play/hooks/use-play'
import { usePremiumSheet } from '@/features/premium/premium-store'
import { useNotificationPreferences, useSetNotificationPreference, useUpdateMe } from '@/features/profile/hooks/use-profile'
import { config } from '@/lib/config'
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
 * Réglages (`reglages.md`) : champs du profil, langue, apparence, duel, notifications et compte.
 * Sons, vibrations, détails des réponses, Revanches et Rangs et badges sont des réglages de l'appareil (§ 5).
 */
export function SettingsScreen() {
  const me = useMe(true)
  const data = me.data
  const logout = useLogout()
  const autoTrain = useAutoTrain()
  const device = useDeviceSettings()
  const rematches = usePushRematches()
  const appearance = useThemeStore((state) => state.preference)
  const setAppearance = useThemeStore((state) => state.setPreference)
  const language = useUpdateMe('language')
  const preferences = useNotificationPreferences()
  const setPreference = useSetNotificationPreference()
  const showPremium = usePremiumSheet((state) => state.show)
  const { rows, sheets } = useProfileFields(data)
  const rooms = preferences.data?.find((item) => item.category === 'ROOM')?.enabled ?? true
  const [preferenceSheet, setPreferenceSheet] = useState<'language' | 'appearance'>()

  const confirmLogout = () =>
    showDialog({
      title: 'Se déconnecter ?',
      message: 'Tes parties et ta progression restent liées à ton compte.',
      icon: SignOutIcon,
      sheet: true,
      actions: [
        { label: 'Se déconnecter', variant: 'tinted', tone: 'destructive', onPress: () => logout.mutateAsync() },
        { label: 'Annuler', variant: 'plain', tone: 'neutral' },
      ],
    })

  return (
    <Screen
      inTabs
      header={<MobileTopBar variant="inline" back="Profil" onBack={() => router.back()} title="Réglages" />}
      overlay={
        <>
          {sheets}
          <MobileSheet open={preferenceSheet === 'language'} onClose={() => setPreferenceSheet(undefined)} title="Langue">
            <ListGroup surface="surface">
              <RadioGroup label="Langue">
                {LANGUAGES.map((option, index) => (
                  <ListRow
                    key={option.value}
                    label={option.label}
                    control="radio"
                    on={(data?.language ?? 'fr') === option.value}
                    disabled={language.isPending}
                    last={index === LANGUAGES.length - 1}
                    onToggle={() => {
                      if (option.value === (data?.language ?? 'fr')) setPreferenceSheet(undefined)
                      else language.mutate(option.value, { onSuccess: () => setPreferenceSheet(undefined) })
                    }}
                  />
                ))}
              </RadioGroup>
            </ListGroup>
          </MobileSheet>
          <MobileSheet open={preferenceSheet === 'appearance'} onClose={() => setPreferenceSheet(undefined)} title="Apparence">
            <ListGroup surface="surface">
              <RadioGroup label="Apparence">
                {APPEARANCE.map((option, index) => (
                  <ListRow
                    key={option.value}
                    label={option.label}
                    control="radio"
                    on={appearance === option.value}
                    last={index === APPEARANCE.length - 1}
                    onToggle={() => {
                      setAppearance(option.value)
                      setPreferenceSheet(undefined)
                    }}
                  />
                ))}
              </RadioGroup>
            </ListGroup>
          </MobileSheet>
        </>
      }
      contentStyle={{ gap: tokens.space[6], paddingHorizontal: tokens.space[5], paddingTop: tokens.space[3], paddingBottom: tokens.space[7] }}
    >
      <Section title="Profil">{rows}</Section>

      <Section title="Langue">
        <ListGroup surface="surface">
          <ListRow
            icon={GlobeHemisphereWestIcon}
            label="Langue"
            value={LANGUAGES.find((option) => option.value === (data?.language ?? 'fr'))?.label}
            control="chevron"
            onPress={() => setPreferenceSheet('language')}
            last
          />
        </ListGroup>
      </Section>

      <Section title="Apparence">
        <ListGroup surface="surface">
          <ListRow
            icon={PaletteIcon}
            label="Apparence"
            value={APPEARANCE.find((option) => option.value === appearance)?.label}
            control="chevron"
            onPress={() => setPreferenceSheet('appearance')}
            last
          />
        </ListGroup>
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
            disabled={autoTrain.pending}
            onToggle={autoTrain.set}
            last
          />
        </ListGroup>
      </Section>

      <Section title="Notifications">
        <ListGroup surface="surface">
          <PushPermissionRow />
          <ListRow
            icon={LightningIcon}
            label="Défis et salons"
            control="toggle"
            on={rooms}
            disabled={setPreference.isPending}
            onToggle={(enabled) => setPreference.mutate({ category: 'ROOM', enabled })}
          />
          <ListRow
            icon={ArrowCounterClockwiseIcon}
            label="Revanches"
            control="toggle"
            on={device.notifyRematches}
            disabled={rematches.isPending}
            onToggle={(enabled) => rematches.mutate(enabled)}
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
          <ListRow icon={PencilSimpleIcon} label="Mes sujets" control="chevron" onPress={() => router.push('/profile/topics')} />
          <ListRow icon={ShieldCheckIcon} label="Confidentialité et données" control="chevron" onPress={() => openPage('/privacy')} />
          <ListRow icon={FileTextIcon} label="Conditions d'utilisation" control="chevron" onPress={() => openPage('/terms')} />
          <ListRow icon={SignOutIcon} label="Se déconnecter" control="none" destructive onPress={confirmLogout} last />
        </ListGroup>
        <ListGroup surface="surface">
          <ListRow icon={TrashIcon} label="Supprimer mon compte" control="none" destructive onPress={() => router.push('/profile/settings/delete')} last />
        </ListGroup>
      </Section>
      {__DEV__ && config.catalogEnabled && (
        <Section title="Dev">
          <ListGroup surface="surface">
            <ListRow icon={SquaresFourIcon} label="Catalogue des composants" control="chevron" onPress={() => router.push('/catalog')} last />
          </ListGroup>
        </Section>
      )}
    </Screen>
  )
}
