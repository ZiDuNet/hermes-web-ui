<script setup lang="ts">
import McpServersPanel from '@/components/hermes/mcp/McpServersPanel.vue'
</script>

<template>
  <div class="mcp-servers-view">
    <McpServersPanel />
  </div>
</template>

<style scoped lang="scss">
.mcp-servers-view {
  height: 100%;
  overflow-y: auto;
}
</style>
