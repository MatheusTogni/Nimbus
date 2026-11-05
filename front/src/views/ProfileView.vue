<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { usersApi } from '@/api'
import AppIcon from '@/components/ui/AppIcon.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import FormField from '@/components/ui/FormField.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import { useNotify } from '@/composables/useNotify'
import { LOCALES } from '@/i18n'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import type { Locale, ThemePreference } from '@/types/api'

const { t, locale } = useI18n()
const auth = useAuthStore()
const ui = useUiStore()
const notify = useNotify()

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,128}$/
const THEMES: { value: ThemePreference; icon: 'sun' | 'moon' | 'monitor' }[] = [
  { value: 'light', icon: 'sun' },
  { value: 'dark', icon: 'moon' },
  { value: 'system', icon: 'monitor' },
]

const name = ref(auth.user?.name ?? '')
const savingName = ref(false)
const password = reactive({ current: '', next: '', saving: false, submitted: false })

async function saveName() {
  if (name.value.trim().length < 2) return
  savingName.value = true
  try {
    await auth.updatePreferences({ name: name.value.trim() })
    notify.success(t('profile.saved'))
  } catch (error) {
    notify.error(error)
  } finally {
    savingName.value = false
  }
}

async function setPreference(prefs: { locale?: Locale; theme?: ThemePreference }) {
  try {
    await auth.updatePreferences(prefs)
  } catch (error) {
    notify.error(error)
  }
}

async function changePassword() {
  password.submitted = true
  if (!password.current || !PASSWORD_RULE.test(password.next)) return
  password.saving = true
  try {
    await usersApi.changePassword(password.current, password.next)
    notify.success(t('profile.passwordChanged'))
    Object.assign(password, { current: '', next: '', submitted: false })
  } catch (error) {
    notify.error(error)
  } finally {
    password.saving = false
  }
}
</script>

<template>
  <div v-if="auth.user" class="mx-auto max-w-3xl">
    <PageHeader :title="t('profile.title')" :subtitle="t('profile.subtitle')" />

    <div class="space-y-6">
      <!-- Info -->
      <section class="card p-5 sm:p-6">
        <div class="mb-6 flex items-center gap-4">
          <UserAvatar :name="auth.user.name" />
          <div>
            <p class="font-semibold text-slate-900 dark:text-white">{{ auth.user.name }}</p>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              {{ auth.user.email }} · {{ t(`user.roles.${auth.user.role}`) }} · {{ auth.user.organization.name }}
            </p>
          </div>
        </div>
        <form class="flex flex-col gap-3 sm:flex-row sm:items-end" @submit.prevent="saveName">
          <FormField id="profile-name" :label="t('user.name')" class="flex-1" :hint="auth.isDemo ? t('demo.nameLocked') : undefined">
            <input id="profile-name" v-model="name" class="field" maxlength="80" :disabled="auth.isDemo" />
          </FormField>
          <BaseButton type="submit" variant="secondary" :loading="savingName" :disabled="auth.isDemo || name.trim() === auth.user.name">
            {{ t('common.save') }}
          </BaseButton>
        </form>
      </section>

      <!-- Preferences -->
      <section class="card p-5 sm:p-6">
        <h2 class="mb-5 font-semibold text-slate-900 dark:text-white">{{ t('profile.preferences') }}</h2>
        <div class="grid gap-6 sm:grid-cols-2">
          <FormField :label="t('common.language')">
            <div class="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              <button
                v-for="item in LOCALES"
                :key="item.value"
                type="button"
                :aria-pressed="locale === item.value"
                :class="[
                  'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition',
                  locale === item.value ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 dark:text-slate-400',
                ]"
                @click="setPreference({ locale: item.value })"
              >
                {{ item.label }}
              </button>
            </div>
          </FormField>
          <FormField :label="t('common.theme')">
            <div class="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              <button
                v-for="item in THEMES"
                :key="item.value"
                type="button"
                :aria-pressed="ui.theme === item.value"
                :class="[
                  'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition',
                  ui.theme === item.value ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 dark:text-slate-400',
                ]"
                @click="setPreference({ theme: item.value })"
              >
                <AppIcon :name="item.icon" :size="16" />{{ t(`themes.${item.value}`) }}
              </button>
            </div>
          </FormField>
        </div>
      </section>

      <!-- Security -->
      <section class="card p-5 sm:p-6">
        <h2 class="mb-5 font-semibold text-slate-900 dark:text-white">{{ t('profile.security') }}</h2>
        <div
          v-if="auth.isDemo"
          class="flex items-center gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200"
        >
          <AppIcon name="lock" :size="18" />{{ t('demo.passwordLocked') }}
        </div>
        <form v-else class="grid gap-4 sm:grid-cols-2" novalidate @submit.prevent="changePassword">
          <FormField id="current-password" :label="t('profile.currentPassword')" :error="password.submitted && !password.current ? t('validation.required') : null">
            <input id="current-password" v-model="password.current" type="password" class="field" autocomplete="current-password" />
          </FormField>
          <FormField
            id="new-password"
            :label="t('profile.newPassword')"
            :hint="t('user.passwordHint')"
            :error="password.submitted && !PASSWORD_RULE.test(password.next) ? t('validation.password') : null"
          >
            <input id="new-password" v-model="password.next" type="password" class="field" autocomplete="new-password" />
          </FormField>
          <div class="sm:col-span-2">
            <BaseButton type="submit" variant="secondary" icon="lock" :loading="password.saving">{{ t('profile.changePassword') }}</BaseButton>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>
