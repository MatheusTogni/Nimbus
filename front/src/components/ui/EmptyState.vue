<script setup lang="ts">
import AppIcon, { type IconName } from './AppIcon.vue'

withDefaults(defineProps<{ title: string; text?: string; icon?: IconName }>(), { icon: 'shield' })
</script>

<template>
  <div class="flex flex-col items-center justify-center px-6 py-12 text-center">
    <div class="mb-4 rounded-2xl bg-slate-100 p-3 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
      <AppIcon :name="icon" :size="26" />
    </div>
    <p class="font-medium text-slate-900 dark:text-white">{{ title }}</p>
    <p v-if="text" class="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{{ text }}</p>
    <div v-if="$slots.default" class="mt-5"><slot /></div>
  </div>
</template>
