const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const { QueryClient } = require('@tanstack/react-query')
const root = path.resolve(__dirname, '../src')

// Exercise real hook lifecycle callbacks and real QueryClient cache updates without a native renderer.
function harness(extraMocks = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
  const me = { userId: 'me', pseudonym: 'Moi', followingCount: 1, followersCount: 0 }
  const failures = new Set()
  const service = new Proxy(
    {},
    {
      get: (_, name) => async (id) => {
        if (failures.has(id)) throw Error('rejected')
        return { id: `server-${name}` }
      },
    },
  )
  const modules = new Map()
  const mocks = {
    '@tanstack/react-query': { ...require('@tanstack/react-query'), useMutation: (options) => options, useQueryClient: () => client },
    'expo-router': { router: { push() {} } },
    '@/design-system': { toast: { error() {}, success() {} } },
    '@/features/me': { useMe: () => ({ data: me }) },
    '@/features/play/hooks/use-rematch': { roomOfChallenge: (id) => `room-${id}` },
    '@/lib/realtime/personal-notifications': { usePersonalNotifications() {} },
    '@/features/premium/premium-store': { usePremiumSheet: () => () => {} },
    ...extraMocks,
  }
  function load(file) {
    if (mocks[file]) return mocks[file]
    if (file.endsWith('-service') || file.endsWith('/quota')) return new Proxy({}, { get: () => service })
    let resolved = file.startsWith('@/') ? path.join(root, file.slice(2)) : file
    if (!path.extname(resolved)) resolved += fs.existsSync(resolved + '.ts') ? '.ts' : '.tsx'
    if (modules.has(resolved)) return modules.get(resolved).exports
    const module = { exports: {} }
    modules.set(resolved, module)
    const code = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText
    new Function('require', 'module', 'exports', code)(
      (id) => (id.startsWith('.') ? load(path.resolve(path.dirname(resolved), id)) : load(id)),
      module,
      module.exports,
    )
    return module.exports
  }
  return { client, me, failures, load, keys: load('@/lib/query-keys').queryKeys }
}
const challenge = (id) => ({ challengeId: id, status: 'PENDING', roomId: null })
const topic = (id, followed = false) => ({ topicId: id, names: { fr: id }, followed, followersCount: 10, status: 'PUBLISHED' })

test('cancel is immediate, rolls back only failed IDs in a partial batch, no confirmation read', async () => {
  const h = harness()
  h.client.setQueryData(h.keys.challenges(), [challenge('a'), challenge('b')])
  let reads = 0
  h.client.invalidateQueries = () => {
    reads++
    throw Error('unexpected read')
  }
  const mutation = h.load('@/features/challenges/hooks/use-challenges').useCancelChallenge()
  const context = await mutation.onMutate(['a', 'b'])
  assert.deepEqual(
    h.client.getQueryData(h.keys.challenges()).map((item) => item.status),
    ['CANCELLED', 'CANCELLED'],
  )
  h.failures.add('b')
  await assert.rejects(mutation.mutationFn(['a', 'b']), (error) => {
    mutation.onError(error, ['a', 'b'], context)
    return true
  })
  assert.deepEqual(
    h.client.getQueryData(h.keys.challenges()).map((item) => item.status),
    ['CANCELLED', 'PENDING'],
  )
  assert.equal(reads, 0)
})

test('closing a room updates detail, both lists and its challenge, then restores on error', async () => {
  const h = harness()
  const room = { roomId: 'r', status: 'WAITING_PLAYERS' }
  h.client.setQueryData(h.keys.rooms(), [room])
  h.client.setQueryData(['tracked-rooms', 'me'], [room])
  h.client.setQueryData(['rooms', 'r'], room)
  h.client.setQueryData(h.keys.challenges(), [{ ...challenge('c'), roomId: 'r' }])
  const mutation = h.load('@/features/challenges/hooks/use-challenges').useCloseRoom()
  const context = await mutation.onMutate('r')
  assert.equal(h.client.getQueryData(h.keys.rooms())[0].status, 'CANCELLED')
  assert.equal(h.client.getQueryData(['rooms', 'r']).status, 'CANCELLED')
  assert.equal(h.client.getQueryData(['tracked-rooms', 'me'])[0].status, 'CANCELLED')
  assert.equal(h.client.getQueryData(h.keys.challenges())[0].status, 'CANCELLED')
  mutation.onError(Error(), 'r', context)
  assert.equal(h.client.getQueryData(h.keys.rooms())[0].status, 'WAITING_PLAYERS')
})

