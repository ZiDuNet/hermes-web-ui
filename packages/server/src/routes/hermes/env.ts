import Router from '@koa/router'
import { readFile, writeFile } from 'fs/promises'
import { chmod } from 'fs/promises'
import { resolve } from 'path'
import { getActiveEnvPath } from '../../services/hermes/hermes-profile'

const sharedDir = resolve(__dirname, '../../shared')
const envPath = () => getActiveEnvPath()

function parseEnv(raw: string): Record<string, string> {
  const env: Record<string, string> = {}
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim()
    if (val) env[key] = val
  }
  return env
}

async function saveEnvValue(key: string, value: string): Promise<void> {
  let raw: string
  try {
    raw = await readFile(envPath(), 'utf-8')
  } catch {
    raw = ''
  }

  const remove = !value
  const lines = raw.split('\n')
  let found = false
  const result: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('#')) {
      if (trimmed.startsWith(`# ${key}=`)) {
        if (!remove) {
          result.push(`${key}=${value}`)
        }
        found = true
      } else {
        result.push(line)
      }
    } else {
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx !== -1 && trimmed.slice(0, eqIdx).trim() === key) {
        if (!remove) {
          result.push(`${key}=${value}`)
        }
        found = true
      } else {
        result.push(line)
      }
    }
  }

  if (!found && !remove) {
    result.push(`${key}=${value}`)
  }

  let output = result.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\n+$/, '') + '\n'
  await writeFile(envPath(), output, 'utf-8')
  try { await chmod(envPath(), 0o600) } catch { /* ignore */ }
}

function maskValue(val: string): string {
  if (val.length <= 8) return '...'
  return val.slice(0, 4) + '...' + val.slice(-4)
}

// Rate limiter for reveal: 5 requests per 30 seconds per IP
const revealLimiter = new Map<string, number[]>()
function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const window = 30_000
  const maxRequests = 5

  let timestamps = revealLimiter.get(ip) || []
  timestamps = timestamps.filter(t => now - t < window)
  if (timestamps.length >= maxRequests) return false
  timestamps.push(now)
  revealLimiter.set(ip, timestamps)
  return true
}

// Load env var definitions from shared JSON (cached)
let envVarsCache: Record<string, any> | null = null
async function getEnvVarDefs(): Promise<Record<string, any>> {
  if (envVarsCache) return envVarsCache
  const raw = await readFile(resolve(sharedDir, 'hermes-env-vars.json'), 'utf-8')
  envVarsCache = JSON.parse(raw)
  return envVarsCache!
}

export const envRoutes = new Router()

// GET /api/hermes/env — list all env vars with metadata + masked values
envRoutes.get('/api/hermes/env', async (ctx) => {
  try {
    const defs = await getEnvVarDefs()
    let raw: string
    try {
      raw = await readFile(envPath(), 'utf-8')
    } catch {
      raw = ''
    }
    const envValues = parseEnv(raw)

    const vars: Record<string, any> = {}
    for (const [key, meta] of Object.entries(defs)) {
      const val = envValues[key] || ''
      vars[key] = {
        ...(meta as Record<string, any>),
        key,
        value: val,
        masked: val ? maskValue(val) : '',
        set: !!val,
      }
    }
    ctx.body = { vars }
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: err.message }
  }
})

// PUT /api/hermes/env — set an env var { key, value }
envRoutes.put('/api/hermes/env', async (ctx) => {
  const { key, value } = ctx.request.body as { key?: string; value?: string }
  if (!key) {
    ctx.status = 400
    ctx.body = { error: 'Missing key' }
    return
  }
  try {
    await saveEnvValue(key, value ?? '')
    ctx.body = { success: true }
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: err.message }
  }
})

// DELETE /api/hermes/env — delete an env var { key }
envRoutes.delete('/api/hermes/env', async (ctx) => {
  const { key } = ctx.request.body as { key?: string }
  if (!key) {
    ctx.status = 400
    ctx.body = { error: 'Missing key' }
    return
  }
  try {
    let raw: string
    try {
      raw = await readFile(envPath(), 'utf-8')
    } catch {
      raw = ''
    }
    const envValues = parseEnv(raw)
    if (!envValues[key]) {
      ctx.status = 404
      ctx.body = { error: `Key not found: ${key}` }
      return
    }
    await saveEnvValue(key, '')
    ctx.body = { success: true }
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: err.message }
  }
})

// POST /api/hermes/env/reveal — reveal real value for a key (rate limited)
envRoutes.post('/api/hermes/env/reveal', async (ctx) => {
  const { key } = ctx.request.body as { key?: string }
  if (!key) {
    ctx.status = 400
    ctx.body = { error: 'Missing key' }
    return
  }

  const ip = ctx.ip
  if (!checkRateLimit(ip)) {
    ctx.status = 429
    ctx.body = { error: 'Rate limit exceeded. Max 5 reveals per 30 seconds.' }
    return
  }

  try {
    let raw: string
    try {
      raw = await readFile(envPath(), 'utf-8')
    } catch {
      raw = ''
    }
    const envValues = parseEnv(raw)
    const val = envValues[key]
    ctx.body = { value: val || '' }
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: err.message }
  }
})
