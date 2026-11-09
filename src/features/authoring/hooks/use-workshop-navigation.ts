import { useSegments } from 'expo-router'

/** Keep authoring links in the stack from which the workshop was opened. */
export function useWorkshopNavigation() {
  const segments = useSegments() as string[]
  const inTabs = segments.includes('(tabs)')
  const base = inTabs ? '/profile/topics/[id]' as const : '/workshop/[id]' as const
  return { inTabs, base }
}
