import { describe, expect, it } from 'vitest'
import { calculateScore, levelFromScore, reduction } from '@/utils/risk'

describe('risk utils', () => {
  it('calculates the score as probability x impact', () => {
    expect(calculateScore(4, 5)).toBe(20)
    expect(() => calculateScore(0, 3)).toThrow(RangeError)
    expect(() => calculateScore(3, 6)).toThrow(RangeError)
  })

  it.each([
    [4, 'LOW'],
    [5, 'MEDIUM'],
    [9, 'MEDIUM'],
    [10, 'HIGH'],
    [16, 'HIGH'],
    [20, 'CRITICAL'],
  ])('classifies score %i as %s (same rule as the API)', (score, level) => {
    expect(levelFromScore(score)).toBe(level)
  })

  it('computes the residual reduction percentage', () => {
    expect(reduction(20, 5)).toBe(75)
    expect(reduction(12, 12)).toBe(0)
    expect(reduction(12, null)).toBeNull()
  })
})
