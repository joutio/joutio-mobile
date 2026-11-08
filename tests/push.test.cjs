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
const policy = load('src/features/notifications/lib/notification-target.ts')
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
  assert.deepEqual(policy.notificationTarget(notice), { kind: 'challenges' })
  assert.deepEqual(policy.notificationTarget({ ...notice, type: 'WIZZ' }), { kind: 'room', id: 's' })
  assert.deepEqual(policy.notificationTarget(notice, Date.parse(notice.expiresAt) + 1), { kind: 'fallback', challenges: true, expired: true })
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

test('accepts omitted nullable push fields and drops arbitrary navigation fields', () => {
  const { gameId, sourceId, ...minimal } = notice
  assert.deepEqual(targets.parsePushNotice({ ...minimal, url: 'https://untrusted.test' }), { ...minimal, gameId: null, sourceId: null })
  assert.equal(targets.parsePushNotice({ ...notice, notificationId: '' }), null)
  assert.equal(targets.parsePushNotice({ ...notice, gameId: {} }), null)
  assert.equal(targets.parsePushNotice({ ...notice, userId: '' }), null)
})

test('every inbox type resolves to its action screen', () => {
  const base = { ...notice, actorId: 'player', topicId: 'topic' }
  for (const [type, target] of [
    ['FOLLOW', { kind: 'player', id: 'player' }],
    ['CHALLENGE_DECLINED', { kind: 'player', id: 'player' }],
    ['CHALLENGE_RECEIVED', { kind: 'challenges' }],
    ['ROOM_ACCEPTED', { kind: 'room', id: 's' }],
    ['WIZZ', { kind: 'room', id: 's' }],
    ['QUESTION_REPORTED', { kind: 'moderation', id: 'topic', reportId: 's' }],
    ['TOPIC_DRAFTED', { kind: 'edit-topic', id: 'topic' }],
    ['ACCOUNT_SUSPENDED', { kind: 'suspended' }],
  ])
    assert.deepEqual(policy.notificationTarget({ ...base, type }), target)
  // A gameId on an acceptance never bypasses the room lifecycle.
  assert.deepEqual(policy.notificationTarget({ ...base, type: 'ROOM_ACCEPTED', gameId: 'game' }), { kind: 'room', id: 's' })
  assert.deepEqual(policy.notificationTarget({ ...base, gameId: 'previous-game' }), { kind: 'challenges' })
  assert.deepEqual(policy.notificationTarget({ ...base, type: 'WIZZ', sourceId: null }), { kind: 'fallback', challenges: true, expired: false })
  assert.deepEqual(policy.notificationTarget({ ...base, type: 'TOPIC_DRAFTED', topicId: null }), { kind: 'fallback', challenges: false, expired: false })
})

test('toasts only show fresh unread foreground notifications outside immersive screens', () => {
  assert.equal(policy.shouldToast(notice, true, false), true)
  assert.equal(policy.shouldToast(notice, false, false), false)
  assert.equal(policy.shouldToast(notice, true, true), false)
  assert.equal(policy.shouldToast({ ...notice, gameId: 'rematch' }, true, false), false)
  assert.equal(policy.shouldToast({ ...notice, readAt: new Date().toISOString() }, true, false), false)
  assert.equal(policy.shouldToast(notice, true, false, Date.parse(notice.expiresAt)), false)
  const unique = policy.createNotificationDeduplicator(2)
  assert.equal(unique('a'), true)
  assert.equal(unique('a'), false)
  assert.equal(unique('b'), true)
  assert.equal(unique('c'), true)
  assert.equal(unique('a'), true) // bounded memory
})

