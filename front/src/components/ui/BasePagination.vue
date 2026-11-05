<script setup lang="ts">
import AppIcon from './AppIcon.vue'

const props = defineProps<{ page: number; totalPages: number; total: number }>()
const emit = defineEmits<{ change: [page: number] }>()

const go = (page: number) => {
  if (page >= 1 && page <= props.totalPages && page !== props.page) emit('change', page)
}
const btn =
  'inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-sm font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800'
</script>

<template>
  <nav class="flex items-center justify-between gap-3 text-sm" aria-label="pagination">
    <p class="text-slate-500 dark:text-slate-400">{{ $t('common.results', total) }}</p>
    <div class="flex items-center gap-2">
      <button type="button" :class="btn" :disabled="page <= 1" @click="go(page - 1)">
        <AppIcon name="chevron-left" :size="16" />
        <span class="hidden sm:inline">{{ $t('common.previous') }}</span>
      </button>
      <span class="px-1 text-slate-500 tabular-nums dark:text-slate-400">
        {{ $t('common.page', { page, total: totalPages }) }}
      </span>
      <button type="button" :class="btn" :disabled="page >= totalPages" @click="go(page + 1)">
        <span class="hidden sm:inline">{{ $t('common.next') }}</span>
        <AppIcon name="chevron-right" :size="16" />
      </button>
    </div>
  </nav>
</template>
