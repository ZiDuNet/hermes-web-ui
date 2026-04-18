import Router from '@koa/router'
import { readFile, writeFile, copyFile } from 'fs/promises'
import { resolve } from 'path'
import YAML from 'js-yaml'
import { getActiveConfigPath } from '../../services/hermes/hermes-profile'
import { getGatewayManager } from './gateways'

const configPath = () => getActiveConfigPath()

async function readConfig(): Promise<Record<string, any>> {
  const raw = await readFile(configPath(), 'utf-8')
  return (YAML.load(raw) as Record<string, any>) || {}
}

async function writeConfig(data: Record<string, any>): Promise<void> {
  const cp = configPath()
  await copyFile(cp, cp + '.bak')
  const yamlStr = YAML.dump(data, {
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
  })
  await writeFile(cp, yamlStr, 'utf-8')
}

/**
 * Normalize config for web UI:
 * - model: dict { name, context_length } → flat string + model_context_length
 */
function normalizeConfig(config: Record<string, any>): Record<string, any> {
  const result = { ...config }
  const model = result.model
  if (model && typeof model === 'object' && !Array.isArray(model)) {
    const ctxLen = model.context_length || 0
    // Match hermes-agent: prefer "default", fallback to "name"
    result.model = model.default || model.name || ''
    result.model_context_length = typeof ctxLen === 'number' ? ctxLen : 0
  }
  return result
}

/**
 * Denormalize config for saving:
 * - model: flat string + model_context_length → dict { name, context_length }
 * Preserves other model sub-fields from disk config.
 */
function denormalizeConfig(flat: Record<string, any>, disk: Record<string, any>): Record<string, any> {
  const result = { ...flat }
  const diskModel = disk.model

  if (diskModel && typeof diskModel === 'object' && !Array.isArray(diskModel)) {
    const modelDict: Record<string, any> = { ...diskModel }
    if (result.model !== undefined) {
      modelDict.default = result.model
    }
    const ctxOverride = result.model_context_length
    if (ctxOverride !== undefined) {
      if (typeof ctxOverride === 'number' && ctxOverride > 0) {
        modelDict.context_length = ctxOverride
      } else {
        delete modelDict.context_length
      }
    }
    result.model = modelDict
  }

  return result
}

export const hermesConfigRoutes = new Router()

// GET /api/hermes/hermes-config — read full normalized config
hermesConfigRoutes.get('/api/hermes/hermes-config', async (ctx) => {
  try {
    const config = await readConfig()
    ctx.body = { config: normalizeConfig(config) }
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: err.message }
  }
})

// PUT /api/hermes/hermes-config — save full config (denormalize before writing)
hermesConfigRoutes.put('/api/hermes/hermes-config', async (ctx) => {
  const { config: flatConfig } = ctx.request.body as { config?: Record<string, any> }
  if (!flatConfig) {
    ctx.status = 400
    ctx.body = { error: 'Missing config' }
    return
  }
  try {
    const diskConfig = await readConfig()
    const denormConfig = denormalizeConfig(flatConfig, diskConfig)
    await writeConfig(denormConfig)
    ctx.body = { success: true }
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: err.message }
  }
})

// GET /api/hermes/hermes-config/defaults — 从 Gateway 获取
hermesConfigRoutes.get('/api/hermes/hermes-config/defaults', async (ctx) => {
  try {
    const mgr = getGatewayManager()
    const upstream = mgr ? mgr.getUpstream() : 'http://127.0.0.1:8642'
    const res = await fetch(`${upstream}/api/config/defaults`, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error(`Gateway returned ${res.status}`)
    ctx.body = await res.json()
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: err.message }
  }
})

// GET /api/hermes/hermes-config/schema — 从 Gateway 获取
hermesConfigRoutes.get('/api/hermes/hermes-config/schema', async (ctx) => {
  try {
    const mgr = getGatewayManager()
    const upstream = mgr ? mgr.getUpstream() : 'http://127.0.0.1:8642'
    const res = await fetch(`${upstream}/api/config/schema`, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error(`Gateway returned ${res.status}`)
    ctx.body = await res.json()
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: err.message }
  }
})

// GET /api/hermes/hermes-config/raw — read raw YAML string
hermesConfigRoutes.get('/api/hermes/hermes-config/raw', async (ctx) => {
  try {
    const raw = await readFile(configPath(), 'utf-8')
    ctx.body = { raw }
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: err.message }
  }
})

// PUT /api/hermes/hermes-config/raw — save raw YAML string
hermesConfigRoutes.put('/api/hermes/hermes-config/raw', async (ctx) => {
  const { raw } = ctx.request.body as { raw?: string }
  if (!raw) {
    ctx.status = 400
    ctx.body = { error: 'Missing raw YAML' }
    return
  }
  try {
    YAML.load(raw)
    const cp = configPath()
    await copyFile(cp, cp + '.bak')
    await writeFile(cp, raw, 'utf-8')
    ctx.body = { success: true }
  } catch (err: any) {
    ctx.status = 400
    ctx.body = { error: `Invalid YAML: ${err.message}` }
  }
})
