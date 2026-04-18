<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMessage } from 'naive-ui'
import { useWorkspacesStore } from '@/stores/hermes/workspaces'
import { listDir, readFile, getRawFileUrl, saveFile, createFile, createDir, uploadFiles, deleteEntry, renameEntry, fetchGitStatus } from '@/api/hermes/workspaces'
import type { FileEntry, FileContent, GitStatus } from '@/api/hermes/workspaces'

const props = defineProps<{ workspaceOverride?: string }>()

const workspacesStore = useWorkspacesStore()
const { t } = useI18n()
const message = useMessage()

const entries = ref<FileEntry[]>([])
const currentDir = ref('.')
const loading = ref(false)
const gitStatus = ref<GitStatus>({ git: false })

// Preview state
const previewPath = ref('')
const previewMode = ref<'none' | 'code' | 'image' | 'md'>('none')
const previewContent = ref('')
const previewDirty = ref(false)
const editing = ref(false)

// Expanded dirs cache
const expandedDirs = ref<Set<string>>(new Set())

const workspacePath = computed(() => props.workspaceOverride || workspacesStore.activeWorkspace)
const workspaceName = computed(() => workspacesStore.getWorkspaceName(workspacePath.value))

// Breadcrumb
const breadcrumbParts = computed(() => {
  if (currentDir.value === '.') return []
  return currentDir.value.split('/')
})

// ── Directory listing ───────────────────────────────────────────

async function loadDirectory(path: string = '.') {
  if (!workspacePath.value) return
  loading.value = true
  try {
    const data = await listDir(workspacePath.value, path)
    entries.value = data.entries || []
    if (path === '.') currentDir.value = '.'
    else currentDir.value = path
    // Clear preview when navigating
    if (previewMode.value !== 'none') clearPreview()
    // Load git status (non-blocking)
    fetchGitStatus(workspacePath.value, path).then(s => { gitStatus.value = s }).catch(() => { gitStatus.value = { git: false } })
  } catch (err: any) {
    message.error(err.message || t('common.fetchFailed'))
  } finally {
    loading.value = false
  }
}

function handleEntryClick(entry: FileEntry) {
  if (entry.type === 'dir') {
    const newPath = currentDir.value === '.' ? entry.path : currentDir.value + '/' + entry.path
    loadDirectory(newPath)
  } else {
    openFile(entry.path)
  }
}

function navigateUp() {
  if (currentDir.value === '.') return
  const parts = currentDir.value.split('/')
  parts.pop()
  loadDirectory(parts.length ? parts.join('/') : '.')
}

function navigateTo(index: number) {
  const parts = breadcrumbParts.value.slice(0, index + 1)
  loadDirectory(parts.join('/'))
}

// ── File preview ────────────────────────────────────────────────

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp'])
const MD_EXTS = new Set(['.md', '.markdown'])
const BINARY_EXTS = new Set([
  '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.pdf',
  '.zip', '.tar', '.gz', '.7z', '.rar',
  '.mp3', '.mp4', '.wav', '.exe', '.dll',
])

function fileExt(p: string): string {
  const i = p.lastIndexOf('.')
  return i >= 0 ? p.slice(i).toLowerCase() : ''
}

async function openFile(path: string) {
  if (!workspacePath.value) return
  const ext = fileExt(path)
  previewPath.value = path

  if (BINARY_EXTS.has(ext)) {
    downloadFile(path)
    return
  }

  if (IMAGE_EXTS.has(ext)) {
    previewMode.value = 'image'
    previewContent.value = getRawFileUrl(workspacePath.value, path)
    editing.value = false
    previewDirty.value = false
    return
  }

  try {
    const data: FileContent = await readFile(workspacePath.value, path)
    if (data.binary) {
      downloadFile(path)
      return
    }
    previewContent.value = data.content
    previewMode.value = MD_EXTS.has(ext) ? 'md' : 'code'
    editing.value = false
    previewDirty.value = false
  } catch (err: any) {
    downloadFile(path)
  }
}

