import { countryFlag, countryName } from '@joutio/client/geo'
import { MAX_PSEUDONYM } from '@joutio/client/profile'
import type { ApiError } from '@joutio/client/api-types'
import { useNavigation, usePreventRemove } from 'expo-router'
import { router } from '@/shared/navigation/router'
import { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import {
  Avatar,
  Field,
  GlobeHemisphereWestIcon,
  ImagePicker,
  ListGroup,
  ListRow,
  MobileTopBar,
  Screen,
  showDialog,
  toast,
  tokens,
  WarningIcon,
} from '@/design-system'
import { useMyAvatar } from '@/features/avatar/lib/avatar-preview'
import { pickImage, uploadImage } from '@/features/media/media-service'
import { useMe } from '@/features/me'
import { CountryPicker } from '@/features/settings/components/country-picker'
import { pseudonymError, pseudonymHint } from '@/features/settings/lib/pseudonym-messages'
import { usePseudonymCheck, useUpdateMe } from '../hooks/use-profile'
import { currentLanguage, useT } from '@/lib/i18n'

const MAX_BIO = 160
/** Ratio de la bannière du profil (lab : 320 de haut sur la largeur du téléphone). */
const BANNER_ASPECT: [number, number] = [5, 4]

interface Draft {
  pseudonym: string
  bio: string
  country: string | null
  bannerUrl: string | null
}

/**
 * Éditer le profil (`design/specs/screens/editer-profil.md`) : page ouverte par le bouton du Profil, Annuler /
 * Enregistrer. Bannière, avatar (éditeur existant), pseudonyme vérifié en direct, bio et pays ; un seul enregistrement
 * pour les champs modifiés. Quitter avec des modifications demande confirmation. La date de naissance est dans
 * Réglages › Compte.
 */
export function EditProfileScreen() {
  const t = useT()
  const navigation = useNavigation()
  const me = useMe(true).data
  const avatar = useMyAvatar()
  const initial: Draft = { pseudonym: me?.pseudonym ?? '', bio: me?.bio ?? '', country: me?.country ?? null, bannerUrl: me?.bannerUrl ?? null }
  const [draft, setDraft] = useState<Draft>(initial)
  const [countryOpen, setCountryOpen] = useState(false)
  // Avancement de l'envoi d'image (0 à 100) ; `undefined` hors envoi.
  const [progress, setProgress] = useState<number | undefined>(undefined)
  const uploading = progress !== undefined
  const [saving, setSaving] = useState(false)
  const savePseudonym = useUpdateMe('pseudonym')
  const saveBio = useUpdateMe('bio')
  const saveCountry = useUpdateMe('country')
  const saveBanner = useUpdateMe('bannerUrl')
  const check = usePseudonymCheck(draft.pseudonym, me?.pseudonym)
  const changed = {
    pseudonym: draft.pseudonym.trim() !== initial.pseudonym,
    bio: draft.bio.trim() !== initial.bio,
    country: draft.country !== initial.country,
    bannerUrl: draft.bannerUrl !== initial.bannerUrl,
  }
  const dirty = Object.values(changed).some(Boolean)
  const pseudonymOk = !changed.pseudonym || check.state === 'available'

  // Retour système, geste ou Annuler avec des modifications : confirmation. « Abandonner » lève d'abord la protection,
  // puis rejoue le retour au rendu suivant : rejoué tout de suite, il était de nouveau intercepté et la feuille
  // revenait (2026-11-14).
  const [discarding, setDiscarding] = useState<Parameters<typeof navigation.dispatch>[0] | null>(null)
  useEffect(() => {
    if (discarding) navigation.dispatch(discarding)
  }, [discarding, navigation])
  usePreventRemove(dirty && !saving && !discarding, ({ data }) =>
    showDialog({
      sheet: true,
      icon: WarningIcon,
      title: t('editProfile.discardTitle'),
      message: t('editProfile.discardText'),
      actions: [
        { label: t('duel.abandon'), variant: 'tinted', tone: 'destructive', onPress: () => setDiscarding(data.action) },
        { label: t('editProfile.keepEditing'), variant: 'plain', tone: 'neutral' },
      ],
    }),
  )

  const picking = useRef(false)
  const pickBanner = async () => {
    if (uploading || picking.current) return
    picking.current = true
    try {
      const asset = await pickImage(BANNER_ASPECT)
      if (!asset) return
      setProgress(0)
      const media = await uploadImage(asset, setProgress)
      setDraft((current) => ({ ...current, bannerUrl: media.url }))
    } catch (error) {
      const problem = error as Partial<ApiError> | undefined
      toast.error(t('settings.imageError'), { description: problem?.detail || problem?.message || t('settings.imageRule') })
    } finally {
      picking.current = false
      setProgress(undefined)
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      if (changed.pseudonym) await savePseudonym.mutateAsync(draft.pseudonym.trim())
      if (changed.bio) await saveBio.mutateAsync(draft.bio.trim() || null)
      if (changed.country) await saveCountry.mutateAsync(draft.country)
      if (changed.bannerUrl) await saveBanner.mutateAsync(draft.bannerUrl)
      toast.success(t('editProfile.saved'))
      router.back()
    } catch {
      // Chaque mutation affiche sa propre erreur ; la page reste ouverte avec le brouillon.
      setSaving(false)
    }
  }

  return (
    <Screen
      header={
        <MobileTopBar
          variant="modal"
          title={t('profile.edit')}
          cancel={t('topic.cancel')}
          confirm={t('settings.save')}
          confirmDisabled={!dirty || !pseudonymOk || uploading || saving}
          onCancel={() => router.back()}
          onConfirm={() => void save()}
        />
      }
      overlay={
        <CountryPicker open={countryOpen} onClose={() => setCountryOpen(false)} value={draft.country} onChange={(country) => setDraft({ ...draft, country })} />
      }
      contentStyle={{ gap: tokens.space[6], paddingHorizontal: tokens.space[5], paddingTop: tokens.space[3], paddingBottom: tokens.space[7] }}
    >
      <ImagePicker
        image={draft.bannerUrl ?? undefined}
        hint={uploading ? t('media.uploadingPercent', { percent: progress }) : t('mobile.profile.bannerHint')}
        progress={progress}
        onPick={() => void pickBanner()}
        onRemove={() => setDraft({ ...draft, bannerUrl: null })}
      />
      <ListGroup surface="surface">
        <ListRow
          leading={<Avatar name={draft.pseudonym || t('mobile.authoring.me')} src={avatar} size="md" decorative />}
          label={t('editProfile.editAvatar')}
          control="chevron"
          onPress={() => router.push('/avatar')}
          last
        />
      </ListGroup>
      <View style={{ gap: tokens.space[4] }}>
        <Field
          label={t('settings.pseudonym')}
          value={draft.pseudonym}
          maxLength={MAX_PSEUDONYM}
          counter={t('mobile.authoring.counter', { count: draft.pseudonym.length, max: MAX_PSEUDONYM })}
          hint={check.state === 'unchanged' ? t('settings.pseudonymHint') : pseudonymHint(check)}
          error={pseudonymError(check)}
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={(pseudonym) => setDraft({ ...draft, pseudonym })}
        />
        <Field
          label={t('settings.bio')}
          placeholder={t('settings.bioPlaceholder')}
          multiline
          value={draft.bio}
          maxLength={MAX_BIO}
          counter={t('mobile.authoring.counter', { count: draft.bio.length, max: MAX_BIO })}
          onChangeText={(bio) => setDraft({ ...draft, bio })}
        />
      </View>
      <ListGroup surface="surface">
        <ListRow
          icon={GlobeHemisphereWestIcon}
          label={t('settings.country')}
          value={draft.country ? `${countryFlag(draft.country)} ${countryName(draft.country, currentLanguage())}` : t('country.hidden')}
          control="chevron"
          onPress={() => setCountryOpen(true)}
          last
        />
      </ListGroup>
    </Screen>
  )
}