// Minimal hook runner: effects/dependencies/state are exercised without a native renderer.
function hooks() {
  const slots = [],
    effects = []
  let cursor = 0,
    dirty = false,
    component
  const react = {
    useRef: (initial) => {
      const i = cursor++
      return (slots[i] ??= { current: initial })
    },
    useState: (initial) => {
      const i = cursor++
      if (!(i in slots)) slots[i] = initial
      return [
        slots[i],
        (value) => {
          const next = typeof value === 'function' ? value(slots[i]) : value
          if (!Object.is(next, slots[i])) {
            slots[i] = next
            dirty = true
          }
        },
      ]
    },
    useEffect: (effect, deps) => {
      const i = cursor++
      const previous = slots[i]
      if (!previous || deps.some((value, index) => !Object.is(value, previous.deps[index]))) {
        slots[i] = { deps, cleanup: previous?.cleanup }
        effects.push(() => {
          slots[i].cleanup?.()
          slots[i].cleanup = effect()
        })
      }
    },
    useCallback: (callback) => callback,
  }
  const render = () => {
    cursor = 0
    dirty = false
    component()
    effects.splice(0).forEach((effect) => effect())
  }
  return {
    react,
    mount: (fn) => {
      component = fn
      render()
    },
    render,
    flush: async () => {
      for (let n = 0; n < 8; n++) {
        await Promise.resolve()
        if (dirty) render()
      }
    },
    unmount: () => slots.forEach((slot) => slot?.cleanup?.()),
  }
}

function pushRuntime() {
  const h = hooks()
  const state = { ready: false, authenticated: false }
  let me,
    segments = ['index'],
    responseListener,
    beforeClear,
    lastResolve
  const opened = [],
    clears = []
  const notifications = {
    DEFAULT_ACTION_IDENTIFIER: 'default',
    setNotificationHandler: () => {},
    getLastNotificationResponseAsync: () =>
      new Promise((resolve) => {
        lastResolve = resolve
      }),
    addNotificationResponseReceivedListener: (listener) => {
      responseListener = listener
      return { remove() {} }
    },
    clearLastNotificationResponseAsync: async () => {
      clears.push(true)
    },
    addPushTokenListener: () => ({ remove() {} }),
  }
  const open = async (...args) => {
    opened.push(args)
  }
  const runtime = load('src/features/notifications/components/expo-push-runtime.tsx', {
    'expo-notifications': notifications,
    'expo-router': {
      router: {
        replace: () => {
          segments = ['(app)', '(tabs)', 'home']
          h.render()
        },
      },
      useSegments: () => segments,
      useRootNavigationState: () => ({ key: 'root' }),
    },
    react: h.react,
    'react-native': { AppState: { addEventListener: () => ({ remove() {} }) } },
    '@/features/auth/session-store': { useSessionStore: (select) => select(state) },
    '@/features/me': { useMe: () => ({ data: me }) },
    '@/lib/auth': {
      getUserId: () => 'u',
      onBeforeSessionClear: (callback) => {
        beforeClear = callback
        return () => {}
      },
    },
    '../hooks/use-open-notification': { useOpenNotification: () => open },
    '../lib/expo-push': { syncExpoPush: async () => {}, unregisterExpoPush: async () => {} },
    '../lib/notification-target': policy,
    '../lib/push-target': targets,
  })
  const response = (data = notice) => ({ actionIdentifier: 'default', notification: { request: { content: { data } } } })
  h.mount(runtime.ExpoPushRuntime)
  return {
    ...h,
    state,
    opened,
    clears,
    response,
    emit: (data) => responseListener(response(data)),
    last: (data) => lastResolve(data ? response(data) : null),
    beforeClear: () => beforeClear(),
    enter: () => {
      state.ready = true
      state.authenticated = true
      me = { userId: 'u', onboardingCompleted: true }
      h.render()
    },
    catalog: () => {
      segments = ['(dev)', 'catalog']
      h.render()
    },
    onboarding: () => {
      me = { userId: 'u', onboardingCompleted: false }
      h.render()
    },
    inApp: () => {
      segments = ['(app)', '(tabs)', 'home']
      h.render()
    },
  }
}

test('cold-start click waits for auth, onboarding and the app route before navigating once', async () => {
  const r = pushRuntime()
  r.last(notice)
  await r.flush()
  assert.equal(r.opened.length, 0)
  r.enter()
  await r.flush()
  assert.equal(r.opened.length, 0) // index redirect has not mounted the app yet
  r.inApp()
  await r.flush()
  assert.equal(r.opened.length, 1)
  assert.equal(r.opened[0][0].notificationId, notice.notificationId)
  r.emit(notice)
  await r.flush()
  assert.equal(r.opened.length, 1)
})

