<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { actionsApi } from '@/api'
import AppIcon from '@/components/ui/AppIcon.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import { useNotify } from '@/composables/useNotify'
import { useUiStore } from '@/stores/ui'
import type { Ref as UserRef, RiskAction } from '@/types/api'
import { formatDate, fromDateInput, isPast } from '@/utils/format'

const props = defineProps<{ riskId: string; users: UserRef[]; canEdit: boolean }>()
const emit = defineEmits<{ changed: [count: number] }>()

const { t } = useI18n()
const notify = useNotify()
const ui = useUiStore()

const actions = ref<RiskAction[]>([])
const loading = ref(true)
const saving = ref(false)
const form = reactive({ description: '', assigneeId: '', dueDate: '' })

const done = computed(() => actions.value.filter((a) => a.completedAt).length)
const progress = computed(() => (actions.value.length ? (done.value / actions.value.length) * 100 : 0))

async function load() {
  loading.value = true
  try {
    actions.value = await actionsApi.list(props.riskId)
  } catch (error) {
    notify.error(error)
  } finally {
    loading.value = false
  }
}

async function add() {
  if (form.description.trim().length < 3) return
  saving.value = true
  try {
    await actionsApi.create(props.riskId, {
      description: form.description.trim(),
      assigneeId: form.assigneeId || null,
      dueDate: fromDateInput(form.dueDate),
    })
    Object.assign(form, { description: '', assigneeId: '', dueDate: '' })
    await load()
    emit('changed', actions.value.length)
  } catch (error) {
    notify.error(error)
  } finally {
    saving.value = false
  }
}

async function toggle(action: RiskAction) {
  try {
    const updated = await actionsApi.update(props.riskId, action.id, { completed: !action.completedAt })
    Object.assign(action, updated)
  } catch (error) {
    notify.error(error)
  }
}

async function remove(action: RiskAction) {
  if (!(await ui.confirm({ title: t('action.deleteConfirm'), message: action.description, danger: true, confirmLabel: t('common.delete') }))) return
  try {
    await actionsApi.remove(props.riskId, action.id)
    actions.value = actions.value.filter((a) => a.id !== action.id)
    emit('changed', actions.value.length)
  } catch (error) {
    notify.error(error)
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div v-if="loading" class="flex justify-center py-10 text-slate-400"><BaseSpinner /></div>
    <template v-else>
      <div v-if="actions.length" class="mb-4">
        <div class="mb-1.5 flex justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{{ t('action.progress', { done, total: actions.length }) }}</span>
          <span class="tabular-nums">{{ Math.round(progress) }}%</span>
        </div>
        <div class="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div class="h-full rounded-full bg-emerald-500 transition-all" :style="{ width: `${progress}%` }" />
        </div>
      </div>

      <EmptyState v-if="!actions.length" icon="list" :title="t('action.empty')" :text="t('action.emptyHint')" />

      <ul v-else class="divide-y divide-slate-100 dark:divide-slate-800">
        <li v-for="action in actions" :key="action.id" class="group flex items-start gap-3 py-3">
          <button
            type="button"
            :disabled="!canEdit"
            :aria-label="t('action.done')"
            :aria-pressed="!!action.completedAt"
            :class="[
              'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition disabled:cursor-default',
              action.completedAt
                ? 'border-emerald-500 bg-emerald-500 text-white'
                : 'border-slate-300 hover:border-emerald-500 dark:border-slate-600',
            ]"
            @click="toggle(action)"
          >
            <AppIcon v-if="action.completedAt" name="check" :size="14" :stroke="2.5" />
          </button>
          <div class="min-w-0 flex-1">
            <p
              :class="[
                'text-sm',
                action.completedAt ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-800 dark:text-slate-200',
              ]"
            >
              {{ action.description }}
            </p>
            <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span v-if="action.assignee" class="inline-flex items-center gap-1.5">
                <UserAvatar :name="action.assignee.name" size="sm" />{{ action.assignee.name }}
              </span>
              <span
                v-if="action.dueDate"
                :class="[
                  'inline-flex items-center gap-1',
                  !action.completedAt && isPast(action.dueDate) && 'font-medium text-rose-600 dark:text-rose-400',
                ]"
              >
                <AppIcon name="calendar" :size="13" />
                {{ formatDate(action.dueDate) }}
                <template v-if="!action.completedAt && isPast(action.dueDate)">· {{ t('action.overdue') }}</template>
              </span>
              <span v-if="action.completedAt" class="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <AppIcon name="check" :size="13" />{{ formatDate(action.completedAt) }}
              </span>
            </div>
          </div>
          <button
            v-if="canEdit"
            type="button"
            class="rounded-md p-1 text-slate-400 opacity-100 transition hover:bg-rose-50 hover:text-rose-600 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-rose-500/10"
            :aria-label="t('common.delete')"
            @click="remove(action)"
          >
            <AppIcon name="trash" :size="16" />
          </button>
        </li>
      </ul>

      <form
        v-if="canEdit"
        class="mt-4 space-y-3 rounded-xl border border-dashed border-slate-300 p-3 dark:border-slate-700"
        @submit.prevent="add"
      >
        <input
          v-model="form.description"
          class="field"
          maxlength="500"
          :placeholder="t('action.placeholder')"
          :aria-label="t('action.placeholder')"
        />
        <div class="flex flex-col gap-2 sm:flex-row">
          <select v-model="form.assigneeId" class="field sm:flex-1" :aria-label="t('action.assignee')">
            <option value="">{{ t('action.assignee') }}: {{ t('common.none').toLowerCase() }}</option>
            <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }}</option>
          </select>
          <input v-model="form.dueDate" type="date" class="field sm:w-44" :aria-label="t('action.dueDate')" />
          <BaseButton type="submit" icon="plus" :loading="saving" :disabled="form.description.trim().length < 3">
            {{ t('action.add') }}
          </BaseButton>
        </div>
      </form>
    </template>
  </div>
</template>
