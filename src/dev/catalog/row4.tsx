import { useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import {
  Banner,
  Notice,
  Button,
  DotsThreeIcon,
  Field,
  FlagIcon,
  LightningIcon,
  SignOutIcon,
  IconButton,
  ListRow,
  Menu,
  showDialog,
  type DialogOptions,
  MobileSheet,
  SheetHeader,
  Toast,
  TrashIcon,
  WarningIcon,
  toast,
  tokens,
  useTheme,
  type ViewRef,
} from '@/design-system'
import { Specimen } from './kit'

export function MobileSheetDemo() {
  const [open, setOpen] = useState<'auto' | 'tall' | 'stack' | null>(null)
  const [stacked, setStacked] = useState(false)
  const opener = useRef<ViewRef>(null)
  return (
    <>
      <View ref={opener} collapsable={false} style={{ gap: tokens.space[3] }}>
        <Button full onPress={() => setOpen('auto')}>
          Feuille ajustée (80 % max)
        </Button>
        <Button full variant="tinted" onPress={() => setOpen('tall')}>
          Grande feuille (92 %)
        </Button>
        <Button full variant="gray" tone="neutral" onPress={() => setOpen('stack')}>
          Feuilles empilées
        </Button>
      </View>
      <MobileSheet
        open={open === 'auto'}
        onClose={() => setOpen(null)}
        title="Lancer une partie"
        subtitle="Rois de France"
        returnFocusTo={opener}
        footer={
          <Button full onPress={() => setOpen(null)}>
            Jouer
          </Button>
        }
      >
        {['Contre un bot', 'Appariement public', 'Salle partagée', 'Défier un joueur'].map((label, index) => (
          <ListRow key={label} label={label} control="radio" on={index === 0} onToggle={() => undefined} last={index === 3} />
        ))}
      </MobileSheet>
      <MobileSheet open={open === 'tall'} onClose={() => setOpen(null)} title="Choisir un pays" tall returnFocusTo={opener}>
        {Array.from({ length: 40 }, (_, index) => (
          <ListRow key={index} label={`Pays ${index + 1}`} control="none" last={index === 39} />
        ))}
      </MobileSheet>
      <MobileSheet open={open === 'stack'} onClose={() => setOpen(null)} title="Étape 1" returnFocusTo={opener}>
        <Button full onPress={() => setStacked(true)}>
          Étape suivante
        </Button>
        <MobileSheet open={stacked} onClose={() => setStacked(false)} title="Étape 2" onBack={() => setStacked(false)}>
          <ListRow label="Fermer ramène à l'étape 1" control="none" last />
        </MobileSheet>
      </MobileSheet>
    </>
  )
}

export function SheetHeaderDemo() {
  const { colors, radius } = useTheme()
  return (
    <>
      <Specimen label="Fermer par défaut">
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.xl }}>
          <SheetHeader title="Filtres" onClose={() => undefined} />
        </View>
      </Specimen>
      <Specimen label="Retour, sous-titre, action">
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.xl }}>
          <SheetHeader
            title="Catégories"
            subtitle="3 choisies"
            onBack={() => undefined}
            action={
              <Button variant="plain" size="S">
                Réinitialiser
              </Button>
            }
          />
        </View>
      </Specimen>
    </>
  )
}

const DIALOGS = {
  danger: {
    icon: FlagIcon,
    tone: 'danger',
    title: 'Abandonner le duel ?',
    message: 'La partie compte comme une défaite.',
    actions: [
      { label: 'Abandonner', variant: 'filled', tone: 'destructive' },
      { label: 'Continuer', variant: 'plain' },
    ],
  },
  accent: {
    icon: LightningIcon,
    tone: 'accent',
    title: 'Quitter le salon ?',
    message: 'Ton adversaire sera prévenu et le salon fermé.',
    actions: [
      { label: 'Quitter', variant: 'filled' },
      { label: 'Rester', variant: 'plain' },
    ],
  },
  sheet: {
    sheet: true,
    icon: SignOutIcon,
    title: 'Se déconnecter ?',
    message: 'Tu pourras te reconnecter avec ton e-mail.',
    actions: [
      { label: 'Se déconnecter', variant: 'filled', tone: 'destructive' },
      { label: 'Annuler', variant: 'plain' },
    ],
  },
} satisfies Record<string, DialogOptions>

/** `?open=danger|accent|sheet` (dev) ouvre un dialog après le montage, pour le vérifier sans toucher l'écran. */
export function DialogDemo() {
  const { open } = useLocalSearchParams<{ open?: keyof typeof DIALOGS }>()
  useEffect(() => {
    if (!open || !(open in DIALOGS)) return
    const timer = setTimeout(() => showDialog(DIALOGS[open]), 800)
    return () => clearTimeout(timer)
  }, [open])
  return (
    <>
      <Button full variant="tinted" tone="destructive" onPress={() => showDialog(DIALOGS.danger)}>
        Abandonner le duel (danger)
      </Button>
      <Button full variant="tinted" onPress={() => showDialog(DIALOGS.accent)}>
        Quitter le salon (accent)
      </Button>
      <Button full variant="gray" tone="neutral" onPress={() => showDialog(DIALOGS.sheet)}>
        Se déconnecter (feuille)
      </Button>
    </>
  )
}

