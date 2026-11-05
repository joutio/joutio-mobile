import { avatar } from './avatar'

/** Libellé français d'une clé `avatar.…` du web (`{{number}}` interpolé) ; la clé brute à défaut. */
export function t(key: string, vars: Record<string, string | number> = {}): string {
  const path = key.replace(/^avatar\./, '').split('.')
  let node: unknown = avatar
  for (const part of path) node = node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined
  if (typeof node !== 'string') return key
  return node.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(vars[name] ?? ''))
}
