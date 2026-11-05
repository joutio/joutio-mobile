import { GlobeHemisphereWestIcon, LinkIcon, ListGroup, ListRow, MobileSheet, RobotIcon, toast, UserPlusIcon, type Icon } from '@/design-system'

const MODES: { icon: Icon; label: string; sub: string }[] = [
  { icon: GlobeHemisphereWestIcon, label: 'Défier le monde', sub: 'Adversaire en direct, apparié par Elo (±5)' },
  { icon: RobotIcon, label: "S'entraîner avec un robot", sub: 'Aucune expérience gagnée' },
  { icon: LinkIcon, label: 'Créer un salon', sub: 'Salon privé à partager par lien' },
  { icon: UserPlusIcon, label: 'Défier un joueur', sub: 'Invitation nominative, à accepter ou refuser' },
]

/**
 * « Lancer un duel » : les quatre modes. **Sans action pour l'instant** (décision du 2026-11-05) : chaque mode annonce
 * sa venue ; difficulté du robot, choix de l'adversaire et lancement arrivent avec l'écran Lancer une partie (kit § 4, lot 5).
 */
export function DuelSheet({ open, onClose, topic }: { open: boolean; onClose: () => void; topic: string }) {
  return (
    <MobileSheet open={open} onClose={onClose} title="Lancer un duel" subtitle={topic}>
      <ListGroup>
        {MODES.map((mode, index) => (
          <ListRow
            key={mode.label}
            icon={mode.icon}
            label={mode.label}
            sub={mode.sub}
            control="chevron"
            last={index === MODES.length - 1}
            onPress={() => {
              onClose()
              toast.info('Bientôt disponible', { description: `${mode.label} arrive avec la prochaine version.` })
            }}
          />
        ))}
      </ListGroup>
    </MobileSheet>
  )
}
