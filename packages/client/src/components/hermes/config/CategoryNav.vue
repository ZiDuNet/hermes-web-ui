<script setup lang="ts">
import { computed } from 'vue'
import { NMenu } from 'naive-ui'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  categories: string[]
  active: string
  search: string
  fieldCount: Record<string, number>
}>()

const emit = defineEmits<{
  'update:active': [value: string]
}>()

const { t } = useI18n()

const menuOptions = computed(() => {
  return props.categories
    .filter((cat) => {
      if (!props.search) return true
      return (props.fieldCount[cat] || 0) > 0
    })
    .map((cat) => ({
      key: cat,
      label: t(`hermesConfig.categories.${cat}`, cat),
    }))
})

function handleSelect(key: string) {
  emit('update:active', key)
}
</script>

<template>
  <div class="category-nav">
    <NMenu
      :value="active"
      :options="menuOptions"
      :indent="12"
      @update:value="handleSelect"
    />
  </div>
</template>

<style scoped lang="scss">
.category-nav {
  width: 180px;
  flex-shrink: 0;
  border-right: 1px solid var(--n-border-color, #efeff1);
  overflow-y: auto;
}
</style>
