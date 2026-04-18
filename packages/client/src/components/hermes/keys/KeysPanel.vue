<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NInput, NCollapse, NCollapseItem, NTag, NScrollbar, NButton, NAlert } from 'naive-ui'
import { useKeysStore } from '@/stores/hermes/keys'
import EnvVarRow from './EnvVarRow.vue'

const { t } = useI18n()
const store = useKeysStore()

const searchQuery = ref('')
const showAdvanced = ref(true)

// Hardcoded provider groups matching hermes-agent EnvPage.tsx
interface ProviderGroupDef {
  prefix: string
  name: string
  priority: number
}

const PROVIDER_GROUPS: ProviderGroupDef[] = [
  { prefix: 'NOUS_',            name: 'Nous Portal',       priority: 0 },
  { prefix: 'ANTHROPIC_',       name: 'Anthropic',         priority: 1 },
  { prefix: 'DASHSCOPE_',       name: 'DashScope (Qwen)',  priority: 2 },
  { prefix: 'HERMES_QWEN_',     name: 'DashScope (Qwen)',  priority: 2 },
  { prefix: 'DEEPSEEK_',        name: 'DeepSeek',          priority: 3 },
  { prefix: 'GOOGLE_',          name: 'Gemini',            priority: 4 },
  { prefix: 'GEMINI_',          name: 'Gemini',            priority: 4 },
  { prefix: 'GLM_',             name: 'GLM / Z.AI',        priority: 5 },
  { prefix: 'ZAI_',             name: 'GLM / Z.AI',        priority: 5 },
  { prefix: 'Z_AI_',            name: 'GLM / Z.AI',        priority: 5 },
  { prefix: 'HF_',              name: 'Hugging Face',      priority: 6 },
  { prefix: 'KIMI_',            name: 'Kimi / Moonshot',   priority: 7 },
  { prefix: 'MINIMAX_',         name: 'MiniMax',           priority: 8 },
  { prefix: 'MINIMAX_CN_',      name: 'MiniMax (China)',   priority: 9 },
  { prefix: 'OPENCODE_GO_',     name: 'OpenCode Go',       priority: 10 },
  { prefix: 'OPENCODE_ZEN_',    name: 'OpenCode Zen',      priority: 11 },
  { prefix: 'OPENROUTER_',      name: 'OpenRouter',        priority: 12 },
  { prefix: 'XIAOMI_',          name: 'Xiaomi MiMo',       priority: 13 },
]

function getProviderGroupName(key: string): string {
  for (const g of PROVIDER_GROUPS) {
    if (key.startsWith(g.prefix)) return g.name
  }
  return 'Other'
}

function getProviderGroupPriority(name: string): number {
  return PROVIDER_GROUPS.find(g => g.name === name)?.priority ?? 99
}

// Build provider groups for display
interface ProviderGroup {
  name: string
  priority: number
  vars: import('@/api/hermes/env').EnvVarInfo[]
}

const providerGroups = computed<ProviderGroup[]>(() => {
  const { providers } = store.providerGroups
  const groupMap = new Map<string, ProviderGroup>()

  for (const vars of Object.values(providers)) {
    for (const v of vars) {
      const groupName = getProviderGroupName(v.key)
      if (!groupMap.has(groupName)) {
        groupMap.set(groupName, { name: groupName, priority: getProviderGroupPriority(groupName), vars: [] })
      }
      groupMap.get(groupName)!.vars.push(v)
    }
  }

  return Array.from(groupMap.values()).sort((a, b) => a.priority - b.priority)
})

const messagingVars = computed(() => store.providerGroups.messaging)
const toolVars = computed(() => store.providerGroups.tools)
const settingVars = computed(() => store.providerGroups.settings)

function filterVars(vars: import('@/api/hermes/env').EnvVarInfo[]) {
  let result = vars
  if (!showAdvanced.value) {
    result = result.filter(v => !v.advanced)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(v =>
      v.key.toLowerCase().includes(q) ||
      v.description.toLowerCase().includes(q)
    )
  }
  return result
}

function splitBySetState(vars: import('@/api/hermes/env').EnvVarInfo[]) {
  const filtered = filterVars(vars)
  const configured = filtered.filter(v => v.set)
  const notConfigured = filtered.filter(v => !v.set)
  return { configured, notConfigured }
}
</script>

