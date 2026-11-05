<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'

const props = withDefaults(defineProps<{ open: boolean; title: string; size?: 'sm' | 'md' | 'lg' }>(), {
  size: 'md',
})
const emit = defineEmits<{ close: [] }>()
const panel = ref<HTMLElement | null>(null)
let previousFocus: HTMLElement | null = null

const WIDTHS = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' }

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      previousFocus = document.activeElement as HTMLElement | null
      document.addEventListener('keydown', onKey)
      document.body.style.overflow = 'hidden'
      await nextTick()
      panel.value?.querySelector<HTMLElement>('input, select, textarea, button:not([data-close])')?.focus()
    } else {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      previousFocus?.focus()
    }
  },
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="duration-150 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="duration-100 ease-in"
      leave-to-class="opacity-0"
    >
      <div v-if="open" class="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
        <div class="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" @click="emit('close')" />
        <div
          ref="panel"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          :class="[
            'relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl dark:bg-slate-900 dark:ring-1 dark:ring-slate-800',
            WIDTHS[size],
          ]"
        >
          <header class="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h2 class="text-base font-semibold text-slate-900 dark:text-white">{{ title }}</h2>
            <button
              data-close
              type="button"
              class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              :aria-label="$t('common.close')"
              @click="emit('close')"
            >
              <AppIcon name="x" :size="18" />
            </button>
          </header>
          <div class="px-5 py-5">
            <slot />
          </div>
          <footer
            v-if="$slots.footer"
            class="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end dark:border-slate-800"
          >
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