test('older projections cannot resurrect accepted/cancelled challenges or closed rooms', () => {
  const h = harness()
  const cache = h.load('@/features/play/lib/play-cache')
  assert.equal(cache.reconcileChallenges([{ ...challenge('a'), status: 'CANCELLED' }], [challenge('a')])[0].status, 'CANCELLED')
  assert.equal(cache.reconcileRooms([{ roomId: 'r', status: 'CANCELLED' }], [{ roomId: 'r', status: 'WAITING_PLAYERS' }])[0].status, 'CANCELLED')
})

test('rollback preserves concurrent fields, entities and counter increments', async () => {
  const h = harness()
  const { optimisticUpdate } = h.load('@/lib/optimistic-cache')
  h.client.setQueryData(['profiles'], {
    followingCount: 1,
    bio: 'old',
    players: [
      { userId: 'a', following: false },
      { userId: 'b', following: false },
    ],
  })
  const first = await optimisticUpdate(h.client, [['profiles']], () =>
    h.client.setQueryData(['profiles'], (data) => ({
      ...data,
      followingCount: 2,
      bio: 'edited',
      players: data.players.map((p) => (p.userId === 'a' ? { ...p, following: true } : p)),
    })),
  )
  h.client.setQueryData(['profiles'], (data) => ({
    ...data,
    followingCount: 3,
    language: 'en',
    players: data.players.map((p) => (p.userId === 'b' ? { ...p, following: true } : p)),
  }))
  first.rollback()
  const data = h.client.getQueryData(['profiles'])
  assert.equal(data.bio, 'old')
  assert.equal(data.language, 'en')
  assert.equal(data.followingCount, 2)
  assert.deepEqual(
    data.players.map((p) => p.following),
    [false, true],
  )
})

test('mark all read zeros the global unread count, including unloaded pages, without refetch', async () => {
  const h = harness()
  const notification = { notificationId: 'n', readAt: null }
  h.client.setQueryData(h.keys.notifications.list(), { pages: [{ content: [notification], totalElements: 25, size: 10, last: false }], pageParams: [0] })
  h.client.setQueryData(h.keys.notifications.unreadCount(), { count: 25 })
  const mutation = h.load('@/features/notifications/hooks/use-notifications').useMarkAllRead()
  const context = await mutation.onMutate()
  assert.equal(h.client.getQueryData(h.keys.notifications.unreadCount()).count, 0)
  assert.notEqual(h.client.getQueryData(h.keys.notifications.list()).pages[0].content[0].readAt, null)
  assert.equal(mutation.onSettled, undefined)
  mutation.onError(Error(), undefined, context)
  assert.equal(h.client.getQueryData(h.keys.notifications.unreadCount()).count, 25)
})

test('delete all clears pagination as well as rows; failure restores both', async () => {
  const h = harness()
  h.client.setQueryData(h.keys.notifications.list(), {
    pages: [{ content: [{ notificationId: 'a', readAt: null }], totalElements: 25, totalPages: 3, size: 10, last: false }],
    pageParams: [0],
  })
  h.client.setQueryData(h.keys.notifications.unreadCount(), { count: 25 })
  const mutation = h.load('@/features/notifications/hooks/use-notifications').useDeleteAllNotifications()
  const context = await mutation.onMutate()
  const page = h.client.getQueryData(h.keys.notifications.list()).pages[0]
  assert.equal(page.last, true)
  assert.equal(page.totalElements, 0)
  assert.deepEqual(page.content, [])
  mutation.onError(Error(), undefined, context)
  assert.equal(h.client.getQueryData(h.keys.notifications.list()).pages[0].totalElements, 25)
})

test('following a topic updates all rails, followed/hidden lists and rollback restores membership', async () => {
  const h = harness()
  const t = topic('t')
  h.client.setQueryData(h.keys.topic.overview('t'), { topic: t })
  h.client.setQueryData(h.keys.home(), { followedTopics: [], trendingTopics: [t], newTopics: [t], recommendedTopics: [t] })
  const hidden = h.keys.topics.list({ hideFollowed: true })
  const followed = h.keys.topics.list({ followed: true })
  h.client.setQueryData(hidden, { pages: [{ topics: [t], last: true }], pageParams: [0] })
  h.client.setQueryData(followed, { pages: [{ topics: [], last: true }], pageParams: [0] })
  const mutation = h.load('@/features/topic/hooks/use-topic').useFollowTopic('t')
  const context = await mutation.onMutate(true)
  assert.equal(h.client.getQueryData(h.keys.home()).followedTopics.length, 1)
  assert.equal(h.client.getQueryData(hidden).pages[0].topics.length, 0)
  assert.equal(h.client.getQueryData(followed).pages[0].topics.length, 1)
  mutation.onError(Error(), true, context)
  assert.equal(h.client.getQueryData(hidden).pages[0].topics.length, 1)
  assert.equal(h.client.getQueryData(followed).pages[0].topics.length, 0)
})

