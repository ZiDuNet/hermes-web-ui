import Router from '@koa/router'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, createReadStream, rmSync, renameSync } from 'fs'
import { execSync } from 'child_process'
import { resolve, join, extname, basename, relative, dirname } from 'path'
import { homedir } from 'os'
import { createReadStream as fsCreateReadStream } from 'fs'
import { randomBytes } from 'crypto'
import { config } from '../../config'

export const workspaceRoutes = new Router()

const WORKSPACES_FILE = resolve(config.dataDir, 'workspaces.json')
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

const BLOCKED_ROOTS = [
  '/etc', '/usr', '/var', '/bin', '/sbin',
  '/boot', '/proc', '/sys', '/dev',
  '/lib', '/lib64',
]
const isWindows = process.platform === 'win32'

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp'])
const MD_EXTS = new Set(['.md', '.markdown'])
const BINARY_EXTS = new Set([
  '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.pdf',
  '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
  '.mp3', '.mp4', '.wav', '.m4a', '.ogg', '.flac',
  '.exe', '.dmg', '.dll', '.so', '.dylib',
  '.woff', '.woff2', '.ttf', '.otf',
  '.bin', '.dat', '.db', '.sqlite', '.pyc',
])

interface WorkspaceEntry {
  path: string
  name: string
}

function loadWorkspaces(): WorkspaceEntry[] {
  try {
    if (!existsSync(WORKSPACES_FILE)) return getDefaultWorkspaces()
    const raw = readFileSync(WORKSPACES_FILE, 'utf-8')
    const list: WorkspaceEntry[] = JSON.parse(raw)
    return list.filter(w => existsSync(w.path))
  } catch {
    return getDefaultWorkspaces()
  }
}

function saveWorkspaces(list: WorkspaceEntry[]) {
  mkdirSync(config.dataDir, { recursive: true, mode: 0o755 })
  writeFileSync(WORKSPACES_FILE, JSON.stringify(list, null, 2), 'utf-8')
}

function getDefaultWorkspaces(): WorkspaceEntry[] {
  const ws = join(homedir(), 'workspace')
  // Ensure default workspace dir exists
  if (!existsSync(ws)) mkdirSync(ws, { recursive: true, mode: 0o755 })
  return [{ path: ws, name: 'workspace' }]
}

function validatePath(p: string): { valid: boolean; resolved?: string; error?: string } {
  if (!p || typeof p !== 'string') return { valid: false, error: 'Path is required' }
  const resolved = resolve(p)
  if (!isWindows) {
    for (const blocked of BLOCKED_ROOTS) {
      if (resolved === blocked || resolved.startsWith(blocked + '/')) {
        return { valid: false, error: `System directory not allowed: ${resolved}` }
      }
    }
  }
  if (!existsSync(resolved)) {
    try {
      mkdirSync(resolved, { recursive: true, mode: 0o755 })
    } catch {
      return { valid: false, error: `Failed to create directory: ${resolved}` }
    }
  }
  return { valid: true, resolved }
}

function isPathUnderWorkspace(p: string, workspaces: WorkspaceEntry[]): boolean {
  const resolved = resolve(p)
  return workspaces.some(w => {
    const wsRoot = resolve(w.path)
    return resolved === wsRoot || resolved.startsWith(wsRoot + '/') || resolved.startsWith(wsRoot + '\\')
  })
}

function getWorkspaceName(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || path
}

function safeResolve(root: string, rel: string): string {
  const resolved = resolve(root, rel)
  // Prevent path traversal
  if (!resolved.startsWith(resolve(root)) && !resolved.startsWith(resolve(root) + '/') && !resolved.startsWith(resolve(root) + '\\')) {
    throw new Error('Path traversal detected')
  }
  return resolved
}

// ── Workspace CRUD ──────────────────────────────────────────────

workspaceRoutes.get('/api/hermes/workspaces', (ctx) => {
  const workspaces = loadWorkspaces()
  const last = workspaces.length > 0 ? workspaces[0].path : ''
  ctx.body = { workspaces, last }
})

