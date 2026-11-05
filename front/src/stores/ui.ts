import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ThemePreference } from '@/types/api'

export type ToastKind = 'success' | 'error' | 'info'
export interface Toast {
  id: number
  kind: ToastKind
  message: string
}

export interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  danger?: boolean
}

const THEME_KEY = 'nimbus.theme'
const media = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null

function readTheme(): ThemePreference {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  } catch {
    // ignore
  }
  return 'system'
}

export const useUiStore = defineStore('ui', () => {
  // Theme
  const theme = ref<ThemePreference>(readTheme())
  const systemDark = ref(media?.matches ?? false)
  media?.addEventListener('change', (e) => (systemDark.value = e.matches))
  const isDark = computed(() => theme.value === 'dark' || (theme.value === 'system' && systemDark.value))

  function applyTheme() {
    document.documentElement.classList.toggle('dark', isDark.value)
  }

  function setTheme(value: ThemePreference) {
    theme.value = value
    try {
      localStorage.setItem(THEME_KEY, value)
    } catch {
      // ignore
    }
    applyTheme()
  }

  // Toasts
  const toasts = ref<Toast[]>([])
  let nextId = 1

  function toast(message: string, kind: ToastKind = 'success', timeout = 4500) {
    const id = nextId++
    toasts.value.push({ id, kind, message })
    if (timeout) setTimeout(() => dismiss(id), timeout)
  }

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  // Confirm dialog (promise based)
  const confirmState = ref<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null)

  function confirm(options: ConfirmOptions): Promise<boolean> {
    confirmState.value?.resolve(false)
    return new Promise((resolve) => {
      confirmState.value = { ...options, resolve }
    })
  }

  function settleConfirm(ok: boolean) {
    confirmState.value?.resolve(ok)
    confirmState.value = null
  }

  // Mobile sidebar
  const sidebarOpen = ref(false)

  return {
    theme,
    isDark,
    setTheme,
    applyTheme,
    toasts,
    toast,
    dismiss,
    confirmState,
    confirm,
    settleConfirm,
    sidebarOpen,
  }
})
