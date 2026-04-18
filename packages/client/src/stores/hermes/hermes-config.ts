import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  fetchHermesConfig,
  saveHermesConfig,
  fetchHermesDefaults,
  fetchHermesSchema,
  fetchHermesConfigRaw,
  saveHermesConfigRaw,
  type HermesSchema,
} from '@/api/hermes/hermes-config'

export const useHermesConfigStore = defineStore('hermesConfig', () => {
  const config = ref<Record<string, any>>({})
  const schema = ref<HermesSchema | null>(null)
  const defaults = ref<Record<string, any>>({})
  const rawYaml = ref('')
  const loading = ref(false)
  const saving = ref(false)
  const dirty = ref(false)
  const yamlMode = ref(false)

  async function loadConfig() {
    loading.value = true
    try {
      const [c, s, d] = await Promise.all([
        fetchHermesConfig(),
        fetchHermesSchema(),
        fetchHermesDefaults(),
      ])
      config.value = c
      schema.value = s
      defaults.value = d
      dirty.value = false
    } finally {
      loading.value = false
    }
  }

  async function loadRaw() {
    loading.value = true
    try {
      rawYaml.value = await fetchHermesConfigRaw()
    } finally {
      loading.value = false
    }
  }

  async function save() {
    saving.value = true
    try {
      if (yamlMode.value) {
        await saveHermesConfigRaw(rawYaml.value)
      } else {
        await saveHermesConfig(config.value)
      }
      dirty.value = false
    } finally {
      saving.value = false
    }
  }

  function updateField(path: string, value: any) {
    const parts = path.split('.')
    let cur: any = config.value
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') {
        cur[parts[i]] = {}
      }
      cur = cur[parts[i]]
    }
    cur[parts[parts.length - 1]] = value
    dirty.value = true
  }

  return {
    config, schema, defaults, rawYaml,
    loading, saving, dirty, yamlMode,
    loadConfig, loadRaw, save, updateField,
  }
})
