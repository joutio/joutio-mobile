import { Button, Divider, Host, Menu as SwiftMenu, RNHostView } from '@expo/ui/swift-ui'
import { Fragment } from 'react'
import type { SFSymbol } from 'sf-symbols-typescript'
import { useTheme } from '../theme/theme-provider'
import type { MenuProps } from './menu'

export type { MenuItem, MenuProps } from './menu'

/** UIMenu (SwiftUI `Menu`) : le déclencheur React Native est hébergé dans le libellé du menu. */
export function Menu({ items, title, children }: MenuProps) {
  const { scheme } = useTheme()
  return (
    <Host matchContents colorScheme={scheme}>
      <SwiftMenu
        label={
          <RNHostView matchContents>
            <>{children}</>
          </RNHostView>
        }
      >
        {title ? <Button label={title} /> : null}
        {items.map((item, index) => (
          <Fragment key={item.label}>
            {item.separated && index > 0 ? <Divider /> : null}
            <Button
              label={item.label}
              role={item.destructive ? 'destructive' : 'default'}
              systemImage={(item.checked ? 'checkmark' : item.systemImage?.ios) as SFSymbol | undefined}
              onPress={item.onPress}
            />
          </Fragment>
        ))}
      </SwiftMenu>
    </Host>
  )
}