workspaceRoutes.post('/api/hermes/workspaces/add', (ctx) => {
  const { path } = ctx.request.body as { path?: string }
  if (!path) { ctx.status = 400; ctx.body = { error: 'Path is required' }; return }
  const v = validatePath(path)
  if (!v.valid) { ctx.status = 400; ctx.body = { error: v.error }; return }
  const workspaces = loadWorkspaces()
  if (workspaces.some(w => w.path === v.resolved)) { ctx.body = { workspaces, last: workspaces[0]?.path || '' }; return }
  workspaces.push({ path: v.resolved!, name: getWorkspaceName(v.resolved!) })
  saveWorkspaces(workspaces)
  ctx.body = { workspaces, last: workspaces[0]?.path || '' }
})

workspaceRoutes.post('/api/hermes/workspaces/remove', (ctx) => {
  const { path } = ctx.request.body as { path?: string }
  if (!path) { ctx.status = 400; ctx.body = { error: 'Path is required' }; return }
  const resolved = resolve(path)
  const workspaces = loadWorkspaces().filter(w => w.path !== resolved)
  saveWorkspaces(workspaces)
  ctx.body = { workspaces, last: workspaces[0]?.path || '' }
})

workspaceRoutes.post('/api/hermes/session/workspace', (ctx) => {
  const { session_id, workspace, model } = ctx.request.body as { session_id?: string; workspace?: string; model?: string }
  if (!session_id || !workspace) { ctx.status = 400; ctx.body = { error: 'session_id and workspace are required' }; return }
  const v = validatePath(workspace)
  if (!v.valid) { ctx.status = 400; ctx.body = { error: v.error }; return }
  const workspaces = loadWorkspaces()
  const idx = workspaces.findIndex(w => w.path === v.resolved)
  if (idx > 0) { const [entry] = workspaces.splice(idx, 1); workspaces.unshift(entry); saveWorkspaces(workspaces) }
  ctx.body = { ok: true, workspace: v.resolved }
})

// ── Directory browser ──────────────────────────────────────────

// Browse directories (for workspace browser)
workspaceRoutes.get('/api/hermes/workspace/browse', (ctx) => {
  const dirPath = (ctx.query.path as string) || homedir()
  const resolved = resolve(dirPath)

  if (!isWindows) {
    for (const blocked of BLOCKED_ROOTS) {
      if (resolved === blocked || resolved.startsWith(blocked + '/')) {
        ctx.status = 403; ctx.body = { error: 'Cannot browse system directory' }; return
      }
    }
  }

  if (!existsSync(resolved) || !statSync(resolved).isDirectory()) {
    ctx.status = 400; ctx.body = { error: 'Not a valid directory' }; return
  }

  const entries = readdirSync(resolved)
    .map(name => {
      const fullPath = join(resolved, name)
      try {
        const stat = statSync(fullPath)
        if (!stat.isDirectory()) return null
        return { name, path: fullPath }
      } catch { return null }
    })
    .filter(Boolean) as Array<{ name: string; path: string }>
  entries.sort((a, b) => a.name.localeCompare(b.name))

  ctx.body = { path: resolved, entries, parent: resolved === '/' ? null : dirname(resolved) }
})

// Create directory via browser
workspaceRoutes.post('/api/hermes/workspace/browse/mkdir', (ctx) => {
  const { path, name } = ctx.request.body as { path?: string; name?: string }
  if (!path || !name) { ctx.status = 400; ctx.body = { error: 'path and name required' }; return }
  const resolved = resolve(path)
  const target = join(resolved, name)
  if (!target.startsWith(resolved)) { ctx.status = 403; ctx.body = { error: 'Invalid path' }; return }
  if (existsSync(target)) { ctx.status = 409; ctx.body = { error: 'Directory already exists' }; return }
  mkdirSync(target, { recursive: true, mode: 0o755 })
  ctx.body = { ok: true, path: target }
})

