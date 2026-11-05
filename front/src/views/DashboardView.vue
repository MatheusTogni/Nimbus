<script setup lang="ts">
import type { ChartData, ChartOptions } from 'chart.js'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { dashboardApi } from '@/api'
import ChartCanvas from '@/components/charts/ChartCanvas.vue'
import RiskLevelBadge from '@/components/risk/RiskLevelBadge.vue'
import RiskMatrix from '@/components/risk/RiskMatrix.vue'
import StatusBadge from '@/components/risk/StatusBadge.vue'
import AppIcon, { type IconName } from '@/components/ui/AppIcon.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import { useChartTheme } from '@/composables/useChartTheme'
import { useNotify } from '@/composables/useNotify'
import { RISK_STATUSES, type DashboardSummary, type RiskStatus } from '@/types/api'
import { formatDayMonth, formatMonth, formatNumber, formatRelative } from '@/utils/format'
import { LEVEL_HEX, reduction, RISK_LEVELS } from '@/utils/risk'

const { t, locale } = useI18n()
const router = useRouter()
const notify = useNotify()
const theme = useChartTheme()

const data = ref<DashboardSummary | null>(null)
const failed = ref(false)
const matrixView = ref<'inherent' | 'residual'>('inherent')

async function load() {
  failed.value = false
  try {
    data.value = await dashboardApi.summary()
  } catch (error) {
    failed.value = true
    notify.error(error)
  }
}

interface Kpi {
  label: string
  value: string
  hint: string
  icon: IconName
  tone: string
}

const kpis = computed<Kpi[]>(() => {
  const d = data.value
  if (!d) return []
  const cut = reduction(d.totals.avgScore, d.totals.avgResidualScore || null)
  return [
    {
      label: t('dashboard.openRisks'),
      value: String(d.totals.open),
      hint: t('dashboard.closedCount', { count: d.totals.closed }),
      icon: 'shield',
      tone: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300',
    },
    {
      label: t('dashboard.criticalHigh'),
      value: String(d.totals.critical + d.totals.high),
      hint: t('dashboard.criticalCount', { count: d.totals.critical }),
      icon: 'alert',
      tone: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
    },
    {
      label: t('dashboard.avgScore'),
      value: formatNumber(d.totals.avgScore),
      hint:
        cut !== null
          ? `${t('dashboard.residualAfter', { value: formatNumber(d.totals.avgResidualScore) })} · ${t('dashboard.reductionText', { value: cut })}`
          : '—',
      icon: 'grid',
      tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
    },
    {
      label: t('dashboard.overdueActions'),
      value: String(d.totals.overdueActions),
      hint: t('dashboard.openActionsCount', { count: d.totals.openActions }),
      icon: 'clock',
      tone: 'bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300',
    },
  ]
})

const tooltip = computed(() => theme.value.tooltip)

const levelChart = computed<{ data: ChartData<'doughnut'>; options: ChartOptions<'doughnut'> }>(() => ({
  data: {
    labels: RISK_LEVELS.map((l) => t(`risk.levels.${l}`)),
    datasets: [
      {
        data: RISK_LEVELS.map((l) => data.value?.byLevel[l] ?? 0),
        backgroundColor: RISK_LEVELS.map((l) => LEVEL_HEX[l]),
        borderColor: theme.value.surface,
        borderWidth: 3,
        hoverOffset: 6,
      },
    ],
  },
  options: {
    cutout: '68%',
    plugins: {
      legend: { position: 'bottom', labels: { color: theme.value.text, usePointStyle: true, pointStyle: 'circle', padding: 14 } },
      tooltip: tooltip.value,
    },
  },
}))

const trendChart = computed<{ data: ChartData<'line'>; options: ChartOptions<'line'> }>(() => {
  void locale.value
  const trend = data.value?.trend
  return {
    data: {
      labels: (trend?.months ?? []).map(formatMonth),
      datasets: [
        {
          label: t('dashboard.created'),
          data: trend?.created ?? [],
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99,102,241,0.12)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
        },
        {
          label: t('dashboard.closed'),
          data: trend?.closed ?? [],
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.08)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
        },
      ],
    },
    options: {
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { grid: { display: false }, ticks: { color: theme.value.text } },
        y: { beginAtZero: true, ticks: { color: theme.value.text, precision: 0 }, grid: { color: theme.value.grid }, border: { display: false } },
      },
      plugins: {
        legend: { position: 'bottom', labels: { color: theme.value.text, usePointStyle: true, pointStyle: 'circle', padding: 14 } },
        tooltip: tooltip.value,
      },
    },
  }
})

