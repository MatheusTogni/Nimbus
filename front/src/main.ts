import './assets/main.css'

import { createPinia } from 'pinia'
import { createApp } from 'vue'

import { setSessionExpiredHandler } from '@/api/http'
import { i18n, setLocale, currentLocale } from '@/i18n'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(i18n)
app.use(router)

setLocale(currentLocale())
useUiStore().applyTheme()

// When the refresh token is no longer valid, go back to the login page.
setSessionExpiredHandler(() => {
  useAuthStore().clear()
  const current = router.currentRoute.value
  if (!current.meta.public) {
    void router.push({ name: 'login', query: { redirect: current.fullPath, expired: '1' } })
  }
})

app.mount('#app')