test('live click wins over an asynchronous old last response; wrong recipients are ignored', async () => {
  const r = pushRuntime()
  r.enter()
  r.inApp()
  r.emit({ ...notice, notificationId: 'new' })
  r.last({ ...notice, notificationId: 'old' })
  await r.flush()
  assert.deepEqual(
    r.opened.map(([notice]) => notice.notificationId),
    ['new'],
  )
  r.emit({ ...notice, notificationId: 'wrong-account', userId: 'other' })
  await r.flush()
  assert.equal(r.opened.length, 1)
})

test('logout clears pending clicks and the native last response', async () => {
  const r = pushRuntime()
  r.emit(notice)
  await r.flush()
  await r.beforeClear()
  r.enter()
  r.inApp()
  await r.flush()
  assert.equal(r.opened.length, 0)
  assert.equal(r.clears.length, 1)
})

test('opening a notification marks read, routes correctly, and falls back for unavailable content', async () => {
  const routes = [],
    reads = [],
    messages = []
  let current = 'u',
    check = async () => {}
  const mod = load('src/features/notifications/hooks/use-open-notification.ts', {
    'expo-router': {
      router: {
        push: (route) => routes.push(route),
        navigate: (route) => routes.push(route),
      },
    },
    react: { useCallback: (callback) => callback },
    '@/design-system': { toast: { info: (message) => messages.push(message) } },
    '@/lib/auth': { getUserId: () => current, clearSession: async () => {} },
    '@/features/auth/session-store': { useSessionStore: { getState: () => ({ authenticated: true }) } },
    '../lib/notification-target': policy,
    '../lib/notifications-service': { notificationsService: { checkTarget: (...args) => check(...args) } },
    './use-notifications': { useMarkRead: () => ({ mutate: (id) => reads.push(id) }) },
  })
  const open = mod.useOpenNotification()
  await open(notice)
  assert.deepEqual(routes, ['/challenges'])
  assert.deepEqual(reads, ['n'])
  await open({ ...notice, type: 'WIZZ' })
  assert.deepEqual(routes.at(-1), { pathname: '/room/[roomId]', params: { roomId: 's', fromPush: '1' } })
  await open({ ...notice, type: 'QUESTION_REPORTED', topicId: 't' })
  assert.deepEqual(routes.at(-1), { pathname: '/profile/topics/[id]/reports/[reportId]', params: { id: 't', reportId: 's' } })
  check = async () => {
    throw { statusCode: 404 }
  }
  await open({ ...notice, type: 'FOLLOW', actorId: 'gone' })
  assert.equal(routes.at(-1), '/home/notifications')
  assert.match(messages.at(-1), /disponible/)
  const count = routes.length
  check = async () => {
    current = 'other'
  }
  await open(notice, 'u')
  assert.equal(routes.length, count) // no navigation across account changes during I/O
})

test('Expo and STOMP reception share one foreground toast, excluding background, duel and rematches', async () => {
  const h = hooks(),
    shown = []
  let stomp,
    expo,
    active = 'active',
    immersive = false
  const runtime = load('src/features/notifications/components/notifications-runtime.tsx', {
    'expo-notifications': {
      addNotificationReceivedListener: (callback) => {
        expo = callback
        return { remove() {} }
      },
    },
    react: h.react,
    'react-native': {
      AppState: {
        get currentState() {
          return active
        },
      },
    },
    '@/design-system': { toast: { show: (notice) => shown.push(notice) }, useToastStore: { getState: () => ({ suspended: immersive ? 1 : 0 }) } },
    '@/features/me': { useMe: () => ({ data: { userId: 'u' } }) },
    '@/lib/auth': { getUserId: () => 'u' },
    '../hooks/use-notifications': {
      useNotificationsRealtime: (callback) => {
        stomp = callback
      },
    },
    '../hooks/use-open-notification': { useOpenNotification: () => async () => {} },
    '../lib/notification-target': policy,
    '../lib/notification-presentation': load('src/features/notifications/lib/notification-presentation.ts'),
    '../lib/push-target': targets,
  })
  h.mount(runtime.NotificationsRuntime)
  expo({ request: { content: { data: notice } }, date: Date.now() })
  stomp({ ...notice, actorId: 'p' })
  assert.equal(shown.length, 1)
  assert.equal(typeof shown[0].onPress, 'function')
  active = 'background'
  stomp({ ...notice, notificationId: 'background' })
  active = 'active'
  immersive = true
  stomp({ ...notice, notificationId: 'duel' })
  immersive = false
  stomp({ ...notice, notificationId: 'rematch', gameId: 'g' })
  assert.equal(shown.length, 1)
})

