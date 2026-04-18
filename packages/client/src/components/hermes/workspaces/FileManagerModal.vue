<script setup lang="ts">
import { NModal } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import WorkspacePanel from '@/components/hermes/chat/WorkspacePanel.vue'

const props = defineProps<{
  show: boolean
  workspacePath: string
}>()

const emit = defineEmits<{
  (e: 'update:show', val: boolean): void
}>()

const { t } = useI18n()
</script>

<template>
  <NModal
    :show="show"
    @update:show="emit('update:show', $event)"
    :mask-closable="true"
  >
    <div class="file-manager-modal">
      <div class="fm-header">
        <span class="fm-title">{{ t('workspaces.manageFiles') }}</span>
        <span class="fm-path">{{ workspacePath }}</span>
        <button class="fm-close" @click="emit('update:show', false)">×</button>
      </div>
      <div class="fm-body">
        <WorkspacePanel :workspace-override="workspacePath" />
      </div>
    </div>
  </NModal>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.file-manager-modal {
  background: $bg-card;
  border-radius: $radius-lg;
  width: 90vw;
  max-width: 800px;
  height: 75vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.fm-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid $border-color;
  flex-shrink: 0;
}

.fm-title {
  font-size: 15px;
  font-weight: 600;
  color: $text-primary;
  flex-shrink: 0;
}

.fm-path {
  font-size: 12px;
  color: $text-muted;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.fm-close {
  border: none;
  background: none;
  font-size: 20px;
  color: $text-secondary;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: $radius-sm;
  flex-shrink: 0;
  &:hover { background: $bg-secondary; }
}

.fm-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
