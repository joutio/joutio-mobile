import { Image } from 'expo-image'
import { StyleSheet, View } from 'react-native'
import {
  Avatar,
  Badge,
  BellIcon,
  BUTTON_TONES,
  BUTTON_VARIANTS,
  Button,
  CaretLeftIcon,
  CheckCircleIcon,
  IconButton,
  Pill,
  PremiumBadge,
  RankFrame,
  Skeleton,
  SwordIcon,
  Text,
  tokens,
  type TierCode,
} from '@/design-system'
import { SAMPLE_BANNER, SAMPLE_IMAGE, Specimen } from './kit'

const TIERS = Object.keys(tokens.tier) as TierCode[]

export function ButtonDemo() {
  return (
    <>
      {BUTTON_VARIANTS.map((variant) => (
        <Specimen key={variant} label={`variant ${variant}`}>
          {BUTTON_TONES.map((tone) => (
            <Button key={tone} variant={variant} tone={tone} full>
              {`Jouer · ${tone}`}
            </Button>
          ))}
        </Specimen>
      ))}
      <Specimen label="Tailles L, M, S" row>
        <Button size="L">Jouer</Button>
        <Button size="M">Jouer</Button>
        <Button size="S">Jouer</Button>
      </Specimen>
      <Specimen label="Icône, sous-titre, meta">
        <Button icon={SwordIcon} full>
          Lancer un duel
        </Button>
        <Button icon={SwordIcon} iconPlacement="trailing" variant="tinted" full subtitle="Classé · 10 questions">
          Duel classé
        </Button>
        <Button variant="gray" tone="neutral" meta="1 240" full>
          Elo
        </Button>
      </Specimen>
      <Specimen label="États : pressé, chargement, désactivé">
        <Button forcePressed full>
          Pressé
        </Button>
        <Button loading full>
          Envoi
        </Button>
        <Button disabled full>
          Indisponible
        </Button>
      </Specimen>
    </>
  )
}

export function IconButtonDemo() {
  return (
    <>
      {BUTTON_VARIANTS.map((variant) => (
        <Specimen key={variant} label={`variant ${variant}`} row>
          {BUTTON_TONES.map((tone) => (
            <IconButton key={tone} icon={BellIcon} label={`Notifications ${tone}`} variant={variant} tone={tone} />
          ))}
        </Specimen>
      ))}
      <Specimen label="Tailles L, M, S" row>
        <IconButton icon={BellIcon} label="Notifications" size="L" variant="gray" />
        <IconButton icon={BellIcon} label="Notifications" size="M" variant="gray" />
        <IconButton icon={BellIcon} label="Notifications" size="S" variant="gray" />
      </Specimen>
      <Specimen label="Badges" row>
        <IconButton icon={BellIcon} label="Notifications" badge="dot" />
        <IconButton icon={BellIcon} label="Notifications" badge={3} />
        <IconButton icon={BellIcon} label="Notifications" badge={12} />
      </Specimen>
      <Specimen label="media, sur image" row>
        <View style={{ padding: tokens.space[5], borderRadius: tokens.radius.md, overflow: 'hidden', flexDirection: 'row', gap: tokens.space[4] }}>
          <Image source={SAMPLE_BANNER} style={StyleSheet.absoluteFill} contentFit="cover" />
          <IconButton icon={CaretLeftIcon} label="Retour" media />
          <IconButton icon={BellIcon} label="Notifications" media />
        </View>
      </Specimen>
      <Specimen label="Désactivé" row>
        <IconButton icon={BellIcon} label="Notifications" variant="gray" disabled />
      </Specimen>
    </>
  )
}

export function PillDemo() {
  return (
    <Specimen label="Tons" row>
      <Pill>Neutre</Pill>
      <Pill tone="online">En ligne</Pill>
      <Pill tone="pending">En attente</Pill>
      <Pill tone="suspended">Compte suspendu</Pill>
      <Pill tone="correct" icon={CheckCircleIcon}>
        Gagné
      </Pill>
      <Pill tone="wrong">Perdu</Pill>
    </Specimen>
  )
}

export function BadgeDemo() {
  return (
    <>
      <Specimen label="Variantes" row>
        <Badge>Neutre</Badge>
        <Badge variant="accent">Nouveau</Badge>
        <Badge variant="correct">+24</Badge>
        <Badge variant="wrong">−12</Badge>
        <Badge variant="outline">Bot</Badge>
      </Specimen>
      <Specimen label="Rangs" row>
        {TIERS.map((tier) => (
          <Badge key={tier} variant="tier" tier={tier}>
            {tokens.tier[tier].label}
          </Badge>
        ))}
      </Specimen>
    </>
  )
}

export function AvatarDemo() {
  return (
    <>
      <Specimen label="Tailles (initiales)" row>
        {(['xs', 'sm', 'md', 'list', 'row', 'lg', 'xl'] as const).map((size) => (
          <Avatar key={size} name="Sofia Rossi" size={size} />
        ))}
      </Specimen>
      <Specimen label="Image et présence" row>
        <Avatar name="Marc Dubois" src={SAMPLE_IMAGE} size="lg" presence="online" />
        <Avatar name="Léa Martin" size="lg" presence="ingame" />
        <Avatar name="Yanis Benali" size="lg" presence="offline" />
      </Specimen>
      <Specimen label="Cadres de rang (xl)" row>
        {TIERS.map((tier) => (
          <Avatar key={tier} name="Sofia Rossi" src={SAMPLE_IMAGE} size="xl" tier={tier} />
        ))}
      </Specimen>
      <Specimen label="Sous 40 pt : filet" row>
        {TIERS.map((tier) => (
          <Avatar key={tier} name="Sofia Rossi" size="sm" tier={tier} />
        ))}
      </Specimen>
      <Specimen label="Provisoire, verrouillé" row>
        <Avatar name="Sofia Rossi" src={SAMPLE_IMAGE} size="xl" tier="OR" provisional />
        <Avatar name="Sofia Rossi" src={SAMPLE_IMAGE} size="xl" tier="DIAMANT" locked />
      </Specimen>
      <Specimen label="RankFrame seul (hero)" row>
        <RankFrame tier="DIAMANT" size={176}>
          <Avatar name="Sofia Rossi" src={SAMPLE_IMAGE} size="hero" decorative />
        </RankFrame>
      </Specimen>
    </>
  )
}

export function SkeletonDemo() {
  return (
    <>
      <Specimen label="Formes">
        <Skeleton shape="text" width="60%" />
        <Skeleton shape="row" />
        <Skeleton shape="card" />
        <Skeleton shape="circle" width={56} />
      </Specimen>
      <Specimen label="Hors connexion : fixe">
        <Skeleton shape="row" animated={false} />
      </Specimen>
    </>
  )
}

/** Marque Premium à droite du pseudonyme, aux tailles des lignes de titre. */
export function PremiumBadgeDemo() {
  return (
    <>
      <Specimen label="title2 (bonjour de l'Accueil)">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] }}>
          <Text variant="title2">Bonjour Nadjim</Text>
          <PremiumBadge size={22} />
        </View>
      </Specimen>
      <Specimen label="headline (barre, lignes joueur)">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] }}>
          <Text variant="headline">Nadjim</Text>
          <PremiumBadge size={18} />
        </View>
      </Specimen>
    </>
  )
}