// Upload files to workspace directory
workspaceRoutes.post('/api/hermes/workspace/file/upload', async (ctx) => {
  const contentType = ctx.get('content-type') || ''
  if (!contentType.startsWith('multipart/form-data')) {
    ctx.status = 400; ctx.body = { error: 'Expected multipart/form-data' }; return
  }

  const boundary = '--' + contentType.split('boundary=')[1]
  if (!boundary || boundary === '--undefined') {
    ctx.status = 400; ctx.body = { error: 'Missing boundary' }; return
  }

  // Read raw body
  const chunks: Buffer[] = []
  for await (const chunk of ctx.req) chunks.push(chunk)
  const body = Buffer.concat(chunks).toString('latin1')
  const parts = body.split(boundary).slice(1, -1)

  // Extract form fields
  let workspace = ''
  let relPath = ''
  const results: { name: string; data: Buffer }[] = []

  for (const part of parts) {
    const headerEnd = part.indexOf('\r\n\r\n')
    if (headerEnd === -1) continue
    const header = part.substring(0, headerEnd)
    const data = part.substring(headerEnd + 4, part.length - 2)

    const nameMatch = header.match(/name="([^"]+)"/)
    if (!nameMatch) continue
    const fieldName = nameMatch[1]

    const filenameMatch = header.match(/filename="([^"]+)"/)

    if (fieldName === 'workspace') {
      workspace = Buffer.from(data, 'binary').toString('utf-8')
    } else if (fieldName === 'path') {
      relPath = Buffer.from(data, 'binary').toString('utf-8')
    } else if (fieldName === 'files' && filenameMatch) {
      results.push({ name: filenameMatch[1], data: Buffer.from(data, 'binary') })
    }
  }

  if (!workspace) { ctx.status = 400; ctx.body = { error: 'workspace is required' }; return }

  const wsValidation = validatePath(workspace)
  if (!wsValidation.valid || !wsValidation.resolved) { ctx.status = 400; ctx.body = { error: wsValidation.error }; return }

  try {
    const targetDir = safeResolve(wsValidation.resolved, relPath || '.')
    const files: { name: string; path: string }[] = []

    for (const entry of results) {
      const target = join(targetDir, entry.name)
      writeFileSync(target, entry.data)
      files.push({ name: entry.name, path: target })
    }

    ctx.body = { files }
  } catch (err: any) {
    ctx.status = 400
    ctx.body = { error: err.message }
  }
})

// ── File system operations ──────────────────────────────────────

// List directory contents
workspaceRoutes.get('/api/hermes/workspace/ls', (ctx) => {
  const workspace = ctx.query.workspace as string
  const rel = (ctx.query.path as string) || '.'
  if (!workspace) { ctx.status = 400; ctx.body = { error: 'workspace is required' }; return }

  const wsValidation = validatePath(workspace)
  if (!wsValidation.valid || !wsValidation.resolved) { ctx.status = 400; ctx.body = { error: wsValidation.error }; return }
  const wsRoot = wsValidation.resolved

  try {
    const target = safeResolve(wsRoot, rel)
    if (!statSync(target).isDirectory()) { ctx.status = 400; ctx.body = { error: 'Not a directory' }; return }

    const entries = readdirSync(target)
      .map(name => {
        const fullPath = join(target, name)
        try {
          const stat = statSync(fullPath)
          return {
            name,
            path: relative(wsRoot, fullPath).replace(/\\/g, '/'),
            type: stat.isDirectory() ? 'dir' : 'file',
            size: stat.isFile() ? stat.size : null,
          }
        } catch { return null }
      })
      .filter(Boolean)
      .sort((a, b) => {
        // Directories first, then alphabetical
        if (a!.type !== b!.type) return a!.type === 'dir' ? -1 : 1
        return a!.name.localeCompare(b!.name)
      })
      .slice(0, 200)

    ctx.body = { entries }
  } catch (err: any) {
    ctx.status = 400
    ctx.body = { error: err.message }
  }
})

// Read file content
workspaceRoutes.get('/api/hermes/workspace/file', (ctx) => {
  const workspace = ctx.query.workspace as string
  const rel = ctx.query.path as string
  if (!workspace || !rel) { ctx.status = 400; ctx.body = { error: 'workspace and path are required' }; return }

  const wsValidation = validatePath(workspace)
  if (!wsValidation.valid || !wsValidation.resolved) { ctx.status = 400; ctx.body = { error: wsValidation.error }; return }

  try {
    const target = safeResolve(wsValidation.resolved!, rel)
    if (!existsSync(target) || !statSync(target).isFile()) { ctx.status = 404; ctx.body = { error: 'File not found' }; return }

    const size = statSync(target).size
    if (size > MAX_FILE_SIZE) { ctx.status = 400; ctx.body = { error: `File too large (${size} bytes, max ${MAX_FILE_SIZE})` }; return }

    const ext = extname(target).toLowerCase()
    const isBinary = BINARY_EXTS.has(ext)

    if (isBinary) {
      ctx.body = { path: rel, binary: true, size }
      return
    }

    const content = readFileSync(target, 'utf-8')
    ctx.body = { path: rel, content, size, lines: content.split('\n').length }
  } catch (err: any) {
    ctx.status = 400
    ctx.body = { error: err.message }
  }
})

