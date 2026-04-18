<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { NPageHeader, NSpin } from 'naive-ui'
import { useKeysStore } from '@/stores/hermes/keys'
import KeysPanel from '@/components/hermes/keys/KeysPanel.vue'

const { t } = useI18n()
const store = useKeysStore()

onMounted(() => {
  store.load()
})
</script>

<template>
  <div class="keys-view">
    <NPageHeader :title="t('hermesKeys.title')" class="page-header" />
    <div class="keys-content">
      <NSpin :show="store.loading">
        <KeysPanel />
      </NSpin>
    </div>
  </div>
</template>

<style scoped lang="scss">
.keys-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
}

.page-header {
  flex-shrink: 0;
  margin-bottom: 12px;
}

.keys-content {
  flex: 1;
  min-height: 0;
  border: 1px solid var(--n-border-color, #efeff1);
  border-radius: 6px;
  overflow: hidden;
}
</style>
