import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  fetchEnvVars,
  setEnvVar,
  deleteEnvVar,
  revealEnvVar,
  type EnvVarInfo,
} from '@/api/hermes/env'

export const useKeysStore = defineStore('keys', () => {
  const vars = ref<Record<string, EnvVarInfo>>({})
  const loading = ref(false)
  const revealed = ref<Record<string, string>>({})
  const editing = ref<Record<string, string>>({})

  // Grouped by category
  const grouped = computed(() => {
    const groups: Record<string, EnvVarInfo[]> = {}
    for (const info of Object.values(vars.value)) {
      const cat = info.category || 'other'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(info)
    }
    // Sort within each group: non-advanced first
    for (const cat of Object.keys(groups)) {
      groups[cat].sort((a, b) => {
        if (a.advanced !== b.advanced) return a.advanced ? 1 : -1
        return a.key.localeCompare(b.key)
      })
    }
    return groups
  })

  // Provider names extracted from env var keys (e.g. DEEPSEEK_API_KEY → DeepSeek)
  const providerGroups = computed(() => {
    const providers: Record<string, EnvVarInfo[]> = {}
    const messaging: EnvVarInfo[] = []
    const tools: EnvVarInfo[] = []
    const settings: EnvVarInfo[] = []

    for (const info of Object.values(vars.value)) {
      if (info.category === 'provider') {
        // Extract provider name from key prefix
        const prefix = info.key.split('_').slice(0, -1).join('_')
        // Find a human-readable name from the first var of this prefix
        if (!providers[prefix]) providers[prefix] = []
        providers[prefix].push(info)
      } else if (info.category === 'messaging') {
        messaging.push(info)
      } else if (info.category === 'tool') {
        tools.push(info)
      } else {
        settings.push(info)
      }
    }
    return { providers, messaging, tools, settings }
  })

  async function load() {
    loading.value = true
    try {
      vars.value = await fetchEnvVars()
      revealed.value = {}
      editing.value = {}
    } finally {
      loading.value = false
    }
  }

  async function set(key: string, value: string) {
    await setEnvVar(key, value)
    // Update local state
    if (vars.value[key]) {
      vars.value[key] = {
        ...vars.value[key],
        value,
        masked: value ? maskValue(value) : '',
        set: !!value,
      }
    }
    delete editing.value[key]
    delete revealed.value[key]
  }

  async function remove(key: string) {
    await deleteEnvVar(key)
    if (vars.value[key]) {
      vars.value[key] = {
        ...vars.value[key],
        value: '',
        masked: '',
        set: false,
      }
    }
    delete editing.value[key]
    delete revealed.value[key]
  }

  async function reveal(key: string) {
    const val = await revealEnvVar(key)
    revealed.value[key] = val
  }

  function maskValue(val: string): string {
    if (val.length <= 8) return '...'
    return val.slice(0, 4) + '...' + val.slice(-4)
  }

  return {
    vars, loading, revealed, editing,
    grouped, providerGroups,
    load, set, remove, reveal,
  }
})
