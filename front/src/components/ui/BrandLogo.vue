<script setup lang="ts">
withDefaults(defineProps<{ inverted?: boolean }>(), { inverted: false })
</script>

<template>
  <span class="inline-flex items-center gap-2.5">
    <span class="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm shadow-brand-600/30">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true">
        <path d="M7 18h10a4 4 0 0 0 .8-7.9A6 6 0 0 0 6.2 9.1 4.5 4.5 0 0 0 7 18z" />
      </svg>
    </span>
    <span :class="['text-lg font-semibold tracking-tight', inverted ? 'text-white' : 'text-slate-900 dark:text-white']">
      Nimbus
    </span>
  </span>
</template>
