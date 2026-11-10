const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

// Domaine pur de l'atelier (`features/authoring/domain/authoring.ts`) : aucune dépendance native.
const file = path.resolve(__dirname, '../src/features/authoring/domain/authoring.ts')
const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const loaded = { exports: {} }
new Function('module', 'exports', 'require', source)(loaded, loaded.exports, () => ({}))
const domain = loaded.exports

const question = (overrides = {}) => ({
  questionId: 'q',
  creatorId: 'writer',
  contents: [
    {
      language: 'fr',
      text: 'En quelle année meurt Louis XIV ?',
      answers: [
        { choice: 'A', text: '1715' },
        { choice: 'B', text: '1714' },
        { choice: 'C', text: '1789' },
        { choice: 'D', text: '1815' },
      ],
    },
  ],
  correctAnswer: 'A',
  imageUrl: null,
  status: 'APPROVED',
  suspended: false,
  archived: false,
  openReportCount: 0,
  totalReportCount: 0,
  lastReportedAt: null,
  createdAt: '2026-11-01T10:00:00Z',
  updatedAt: null,
  ...overrides,
})

test('role matrix: managers archive, restore and delete; writers only their own pending or rejected questions', () => {
  assert.deepEqual(domain.questionActions('creator', question(), 'creator'), ['archive', 'delete'])
  assert.deepEqual(domain.questionActions('admin', question({ status: 'ARCHIVED' }), 'admin'), ['restore', 'delete'])
  assert.deepEqual(domain.questionActions('writer', question({ status: 'PENDING' }), 'writer'), ['archive', 'delete'])
  assert.deepEqual(domain.questionActions('writer', question({ status: 'REJECTED' }), 'writer'), ['archive', 'delete'])
  assert.deepEqual(domain.questionActions('writer', question({ status: 'APPROVED' }), 'writer'), [])
  assert.deepEqual(domain.questionActions('writer', question({ status: 'PENDING' }), 'someone-else'), [])
  assert.deepEqual(domain.questionActions('writer', question({ status: 'ARCHIVED' }), 'writer'), [])
})

test('workshop role follows permissions: creator, Premium admin, otherwise writer', () => {
  assert.equal(domain.workshopRole({ role: 'CREATOR', canManage: true }), 'creator')
  assert.equal(domain.workshopRole({ role: 'ADMIN', canManage: true }), 'admin')
  assert.equal(domain.workshopRole({ role: 'ADMIN', canManage: false }), 'writer')
  assert.equal(domain.workshopRole(undefined), 'writer')
})

test('question sorts: recent, most reported, oldest, alphabetical', () => {
  const a = question({ questionId: 'a', createdAt: '2026-11-01T00:00:00Z', openReportCount: 0, contents: [{ language: 'fr', text: 'Zèbre ?', answers: [] }] })
  const b = question({ questionId: 'b', createdAt: '2026-11-03T00:00:00Z', openReportCount: 2, contents: [{ language: 'fr', text: 'Abeille ?', answers: [] }] })
  const c = question({
    questionId: 'c',
    createdAt: '2026-11-02T00:00:00Z',
    openReportCount: 5,
    contents: [{ language: 'fr', text: 'Éléphant ?', answers: [] }],
  })
  const ids = (list) => list.map((item) => item.questionId)
  assert.deepEqual(ids(domain.sortQuestions([a, b, c], 'Plus récentes')), ['b', 'c', 'a'])
  assert.deepEqual(ids(domain.sortQuestions([a, b, c], 'Plus signalées')), ['c', 'b', 'a'])
  assert.deepEqual(ids(domain.sortQuestions([a, b, c], 'Plus anciennes')), ['a', 'c', 'b'])
  assert.deepEqual(ids(domain.sortQuestions([a, b, c], 'Ordre alphabétique')), ['b', 'c', 'a'])
})

test('reported content differs only when text, answers or the correct answer changed', () => {
  const same = {
    questionText: 'En quelle année meurt Louis XIV ?',
    imageUrl: null,
    answers: question().contents[0].answers,
    correctAnswer: 'A',
    language: 'fr',
  }
  assert.equal(domain.snapshotDiffers(question(), same), false)
  assert.equal(domain.snapshotDiffers(question(), { ...same, correctAnswer: 'B' }), true)
  assert.equal(domain.snapshotDiffers(question(), { ...same, answers: [{ choice: 'A', text: '1714' }, ...same.answers.slice(1)] }), true)
  assert.equal(domain.snapshotDiffers(question(), null), false)
})

test('reason counts sort reasons from most to least cited; todo total ignores suspended', () => {
  const reports = [{ reasons: ['ANSWERS'] }, { reasons: ['ANSWERS', 'QUESTION'] }]
  assert.deepEqual(domain.reasonCounts(reports), [
    ['ANSWERS', 2],
    ['QUESTION', 1],
  ])
  assert.equal(domain.todoTotal({ topicId: 't', pending: 4, reportedQuestions: 2, suspended: 1 }), 6)
  assert.equal(domain.todoTotal(undefined), 0)
})
