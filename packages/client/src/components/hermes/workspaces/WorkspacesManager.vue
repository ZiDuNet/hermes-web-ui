<script setup lang="ts">
import { useWorkspacesStore } from '@/stores/hermes/workspaces'
import { NButton, NInput, NPopconfirm, NSpin, NTooltip, useMessage } from 'naive-ui'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const message = useMessage()
const workspacesStore = useWorkspacesStore()

const newPath = ref('')
const adding = ref(false)

async function handleAdd() {
  const path = newPath.value.trim()
  if (!path) return
  adding.value = true
  try {
    await workspacesStore.addWorkspace(path)
    newPath.value = ''
    message.success(t('workspaces.added'))
  } catch (err: any) {
    message.error(err.message || t('workspaces.addFailed'))
  } finally {
    adding.value = false
  }
}

async function handleRemove(path: string) {
  try {
    await workspacesStore.removeWorkspace(path)
    message.success(t('workspaces.removed'))
  } catch (err: any) {
    message.error(err.message || t('workspaces.removeFailed'))
  }
}

function shortPath(path: string): string {
  if (path.length > 50) {
    return '...' + path.slice(-47)
  }
  return path
}
</script>

<template>
  <div class="workspaces-manager">
    <!-- Add workspace -->
    <div class="add-row">
      <NInput
        v-model:value="newPath"
        :placeholder="t('workspaces.addPlaceholder')"
        size="small"
        @keydown.enter="handleAdd"
      />
      <NButton type="primary" size="small" :loading="adding" @click="handleAdd">
        {{ t('common.add') }}
      </NButton>
    </div>

    <!-- Workspace list -->
    <NSpin :show="workspacesStore.loading">
      <div v-if="workspacesStore.workspaces.length === 0" class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="empty-icon">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        <p>{{ t('workspaces.empty') }}</p>
      </div>
      <div v-else class="workspace-list">
        <div
          v-for="ws in workspacesStore.workspaces"
          :key="ws.path"
          class="workspace-card"
        >
          <div class="workspace-info">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="ws-icon">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <div class="ws-details">
              <span class="ws-name">{{ ws.name }}</span>
              <NTooltip trigger="hover">
                <template #trigger>
                  <span class="ws-path">{{ shortPath(ws.path) }}</span>
                </template>
                {{ ws.path }}
              </NTooltip>
            </div>
          </div>
          <NPopconfirm @positive-click="handleRemove(ws.path)">
            <template #trigger>
              <NButton quaternary size="tiny" type="error">
                <template #icon>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </template>
              </NButton>
            </template>
            {{ t('workspaces.removeConfirm') }}
          </NPopconfirm>
        </div>
      </div>
    </NSpin>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.workspaces-manager {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.add-row {
  display: flex;
  gap: 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: $text-muted;
  gap: 12px;

  .empty-icon {
    opacity: 0.3;
  }

  p {
    font-size: 14px;
  }
}

.workspace-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.workspace-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border: 1px solid $border-color;
  border-radius: $radius-md;
  background: $bg-card;
  transition: border-color $transition-fast;

  &:hover {
    border-color: rgba(var(--accent-primary-rgb), 0.3);
  }
}

.workspace-info {
  display: flex;
  align-items: center;
  gap: 12px;
  overflow: hidden;
  flex: 1;
  min-width: 0;
}

.ws-icon {
  flex-shrink: 0;
  color: $text-muted;
}

.ws-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
  min-width: 0;
}

.ws-name {
  font-size: 14px;
  font-weight: 500;
  color: $text-primary;
}

.ws-path {
  font-size: 12px;
  color: $text-muted;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
