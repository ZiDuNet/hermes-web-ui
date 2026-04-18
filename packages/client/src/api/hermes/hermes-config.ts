import { request } from '../client'

export interface HermesSchemaField {
  type: 'string' | 'number' | 'boolean' | 'select' | 'list'
  description: string
  category: string
  options?: string[]
}

export interface HermesSchema {
  fields: Record<string, HermesSchemaField>
  category_order: string[]
}

export async function fetchHermesConfig(): Promise<Record<string, any>> {
  const res = await request<{ config: Record<string, any> }>('/api/hermes/hermes-config')
  return res.config
}

export async function saveHermesConfig(config: Record<string, any>): Promise<void> {
  await request('/api/hermes/hermes-config', {
    method: 'PUT',
    body: JSON.stringify({ config }),
  })
}

export async function fetchHermesDefaults(): Promise<Record<string, any>> {
  return request<Record<string, any>>('/api/hermes/hermes-config/defaults')
}

export async function fetchHermesSchema(): Promise<HermesSchema> {
  return request<HermesSchema>('/api/hermes/hermes-config/schema')
}

export async function fetchHermesConfigRaw(): Promise<string> {
  const res = await request<{ raw: string }>('/api/hermes/hermes-config/raw')
  return res.raw
}

export async function saveHermesConfigRaw(raw: string): Promise<void> {
  await request('/api/hermes/hermes-config/raw', {
    method: 'PUT',
    body: JSON.stringify({ raw }),
  })
}
