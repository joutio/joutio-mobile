import { FacebookLogoIcon, GoogleLogoIcon } from '../icons'
import { Button, type ButtonProps } from './button'
import { t } from '@/lib/i18n'

const PROVIDERS = () => ({
  google: { icon: GoogleLogoIcon, label: t('mobile.ds.google') },
  facebook: { icon: FacebookLogoIcon, label: t('mobile.ds.facebook') },
})

export interface SocialButtonProps extends Pick<ButtonProps, 'onPress' | 'disabled' | 'loading' | 'style'> {
  provider: keyof ReturnType<typeof PROVIDERS>
}

/** Connexion par fournisseur : `Button` gray neutral pleine largeur. */
export function SocialButton({ provider, ...props }: SocialButtonProps) {
  const { icon, label } = PROVIDERS()[provider]
  return (
    <Button variant="gray" tone="neutral" full icon={icon} {...props}>
      {label}
    </Button>
  )
}
