import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { create } from 'zustand'
import { useDeviceSettings } from '@/design-system/device-settings'
import { api } from '@/lib/api'
import { getAccessToken, getUserId } from '@/lib/auth'
import { config } from '@/lib/config'
import { getItem, setItem } from '@/lib/storage'

const PATH = '/api/push/expo/subscriptions'
const INSTALLATION_KEY = 'joutio.push.installation'
const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined
export const pushConfigured = Boolean(projectId) && Platform.OS !== 'web'

type Permission = 'unknown' | 'granted' | 'denied' | 'undetermined' | 'unavailable'
export const usePushState = create<{ permission: Permission; error: boolean }>(() => ({ permission: 'unknown', error: false }))
let installationPromise: Promise<string> | undefined
let operations: Promise<unknown> = Promise.resolve()
let generation = 0

function installationId(): Promise<string> {
  installationPromise ??= (async () => {
    const existing = await getItem(INSTALLATION_KEY)
    if (existing) return existing
    // UUID de cette session native, persisté pour identifier durablement l’installation.
    const id = Constants.sessionId
    await setItem(INSTALLATION_KEY, id)
    return id
  })()
  return installationPromise
}

export async function refreshPushPermission() {
  if (Platform.OS === 'web') {
    usePushState.setState({ permission: 'unavailable' })
    return false
  }
  const permission = await Notifications.getPermissionsAsync()
  const granted = permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  usePushState.setState({ permission: granted ? 'granted' : permission.status })
  return granted
}

export async function requestPushPermission() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('challenges', {
      name: 'Défis et relances',
      importance: Notifications.AndroidImportance.HIGH,
    })
  }
  await Notifications.requestPermissionsAsync()
  await refreshPushPermission()
  await syncExpoPush()
}

/** File d'opérations : aucune inscription retardée ne survit à une déconnexion. */
export function syncExpoPush(): Promise<void> {
  const userId = getUserId()
  const started = generation
  const task = operations
    .catch(() => undefined)
    .then(async () => {
      if (!pushConfigured || !userId || userId !== getUserId() || started !== generation) return
      const granted = await refreshPushPermission()
      const installation = await installationId()
      if (!granted) {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8000)
        try {
          await api.delete(PATH, { params: { installationId: installation }, signal: controller.signal })
        } finally {
          clearTimeout(timeout)
        }
        return
      }
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('challenges', {
          name: 'Défis et relances',
          importance: Notifications.AndroidImportance.HIGH,
        })
      }
      const token = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Push registration timeout')), 8000)
        Notifications.getExpoPushTokenAsync({ projectId })
          .then(({ data }) => resolve(data), reject)
          .finally(() => clearTimeout(timeout))
      })
      if (userId !== getUserId() || started !== generation) return
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      try {
        await api.put(
          PATH,
          {
            installationId: installation,
            token,
            platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
            rematches: useDeviceSettings.getState().notifyRematches,
          },
          { signal: controller.signal },
        )
      } finally {
        clearTimeout(timeout)
      }
      usePushState.setState({ error: false })
    })
  operations = task
  return task.catch((error: unknown) => {
    usePushState.setState({ error: true })
    throw error
  })
}

/** Appel direct borné, sans refresh ni récursion si la session est déjà refusée. */
export async function unregisterExpoPush(waitForWrites = true): Promise<void> {
  generation++
  const accessToken = getAccessToken()
  if (!pushConfigured || !accessToken) return
  const installation = await installationId()
  const controller = new AbortController()
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    // Attend l'écriture précédente, déjà bornée par le client API, avant la suppression.
    if (waitForWrites) {
      let waiting: ReturnType<typeof setTimeout> | undefined
      try {
        await Promise.race([
          operations.catch(() => undefined),
          new Promise<void>((resolve) => {
            waiting = setTimeout(resolve, 9000)
          }),
        ])
      } finally {
        clearTimeout(waiting)
      }
    }
    timeout = setTimeout(() => controller.abort(), 3000)
    await fetch(`${config.apiUrl}${PATH}?installationId=${encodeURIComponent(installation)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    })
  } catch {
    // Hors ligne : le serveur ne peut pas révoquer l'installation ; la prochaine connexion la réaffecte.
  } finally {
    clearTimeout(timeout)
  }
}
