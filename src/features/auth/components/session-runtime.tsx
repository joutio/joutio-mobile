import { useSessionBootstrap } from '../hooks/use-session-bootstrap'
import { useSessionLifecycle } from '../hooks/use-session-lifecycle'

/** Effets de session, montés une fois sous le QueryClientProvider. Ne rend rien. */
export function SessionRuntime() {
  useSessionBootstrap()
  useSessionLifecycle()
  return null
}
