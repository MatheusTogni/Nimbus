<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { categoriesApi, risksApi, usersApi } from '@/api'
import { ApiError } from '@/api/http'
import ActionList from '@/components/risk/ActionList.vue'
import CommentThread from '@/components/risk/CommentThread.vue'
import HistoryTimeline from '@/components/risk/HistoryTimeline.vue'
import RiskLevelBadge from '@/components/risk/RiskLevelBadge.vue'
import RiskMatrix from '@/components/risk/RiskMatrix.vue'
import StatusBadge from '@/components/risk/StatusBadge.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import { useNotify } from '@/composables/useNotify'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import type { Category, Ref as UserRef, Risk } from '@/types/api'
import { formatDate, formatDateTime, isPast } from '@/utils/format'
import { reduction, type MatrixMarker } from '@/utils/risk'

const { t, tm, rt } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const ui = useUiStore()
const notify = useNotify()

const id = route.params.id as string
const risk = ref<Risk | null>(null)
const notFound = ref(false)
const users = ref<UserRef[]>([])
const categories = ref<Category[]>([])
type Tab = 'actions' | 'comments' | 'history'
const tab = ref<Tab>('actions')

const markers = computed<MatrixMarker[]>(() => {
  const r = risk.value
  if (!r) return []
  const list: MatrixMarker[] = [{ p: r.probability, i: r.impact, label: 'I', kind: 'inherent' }]
  if (r.residualProbability && r.residualImpact) {
    list.push({ p: r.residualProbability, i: r.residualImpact, label: 'R', kind: 'residual' })
  }
  return list
})
const cut = computed(() => (risk.value ? reduction(risk.value.score, risk.value.residualScore) : null))
const scale = (key: 'probabilityScale' | 'impactScale', value: number) =>
  rt((tm(`risk.${key}`) as string[])[value - 1] ?? '')

const tabs = computed(() => [
  { key: 'actions' as Tab, label: t('risk.tabs.actions'), count: risk.value?._count.actions },
  { key: 'comments' as Tab, label: t('risk.tabs.comments'), count: risk.value?._count.comments },
  { key: 'history' as Tab, label: t('risk.tabs.history'), count: undefined },
])

async function load() {
  try {
    risk.value = await risksApi.get(id)
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) notFound.value = true
    else notify.error(error)
  }
}

async function remove() {
  if (!risk.value) return
  const ok = await ui.confirm({
    title: t('risk.deleteTitle', { code: risk.value.code }),
    message: t('risk.deleteText'),
    confirmLabel: t('common.delete'),
    danger: true,
  })
  if (!ok) return
  try {
    await risksApi.remove(id)
    notify.success(t('risk.deleted'))
    await router.push('/risks')
  } catch (error) {
    notify.error(error)
  }
}

onMounted(async () => {
  await load()
  try {
    ;[users.value, categories.value] = await Promise.all([usersApi.options(), categoriesApi.list()])
  } catch {
    // Pickers and history names are a nicety; the page still works without them.
  }
})
</script>

