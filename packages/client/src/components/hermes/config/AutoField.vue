<script setup lang="ts">
import { computed } from 'vue'
import { NSwitch, NSelect, NInput, NInputNumber } from 'naive-ui'
import type { HermesSchemaField } from '@/api/hermes/hermes-config'

const props = defineProps<{
  fieldKey: string
  schema: HermesSchemaField
  modelValue: any
}>()

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

const currentValue = computed({
  get: () => props.modelValue,
  set: (val: any) => emit('update:modelValue', val),
})

const selectOptions = computed(() => {
  if (!props.schema.options) return []
  return props.schema.options.map((opt) => ({
    label: opt || '(empty)',
    value: opt,
  }))
})

const isMultiline = computed(() => {
  const desc = (props.schema.description || '').toLowerCase()
  return desc.includes('prompt') || desc.includes('instructions') || desc.includes('template')
    || desc.includes('system') || desc.includes('message') || desc.includes('content')
})

// Detect if value is a nested object (not array, not null)
const isObjectType = computed(() => {
  const val = props.modelValue
  return val !== null && val !== undefined && typeof val === 'object' && !Array.isArray(val)
})

const objectEntries = computed(() => {
  if (!isObjectType.value) return []
  return Object.entries(props.modelValue as Record<string, any>)
})

function updateObjectSubKey(subKey: string, subVal: string) {
  const obj = { ...(props.modelValue as Record<string, any>) }
  obj[subKey] = subVal
  emit('update:modelValue', obj)
}
</script>

<template>
  <div class="auto-field" :class="{ 'auto-field--object': isObjectType }">
    <div class="field-label" :title="fieldKey">
      {{ schema.description || fieldKey }}
    </div>
    <div class="field-control">
      <!-- Nested object -->
      <div v-if="isObjectType" class="object-container">
        <div v-for="entry in objectEntries" :key="entry[0]" class="object-row">
          <span class="object-sub-key">{{ entry[0] }}</span>
          <NInput
            :value="String(entry[1] ?? '')"
            size="small"
            @update:value="(v: string) => updateObjectSubKey(entry[0], v)"
            style="flex: 1"
          />
        </div>
      </div>
      <!-- Boolean -->
      <NSwitch
        v-else-if="schema.type === 'boolean'"
        v-model:value="currentValue"
        size="small"
      />
      <!-- Select -->
      <NSelect
        v-else-if="schema.type === 'select'"
        v-model:value="currentValue"
        :options="selectOptions"
        size="small"
        clearable
        style="min-width: 180px"
      />
      <!-- Number -->
      <NInputNumber
        v-else-if="schema.type === 'number'"
        v-model:value="currentValue"
        size="small"
        :show-button="false"
        style="width: 180px"
      />
      <!-- List -->
      <NInput
        v-else-if="schema.type === 'list'"
        :value="Array.isArray(currentValue) ? currentValue.join(', ') : (currentValue || '')"
        @update:value="(v: string) => currentValue = v ? v.split(',').map((s: string) => s.trim()).filter(Boolean) : []"
        size="small"
        placeholder="Comma-separated values"
        style="min-width: 240px"
      />
      <!-- Multiline string -->
      <NInput
        v-else-if="isMultiline"
        v-model:value="currentValue"
        type="textarea"
        size="small"
        :autosize="{ minRows: 2, maxRows: 6 }"
        style="min-width: 300px"
      />
      <!-- Default string -->
      <NInput
        v-else
        v-model:value="currentValue"
        size="small"
        style="min-width: 240px"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.auto-field {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--n-border-color, #efeff1);

  .field-label {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    color: var(--n-text-color, #333);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .field-control {
    flex-shrink: 0;
  }

  &.auto-field--object {
    flex-direction: column;
    align-items: stretch;

    .field-control {
      width: 100%;
      flex-shrink: 1;
    }
  }
}

.object-container {
  border: 1px solid var(--n-border-color, #efeff1);
  border-radius: 4px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.object-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.object-sub-key {
  font-size: 11px;
  font-family: monospace;
  color: var(--n-text-color-2, #666);
  min-width: 100px;
  flex-shrink: 0;
}
</style>