function clearPreview() {
  previewMode.value = 'none'
  previewPath.value = ''
  previewContent.value = ''
  editing.value = false
  previewDirty.value = false
}

function downloadFile(path: string) {
  if (!workspacePath.value) return
  const url = getRawFileUrl(workspacePath.value, path, true)
  const filename = path.split('/').pop() || 'file'
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

// ── Edit / Save ─────────────────────────────────────────────────

const editContent = ref('')

function startEdit() {
  editContent.value = previewContent.value
  editing.value = true
}

function cancelEdit() {
  editing.value = false
  previewDirty.value = false
}

async function saveEdit() {
  if (!workspacePath.value || !previewPath.value) return
  try {
    await saveFile(workspacePath.value, previewPath.value, editContent.value)
    previewContent.value = editContent.value
    editing.value = false
    previewDirty.value = false
    message.success(t('common.saved'))
  } catch (err: any) {
    message.error(err.message || t('common.saveFailed'))
  }
}

// ── New file / folder ───────────────────────────────────────────

const newItemName = ref('')
const newItemType = ref<'file' | 'dir'>('file')
const showNewItem = ref(false)

function promptNewFile() {
  newItemType.value = 'file'
  newItemName.value = ''
  showNewItem.value = true
}

function promptNewFolder() {
  newItemType.value = 'dir'
  newItemName.value = ''
  showNewItem.value = true
}

async function handleCreate() {
  if (!workspacePath.value || !newItemName.value.trim()) return
  const basePath = currentDir.value === '.' ? '' : currentDir.value + '/'
  const fullPath = basePath + newItemName.value.trim()
  try {
    if (newItemType.value === 'file') {
      await createFile(workspacePath.value, fullPath)
    } else {
      await createDir(workspacePath.value, fullPath)
    }
    showNewItem.value = false
    newItemName.value = ''
    await loadDirectory(currentDir.value)
  } catch (err: any) {
    message.error(err.message || 'Failed')
  }
}

// ── Upload ─────────────────────────────────────────────────────

const fileInputRef = ref<HTMLInputElement>()

function triggerUpload() {
  fileInputRef.value?.click()
}

async function handleUpload(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length || !workspacePath.value) return
  const files = Array.from(input.files)
  try {
    await uploadFiles(workspacePath.value, currentDir.value, files)
    message.success(t('chat.uploadSuccess'))
    await loadDirectory(currentDir.value)
  } catch (err: any) {
    message.error(err.message || t('chat.uploadFailed'))
  }
  input.value = ''
}

// ── Delete / Rename ────────────────────────────────────────────

async function handleDelete(entry: FileEntry) {
  if (!workspacePath.value) return
  if (!confirm(t('chat.deleteConfirm', { name: entry.name }))) return
  try {
    await deleteEntry(workspacePath.value, entry.path)
    message.success(t('chat.deleted'))
    // If deleting the file being previewed, clear preview
    if (previewPath.value === entry.path) clearPreview()
    await loadDirectory(currentDir.value)
  } catch (err: any) {
    message.error(err.message || t('chat.deleteFailed'))
  }
}

const renamingEntry = ref<FileEntry | null>(null)
const renameValue = ref('')

function startRename(entry: FileEntry) {
  renamingEntry.value = entry
  renameValue.value = entry.name
}

async function handleRename() {
  if (!workspacePath.value || !renamingEntry.value || !renameValue.value.trim()) return
  try {
    await renameEntry(workspacePath.value, renamingEntry.value.path, renameValue.value.trim())
    message.success(t('chat.renamed'))
    // If renaming the file being previewed, update path
    if (previewPath.value === renamingEntry.value.path) {
      const basePath = currentDir.value === '.' ? '' : currentDir.value + '/'
      previewPath.value = basePath + renameValue.value.trim()
    }
    renamingEntry.value = null
    renameValue.value = ''
    await loadDirectory(currentDir.value)
  } catch (err: any) {
    message.error(err.message || t('chat.renameFailed'))
  }
}

