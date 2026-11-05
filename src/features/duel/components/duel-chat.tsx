import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CaretLeftIcon, Composer, HAIRLINE, IconButton, Message, Pill, Text, tokens, useTheme } from '@/design-system'

/** Réponses rapides du chat d'après-duel. */
const SUGGESTIONS = ['Bien joué !', 'Revanche ?', 'Trop fort', 'GG']

interface ChatMessage {
  id: string
  text: string
  mine: boolean
}

/**
 * Chat d'après-duel (`resultat.md` § 6) : **mock** (décision du 2026-11-05), le BFF n'a pas encore de messagerie.
 * Rappel du duel en tête, réponses rapides ; les messages restent sur l'appareil.
 */
export function DuelChat({ opponentName, recap, onBack }: { opponentName: string; recap: string; onBack: () => void }) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: 'hello', text: 'Bien joué, belle partie !', mine: false }])
  const send = (text: string) => {
    const value = text.trim()
    if (!value) return
    setMessages((current) => [...current, { id: `${Date.now()}`, text: value, mine: true }])
    setDraft('')
  }
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          paddingTop: insets.top,
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.space[3],
          paddingHorizontal: tokens.space[3],
          minHeight: 52 + insets.top,
        }}
      >
        <IconButton icon={CaretLeftIcon} label="Retour au résultat" onPress={onBack} />
        <Text variant="headline" numberOfLines={1} style={{ flex: 1 }}>
          {opponentName}
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ gap: tokens.space[3], paddingHorizontal: tokens.space[5], paddingVertical: tokens.space[3] }}>
        <Pill style={{ alignSelf: 'center' }}>{recap}</Pill>
        {messages.map((message) => (
          <Message key={message.id} text={message.text} from={message.mine ? 'me' : 'opp'} author={message.mine ? undefined : opponentName} />
        ))}
      </ScrollView>
      <View
        style={{
          borderTopWidth: HAIRLINE,
          borderTopColor: colors.border,
          paddingHorizontal: tokens.space[5],
          paddingTop: tokens.space[3],
          paddingBottom: insets.bottom + tokens.space[3],
        }}
      >
        <Composer value={draft} onChange={setDraft} onSend={send} placeholder="Message" suggestions={SUGGESTIONS} onSuggestion={send} />
      </View>
    </KeyboardAvoidingView>
  )
}
