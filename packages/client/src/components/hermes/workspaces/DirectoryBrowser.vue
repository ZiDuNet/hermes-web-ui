<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { NModal, NButton, NInput, NSpin, useMessage } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { browseDir, browseMkdir } from '@/api/hermes/workspaces'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', val: boolean): void
  (e: 'select', path: string): void
}>()

const { t } = useI18n()
const message = useMessage()

const currentPath = ref('')
const entries = ref<{ name: string; path: string }[]>([])
const parentPath = ref<string | null>(null)
const loading = ref(false)
const pathInput = ref('')
const showNewFolder = ref(false)
const newFolderName = ref('')
const creating = ref(false)

async function loadDir(path: string) {
  loading.value = true
  try {
    const data = await browseDir(path || undefined)
    currentPath.value = data.path
    pathInput.value = data.path
    entries.value = data.entries
    parentPath.value = data.parent
  } catch (err: any) {
    message.error(err.message || t('workspaces.pathNotFound'))
  } finally {
    loading.value = false
  }
}

function navigateTo(path: string) {
  loadDir(path)
}

function goUp() {
  if (parentPath.value) loadDir(parentPath.value)
}

function goToInput() {
  if (pathInput.value.trim()) loadDir(pathInput.value.trim())
}

async function createFolder() {
  const name = newFolderName.value.trim()
  if (!name) return
  creating.value = true
  try {
    await browseMkdir(currentPath.value, name)
    message.success(t('workspaces.folderCreated'))
    newFolderName.value = ''
    showNewFolder.value = false
    await loadDir(currentPath.value)
  } catch (err: any) {
    message.error(err.message || t('workspaces.folderCreateFailed'))
  } finally {
    creating.value = false
  }
}

function selectCurrent() {
  emit('select', currentPath.value)
  emit('update:show', false)
}

watch(() => props.show, (val) => {
  if (val && !currentPath.value) loadDir('')
})

onMounted(() => {
  if (props.show && !currentPath.value) loadDir('')
})
</script>

<template>
  <NModal :show="show" @update:show="emit('update:show', $event)" :mask-closable="true">
    <div class="dir-browser">
      <div class="dir-header">
        <span class="dir-title">{{ t('workspaces.selectDirectory') }}</span>
        <button class="dir-close" @click="emit('update:show', false)">×</button>
      </div>

      <!-- Path input -->
      <div class="dir-path-bar">
        <NInput v-model:value="pathInput" size="small" @keydown.enter="goToInput">
          <template #prefix>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          </template>
        </NInput>
        <NButton size="small" @click="goToInput">Go</NButton>
        <NButton size="small" @click="goUp" :disabled="!parentPath">
          <template #icon><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg></template>
        </NButton>
      </div>

      <!-- Actions -->
      <div class="dir-actions">
        <NButton size="tiny" @click="showNewFolder = !showNewFolder">
          <template #icon><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg></template>
          {{ t('workspaces.newFolder') }}
        </NButton>
      </div>

      <!-- New folder inline -->
      <div v-if="showNewFolder" class="dir-new-folder">
        <NInput v-model:value="newFolderName" size="small" :placeholder="t('chat.folderNamePlaceholder')" @keydown.enter="createFolder" />
        <NButton size="small" type="primary" :loading="creating" @click="createFolder">{{ t('common.ok') }}</NButton>
        <NButton size="small" @click="showNewFolder = false; newFolderName = ''">{{ t('common.cancel') }}</NButton>
      </div>

      <!-- Directory list -->
      <NSpin :show="loading">
        <div class="dir-list">
          <div v-if="parentPath" class="dir-entry parent" @click="goUp">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>
            <span>..</span>
          </div>
          <div
            v-for="entry in entries"
            :key="entry.path"
            class="dir-entry"
            @click="navigateTo(entry.path)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            <span>{{ entry.name }}</span>
          </div>
          <div v-if="!loading && entries.length === 0" class="dir-empty">{{ t('chat.emptyDir') }}</div>
        </div>
      </NSpin>

      <!-- Footer -->
      <div class="dir-footer">
        <span class="dir-current-path">{{ currentPath }}</span>
        <NButton type="primary" size="small" @click="selectCurrent">{{ t('workspaces.selectThisFolder') }}</NButton>
      </div>
    </div>
  </NModal>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.dir-browser {
  background: $bg-card;
  border-radius: $radius-lg;
  width: 90vw;
  max-width: 560px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dir-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
  border-bottom: 1px solid $border-color;
}

.dir-title {
  font-size: 15px;
  font-weight: 600;
  color: $text-primary;
}

.dir-close {
  border: none;
  background: none;
  font-size: 20px;
  color: $text-secondary;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: $radius-sm;
  &:hover { background: $bg-secondary; }
}

.dir-path-bar {
  display: flex;
  gap: 6px;
  padding: 10px 16px;
  border-bottom: 1px solid $border-color;
}

.dir-actions {
  padding: 8px 16px 4px;
}

.dir-new-folder {
  display: flex;
  gap: 6px;
  padding: 4px 16px 8px;
}

.dir-list {
  flex: 1;
  overflow-y: auto;
  min-height: 200px;
  max-height: 40vh;
  padding: 4px 8px;
}

.dir-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: $radius-sm;
  cursor: pointer;
  color: $text-secondary;
  font-size: 13px;
  transition: background $transition-fast;

  &:hover { background: $bg-secondary; color: $text-primary; }
  &.parent { color: $text-muted; }
  svg { flex-shrink: 0; }
}

.dir-empty {
  padding: 20px;
  text-align: center;
  color: $text-muted;
  font-size: 13px;
}

.dir-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-top: 1px solid $border-color;
  gap: 12px;
}

.dir-current-path {
  font-size: 12px;
  color: $text-muted;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}
</style>
