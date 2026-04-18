/**
 * Get a nested value from an object by dot-separated path.
 * e.g. getNestedValue(obj, "agent.max_turns") → obj.agent.max_turns
 */
export function getNestedValue(obj: Record<string, any>, path: string): any {
  const parts = path.split('.')
  let cur = obj
  for (const p of parts) {
    if (!cur || typeof cur !== 'object') return undefined
    cur = cur[p]
  }
  return cur
}

/**
 * Set a nested value in an object by dot-separated path.
 * Mutates the object. Returns it for convenience.
 */
export function setNestedValue(obj: Record<string, any>, path: string, value: any): Record<string, any> {
  const parts = path.split('.')
  let cur = obj
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') {
      cur[parts[i]] = {}
    }
    cur = cur[parts[i]]
  }
  cur[parts[parts.length - 1]] = value
  return obj
}
