<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMessage, NInput, NButton, NPopconfirm } from 'naive-ui'
import type { EnvVarInfo } from '@/api/hermes/env'
import { useKeysStore } from '@/stores/hermes/keys'

const props = defineProps<{
  info: EnvVarInfo
}>()

const { t } = useI18n()
const message = useMessage()
const store = useKeysStore()

const editing = ref(false)
const editValue = ref('')
const saving = ref(false)
const revealing = ref(false)
const revealedVisible = ref(false)

function startEdit() {
  editValue.value = ''
  editing.value = true
}

function cancelEdit() {
  editing.value = false
  editValue.value = ''
}

async function handleSave() {
  saving.value = true
  try {
    await store.set(props.info.key, editValue.value)
    editing.value = false
    editValue.value = ''
    message.success(`${props.info.key} ${t('common.saved')}`)
  } catch {
    message.error(t('common.saveFailed'))
  } finally {
    saving.value = false
  }
}

async function handleReveal() {
  // Toggle: if already revealed, hide it
  if (revealedVisible.value) {
    revealedVisible.value = false
    return
  }
  revealing.value = true
  try {
    await store.reveal(props.info.key)
    revealedVisible.value = true
  } catch (e: any) {
    message.error(e.message || 'Failed to reveal')
  } finally {
    revealing.value = false
  }
}

async function handleDelete() {
  try {
    await store.remove(props.info.key)
    message.success(`${props.info.key} ${t('common.delete')}`)
  } catch {
    message.error(t('common.saveFailed'))
  }
}

const displayValue = () => {
  if (revealedVisible.value && store.revealed[props.info.key] !== undefined) {
    return store.revealed[props.info.key]
  }
  return props.info.masked || '(not set)'
}
</script>

<template>
  <div class="env-var-row" :class="{ advanced: info.advanced }">
    <div class="var-key">
      <span class="key-name">{{ info.key }}</span>
      <span v-if="info.advanced" class="advanced-badge">Advanced</span>
    </div>
    <div class="var-desc">{{ info.description }}</div>
    <div class="var-value">
      <template v-if="editing">
        <NInput
          v-model:value="editValue"
          size="small"
          :type="info.password ? 'password' : 'text'"
          :placeholder="info.prompt"
          show-password-on="click"
          style="flex: 1"
          @keydown.enter="handleSave"
          @keydown.escape="cancelEdit"
        />
      </template>
      <template v-else>
        <span class="value-display" :class="{ empty: !info.set }">
          {{ displayValue() }}
        </span>
      </template>
    </div>
    <div class="var-actions">
      <template v-if="editing">
        <NButton size="tiny" :loading="saving" @click="handleSave">
          {{ t('common.save') }}
        </NButton>
        <NButton size="tiny" @click="cancelEdit">
          {{ t('common.cancel') }}
        </NButton>
      </template>
      <template v-else>
        <NButton size="tiny" @click="startEdit">
          {{ info.set ? t('common.edit') : t('common.add') }}
        </NButton>
        <NButton
          v-if="info.password && info.set"
          size="tiny"
          :loading="revealing"
          @click="handleReveal"
        >
          {{ t('hermesKeys.reveal') }}
        </NButton>
        <NPopconfirm v-if="info.set" @positive-click="handleDelete">
          <template #trigger>
            <NButton size="tiny" type="error" ghost>
              {{ t('common.delete') }}
            </NButton>
          </template>
          {{ t('hermesKeys.deleteConfirm') }}
        </NPopconfirm>
        <a
          v-if="info.url"
          :href="info.url"
          target="_blank"
          class="url-link"
        >
          {{ t('hermesKeys.getApiKey') }}
        </a>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.env-var-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--n-border-color, #efeff1);

  &.advanced {
    opacity: 0.7;
  }

  &:hover {
    background: var(--n-color-hover, #f9f9fb);
  }
}

.var-key {
  flex-shrink: 0;
  min-width: 180px;

  .key-name {
    font-family: monospace;
    font-size: 12px;
    font-weight: 600;
  }

  .advanced-badge {
    margin-left: 6px;
    font-size: 10px;
    padding: 1px 4px;
    border-radius: 3px;
    background: var(--n-color-hover, #eee);
    color: var(--n-text-color-disabled, #999);
  }
}

.var-desc {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: var(--n-text-color-2, #666);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.var-value {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  min-width: 200px;

  .value-display {
    font-family: monospace;
    font-size: 12px;

    &.empty {
      color: var(--n-text-color-disabled, #999);
      font-style: italic;
    }
  }
}

.var-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}

.url-link {
  font-size: 11px;
  color: var(--n-text-color, #666);
  text-decoration: underline;
  white-space: nowrap;
}
</style>
