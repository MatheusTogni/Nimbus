<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'
import { categoriesApi, risksApi, usersApi } from '@/api'
import RiskLevelBadge from '@/components/risk/RiskLevelBadge.vue'
import StatusBadge from '@/components/risk/StatusBadge.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BasePagination from '@/components/ui/BasePagination.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import { useNotify } from '@/composables/useNotify'
import { useAuthStore } from '@/stores/auth'
import {
  RISK_STATUSES,
  type Category,
  type Paginated,
  type Ref as UserRef,
  type Risk,
  type RiskLevel,
  type RiskQuery,
  type RiskStatus,
} from '@/types/api'
import { formatDate, isPast } from '@/utils/format'
import { RISK_LEVELS } from '@/utils/risk'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const notify = useNotify()

const result = ref<Paginated<Risk> | null>(null)
const loading = ref(false)
const exporting = ref(false)
const categories = ref<Category[]>([])
const users = ref<UserRef[]>([])
const search = ref('')

const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined)
const num = (v: unknown) => (typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : undefined)

/** The URL is the single source of truth for filters, sorting and paging. */
const query = computed<RiskQuery>(() => {
  const q = route.query
  return {
    search: str(q.search),
    level: str(q.level) as RiskLevel | undefined,
    status: str(q.status) as RiskStatus | undefined,
    categoryId: str(q.categoryId),
    ownerId: str(q.ownerId),
    probability: num(q.probability),
    impact: num(q.impact),
    sort: str(q.sort) ?? 'score',
    order: (str(q.order) as 'asc' | 'desc' | undefined) ?? 'desc',
    page: num(q.page) ?? 1,
    pageSize: 15,
  }
})

const hasFilters = computed(() => {
  const q = query.value
  return !!(q.search || q.level || q.status || q.categoryId || q.ownerId || q.probability || q.impact)
})

function update(patch: Partial<RiskQuery>, resetPage = true) {
  const next: LocationQueryRaw = { ...route.query }
  for (const [key, value] of Object.entries({ ...patch, ...(resetPage ? { page: undefined } : {}) })) {
    if (value === undefined || value === null || value === '') delete next[key]
    else next[key] = String(value)
  }
  void router.replace({ query: next })
}

function sortBy(field: string) {
  const q = query.value
  const order = q.sort === field ? (q.order === 'asc' ? 'desc' : 'asc') : field === 'code' || field === 'title' ? 'asc' : 'desc'
  update({ sort: field, order }, false)
}

function clearFilters() {
  search.value = ''
  void router.replace({ query: {} })
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => update({ search: value.trim() || undefined }), 300)
})

async function load() {
  loading.value = true
  try {
    result.value = await risksApi.list(query.value)
  } catch (error) {
    notify.error(error)
  } finally {
    loading.value = false
  }
}

async function exportCsv() {
  exporting.value = true
  try {
    const response = await risksApi.exportCsv(query.value)
    const url = URL.createObjectURL(await response.blob())
    const link = Object.assign(document.createElement('a'), {
      href: url,
      download: `nimbus-risks-${new Date().toISOString().slice(0, 10)}.csv`,
    })
    link.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    notify.error(error)
  } finally {
    exporting.value = false
  }
}

watch(query, () => {
  // Ignore the query change caused by navigating away from this page.
  if (route.name === 'risks') void load()
})
onMounted(async () => {
  search.value = query.value.search ?? ''
  void load()
  try {
    ;[categories.value, users.value] = await Promise.all([categoriesApi.list(), usersApi.options()])
  } catch (error) {
    notify.error(error)
  }
})

const COLUMNS = [
  { key: 'code', label: 'risk.fields.code', sortable: true, class: 'w-24' },
  { key: 'title', label: 'risk.fields.title', sortable: true, class: '' },
  { key: 'owner', label: 'risk.fields.owner', sortable: false, class: 'hidden xl:table-cell' },
  { key: 'status', label: 'risk.fields.status', sortable: true, class: '' },
  { key: 'score', label: 'risk.fields.inherent', sortable: true, class: '' },
  { key: 'residualScore', label: 'risk.fields.residualScore', sortable: true, class: '' },
  { key: 'reviewDate', label: 'risk.fields.reviewDate', sortable: true, class: 'hidden lg:table-cell' },
] as const
</script>

