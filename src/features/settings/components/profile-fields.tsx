import { useState } from 'react'
import { View } from 'react-native'
import {
  Button,
  CategoryTile,
  EmptyState,
  Field,
  GlobeHemisphereWestIcon,
  ImageIcon,
  ImagePicker,
  ListGroup,
  ListRow,
  MagnifyingGlassIcon,
  MobileSheet,
  QuotesIcon,
  RadioGroup,
  SearchField,
  SparkleIcon,
  Text,
  toast,
  tokens,
  UserIcon,
  type CategoryCode,
} from '@/design-system'
import { pickImage, uploadImage } from '@/features/media/media-service'
import { useUpdateMe } from '@/features/profile/hooks/use-profile'
import type { MeView } from '@/shared/types/bff'
import { COUNTRY_CODES, countryFlag, countryLabel } from '@/shared/utils/country'

type FieldId = 'pseudonym' | 'bio' | 'country' | 'interests' | 'banner'

export const MAX_PSEUDONYM = 40
export const MAX_BIO = 160
const MAX_INTERESTS = 3
const UNIVERSES = Object.keys(tokens.category) as CategoryCode[]
/** Ratio de la bannière du profil (lab : 320 de haut sur la largeur du téléphone). */
const BANNER_ASPECT: [number, number] = [5, 4]

/**
 * Lignes « Profil » des Réglages et leur feuille (`reglages.md` § 1) : le pays s'applique au choix, le reste par
 * Enregistrer. Les feuilles se rendent hors du défilement de l'écran.
 */
