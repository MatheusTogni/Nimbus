<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { risksApi } from '@/api'
import AppIcon, { type IconName } from '@/components/ui/AppIcon.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useNotify } from '@/composables/useNotify'
import type { AuditEntry, CategoryRef, Ref as UserRef } from '@/types/api'
import { formatDate, formatDateTime, formatRelative } from '@/utils/format'

const props = defineProps<{ riskId: string; users: UserRef[]; categories: CategoryRef[] }>()

const { t, te } = useI18n()
const notify = useNotify()
const entries = ref<AuditEntry[]>([])
const loading = ref(true)

const SUMMARY: Record<string, string> = {
  'RISK.CREATE': 'history.created',
  'RISK.UPDATE': 'history.updated',
  'RISK.DELETE': 'history.deleted',
  'ACTION.CREATE': 'history.actionCreated',
  'ACTION.UPDATE': 'history.actionUpdated',
  'ACTION.DELETE': 'history.actionDeleted',
  'COMMENT.CREATE': 'history.commentCreated',
  'COMMENT.DELETE': 'history.commentDeleted',
}
const ICON: Record<string, IconName> = { RISK: 'shield', ACTION: 'list', COMMENT: 'message' }
const DATE_FIELDS = new Set(['reviewDate', 'dueDate', 'completedAt'])

function fieldLabel(field: string) {
  if (te(`risk.fields.${field}`)) return t(`risk.fields.${field}`)
  if (te(`history.${field}`)) return t(`history.${field}`)
  if (field === 'ownerId') return t('risk.fields.owner')
  if (field === 'categoryId') return t('risk.fields.category')
  return field
}

function formatValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return t('history.empty_value')
  if (field === 'status') return t(`risk.statuses.${String(value)}`)
  if (field === 'ownerId' || field === 'assigneeId') return props.users.find((u) => u.id === value)?.name ?? '—'
  if (field === 'categoryId') return props.categories.find((c) => c.id === value)?.name ?? '—'
  if (DATE_FIELDS.has(field)) return formatDate(String(value))
  return String(value)
}

/** Field diffs are shown for updates only; long texts are not diffed. */
function visibleChanges(entry: AuditEntry) {
  if (entry.action !== 'UPDATE') return []
  return Object.entries(entry.changes).filter(([field]) => field !== 'description')
}

/** Text shown under comments and created/removed actions. */
function quote(entry: AuditEntry): string | null {
  if (entry.entity === 'RISK' || entry.action === 'UPDATE') return null
  const value = entry.changes.body ?? entry.changes.description
  const text = value ? (value[1] ?? value[0]) : null
  return typeof text === 'string' ? text : null
}

onMounted(async () => {
  try {
    entries.value = await risksApi.history(props.riskId)
  } catch (error) {
    notify.error(error)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <div v-if="loading" class="flex justify-center py-10 text-slate-400"><BaseSpinner /></div>
    <EmptyState v-else-if="!entries.length" icon="history" :title="t('history.empty')" />
    <ol v-else class="relative ml-3 border-l border-slate-200 dark:border-slate-800">
      <li v-for="entry in entries" :key="entry.id" class="relative pb-6 pl-6 last:pb-0">
        <span
          class="absolute -left-3 flex size-6 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-700"
        >
          <AppIcon :name="ICON[entry.entity] ?? 'history'" :size="13" />
        </span>
        <p class="text-sm text-slate-700 dark:text-slate-300">
          <span class="font-medium text-slate-900 dark:text-white">{{ entry.user?.name ?? t('history.system') }}</span>
          {{ ' ' }}{{ t(SUMMARY[`${entry.entity}.${entry.action}`] ?? 'history.updated') }}
          <time class="ml-1 text-xs text-slate-400" :datetime="entry.createdAt" :title="formatDateTime(entry.createdAt)">
            · {{ formatRelative(entry.createdAt) }}
          </time>
        </p>
        <p v-if="quote(entry)" class="mt-1 line-clamp-2 text-sm text-slate-500 italic dark:text-slate-400">
          “{{ quote(entry) }}”
        </p>
        <ul v-if="visibleChanges(entry).length" class="mt-2 space-y-1">
          <li
            v-for="[field, [before, after]] in visibleChanges(entry)"
            :key="field"
            class="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"
          >
            <span class="font-medium text-slate-600 dark:text-slate-300">{{ fieldLabel(field) }}:</span>
            <span class="rounded bg-slate-100 px-1.5 py-0.5 line-through decoration-slate-400/60 dark:bg-slate-800">
              {{ formatValue(field, before) }}
            </span>
            <AppIcon name="arrow-right" :size="12" />
            <span class="rounded bg-brand-50 px-1.5 py-0.5 font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
              {{ formatValue(field, after) }}
            </span>
          </li>
        </ul>
      </li>
    </ol>
  </div>
</template>