// Serve raw file (for images, downloads)
workspaceRoutes.get('/api/hermes/workspace/file/raw', (ctx) => {
  const workspace = ctx.query.workspace as string
  const rel = ctx.query.path as string
  const download = ctx.query.download === '1'
  if (!workspace || !rel) { ctx.status = 400; ctx.body = { error: 'workspace and path are required' }; return }

  const wsValidation = validatePath(workspace)
  if (!wsValidation.valid || !wsValidation.resolved) { ctx.status = 400; ctx.body = { error: wsValidation.error }; return }

  try {
    const target = safeResolve(wsValidation.resolved!, rel)
    if (!existsSync(target) || !statSync(target).isFile()) { ctx.status = 404; ctx.body = { error: 'File not found' }; return }

    const ext = extname(target).toLowerCase()
    const mimeMap: Record<string, string> = {
      '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
      '.ico': 'image/x-icon', '.bmp': 'image/bmp',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain', '.md': 'text/markdown',
      '.json': 'application/json', '.csv': 'text/csv',
      '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
    }
    const mime = mimeMap[ext] || 'application/octet-stream'
    ctx.set('Content-Type', mime)
    if (download) {
      ctx.set('Content-Disposition', `attachment; filename="${basename(target)}"`)
    }
    ctx.body = createReadStream(target)
  } catch (err: any) {
    ctx.status = 400
    ctx.body = { error: err.message }
  }
})

// Save file content
workspaceRoutes.post('/api/hermes/workspace/file/save', (ctx) => {
  const { workspace, path, content } = ctx.request.body as { workspace?: string; path?: string; content?: string }
  if (!workspace || !path || content === undefined) { ctx.status = 400; ctx.body = { error: 'workspace, path, and content are required' }; return }

  const wsValidation = validatePath(workspace)
  if (!wsValidation.valid || !wsValidation.resolved) { ctx.status = 400; ctx.body = { error: wsValidation.error }; return }

  try {
    const target = safeResolve(wsValidation.resolved!, path)
    writeFileSync(target, content, 'utf-8')
    ctx.body = { ok: true }
  } catch (err: any) {
    ctx.status = 400
    ctx.body = { error: err.message }
  }
})

// Create new file
workspaceRoutes.post('/api/hermes/workspace/file/create', (ctx) => {
  const { workspace, path } = ctx.request.body as { workspace?: string; path?: string }
  if (!workspace || !path) { ctx.status = 400; ctx.body = { error: 'workspace and path are required' }; return }

  const wsValidation = validatePath(workspace)
  if (!wsValidation.valid || !wsValidation.resolved) { ctx.status = 400; ctx.body = { error: wsValidation.error }; return }

  try {
    const target = safeResolve(wsValidation.resolved!, path)
    if (existsSync(target)) { ctx.status = 409; ctx.body = { error: 'File already exists' }; return }
    writeFileSync(target, '', 'utf-8')
    ctx.body = { ok: true }
  } catch (err: any) {
    ctx.status = 400
    ctx.body = { error: err.message }
  }
})

// Create directory
workspaceRoutes.post('/api/hermes/workspace/file/mkdir', (ctx) => {
  const { workspace, path } = ctx.request.body as { workspace?: string; path?: string }
  if (!workspace || !path) { ctx.status = 400; ctx.body = { error: 'workspace and path are required' }; return }

  const wsValidation = validatePath(workspace)
  if (!wsValidation.valid || !wsValidation.resolved) { ctx.status = 400; ctx.body = { error: wsValidation.error }; return }

  try {
    const target = safeResolve(wsValidation.resolved!, path)
    if (existsSync(target)) { ctx.status = 409; ctx.body = { error: 'Directory already exists' }; return }
    mkdirSync(target, { recursive: true, mode: 0o755 })
    ctx.body = { ok: true }
  } catch (err: any) {
    ctx.status = 400
    ctx.body = { error: err.message }
  }
})