// ── Drag & drop upload ────────────────────────────────────────

const dragOver = ref(false)

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  dragOver.value = true
}

function handleDragLeave(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  dragOver.value = false
}

async function handleDrop(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  dragOver.value = false
  if (!e.dataTransfer?.files?.length || !workspacePath.value) return
  const files = Array.from(e.dataTransfer.files)
  try {
    await uploadFiles(workspacePath.value, currentDir.value, files)
    message.success(t('chat.uploadSuccess'))
    await loadDirectory(currentDir.value)
  } catch (err: any) {
    message.error(err.message || t('chat.uploadFailed'))
  }
}

// ── Init ────────────────────────────────────────────────────────

watch(
  () => props.workspaceOverride || workspacesStore.activeWorkspace,
  (ws) => {
    if (ws) loadDirectory('.')
  }
)

onMounted(() => {
  if (workspacePath.value) loadDirectory('.')
})
</script>

<template>
  <div class="workspace-panel">
    <!-- Header -->
    <div class="ws-header">
      <span class="ws-title">{{ workspaceName }}</span>
      <div class="ws-actions">
        <button class="ws-btn" :title="t('chat.uploadFile')" @click="triggerUpload">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        </button>
        <input ref="fileInputRef" type="file" multiple class="hidden-input" @change="handleUpload" />
        <button class="ws-btn" :title="t('chat.newFile')" @click="promptNewFile">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <button class="ws-btn" :title="t('chat.newFolder')" @click="promptNewFolder">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
        </button>
        <button class="ws-btn" :title="t('chat.refresh')" @click="loadDirectory(currentDir)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
        </button>
      </div>
    </div>

    <!-- Git status bar -->
    <div v-if="gitStatus.git" class="ws-git-bar">
      <span class="git-branch">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
        {{ gitStatus.branch }}
      </span>
      <span v-if="gitStatus.modified" class="git-badge git-modified">{{ t('chat.gitModified', { n: gitStatus.modified }) }}</span>
      <span v-if="gitStatus.staged" class="git-badge git-staged">{{ t('chat.gitStaged', { n: gitStatus.staged }) }}</span>
      <span v-if="gitStatus.untracked" class="git-badge git-untracked">{{ t('chat.gitUntracked', { n: gitStatus.untracked }) }}</span>
      <span v-if="gitStatus.ahead" class="git-badge git-ahead">{{ t('chat.gitAhead', { n: gitStatus.ahead }) }}</span>
      <span v-if="gitStatus.behind" class="git-badge git-behind">{{ t('chat.gitBehind', { n: gitStatus.behind }) }}</span>
    </div>

    <!-- Breadcrumb -->
    <div class="ws-breadcrumb">
      <span class="bc-seg bc-link" @click="loadDirectory('.')">~</span>
      <template v-for="(part, i) in breadcrumbParts" :key="i">
        <span class="bc-sep">/</span>
        <span v-if="i < breadcrumbParts.length - 1" class="bc-seg bc-link" @click="navigateTo(i)">{{ part }}</span>
        <span v-else class="bc-seg bc-current">{{ part }}</span>
      </template>
      <button v-if="currentDir !== '.'" class="ws-btn bc-up" @click="navigateUp" :title="t('chat.parentDir')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
      </button>
    </div>

    <!-- New item input -->
    <div v-if="showNewItem" class="ws-new-item">
      <input
        v-model="newItemName"
        class="ws-new-input"
        :placeholder="newItemType === 'file' ? t('chat.fileNamePlaceholder') : t('chat.folderNamePlaceholder')"
        @keydown.enter="handleCreate"
        @keydown.escape="showNewItem = false"
      />
      <button class="ws-btn ws-btn-confirm" @click="handleCreate">{{ t('common.ok') }}</button>
      <button class="ws-btn" @click="showNewItem = false">{{ t('common.cancel') }}</button>
    </div>

    <!-- File tree -->
    <div
      class="ws-file-list"
      :class="{ 'ws-drag-over': dragOver }"
      v-if="previewMode === 'none'"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    >
      <div v-if="loading" class="ws-loading">{{ t('common.loading') }}</div>
      <div v-else-if="entries.length === 0" class="ws-empty">{{ t('chat.emptyDir') }}</div>
      <div
        v-for="entry in entries"
        :key="entry.path"
        class="ws-entry"
        @click="renamingEntry?.path !== entry.path && handleEntryClick(entry)"
      >
        <span class="ws-entry-icon" :class="entry.type">
          <svg v-if="entry.type === 'dir'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </span>
        <template v-if="renamingEntry?.path === entry.path">
          <input
            v-model="renameValue"
            class="ws-new-input"
            style="flex:1"
            @keydown.enter="handleRename"
            @keydown.escape="renamingEntry = null"
            @click.stop
          />
          <button class="ws-btn ws-btn-confirm" @click.stop="handleRename" :title="t('common.ok')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
          <button class="ws-btn" @click.stop="renamingEntry = null" :title="t('common.cancel')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </template>
        <template v-else>
          <span class="ws-entry-name">{{ entry.name }}</span>
          <span v-if="entry.size !== null" class="ws-entry-size">{{ entry.size >= 1024 ? (entry.size / 1024).toFixed(1) + 'K' : entry.size + 'B' }}</span>
          <div class="ws-entry-actions">
            <button class="ws-btn ws-btn-mini" @click.stop="startRename(entry)" :title="t('chat.renameFile')">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
            </button>
            <button class="ws-btn ws-btn-mini ws-btn-danger" @click.stop="handleDelete(entry)" :title="t('chat.deleteFile')">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </template>
      </div>
    </div>

    <!-- File preview -->
    <div v-if="previewMode !== 'none'" class="ws-preview">
      <div class="ws-preview-bar">
        <button class="ws-btn" @click="clearPreview">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="ws-preview-path">{{ previewPath }}</span>
        <button class="ws-btn" @click="downloadFile(previewPath)" :title="t('chat.download')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        <button v-if="previewMode !== 'image' && !editing" class="ws-btn" @click="startEdit" :title="t('common.edit')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
        </button>
        <template v-if="editing">
          <button class="ws-btn ws-btn-confirm" @click="saveEdit" :title="t('common.save')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
          <button class="ws-btn" @click="cancelEdit" :title="t('common.cancel')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </template>
      </div>

      <!-- Image preview -->
      <div v-if="previewMode === 'image'" class="ws-preview-img">
        <img :src="previewContent" :alt="previewPath" />
      </div>

      <!-- Markdown preview (rendered as plain text for now) -->
      <div v-if="previewMode === 'md' && !editing" class="ws-preview-md">
        <pre>{{ previewContent }}</pre>
      </div>

      <!-- Code preview -->
      <div v-if="previewMode === 'code' && !editing" class="ws-preview-code">
        <pre><code>{{ previewContent }}</code></pre>
      </div>

      <!-- Edit area -->
      <textarea
        v-if="editing"
        v-model="editContent"
        class="ws-edit-area"
        @input="previewDirty = true"
      ></textarea>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.workspace-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