test('wearing a title updates me and public profile before the response', async () => {
  const h = harness()
  h.client.setQueryData(h.keys.me(), { ...h.me, equippedTitle: 'old' })
  h.client.setQueryData(h.keys.profiles.profile('me'), { equippedTitle: 'old' })
  h.client.setQueryData(h.keys.profiles.titles('me'), { equippedKey: 'old', titles: [] })
  const mutation = h.load('@/features/topic/hooks/use-topic').useWearTitle()
  const context = await mutation.onMutate('new')
  assert.equal(h.client.getQueryData(h.keys.me()).equippedTitle, 'new')
  mutation.onError(Error(), 'new', context)
  assert.equal(h.client.getQueryData(h.keys.me()).equippedTitle, 'old')
})

test('removing a title clears all three caches and restores them when rejected', async () => {
  const h = harness()
  const keys = [h.keys.me(), h.keys.profiles.profile('me'), h.keys.profiles.titles('me')]
  h.client.setQueryData(keys[0], { ...h.me, equippedTitle: 'old' })
  h.client.setQueryData(keys[1], { equippedTitle: 'old' })
  h.client.setQueryData(keys[2], { equippedKey: 'old', titles: [{ key: 'old' }] })
  const mutation = h.load('@/features/topic/hooks/use-topic').useWearTitle()
  const context = await mutation.onMutate(null)
  for (const [index, key] of keys.entries()) {
    assert.equal(h.client.getQueryData(key)[index === 2 ? 'equippedKey' : 'equippedTitle'], null)
  }
  assert.equal(h.client.getQueryData(keys[2]).titles.length, 1)
  mutation.onError(Error(), null, context)
  for (const [index, key] of keys.entries()) {
    assert.equal(h.client.getQueryData(key)[index === 2 ? 'equippedKey' : 'equippedTitle'], 'old')
  }
})

test('following a player updates own counters and following list optimistically, then restores them', async () => {
  const h = harness()
  const profile = { userId: 'p', pseudonym: 'Player', following: false, followersCount: 2, progression: null, presence: null }
  h.client.setQueryData(h.keys.me(), h.me)
  h.client.setQueryData(h.keys.profiles.profile('p'), profile)
  const key = ['contacts', 'me', 'following', '', 'RECENT']
  h.client.setQueryData(key, { pages: [{ content: [], totalElements: 0 }], pageParams: [0] })
  const mutation = h.load('@/features/social/hooks/use-social').useFollowPlayer('p')
  const context = await mutation.onMutate(true)
  assert.equal(h.client.getQueryData(h.keys.me()).followingCount, 2)
  assert.equal(h.client.getQueryData(key).pages[0].content[0].userId, 'p')
  mutation.onError(Error(), true, context)
  assert.equal(h.client.getQueryData(h.keys.me()).followingCount, 1)
  assert.equal(h.client.getQueryData(key).pages[0].content.length, 0)
})

test('editing profile applies to me and its public view; concurrent other fields survive rollback', async () => {
  const h = harness()
  h.client.setQueryData(h.keys.me(), { ...h.me, bio: 'old' })
  h.client.setQueryData(h.keys.profiles.profile('me'), { bio: 'old' })
  const mutation = h.load('@/features/profile/hooks/use-profile').useUpdateMe('bio')
  const context = await mutation.onMutate('new')
  assert.equal(h.client.getQueryData(h.keys.profiles.profile('me')).bio, 'new')
  h.client.setQueryData(h.keys.me(), (me) => ({ ...me, country: 'FR' }))
  mutation.onError(Error(), 'new', context)
  assert.equal(h.client.getQueryData(h.keys.me()).country, 'FR')
  assert.equal(h.client.getQueryData(h.keys.me()).bio, 'old')
})

