<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { categoriesApi, risksApi, usersApi } from '@/api'
import ScorePicker from '@/components/risk/ScorePicker.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import FormField from '@/components/ui/FormField.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import { useNotify } from '@/composables/useNotify'
import { RISK_STATUSES, type Category, type Ref as UserRef, type RiskInput, type RiskStatus } from '@/types/api'
import { fromDateInput, toDateInput } from '@/utils/format'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const notify = useNotify()

const id = route.params.id as string | undefined
const isEdit = !!id
const code = ref<string | null>(null)
const ready = ref(!isEdit)
const saving = ref(false)
const submitted = ref(false)
const categories = ref<Category[]>([])
const users = ref<UserRef[]>([])

const form = reactive({
  title: '',
  description: '',
  categoryId: '',
  ownerId: '',
  status: 'IDENTIFIED' as RiskStatus,
  reviewDate: '',
  probability: 3,
  impact: 3,
  hasResidual: false,
  residualProbability: 2,
  residualImpact: 2,
})

const errors = computed(() => ({
  title: form.title.trim().length < 3 ? t('validation.minLength', { min: 3 }) : null,
  residual:
    form.hasResidual && form.residualProbability * form.residualImpact > form.probability * form.impact
      ? t('risk.form.residualTooHigh')
      : null,
}))
const valid = computed(() => !errors.value.title && !errors.value.residual)

// Suggest a lower residual the first time it is enabled.
watch(
  () => form.hasResidual,
  (enabled) => {
    if (enabled && !isEdit) {
      form.residualProbability = Math.max(1, form.probability - 1)
      form.residualImpact = Math.max(1, form.impact - 1)
    }
  },
)

function payload(): RiskInput {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    categoryId: form.categoryId || null,
    ownerId: form.ownerId || null,
    status: form.status,
    reviewDate: fromDateInput(form.reviewDate),
    probability: form.probability,
    impact: form.impact,
    residualProbability: form.hasResidual ? form.residualProbability : null,
    residualImpact: form.hasResidual ? form.residualImpact : null,
  }
}

async function submit() {
  submitted.value = true
  if (!valid.value) return
  saving.value = true
  try {
    const risk = isEdit ? await risksApi.update(id, payload()) : await risksApi.create(payload())
    notify.success(isEdit ? t('risk.updated') : t('risk.created', { code: risk.code }))
    await router.push(`/risks/${risk.id}`)
  } catch (error) {
    notify.error(error)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const [cats, people, risk] = await Promise.all([
      categoriesApi.list(),
      usersApi.options(),
      isEdit ? risksApi.get(id) : Promise.resolve(null),
    ])
    categories.value = cats
    users.value = people
    if (risk) {
      code.value = risk.code
      Object.assign(form, {
        title: risk.title,
        description: risk.description,
        categoryId: risk.categoryId ?? '',
        ownerId: risk.ownerId ?? '',
        status: risk.status,
        reviewDate: toDateInput(risk.reviewDate),
        probability: risk.probability,
        impact: risk.impact,
        hasResidual: risk.residualProbability !== null,
        residualProbability: risk.residualProbability ?? 2,
        residualImpact: risk.residualImpact ?? 2,
      })
    }
    ready.value = true
  } catch (error) {
    notify.error(error)
    if (isEdit) await router.replace('/risks')
  }
})
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <RouterLink
      :to="isEdit ? `/risks/${id}` : '/risks'"
      class="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
    >
      <AppIcon name="chevron-left" :size="16" />{{ t('common.back') }}
    </RouterLink>

    <PageHeader :title="isEdit ? t('risk.edit') : t('risk.new')">
      <template v-if="code" #eyebrow>
        <p class="mb-1 font-mono text-sm text-slate-500">{{ code }}</p>
      </template>
    </PageHeader>

    <div v-if="!ready" class="flex justify-center py-20 text-slate-400"><BaseSpinner :size="24" /></div>

    <form v-else class="space-y-6" novalidate @submit.prevent="submit">
      <section class="card p-5 sm:p-6">
        <h2 class="mb-5 font-semibold text-slate-900 dark:text-white">{{ t('risk.form.basics') }}</h2>
        <div class="grid gap-5 sm:grid-cols-2">
          <FormField id="title" class="sm:col-span-2" :label="t('risk.fields.title')" :error="submitted ? errors.title : null">
            <input
              id="title"
              v-model="form.title"
              class="field"
              :class="submitted && errors.title && 'field-error'"
              maxlength="120"
              :placeholder="t('risk.form.titlePlaceholder')"
            />
          </FormField>
          <FormField id="description" class="sm:col-span-2" :label="t('risk.fields.description')" optional>
            <textarea
              id="description"
              v-model="form.description"
              rows="4"
              maxlength="2000"
              class="field resize-y"
              :placeholder="t('risk.form.descriptionPlaceholder')"
            />
          </FormField>
          <FormField id="category" :label="t('risk.fields.category')">
            <select id="category" v-model="form.categoryId" class="field">
              <option value="">{{ t('common.uncategorized') }}</option>
              <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </FormField>
          <FormField id="owner" :label="t('risk.fields.owner')">
            <select id="owner" v-model="form.ownerId" class="field">
              <option value="">{{ t('common.unassigned') }}</option>
              <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }}</option>
            </select>
          </FormField>
          <FormField id="status" :label="t('risk.fields.status')">
            <select id="status" v-model="form.status" class="field">
              <option v-for="s in RISK_STATUSES" :key="s" :value="s">{{ t(`risk.statuses.${s}`) }}</option>
            </select>
          </FormField>
          <FormField id="reviewDate" :label="t('risk.fields.reviewDate')" optional>
            <input id="reviewDate" v-model="form.reviewDate" type="date" class="field" />
          </FormField>
        </div>
      </section>

      <section class="card p-5 sm:p-6">
        <h2 class="font-semibold text-slate-900 dark:text-white">{{ t('risk.form.assessment') }}</h2>
        <p class="mb-5 text-sm text-slate-500 dark:text-slate-400">{{ t('risk.form.assessmentHint') }}</p>
        <ScorePicker v-model:probability="form.probability" v-model:impact="form.impact" id-prefix="inherent" />

        <div class="mt-6 border-t border-slate-100 pt-6 dark:border-slate-800">
          <label class="flex cursor-pointer items-start gap-3">
            <input v-model="form.hasResidual" type="checkbox" class="mt-0.5 size-4 rounded border-slate-300 accent-brand-600" />
            <span>
              <span class="block text-sm font-medium text-slate-900 dark:text-white">{{ t('risk.form.residualToggle') }}</span>
              <span class="block text-xs text-slate-500 dark:text-slate-400">{{ t('risk.form.residualHint') }}</span>
            </span>
          </label>
          <div v-if="form.hasResidual" class="mt-5">
            <ScorePicker
              v-model:probability="form.residualProbability"
              v-model:impact="form.residualImpact"
              id-prefix="residual"
              :error="errors.residual"
            />
          </div>
        </div>
      </section>

      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <BaseButton variant="secondary" :to="isEdit ? `/risks/${id}` : '/risks'">{{ t('common.cancel') }}</BaseButton>
        <BaseButton type="submit" icon="check" :loading="saving" :disabled="submitted && !valid">
          {{ saving ? t('common.saving') : t('common.save') }}
        </BaseButton>
      </div>
    </form>
  </div>
</template>
