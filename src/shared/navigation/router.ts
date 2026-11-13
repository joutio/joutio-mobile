import { router as expoRouter, type Href } from 'expo-router'

/**
 * Délai pendant lequel une seconde navigation vers la même destination est ignorée.
 * Un double appui sur une ligne ou une carte ne doit ouvrir l'écran qu'une fois.
 */
const REPEAT_WINDOW_MS = 700

let last: { key: string; at: number } | null = null

function hrefKey(href: Href): string {
  return typeof href === 'string' ? href : JSON.stringify(href)
}

/** Vrai quand la même destination vient d'être demandée (double appui). */
function isRepeat(href: Href): boolean {
  const key = hrefKey(href)
  const now = Date.now()
  if (last && last.key === key && now - last.at < REPEAT_WINDOW_MS) return true
  last = { key, at: now }
  return false
}

type Router = typeof expoRouter

/**
 * `router` d'expo-router protégé contre les doubles appuis : `push` et `navigate` ignorent
 * une répétition de la même destination pendant {@link REPEAT_WINDOW_MS}. Les autres
 * méthodes (`back`, `replace`, `dismiss`…) sont relayées telles quelles. Toujours importer
 * `router` depuis ce module, jamais directement depuis `expo-router`.
 */
export const router: Router = new Proxy(expoRouter, {
  get(target, prop, receiver) {
    if (prop === 'push' || prop === 'navigate') {
      const method = Reflect.get(target, prop, receiver) as Router['push']
      return (href: Href, options?: Parameters<Router['push']>[1]) => {
        if (isRepeat(href)) return
        method(href, options)
      }
    }
    return Reflect.get(target, prop, receiver)
  },
})
