/**
 * API client — thin wrappers around fetch for all backend endpoints.
 * Exported as ES module; imported by main.js.
 */

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = typeof window !== 'undefined' ? window.sessionStorage.getItem('promptforge_api_token') : ''
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const opts = {
    method,
    headers,
  }
  if (body !== undefined) opts.body = JSON.stringify(body)

  const res = await fetch(path, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

// ── Prompts ──────────────────────────────────────────────────────────────────
export const promptsApi = {
  list:   (params = {}) => request('GET', `/api/prompts?${new URLSearchParams(params)}`),
  get:    id            => request('GET', `/api/prompts/${id}`),
  create: body          => request('POST', '/api/prompts', body),
  update: (id, body)    => request('PUT',  `/api/prompts/${id}`, body),
  delete: id            => request('DELETE', `/api/prompts/${id}`),
}

// ── Templates ────────────────────────────────────────────────────────────────
export const templatesApi = {
  list:   (params = {}) => request('GET', `/api/templates?${new URLSearchParams(params)}`),
  get:    id            => request('GET', `/api/templates/${id}`),
  create: body          => request('POST', '/api/templates', body),
  update: (id, body)    => request('PUT',  `/api/templates/${id}`, body),
  delete: id            => request('DELETE', `/api/templates/${id}`),
}

// ── Roles ─────────────────────────────────────────────────────────────────────
export const rolesApi = {
  list:   (params = {}) => request('GET', `/api/roles?${new URLSearchParams(params)}`),
  get:    id            => request('GET', `/api/roles/${id}`),
  create: body          => request('POST', '/api/roles', body),
  delete: id            => request('DELETE', `/api/roles/${id}`),
}

// ── Personas ─────────────────────────────────────────────────────────────────
export const personasApi = {
  list:   ()           => request('GET', '/api/personas'),
  get:    id           => request('GET', `/api/personas/${id}`),
  create: body         => request('POST', '/api/personas', body),
  update: (id, body)   => request('PUT',  `/api/personas/${id}`, body),
  delete: id           => request('DELETE', `/api/personas/${id}`),
}

// ── AI ───────────────────────────────────────────────────────────────────────
export const aiApi = {
  /**
   * Streams generate response as SSE.
   * Calls onDelta(text) for each token, onComplete(payload) when done.
   * Returns the abort controller so callers can cancel.
   */
  async generateStream(config, { onDelta, onComplete, onError }) {
    const controller = new AbortController()

    try {
      const res = await fetch('/api/ai/generate', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(window.sessionStorage.getItem('promptforge_api_token')
            ? { Authorization: `Bearer ${window.sessionStorage.getItem('promptforge_api_token')}` }
            : {}),
        },
        body:    JSON.stringify(config),
        signal:  controller.signal,
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer    = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') return

          const msg = JSON.parse(raw)
          if (msg.type === 'delta')    onDelta(msg.text)
          if (msg.type === 'complete') onComplete(msg)
          if (msg.type === 'error')    onError(new Error(msg.message))
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') onError(err)
    }

    return controller
  },

  enhance: taskDescription => request('POST', '/api/ai/enhance', { taskDescription }),
}
