<script setup lang="ts">
import { ref, computed } from 'vue'
import { NCard, NTag, NSwitch, NButton, NSpace, useMessage, useDialog } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { useMcpServersStore } from '@/stores/hermes/mcp-servers'
import type { McpServerConfig } from '@/api/hermes/mcp-servers'
import McpServerFormModal from './McpServerFormModal.vue'

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const store = useMcpServersStore()

const props = defineProps<{
  name: string
  config: McpServerConfig
}>()

const expanded = ref(false)
const showEditModal = ref(false)

const transportType = computed(() => {
  return props.config.url ? 'http' : 'stdio'
})

const summary = computed(() => {
  if (transportType.value === 'http') {
    return props.config.url || ''
  }
  const parts = [props.config.command || '']
  if (props.config.args?.length) {
    parts.push(...props.config.args)
  }
  return parts.join(' ')
})

async function handleToggleEnabled(val: boolean) {
  try {
    await store.updateServer(props.name, { ...props.config, enabled: val })
    message.success(t('common.saved'))
  } catch (e: any) {
    message.error(e.message)
  }
}

function handleDelete() {
  dialog.warning({
    title: t('common.confirm'),
    content: t('mcpServers.deleteConfirm', { name: props.name }),
    positiveText: t('common.delete'),
    negativeText: t('common.cancel'),
    onPositiveClick: async () => {
      try {
        await store.deleteServer(props.name)
        message.success(t('mcpServers.serverDeleted'))
      } catch (e: any) {
        message.error(e.message)
      }
    },
  })
}

async function handleEditSaved(data: { name: string; config: McpServerConfig }) {
  try {
    await store.updateServer(data.name, data.config)
    message.success(t('mcpServers.serverUpdated'))
    showEditModal.value = false
  } catch (e: any) {
    message.error(e.message)
  }
}
</script>

<template>
  <NCard size="small" class="mcp-card" :class="{ disabled: config.enabled === false }">
    <div class="card-header">
      <div class="card-title" @click="expanded = !expanded">
        <span class="server-name">{{ name }}</span>
        <NTag :type="transportType === 'stdio' ? 'default' : 'info'" size="small" :bordered="false">
          {{ transportType }}
        </NTag>
        <NTag v-if="config.enabled === false" type="error" size="small" :bordered="false">
          {{ t('common.disable') }}
        </NTag>
        <span class="summary">{{ summary }}</span>
        <svg class="expand-arrow" :class="{ expanded }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      <NSpace align="center" :size="8">
        <NSwitch
          :value="config.enabled !== false"
          size="small"
          @update:value="handleToggleEnabled"
        />
        <NButton size="tiny" quaternary @click="showEditModal = true">{{ t('common.edit') }}</NButton>
        <NButton size="tiny" quaternary type="error" @click="handleDelete">{{ t('common.delete') }}</NButton>
      </NSpace>
    </div>

    <div v-if="expanded" class="card-details">
      <div v-if="transportType === 'stdio'" class="detail-row">
        <span class="detail-label">Command:</span>
        <code>{{ config.command }}</code>
      </div>
      <div v-if="transportType === 'stdio' && config.args?.length" class="detail-row">
        <span class="detail-label">Args:</span>
        <code>{{ config.args.join(' ') }}</code>
      </div>
      <div v-if="transportType === 'http'" class="detail-row">
        <span class="detail-label">URL:</span>
        <code>{{ config.url }}</code>
      </div>
      <div v-if="config.timeout" class="detail-row">
        <span class="detail-label">Timeout:</span>
        <span>{{ config.timeout }}s</span>
      </div>
      <div v-if="config.env && Object.keys(config.env).length" class="detail-row">
        <span class="detail-label">Env:</span>
        <code>{{ Object.entries(config.env).map(([k, v]) => `${k}=${v}`).join(', ') }}</code>
      </div>
    </div>
  </NCard>

  <McpServerFormModal
    v-if="showEditModal"
    :edit-name="name"
    :edit-config="config"
    @close="showEditModal = false"
    @saved="handleEditSaved"
  />
</template>

<style scoped lang="scss">
.mcp-card {
  &.disabled {
    opacity: 0.6;
  }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  flex: 1;
  min-width: 0;
}

.server-name {
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.summary {
  font-size: 12px;
  color: var(--n-text-color-3, #999);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 1;
}

.expand-arrow {
  flex-shrink: 0;
  transition: transform 0.2s;
  &.expanded {
    transform: rotate(180deg);
  }
}

.card-details {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--n-border-color, #efeff1);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 13px;
}

.detail-label {
  color: var(--n-text-color-3, #999);
  flex-shrink: 0;
  min-width: 70px;
}

code {
  font-size: 12px;
  word-break: break-all;
}
</style>