test('creating a topic displays a provisional row then replaces its id from the command response', async () => {
  const h = harness()
  const mutation = h.load('@/features/authoring/hooks/use-authoring').useCreateTopic()
  const variables = { name: 'Nouveau', category: 'SPORTS' }
  const context = await mutation.onMutate(variables)
  assert.equal(h.client.getQueryData(h.keys.authoring.topics()).content[0].topicId, context.tempId)
  mutation.onSuccess({ id: 'created' }, variables, context)
  assert.equal(h.client.getQueryData(h.keys.authoring.topics()).content[0].topicId, 'created')
})

test('question save applies submitted operations immediately and restores list on failure', async () => {
  const h = harness()
  const mutation = h.load('@/features/authoring/hooks/use-authoring').useSaveQuestion('t')
  h.client.setQueryData(h.keys.authoring.questions('t'), [
    { questionId: 'q', contents: [{ language: 'fr', text: 'Old', answers: [] }], status: 'APPROVED', suspended: false },
  ])
  const variables = { questionId: 'q', operations: [{ kind: 'text', language: 'fr', text: 'New' }] }
  const context = await mutation.onMutate(variables)
  assert.equal(h.client.getQueryData(h.keys.authoring.questions('t'))[0].contents[0].text, 'New')
  mutation.onError(Error(), variables, context)
  assert.equal(h.client.getQueryData(h.keys.authoring.questions('t'))[0].contents[0].text, 'Old')
})

test('mutation success/settlement never invalidates or refetches data', () => {
  const violations = []
  function visit(file) {
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    )
    const walk = (node, mutationCallback = false) => {
      const callback = mutationCallback || (ts.isPropertyAssignment(node) && ['onSuccess', 'onSettled'].includes(node.name.getText(source)))
      if (callback && ts.isCallExpression(node) && /\.(invalidateQueries|refetchQueries|refetch)\s*$/.test(node.expression.getText(source)))
        violations.push(`${file}:${source.getLineAndCharacterOfPosition(node.pos).line + 1}`)
      ts.forEachChild(node, (child) => walk(child, callback))
    }
    walk(source)
  }
  const scan = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name)
      if (entry.isDirectory()) scan(file)
      else if (/\.tsx?$/.test(file)) visit(file)
    }
  }
  scan(path.join(root, 'features'))
  assert.deepEqual(violations, [])
})

test('partial question command failure retains accepted fields and restores only rejected fields', async () => {
  const h = harness()
  const key = h.keys.authoring.questions('t')
  h.client.setQueryData(key, [
    { questionId: 'q', contents: [{ language: 'fr', text: 'Old', answers: [] }], correctAnswer: 'A', status: 'APPROVED', suspended: false },
  ])
  const mutation = h.load('@/features/authoring/hooks/use-authoring').useSaveQuestion('t')
  const variables = {
    questionId: 'q',
    operations: [
      { kind: 'text', language: 'fr', text: 'Accepted' },
      { kind: 'correctAnswer', correctAnswer: 'B' },
    ],
  }
  const context = await mutation.onMutate(variables)
  mutation.onError(Object.assign(Error(), { questionId: 'q', completedOperations: [variables.operations[0]] }), variables, context)
  assert.equal(h.client.getQueryData(key)[0].contents[0].text, 'Accepted')
  assert.equal(h.client.getQueryData(key)[0].correctAnswer, 'A')
})

test('load-more haptic occurs once when a request is accepted, never during a duplicate request', async () => {
  let vibrations = 0
  let requests = 0
  let resolve
  const deferred = new Promise((done) => {
    resolve = done
  })
  const h = harness({
    react: {
      createContext: () => ({ Provider: 'Provider' }),
      useRef: (current) => ({ current }),
      useState: (value) => [value, () => {}],
      useCallback: (fn) => fn,
      useMemo: (fn) => fn(),
      useEffect: () => {},
    },
    'react/jsx-runtime': require('react/jsx-runtime'),
    'react-native': { View: 'View', ScrollView: 'ScrollView' },
    'react-native-reanimated': { useSharedValue: (value) => ({ value }) },
    'expo-modules-core': { requireNativeViewManager: () => 'NativeView' },
    'react-native-collapsible-tabs-native': { createTabList: (view) => view },
    [path.join(root, 'design-system/haptics')]: { haptic: () => vibrations++ },
    [path.join(root, 'design-system/theme/theme-provider')]: { useTheme: () => ({ colors: {} }) },
    [path.join(root, 'design-system/mobile/tab-page')]: { withActivePageScrollsToTop: (view) => view },
    [path.join(root, 'design-system/mobile/scroll-refresh')]: { useScrollRefreshFeedback: (props) => props },
  })
  const { DragToLoadMore } = h.load('@/design-system/mobile/drag-to-load-more')
  const element = DragToLoadMore({
    enabled: true,
    loading: false,
    onLoadMore: () => {
      requests++
      return deferred
    },
    children: null,
  })
  const load = element.props.value.load
  load()
  load()
  assert.equal(vibrations, 1)
  assert.equal(requests, 1)
  // Leave the existing scheduler untouched outside this request's completion.
  const old = global.requestAnimationFrame
  global.requestAnimationFrame = (fn) => {
    fn()
    return 0
  }
  resolve()
  await new Promise((done) => setImmediate(done))
  global.requestAnimationFrame = old
})

