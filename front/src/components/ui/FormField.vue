<script setup lang="ts">
/** Label + control (default slot) + hint/error. Pass `id` and use it on the control. */
defineProps<{ label?: string; id?: string; error?: string | null; hint?: string; optional?: boolean }>()
</script>

<template>
  <div>
    <label v-if="label" :for="id" class="label">
      {{ label }}
      <span v-if="optional" class="font-normal text-slate-400">({{ $t('common.optional') }})</span>
    </label>
    <slot />
    <p v-if="error" class="mt-1.5 text-xs text-rose-600 dark:text-rose-400" role="alert">{{ error }}</p>
    <p v-else-if="hint" class="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{{ hint }}</p>
  </div>
</template>
