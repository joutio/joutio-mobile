import { useState, type ReactNode } from 'react'
import { View } from 'react-native'
import {
  BellIcon,
  Chip,
  Field,
  ListGroup,
  ListRow,
  MatchRow,
  PlayerRow,
  RadioGroup,
  SearchField,
  Segmented,
  JoutioTabs,
  StarIcon,
  Switch,
  SwordIcon,
  Text,
  tokens,
  useTheme,
} from '@/design-system'
import { Specimen, SAMPLE_BANNER } from './kit'

function Card({ children }: { children: ReactNode }) {
  const { colors, radius } = useTheme()
  return <View style={{ borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden' }}>{children}</View>
}

export function ListRowDemo() {
  const [toggle, setToggle] = useState(true)
  const [check, setCheck] = useState(false)
  return (
    <>
      <Specimen label="Contrôles">
        <Card>
          <ListRow icon={BellIcon} label="Notifications" value="Activées" onPress={() => undefined} />
          <ListRow icon={StarIcon} label="Langue" control="value" value="Français" />
          <ListRow label="Sons" control="toggle" on={toggle} onToggle={setToggle} />
          <ListRow label="Afficher les points" sub="Sur les cartes réponse" control="check" on={check} onToggle={setCheck} />
          <ListRow label="Se déconnecter" control="none" destructive last onPress={() => undefined} />
        </Card>
      </Specimen>
      <Specimen label="États : pressé, désactivé, fort">
        <Card>
          <ListRow label="Pressé" forcePressed />
          <ListRow label="Désactivé" disabled />
          <ListRow label="Libellé fort" strong last />
        </Card>
      </Specimen>
    </>
  )
}

const LEVELS = ['Facile', 'Moyen', 'Difficile'] as const

export function RadioGroupDemo() {
  const [level, setLevel] = useState<(typeof LEVELS)[number]>('Moyen')
  return (
    <Specimen label="ListRow en radio">
      <Card>
        <RadioGroup label="Difficulté du bot">
          {LEVELS.map((item, index) => (
            <ListRow key={item} label={item} control="radio" on={item === level} onToggle={() => setLevel(item)} last={index === LEVELS.length - 1} />
          ))}
        </RadioGroup>
      </Card>
    </Specimen>
  )
}

export function SwitchDemo() {
  const [on, setOn] = useState(true)
  return (
    <Specimen label="Activé, désactivé, indisponible" row>
      <Switch label="Sons" checked={on} onChange={setOn} />
      <Switch label="Vibrations" checked={!on} onChange={(value) => setOn(!value)} />
      <Switch label="Indisponible" checked disabled onChange={() => undefined} />
    </Specimen>
  )
}

const TABS = [
  { value: 'wall', label: 'Mur' },
  { value: 'ranking', label: 'Classement' },
  { value: 'games', label: 'Parties' },
  { value: 'progress', label: 'Progression' },
  { value: 'stats', label: 'Statistiques' },
] as const

export function SegmentedDemo() {
  const [period, setPeriod] = useState<'month' | 'all'>('month')
  return (
    <>
      <Specimen label="Largeur égale">
        <Segmented
          label="Période"
          options={[
            { value: 'month', label: 'Ce mois' },
            { value: 'all', label: 'Depuis toujours' },
          ]}
          value={period}
          onChange={setPeriod}
        />
      </Specimen>
    </>
  )
}

export function JoutioTabsDemo() {
  const [value, setValue] = useState<(typeof TABS)[number]['value']>('wall')
  return (
    <>
      <Specimen label="Dimensions Accueil">
        <JoutioTabs label="Accueil" options={TABS.slice(0, 2)} value={value} onChange={setValue} />
      </Specimen>
      <Specimen label="Deux onglets · même largeur dans un conteneur défilant">
        <JoutioTabs label="Deux défilants" options={TABS.slice(0, 2)} value={value} onChange={setValue} scrollable />
      </Specimen>
      <Specimen label="Même hauteur · défilement horizontal">
        <JoutioTabs label="Sujet" options={TABS} value={value} onChange={setValue} scrollable />
      </Specimen>
    </>
  )
}

export function FieldDemo() {
  const [pseudo, setPseudo] = useState('Sofia R.')
  const [bio, setBio] = useState('')
  return (
    <>
      <Field
        label="Pseudonyme"
        counter={`${pseudo.length}/20`}
        hint="Visible par les autres joueurs."
        value={pseudo}
        onChangeText={setPseudo}
        onClear={() => setPseudo('')}
        maxLength={20}
      />
      <Field label="Focus forcé" value="Rois de France" forceFocus />
      <Field label="E-mail" value="sofia@" error="Adresse e-mail invalide." keyboardType="email-address" autoCapitalize="none" />
      <Field label="Bio" multiline value={bio} onChangeText={setBio} placeholder="Quelques mots sur toi" />
      <Field label="Désactivé" value="Indisponible" disabled />
    </>
  )
}

export function SearchFieldDemo() {
  const [query, setQuery] = useState('')
  return (
    <>
      <Specimen label="Avec Annuler pendant la saisie">
        <SearchField value={query} onChange={setQuery} onCancel={() => setQuery('')} placeholder="Rechercher un sujet" />
      </Specimen>
      <Specimen label="Actif forcé">
        <SearchField value="Napoléon" onChange={() => undefined} active onCancel={() => undefined} />
      </Specimen>
    </>
  )
}

export function ChipDemo() {
  const [selected, setSelected] = useState('Tous')
  return (
    <>
      <Specimen label="filter" row>
        {['Tous', 'Suivis', 'Histoire', 'Sport'].map((label) => (
          <Chip key={label} selected={label === selected} onPress={() => setSelected(label)} count={label === 'Suivis' ? 12 : undefined}>
            {label}
          </Chip>
        ))}
      </Specimen>
      <Specimen label="suggestion, icône, désactivé" row>
        <Chip variant="suggestion">Bien joué !</Chip>
        <Chip icon={StarIcon}>Favoris</Chip>
        <Chip disabled>Indisponible</Chip>
      </Specimen>
      <Text variant="caption" color="muted" style={{ marginTop: tokens.space[2] }}>
        Cible tactile : 44 pt par hitSlop.
      </Text>
    </>
  )
}

/** Lignes de Social (épée), de classement (rang, Elo) et de choix (chevron), dans une carte `surface` comme le lab. */
export function PlayerRowDemo() {
  return (
    <>
      <Specimen label="Social : Défier (épée)">
        <ListGroup surface="surface">
          <PlayerRow name="Sofia R." tier="DIAMANT" presence="online" sub="En ligne" ctaIcon={{ icon: SwordIcon, label: 'Défier' }} onPress={() => undefined} />
          <PlayerRow name="Idriss B." tier="OR" presence="offline" sub="Il y a 2 h" ctaIcon={{ icon: SwordIcon, label: 'Défier' }} onPress={() => undefined} />
          <PlayerRow
            name="Maximilien-Alexandre de la Tour"
            tier="FER"
            presence="offline"
            sub="Hier"
            ctaIcon={{ icon: SwordIcon, label: 'Défier' }}
            last
            onPress={() => undefined}
          />
        </ListGroup>
      </Specimen>
      <Specimen label="Classement : rang, Elo, ligne du joueur">
        <ListGroup surface="surface">
          <PlayerRow rank={1} name="Léa M." tier="DIAMANT" trail="2 140" onPress={() => undefined} />
          <PlayerRow rank={2} name="Hugo P." tier="EMERAUDE" trail="1 980" onPress={() => undefined} />
          <PlayerRow rank={14} name="Yanis M." tier="OR" trail="1 312" highlight last onPress={() => undefined} />
        </ListGroup>
      </Specimen>
      <Specimen label="Choix : chevron">
        <ListGroup surface="surface">
          <PlayerRow name="Camille D." tier="ARGENT" presence="online" sub="En ligne" chevron last onPress={() => undefined} />
        </ListGroup>
      </Specimen>
    </>
  )
}

export function MatchRowDemo() {
  return (
    <Specimen label="Victoire, défaite, nul, entraînement">
      <ListGroup surface="surface">
        <MatchRow topic="Rois de France" category="HISTORY" image={SAMPLE_BANNER} sub="Aujourd'hui" outcome="win" score="5 · 3" onPress={() => undefined} />
        <MatchRow topic="Le Grand Chelem" category="SPORTS" sub="Hier" outcome="loss" score="2 · 6" onPress={() => undefined} />
        <MatchRow topic="Tableau périodique" category="SCIENCE" sub="Lundi" outcome="draw" score="4 · 4" onPress={() => undefined} />
        <MatchRow topic="Rap français" category="MUSIC" sub="12 octobre" outcome="win" score="6 · 1" bot last onPress={() => undefined} />
      </ListGroup>
    </Specimen>
  )
}
