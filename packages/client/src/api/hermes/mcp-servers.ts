import { request } from '../client'

export interface McpServerConfig {
  command?: string
  args?: string[]
  url?: string
  headers?: Record<string, string>
  env?: Record<string, string>
  enabled?: boolean
  timeout?: number
}

export async function fetchMcpServers(): Promise<Record<string, McpServerConfig>> {
  const res = await request<{ servers: Record<string, McpServerConfig> }>('/api/hermes/mcp-servers')
  return res.servers
}

export async function addMcpServer(name: string, config: McpServerConfig): Promise<void> {
  await request('/api/hermes/mcp-servers', {
    method: 'POST',
    body: JSON.stringify({ name, config }),
  })
}

export async function updateMcpServer(name: string, config: McpServerConfig): Promise<void> {
  await request('/api/hermes/mcp-servers', {
    method: 'PUT',
    body: JSON.stringify({ name, config }),
  })
}

export async function deleteMcpServer(name: string): Promise<void> {
  await request('/api/hermes/mcp-servers', {
    method: 'DELETE',
    body: JSON.stringify({ name }),
  })
}
