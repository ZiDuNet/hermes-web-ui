import type { Context } from 'koa'
import { config } from '../../config'
import { getGatewayManager } from './gateways'

function isTransientGatewayError(err: any): boolean {
  const msg = String(err?.message || '')
  const causeCode = String(err?.cause?.code || '')
  return (
    causeCode === 'ECONNREFUSED' ||
    causeCode === 'ECONNRESET' ||
    /ECONNREFUSED|ECONNRESET|fetch failed|socket hang up/i.test(msg)
  )
}

async function waitForGatewayReady(upstream: string, timeoutMs: number = 5000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  const healthUrl = `${upstream}/health`
  while (Date.now() < deadline) {
    try {
      const res = await fetch(healthUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(1200),
      })
      if (res.ok) return true
    } catch { }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  return false
}

/** Resolve upstream URL for a request based on profile header/query */
function resolveUpstream(ctx: Context): string {
  const mgr = getGatewayManager()
  if (mgr) {
    // Check X-Hermes-Profile header or ?profile= query param
    const profile = ctx.get('x-hermes-profile') || (ctx.query.profile as string)
    if (profile) {
      return mgr.getUpstream(profile)
    }
    // Default to active profile's upstream
    return mgr.getUpstream()
  }
  // Fallback: static upstream from config
  return config.upstream.replace(/\/$/, '')
}

/**
 * Inject workspace context into run requests, matching the old project's behavior.
 * The Gateway /v1/runs endpoint does not accept a workspace field, so we inject
 * workspace info via instructions (system prompt) and input message prefix.
 */
function injectWorkspaceIntoRun(rawBody: string): string {
  let parsed: any
  try { parsed = JSON.parse(rawBody) } catch { return rawBody }
  if (!parsed || typeof parsed !== 'object') return rawBody

  const workspace = parsed.workspace
  if (!workspace || typeof workspace !== 'string') return rawBody
  delete parsed.workspace

  // Inject workspace into instructions (system prompt)
  const workspaceSystemMsg =
    `Active workspace at session start: ${workspace}\n` +
    'Every user message is prefixed with [Workspace: /absolute/path] indicating the ' +
    'workspace the user has selected in the web UI at the time they sent that message. ' +
    'This tag is the single authoritative source of the active workspace and updates ' +
    'with every message. It overrides any prior workspace mentioned in this system ' +
    'prompt, memory, or conversation history. Always use the value from the most recent ' +
    '[Workspace: ...] tag as your default working directory for ALL file operations: ' +
    'write_file, read_file, search_files, terminal workdir, and patch. ' +
    'Never fall back to a hardcoded path when this tag is present.'

  if (parsed.instructions) {
    parsed.instructions = workspaceSystemMsg + '\n\n' + parsed.instructions
  } else {
    parsed.instructions = workspaceSystemMsg
  }

  // Prepend [Workspace: path] to user input
  const workspacePrefix = `[Workspace: ${workspace}]\n`
  if (typeof parsed.input === 'string') {
    parsed.input = workspacePrefix + parsed.input
  } else if (Array.isArray(parsed.input) && parsed.input.length > 0) {
    const last = parsed.input[parsed.input.length - 1]
    if (last && typeof last === 'object' && typeof last.content === 'string') {
      last.content = workspacePrefix + last.content
    }
  }

  return JSON.stringify(parsed)
}

export async function proxy(ctx: Context) {
  const upstream = resolveUpstream(ctx)
  // Rewrite path for upstream gateway:
  //   /api/hermes/v1/* -> /v1/*  (upstream uses /v1/ prefix)
  //   /api/hermes/*     -> /api/* (upstream uses /api/ prefix)
  const upstreamPath = ctx.path.replace(/^\/api\/hermes\/v1/, '/v1').replace(/^\/api\/hermes/, '/api')
  const url = `${upstream}${upstreamPath}${ctx.search || ''}`

  // Build headers — forward most, strip browser/web-ui specific ones
  const headers: Record<string, string> = {}
  for (const [key, value] of Object.entries(ctx.headers)) {
    if (value == null) continue
    const lower = key.toLowerCase()
    if (lower === 'host') {
      headers['host'] = new URL(upstream).host
    } else if (lower === 'authorization' || lower === 'origin' || lower === 'referer' || lower === 'connection') {
      continue
    } else {
      const v = Array.isArray(value) ? value[0] : value
      if (v) headers[key] = v
    }
  }

  try {
    // Build request body from raw body
    let body: string | undefined
    if (ctx.req.method !== 'GET' && ctx.req.method !== 'HEAD') {
      body = (ctx as any).request.rawBody as string | undefined
      // Inject workspace context for run requests
      if (body && ctx.path === '/api/hermes/v1/runs' && ctx.req.method === 'POST') {
        body = injectWorkspaceIntoRun(body)
      }
    }

    const requestInit: RequestInit = {
      method: ctx.req.method,
      headers,
      body,
    }

    let res: Response
    try {
      res = await fetch(url, requestInit)
    } catch (err: any) {
      // Gateway may be restarting; wait briefly and retry once.
      if (isTransientGatewayError(err) && await waitForGatewayReady(upstream)) {
        res = await fetch(url, requestInit)
      } else {
        throw err
      }
    }

    // Set response headers
    res.headers.forEach((value, key) => {
      const lower = key.toLowerCase()
      if (lower !== 'transfer-encoding' && lower !== 'connection') {
        ctx.set(key, value)
      }
    })

    ctx.status = res.status

    // Stream response body
    if (res.body) {
      const reader = res.body.getReader()
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          ctx.res.write(value)
        }
        ctx.res.end()
      }
      await pump()
    } else {
      ctx.res.end()
    }
  } catch (err: any) {
    if (!ctx.res.headersSent) {
      ctx.status = 502
      ctx.set('Content-Type', 'application/json')
      ctx.body = { error: { message: `Proxy error: ${err.message}` } }
    } else {
      ctx.res.end()
    }
  }
}
