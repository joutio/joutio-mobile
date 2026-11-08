const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
function load(path, mocks = {}, fetch) {
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const mod = { exports: {} }
  new Function('require', 'module', 'exports', 'fetch', source)(
    (id) => {
      if (!(id in mocks)) throw new Error(`Unexpected dependency: ${id}`)
      return mocks[id]
    },
    mod,
    mod.exports,
    fetch,
  )
  return mod.exports
}
const targets = load('src/features/notifications/lib/push-target.ts')
const notice = {
  notificationId: 'n',
  userId: 'u',
  type: 'CHALLENGE_RECEIVED',
  sourceId: 's',
  gameId: null,
  expiresAt: new Date(Date.now() + 60000).toISOString(),
}
test('validates payloads and routes only known notification types', () => {
  assert.deepEqual(targets.parsePushNotice(notice), notice)
  assert.equal(targets.parsePushNotice({ url: 'https://untrusted.test' }), null)
  assert.equal(targets.parsePushNotice({ ...notice, type: 'UNKNOWN' }), null)
  assert.equal(targets.parsePushNotice({ ...notice, expiresAt: 'bad' }), null)
  assert.equal(targets.pushTarget(notice), 'challenges')
  assert.equal(targets.pushTarget({ ...notice, type: 'WIZZ' }), 'room')
  assert.equal(targets.pushTarget(notice, Date.parse(notice.expiresAt) + 1), 'expired')
})
function runtime({ granted = true, configured = true } = {}) {
  let user = 'u',
    permission = granted
  const requests = [],
    events = [],
    storage = new Map()
  let token = async () => ({ data: 'ExpoPushToken[abc]' })
  const api = {
    put: async (path, body) => {
      requests.push({ method: 'PUT', path, body })
    },
    delete: async (path, options) => {
      requests.push({ method: 'DELETE', path, options })
    },
  }
  const module = load(
    'src/features/notifications/lib/expo-push.ts',
    {
      'expo-constants': {
        __esModule: true,
        default: { sessionId: '12345678-1234-1234-1234-123456789012', expoConfig: { extra: { eas: { projectId: configured ? 'project' : undefined } } } },
      },
      'expo-notifications': {
        getPermissionsAsync: async () => ({ granted: permission, status: permission ? 'granted' : 'denied' }),
        requestPermissionsAsync: async () => {
          events.push('permission')
          permission = true
        },
        IosAuthorizationStatus: { PROVISIONAL: 3 },
        AndroidImportance: { HIGH: 4 },
        setNotificationChannelAsync: async () => {
          events.push('channel')
        },
        getExpoPushTokenAsync: () => token(),
      },
      'react-native': { Platform: { OS: 'android' } },
      zustand: {
        create: (initializer) => {
          let state = initializer()
          return {
            getState: () => state,
            setState: (patch) => {
              state = { ...state, ...patch }
            },
          }
        },
      },
      '@/design-system/device-settings': { useDeviceSettings: { getState: () => ({ notifyRematches: false }) } },
      '@/lib/api': { api },
      '@/lib/auth': { getUserId: () => user, getAccessToken: () => 'jwt' },
      '@/lib/config': { config: { apiUrl: 'https://api.example' } },
      '@/lib/storage': {
        getItem: async (key) => storage.get(key),
        setItem: async (key, value) => {
          storage.set(key, value)
        },
      },
    },
    async (url, options) => {
      requests.push({ method: 'RAW_DELETE', url, options })
      return { ok: true }
    },
  )
  return {
    module,
    requests,
    events,
    setUser: (value) => {
      user = value
    },
    setToken: (fn) => {
      token = fn
    },
  }
}
test('registers platform and per-installation rematch preference', async () => {
  const r = runtime()
  await r.module.syncExpoPush()
  assert.equal(r.requests.length, 1)
  assert.equal(r.requests[0].body.rematches, false)
  assert.equal(r.requests[0].body.platform, 'ANDROID')
  assert.equal(r.requests[0].body.token, 'ExpoPushToken[abc]')
})
test('unconfigured projects do not register', async () => {
  const r = runtime({ configured: false })
  await r.module.syncExpoPush()
  assert.equal(r.requests.length, 0)
})
test('revoked permissions remove the subscription', async () => {
  const r = runtime({ granted: false })
  await r.module.syncExpoPush()
  assert.equal(r.requests[0].method, 'DELETE')
})
test('Android channel exists before the permission prompt', async () => {
  const r = runtime({ granted: false })
  await r.module.requestPushPermission()
  assert.equal(r.events[0], 'channel')
  assert.equal(r.events[1], 'permission')
})
test('account switches during token retrieval cannot register the previous account', async () => {
  const r = runtime()
  let resolve, started
  const tokenStarted = new Promise((r) => {
    started = r
  })
  r.setToken(() => {
    started()
    return new Promise((r) => {
      resolve = r
    })
  })
  const syncing = r.module.syncExpoPush()
  await tokenStarted
  r.setUser('other')
  resolve({ data: 'ExpoPushToken[abc]' })
  await syncing
  assert.equal(r.requests.length, 0)
})
test('logout cancels pending registration then revokes with captured credentials', async () => {
  const r = runtime()
  let resolve, started
  const tokenStarted = new Promise((r) => {
    started = r
  })
  r.setToken(() => {
    started()
    return new Promise((r) => {
      resolve = r
    })
  })
  const syncing = r.module.syncExpoPush()
  await tokenStarted
  const logout = r.module.unregisterExpoPush()
  resolve({ data: 'ExpoPushToken[abc]' })
  await Promise.all([syncing, logout])
  assert.deepEqual(
    r.requests.map((r) => r.method),
    ['RAW_DELETE'],
  )
  assert.equal(r.requests[0].options.headers.Authorization, 'Bearer jwt')
})
