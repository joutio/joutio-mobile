import { useState } from 'react'
import { Linking, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Notice, Button, ClockIcon, ProhibitIcon, Text, tokens, useTheme } from '@/design-system'
import type { SessionEndReason, SuspensionInfo } from '@/shared/types/session'

const SUPPORT = 'mailto:contact@joutio.com'

/** Motifs de suspension (`UserSuspensionReason` d'identity) en toutes lettres ; un code inconnu n'affiche aucun motif. */
const SUSPENSION_REASONS: Record<string, string> = {
  HARASSMENT: "harcèlement",
  HATE_SPEECH: "propos haineux",
  THREATS: "menaces",
  IMPERSONATION: "usurpation d'identité",
  PRIVACY_VIOLATION: "atteinte à la vie privée",
  INAPPROPRIATE_CONTENT: "contenu inapproprié",
  SPAM: "spam",
  COPYRIGHT: "droits d'auteur",
  CHEATING: "triche",
  EXPLOIT_ABUSE: "exploitation d'une faille",
  MULTIPLE_ACCOUNTS: "comptes multiples",
  TERMS_VIOLATION: "non-respect des conditions d'utilisation",
  MINOR_SAFETY: "protection des mineurs",
  FRAUD: "fraude",
  OTHER: "autre motif",
}

/** « dans 7 jours », « dans 5 heures » : le plus grand pas entier, jamais zéro. */
function remainingLabel(until: Date, now: number): string {
  const formatter = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })
  const minutes = Math.max(1, Math.round((until.getTime() - now) / 60_000))
  if (minutes < 60) return formatter.format(minutes, 'minute')
  if (minutes < 24 * 60) return formatter.format(Math.round(minutes / 60), 'hour')
  return formatter.format(Math.round(minutes / (24 * 60)), 'day')
}

/** Phrase de la suspension : fin annoncée (ou définitive) puis motif ; la note de modération reste privée. */
function suspensionMessage(suspension: SuspensionInfo | null | undefined, now: number): string {
  const until = suspension?.until ? new Date(suspension.until) : null
  const valid = until && !Number.isNaN(until.getTime()) && until.getTime() > now ? until : null
  const end = valid
    ? `Ta suspension se termine le ${valid.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} (${remainingLabel(valid, now)}).`
    : 'Ta suspension est définitive.'
  const label = suspension?.reason ? SUSPENSION_REASONS[suspension.reason] : undefined
  return label ? `${end} Motif : ${label}.` : end
}

/**
 * Session coupée : plein écran, sans navigation. Une suspension annonce sa fin (`suspendedUntil` du `403`, absent :
 * définitive) et son motif (`suspensionReason`).
 */
export function SessionEndedScreen({ reason, suspension, onLogin }: { reason: SessionEndReason; suspension?: SuspensionInfo | null; onLogin: () => void }) {
  const [now] = useState(() => Date.now())
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const suspended = reason === 'suspended'
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        gap: tokens.space[5],
        paddingHorizontal: tokens.space[5],
        paddingTop: insets.top + tokens.space[7],
        paddingBottom: insets.bottom + tokens.space[6],
        backgroundColor: colors.bg,
      }}
    >
      {suspended ? (
        <>
          <Notice tone="error" icon={ProhibitIcon} title="Compte suspendu" message={suspensionMessage(suspension, now)} />
          <Text color="muted">Tes défis et salons en cours ont été annulés. Ton Elo et ta collection sont conservés pendant la suspension.</Text>
          <View style={{ gap: tokens.space[3] }}>
            <Button full variant="gray" tone="neutral" onPress={() => Linking.openURL(SUPPORT).catch(() => undefined)}>
              Contacter le support
            </Button>
            <Button full variant="plain" tone="neutral" onPress={onLogin}>
              Se déconnecter
            </Button>
          </View>
        </>
      ) : (
        <>
          <Notice tone="info" icon={ClockIcon} title="Ta session a expiré" message="Reconnecte-toi pour reprendre là où tu en étais." />
          <Button full onPress={onLogin}>
            Se reconnecter
          </Button>
        </>
      )}
    </View>
  )
}