const SORTS = ['Popularité', 'Nouveautés', 'Alphabétique'] as const

export function MenuDemo() {
  const [sort, setSort] = useState<(typeof SORTS)[number]>('Popularité')
  return (
    <>
      <Specimen label="Menu de tri (choix coché)" row>
        <Menu title="Trier par" items={SORTS.map((label) => ({ label, checked: label === sort, onPress: () => setSort(label) }))}>
          {(open) => (
            <Button variant="gray" tone="neutral" size="M" onPress={open}>
              {`Trier : ${sort}`}
            </Button>
          )}
        </Menu>
      </Specimen>
      <Specimen label="Menu d'actions, groupe destructif" row>
        <Menu
          items={[
            { label: 'Signaler', icon: WarningIcon },
            { label: 'Supprimer', icon: TrashIcon, destructive: true, separated: true },
          ]}
        >
          {(open) => <IconButton icon={DotsThreeIcon} label="Plus d'actions" variant="gray" onPress={open} />}
        </Menu>
      </Specimen>
    </>
  )
}

export function ToastDemo() {
  return (
    <>
      <Specimen label="Tons">
        <Toast tone="success" title="Défi envoyé à Sofia R." />
        <Toast tone="danger" title="Le défi n'a pas pu être envoyé à Sofia R., réessaie dans quelques instants" />
        <Toast tone="warning" title="Connexion instable" description="Les scores se synchroniseront au retour du réseau." />
        <Toast tone="info" title="Nouvelle saison" description="Saison 3 : nouveaux titres à gagner." onPress={() => undefined} />
        <Toast title="Marc D. te suit" actor={{ name: 'Marc Dubois', tier: 'OR' }} onPress={() => undefined} />
      </Specimen>
      <Button full onPress={() => toast.success('Défi envoyé à Sofia R.', { description: 'Tu seras prévenu de sa réponse.' })}>
        Un toast (4 s, balayer vers le haut)
      </Button>
      <Button
        full
        variant="tinted"
        onPress={() => {
          toast.info('Nouvelle saison', { description: 'Saison 3 : nouveaux titres à gagner.' })
          setTimeout(() => toast.warning('Connexion instable'), 220)
          setTimeout(() => toast.success('Marc D. te suit', { description: 'Touche la pile pour la déplier.' }), 440)
        }}
      >
        Pile de trois (toucher pour déplier)
      </Button>
      <Button
        full
        variant="gray"
        tone="neutral"
        onPress={() =>
          void toast.promise(new Promise((resolve) => setTimeout(resolve, 2200)), {
            loading: 'Synchronisation…',
            success: 'Synchronisé',
            error: 'Échec de la synchronisation',
            description: 'Récupération de tes derniers scores.',
          })
        }
      >
        Chargement puis succès (toast.promise)
      </Button>
    </>
  )
}

/** Bandes du haut de la fenêtre (sans safe area dans le catalogue). */
export function BannerDemo() {
  return (
    <>
      <Banner connection="offline" />
      <Banner connection="retrying" />
      <Banner connection="restored" />
      <Banner tone="live" title="Partie en cours" message="Contre Sofia R. · manche 3" action={{ label: 'Rejoindre' }} />
    </>
  )
}

/** Cartes dans le flux de l'écran. */
export function NoticeDemo() {
  return (
    <>
      <Notice title="Hors connexion" message="Les données affichées peuvent dater." action={{ label: 'Réessayer' }} />
      <Notice tone="info" title="Sujet complet" message="Retire une question pour en ajouter une autre." />
      <Notice tone="live" title="Sofia R. t'attend" message="Manche 3 sur 7" />
      <Notice tone="training" title="Entraînement" message="Sans Elo ni points d'expérience." />
    </>
  )
}

/** Saisie dans une feuille : la feuille s'ouvre et le champ prend le focus, le bouton doit rester au-dessus du clavier. */
export function MobileSheetInputDemo() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  // Ouverture après la transition d'entrée de l'écran : une feuille présentée pendant le push ne s'ouvre pas.
  useEffect(() => {
    const timer = setTimeout(() => setOpen(true), 700)
    return () => clearTimeout(timer)
  }, [])
  return (
    <>
      <Button full onPress={() => setOpen(true)}>
        Ouvrir la feuille avec saisie
      </Button>
      <MobileSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Nouveau sujet"
        footer={
          <Button full size="L" disabled={name.trim() === ''} onPress={() => setOpen(false)}>
            Créer le brouillon
          </Button>
        }
      >
        <Field
          autoFocus
          label="Nom"
          placeholder="Par exemple, Châteaux de la Loire"
          value={name}
          maxLength={40}
          counter={`${name.length} / 40`}
          onChangeText={setName}
        />
      </MobileSheet>
    </>
  )
}