test('haptic respects the app vibration setting', () => {
  let enabled = false
  let vibrations = 0
  const h = harness({
    'expo-haptics': {
      impactAsync: async () => {
        vibrations++
      },
      ImpactFeedbackStyle: { Light: 'light' },
    },
    [path.join(root, 'design-system/device-settings')]: { useDeviceSettings: { getState: () => ({ haptics: enabled }) } },
  })
  const { haptic } = h.load('@/design-system/haptics')
  haptic('light')
  assert.equal(vibrations, 0)
  enabled = true
  haptic('light')
  assert.equal(vibrations, 1)
})

test('archiving is reversible but deletion removes the question; both restore state on failure', async () => {
  const h = harness()
  const key = h.keys.authoring.questions('t')
  const questions = Array.from({ length: 7 }, (_, i) => ({ questionId: `q${i}`, status: 'APPROVED', suspended: false, archived: false }))
  h.client.setQueryData(key, questions)
  h.client.setQueryData(h.keys.authoring.topics(), { content: [topic('t')], totalElements: 1 })
  const hooks = h.load('@/features/authoring/hooks/use-authoring')
  const archive = hooks.useArchiveQuestion('t')
  const ctx = await archive.onMutate({ id: 'q0' })
  assert.equal(h.client.getQueryData(key)[0].status, 'ARCHIVED')
  assert.equal(h.client.getQueryData(h.keys.authoring.topics()).content[0].status, 'DRAFT')
  archive.onError(Error(), {}, ctx)
  assert.equal(h.client.getQueryData(key)[0].status, 'APPROVED')
  const remove = hooks.useDeleteQuestion('t')
  const deletion = await remove.onMutate('q0')
  assert.equal(h.client.getQueryData(key).length, 6)
  remove.onError(Error(), 'q0', deletion)
  assert.equal(h.client.getQueryData(key).length, 7)
  await archive.onMutate({ id: 'q0', restore: true })
  assert.equal(h.client.getQueryData(key)[0].status, 'PENDING')
})

test('editing rejected questions resubmits them, while suspended questions remain suspended', async () => {
  for (const status of ['REJECTED', 'SUSPENDED']) {
    const h = harness()
    const key = h.keys.authoring.questions('t')
    h.client.setQueryData(key, [{ questionId: 'q', status, contents: [{ language: 'fr', text: 'Before', answers: [] }] }])
    const save = h.load('@/features/authoring/hooks/use-authoring').useSaveQuestion('t')
    const vars = { questionId: 'q', operations: [{ kind: 'text', language: 'fr', text: 'After' }] }
    const ctx = await save.onMutate(vars)
    assert.equal(h.client.getQueryData(key)[0].status, status === 'REJECTED' ? 'PENDING' : 'SUSPENDED')
    save.onError(Error(), vars, ctx)
    assert.equal(h.client.getQueryData(key)[0].status, status)
  }
})

test('accepted challenge rooms remain reachable for both players, terminal rooms are excluded', () => {
  const h = harness()
  const { resumableRooms } = h.load('@/features/challenges/hooks/use-challenges')
  const rooms = ['WAITING_PLAYERS', 'FETCHING_QUESTIONS', 'CANCELLED', 'EXPIRED', 'FAILED', 'COMPLETED'].map((status, i) => ({
    roomId: String(i),
    status,
    vsBot: false,
    canCancel: false,
    opponent: { userId: 'other' },
  }))
  assert.deepEqual(
    resumableRooms(rooms).map((r) => r.roomId),
    ['0', '1'],
  )
})
