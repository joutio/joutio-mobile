import { Dialog, ProhibitIcon } from '@/design-system'
import { useT } from '@/lib/i18n'

/**
 * Confirmation avant de bloquer (`fiche-joueur.md` § 2) : `Dialog` destructif qui rappelle l'effet symétrique. Partagé
 * par la fiche joueur et le résultat (offre de blocage après un signalement).
 */
export function BlockPlayerDialog({ open, name, onClose, onConfirm }: { open: boolean; name: string; onClose: () => void; onConfirm: () => void }) {
  const t = useT()
  return (
    <Dialog
      open={open}
      onClose={onClose}
      sheet
      tone="danger"
      icon={ProhibitIcon}
      title={t('player.blockTitle', { name })}
      message={t('player.blockText')}
      actions={[
        { label: t('player.block'), variant: 'tinted', tone: 'destructive', onPress: onConfirm },
        { label: t('topic.cancel'), variant: 'plain', tone: 'neutral' },
      ]}
    />
  )
}
