<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMessage, NInput, NButton, NSpace } from 'naive-ui'
import { useHermesConfigStore } from '@/stores/hermes/hermes-config'

const { t } = useI18n()
const message = useMessage()
const store = useHermesConfigStore()

const localYaml = ref('')

onMounted(() => {
  if (!store.rawYaml) {
    store.loadRaw()
  }
})

watch(() => store.rawYaml, (val) => {
  if (!store.dirty) localYaml.value = val
}, { immediate: true })

watch(localYaml, (val) => {
  store.rawYaml = val
  store.dirty = true
})

async function handleSave() {
  try {
    await store.save()
    message.success(t('common.saved'))
  } catch (e: any) {
    message.error(e.message || t('common.saveFailed'))
  }
}
</script>

<template>
  <div class="yaml-editor">
    <div class="yaml-toolbar">
      <NButton size="small" @click="store.loadRaw()">
        {{ t('common.retry') }}
      </NButton>
      <NButton
        size="small"
        type="primary"
        :loading="store.saving"
        :disabled="!store.dirty"
        @click="handleSave"
      >
        {{ t('common.save') }}
      </NButton>
    </div>
    <NInput
      v-model:value="localYaml"
      type="textarea"
      :placeholder="t('hermesConfig.yamlPlaceholder')"
      :autosize="{ minRows: 20 }"
      font="monospace"
      style="flex: 1"
    />
  </div>
</template>

<style scoped lang="scss">
.yaml-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 12px;
}

.yaml-toolbar {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 8px;
}
</style>