export function useProfileFields(me: MeView | undefined) {
  const [field, setField] = useState<FieldId>()
  const [pseudonym, setPseudonym] = useState('')
  const [bio, setBio] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [banner, setBanner] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [query, setQuery] = useState('')
  const savePseudonym = useUpdateMe('pseudonym')
  const saveBio = useUpdateMe('bio')
  const saveCountry = useUpdateMe('country')
  const saveInterests = useUpdateMe('interests')
  const saveBanner = useUpdateMe('bannerUrl')

  const open = (next: FieldId) => {
    setPseudonym(me?.pseudonym ?? '')
    setBio(me?.bio ?? '')
    setInterests(me?.interests ?? [])
    setBanner(me?.bannerUrl ?? null)
    setQuery('')
    setField(next)
  }
  const close = () => setField(undefined)

  const pickBanner = async () => {
    const asset = await pickImage(BANNER_ASPECT)
    if (!asset) return
    setUploading(true)
    try {
      const media = await uploadImage(asset)
      setBanner(media.url)
    } catch {
      toast.error("L'image n'a pas pu être envoyée", { description: 'JPG ou PNG, 5 Mo au plus. Réessaie.' })
    } finally {
      setUploading(false)
    }
  }

  const search = query.trim().toLowerCase()
  const countries = COUNTRY_CODES.map((code) => ({ code, name: countryLabel(code) }))
    .filter((country) => country.name.toLowerCase().includes(search))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  const full = interests.length === MAX_INTERESTS
  const toggleInterest = (category: string) =>
    setInterests(interests.includes(category) ? interests.filter((item) => item !== category) : [...interests, category])
  const country = me?.country

  const rows = (
    <ListGroup surface="surface">
      <ListRow icon={UserIcon} label="Pseudonyme" control="chevron" value={me?.pseudonym} onPress={() => open('pseudonym')} />
      <ListRow icon={QuotesIcon} label="Bio" sub={me?.bio || 'Ajoute quelques mots sur toi'} control="chevron" onPress={() => open('bio')} />
      <ListRow
        icon={GlobeHemisphereWestIcon}
        label="Pays"
        control="chevron"
        value={country ? `${countryFlag(country)} ${countryLabel(country)}` : 'Non renseigné'}
        onPress={() => open('country')}
      />
      <ListRow
        icon={SparkleIcon}
        label="Centres d'intérêt"
        sub={(me?.interests ?? []).map((category) => tokens.category[category as CategoryCode]?.label ?? category).join(', ') || 'Aucun pour l’instant'}
        control="chevron"
        onPress={() => open('interests')}
      />
      <ListRow icon={ImageIcon} label="Bannière" control="chevron" value={me?.bannerUrl ? 'Modifier' : 'Ajouter'} onPress={() => open('banner')} last />
    </ListGroup>
  )

  const save = (disabled: boolean, onSave: () => void) => (
    <Button
      full
      disabled={disabled}
      onPress={() => {
        onSave()
        close()
      }}
    >
      Enregistrer
    </Button>
  )

  const sheets = (
    <>
      <MobileSheet
        open={field === 'pseudonym'}
        onClose={close}
        title="Pseudonyme"
        footer={save(pseudonym.trim() === '' || pseudonym.trim() === me?.pseudonym, () => savePseudonym.mutate(pseudonym.trim()))}
      >
        <Field
          label="Pseudonyme"
          value={pseudonym}
          maxLength={MAX_PSEUDONYM}
          counter={`${pseudonym.length} / ${MAX_PSEUDONYM}`}
          hint="Visible par tous les joueurs."
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setPseudonym}
        />
      </MobileSheet>
      <MobileSheet open={field === 'bio'} onClose={close} title="Bio" footer={save(bio === (me?.bio ?? ''), () => saveBio.mutate(bio.trim() || null))}>
        <Field
          label="Bio"
          placeholder="Facultative · quelques mots sur toi"
          multiline
          value={bio}
          maxLength={MAX_BIO}
          counter={`${bio.length} / ${MAX_BIO}`}
          onChangeText={setBio}
        />
      </MobileSheet>
      <MobileSheet
        open={field === 'country'}
        onClose={close}
        title="Pays"
        tall
        stickyHeader={<SearchField value={query} onChange={setQuery} placeholder="Chercher un pays" label="Chercher un pays" />}
      >
        {countries.length > 0 ? (
          <RadioGroup label="Pays">
            <ListGroup>
              {countries.map((item, index) => (
                <ListRow
                  key={item.code}
                  leading={<Text variant="headline">{countryFlag(item.code)}</Text>}
                  label={item.name}
                  control="radio"
                  on={country === item.code}
                  onToggle={() => {
                    saveCountry.mutate(item.code)
                    close()
                  }}
                  last={index === countries.length - 1}
                />
              ))}
            </ListGroup>
          </RadioGroup>
        ) : (
          <EmptyState icon={MagnifyingGlassIcon} title="Aucun pays trouvé" description="Vérifie l'orthographe." />
        )}
      </MobileSheet>
      <MobileSheet
        open={field === 'interests'}
        onClose={close}
        title="Centres d'intérêt"
        subtitle={`${interests.length} sur ${MAX_INTERESTS}`}
        tall
        footer={save(interests.join() === (me?.interests ?? []).join(), () => saveInterests.mutate(interests))}
      >
        <View style={{ gap: tokens.space[4] }}>
          <Text variant="callout" color="muted">
            Ils personnalisent ton accueil. Le premier choisi est ton univers principal.
          </Text>
          <View
            accessibilityLabel={`Univers, ${interests.length} sur ${MAX_INTERESTS} choisis`}
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[3] }}
          >
            {UNIVERSES.map((category) => {
              const on = interests.includes(category)
              return (
                <CategoryTile
                  key={category}
                  category={category}
                  selected={on}
                  disabled={full && !on}
                  onToggle={() => toggleInterest(category)}
                  style={{ width: '31.5%' }}
                />
              )
            })}
          </View>
        </View>
      </MobileSheet>
      <MobileSheet
        open={field === 'banner'}
        onClose={close}
        title="Bannière"
        footer={save(uploading || banner === (me?.bannerUrl ?? null), () => saveBanner.mutate(banner))}
      >
        <ImagePicker
          image={banner ?? undefined}
          hint="Ajouter une bannière · JPG ou PNG, 5 Mo"
          busy={uploading}
          onPick={() => void pickBanner()}
          onRemove={() => setBanner(null)}
        />
      </MobileSheet>
    </>
  )

  return { rows, sheets }
}