<template>
  <div>
    <PageHeader :title="t('risk.plural')" :subtitle="t('risk.listSubtitle')">
      <template #actions>
        <BaseButton variant="secondary" icon="download" :loading="exporting" @click="exportCsv">
          {{ t('common.export') }}
        </BaseButton>
        <BaseButton v-if="auth.canEdit" icon="plus" to="/risks/new">{{ t('risk.new') }}</BaseButton>
      </template>
    </PageHeader>

    <!-- Filters -->
    <div class="card mb-4 p-3">
      <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
        <label class="relative sm:col-span-2 lg:col-span-1">
          <span class="sr-only">{{ t('common.search') }}</span>
          <AppIcon name="search" :size="18" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
          <input v-model="search" type="search" class="field pl-9" :placeholder="t('risk.searchPlaceholder')" />
        </label>
        <select class="field" :value="query.level ?? ''" :aria-label="t('risk.fields.level')" @change="update({ level: (($event.target as HTMLSelectElement).value || undefined) as RiskLevel })">
          <option value="">{{ t('risk.fields.level') }}: {{ t('common.all') }}</option>
          <option v-for="level in RISK_LEVELS" :key="level" :value="level">{{ t(`risk.levels.${level}`) }}</option>
        </select>
        <select class="field" :value="query.status ?? ''" :aria-label="t('risk.fields.status')" @change="update({ status: (($event.target as HTMLSelectElement).value || undefined) as RiskStatus })">
          <option value="">{{ t('risk.fields.status') }}: {{ t('common.all') }}</option>
          <option v-for="status in RISK_STATUSES" :key="status" :value="status">{{ t(`risk.statuses.${status}`) }}</option>
        </select>
        <select class="field" :value="query.categoryId ?? ''" :aria-label="t('risk.fields.category')" @change="update({ categoryId: ($event.target as HTMLSelectElement).value || undefined })">
          <option value="">{{ t('risk.fields.category') }}: {{ t('common.all') }}</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <select class="field" :value="query.ownerId ?? ''" :aria-label="t('risk.fields.owner')" @change="update({ ownerId: ($event.target as HTMLSelectElement).value || undefined })">
          <option value="">{{ t('risk.fields.owner') }}: {{ t('common.all') }}</option>
          <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }}</option>
        </select>
      </div>
      <div v-if="hasFilters" class="mt-2 flex flex-wrap items-center gap-2 px-1">
        <span
          v-if="query.probability && query.impact"
          class="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
        >
          <AppIcon name="grid" :size="13" />
          {{ t('risk.filteredByCell', { p: query.probability, i: query.impact }) }}
        </span>
        <button type="button" class="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200" @click="clearFilters">
          {{ t('common.clearFilters') }}
        </button>
      </div>
    </div>

    <div class="card relative overflow-hidden">
      <div v-if="loading && result" class="absolute inset-x-0 top-0 h-0.5 animate-pulse bg-brand-500" />

      <div v-if="!result" class="flex justify-center py-16 text-slate-400"><BaseSpinner :size="24" /></div>

      <EmptyState v-else-if="!result.data.length" :title="t('risk.empty')" :text="t('risk.emptyHint')">
        <BaseButton v-if="hasFilters" variant="secondary" @click="clearFilters">{{ t('common.clearFilters') }}</BaseButton>
        <BaseButton v-else-if="auth.canEdit" icon="plus" to="/risks/new">{{ t('risk.new') }}</BaseButton>
      </EmptyState>

      <template v-else>
        <!-- Desktop table -->
        <div class="hidden overflow-x-auto md:block">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-slate-200 bg-slate-50/80 text-xs text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
              <tr>
                <th v-for="col in COLUMNS" :key="col.key" scope="col" :class="['px-4 py-3 font-medium', col.class]">
                  <button
                    v-if="col.sortable"
                    type="button"
                    class="inline-flex items-center gap-1 uppercase hover:text-slate-800 dark:hover:text-slate-200"
                    :aria-sort="query.sort === col.key ? (query.order === 'asc' ? 'ascending' : 'descending') : 'none'"
                    @click="sortBy(col.key)"
                  >
                    {{ t(col.label) }}
                    <AppIcon
                      :name="query.sort === col.key ? (query.order === 'asc' ? 'chevron-up' : 'chevron-down') : 'sort'"
                      :size="13"
                      :class="query.sort === col.key ? 'text-brand-600 dark:text-brand-400' : 'opacity-40'"
                    />
                  </button>
                  <template v-else>{{ t(col.label) }}</template>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr
                v-for="risk in result.data"
                :key="risk.id"
                class="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                @click="router.push(`/risks/${risk.id}`)"
              >
                <td class="px-4 py-3 font-mono text-xs text-slate-500">{{ risk.code }}</td>
                <td class="max-w-md px-4 py-3">
                  <RouterLink :to="`/risks/${risk.id}`" class="font-medium text-slate-900 hover:text-brand-600 dark:text-white" @click.stop>
                    {{ risk.title }}
                  </RouterLink>
                  <p class="mt-0.5 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span class="inline-flex items-center gap-1.5">
                      <span class="size-2 rounded-full" :style="{ background: risk.category?.color ?? '#94a3b8' }" />
                      {{ risk.category?.name ?? t('common.uncategorized') }}
                    </span>
                    <span v-if="risk._count.actions" class="inline-flex items-center gap-1"><AppIcon name="list" :size="12" />{{ risk._count.actions }}</span>
                    <span v-if="risk._count.comments" class="inline-flex items-center gap-1"><AppIcon name="message" :size="12" />{{ risk._count.comments }}</span>
                  </p>
                </td>
                <td class="hidden px-4 py-3 xl:table-cell">
                  <span v-if="risk.owner" class="inline-flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <UserAvatar :name="risk.owner.name" size="sm" />{{ risk.owner.name }}
                  </span>
                  <span v-else class="text-slate-400">{{ t('common.unassigned') }}</span>
                </td>
                <td class="px-4 py-3"><StatusBadge :status="risk.status" /></td>
                <td class="px-4 py-3">
                  <RiskLevelBadge :level="risk.level" :score="risk.score" />
                  <p class="mt-1 text-[11px] text-slate-400 tabular-nums">P{{ risk.probability }} × I{{ risk.impact }}</p>
                </td>
                <td class="px-4 py-3">
                  <RiskLevelBadge v-if="risk.residualLevel" :level="risk.residualLevel" :score="risk.residualScore" />
                  <span v-else class="text-slate-400">—</span>
                </td>
                <td
                  :class="[
                    'hidden px-4 py-3 whitespace-nowrap lg:table-cell',
                    risk.status !== 'CLOSED' && isPast(risk.reviewDate) ? 'font-medium text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400',
                  ]"
                >
                  {{ formatDate(risk.reviewDate) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile cards -->
        <ul class="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
          <li v-for="risk in result.data" :key="risk.id">
            <RouterLink :to="`/risks/${risk.id}`" class="block p-4">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="font-mono text-xs text-slate-400">{{ risk.code }}</p>
                  <p class="font-medium text-slate-900 dark:text-white">{{ risk.title }}</p>
                </div>
                <RiskLevelBadge :level="risk.level" :score="risk.score" size="sm" />
              </div>
              <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <StatusBadge :status="risk.status" />
                <span v-if="risk.category">{{ risk.category.name }}</span>
                <span v-if="risk.owner">· {{ risk.owner.name }}</span>
              </div>
            </RouterLink>
          </li>
        </ul>

        <div class="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
          <BasePagination
            :page="result.meta.page"
            :total-pages="result.meta.totalPages"
            :total="result.meta.total"
            @change="(page) => update({ page }, false)"
          />
        </div>
      </template>
    </div>
  </div>
</template>
