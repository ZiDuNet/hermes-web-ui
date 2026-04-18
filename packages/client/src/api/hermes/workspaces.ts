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

// Browse directories (for workspace browser)
export async function browseDir(path?: string): Promise<{ path: string; entries: { name: string; path: string }[]; parent: string | null }> {
  const params = new URLSearchParams()
  if (path) params.set('path', path)
  return request(`/api/hermes/workspace/browse?${params}`)
}

// Create directory via browser
export async function browseMkdir(path: string, name: string): Promise<{ ok: boolean; path: string }> {
  return request('/api/hermes/workspace/browse/mkdir', {
    method: 'POST',
    body: JSON.stringify({ path, name }),
  })
}

// Upload files to workspace
export async function uploadFiles(workspace: string, path: string, files: File[]): Promise<{ files: { name: string; path: string }[] }> {
  const base = getBaseUrlValue()
  const token = getApiKey()
  const formData = new FormData()
  formData.append('workspace', workspace)
  formData.append('path', path)
  files.forEach(f => formData.append('files', f))

  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${base}/api/hermes/workspace/file/upload`, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText))
  return res.json()
}

// Delete file or directory
export async function deleteEntry(workspace: string, path: string): Promise<void> {
  await request('/api/hermes/workspace/file/delete', {
    method: 'POST',
    body: JSON.stringify({ workspace, path }),
  })
}

// Rename file or directory
export async function renameEntry(workspace: string, path: string, newName: string): Promise<{ newPath: string }> {
  return request('/api/hermes/workspace/file/rename', {
    method: 'POST',
    body: JSON.stringify({ workspace, path, newName }),
  })
}

// Git status
export interface GitStatus {
  git: boolean
  branch?: string
  modified?: number
  untracked?: number
  staged?: number
  ahead?: number
  behind?: number
}

export async function fetchGitStatus(workspace: string, path: string = '.'): Promise<GitStatus> {
  const params = new URLSearchParams({ workspace, path })
  return request(`/api/hermes/workspace/git?${params}`)
}
