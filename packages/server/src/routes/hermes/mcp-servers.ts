import Router from '@koa/router'
import { readFile, writeFile, copyFile } from 'fs/promises'
import YAML from 'js-yaml'
import { getActiveConfigPath } from '../../services/hermes/hermes-profile'

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

export const mcpServerRoutes = new Router()

// GET /api/hermes/mcp-servers — 列出所有 MCP 服务器
mcpServerRoutes.get('/api/hermes/mcp-servers', async (ctx) => {
  try {
    const config = await readConfig()
    const servers = config.mcp_servers || {}
    ctx.body = { servers }
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: err.message }
  }
})

// POST /api/hermes/mcp-servers — 添加服务器
mcpServerRoutes.post('/api/hermes/mcp-servers', async (ctx) => {
  const { name, config: serverConfig } = ctx.request.body as {
    name?: string
    config?: Record<string, any>
  }
  if (!name || !name.trim()) {
    ctx.status = 400
    ctx.body = { error: 'Server name is required' }
    return
  }
  if (!serverConfig) {
    ctx.status = 400
    ctx.body = { error: 'Server config is required' }
    return
  }

  try {
    const config = await readConfig()
    const servers = config.mcp_servers || {}
    const key = name.trim()

    if (servers[key]) {
      ctx.status = 409
      ctx.body = { error: `Server "${key}" already exists` }
      return
    }

    servers[key] = serverConfig
    config.mcp_servers = servers
    await writeConfig(config)
    ctx.body = { success: true }
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: err.message }
  }
})

// PUT /api/hermes/mcp-servers — 更新服务器
mcpServerRoutes.put('/api/hermes/mcp-servers', async (ctx) => {
  const { name, config: serverConfig } = ctx.request.body as {
    name?: string
    config?: Record<string, any>
  }
  if (!name || !name.trim()) {
    ctx.status = 400
    ctx.body = { error: 'Server name is required' }
    return
  }
  if (!serverConfig) {
    ctx.status = 400
    ctx.body = { error: 'Server config is required' }
    return
  }

  try {
    const config = await readConfig()
    const servers = config.mcp_servers || {}
    const key = name.trim()

    if (!servers[key]) {
      ctx.status = 404
      ctx.body = { error: `Server "${key}" not found` }
      return
    }

    servers[key] = serverConfig
    config.mcp_servers = servers
    await writeConfig(config)
    ctx.body = { success: true }
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: err.message }
  }
})

// DELETE /api/hermes/mcp-servers — 删除服务器
mcpServerRoutes.delete('/api/hermes/mcp-servers', async (ctx) => {
  const { name } = ctx.request.body as { name?: string }
  if (!name || !name.trim()) {
    ctx.status = 400
    ctx.body = { error: 'Server name is required' }
    return
  }

  try {
    const config = await readConfig()
    const servers = config.mcp_servers || {}
    const key = name.trim()

    if (!servers[key]) {
      ctx.status = 404
      ctx.body = { error: `Server "${key}" not found` }
      return
    }

    delete servers[key]
    config.mcp_servers = servers
    await writeConfig(config)
    ctx.body = { success: true }
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: err.message }
  }
})