test('admin claim changes propagate on restore, refresh persistence and logout', async () => {
  const storage = new Map()
  const auth = load('src/lib/auth.ts', {
    './config': { config: {} },
    './endpoints': { ENDPOINTS: {} },
    './storage': {
      getItem: async (key) => storage.get(key) ?? null,
      setItem: async (key, value) => storage.set(key, value),
      deleteItem: async (key) => storage.delete(key),
    },
  })
  const jwt = (claims) => `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`
  assert.deepEqual(auth.decodeRoles(null), [])
  assert.deepEqual(auth.decodeRoles('bad'), [])
  assert.deepEqual(auth.decodeRoles(jwt({ roles: 'ROLE_ADMIN' })), [])
  assert.deepEqual(auth.decodeRoles(jwt({ roles: ['ADMIN', 42] })), ['ROLE_ADMIN'])
  const changes = []
  auth.onAccessTokenChanged(() => changes.push(auth.decodeRoles(auth.getAccessToken())))
  storage.set('joutio.accessToken', jwt({ roles: ['ROLE_ADMIN'], sub: 'u' }))
  await auth.restoreSession()
  assert.deepEqual(changes.at(-1), ['ROLE_ADMIN'])
  await auth.persistSession({ accessToken: jwt({ roles: ['ROLE_USER'], sub: 'u' }) })
  assert.deepEqual(changes.at(-1), ['ROLE_USER'])
  await auth.clearSession()
  assert.deepEqual(changes.at(-1), [])
})

test('push click exits the admin catalog and waits for incomplete onboarding', async () => {
  const r = pushRuntime()
  r.enter()
  r.onboarding()
  r.catalog()
  r.emit(notice)
  await r.flush()
  assert.equal(r.opened.length, 0)
  r.enter()
  await r.flush()
  assert.equal(r.opened.length, 1)
})

test('a delayed native last response cannot restore a click cleared by logout', async () => {
  const r = pushRuntime()
  await r.beforeClear()
  r.last(notice)
  r.enter()
  r.inApp()
  await r.flush()
  assert.equal(r.opened.length, 0)
})

test('catalog requires both an authenticated admin and the feature flag, including release builds', () => {
  const state = { authenticated: false }
  let roles = []
  const config = { catalogEnabled: true }
  const hook = load('src/features/auth/hooks/use-catalog-access.ts', {
    react: { useSyncExternalStore: (_subscribe, snapshot) => snapshot() },
    '@/lib/auth': { getAccessToken: () => null, decodeRoles: () => roles, onAccessTokenChanged: () => () => {} },
    '@/lib/config': { config },
    '../session-store': { useSessionStore: (select) => select(state) },
  })
  assert.equal(hook.useCatalogAccess(), false)
  roles = ['ROLE_ADMIN']
  assert.equal(hook.useCatalogAccess(), false)
  state.authenticated = true
  assert.equal(hook.useCatalogAccess(), true) // no __DEV__ restriction
  roles = ['ROLE_USER']
  assert.equal(hook.useCatalogAccess(), false)
  roles = ['ROLE_ADMIN']
  config.catalogEnabled = false
  assert.equal(hook.useCatalogAccess(), false)
})
