<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div class="min-w-0">
      <slot name="eyebrow" />
      <h1 class="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ title }}</h1>
      <p v-if="subtitle" class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
