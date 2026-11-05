export const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

/** Score ranges (inclusive) for each level of a 5x5 probability x impact matrix. */
export const LEVEL_RANGES: Record<RiskLevel, [number, number]> = {
  LOW: [1, 4],
  MEDIUM: [5, 9],
  HIGH: [10, 16],
  CRITICAL: [20, 25],
};

export function assertRating(value: number, field = 'rating'): void {
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw new RangeError(`${field} must be an integer between 1 and 5`);
  }
}

/** Risk score = probability x impact (1..25). */
export function calculateScore(probability: number, impact: number): number {
  assertRating(probability, 'probability');
  assertRating(impact, 'impact');
  return probability * impact;
}

export function levelFromScore(score: number): RiskLevel {
  if (!Number.isInteger(score) || score < 1 || score > 25) {
    throw new RangeError('score must be an integer between 1 and 25');
  }
  if (score >= 20) return 'CRITICAL';
  if (score >= 10) return 'HIGH';
  if (score >= 5) return 'MEDIUM';
  return 'LOW';
}

/** Human-friendly sequential code per organization: RSK-001, RSK-002... */
export function riskCode(sequence: number): string {
  return `RSK-${String(sequence).padStart(3, '0')}`;
}
