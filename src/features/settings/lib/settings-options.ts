import { t } from '@/lib/i18n'
export const LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
] as const

export const APPEARANCE = () => ([
  { value: 'dark', label: t('settings.dark') },
  { value: 'light', label: t('settings.light') },
  { value: 'system', label: t('settings.system') },
] as const)
