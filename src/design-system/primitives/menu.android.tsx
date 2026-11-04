import { DropdownMenu, DropdownMenuItem, Host, HorizontalDivider, RNHostView, Text } from '@expo/ui/jetpack-compose'
import { Fragment, useState } from 'react'
import { Pressable } from 'react-native'
import { useTheme } from '../theme/theme-provider'
import type { MenuProps } from './menu'

export type { MenuItem, MenuProps } from './menu'

/** Menu Material (`DropdownMenu`), ancré sur le déclencheur React Native. */
export function Menu({ items, children }: MenuProps) {
  const { colors, scheme } = useTheme()
  const [expanded, setExpanded] = useState(false)
  return (
    <Host matchContents colorScheme={scheme}>
      <DropdownMenu expanded={expanded} onDismissRequest={() => setExpanded(false)} color={colors.raised}>
        <DropdownMenu.Trigger>
          <RNHostView matchContents>
            <Pressable accessibilityRole="button" onPress={() => setExpanded(true)}>
              {children}
            </Pressable>
          </RNHostView>
        </DropdownMenu.Trigger>
        <DropdownMenu.Items>
          {items.map((item, index) => (
            <Fragment key={item.label}>
              {item.separated && index > 0 ? <HorizontalDivider /> : null}
              <DropdownMenuItem
                elementColors={{ textColor: item.destructive ? colors.wrong : colors.text }}
                onClick={() => {
                  setExpanded(false)
                  item.onPress?.()
                }}
              >
                <DropdownMenuItem.Text>
                  <Text>{item.checked ? `✓  ${item.label}` : item.label}</Text>
                </DropdownMenuItem.Text>
              </DropdownMenuItem>
            </Fragment>
          ))}
        </DropdownMenu.Items>
      </DropdownMenu>
    </Host>
  )
}
