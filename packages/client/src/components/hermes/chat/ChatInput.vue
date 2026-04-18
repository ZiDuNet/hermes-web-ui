<script setup lang="ts">
import type { Attachment } from '@/stores/hermes/chat'
import { useChatStore } from '@/stores/hermes/chat'
import { useAppStore } from '@/stores/hermes/app'
import { useProfilesStore } from '@/stores/hermes/profiles'
import { useWorkspacesStore } from '@/stores/hermes/workspaces'
import { NButton, NTooltip, useMessage } from 'naive-ui'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const chatStore = useChatStore()
const appStore = useAppStore()
const profilesStore = useProfilesStore()
const workspacesStore = useWorkspacesStore()
const { t } = useI18n()
const message = useMessage()

const inputText = ref('')
const textareaRef = ref<HTMLTextAreaElement>()
const fileInputRef = ref<HTMLInputElement>()
const attachments = ref<Attachment[]>([])
const isDragging = ref(false)
const dragCounter = ref(0)
const isComposing = ref(false)

// ── Dropdown state ──────────────────────────────────────────────
const showProfileDropdown = ref(false)
const showModelDropdown = ref(false)
const showWorkspaceDropdown = ref(false)
const modelSearch = ref('')

// Dropdown position (fixed positioning to avoid overflow clipping)
const dropdownStyle = ref<Record<string, string>>({})

// ── Voice input (Web Speech API) ────────────────────────────────
const isRecording = ref(false)
const micSupported = ref(false)
let recognition: any = null

onMounted(() => {
  // Voice input
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (SR) {
    recognition = new SR()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = navigator.language || 'en-US'
    micSupported.value = true
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += transcript
        } else {
          interim += transcript
        }
      }
      if (final) {
        inputText.value += final
      }
    }
    recognition.onend = () => {
      isRecording.value = false
    }
    recognition.onerror = () => {
      isRecording.value = false
    }
  }

  // Load workspace list
  if (workspacesStore.workspaces.length === 0) {
    workspacesStore.fetchWorkspaces()
  }
  if (profilesStore.profiles.length === 0) {
    profilesStore.fetchProfiles()
  }

  document.addEventListener('click', handleDocClick)
})

onUnmounted(() => {
  if (recognition && isRecording.value) recognition.stop()
  document.removeEventListener('click', handleDocClick)
})

function handleDocClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.composer-chip-wrap')) {
    showProfileDropdown.value = false
    showModelDropdown.value = false
    showWorkspaceDropdown.value = false
  }
}

// ── Computed ────────────────────────────────────────────────────

const canSend = computed(() => inputText.value.trim() || attachments.value.length > 0)

// Profile
const activeProfileName = computed(() => profilesStore.activeProfile?.name ?? 'default')
const profileOptions = computed(() => profilesStore.profiles)

// Model
const filteredModelGroups = computed(() => {
  const q = modelSearch.value.toLowerCase()
  return appStore.modelGroups
    .map(g => ({
      ...g,
      models: g.models.filter(m => m.toLowerCase().includes(q)),
    }))
    .filter(g => g.models.length > 0)
})
const currentModelLabel = computed(() => {
  const id = appStore.selectedModel || chatStore.activeSession?.model || ''
  if (!id) return t('chat.model')
  // Shorten: take part after last /
  const parts = id.split('/')
  return parts.length > 1 ? parts[parts.length - 1] : id
})

// Workspace
const currentWorkspaceLabel = computed(() => {
  const ws = workspacesStore.activeWorkspace
  if (!ws) return t('chat.workspace')
  return workspacesStore.getWorkspaceName(ws)
})

// ── Voice input ─────────────────────────────────────────────────

function toggleRecording() {
  if (!recognition) return
  if (isRecording.value) {
    recognition.stop()
  } else {
    isRecording.value = true
    recognition.start()
  }
}

// ── Profile actions ─────────────────────────────────────────────

