<script setup lang="ts">
import { useUiStore } from '@/stores/ui'
import AppIcon from './AppIcon.vue'

const ui = useUiStore()
const STYLES = {
  success: { icon: 'check-circle', color: 'text-emerald-500' },
  error: { icon: 'alert', color: 'text-rose-500' },
  info: { icon: 'info', color: 'text-brand-500' },
} as const
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end"
    aria-live="polite"
  >
    <TransitionGroup
      enter-active-class="duration-200 ease-out"
      enter-from-class="translate-y-2 opacity-0"
      leave-active-class="duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-for="toast in ui.toasts"
        :key="toast.id"
        class="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl bg-white p-3.5 shadow-lg ring-1 ring-slate-900/10 dark:bg-slate-800 dark:ring-white/10"
        :role="toast.kind === 'error' ? 'alert' : 'status'"
      >
        <AppIcon :name="STYLES[toast.kind].icon" :class="STYLES[toast.kind].color" />
        <p class="flex-1 text-sm text-slate-700 dark:text-slate-200">{{ toast.message }}</p>
        <button
          type="button"
          class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          :aria-label="$t('common.close')"
          @click="ui.dismiss(toast.id)"
        >
          <AppIcon name="x" :size="16" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