// Delete file or directory
workspaceRoutes.post('/api/hermes/workspace/file/delete', (ctx) => {
  const { workspace, path } = ctx.request.body as { workspace?: string; path?: string }
  if (!workspace || !path) { ctx.status = 400; ctx.body = { error: 'workspace and path are required' }; return }

  const wsValidation = validatePath(workspace)
  if (!wsValidation.valid || !wsValidation.resolved) { ctx.status = 400; ctx.body = { error: wsValidation.error }; return }

  try {
    const target = safeResolve(wsValidation.resolved!, path)
    if (!existsSync(target)) { ctx.status = 404; ctx.body = { error: 'Not found' }; return }
    rmSync(target, { recursive: true, force: true })
    ctx.body = { ok: true }
  } catch (err: any) {
    ctx.status = 400
    ctx.body = { error: err.message }
  }
})

// Rename file or directory
workspaceRoutes.post('/api/hermes/workspace/file/rename', (ctx) => {
  const { workspace, path, newName } = ctx.request.body as { workspace?: string; path?: string; newName?: string }
  if (!workspace || !path || !newName) { ctx.status = 400; ctx.body = { error: 'workspace, path, and newName are required' }; return }

  const wsValidation = validatePath(workspace)
  if (!wsValidation.valid || !wsValidation.resolved) { ctx.status = 400; ctx.body = { error: wsValidation.error }; return }

  try {
    const target = safeResolve(wsValidation.resolved!, path)
    if (!existsSync(target)) { ctx.status = 404; ctx.body = { error: 'Not found' }; return }
    const dest = join(dirname(target), newName)
    if (!dest.startsWith(resolve(wsValidation.resolved!)) && !dest.startsWith(resolve(wsValidation.resolved!) + '/') && !dest.startsWith(resolve(wsValidation.resolved!) + '\\')) {
      ctx.status = 403; ctx.body = { error: 'Invalid destination' }; return
    }
    if (existsSync(dest)) { ctx.status = 409; ctx.body = { error: 'Target already exists' }; return }
    renameSync(target, dest)
    ctx.body = { ok: true, newPath: relative(wsValidation.resolved!, dest).replace(/\\/g, '/') }
  } catch (err: any) {
    ctx.status = 400
    ctx.body = { error: err.message }
  }
})

// Git status for workspace
workspaceRoutes.get('/api/hermes/workspace/git', (ctx) => {
  const workspace = ctx.query.workspace as string
  const rel = (ctx.query.path as string) || '.'
  if (!workspace) { ctx.status = 400; ctx.body = { error: 'workspace is required' }; return }

  const wsValidation = validatePath(workspace)
  if (!wsValidation.valid || !wsValidation.resolved) { ctx.status = 400; ctx.body = { error: wsValidation.error }; return }

  try {
    const target = safeResolve(wsValidation.resolved!, rel)
    // Check if .git exists
    if (!existsSync(join(target, '.git'))) {
      ctx.body = { git: false }
      return
    }

    const run = (cmd: string) => {
      try {
        return execSync(cmd, { cwd: target, encoding: 'utf-8', timeout: 5000 }).trim()
      } catch {
        return ''
      }
    }

    const branch = run('git rev-parse --abbrev-ref HEAD')
    const shortStat = run('git diff --shortstat')
    const stagedStat = run('git diff --cached --shortstat')

    // Parse ahead/behind
    const tracking = run('git rev-parse --abbrev-ref @{upstream} 2>/dev/null')
    let ahead = 0
    let behind = 0
    if (tracking) {
      const abRaw = run(`git rev-list --left-right --count HEAD...${tracking}`)
      const parts = abRaw.split(/\s+/)
      if (parts.length >= 2) {
        ahead = parseInt(parts[0]) || 0
        behind = parseInt(parts[1]) || 0
      }
    }

    // Count modified/untracked
    const modified = run('git diff --name-only').split('\n').filter(Boolean).length
    const untracked = run('git ls-files --others --exclude-standard').split('\n').filter(Boolean).length
    const staged = run('git diff --cached --name-only').split('\n').filter(Boolean).length

    ctx.body = {
      git: true,
      branch,
      modified,
      untracked,
      staged,
      ahead,
      behind,
    }
  } catch (err: any) {
    ctx.status = 400
    ctx.body = { error: err.message }
  }
})
