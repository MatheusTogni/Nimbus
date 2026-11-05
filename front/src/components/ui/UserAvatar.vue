<script setup lang="ts">
import { computed } from 'vue'
import { initials } from '@/utils/format'

const props = withDefaults(defineProps<{ name: string; size?: 'sm' | 'md' }>(), { size: 'md' })

const PALETTE = [
  'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300',
]
const color = computed(() => {
  let hash = 0
  for (const char of props.name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return PALETTE[hash % PALETTE.length]
})
</script>

<template>
  <span
    :class="[
      'inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
      size === 'sm' ? 'size-6 text-[10px]' : 'size-8 text-xs',
      color,
    ]"
    :title="name"
  >
    {{ initials(name) }}
  </span>
</template>
