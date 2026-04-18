import { request } from '../client'

export interface EnvVarMeta {
  description: string
  prompt: string
  url: string | null
  password: boolean
  tools?: string[]
  category: string
  advanced?: boolean
}

export interface EnvVarInfo extends EnvVarMeta {
  key: string
  value: string
  masked: string
  set: boolean
}

export async function fetchEnvVars(): Promise<Record<string, EnvVarInfo>> {
  const res = await request<{ vars: Record<string, EnvVarInfo> }>('/api/hermes/env')
  return res.vars
}

export async function setEnvVar(key: string, value: string): Promise<void> {
  await request('/api/hermes/env', {
    method: 'PUT',
    body: JSON.stringify({ key, value }),
  })
}

export async function deleteEnvVar(key: string): Promise<void> {
  await request('/api/hermes/env', {
    method: 'DELETE',
    body: JSON.stringify({ key }),
  })
}

export async function revealEnvVar(key: string): Promise<string> {
  const res = await request<{ value: string }>('/api/hermes/env/reveal', {
    method: 'POST',
    body: JSON.stringify({ key }),
  })
  return res.value
}
