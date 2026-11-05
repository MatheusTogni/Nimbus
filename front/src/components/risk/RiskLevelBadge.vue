<script setup lang="ts">
import type { RiskLevel } from '@/types/api'
import { LEVEL_CLASSES } from '@/utils/risk'

defineProps<{ level: RiskLevel; score?: number | null; size?: 'sm' | 'md' }>()
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap ring-1 ring-inset',
      size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs',
      LEVEL_CLASSES[level].badge,
    ]"
  >
    <span :class="['size-1.5 rounded-full', LEVEL_CLASSES[level].dot]" />
    <span v-if="score != null" class="font-semibold tabular-nums">{{ score }}</span>
    {{ $t(`risk.levels.${level}`) }}
  </span>
</template>
