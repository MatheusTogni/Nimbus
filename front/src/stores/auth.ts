import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authApi, demoApi, usersApi } from '@/api'
import { setRefreshHandler, tokenStore } from '@/api/http'
import { setLocale } from '@/i18n'
import type { DemoInfo, Locale, Profile, Session, ThemePreference } from '@/types/api'
import { useUiStore } from './ui'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<Profile | null>(null)
  const demoInfo = ref<DemoInfo | null>(null)
  let restoring: Promise<void> | null = null

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')
  const canEdit = computed(() => user.value?.role === 'ADMIN' || user.value?.role === 'MANAGER')
  const isDemo = computed(() => !!user.value?.organization.isDemo)

  function applySession(session: Session) {
    tokenStore.set(session.accessToken)
    setUser(session.user)
  }

  function setUser(profile: Profile) {
    user.value = profile
    // The demo user is shared by every visitor, so its preferences stay in the browser only.
    if (profile.organization.isDemo) return
    setLocale(profile.locale)
    useUiStore().setTheme(profile.theme)
  }

  function clear() {
    tokenStore.set(null)
    user.value = null
  }

  // Used by the HTTP client when an access token expires.
  setRefreshHandler(async () => {
    try {
      const session = await authApi.refresh()
      applySession(session)
      return session.accessToken
    } catch {
      clear()
      return null
    }
  })

  /** Restores the session from the refresh cookie once per page load. */
  function restore(): Promise<void> {
    restoring ??= authApi
      .refresh()
      .then(applySession)
      .catch(() => clear())
    return restoring
  }

  async function login(email: string, password: string) {
    applySession(await authApi.login(email, password))
  }

  async function loginDemo() {
    applySession(await authApi.demo())
  }

  async function logout() {
    try {
      await authApi.logout()
    } finally {
      clear()
      restoring = null
    }
  }

  async function updatePreferences(prefs: { locale?: Locale; theme?: ThemePreference; name?: string }) {
    if (prefs.locale) setLocale(prefs.locale)
    if (prefs.theme) useUiStore().setTheme(prefs.theme)
    if (!user.value) return
    if (user.value.organization.isDemo && !prefs.name) return
    setUser(await usersApi.updateProfile(prefs))
  }

  async function loadDemoInfo() {
    if (demoInfo.value) return demoInfo.value
    try {
      demoInfo.value = await demoApi.info()
    } catch {
      demoInfo.value = null
    }
    return demoInfo.value
  }

  return {
    user,
    demoInfo,
    isAuthenticated,
    isAdmin,
    canEdit,
    isDemo,
    restore,
    login,
    loginDemo,
    logout,
    clear,
    updatePreferences,
    loadDemoInfo,
  }
})
