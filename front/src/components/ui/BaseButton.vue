<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import AppIcon, { type IconName } from './AppIcon.vue'
import BaseSpinner from './BaseSpinner.vue'

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'
    size?: 'sm' | 'md' | 'lg'
    type?: 'button' | 'submit'
    icon?: IconName
    iconRight?: IconName
    loading?: boolean
    disabled?: boolean
    to?: RouteLocationRaw
    block?: boolean
  }>(),
  { variant: 'primary', size: 'md', type: 'button' },
)

const VARIANTS = {
  primary:
    'bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800 dark:bg-brand-500 dark:hover:bg-brand-400 dark:text-white',
  secondary:
    'bg-white text-slate-700 ring-1 ring-slate-300 shadow-xs hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700',
  ghost:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
  danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:bg-rose-800',
  subtle:
    'bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20',
}
const SIZES = {
  sm: 'h-8 gap-1.5 px-2.5 text-xs',
  md: 'h-9 gap-2 px-3.5 text-sm',
  lg: 'h-11 gap-2 px-5 text-sm',
}

const classes = computed(() => [
  'inline-flex items-center justify-center rounded-lg font-medium whitespace-nowrap transition select-none disabled:pointer-events-none disabled:opacity-50',
  VARIANTS[props.variant],
  SIZES[props.size],
  props.block && 'w-full',
])
const iconSize = computed(() => (props.size === 'sm' ? 15 : 18))
</script>

<template>
  <RouterLink v-if="to && !disabled" :to="to" :class="classes">
    <AppIcon v-if="icon" :name="icon" :size="iconSize" />
    <slot />
    <AppIcon v-if="iconRight" :name="iconRight" :size="iconSize" />
  </RouterLink>
  <button v-else :type="type" :class="classes" :disabled="disabled || loading">
    <BaseSpinner v-if="loading" :size="iconSize" />
    <AppIcon v-else-if="icon" :name="icon" :size="iconSize" />
    <slot />
    <AppIcon v-if="iconRight" :name="iconRight" :size="iconSize" />
  </button>
</template>
