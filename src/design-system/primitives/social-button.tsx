import { FacebookLogoIcon, GoogleLogoIcon } from '../icons'
import { Button, type ButtonProps } from './button'

const PROVIDERS = {
  google: { icon: GoogleLogoIcon, label: 'Continuer avec Google' },
  facebook: { icon: FacebookLogoIcon, label: 'Continuer avec Facebook' },
}

export interface SocialButtonProps extends Pick<ButtonProps, 'onPress' | 'disabled' | 'loading' | 'style'> {
  provider: keyof typeof PROVIDERS
}

/** Connexion par fournisseur : `Button` gray neutral pleine largeur. */
export function SocialButton({ provider, ...props }: SocialButtonProps) {
  const { icon, label } = PROVIDERS[provider]
  return (
    <Button variant="gray" tone="neutral" full icon={icon} {...props}>
      {label}
    </Button>
  )
}
