<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NModal, NForm, NFormItem, NInput, NInputNumber, NButton, NRadioGroup, NRadio, NSwitch, useMessage } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import type { McpServerConfig } from '@/api/hermes/mcp-servers'

const { t } = useI18n()
const message = useMessage()

const props = defineProps<{
  editName?: string
  editConfig?: McpServerConfig
}>()

const emit = defineEmits<{
  close: []
  saved: [data: { name: string; config: McpServerConfig }]
}>()

const showModal = ref(true)
const loading = ref(false)

const serverName = ref('')
const transportType = ref<'stdio' | 'http'>('stdio')
const command = ref('')
const args = ref('')
const url = ref('')
const enabled = ref(true)
const timeout = ref<number | null>(null)
const envPairs = ref<Array<{ key: string; value: string }>>([])

// 初始化编辑模式
if (props.editName && props.editConfig) {
  serverName.value = props.editName
  const cfg = props.editConfig
  if (cfg.url) {
    transportType.value = 'http'
    url.value = cfg.url
  } else {
    transportType.value = 'stdio'
    command.value = cfg.command || ''
    args.value = (cfg.args || []).join(' ')
  }
  enabled.value = cfg.enabled !== false
  timeout.value = cfg.timeout ?? null
  if (cfg.env) {
    envPairs.value = Object.entries(cfg.env).map(([key, value]) => ({ key, value }))
  }
}

const isEdit = computed(() => !!props.editName)

watch(transportType, () => {
  // 切换类型时清空相关字段
  if (transportType.value === 'stdio') {
    url.value = ''
  } else {
    command.value = ''
    args.value = ''
  }
})

function addEnvPair() {
  envPairs.value.push({ key: '', value: '' })
}

function removeEnvPair(index: number) {
  envPairs.value.splice(index, 1)
}

function buildConfig(): McpServerConfig {
  const config: McpServerConfig = {
    enabled: enabled.value,
  }

  if (transportType.value === 'stdio') {
    config.command = command.value.trim() || undefined
    const argsList = args.value.trim()
      ? args.value.trim().split(/\s+/).filter(Boolean)
      : undefined
    if (argsList && argsList.length > 0) {
      config.args = argsList
    }
  } else {
    config.url = url.value.trim() || undefined
  }

  if (timeout.value != null && timeout.value > 0) {
    config.timeout = timeout.value
  }

  const envObj: Record<string, string> = {}
  for (const pair of envPairs.value) {
    if (pair.key.trim()) {
      envObj[pair.key.trim()] = pair.value
    }
  }
  if (Object.keys(envObj).length > 0) {
    config.env = envObj
  }

  return config
}

function validate(): boolean {
  if (!serverName.value.trim()) {
    message.warning(t('mcpServers.nameRequired'))
    return false
  }
  if (transportType.value === 'stdio' && !command.value.trim()) {
    message.warning(t('mcpServers.commandRequired'))
    return false
  }
  if (transportType.value === 'http' && !url.value.trim()) {
    message.warning(t('mcpServers.urlRequired'))
    return false
  }
  return true
}

async function handleSave() {
  if (!validate()) return
  loading.value = true
  try {
    const config = buildConfig()
    emit('saved', { name: serverName.value.trim(), config })
  } finally {
    loading.value = false
  }
}

function handleClose() {
  showModal.value = false
  setTimeout(() => emit('close'), 200)
}
</script>

<template>
  <NModal
    v-model:show="showModal"
    preset="card"
    :title="isEdit ? t('mcpServers.editServer') : t('mcpServers.addServer')"
    :style="{ width: 'min(540px, calc(100vw - 32px))' }"
    :mask-closable="!loading"
    @after-leave="emit('close')"
  >
    <NForm label-placement="top">
      <NFormItem :label="t('mcpServers.serverName')" required>
        <NInput
          v-model:value="serverName"
          :placeholder="t('mcpServers.serverName')"
          :disabled="isEdit"
        />
      </NFormItem>

      <NFormItem :label="t('mcpServers.transportType')">
        <NRadioGroup v-model:value="transportType">
          <NRadio value="stdio">stdio</NRadio>
          <NRadio value="http">http</NRadio>
        </NRadioGroup>
      </NFormItem>

      <!-- stdio 字段 -->
      <template v-if="transportType === 'stdio'">
        <NFormItem :label="t('mcpServers.command')" required>
          <NInput
            v-model:value="command"
            :placeholder="t('mcpServers.commandPlaceholder')"
          />
        </NFormItem>
        <NFormItem :label="t('mcpServers.args')">
          <NInput
            v-model:value="args"
            :placeholder="t('mcpServers.argsPlaceholder')"
          />
        </NFormItem>
      </template>

      <!-- http 字段 -->
      <template v-else>
        <NFormItem :label="'URL'" required>
          <NInput
            v-model:value="url"
            :placeholder="t('mcpServers.urlPlaceholder')"
          />
        </NFormItem>
      </template>

      <!-- 通用字段 -->
      <NFormItem :label="t('mcpServers.enabled')">
        <NSwitch v-model:value="enabled" />
      </NFormItem>

      <NFormItem :label="t('mcpServers.timeout')">
        <NInputNumber
          v-model:value="timeout"
          :min="1"
          :placeholder="t('mcpServers.timeout')"
          clearable
          style="width: 180px"
        />
      </NFormItem>

      <!-- 环境变量 -->
      <NFormItem :label="t('mcpServers.envVars')">
        <div class="env-list">
          <div v-for="(pair, i) in envPairs" :key="i" class="env-row">
            <NInput
              v-model:value="pair.key"
              :placeholder="t('mcpServers.envKey')"
              size="small"
              style="flex: 1"
            />
            <NInput
              v-model:value="pair.value"
              :placeholder="t('mcpServers.envValue')"
              size="small"
              style="flex: 1"
            />
            <NButton size="small" quaternary @click="removeEnvPair(i)">×</NButton>
          </div>
          <NButton size="small" dashed block @click="addEnvPair">
            + {{ t('mcpServers.addEnvVar') }}
          </NButton>
        </div>
      </NFormItem>
    </NForm>

    <template #footer>
      <div class="modal-footer">
        <NButton @click="handleClose">{{ t('common.cancel') }}</NButton>
        <NButton type="primary" :loading="loading" @click="handleSave">
          {{ isEdit ? t('common.update') : t('common.add') }}
        </NButton>
      </div>
    </template>
  </NModal>
</template>

<style scoped lang="scss">
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.env-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.env-row {
  display: flex;
  gap: 6px;
  align-items: center;
}
</style>
