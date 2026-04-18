<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { NPageHeader, NSpin, NSwitch, NSpace } from 'naive-ui'
import { useHermesConfigStore } from '@/stores/hermes/hermes-config'
import ConfigPanel from '@/components/hermes/config/ConfigPanel.vue'
import YamlEditor from '@/components/hermes/config/YamlEditor.vue'

const { t } = useI18n()
const store = useHermesConfigStore()

onMounted(() => {
  store.loadConfig()
})
</script>

<template>
  <div class="config-view">
    <NPageHeader :title="t('hermesConfig.title')" class="page-header">
      <template #extra>
        <NSpace align="center">
          <span class="yaml-toggle-label">{{ t('hermesConfig.yamlMode') }}</span>
          <NSwitch v-model:value="store.yamlMode" size="small" />
        </NSpace>
      </template>
    </NPageHeader>
    <div class="config-content">
      <NSpin :show="store.loading">
        <YamlEditor v-if="store.yamlMode" />
        <ConfigPanel v-else />
      </NSpin>
    </div>
  </div>
</template>

<style scoped lang="scss">
.config-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
}

.page-header {
  flex-shrink: 0;
  margin-bottom: 12px;
}

.yaml-toggle-label {
  font-size: 13px;
  color: var(--n-text-color-2, #666);
}

.config-content {
  flex: 1;
  min-height: 0;
  border: 1px solid var(--n-border-color, #efeff1);
  border-radius: 6px;
  overflow: hidden;
}
</style>