<template>
  <div>
    <RouterLink to="/risks" class="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
      <AppIcon name="chevron-left" :size="16" />{{ t('risk.plural') }}
    </RouterLink>

    <div v-if="notFound" class="card">
      <EmptyState icon="search" :title="t('risk.notFound')">
        <BaseButton variant="secondary" to="/risks">{{ t('common.back') }}</BaseButton>
      </EmptyState>
    </div>

    <div v-else-if="!risk" class="flex justify-center py-20 text-slate-400"><BaseSpinner :size="24" /></div>

    <template v-else>
      <!-- Header -->
      <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-mono text-sm text-slate-500">{{ risk.code }}</span>
            <StatusBadge :status="risk.status" />
            <RiskLevelBadge :level="risk.level" :score="risk.score" />
          </div>
          <h1 class="mt-2 text-2xl font-semibold tracking-tight text-balance text-slate-900 dark:text-white">{{ risk.title }}</h1>
        </div>
        <div v-if="auth.canEdit" class="flex shrink-0 gap-2">
          <BaseButton variant="secondary" icon="pencil" :to="`/risks/${risk.id}/edit`">{{ t('common.edit') }}</BaseButton>
          <BaseButton variant="ghost" icon="trash" class="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-500/10" @click="remove">
            {{ t('common.delete') }}
          </BaseButton>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-3">
        <!-- Main column -->
        <div class="space-y-6 lg:col-span-2">
          <section class="card p-5">
            <h2 class="text-sm font-semibold text-slate-900 dark:text-white">{{ t('risk.fields.description') }}</h2>
            <p class="mt-2 text-sm leading-relaxed whitespace-pre-line text-slate-600 dark:text-slate-300">
              {{ risk.description || '—' }}
            </p>
          </section>

          <!-- Assessment -->
          <section class="card p-5">
            <div class="grid gap-6 sm:grid-cols-[1fr_minmax(0,14rem)]">
              <div class="space-y-4">
                <div class="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                  <p class="text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">{{ t('risk.fields.inherent') }}</p>
                  <div class="mt-1 flex flex-wrap items-center gap-3">
                    <span class="text-3xl font-bold text-slate-900 tabular-nums dark:text-white">{{ risk.score }}</span>
                    <RiskLevelBadge :level="risk.level" />
                  </div>
                  <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {{ t('risk.fields.probability') }} {{ risk.probability }} ({{ scale('probabilityScale', risk.probability) }}) ×
                    {{ t('risk.fields.impact') }} {{ risk.impact }} ({{ scale('impactScale', risk.impact) }})
                  </p>
                </div>
                <div class="rounded-xl bg-brand-50/60 p-4 dark:bg-brand-500/10">
                  <p class="text-xs font-medium tracking-wide text-brand-700 uppercase dark:text-brand-300">{{ t('risk.fields.residual') }}</p>
                  <template v-if="risk.residualScore && risk.residualLevel">
                    <div class="mt-1 flex flex-wrap items-center gap-3">
                      <span class="text-3xl font-bold text-slate-900 tabular-nums dark:text-white">{{ risk.residualScore }}</span>
                      <RiskLevelBadge :level="risk.residualLevel" />
                      <span v-if="cut !== null" class="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        <AppIcon name="arrow-down" :size="15" />{{ t('risk.reduction', { value: cut }) }}
                      </span>
                    </div>
                    <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {{ t('risk.fields.probability') }} {{ risk.residualProbability }} × {{ t('risk.fields.impact') }} {{ risk.residualImpact }}
                    </p>
                  </template>
                  <p v-else class="mt-1 text-sm text-slate-500 dark:text-slate-400">—</p>
                </div>
              </div>
              <RiskMatrix compact :markers="markers" />
            </div>
          </section>

          <!-- Tabs -->
          <section class="card">
            <div class="flex gap-1 overflow-x-auto border-b border-slate-200 px-3 dark:border-slate-800" role="tablist">
              <button
                v-for="item in tabs"
                :key="item.key"
                type="button"
                role="tab"
                :aria-selected="tab === item.key"
                :class="[
                  '-mb-px flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap transition',
                  tab === item.key
                    ? 'border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-300'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
                ]"
                @click="tab = item.key"
              >
                {{ item.label }}
                <span v-if="item.count !== undefined" class="rounded-full bg-slate-100 px-1.5 text-xs tabular-nums dark:bg-slate-800">{{ item.count }}</span>
              </button>
            </div>
            <div class="p-5">
              <ActionList
                v-if="tab === 'actions'"
                :risk-id="risk.id"
                :users="users"
                :can-edit="auth.canEdit"
                @changed="(count) => risk && (risk._count.actions = count)"
              />
              <CommentThread
                v-else-if="tab === 'comments'"
                :risk-id="risk.id"
                :current-user-id="auth.user!.id"
                :is-admin="auth.isAdmin"
                @changed="(count) => risk && (risk._count.comments = count)"
              />
              <HistoryTimeline v-else :risk-id="risk.id" :users="users" :categories="categories" />
            </div>
          </section>
        </div>

        <!-- Side column -->
        <aside class="space-y-6">
          <section class="card p-5">
            <dl class="space-y-4 text-sm">
              <div>
                <dt class="text-xs text-slate-500 dark:text-slate-400">{{ t('risk.fields.category') }}</dt>
                <dd class="mt-1 flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                  <span class="size-2.5 rounded-full" :style="{ background: risk.category?.color ?? '#94a3b8' }" />
                  {{ risk.category?.name ?? t('common.uncategorized') }}
                </dd>
              </div>
              <div>
                <dt class="text-xs text-slate-500 dark:text-slate-400">{{ t('risk.fields.owner') }}</dt>
                <dd class="mt-1 flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                  <template v-if="risk.owner"><UserAvatar :name="risk.owner.name" size="sm" />{{ risk.owner.name }}</template>
                  <span v-else class="font-normal text-slate-400">{{ t('common.unassigned') }}</span>
                </dd>
              </div>
              <div>
                <dt class="text-xs text-slate-500 dark:text-slate-400">{{ t('risk.fields.reviewDate') }}</dt>
                <dd
                  :class="[
                    'mt-1 flex items-center gap-2 font-medium',
                    risk.status !== 'CLOSED' && isPast(risk.reviewDate) ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white',
                  ]"
                >
                  <AppIcon name="calendar" :size="16" class="text-slate-400" />{{ formatDate(risk.reviewDate) }}
                </dd>
              </div>
              <div class="border-t border-slate-100 pt-4 dark:border-slate-800">
                <dt class="text-xs text-slate-500 dark:text-slate-400">{{ t('risk.fields.createdBy') }}</dt>
                <dd class="mt-1 text-slate-700 dark:text-slate-300">{{ risk.createdBy?.name ?? '—' }}</dd>
              </div>
              <div>
                <dt class="text-xs text-slate-500 dark:text-slate-400">{{ t('risk.fields.createdAt') }}</dt>
                <dd class="mt-1 text-slate-700 dark:text-slate-300">{{ formatDateTime(risk.createdAt) }}</dd>
              </div>
              <div>
                <dt class="text-xs text-slate-500 dark:text-slate-400">{{ t('risk.fields.updatedAt') }}</dt>
                <dd class="mt-1 text-slate-700 dark:text-slate-300">{{ formatDateTime(risk.updatedAt) }}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </template>
  </div>
</template>
