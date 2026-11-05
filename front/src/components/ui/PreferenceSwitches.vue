<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { LOCALES } from '@/i18n'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import type { ThemePreference } from '@/types/api'
import AppIcon from './AppIcon.vue'

const { t, locale } = useI18n()
const ui = useUiStore()
const auth = useAuthStore()

const THEME_ORDER: ThemePreference[] = ['light', 'dark', 'system']
const THEME_ICON = { light: 'sun', dark: 'moon', system: 'monitor' } as const

const nextLocale = computed(() => LOCALES.find((l) => l.value !== locale.value) ?? LOCALES[0]!)
const currentShort = computed(() => LOCALES.find((l) => l.value === locale.value)?.short ?? 'PT')

function cycleTheme() {
  const next = THEME_ORDER[(THEME_ORDER.indexOf(ui.theme) + 1) % THEME_ORDER.length]!
  void auth.updatePreferences({ theme: next }).catch(() => undefined)
}

function toggleLocale() {
  void auth.updatePreferences({ locale: nextLocale.value.value }).catch(() => undefined)
}

const btn =
  'inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
</script>

<template>
  <div class="flex items-center gap-1">
    <button
      type="button"
      :class="btn"
      :title="`${t('common.language')}: ${nextLocale.label}`"
      :aria-label="`${t('common.language')}: ${nextLocale.label}`"
      @click="toggleLocale"
    >
      <AppIcon name="globe" :size="18" />
      <span class="text-xs font-semibold">{{ currentShort }}</span>
    </button>
    <button
      type="button"
      :class="btn"
      :title="`${t('common.theme')}: ${t(`themes.${ui.theme}`)}`"
      :aria-label="`${t('common.theme')}: ${t(`themes.${ui.theme}`)}`"
      @click="cycleTheme"
    >
      <AppIcon :name="THEME_ICON[ui.theme]" :size="18" />
    </button>
  </div>
</template>
