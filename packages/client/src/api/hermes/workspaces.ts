import { request, getBaseUrlValue, getApiKey } from '../client'

export interface WorkspaceEntry {
  path: string
  name: string
}

export interface WorkspacesResponse {
  workspaces: WorkspaceEntry[]
  last: string
}

export interface FileEntry {
  name: string
  path: string
  type: 'dir' | 'file'
  size: number | null
}

export interface FileContent {
  path: string
  content: string
  size: number
  lines: number
  binary?: boolean
}

export async function fetchWorkspaces(): Promise<WorkspacesResponse> {
  return request<WorkspacesResponse>('/api/hermes/workspaces')
}

export async function addWorkspace(path: string): Promise<WorkspacesResponse> {
  return request<WorkspacesResponse>('/api/hermes/workspaces/add', {
    method: 'POST',
    body: JSON.stringify({ path }),
  })
}

export async function removeWorkspace(path: string): Promise<WorkspacesResponse> {
  return request<WorkspacesResponse>('/api/hermes/workspaces/remove', {
    method: 'POST',
    body: JSON.stringify({ path }),
  })
}

export async function switchWorkspace(sessionId: string, workspace: string, model?: string): Promise<void> {
  await request('/api/hermes/session/workspace', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, workspace, model }),
  })
}

export async function listDir(workspace: string, path: string = '.'): Promise<{ entries: FileEntry[] }> {
  const params = new URLSearchParams({ workspace, path })
  return request(`/api/hermes/workspace/ls?${params}`)
}

export async function readFile(workspace: string, path: string): Promise<FileContent> {
  const params = new URLSearchParams({ workspace, path })
  return request(`/api/hermes/workspace/file?${params}`)
}

export function getRawFileUrl(workspace: string, path: string, download = false): string {
  const baseUrl = getBaseUrlValue()
  const token = getApiKey()
  const params = new URLSearchParams({ workspace, path })
  if (download) params.set('download', '1')
  const auth = token ? `&token=${encodeURIComponent(token)}` : ''
  return `${baseUrl}/api/hermes/workspace/file/raw?${params}${auth}`
}

export async function saveFile(workspace: string, path: string, content: string): Promise<void> {
  await request('/api/hermes/workspace/file/save', {
    method: 'POST',
    body: JSON.stringify({ workspace, path, content }),
  })
}

export async function createFile(workspace: string, path: string): Promise<void> {
  await request('/api/hermes/workspace/file/create', {
    method: 'POST',
    body: JSON.stringify({ workspace, path }),
  })
}

export async function createDir(workspace: string, path: string): Promise<void> {
  await request('/api/hermes/workspace/file/mkdir', {
    method: 'POST',
    body: JSON.stringify({ workspace, path }),
  })
}
