import { Host, SegmentedButton, SingleChoiceSegmentedButtonRow, Text } from '@expo/ui/jetpack-compose'
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers'
import { useTheme } from '../theme/theme-provider'
import type { NativeSegmentedProps } from './native-segmented'

/** `SingleChoiceSegmentedButtonRow` Material 3, teinté par les tokens. */
export function NativeSegmented<T extends string>({ options, value, onChange, style }: NativeSegmentedProps<T>) {
  const { colors, scheme } = useTheme()
  return (
    <Host matchContents={{ vertical: true }} colorScheme={scheme} style={[{ alignSelf: 'stretch' }, style]}>
      <SingleChoiceSegmentedButtonRow modifiers={[fillMaxWidth()]}>
        {options.map((option) => (
          <SegmentedButton
            key={option.value}
            selected={option.value === value}
            onClick={() => onChange(option.value)}
            colors={{
              activeContainerColor: colors.text,
              activeContentColor: colors.bg,
              activeBorderColor: colors.border,
              inactiveContainerColor: colors.raised,
              inactiveContentColor: colors.text,
              inactiveBorderColor: colors.border,
            }}
          >
            <SegmentedButton.Label>
              <Text>{option.label}</Text>
            </SegmentedButton.Label>
          </SegmentedButton>
        ))}
      </SingleChoiceSegmentedButtonRow>
    </Host>
  )
}
