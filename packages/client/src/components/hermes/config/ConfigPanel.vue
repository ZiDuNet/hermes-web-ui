<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMessage, NInput, NButton, NSpace, NScrollbar } from 'naive-ui'
import { useHermesConfigStore } from '@/stores/hermes/hermes-config'
import { getNestedValue } from '@/shared/nested'
import CategoryNav from './CategoryNav.vue'
import AutoField from './AutoField.vue'

const { t } = useI18n()
const message = useMessage()
const store = useHermesConfigStore()

const activeCategory = ref('')
const searchQuery = ref('')

// Fields for the active category
const categoryFields = computed(() => {
  if (!store.schema) return []
  const { fields, category_order } = store.schema

  let entries = Object.entries(fields)

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    entries = entries.filter(([key, s]) =>
      key.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
    )
  } else if (activeCategory.value) {
    entries = entries.filter(([, s]) => s.category === activeCategory.value)
  }

  return entries.map(([key, schema]) => ({ key, schema }))
})

// Field count per category (for search result indicator)
const fieldCountPerCat = computed(() => {
  if (!store.schema) return {}
  const { fields } = store.schema
  const counts: Record<string, number> = {}
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    for (const [, s] of Object.entries(fields)) {
      if (key.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)) {
        counts[s.category] = (counts[s.category] || 0) + 1
      }
    }
  }
  return counts
})

function handleFieldChange(key: string, value: any) {
  store.updateField(key, value)
}

async function handleSave() {
  try {
    await store.save()
    message.success(t('common.saved'))
  } catch {
    message.error(t('common.saveFailed'))
  }
}

function handleResetToDefaults() {
  if (!store.defaults) return
  store.config = JSON.parse(JSON.stringify(store.defaults))
  message.info(t('hermesConfig.defaultsApplied'))
}

// ── Export / Import ─────────────────────────────────────────────

function handleExport() {
  if (!store.config) return
  const blob = new Blob([JSON.stringify(store.config, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'hermes-config.json'
  a.click()
  URL.revokeObjectURL(url)
}

const importInputRef = ref<HTMLInputElement>()

function triggerImport() {
  importInputRef.value?.click()
}

function handleImport(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result as string)
      store.config = imported
      message.success(t('hermesConfig.configImported'))
    } catch {
      message.error(t('hermesConfig.invalidJson'))
    }
  }
  reader.readAsText(file)
  input.value = ''
}

// Set initial active category
watch(() => store.schema, (schema) => {
  if (schema && !activeCategory.value) {
    activeCategory.value = schema.category_order[0] || ''
  }
}, { immediate: true })
</script>

<template>
  <div class="config-panel">
    <div class="config-toolbar">
      <NInput
        v-model:value="searchQuery"
        :placeholder="t('hermesConfig.searchPlaceholder')"
        size="small"
        clearable
        style="width: 240px"
      />
      <NSpace>
        <NButton size="small" @click="handleExport">
          {{ t('hermesConfig.export') }}
        </NButton>
        <NButton size="small" @click="triggerImport">
          {{ t('hermesConfig.import') }}
        </NButton>
        <input ref="importInputRef" type="file" accept=".json" style="display:none" @change="handleImport" />
        <NButton size="small" @click="handleResetToDefaults">
          {{ t('hermesConfig.resetDefaults') }}
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
      </NSpace>
    </div>
    <div class="config-body">
      <CategoryNav
        v-if="store.schema && !searchQuery"
        :categories="store.schema.category_order"
        :active="activeCategory"
        :search="searchQuery"
        :field-count="fieldCountPerCat"
        @update:active="activeCategory = $event"
      />
      <NScrollbar class="config-fields">
        <div class="fields-inner">
          <AutoField
            v-for="field in categoryFields"
            :key="field.key"
            :field-key="field.key"
            :schema="field.schema"
            :model-value="getNestedValue(store.config, field.key)"
            @update:model-value="handleFieldChange(field.key, $event)"
          />
          <div v-if="!categoryFields.length" class="no-fields">
            {{ t('common.noData') }}
          </div>
        </div>
      </NScrollbar>
    </div>
  </div>
</template>

<style scoped lang="scss">
.config-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.config-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-bottom: 1px solid var(--n-border-color, #efeff1);
  flex-shrink: 0;
}

.config-body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.config-fields {
  flex: 1;
}

.fields-inner {
  padding: 8px 16px;
}

.no-fields {
  text-align: center;
  padding: 40px 0;
  color: var(--n-text-color-disabled, #999);
}
</style>
