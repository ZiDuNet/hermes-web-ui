import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  fetchMcpServers,
  addMcpServer as apiAdd,
  updateMcpServer as apiUpdate,
  deleteMcpServer as apiDelete,
  type McpServerConfig,
} from '@/api/hermes/mcp-servers'

export const useMcpServersStore = defineStore('mcpServers', () => {
  const servers = ref<Record<string, McpServerConfig>>({})
  const loading = ref(false)

  async function loadServers() {
    loading.value = true
    try {
      servers.value = await fetchMcpServers()
    } finally {
      loading.value = false
    }
  }

  async function addServer(name: string, config: McpServerConfig) {
    await apiAdd(name, config)
    await loadServers()
  }

  async function updateServer(name: string, config: McpServerConfig) {
    await apiUpdate(name, config)
    await loadServers()
  }

  async function deleteServer(name: string) {
    await apiDelete(name)
    await loadServers()
  }

  return { servers, loading, loadServers, addServer, updateServer, deleteServer }
})
