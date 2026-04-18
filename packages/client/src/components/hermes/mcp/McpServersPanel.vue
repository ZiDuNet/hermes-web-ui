<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { NButton, NEmpty, NSpin, useMessage } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { useMcpServersStore } from '@/stores/hermes/mcp-servers'
import McpServerCard from './McpServerCard.vue'
import McpServerFormModal from './McpServerFormModal.vue'
import { ref } from 'vue'
import type { McpServerConfig } from '@/api/hermes/mcp-servers'

const { t } = useI18n()
const message = useMessage()
const store = useMcpServersStore()
const showAddModal = ref(false)

const serverList = computed(() => {
  return Object.entries(store.servers).map(([name, config]) => ({
    name,
    config,
  }))
})

onMounted(() => {
  store.loadServers()
})

async function handleAddSaved(data: { name: string; config: McpServerConfig }) {
  try {
    await store.addServer(data.name, data.config)
    message.success(t('mcpServers.serverAdded'))
    showAddModal.value = false
  } catch (e: any) {
    message.error(e.message)
  }
}
</script>

<template>
  <div class="mcp-servers-panel">
    <div class="panel-header">
      <h2>{{ t('mcpServers.title') }}</h2>
      <NButton type="primary" size="small" @click="showAddModal = true">
        + {{ t('mcpServers.addServer') }}
      </NButton>
    </div>

    <NSpin :show="store.loading">
      <div v-if="serverList.length > 0" class="server-list">
        <McpServerCard
          v-for="item in serverList"
          :key="item.name"
          :name="item.name"
          :config="item.config"
        />
      </div>
      <NEmpty v-else :description="t('mcpServers.noServers')" style="padding: 60px 0" />
    </NSpin>

    <McpServerFormModal
      v-if="showAddModal"
      @close="showAddModal = false"
      @saved="handleAddSaved"
    />
  </div>
</template>

<style scoped lang="scss">
.mcp-servers-panel {
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;

  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }
}

.server-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
