import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as workspacesApi from '@/api/hermes/workspaces'
import type { WorkspaceEntry } from '@/api/hermes/workspaces'

export const useWorkspacesStore = defineStore('workspaces', () => {
  const workspaces = ref<WorkspaceEntry[]>([])
  const activeWorkspace = ref('')
  const loading = ref(false)

  async function fetchWorkspaces() {
    loading.value = true
    try {
      const res = await workspacesApi.fetchWorkspaces()
      workspaces.value = res.workspaces || []
      activeWorkspace.value = res.last || ''
    } catch (err) {
      console.error('Failed to fetch workspaces:', err)
    } finally {
      loading.value = false
    }
  }

  async function addWorkspace(path: string) {
    const res = await workspacesApi.addWorkspace(path)
    workspaces.value = res.workspaces || []
    return res
  }

  async function removeWorkspace(path: string) {
    const res = await workspacesApi.removeWorkspace(path)
    workspaces.value = res.workspaces || []
    return res
  }

  async function switchWorkspace(sessionId: string, workspace: string, model?: string) {
    await workspacesApi.switchWorkspace(sessionId, workspace, model)
    activeWorkspace.value = workspace
  }

  function getWorkspaceName(path: string): string {
    const entry = workspaces.value.find(w => w.path === path)
    if (entry) return entry.name
    // Fallback: last segment of path
    const parts = path.replace(/\\/g, '/').split('/')
    return parts[parts.length - 1] || path
  }

  return {
    workspaces,
    activeWorkspace,
    loading,
    fetchWorkspaces,
    addWorkspace,
    removeWorkspace,
    switchWorkspace,
    getWorkspaceName,
  }
})