function selectProfile(name: string) {
  if (name === activeProfileName.value) {
    showProfileDropdown.value = false
    return
  }
  profilesStore.switchProfile(name).then(ok => {
    if (ok) {
      message.success(t('profiles.switchSuccess', { name }))
      showProfileDropdown.value = false
      window.location.reload()
    }
  })
}

// ── Model actions ───────────────────────────────────────────────

function selectModel(modelId: string, provider?: string) {
  chatStore.switchSessionModel(modelId, provider || undefined)
  appStore.switchModel(modelId, provider)
  showModelDropdown.value = false
  modelSearch.value = ''
}

function getModelDisplayName(modelId: string): string {
  const parts = modelId.split('/')
  return parts.length > 1 ? parts[parts.length - 1] : modelId
}

// ── Workspace actions ───────────────────────────────────────────

const newWorkspacePath = ref('')

function selectWorkspace(path: string) {
  const sid = chatStore.activeSessionId
  if (!sid) return
  const model = chatStore.activeSession?.model || appStore.selectedModel
  workspacesStore.switchWorkspace(sid, path, model).then(() => {
    message.success(t('chat.workspaceSwitched'))
  }).catch((err: any) => {
    message.error(err.message || t('chat.workspaceSwitchFailed'))
  })
  showWorkspaceDropdown.value = false
}

async function handleAddWorkspace() {
  const path = newWorkspacePath.value.trim()
  if (!path) return
  try {
    await workspacesStore.addWorkspace(path)
    newWorkspacePath.value = ''
    message.success(t('chat.workspaceAdded'))
  } catch (err: any) {
    message.error(err.message || t('chat.workspaceAddFailed'))
  }
}

// ── Dropdown toggles ────────────────────────────────────────────

function toggleProfileDropdown(e: MouseEvent) {
  showProfileDropdown.value = !showProfileDropdown.value
  showModelDropdown.value = false
  showWorkspaceDropdown.value = false
  if (showProfileDropdown.value) positionDropdown(e)
}

function toggleModelDropdown(e: MouseEvent) {
  showModelDropdown.value = !showModelDropdown.value
  showProfileDropdown.value = false
  showWorkspaceDropdown.value = false
  modelSearch.value = ''
  if (showModelDropdown.value) positionDropdown(e)
}

function toggleWorkspaceDropdown(e: MouseEvent) {
  showWorkspaceDropdown.value = !showWorkspaceDropdown.value
  showProfileDropdown.value = false
  showModelDropdown.value = false
  if (showWorkspaceDropdown.value) positionDropdown(e)
}

function positionDropdown(e: MouseEvent) {
  const btn = (e.currentTarget as HTMLElement)
  const rect = btn.getBoundingClientRect()
  dropdownStyle.value = {
    position: 'fixed',
    bottom: (window.innerHeight - rect.top + 6) + 'px',
    left: rect.left + 'px',
    zIndex: '1000',
  }
}

// ── File attachment helpers ─────────────────────────────────────

function addFile(file: File) {
  if (attachments.value.find(a => a.name === file.name)) return
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  const url = URL.createObjectURL(file)
  attachments.value.push({ id, name: file.name, type: file.type, size: file.size, url, file })
}

function handleAttachClick() { fileInputRef.value?.click() }

function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files) return
  for (const file of input.files) addFile(file)
  input.value = ''
}

function handlePaste(e: ClipboardEvent) {
  const items = Array.from(e.clipboardData?.items || [])
  const imageItems = items.filter(i => i.type.startsWith('image/'))
  if (!imageItems.length) return
  e.preventDefault()
  for (const item of imageItems) {
    const blob = item.getAsFile()
    if (!blob) continue
    const ext = item.type.split('/')[1] || 'png'
    const file = new File([blob], `pasted-${Date.now()}.${ext}`, { type: item.type })
    addFile(file)
  }
}

// ── Drag and drop ───────────────────────────────────────────────

function handleDragOver(e: DragEvent) { e.preventDefault() }

function handleDragEnter(e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer?.types.includes('Files')) {
    dragCounter.value++
    isDragging.value = true
  }
}

