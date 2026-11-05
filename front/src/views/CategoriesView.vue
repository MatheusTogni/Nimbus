<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { categoriesApi } from '@/api'
import AppIcon from '@/components/ui/AppIcon.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import FormField from '@/components/ui/FormField.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import { useNotify } from '@/composables/useNotify'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import type { Category } from '@/types/api'

const { t } = useI18n()
const auth = useAuthStore()
const ui = useUiStore()
const notify = useNotify()

const PRESETS = ['#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#84cc16', '#10b981', '#14b8a6', '#64748b']

const categories = ref<Category[] | null>(null)
const modal = reactive({ open: false, id: null as string | null, name: '', color: PRESETS[0]!, saving: false, submitted: false })

async function load() {
  try {
    categories.value = await categoriesApi.list()
  } catch (error) {
    notify.error(error)
  }
}

function openModal(category?: Category) {
  Object.assign(modal, {
    open: true,
    id: category?.id ?? null,
    name: category?.name ?? '',
    color: category?.color ?? PRESETS[(categories.value?.length ?? 0) % PRESETS.length],
    submitted: false,
  })
}

async function save() {
  modal.submitted = true
  if (modal.name.trim().length < 2) return
  modal.saving = true
  try {
    const body = { name: modal.name.trim(), color: modal.color }
    if (modal.id) await categoriesApi.update(modal.id, body)
    else await categoriesApi.create(body)
    notify.success(t('category.saved'))
    modal.open = false
    await load()
  } catch (error) {
    notify.error(error)
  } finally {
    modal.saving = false
  }
}

async function remove(category: Category) {
  const ok = await ui.confirm({
    title: t('category.deleteTitle', { name: category.name }),
    message: t('category.deleteText'),
    confirmLabel: t('common.delete'),
    danger: true,
  })
  if (!ok) return
  try {
    await categoriesApi.remove(category.id)
    notify.success(t('category.deleted'))
    await load()
  } catch (error) {
    notify.error(error)
  }
}

onMounted(load)
</script>

<template>
  <div>
    <PageHeader :title="t('category.title')" :subtitle="t('category.subtitle')">
      <template #actions>
        <BaseButton v-if="auth.canEdit" icon="plus" @click="openModal()">{{ t('category.new') }}</BaseButton>
      </template>
    </PageHeader>

    <div v-if="!categories" class="flex justify-center py-16 text-slate-400"><BaseSpinner :size="24" /></div>
    <div v-else-if="!categories.length" class="card"><EmptyState icon="tag" :title="t('category.empty')" /></div>

    <ul v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <li v-for="category in categories" :key="category.id" class="card group flex items-center gap-4 p-4">
        <span class="flex size-11 shrink-0 items-center justify-center rounded-xl" :style="{ background: `${category.color}22`, color: category.color }">
          <AppIcon name="tag" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="truncate font-medium text-slate-900 dark:text-white">{{ category.name }}</p>
          <RouterLink
            :to="{ path: '/risks', query: { categoryId: category.id } }"
            class="text-sm text-slate-500 hover:text-brand-600 dark:text-slate-400"
          >
            {{ t('category.risks', category._count.risks) }}
          </RouterLink>
        </div>
        <div v-if="auth.canEdit" class="flex gap-1 transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
          <button type="button" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200" :aria-label="t('common.edit')" @click="openModal(category)">
            <AppIcon name="pencil" :size="17" />
          </button>
          <button type="button" class="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10" :aria-label="t('common.delete')" @click="remove(category)">
            <AppIcon name="trash" :size="17" />
          </button>
        </div>
      </li>
    </ul>

    <BaseModal :open="modal.open" :title="modal.id ? t('category.edit') : t('category.new')" size="sm" @close="modal.open = false">
      <form id="category-form" class="space-y-5" @submit.prevent="save">
        <FormField id="category-name" :label="t('category.name')" :error="modal.submitted && modal.name.trim().length < 2 ? t('validation.minLength', { min: 2 }) : null">
          <input id="category-name" v-model="modal.name" class="field" maxlength="40" />
        </FormField>
        <FormField :label="t('category.color')">
          <div class="flex flex-wrap items-center gap-2">
            <button
              v-for="color in PRESETS"
              :key="color"
              type="button"
              :aria-label="color"
              :aria-pressed="modal.color === color"
              :class="['size-8 rounded-full transition', modal.color === color ? 'ring-2 ring-slate-900 ring-offset-2 dark:ring-white dark:ring-offset-slate-900' : 'hover:scale-110']"
              :style="{ background: color }"
              @click="modal.color = color"
            />
            <input v-model="modal.color" type="color" class="size-8 cursor-pointer rounded-full border-0 bg-transparent p-0" :aria-label="t('category.color')" />
          </div>
        </FormField>
      </form>
      <template #footer>
        <BaseButton variant="secondary" @click="modal.open = false">{{ t('common.cancel') }}</BaseButton>
        <BaseButton type="submit" form="category-form" :loading="modal.saving">{{ t('common.save') }}</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
