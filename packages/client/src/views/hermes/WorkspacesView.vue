<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import WorkspacesManager from '@/components/hermes/workspaces/WorkspacesManager.vue'
import { useWorkspacesStore } from '@/stores/hermes/workspaces'

const { t } = useI18n()
const workspacesStore = useWorkspacesStore()

onMounted(() => {
  workspacesStore.fetchWorkspaces()
})
</script>

<template>
  <div class="workspaces-view">
    <header class="page-header">
      <h2 class="header-title">{{ t('workspaces.title') }}</h2>
    </header>
    <div class="workspaces-content">
      <WorkspacesManager />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.workspaces-view {
  height: calc(100 * var(--vh));
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid $border-color;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: $text-primary;
}

.workspaces-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}
</style>
