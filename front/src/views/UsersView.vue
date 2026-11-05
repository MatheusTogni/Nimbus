<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { usersApi } from '@/api'
import AppIcon from '@/components/ui/AppIcon.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import FormField from '@/components/ui/FormField.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import { useNotify } from '@/composables/useNotify'
import { useAuthStore } from '@/stores/auth'
import { ROLES, type Role, type User } from '@/types/api'
import { formatRelative } from '@/utils/format'

const { t } = useI18n()
const auth = useAuthStore()
const notify = useNotify()

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,128}$/
const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const users = ref<User[] | null>(null)
const modal = reactive({
  open: false,
  user: null as User | null,
  name: '',
  email: '',
  role: 'VIEWER' as Role,
  active: true,
  password: '',
  saving: false,
  submitted: false,
})
const locked = computed(() => auth.isDemo)

const errors = computed(() => ({
  name: modal.name.trim().length < 2 ? t('validation.minLength', { min: 2 }) : null,
  email: !modal.user && !EMAIL_RULE.test(modal.email.trim()) ? t('validation.email') : null,
  password:
    (!modal.user || modal.password) && !PASSWORD_RULE.test(modal.password) ? t('validation.password') : null,
}))

async function load() {
  try {
    users.value = await usersApi.list()
  } catch (error) {
    notify.error(error)
  }
}

function openModal(user?: User) {
  Object.assign(modal, {
    open: true,
    user: user ?? null,
    name: user?.name ?? '',
    email: user?.email ?? '',
    role: user?.role ?? 'VIEWER',
    active: user?.active ?? true,
    password: '',
    submitted: false,
  })
}

