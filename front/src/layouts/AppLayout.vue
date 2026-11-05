<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AppIcon, { type IconName } from '@/components/ui/AppIcon.vue'
import BrandLogo from '@/components/ui/BrandLogo.vue'
import PreferenceSwitches from '@/components/ui/PreferenceSwitches.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { formatTime } from '@/utils/format'

const { t } = useI18n()
const auth = useAuthStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()

interface NavItem {
  to: string
  label: string
  icon: IconName
}

const nav = computed<NavItem[]>(() => [
  { to: '/dashboard', label: t('nav.dashboard'), icon: 'dashboard' },
  { to: '/risks', label: t('nav.risks'), icon: 'shield' },
  { to: '/categories', label: t('nav.categories'), icon: 'tag' },
  ...(auth.isAdmin ? [{ to: '/users', label: t('nav.users'), icon: 'users' as IconName }] : []),
])

const resetTime = computed(() => (auth.demoInfo ? formatTime(auth.demoInfo.nextResetAt) : '03:00'))
const isActive = (to: string) => route.path === to || route.path.startsWith(`${to}/`)

async function logout() {
  await auth.logout()
  await router.push('/login')
}

watch(() => route.fullPath, () => (ui.sidebarOpen = false))
onMounted(() => {
  if (auth.isDemo) void auth.loadDemoInfo()
})
</script>

<template>
  <div class="min-h-screen">
    <!-- Mobile backdrop -->
    <Transition enter-from-class="opacity-0" leave-to-class="opacity-0" enter-active-class="transition" leave-active-class="transition">
      <div v-if="ui.sidebarOpen" class="fixed inset-0 z-40 bg-slate-950/50 lg:hidden" @click="ui.sidebarOpen = false" />
    </Transition>

    <!-- Sidebar -->
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:translate-x-0 dark:border-slate-800 dark:bg-slate-900',
        ui.sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      ]"
      :aria-label="t('nav.menu')"
    >
      <div class="flex h-16 items-center justify-between px-5">
        <RouterLink to="/dashboard"><BrandLogo /></RouterLink>
        <button type="button" class="rounded-lg p-1.5 text-slate-400 lg:hidden" :aria-label="t('common.close')" @click="ui.sidebarOpen = false">
          <AppIcon name="x" />
        </button>
      </div>

      <div v-if="auth.user" class="mx-3 mb-2 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
        <p class="truncate text-xs text-slate-500 dark:text-slate-400">{{ t('profile.organization') }}</p>
        <p class="flex items-center gap-2 truncate text-sm font-medium text-slate-900 dark:text-white">
          {{ auth.user.organization.name }}
          <span v-if="auth.isDemo" class="rounded bg-amber-100 px-1.5 py-px text-[10px] font-semibold text-amber-800 uppercase dark:bg-amber-500/20 dark:text-amber-300">
            {{ t('demo.badge') }}
          </span>
        </p>
      </div>

      <nav class="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          :class="[
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
            isActive(item.to)
              ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
          ]"
          :aria-current="isActive(item.to) ? 'page' : undefined"
        >
          <AppIcon :name="item.icon" />
          {{ item.label }}
        </RouterLink>
      </nav>

      <div v-if="auth.user" class="border-t border-slate-200 p-3 dark:border-slate-800">
        <RouterLink
          to="/profile"
          class="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <UserAvatar :name="auth.user.name" />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-medium text-slate-900 dark:text-white">{{ auth.user.name }}</span>
            <span class="block truncate text-xs text-slate-500 dark:text-slate-400">{{ t(`user.roles.${auth.user.role}`) }}</span>
          </span>
        </RouterLink>
        <button
          type="button"
          class="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          @click="logout"
        >
          <AppIcon name="logout" />
          {{ t('nav.logout') }}
        </button>
      </div>
    </aside>

    <div class="lg:pl-64">
      <div
        v-if="auth.isDemo"
        class="flex items-start gap-2.5 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 sm:items-center sm:px-6 lg:px-8 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200"
        role="status"
      >
        <AppIcon name="info" :size="18" class="mt-px sm:mt-0" />
        <p>{{ t('demo.banner', { time: resetTime }) }}</p>
      </div>

      <header
        class="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-950/80"
      >
        <button
          type="button"
          class="-ml-1 rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800"
          :aria-label="t('nav.menu')"
          @click="ui.sidebarOpen = true"
        >
          <AppIcon name="menu" />
        </button>
        <RouterLink to="/dashboard" class="lg:hidden"><BrandLogo /></RouterLink>
        <div class="flex-1" />
        <PreferenceSwitches />
      </header>

      <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <RouterView v-slot="{ Component }">
          <component :is="Component" :key="route.path" />
        </RouterView>
      </main>
    </div>
  </div>
</template>