function handleDragLeave() {
  dragCounter.value--
  if (dragCounter.value <= 0) { dragCounter.value = 0; isDragging.value = false }
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  dragCounter.value = 0
  isDragging.value = false
  const files = Array.from(e.dataTransfer?.files || [])
  if (!files.length) return
  for (const file of files) addFile(file)
  textareaRef.value?.focus()
}

// ── Send ────────────────────────────────────────────────────────

function handleSend() {
  const text = inputText.value.trim()
  if (!text && attachments.value.length === 0) return
  chatStore.sendMessage(text, attachments.value.length > 0 ? attachments.value : undefined)
  inputText.value = ''
  attachments.value = []
  if (textareaRef.value) textareaRef.value.style.height = 'auto'
}

function handleCompositionStart() { isComposing.value = true }

function handleCompositionEnd() {
  requestAnimationFrame(() => { isComposing.value = false })
}

function isImeEnter(e: KeyboardEvent): boolean {
  return isComposing.value || e.isComposing || e.keyCode === 229
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key !== 'Enter' || e.shiftKey) return
  if (isImeEnter(e)) return
  e.preventDefault()
  handleSend()
}

function handleInput(e: Event) {
  const el = e.target as HTMLTextAreaElement
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 100) + 'px'
}

function removeAttachment(id: string) {
  const idx = attachments.value.findIndex(a => a.id === id)
  if (idx !== -1) {
    URL.revokeObjectURL(attachments.value[idx].url)
    attachments.value.splice(idx, 1)
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function isImage(type: string): boolean { return type.startsWith('image/') }
</script>

<template>
  <div class="chat-input-area">
    <!-- Attachment previews -->
    <div v-if="attachments.length > 0" class="attachment-previews">
      <div v-for="att in attachments" :key="att.id" class="attachment-preview" :class="{ image: isImage(att.type) }">
        <template v-if="isImage(att.type)">
          <img :src="att.url" :alt="att.name" class="attachment-thumb" />
        </template>
        <template v-else>
          <div class="attachment-file">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span class="file-name">{{ att.name }}</span>
            <span class="file-size">{{ formatSize(att.size) }}</span>
          </div>
        </template>
        <button class="attachment-remove" @click="removeAttachment(att.id)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>

    <!-- Mic status -->
    <div v-if="isRecording" class="mic-status">
      <span class="mic-dot"></span> {{ t('chat.listening') }}
    </div>

    <div class="input-wrapper" :class="{ 'drag-over': isDragging }" @dragover="handleDragOver" @dragenter="handleDragEnter" @dragleave="handleDragLeave" @drop="handleDrop">
      <input ref="fileInputRef" type="file" multiple class="file-input-hidden" @change="handleFileChange" />
      <textarea
        ref="textareaRef"
        v-model="inputText"
        class="input-textarea"
        :placeholder="t('chat.inputPlaceholder')"
        rows="1"
        @keydown="handleKeydown"
        @compositionstart="handleCompositionStart"
        @compositionend="handleCompositionEnd"
        @input="handleInput"
        @paste="handlePaste"
      ></textarea>
    </div>

    <!-- Composer footer (chip bar) -->
    <div class="composer-footer">
      <div class="composer-left">
        <!-- Attach -->
        <NTooltip trigger="hover">
          <template #trigger>
            <button class="composer-icon-btn" @click="handleAttachClick">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            </button>
          </template>
          {{ t('chat.attachFiles') }}
        </NTooltip>

        <!-- Mic -->
        <NTooltip v-if="micSupported" trigger="hover">
          <template #trigger>
            <button class="composer-icon-btn" :class="{ active: isRecording }" @click="toggleRecording">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="1" width="6" height="12" rx="3"/>
                <path d="M5 10a7 7 0 0 0 14 0"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>
          </template>
          {{ t('chat.voiceInput') }}
        </NTooltip>

        <!-- Divider -->
        <div class="composer-divider"></div>

        <!-- Profile chip -->
        <div class="composer-chip-wrap">
          <button class="composer-chip" :class="{ active: showProfileDropdown }" @click.stop="toggleProfileDropdown">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span class="chip-label">{{ activeProfileName }}</span>
            <svg class="chip-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>

        <!-- Workspace chip -->
        <div class="composer-chip-wrap">
          <button class="composer-chip" :class="{ active: showWorkspaceDropdown }" @click.stop="toggleWorkspaceDropdown">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            <span class="chip-label">{{ currentWorkspaceLabel }}</span>
            <svg class="chip-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>

        <!-- Model chip -->
        <div class="composer-chip-wrap">
          <button class="composer-chip" :class="{ active: showModelDropdown }" @click.stop="toggleModelDropdown">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>
            <span class="chip-label">{{ currentModelLabel }}</span>
            <svg class="chip-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
      </div>

      <div class="composer-right">
        <NButton v-if="chatStore.isStreaming" size="small" type="error" @click="chatStore.stopStreaming()">
          {{ t('chat.stop') }}
        </NButton>
        <NButton size="small" type="primary" :disabled="!canSend || chatStore.isStreaming" @click="handleSend">
          <template #icon>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </template>
          {{ t('chat.send') }}
        </NButton>
      </div>
    </div>

    <!-- Teleported dropdowns (fixed positioning) -->
    <Teleport to="body">
      <!-- Profile dropdown -->
      <div v-if="showProfileDropdown" class="chip-dropdown" :style="dropdownStyle" @click.stop>
        <div v-for="p in profileOptions" :key="p.name" class="dropdown-item" :class="{ active: p.name === activeProfileName }" @click="selectProfile(p.name)">
          <span class="dropdown-item-label">{{ p.name }}</span>
          <span v-if="p.active" class="dropdown-item-badge">●</span>
        </div>
        <div v-if="profileOptions.length === 0" class="dropdown-empty">{{ t('common.loading') }}</div>
      </div>

      <!-- Workspace dropdown -->
      <div v-if="showWorkspaceDropdown" class="chip-dropdown workspace-dropdown" :style="dropdownStyle" @click.stop>
        <div
          v-for="ws in workspacesStore.workspaces"
          :key="ws.path"
          class="dropdown-item"
          :class="{ active: ws.path === workspacesStore.activeWorkspace }"
          @click="selectWorkspace(ws.path)"
        >
          <span class="dropdown-item-label">{{ ws.name }}</span>
          <span class="dropdown-item-path">{{ ws.path }}</span>
        </div>
        <div class="dropdown-separator"></div>
        <div class="dropdown-add-row">
          <input
            v-model="newWorkspacePath"
            class="dropdown-input"
            :placeholder="t('chat.workspaceAddPlaceholder')"
            @keydown.enter="handleAddWorkspace"
          />
          <button class="dropdown-add-btn" @click="handleAddWorkspace">{{ t('common.add') }}</button>
        </div>
      </div>

      <!-- Model dropdown -->
      <div v-if="showModelDropdown" class="chip-dropdown model-dropdown" :style="dropdownStyle" @click.stop>
        <input v-model="modelSearch" class="dropdown-search" :placeholder="t('chat.searchModel')" />
        <div class="dropdown-scroll">
          <div v-for="group in filteredModelGroups" :key="group.provider" class="dropdown-group">
            <div class="dropdown-group-label">{{ group.label }}</div>
            <div
              v-for="m in group.models"
              :key="m"
              class="dropdown-item"
              :class="{ active: m === appStore.selectedModel }"
              @click="selectModel(m, group.provider)"
            >
              <span class="dropdown-item-label">{{ getModelDisplayName(m) }}</span>
            </div>
          </div>
          <div v-if="filteredModelGroups.length === 0" class="dropdown-empty">{{ t('common.loading') }}</div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.chat-input-area {
  padding: 12px 20px 16px;
  border-top: 1px solid $border-color;
  flex-shrink: 0;
}

.attachment-previews {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 0 10px;
}

.attachment-preview {
  position: relative;
  border-radius: $radius-sm;
  overflow: hidden;
  background-color: $bg-secondary;
  border: 1px solid $border-color;

  &.image { width: 64px; height: 64px; }
}

.attachment-thumb { width: 100%; height: 100%; object-fit: cover; }

.attachment-file {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 8px 12px;
  min-width: 80px;
  max-width: 140px;
  color: $text-secondary;

  .file-name {
    font-size: 11px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .file-size { font-size: 10px; color: $text-muted; }
}

.attachment-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.5);
  color: var(--text-on-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity $transition-fast;

  .attachment-preview:hover & { opacity: 1; }
}

.file-input-hidden { display: none; }

.mic-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0 8px;
  font-size: 12px;
  color: $error;

  .mic-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: $error;
    animation: pulse 1s infinite;
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: $bg-input;
  border: 1px solid $border-color;
  border-radius: $radius-md $radius-md 0 0;
  padding: 10px 12px;
  border-bottom: none;
  transition: border-color $transition-fast, background-color $transition-fast;

  &:focus-within { border-color: $accent-primary; }
  .dark & { background-color: #333333; }
}

.input-wrapper.drag-over {
  border-color: var(--accent-info);
  border-style: dashed;
  background-color: rgba(var(--accent-info-rgb), 0.04);
}

.input-textarea {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: $text-primary;
  font-family: $font-ui;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  max-height: 100px;
  min-height: 20px;
  overflow-y: auto;

  &::placeholder {
    color: $text-muted;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

// ── Composer footer (chip bar) ────────────────────────────────

.composer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: $bg-input;
  border: 1px solid $border-color;
  border-top: none;
  border-radius: 0 0 $radius-md $radius-md;
  padding: 6px 10px;
  gap: 6px;

  .dark & { background-color: #333333; }
}

.composer-left {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
  overflow-x: auto;

  // Hide scrollbar
  &::-webkit-scrollbar { display: none; }
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.composer-right {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  align-items: center;
}

.composer-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: $radius-sm;
  background: transparent;
  color: $text-secondary;
  cursor: pointer;
  flex-shrink: 0;
  transition: background $transition-fast, color $transition-fast;

  &:hover { background: $bg-secondary; color: $text-primary; }
  &.active { color: $error; }
}

.composer-divider {
  width: 1px;
  height: 16px;
  background: $border-color;
  flex-shrink: 0;
  margin: 0 2px;
}

// ── Chip (Profile / Workspace / Model) ────────────────────────

.composer-chip-wrap {
  position: relative;
  flex-shrink: 0;
}

.composer-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border: 1px solid $border-color;
  border-radius: 14px;
  background: transparent;
  color: $text-secondary;
  cursor: pointer;
  font-size: 12px;
  font-family: $font-ui;
  white-space: nowrap;
  transition: background $transition-fast, border-color $transition-fast, color $transition-fast;

  &:hover, &.active {
    background: $bg-secondary;
    border-color: $accent-muted;
    color: $text-primary;
  }

  .chip-label {
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .chip-chevron {
    flex-shrink: 0;
    transition: transform $transition-fast;
  }

  &.active .chip-chevron {
    transform: rotate(180deg);
  }
}

// ── Dropdown ──────────────────────────────────────────────────

.chip-dropdown {
  min-width: 200px;
  max-width: 320px;
  background: $bg-card;
  border: 1px solid $border-color;
  border-radius: $radius-md;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  padding: 4px;

  .dark & {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  }
}

.dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 10px;
  border-radius: $radius-sm;
  cursor: pointer;
  font-size: 12px;
  color: $text-primary;
  transition: background $transition-fast;

  &:hover { background: $bg-secondary; }
  &.active { color: $accent-primary; font-weight: 600; }
}

.dropdown-item-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-item-badge {
  color: $success;
  font-size: 10px;
}

.dropdown-item-path {
  font-size: 10px;
  color: $text-muted;
  margin-left: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-separator {
  height: 1px;
  background: $border-color;
  margin: 4px 0;
}

.dropdown-add-row {
  display: flex;
  gap: 4px;
  padding: 4px;
}

.dropdown-input {
  flex: 1;
  border: 1px solid $border-color;
  border-radius: $radius-sm;
  padding: 5px 8px;
  font-size: 12px;
  font-family: $font-ui;
  background: $bg-input;
  color: $text-primary;
  outline: none;
  min-width: 0;

  &:focus { border-color: $accent-primary; }
}

.dropdown-add-btn {
  border: 1px solid $border-color;
  border-radius: $radius-sm;
  background: $bg-secondary;
  color: $text-primary;
  padding: 5px 10px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: background $transition-fast;

  &:hover { background: $accent-primary; color: var(--text-on-accent); }
}

// Model dropdown specific
.model-dropdown {
  max-width: 360px;
}

.dropdown-search {
  width: 100%;
  border: 1px solid $border-color;
  border-radius: $radius-sm;
  padding: 6px 10px;
  font-size: 12px;
  font-family: $font-ui;
  background: $bg-input;
  color: $text-primary;
  outline: none;
  margin-bottom: 4px;

  &:focus { border-color: $accent-primary; }
}

.dropdown-scroll {
  max-height: 260px;
  overflow-y: auto;
}

.dropdown-group-label {
  font-size: 10px;
  font-weight: 600;
  color: $text-muted;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 6px 10px 2px;
}

.dropdown-empty {
  padding: 10px;
  font-size: 12px;
  color: $text-muted;
  text-align: center;
}

// Mobile
@media (max-width: $breakpoint-mobile) {
  .chip-label { max-width: 60px; }
  .composer-footer { padding: 6px 8px; }
}
</style>

<!-- Non-scoped styles for Teleported dropdowns (they render outside this component's scope) -->
<style lang="scss">
@use '@/styles/variables' as *;

.chip-dropdown {
  min-width: 200px;
  max-width: 320px;
  background: $bg-card;
  border: 1px solid $border-color;
  border-radius: $radius-md;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  padding: 4px;

  .dark & {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 10px;
    border-radius: $radius-sm;
    cursor: pointer;
    font-size: 12px;
    color: $text-primary;
    transition: background $transition-fast;

    &:hover { background: $bg-secondary; }
    &.active { color: $accent-primary; font-weight: 600; }
  }

  .dropdown-item-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dropdown-item-badge {
    color: $success;
    font-size: 10px;
  }

  .dropdown-item-path {
    font-size: 10px;
    color: $text-muted;
    margin-left: 8px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dropdown-separator {
    height: 1px;
    background: $border-color;
    margin: 4px 0;
  }

  .dropdown-add-row {
    display: flex;
    gap: 4px;
    padding: 4px;
  }

  .dropdown-input {
    flex: 1;
    border: 1px solid $border-color;
    border-radius: $radius-sm;
    padding: 5px 8px;
    font-size: 12px;
    font-family: $font-ui;
    background: $bg-input;
    color: $text-primary;
    outline: none;
    min-width: 0;

    &:focus { border-color: $accent-primary; }
  }

  .dropdown-add-btn {
    border: 1px solid $border-color;
    border-radius: $radius-sm;
    background: $bg-secondary;
    color: $text-primary;
    padding: 5px 10px;
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
    transition: background $transition-fast;

    &:hover { background: $accent-primary; color: var(--text-on-accent); }
  }

  .dropdown-search {
    width: 100%;
    border: 1px solid $border-color;
    border-radius: $radius-sm;
    padding: 6px 10px;
    font-size: 12px;
    font-family: $font-ui;
    background: $bg-input;
    color: $text-primary;
    outline: none;
    margin-bottom: 4px;

    &:focus { border-color: $accent-primary; }
  }

  .dropdown-scroll {
    max-height: 260px;
    overflow-y: auto;
  }

  .dropdown-group-label {
    font-size: 10px;
    font-weight: 600;
    color: $text-muted;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 6px 10px 2px;
  }

  .dropdown-empty {
    padding: 10px;
    font-size: 12px;
    color: $text-muted;
    text-align: center;
  }
}

.chip-dropdown.model-dropdown {
  max-width: 360px;
}
</style>
