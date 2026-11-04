import { Host, Picker, Text } from '@expo/ui/swift-ui'
import { accessibilityLabel, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers'
import { useTheme } from '../theme/theme-provider'
import type { NativeSegmentedProps } from './native-segmented'

/** `UISegmentedControl` (SwiftUI `Picker` segmenté), au thème de l'app. */
export function NativeSegmented<T extends string>({ options, value, onChange, label, style }: NativeSegmentedProps<T>) {
  const { scheme } = useTheme()
  return (
    <Host matchContents={{ vertical: true }} colorScheme={scheme} style={[{ alignSelf: 'stretch' }, style]}>
      <Picker<string>
        selection={value}
        onSelectionChange={(selection) => onChange(selection as T)}
        modifiers={[pickerStyle('segmented'), accessibilityLabel(label)]}
      >
        {options.map((option) => (
          <Text key={option.value} modifiers={[tag(option.value)]}>
            {option.label}
          </Text>
        ))}
      </Picker>
    </Host>
  )
}