const categoryChart = computed<{ data: ChartData<'bar'>; options: ChartOptions<'bar'> }>(() => {
  const rows = data.value?.byCategory ?? []
  return {
    data: {
      labels: rows.map((r) => r.name ?? t('common.uncategorized')),
      datasets: [
        {
          label: t('risk.plural'),
          data: rows.map((r) => r.count),
          backgroundColor: rows.map((r) => r.color),
          borderRadius: 6,
          barThickness: 16,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      scales: {
        x: { beginAtZero: true, ticks: { color: theme.value.text, precision: 0 }, grid: { color: theme.value.grid }, border: { display: false } },
        y: { ticks: { color: theme.value.text }, grid: { display: false } },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltip.value,
          callbacks: {
            afterLabel: (ctx) => `${t('dashboard.avgScore')}: ${formatNumber(rows[ctx.dataIndex]?.avgScore ?? 0)}`,
          },
        },
      },
    },
  }
})

const STATUS_COLORS: Record<RiskStatus, string> = {
  IDENTIFIED: 'bg-sky-400',
  ANALYZING: 'bg-violet-400',
  MITIGATING: 'bg-brand-500',
  MONITORING: 'bg-teal-400',
  CLOSED: 'bg-slate-300 dark:bg-slate-600',
}
const statusTotal = computed(() => RISK_STATUSES.reduce((sum, s) => sum + (data.value?.byStatus[s] ?? 0), 0))

function openCell(p: number, i: number) {
  void router.push({ path: '/risks', query: { probability: p, impact: i } })
}

onMounted(load)
</script>

<template>
  <div>
    <PageHeader :title="t('dashboard.title')" :subtitle="t('dashboard.subtitle')">
      <template #actions>
        <BaseButton variant="secondary" icon="shield" to="/risks">{{ t('nav.risks') }}</BaseButton>
      </template>
    </PageHeader>

    <div v-if="failed && !data" class="card">
      <EmptyState icon="alert" :title="t('errors.INTERNAL_ERROR')">
        <BaseButton variant="secondary" @click="load">{{ t('common.retry') }}</BaseButton>
      </EmptyState>
    </div>

    <!-- Skeleton -->
    <div v-else-if="!data" class="animate-pulse space-y-6" aria-busy="true">
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div v-for="n in 4" :key="n" class="card h-28" />
      </div>
      <div class="grid gap-6 lg:grid-cols-3">
        <div class="card h-80 lg:col-span-2" />
        <div class="card h-80" />
      </div>
    </div>

    <div v-else class="space-y-6">
      <!-- KPIs -->
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div v-for="kpi in kpis" :key="kpi.label" class="card p-5">
          <div class="flex items-start justify-between gap-3">
            <p class="text-sm font-medium text-slate-500 dark:text-slate-400">{{ kpi.label }}</p>
            <span :class="['rounded-lg p-2', kpi.tone]"><AppIcon :name="kpi.icon" :size="18" /></span>
          </div>
          <p class="mt-1 text-3xl font-semibold tracking-tight text-slate-900 tabular-nums dark:text-white">{{ kpi.value }}</p>
          <p class="mt-1 truncate text-xs text-slate-500 dark:text-slate-400" :title="kpi.hint">{{ kpi.hint }}</p>
        </div>
      </div>

      <!-- Matrix + levels -->
      <div class="grid gap-6 lg:grid-cols-5">
        <section class="card p-5 lg:col-span-3">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="font-semibold text-slate-900 dark:text-white">{{ t('dashboard.heatMap') }}</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">{{ t('dashboard.heatMapHint') }}</p>
            </div>
            <div class="flex rounded-lg bg-slate-100 p-1 text-sm dark:bg-slate-800" role="tablist">
              <button
                v-for="view in (['inherent', 'residual'] as const)"
                :key="view"
                type="button"
                role="tab"
                :aria-selected="matrixView === view"
                :class="[
                  'rounded-md px-3 py-1 font-medium transition',
                  matrixView === view
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400',
                ]"
                @click="matrixView = view"
              >
                {{ t(`dashboard.${view}`) }}
              </button>
            </div>
          </div>
          <div class="mx-auto max-w-md">
            <RiskMatrix
              :counts="data.matrix[matrixView]"
              :interactive="matrixView === 'inherent'"
              @select="openCell"
            />
          </div>
          <p class="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
            {{ t('dashboard.treated', { value: Math.round(data.totals.treatedRate * 100) }) }}
          </p>
        </section>

        <section class="card flex flex-col p-5 lg:col-span-2">
          <h2 class="font-semibold text-slate-900 dark:text-white">{{ t('dashboard.byLevel') }}</h2>
          <div class="relative mt-4 min-h-64 flex-1">
            <ChartCanvas type="doughnut" :data="levelChart.data" :options="levelChart.options" :label="t('dashboard.byLevel')" />
            <div class="pointer-events-none absolute inset-x-0 top-[38%] -translate-y-1/2 text-center">
              <p class="text-3xl font-semibold text-slate-900 tabular-nums dark:text-white">{{ data.totals.open }}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400">{{ t('dashboard.openRisks') }}</p>
            </div>
          </div>
        </section>
      </div>

      <!-- Status pipeline -->
      <section class="card p-5">
        <h2 class="font-semibold text-slate-900 dark:text-white">{{ t('dashboard.byStatus') }}</h2>
        <div class="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            v-for="status in RISK_STATUSES"
            :key="status"
            :class="STATUS_COLORS[status]"
            :style="{ width: `${statusTotal ? (data.byStatus[status] / statusTotal) * 100 : 0}%` }"
            :title="`${t(`risk.statuses.${status}`)}: ${data.byStatus[status]}`"
          />
        </div>
        <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <RouterLink
            v-for="status in RISK_STATUSES"
            :key="status"
            :to="{ path: '/risks', query: { status } }"
            class="rounded-lg px-2 py-1.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
          >
            <span class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span :class="['size-2 rounded-full', STATUS_COLORS[status]]" />{{ t(`risk.statuses.${status}`) }}
            </span>
            <span class="text-xl font-semibold text-slate-900 tabular-nums dark:text-white">{{ data.byStatus[status] }}</span>
          </RouterLink>
        </div>
      </section>

      <!-- Trend + categories -->
      <div class="grid gap-6 lg:grid-cols-2">
        <section class="card p-5">
          <h2 class="font-semibold text-slate-900 dark:text-white">{{ t('dashboard.trend') }}</h2>
          <div class="mt-4 h-72">
            <ChartCanvas type="line" :data="trendChart.data" :options="trendChart.options" :label="t('dashboard.trend')" />
          </div>
        </section>
        <section class="card p-5">
          <h2 class="font-semibold text-slate-900 dark:text-white">{{ t('dashboard.byCategory') }}</h2>
          <div class="mt-4 h-72">
            <ChartCanvas type="bar" :data="categoryChart.data" :options="categoryChart.options" :label="t('dashboard.byCategory')" />
          </div>
        </section>
      </div>

      <!-- Lists -->
      <div class="grid gap-6 lg:grid-cols-5">
        <section class="card overflow-hidden lg:col-span-3">
          <div class="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 class="font-semibold text-slate-900 dark:text-white">{{ t('dashboard.topRisks') }}</h2>
            <RouterLink to="/risks" class="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
              {{ t('common.seeAll') }}
            </RouterLink>
          </div>
          <ul class="divide-y divide-slate-100 dark:divide-slate-800">
            <li v-for="risk in data.topRisks" :key="risk.id">
              <RouterLink
                :to="`/risks/${risk.id}`"
                class="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <span class="w-16 shrink-0 font-mono text-xs text-slate-400">{{ risk.code }}</span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-medium text-slate-900 dark:text-white">{{ risk.title }}</span>
                  <span class="mt-0.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span v-if="risk.category" class="inline-flex items-center gap-1">
                      <span class="size-2 rounded-full" :style="{ background: risk.category.color }" />{{ risk.category.name }}
                    </span>
                    <StatusBadge :status="risk.status" class="hidden sm:inline-flex" />
                  </span>
                </span>
                <RiskLevelBadge :level="risk.level" :score="risk.score" size="sm" />
              </RouterLink>
            </li>
          </ul>
        </section>

        <div class="space-y-6 lg:col-span-2">
          <section class="card p-5">
            <h2 class="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
              {{ t('dashboard.overdueList') }}
              <span
                v-if="data.overdueActions.length"
                class="rounded-full bg-rose-100 px-2 text-xs font-semibold text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
              >
                {{ data.totals.overdueActions }}
              </span>
            </h2>
            <p v-if="!data.overdueActions.length" class="mt-3 text-sm text-slate-500 dark:text-slate-400">{{ t('dashboard.noOverdue') }}</p>
            <ul v-else class="mt-3 space-y-3">
              <li v-for="action in data.overdueActions" :key="action.id">
                <RouterLink :to="`/risks/${action.risk.id}`" class="group block">
                  <p class="text-sm text-slate-800 group-hover:text-brand-600 dark:text-slate-200">{{ action.description }}</p>
                  <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    <span class="font-mono">{{ action.risk.code }}</span>
                    <template v-if="action.assignee"> · {{ action.assignee.name }}</template>
                    · <span class="text-rose-600 dark:text-rose-400">{{ t('dashboard.lateBy', { when: formatRelative(action.dueDate) }) }}</span>
                  </p>
                </RouterLink>
              </li>
            </ul>
          </section>

          <section class="card p-5">
            <h2 class="font-semibold text-slate-900 dark:text-white">{{ t('dashboard.upcomingReviews') }}</h2>
            <p v-if="!data.upcomingReviews.length" class="mt-3 text-sm text-slate-500 dark:text-slate-400">{{ t('dashboard.noReviews') }}</p>
            <ul v-else class="mt-3 space-y-2.5">
              <li v-for="risk in data.upcomingReviews" :key="risk.id">
                <RouterLink :to="`/risks/${risk.id}`" class="flex items-center gap-3 text-sm hover:text-brand-600">
                  <span class="flex w-14 shrink-0 flex-col items-center rounded-lg bg-slate-100 py-1 text-xs dark:bg-slate-800">
                    <AppIcon name="calendar" :size="13" class="text-slate-400" />
                    <span class="mt-0.5 font-medium text-slate-700 dark:text-slate-300">{{ formatDayMonth(risk.reviewDate) }}</span>
                  </span>
                  <span class="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-300">{{ risk.title }}</span>
                  <RiskLevelBadge :level="risk.level" size="sm" />
                </RouterLink>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>
