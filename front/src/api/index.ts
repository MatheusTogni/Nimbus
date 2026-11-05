import type {
  AuditEntry,
  Category,
  Comment,
  DashboardSummary,
  DemoInfo,
  Locale,
  Paginated,
  Profile,
  Ref,
  Risk,
  RiskAction,
  RiskInput,
  RiskQuery,
  Role,
  Session,
  ThemePreference,
  User,
} from '@/types/api'
import { request } from './http'

export const authApi = {
  login: (email: string, password: string) =>
    request<Session>('/auth/login', { method: 'POST', body: { email, password }, skipRefresh: true }),
  demo: () => request<Session>('/auth/demo', { method: 'POST', skipRefresh: true }),
  refresh: () => request<Session>('/auth/refresh', { method: 'POST', skipRefresh: true }),
  logout: () => request<void>('/auth/logout', { method: 'POST', skipRefresh: true }),
  me: () => request<Profile>('/auth/me'),
}

export const demoApi = {
  info: () => request<DemoInfo>('/demo/info', { skipRefresh: true }),
}

export const dashboardApi = {
  summary: () => request<DashboardSummary>('/dashboard'),
}

export const risksApi = {
  list: (query: RiskQuery) => request<Paginated<Risk>>('/risks', { query }),
  get: (id: string) => request<Risk>(`/risks/${id}`),
  create: (body: RiskInput) => request<Risk>('/risks', { method: 'POST', body }),
  update: (id: string, body: Partial<RiskInput>) =>
    request<Risk>(`/risks/${id}`, { method: 'PATCH', body }),
  remove: (id: string) => request<void>(`/risks/${id}`, { method: 'DELETE' }),
  history: (id: string) => request<AuditEntry[]>(`/risks/${id}/history`),
  exportCsv: (query: RiskQuery) =>
    request<Response>('/risks/export', { query: { ...query, page: undefined, pageSize: undefined }, raw: true }),
}

export interface ActionInput {
  description?: string
  assigneeId?: string | null
  dueDate?: string | null
  completed?: boolean
}

export const actionsApi = {
  list: (riskId: string) => request<RiskAction[]>(`/risks/${riskId}/actions`),
  create: (riskId: string, body: ActionInput) =>
    request<RiskAction>(`/risks/${riskId}/actions`, { method: 'POST', body }),
  update: (riskId: string, id: string, body: ActionInput) =>
    request<RiskAction>(`/risks/${riskId}/actions/${id}`, { method: 'PATCH', body }),
  remove: (riskId: string, id: string) =>
    request<void>(`/risks/${riskId}/actions/${id}`, { method: 'DELETE' }),
}

export const commentsApi = {
  list: (riskId: string) => request<Comment[]>(`/risks/${riskId}/comments`),
  create: (riskId: string, body: string) =>
    request<Comment>(`/risks/${riskId}/comments`, { method: 'POST', body: { body } }),
  remove: (riskId: string, id: string) =>
    request<void>(`/risks/${riskId}/comments/${id}`, { method: 'DELETE' }),
}

export const categoriesApi = {
  list: () => request<Category[]>('/categories'),
  create: (body: { name: string; color: string }) =>
    request<Category>('/categories', { method: 'POST', body }),
  update: (id: string, body: { name?: string; color?: string }) =>
    request<Category>(`/categories/${id}`, { method: 'PATCH', body }),
  remove: (id: string) => request<void>(`/categories/${id}`, { method: 'DELETE' }),
}

export const usersApi = {
  list: () => request<User[]>('/users'),
  options: () => request<Ref[]>('/users/options'),
  create: (body: { name: string; email: string; role: Role; password: string }) =>
    request<User>('/users', { method: 'POST', body }),
  update: (id: string, body: { name?: string; role?: Role; active?: boolean; password?: string }) =>
    request<User>(`/users/${id}`, { method: 'PATCH', body }),
  updateProfile: (body: { name?: string; locale?: Locale; theme?: ThemePreference }) =>
    request<Profile>('/users/me', { method: 'PATCH', body }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>('/users/me/password', { method: 'POST', body: { currentPassword, newPassword } }),
}
