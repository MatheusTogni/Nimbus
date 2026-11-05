import type { RiskLevel } from '@/types/api'

export const RISK_LEVELS: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
export const RATINGS = [1, 2, 3, 4, 5] as const

/** Same rule as the API: score = probability x impact (1..25). */
export function calculateScore(probability: number, impact: number): number {
  if (![probability, impact].every((v) => Number.isInteger(v) && v >= 1 && v <= 5)) {
    throw new RangeError('probability and impact must be integers between 1 and 5')
  }
  return probability * impact
}

export function levelFromScore(score: number): RiskLevel {
  if (score >= 20) return 'CRITICAL'
  if (score >= 10) return 'HIGH'
  if (score >= 5) return 'MEDIUM'
  return 'LOW'
}

/** Hex colors, also used by Chart.js (which cannot read Tailwind classes). */
export const LEVEL_HEX: Record<RiskLevel, string> = {
  LOW: '#10b981',
  MEDIUM: '#eab308',
  HIGH: '#f97316',
  CRITICAL: '#e11d48',
}

/** Tailwind classes per level. Written out in full so Tailwind can detect them. */
export const LEVEL_CLASSES: Record<RiskLevel, { badge: string; cell: string; dot: string }> = {
  LOW: {
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/30',
    cell: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-100',
    dot: 'bg-emerald-500',
  },
  MEDIUM: {
    badge: 'bg-yellow-50 text-yellow-800 ring-yellow-600/25 dark:bg-yellow-500/10 dark:text-yellow-200 dark:ring-yellow-400/30',
    cell: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-500/20 dark:text-yellow-100',
    dot: 'bg-yellow-500',
  },
  HIGH: {
    badge: 'bg-orange-50 text-orange-700 ring-orange-600/25 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-400/30',
    cell: 'bg-orange-200 text-orange-950 dark:bg-orange-500/30 dark:text-orange-50',
    dot: 'bg-orange-500',
  },
  CRITICAL: {
    badge: 'bg-rose-50 text-rose-700 ring-rose-600/25 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/30',
    cell: 'bg-rose-300 text-rose-950 dark:bg-rose-500/45 dark:text-rose-50',
    dot: 'bg-rose-600',
  },
}

/** Percentage by which the residual score reduces the inherent one. */
export function reduction(score: number, residual: number | null): number | null {
  if (residual === null || score <= 0) return null
  return Math.round(((score - residual) / score) * 100)
}

/** A labelled position on the 5x5 matrix (e.g. inherent "I" and residual "R"). */
export interface MatrixMarker {
  p: number
  i: number
  label: string
  kind: 'inherent' | 'residual'
}
