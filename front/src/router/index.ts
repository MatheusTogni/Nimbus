import { createRouter, createWebHistory } from 'vue-router'
import { i18n } from '@/i18n'
import AppLayout from '@/layouts/AppLayout.vue'
import { useAuthStore } from '@/stores/auth'
import type { Role } from '@/types/api'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    public?: boolean
    roles?: Role[]
  }
}

const EDITORS: Role[] = ['ADMIN', 'MANAGER']

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true, title: 'auth.signIn' },
    },
    {
      path: '/',
      component: AppLayout,
      children: [
        { path: '', redirect: '/dashboard' },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
          meta: { title: 'nav.dashboard' },
        },
        {
          path: 'risks',
          name: 'risks',
          component: () => import('@/views/RiskListView.vue'),
          meta: { title: 'nav.risks' },
        },
        {
          path: 'risks/new',
          name: 'risk-new',
          component: () => import('@/views/RiskFormView.vue'),
          meta: { title: 'risk.new', roles: EDITORS },
        },
        {
          path: 'risks/:id',
          name: 'risk-detail',
          component: () => import('@/views/RiskDetailView.vue'),
          meta: { title: 'risk.singular' },
        },
        {
          path: 'risks/:id/edit',
          name: 'risk-edit',
          component: () => import('@/views/RiskFormView.vue'),
          meta: { title: 'risk.edit', roles: EDITORS },
        },
        {
          path: 'categories',
          name: 'categories',
          component: () => import('@/views/CategoriesView.vue'),
          meta: { title: 'nav.categories' },
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('@/views/UsersView.vue'),
          meta: { title: 'nav.users', roles: ['ADMIN'] },
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('@/views/ProfileView.vue'),
          meta: { title: 'nav.profile' },
        },
        {
          path: ':pathMatch(.*)*',
          name: 'not-found',
          component: () => import('@/views/NotFoundView.vue'),
          meta: { title: 'notFound.title' },
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.restore()

  if (to.meta.public) {
    return auth.isAuthenticated && to.name === 'login' ? { name: 'dashboard' } : true
  }
  if (!auth.isAuthenticated) {
    return { name: 'login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : {} }
  }
  if (to.meta.roles && !to.meta.roles.includes(auth.user!.role)) {
    return { name: 'dashboard' }
  }
  return true
})

router.afterEach((to) => {
  const title = to.meta.title ? i18n.global.t(to.meta.title) : ''
  document.title = title ? `${title} · Nimbus` : 'Nimbus'
})

export default router
