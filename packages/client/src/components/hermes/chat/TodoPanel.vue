<script setup lang="ts">
import { computed } from 'vue'
import { useChatStore } from '@/stores/hermes/chat'
import { useI18n } from 'vue-i18n'

const chatStore = useChatStore()
const { t } = useI18n()

interface TodoItem {
  id: string
  content: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
}

// Extract the most recent todo list from tool message content
const todos = computed<TodoItem[]>(() => {
  const msgs = chatStore.messages
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i]
    if (m.role === 'tool' && m.toolResult) {
      try {
        const parsed = JSON.parse(m.toolResult)
        if (parsed && Array.isArray(parsed.todos) && parsed.todos.length > 0) {
          return parsed.todos
        }
      } catch {
        // Not JSON or no todos — skip
      }
    }
  }
  return []
})

const statusIcon: Record<string, string> = {
  pending: '○',
  in_progress: '◐',
  completed: '●',
  cancelled: '✕',
}

const statusLabel: Record<string, string> = {
  pending: 'pending',
  in_progress: 'in progress',
  completed: 'completed',
  cancelled: 'cancelled',
}
</script>

<template>
  <div class="todo-panel">
    <div class="todo-header">
      <span class="todo-title">{{ t('chat.currentTasks') }}</span>
      <span v-if="todos.length" class="todo-count">{{ todos.length }}</span>
    </div>
    <div v-if="todos.length === 0" class="todo-empty">{{ t('chat.noActiveTasks') }}</div>
    <div v-else class="todo-list">
      <div v-for="item in todos" :key="item.id" class="todo-item" :class="item.status">
        <span class="todo-status-icon">{{ statusIcon[item.status] || '○' }}</span>
        <div class="todo-content">
          <span class="todo-text">{{ item.content }}</span>
          <span class="todo-meta">{{ item.id }} · {{ statusLabel[item.status] || item.status }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.todo-panel {
  padding: 0;
  overflow-y: auto;
}

.todo-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 14px 8px;
  flex-shrink: 0;
}

.todo-title {
  font-size: 11px;
  font-weight: 600;
  color: $text-muted;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.todo-count {
  font-size: 10px;
  color: $text-muted;
  background: rgba($text-muted, 0.12);
  padding: 0 6px;
  border-radius: 8px;
  line-height: 16px;
}

.todo-empty {
  padding: 16px 14px;
  font-size: 12px;
  color: $text-muted;
}

.todo-list {
  padding: 0 8px 12px;
}

.todo-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 6px;
  border-bottom: 1px solid $border-light;

  &:last-child { border-bottom: none; }

  &.completed {
    .todo-text { text-decoration: line-through; opacity: 0.45; }
    .todo-status-icon { color: $success; }
  }

  &.in_progress {
    .todo-status-icon { color: var(--accent-info); animation: pulse 1.5s infinite; }
  }

  &.cancelled {
    .todo-text { opacity: 0.35; }
    .todo-status-icon { color: $text-muted; }
  }

  &.pending {
    .todo-status-icon { color: $text-muted; }
  }
}

.todo-status-icon {
  font-size: 14px;
  flex-shrink: 0;
  margin-top: 1px;
  line-height: 1;
}

.todo-content {
  flex: 1;
  min-width: 0;
}

.todo-text {
  font-size: 13px;
  color: $text-primary;
  line-height: 1.4;
  word-break: break-word;
}

.todo-meta {
  display: block;
  font-size: 10px;
  color: $text-muted;
  margin-top: 2px;
  opacity: 0.6;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
