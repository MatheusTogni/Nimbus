<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { LEVEL_CLASSES, levelFromScore, RATINGS, type MatrixMarker } from '@/utils/risk'

const props = withDefaults(
  defineProps<{
    /** Counts indexed as counts[impact - 1][probability - 1]. */
    counts?: number[][]
    markers?: MatrixMarker[]
    selected?: { p: number; i: number } | null
    interactive?: boolean
    compact?: boolean
  }>(),
  { interactive: false, compact: false },
)
const emit = defineEmits<{ select: [probability: number, impact: number] }>()
const { t } = useI18n()

const IMPACT_ROWS = [5, 4, 3, 2, 1]

const countAt = (p: number, i: number) => props.counts?.[i - 1]?.[p - 1] ?? 0
const markersAt = (p: number, i: number) => props.markers?.filter((m) => m.p === p && m.i === i) ?? []
const isSelected = (p: number, i: number) => props.selected?.p === p && props.selected?.i === i
const isMuted = (p: number, i: number) =>
  (props.counts && countAt(p, i) === 0) || (props.selected && !isSelected(p, i))

function cellLabel(p: number, i: number) {
  const base = `${t('risk.fields.probability')} ${p} × ${t('risk.fields.impact')} ${i} = ${p * i}`
  return props.counts ? `${base}: ${countAt(p, i)}` : base
}
</script>

<template>
  <div class="flex gap-2 select-none">
    <!-- Y axis -->
    <div class="flex items-center">
      <span
        class="text-[11px] font-medium tracking-wide text-slate-400 uppercase [writing-mode:vertical-rl] rotate-180"
      >
        {{ t('risk.fields.impact') }}
      </span>
    </div>
    <div class="min-w-0 flex-1">
      <div class="grid grid-cols-[auto_repeat(5,minmax(0,1fr))] gap-1">
        <template v-for="i in IMPACT_ROWS" :key="i">
          <div class="flex items-center justify-end pr-1 text-xs text-slate-400 tabular-nums">{{ i }}</div>
          <component
            :is="interactive ? 'button' : 'div'"
            v-for="p in RATINGS"
            :key="`${p}-${i}`"
            :type="interactive ? 'button' : undefined"
            :aria-label="cellLabel(p, i)"
            :title="cellLabel(p, i)"
            :class="[
              'relative flex aspect-square items-center justify-center rounded-md transition',
              compact ? 'text-xs' : 'text-sm sm:rounded-lg',
              LEVEL_CLASSES[levelFromScore(p * i)].cell,
              isMuted(p, i) && 'opacity-35',
              isSelected(p, i) && 'z-10 scale-105 ring-2 ring-slate-900 dark:ring-white',
              interactive && 'cursor-pointer hover:opacity-100 hover:ring-2 hover:ring-slate-400 focus-visible:opacity-100',
            ]"
            @click="interactive && emit('select', p, i)"
          >
            <span v-if="counts && countAt(p, i) > 0" class="font-semibold tabular-nums">{{ countAt(p, i) }}</span>
            <span v-else-if="!counts && !markers?.length" class="font-medium tabular-nums opacity-60">{{ p * i }}</span>
            <span v-if="markersAt(p, i).length" class="absolute inset-0 flex items-center justify-center gap-0.5">
              <span
                v-for="m in markersAt(p, i)"
                :key="m.kind"
                :class="[
                  'flex size-5 items-center justify-center rounded-full text-[10px] font-bold shadow ring-2 ring-white dark:ring-slate-900',
                  m.kind === 'inherent' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-brand-600 text-white',
                ]"
              >
                {{ m.label }}
              </span>
            </span>
          </component>
        </template>
        <div />
        <div
          v-for="p in RATINGS"
          :key="`x-${p}`"
          class="pt-1 text-center text-xs text-slate-400 tabular-nums"
        >
          {{ p }}
        </div>
      </div>
      <p class="mt-1 text-center text-[11px] font-medium tracking-wide text-slate-400 uppercase">
        {{ t('risk.fields.probability') }}
      </p>
    </div>
  </div>
</template>