<template>
  <div class="keys-panel">
    <div class="keys-header">
      <div class="keys-toolbar">
        <NInput
          v-model:value="searchQuery"
          :placeholder="t('hermesKeys.searchPlaceholder')"
          size="small"
          clearable
          style="width: 300px"
        />
        <NButton
          size="small"
          :type="showAdvanced ? 'primary' : 'default'"
          @click="showAdvanced = !showAdvanced"
        >
          {{ showAdvanced ? t('hermesKeys.hideAdvanced') : t('hermesKeys.showAdvanced') }}
        </NButton>
      </div>
      <NAlert :title="t('hermesKeys.providerHint')" type="info" :bordered="false" style="margin-top: 8px" />
    </div>
    <NScrollbar class="keys-body">
      <NCollapse :default-expanded-names="['providers']">
        <!-- Provider API Keys -->
        <NCollapseItem :title="t('hermesKeys.providers')" name="providers">
          <template #header-extra>
            <NTag size="small" :bordered="false">{{ providerGroups.length }}</NTag>
          </template>
          <div v-for="group in providerGroups" :key="group.name" class="provider-group">
            <div class="provider-name">
              {{ group.name }}
              <a
                v-if="group.vars.find(v => v.url)"
                :href="group.vars.find(v => v.url)!.url!"
                target="_blank"
                class="provider-url"
              >{{ t('hermesKeys.getApiKey') }}</a>
            </div>
            <template v-if="splitBySetState(group.vars).configured.length || splitBySetState(group.vars).notConfigured.length">
              <EnvVarRow
                v-for="v in splitBySetState(group.vars).configured"
                :key="v.key"
                :info="v"
              />
              <NCollapse v-if="splitBySetState(group.vars).notConfigured.length" class="not-configured-collapse">
                <NCollapseItem>
                  <template #header>
                    <span class="not-configured-header">
                      {{ t('hermesKeys.notConfigured', { count: splitBySetState(group.vars).notConfigured.length }) }}
                    </span>
                  </template>
                  <EnvVarRow
                    v-for="v in splitBySetState(group.vars).notConfigured"
                    :key="v.key"
                    :info="v"
                  />
                </NCollapseItem>
              </NCollapse>
            </template>
          </div>
        </NCollapseItem>

        <!-- Messaging Platform Keys -->
        <NCollapseItem :title="t('hermesKeys.messaging')" name="messaging">
          <template #header-extra>
            <NTag size="small" :bordered="false">{{ messagingVars.length }}</NTag>
          </template>
          <EnvVarRow
            v-for="v in splitBySetState(messagingVars).configured"
            :key="v.key"
            :info="v"
          />
          <NCollapse v-if="splitBySetState(messagingVars).notConfigured.length" class="not-configured-collapse">
            <NCollapseItem>
              <template #header>
                <span class="not-configured-header">
                  {{ t('hermesKeys.notConfigured', { count: splitBySetState(messagingVars).notConfigured.length }) }}
                </span>
              </template>
              <EnvVarRow
                v-for="v in splitBySetState(messagingVars).notConfigured"
                :key="v.key"
                :info="v"
              />
            </NCollapseItem>
          </NCollapse>
        </NCollapseItem>

        <!-- Tool API Keys -->
        <NCollapseItem :title="t('hermesKeys.tools')" name="tools">
          <template #header-extra>
            <NTag size="small" :bordered="false">{{ toolVars.length }}</NTag>
          </template>
          <EnvVarRow
            v-for="v in splitBySetState(toolVars).configured"
            :key="v.key"
            :info="v"
          />
          <NCollapse v-if="splitBySetState(toolVars).notConfigured.length" class="not-configured-collapse">
            <NCollapseItem>
              <template #header>
                <span class="not-configured-header">
                  {{ t('hermesKeys.notConfigured', { count: splitBySetState(toolVars).notConfigured.length }) }}
                </span>
              </template>
              <EnvVarRow
                v-for="v in splitBySetState(toolVars).notConfigured"
                :key="v.key"
                :info="v"
              />
            </NCollapseItem>
          </NCollapse>
        </NCollapseItem>

        <!-- Settings -->
        <NCollapseItem v-if="settingVars.length" :title="t('hermesKeys.settings')" name="settings">
          <template #header-extra>
            <NTag size="small" :bordered="false">{{ settingVars.length }}</NTag>
          </template>
          <EnvVarRow
            v-for="v in splitBySetState(settingVars).configured"
            :key="v.key"
            :info="v"
          />
          <NCollapse v-if="splitBySetState(settingVars).notConfigured.length" class="not-configured-collapse">
            <NCollapseItem>
              <template #header>
                <span class="not-configured-header">
                  {{ t('hermesKeys.notConfigured', { count: splitBySetState(settingVars).notConfigured.length }) }}
                </span>
              </template>
              <EnvVarRow
                v-for="v in splitBySetState(settingVars).notConfigured"
                :key="v.key"
                :info="v"
              />
            </NCollapseItem>
          </NCollapse>
        </NCollapseItem>
      </NCollapse>
    </NScrollbar>
  </div>
</template>

<style scoped lang="scss">
.keys-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.keys-header {
  padding: 8px 16px;
  border-bottom: 1px solid var(--n-border-color, #efeff1);
  flex-shrink: 0;
}

.keys-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.keys-body {
  flex: 1;
  padding: 0 16px;
}

.provider-group {
  margin-bottom: 12px;

  .provider-name {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    padding: 6px 12px;
    background: var(--n-color-hover, #f5f5f7);
    border-radius: 4px;
    margin-bottom: 2px;

    .provider-url {
      font-size: 11px;
      font-weight: 400;
      color: var(--n-text-color-2, #666);
      text-decoration: underline;
      margin-left: auto;
    }
  }
}

.not-configured-collapse {
  margin-top: 4px;
}

.not-configured-header {
  font-size: 12px;
  color: var(--n-text-color-3, #999);
  font-style: italic;
}
</style>
