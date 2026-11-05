<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BrandLogo from '@/components/ui/BrandLogo.vue'
import FormField from '@/components/ui/FormField.vue'
import PreferenceSwitches from '@/components/ui/PreferenceSwitches.vue'
import { useNotify } from '@/composables/useNotify'
import { useAuthStore } from '@/stores/auth'
import { formatTime } from '@/utils/format'
import { LEVEL_CLASSES, levelFromScore } from '@/utils/risk'

const { t, tm, rt } = useI18n()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const notify = useNotify()

const form = reactive({ email: '', password: '' })
const loading = ref<'form' | 'demo' | null>(null)
const error = ref<string | null>(null)
const copied = ref<string | null>(null)

const demo = computed(() => auth.demoInfo)
const resetTime = computed(() => (demo.value ? formatTime(demo.value.nextResetAt) : '03:00'))
const features = computed(() => (tm('auth.features') as string[]).map((f) => rt(f)))

/** Decorative matrix for the brand panel: score of each cell, impact 5 -> 1. */
const heroMatrix = [5, 4, 3, 2, 1].map((i) => [1, 2, 3, 4, 5].map((p) => levelFromScore(p * i)))

async function goNext() {
  const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') ? route.query.redirect : '/dashboard'
  await router.replace(redirect)
}

async function submit() {
  error.value = null
  loading.value = 'form'
  try {
    await auth.login(form.email, form.password)
    await goNext()
  } catch (e) {
    error.value = notify.errorMessage(e)
  } finally {
    loading.value = null
  }
}

async function enterDemo() {
  error.value = null
  loading.value = 'demo'
  try {
    await auth.loginDemo()
    await goNext()
  } catch (e) {
    error.value = notify.errorMessage(e)
  } finally {
    loading.value = null
  }
}

async function copy(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    copied.value = value
    setTimeout(() => (copied.value = null), 1500)
  } catch {
    // Clipboard unavailable (e.g. insecure context): ignore.
  }
}

onMounted(() => {
  void auth.loadDemoInfo()
  if (route.query.expired) error.value = t('auth.sessionExpired')
})
</script>

<template>
  <div class="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
    <!-- Brand panel -->
    <section class="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col">
      <div class="pointer-events-none absolute -top-40 -left-32 size-[32rem] rounded-full bg-brand-600/30 blur-3xl" />
      <div class="pointer-events-none absolute -right-24 -bottom-48 size-[28rem] rounded-full bg-rose-500/20 blur-3xl" />

      <BrandLogo inverted class="relative" />

      <div class="relative my-auto max-w-lg py-12">
        <h1 class="text-4xl leading-tight font-semibold tracking-tight">{{ t('auth.pitchTitle') }}</h1>
        <p class="mt-4 text-base leading-relaxed text-slate-300">{{ t('auth.pitchText') }}</p>
        <ul class="mt-8 space-y-3">
          <li v-for="feature in features" :key="feature" class="flex items-center gap-3 text-slate-200">
            <span class="flex size-6 items-center justify-center rounded-full bg-white/10">
              <AppIcon name="check" :size="14" :stroke="2.4" />
            </span>
            {{ feature }}
          </li>
        </ul>

        <div class="mt-12 grid w-64 grid-cols-5 gap-1.5 opacity-90" aria-hidden="true">
          <template v-for="(row, ri) in heroMatrix" :key="ri">
            <span
              v-for="(level, ci) in row"
              :key="ci"
              :class="['aspect-square rounded-md', LEVEL_CLASSES[level].dot]"
              :style="{ opacity: 0.35 + ((4 - ri + ci) / 8) * 0.65 }"
            />
          </template>
        </div>
      </div>

      <p class="relative text-xs text-slate-500">NestJS · Vue 3 · PostgreSQL · Tailwind CSS</p>
    </section>

    <!-- Form -->
    <section class="flex flex-col">
      <div class="flex items-center justify-between p-4 sm:p-6">
        <BrandLogo class="lg:invisible" />
        <PreferenceSwitches />
      </div>

      <div class="flex flex-1 items-center justify-center px-4 pb-12 sm:px-6">
        <div class="w-full max-w-sm">
          <h2 class="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ t('auth.title') }}</h2>
          <p class="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{{ t('auth.subtitle') }}</p>

          <div
            v-if="error"
            class="mt-6 flex gap-2.5 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
            role="alert"
          >
            <AppIcon name="alert" :size="18" />
            {{ error }}
          </div>

          <form class="mt-6 space-y-4" @submit.prevent="submit">
            <FormField :label="t('auth.email')" id="email">
              <input id="email" v-model="form.email" type="email" autocomplete="email" required class="field" />
            </FormField>
            <FormField :label="t('auth.password')" id="password">
              <input
                id="password"
                v-model="form.password"
                type="password"
                autocomplete="current-password"
                required
                class="field"
              />
            </FormField>
            <BaseButton type="submit" size="lg" block :loading="loading === 'form'" :disabled="!!loading">
              {{ loading === 'form' ? t('auth.signingIn') : t('auth.signIn') }}
            </BaseButton>
          </form>

          <div class="my-6 flex items-center gap-3 text-xs text-slate-400 uppercase">
            <span class="h-px flex-1 bg-slate-200 dark:bg-slate-800" />{{ t('auth.or') }}<span class="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>

          <div class="rounded-2xl border border-brand-200 bg-brand-50/60 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
            <p class="text-sm text-slate-700 dark:text-slate-300">{{ t('auth.demoHint') }}</p>
            <BaseButton
              class="mt-3"
              variant="secondary"
              size="lg"
              block
              icon="arrow-right"
              :loading="loading === 'demo'"
              :disabled="!!loading || (demo !== null && !demo.enabled)"
              @click="enterDemo"
            >
              {{ t('auth.demoButton') }}
            </BaseButton>

            <div v-if="demo" class="mt-4 space-y-1.5 text-xs">
              <p class="font-medium text-slate-500 dark:text-slate-400">{{ t('auth.credentials') }}</p>
              <div
                v-for="item in [
                  { label: t('auth.email'), value: demo.email },
                  { label: t('auth.password'), value: demo.password },
                ]"
                :key="item.label"
                class="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
              >
                <span class="text-slate-500 dark:text-slate-400">{{ item.label }}</span>
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 font-mono text-slate-800 hover:text-brand-600 dark:text-slate-200"
                  :title="t('common.copy')"
                  @click="copy(item.value)"
                >
                  {{ item.value }}
                  <AppIcon :name="copied === item.value ? 'check' : 'copy'" :size="13" />
                </button>
              </div>
              <p class="flex items-center gap-1.5 pt-1 text-slate-500 dark:text-slate-400">
                <AppIcon name="clock" :size="13" />{{ t('auth.resetInfo', { time: resetTime }) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
