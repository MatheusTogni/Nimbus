<script setup lang="ts">
import type { RiskStatus } from '@/types/api'

defineProps<{ status: RiskStatus }>()

const STYLES: Record<RiskStatus, string> = {
  IDENTIFIED: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
  ANALYZING: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
  MITIGATING: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
  MONITORING: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300',
  CLOSED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}
</script>

<template>
  <span :class="['inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap', STYLES[status]]">
    {{ $t(`risk.statuses.${status}`) }}
  </span>
</template>
