<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { levelFromScore, RATINGS } from '@/utils/risk'
import RiskLevelBadge from './RiskLevelBadge.vue'
import RiskMatrix from './RiskMatrix.vue'

const probability = defineModel<number>('probability', { required: true })
const impact = defineModel<number>('impact', { required: true })
defineProps<{ idPrefix: string; error?: string | null }>()

const { t, tm, rt } = useI18n()
const score = computed(() => probability.value * impact.value)
const scale = (key: 'probabilityScale' | 'impactScale', value: number) =>
  rt((tm(`risk.${key}`) as string[])[value - 1] ?? '')

function select(p: number, i: number) {
  probability.value = p
  impact.value = i
}

const segment = (active: boolean) => [
  'flex h-9 flex-1 items-center justify-center rounded-md text-sm font-semibold tabular-nums transition',
  active
    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 dark:bg-slate-700 dark:text-white dark:ring-slate-600'
    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
]
</script>

<template>
  <div class="grid gap-6 md:grid-cols-[1fr_minmax(0,16rem)]">
    <div class="space-y-5">
      <div v-for="field in (['probability', 'impact'] as const)" :key="field">
        <div class="mb-1.5 flex items-baseline justify-between gap-2">
          <span :id="`${idPrefix}-${field}`" class="label mb-0">{{ t(`risk.fields.${field}`) }}</span>
          <span class="text-xs text-slate-500 dark:text-slate-400">
            {{ scale(field === 'probability' ? 'probabilityScale' : 'impactScale', field === 'probability' ? probability : impact) }}
          </span>
        </div>
        <div
          role="radiogroup"
          :aria-labelledby="`${idPrefix}-${field}`"
          class="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
        >
          <button
            v-for="value in RATINGS"
            :key="value"
            type="button"
            role="radio"
            :aria-checked="(field === 'probability' ? probability : impact) === value"
            :title="scale(field === 'probability' ? 'probabilityScale' : 'impactScale', value)"
            :class="segment((field === 'probability' ? probability : impact) === value)"
            @click="field === 'probability' ? (probability = value) : (impact = value)"
          >
            {{ value }}
          </button>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
        <span class="text-sm text-slate-500 dark:text-slate-400">
          {{ probability }} × {{ impact }} =
        </span>
        <span class="text-2xl font-bold text-slate-900 tabular-nums dark:text-white">{{ score }}</span>
        <RiskLevelBadge :level="levelFromScore(score)" />
      </div>
      <p v-if="error" class="text-xs text-rose-600 dark:text-rose-400" role="alert">{{ error }}</p>
    </div>
    <RiskMatrix compact interactive :selected="{ p: probability, i: impact }" @select="select" />
  </div>
</template>
