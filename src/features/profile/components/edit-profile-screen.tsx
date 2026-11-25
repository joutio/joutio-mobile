import { zodResolver } from '@hookform/resolvers/zod'
import { MAX_BIO, MAX_PSEUDONYM, useUpdateBanner } from '@joutio/client/profile'
import { profileSchema, useMe, useUpdateMyProfile } from '@joutio/client/me'
import { countryFlag, countryName } from '@joutio/client/core/geo'
import type { ApiError } from '@joutio/client/core/types'
import { useNavigation, usePreventRemove } from 'expo-router'
import { router } from '@/shared/navigation/router'
import { useEffect, useRef, useState } from 'react'
import { Controller, useForm, useFormState, useWatch } from 'react-hook-form'
import { View } from 'react-native'
import { z } from 'zod'
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
import { CountryPicker } from '@/features/settings/components/country-picker'
import { pseudonymError, pseudonymHint } from '@/features/settings/lib/pseudonym-messages'
import { profileSaveError, usePseudonymCheck } from '../hooks/use-profile'
import { currentLanguage, useT } from '@/lib/i18n'

/** Ratio de la bannière du profil (lab : 320 de haut sur la largeur du téléphone). */
const BANNER_ASPECT: [number, number] = [5, 4]

/**
 * Profil et bannière : la bannière est une URL déjà envoyée, sans règle de saisie. Les règles du pseudonyme sont
 * appliquées par `usePseudonymCheck`, seulement s'il a changé : un pseudonyme antérieur aux règles reste enregistrable
 * avec le reste du profil.
 */
const schema = profileSchema.extend({ pseudonym: z.string().trim(), bannerUrl: z.string().nullable() })

/**
 * Éditer le profil (`design/specs/screens/editer-profil.md`) : page ouverte par le bouton du Profil, Annuler /
 * Enregistrer. Bannière, avatar (éditeur existant), pseudonyme vérifié en direct, bio et pays ; un seul enregistrement
 * pour les champs modifiés. Quitter avec des modifications demande confirmation. La date de naissance est dans
 * Réglages › Compte.
 */
export function EditProfileScreen() {
  const t = useT()
  const navigation = useNavigation()
  const me = useMe().data
  const avatar = useMyAvatar()
  const initial = { pseudonym: me?.pseudonym ?? '', bio: me?.bio ?? '', country: me?.country ?? null, bannerUrl: me?.bannerUrl ?? null }
  const form = useForm({ resolver: zodResolver(schema), mode: 'onChange', defaultValues: initial })
  // Lu à chaque rendu, avant tout court-circuit : react-hook-form ne suit `isValid` qu'une fois lu.
  const { isValid } = useFormState({ control: form.control })
  // Profil arrivé après l'ouverture : le brouillon part des valeurs enregistrées.
  const loaded = me !== undefined
  useEffect(() => {
    if (loaded) form.reset(initial)
  }, [loaded]) // une seule fois, à l'arrivée du profil
  const [pseudonym, bio, country, bannerUrl] = useWatch({ control: form.control, name: ['pseudonym', 'bio', 'country', 'bannerUrl'] })
  const draft = { pseudonym, bio, country, bannerUrl }
  const setCountry = (value: string | null) => form.setValue('country', value, { shouldValidate: true })
  const setBanner = (value: string | null) => form.setValue('bannerUrl', value, { shouldValidate: true })
  const [countryOpen, setCountryOpen] = useState(false)
  // Avancement de l'envoi d'image (0 à 100) ; `undefined` hors envoi.
  const [progress, setProgress] = useState<number | undefined>(undefined)
  const uploading = progress !== undefined
  const [saving, setSaving] = useState(false)
  const userId = me?.userId ?? ''
  const saveProfile = useUpdateMyProfile(userId)
  const saveBanner = useUpdateBanner(userId)
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
      setBanner(media.url)
    } catch (error) {
      const problem = error as Partial<ApiError> | undefined
      toast.error(t('settings.imageError'), { description: problem?.detail || problem?.message || t('settings.imageRule') })
    } finally {
      picking.current = false
      setProgress(undefined)
    }
  }

  const save = form.handleSubmit(async (values) => {
    setSaving(true)
    try {
      // Pseudonyme, bio et pays partent ensemble (`useUpdateMyProfile`) ; la bannière à part.
      if (changed.pseudonym || changed.bio || changed.country)
        await saveProfile.mutateAsync({ pseudonym: values.pseudonym, bio: values.bio, country: values.country })
      if (changed.bannerUrl) await saveBanner.mutateAsync(values.bannerUrl)
      toast.success(t('editProfile.saved'))
      router.back()
    } catch (error) {
      // La page reste ouverte avec le brouillon.
      profileSaveError(error)
      setSaving(false)
    }
  })

  return (
    <Screen
      header={
        <MobileTopBar
          variant="modal"
          title={t('profile.edit')}
          cancel={t('topic.cancel')}
          confirm={t('settings.save')}
          confirmDisabled={!dirty || !pseudonymOk || !isValid || uploading || saving}
          onCancel={() => router.back()}
          onConfirm={() => void save()}
        />
      }
      overlay={<CountryPicker open={countryOpen} onClose={() => setCountryOpen(false)} value={draft.country} onChange={setCountry} />}
      contentStyle={{ gap: tokens.space[6], paddingHorizontal: tokens.space[5], paddingTop: tokens.space[3], paddingBottom: tokens.space[7] }}
    >
      <ImagePicker
        image={draft.bannerUrl ?? undefined}
        hint={uploading ? t('media.uploadingPercent', { percent: progress }) : t('mobile.profile.bannerHint')}
        progress={progress}
        onPick={() => void pickBanner()}
        onRemove={() => setBanner(null)}
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
        <Controller
          control={form.control}
          name="pseudonym"
          render={({ field }) => (
            <Field
              label={t('settings.pseudonym')}
              value={field.value}
              maxLength={MAX_PSEUDONYM}
              counter={t('mobile.authoring.counter', { count: field.value.length, max: MAX_PSEUDONYM })}
              hint={check.state === 'unchanged' ? t('settings.pseudonymHint') : pseudonymHint(check)}
              error={pseudonymError(check)}
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={field.onChange}
            />
          )}
        />
        <Controller
          control={form.control}
          name="bio"
          render={({ field }) => (
            <Field
              label={t('settings.bio')}
              placeholder={t('settings.bioPlaceholder')}
              multiline
              value={field.value}
              maxLength={MAX_BIO}
              counter={t('mobile.authoring.counter', { count: field.value.length, max: MAX_BIO })}
              onChangeText={field.onChange}
            />
          )}
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