// ── Header ────────────────────────────────────────────────────

.ws-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 12px 8px;
  flex-shrink: 0;
}

.ws-title {
  font-size: 12px;
  font-weight: 600;
  color: $text-primary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ws-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.ws-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: $radius-sm;
  background: transparent;
  color: $text-secondary;
  cursor: pointer;
  flex-shrink: 0;
  transition: background $transition-fast, color $transition-fast;

  &:hover { background: $bg-secondary; color: $text-primary; }
  &.ws-btn-confirm { color: $success; }
}

.hidden-input {
  display: none;
}

// ── Git status ────────────────────────────────────────────────

.ws-git-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  font-size: 11px;
  flex-shrink: 0;
  border-bottom: 1px solid $border-light;
}

.git-branch {
  display: flex;
  align-items: center;
  gap: 3px;
  font-weight: 600;
  color: $text-primary;
}

.git-badge {
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 10px;
  background: $bg-secondary;
  color: $text-muted;
}

.git-modified { color: #e5873a; background: rgba(229, 135, 58, 0.1); }
.git-staged { color: #2ea043; background: rgba(46, 160, 67, 0.1); }
.git-untracked { color: $text-muted; }
.git-ahead { color: #0550ae; background: rgba(5, 80, 174, 0.1); }
.git-behind { color: #953800; background: rgba(149, 56, 0, 0.1); }

// ── Breadcrumb ────────────────────────────────────────────────

.ws-breadcrumb {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 12px 8px;
  font-size: 11px;
  flex-shrink: 0;
  overflow-x: auto;
  white-space: nowrap;
}

.bc-seg { color: $text-muted; }
.bc-link { cursor: pointer; &:hover { color: $text-primary; } }
.bc-current { color: $text-primary; font-weight: 500; }
.bc-sep { color: $text-muted; opacity: 0.4; margin: 0 1px; }
.bc-up { margin-left: auto; width: 22px; height: 22px; }

// ── New item ──────────────────────────────────────────────────

.ws-new-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px 8px;
  flex-shrink: 0;
}

.ws-new-input {
  flex: 1;
  border: 1px solid $border-color;
  border-radius: $radius-sm;
  padding: 4px 8px;
  font-size: 12px;
  font-family: $font-ui;
  background: $bg-input;
  color: $text-primary;
  outline: none;
  min-width: 0;

  &:focus { border-color: $accent-primary; }
}

// ── File list ─────────────────────────────────────────────────

.ws-file-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
  transition: background $transition-fast;

  &.ws-drag-over {
    background: rgba(0, 120, 212, 0.05);
    outline: 2px dashed rgba(0, 120, 212, 0.3);
    outline-offset: -4px;
    border-radius: $radius-sm;
  }
}

.ws-loading, .ws-empty {
  padding: 16px 8px;
  font-size: 12px;
  color: $text-muted;
  text-align: center;
}

.ws-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: $radius-sm;
  cursor: pointer;
  transition: background $transition-fast;

  &:hover { background: $bg-secondary; }
}

.ws-entry-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;

  &.dir { color: $text-secondary; }
  &.file { color: $text-muted; }
}

