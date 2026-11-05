export type Role = 'ADMIN' | 'MANAGER' | 'VIEWER'
export type RiskStatus = 'IDENTIFIED' | 'ANALYZING' | 'MITIGATING' | 'MONITORING' | 'CLOSED'
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type Locale = 'pt-BR' | 'en'
export type ThemePreference = 'light' | 'dark' | 'system'

export const RISK_STATUSES: RiskStatus[] = [
  'IDENTIFIED',
  'ANALYZING',
  'MITIGATING',
  'MONITORING',
  'CLOSED',
]
export const ROLES: Role[] = ['ADMIN', 'MANAGER', 'VIEWER']

export interface Ref {
  id: string
  name: string
}

export interface Profile {
  id: string
  name: string
  email: string
  role: Role
  isDemo: boolean
  locale: Locale
  theme: ThemePreference
  organization: { id: string; name: string; isDemo: boolean }
}

export interface Session {
  accessToken: string
  expiresIn: number
  user: Profile
}

export interface CategoryRef {
  id: string
  name: string
  color: string
}

export interface Category extends CategoryRef {
  _count: { risks: number }
}

export interface Risk {
  id: string
  code: string
  title: string
  description: string
  categoryId: string | null
  ownerId: string | null
  probability: number
  impact: number
  score: number
  level: RiskLevel
  residualProbability: number | null
  residualImpact: number | null
  residualScore: number | null
  residualLevel: RiskLevel | null
  status: RiskStatus
  reviewDate: string | null
  createdAt: string
  updatedAt: string
  category: CategoryRef | null
  owner: Ref | null
  createdBy?: Ref
  _count: { actions: number; comments: number }
}

export interface RiskInput {
  title: string
  description?: string
  categoryId?: string | null
  ownerId?: string | null
  probability: number
  impact: number
  residualProbability?: number | null
  residualImpact?: number | null
  status?: RiskStatus
  reviewDate?: string | null
}

export interface RiskQuery {
  page?: number
  pageSize?: number
  search?: string
  level?: RiskLevel
  status?: RiskStatus
  categoryId?: string
  ownerId?: string
  probability?: number
  impact?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export interface Paginated<T> {
  data: T[]
  meta: { page: number; pageSize: number; total: number; totalPages: number }
}

export interface RiskAction {
  id: string
  riskId: string
  description: string
  assigneeId: string | null
  assignee: Ref | null
  dueDate: string | null
  completedAt: string | null
  createdAt: string
}

export interface Comment {
  id: string
  body: string
  createdAt: string
  author: Ref
}

export interface AuditEntry {
  id: string
  entity: 'RISK' | 'ACTION' | 'COMMENT' | 'CATEGORY' | 'USER'
  entityId: string
  action: 'CREATE' | 'UPDATE' | 'DELETE'
  changes: Record<string, [unknown, unknown]>
  createdAt: string
  user: Ref | null
}

export interface User {
  id: string
  name: string
  email: string
  role: Role
  active: boolean
  isDemo: boolean
  lastLoginAt: string | null
  createdAt: string
}

export interface DemoInfo {
  enabled: boolean
  email: string
  password: string
  resetHour: number
  timeZone: string
  nextResetAt: string
  limits: Record<'risk' | 'action' | 'comment' | 'category', number>
}

type LevelCount = Record<RiskLevel, number>

export interface DashboardSummary {
  totals: {
    risks: number
    open: number
    closed: number
    critical: number
    high: number
    mitigating: number
    avgScore: number
    avgResidualScore: number
    treatedRate: number
    openActions: number
    completedActions: number
    overdueActions: number
  }
  byLevel: LevelCount
  byResidualLevel: LevelCount
  byStatus: Record<RiskStatus, number>
  byCategory: { id: string | null; name: string | null; color: string; count: number; avgScore: number }[]
  matrix: { inherent: number[][]; residual: number[][] }
  trend: { months: string[]; created: number[]; closed: number[] }
  topRisks: (Pick<Risk, 'id' | 'code' | 'title' | 'status' | 'score' | 'level' | 'residualScore' | 'residualLevel' | 'category' | 'owner'>)[]
  upcomingReviews: (Pick<Risk, 'id' | 'code' | 'title' | 'reviewDate' | 'score' | 'level'>)[]
  overdueActions: {
    id: string
    description: string
    dueDate: string
    assignee: Ref | null
    risk: { id: string; code: string; title: string }
  }[]
}
