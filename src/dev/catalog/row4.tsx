import { useRef, useState } from 'react'
import { View } from 'react-native'
import {
  Banner,
  Button,
  DotsThreeIcon,
  IconButton,
  ListRow,
  Menu,
  showDialog,
  MobileSheet,
  SheetHeader,
  Toast,
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

export function DialogDemo() {
  return (
    <>
      <Button
        full
        variant="tinted"
        tone="destructive"
        onPress={() =>
          showDialog({
            title: 'Abandonner le duel ?',
            message: 'La partie compte comme une défaite.',
            actions: [
              { label: 'Abandonner', variant: 'filled', tone: 'destructive' },
              { label: 'Continuer', variant: 'plain' },
            ],
          })
        }
      >
        Abandonner le duel (alerte)
      </Button>
      <Button
        full
        variant="gray"
        tone="neutral"
        onPress={() =>
          showDialog({
            sheet: true,
            title: 'Se déconnecter ?',
            actions: [
              { label: 'Se déconnecter', variant: 'filled', tone: 'destructive' },
              { label: 'Annuler', variant: 'plain' },
            ],
          })
        }
      >
        Se déconnecter (feuille d'actions)
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
          <Button variant="gray" tone="neutral" size="M">
            {`Trier : ${sort}`}
          </Button>
        </Menu>
      </Specimen>
      <Specimen label="Menu d'actions, groupe destructif" row>
        <Menu
          items={[
            { label: 'Signaler', systemImage: { ios: 'exclamationmark.bubble' } },
            { label: 'Supprimer', systemImage: { ios: 'trash' }, destructive: true, separated: true },
          ]}
        >
          <IconButton icon={DotsThreeIcon} label="Plus d'actions" variant="gray" />
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
        <Toast tone="danger" title="Le défi n'a pas pu être envoyé" />
        <Toast tone="warning" title="Connexion instable" description="Les scores se synchroniseront au retour du réseau." />
        <Toast tone="info" title="Nouvelle saison" action={{ label: 'Voir' }} />
        <Toast title="Marc D. te suit" actor={{ name: 'Marc Dubois', tier: 'OR' }} onPress={() => undefined} />
      </Specimen>
      <Button full onPress={() => toast.show({ tone: 'success', title: 'Défi envoyé à Sofia R.', description: 'Tu seras prévenu de sa réponse.' })}>
        Afficher un toast (4 s, balayer vers le haut)
      </Button>
    </>
  )
}

export function BannerDemo() {
  return (
    <>
      <Banner title="Hors connexion" message="Les données affichées peuvent dater." action={{ label: 'Réessayer' }} />
      <Banner tone="info" title="Saison 3 en cours" message="Fin dans 12 jours." />
      <Banner tone="live" title="Partie en cours" message="Contre Sofia R. · manche 3" action={{ label: 'Reprendre' }} />
      <Banner tone="training" title="Entraînement" message="Sans Elo ni XP." />
    </>
  )
}
