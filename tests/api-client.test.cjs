const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')

class LocalFormData {
  parts = []
  append(name, value) {
    this.parts.push([name, value])
  }
  entries() {
    return this.parts[Symbol.iterator]()
  }
}

async function withTransport(run, statuses = [201]) {
  const before = { FormData: global.FormData, XMLHttpRequest: global.XMLHttpRequest, fetch: global.fetch }
  const requests = [],
    jsonCalls = []
  global.FormData = LocalFormData
  global.fetch = async (...args) => {
    jsonCalls.push(args)
    return { ok: true, status: 204 }
  }
  global.XMLHttpRequest = class {
    headers = {}
    open(method, url) {
      this.method = method
      this.url = url
    }
    setRequestHeader(name, value) {
      this.headers[name.toLowerCase()] = value
    }
    getAllResponseHeaders() {
      return 'content-type: application/json\r\n'
    }
    send(body) {
      requests.push({ method: this.method, url: this.url, headers: this.headers, body })
      this.status = statuses.shift() ?? 201
      this.statusText = this.status === 201 ? 'Created' : 'Unauthorized'
      this.responseText = JSON.stringify(this.status === 201 ? { url: 'https://media.example/banner.jpg' } : { message: 'expired', statusCode: 401 })
      this.onload()
    }
  }
  try {
    const code = ts.transpileModule(fs.readFileSync(require.resolve('../src/lib/api-client.ts'), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText
    const module = { exports: {} }
    new Function('require', 'module', 'exports', code)(require, module, module.exports)
    await run(module.exports.createApiClient, requests, jsonCalls)
  } finally {
    Object.assign(global, before)
  }
}

const form = () => {
  const data = new FormData()
  data.append('file', { uri: 'file:///cache/banner.jpg', name: 'banner.jpg', type: 'image/jpeg' })
  return data
}

test('local-file multipart uses the actual XHR transport and keeps the native file part', () =>
  withTransport(async (createClient, requests, jsonCalls) => {
    const client = createClient({ baseUrl: 'https://api.example', getAuthToken: () => 'test-token' })
    const body = form()
    assert.deepEqual(await client.post('/api/media', body), { url: 'https://media.example/banner.jpg' })
    assert.equal(jsonCalls.length, 0)
    assert.equal(requests.length, 1)
    assert.equal(requests[0].body, body)
    assert.equal(requests[0].body.parts[0][1].uri, 'file:///cache/banner.jpg')
    assert.equal(requests[0].headers.authorization, 'Bearer test-token')
    assert.equal(requests[0].headers['content-type'], undefined)
  }))

test('multipart authentication refresh retries the same file through the same transport', () =>
  withTransport(
    async (createClient, requests) => {
      let refreshed = false
      const client = createClient({
        baseUrl: 'https://api.example',
        getAuthToken: () => (refreshed ? 'new-token' : 'old-token'),
        onUnauthorized: async () => {
          refreshed = true
          return true
        },
      })
      await client.post('/api/media', form())
      assert.equal(requests.length, 2)
      assert.equal(requests[0].body, requests[1].body)
      assert.equal(requests[1].headers.authorization, 'Bearer new-token')
    },
    [401, 201],
  ))

test('JSON keeps the default fetch and JSON serialization', () =>
  withTransport(async (createClient, requests, jsonCalls) => {
    const client = createClient({ baseUrl: 'https://api.example' })
    await client.put('/profile/banner', { bannerUrl: 'https://media.example/banner.jpg' })
    assert.equal(requests.length, 0)
    assert.equal(jsonCalls.length, 1)
    assert.equal(jsonCalls[0][1].headers['Content-Type'], 'application/json')
    assert.equal(jsonCalls[0][1].body, JSON.stringify({ bannerUrl: 'https://media.example/banner.jpg' }))
  }))