.ws-entry-name {
  flex: 1;
  font-size: 12px;
  color: $text-primary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ws-entry-size {
  font-size: 10px;
  color: $text-muted;
  flex-shrink: 0;
}

.ws-entry-actions {
  display: flex;
  gap: 1px;
  opacity: 0;
  transition: opacity $transition-fast;
}

.ws-entry:hover .ws-entry-actions {
  opacity: 1;
}

.ws-btn-mini {
  width: 20px;
  height: 20px;

  &.ws-btn-danger:hover { color: $error; }
}

// ── Preview ───────────────────────────────────────────────────

.ws-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ws-preview-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border-bottom: 1px solid $border-light;
  flex-shrink: 0;
}

.ws-preview-path {
  flex: 1;
  font-size: 11px;
  color: $text-muted;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ws-preview-img {
  flex: 1;
  overflow: auto;
  padding: 12px;
  display: flex;
  justify-content: center;

  img { max-width: 100%; height: auto; border-radius: $radius-sm; }
}

.ws-preview-code, .ws-preview-md {
  flex: 1;
  overflow: auto;
  padding: 12px;

  pre {
    font-family: $font-code;
    font-size: 12px;
    line-height: 1.5;
    color: $text-primary;
    margin: 0;
    white-space: pre-wrap;
    word-break: break-all;
  }
}

.ws-edit-area {
  flex: 1;
  width: 100%;
  border: none;
  padding: 12px;
  font-family: $font-code;
  font-size: 12px;
  line-height: 1.5;
  color: $text-primary;
  background: $code-bg;
  resize: none;
  outline: none;
}
</style>
