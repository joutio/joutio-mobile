import { countryFlag, countryName } from '@joutio/client-domain/geo'
import { MAX_PSEUDONYM } from '@joutio/client-domain/profile'
import type { ApiError } from '@joutio/client-domain/api-types'
import { useNavigation, usePreventRemove } from 'expo-router'
import { router } from '@/shared/navigation/router'
import { useState } from 'react'
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
  const navigation = useNavigation()
  const me = useMe(true).data
  const avatar = useMyAvatar()
  const initial: Draft = { pseudonym: me?.pseudonym ?? '', bio: me?.bio ?? '', country: me?.country ?? null, bannerUrl: me?.bannerUrl ?? null }
  const [draft, setDraft] = useState<Draft>(initial)
  const [countryOpen, setCountryOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
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

  // Retour système, geste ou Annuler avec des modifications : confirmation.
  usePreventRemove(dirty && !saving, ({ data }) =>
    showDialog({
      sheet: true,
      icon: WarningIcon,
      title: 'Abandonner les modifications ?',
      message: 'Ce que tu as changé ne sera pas enregistré.',
      actions: [
        { label: 'Abandonner', variant: 'tinted', tone: 'destructive', onPress: () => navigation.dispatch(data.action) },
        { label: "Continuer l'édition", variant: 'plain', tone: 'neutral' },
      ],
    }),
  )

  const pickBanner = async () => {
    if (uploading) return
    setUploading(true)
    try {
      const asset = await pickImage(BANNER_ASPECT)
      if (!asset) return
      const media = await uploadImage(asset)
      setDraft((current) => ({ ...current, bannerUrl: media.url }))
    } catch (error) {
      const problem = error as Partial<ApiError> | undefined
      toast.error("L'image n'a pas pu être envoyée", { description: problem?.detail || problem?.message || 'JPG ou PNG, 5 Mo au plus. Réessaie.' })
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      if (changed.pseudonym) await savePseudonym.mutateAsync(draft.pseudonym.trim())
      if (changed.bio) await saveBio.mutateAsync(draft.bio.trim() || null)
      if (changed.country) await saveCountry.mutateAsync(draft.country)
      if (changed.bannerUrl) await saveBanner.mutateAsync(draft.bannerUrl)
      toast.success('Profil enregistré')
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
          title="Éditer le profil"
          cancel="Annuler"
          confirm="Enregistrer"
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
        hint="Bannière · JPG ou PNG, 5 Mo"
        busy={uploading}
        onPick={() => void pickBanner()}
        onRemove={() => setDraft({ ...draft, bannerUrl: null })}
      />
      <ListGroup surface="surface">
        <ListRow
          leading={<Avatar name={draft.pseudonym || 'Moi'} src={avatar} size="md" decorative />}
          label="Modifier l'avatar"
          control="chevron"
          onPress={() => router.push('/avatar')}
          last
        />
      </ListGroup>
      <View style={{ gap: tokens.space[4] }}>
        <Field
          label="Pseudonyme"
          value={draft.pseudonym}
          maxLength={MAX_PSEUDONYM}
          counter={`${draft.pseudonym.length} / ${MAX_PSEUDONYM}`}
          hint={check.state === 'unchanged' ? 'Visible par tous les joueurs.' : pseudonymHint(check)}
          error={pseudonymError(check)}
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={(pseudonym) => setDraft({ ...draft, pseudonym })}
        />
        <Field
          label="Bio"
          placeholder="Facultative · quelques mots sur toi"
          multiline
          value={draft.bio}
          maxLength={MAX_BIO}
          counter={`${draft.bio.length} / ${MAX_BIO}`}
          onChangeText={(bio) => setDraft({ ...draft, bio })}
        />
      </View>
      <ListGroup surface="surface">
        <ListRow
          icon={GlobeHemisphereWestIcon}
          label="Pays"
          value={draft.country ? `${countryFlag(draft.country)} ${countryName(draft.country)}` : 'Non affiché'}
          control="chevron"
          onPress={() => setCountryOpen(true)}
          last
        />
      </ListGroup>
    </Screen>
  )
}