async function save() {
  modal.submitted = true
  if (Object.values(errors.value).some(Boolean)) return
  modal.saving = true
  try {
    if (modal.user) {
      await usersApi.update(modal.user.id, {
        name: modal.name.trim(),
        role: modal.role,
        active: modal.active,
        ...(modal.password ? { password: modal.password } : {}),
      })
      notify.success(t('user.updated'))
    } else {
      await usersApi.create({ name: modal.name.trim(), email: modal.email.trim(), role: modal.role, password: modal.password })
      notify.success(t('user.created'))
    }
    modal.open = false
    await load()
  } catch (error) {
    notify.error(error)
  } finally {
    modal.saving = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <PageHeader :title="t('user.title')" :subtitle="t('user.subtitle')">
      <template #actions>
        <BaseButton icon="plus" :disabled="locked" :title="locked ? t('demo.restricted') : undefined" @click="openModal()">
          {{ t('user.invite') }}
        </BaseButton>
      </template>
    </PageHeader>

    <div
      v-if="locked"
      class="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200"
    >
      <AppIcon name="lock" :size="18" class="mt-0.5" />
      <p>{{ t('demo.usersReadOnly') }}</p>
    </div>

    <div v-if="!users" class="flex justify-center py-16 text-slate-400"><BaseSpinner :size="24" /></div>

    <div v-else class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-slate-200 bg-slate-50/80 text-xs text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
            <tr>
              <th scope="col" class="px-4 py-3 font-medium">{{ t('user.name') }}</th>
              <th scope="col" class="px-4 py-3 font-medium">{{ t('user.role') }}</th>
              <th scope="col" class="px-4 py-3 font-medium">{{ t('user.status') }}</th>
              <th scope="col" class="hidden px-4 py-3 font-medium md:table-cell">{{ t('user.lastLogin') }}</th>
              <th scope="col" class="px-4 py-3"><span class="sr-only">{{ t('common.edit') }}</span></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="user in users" :key="user.id" :class="!user.active && 'opacity-60'">
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <UserAvatar :name="user.name" />
                  <div class="min-w-0">
                    <p class="font-medium text-slate-900 dark:text-white">
                      {{ user.name }}
                      <span v-if="user.id === auth.user?.id" class="text-xs font-normal text-slate-400">({{ t('user.you') }})</span>
                    </p>
                    <p class="truncate text-xs text-slate-500 dark:text-slate-400">{{ user.email }}</p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3">
                <span class="text-slate-700 dark:text-slate-300">{{ t(`user.roles.${user.role}`) }}</span>
              </td>
              <td class="px-4 py-3">
                <span
                  :class="[
                    'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
                    user.active
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800',
                  ]"
                >
                  <span :class="['size-1.5 rounded-full', user.active ? 'bg-emerald-500' : 'bg-slate-400']" />
                  {{ user.active ? t('user.active') : t('user.inactive') }}
                </span>
              </td>
              <td class="hidden px-4 py-3 text-slate-500 md:table-cell dark:text-slate-400">
                {{ user.lastLoginAt ? formatRelative(user.lastLoginAt) : t('user.never') }}
              </td>
              <td class="px-4 py-3 text-right">
                <BaseButton
                  variant="ghost"
                  size="sm"
                  :icon="locked ? 'lock' : 'pencil'"
                  :disabled="locked"
                  :title="locked ? t('demo.restricted') : undefined"
                  @click="openModal(user)"
                >
                  {{ t('common.edit') }}
                </BaseButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Role legend -->
    <div class="mt-4 grid gap-3 sm:grid-cols-3">
      <div v-for="role in ROLES" :key="role" class="rounded-xl border border-dashed border-slate-300 p-3 text-sm dark:border-slate-700">
        <p class="font-medium text-slate-900 dark:text-white">{{ t(`user.roles.${role}`) }}</p>
        <p class="text-xs text-slate-500 dark:text-slate-400">{{ t(`user.roleHints.${role}`) }}</p>
      </div>
    </div>

    <BaseModal :open="modal.open" :title="modal.user ? t('user.edit') : t('user.invite')" @close="modal.open = false">
      <form id="user-form" class="space-y-5" novalidate @submit.prevent="save">
        <FormField id="user-name" :label="t('user.name')" :error="modal.submitted ? errors.name : null">
          <input id="user-name" v-model="modal.name" class="field" maxlength="80" />
        </FormField>
        <FormField id="user-email" :label="t('user.email')" :error="modal.submitted ? errors.email : null">
          <input id="user-email" v-model="modal.email" type="email" class="field" maxlength="160" :disabled="!!modal.user" />
        </FormField>
        <FormField :label="t('user.role')">
          <div class="grid gap-2 sm:grid-cols-3">
            <label
              v-for="role in ROLES"
              :key="role"
              :class="[
                'cursor-pointer rounded-lg border p-3 text-sm transition',
                modal.role === role
                  ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500 dark:bg-brand-500/10'
                  : 'border-slate-200 hover:border-slate-300 dark:border-slate-700',
              ]"
            >
              <input v-model="modal.role" type="radio" name="role" :value="role" class="sr-only" />
              <span class="block font-medium text-slate-900 dark:text-white">{{ t(`user.roles.${role}`) }}</span>
              <span class="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{{ t(`user.roleHints.${role}`) }}</span>
            </label>
          </div>
        </FormField>
        <FormField
          id="user-password"
          :label="modal.user ? t('user.newPassword') : t('user.password')"
          :hint="t('user.passwordHint')"
          :error="modal.submitted ? errors.password : null"
        >
          <input id="user-password" v-model="modal.password" type="password" class="field" autocomplete="new-password" />
        </FormField>
        <label v-if="modal.user && modal.user.id !== auth.user?.id" class="flex items-center gap-2 text-sm">
          <input v-model="modal.active" type="checkbox" class="size-4 accent-brand-600" />
          {{ t('user.active') }}
        </label>
      </form>
      <template #footer>
        <BaseButton variant="secondary" @click="modal.open = false">{{ t('common.cancel') }}</BaseButton>
        <BaseButton type="submit" form="user-form" :loading="modal.saving">{{ t('common.save') }}</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
