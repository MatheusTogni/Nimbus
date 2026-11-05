import {
  calculateScore,
  LEVEL_RANGES,
  levelFromScore,
  riskCode,
} from './risk-level';

describe('risk-level', () => {
  it('multiplies probability by impact', () => {
    expect(calculateScore(1, 1)).toBe(1);
    expect(calculateScore(4, 5)).toBe(20);
    expect(calculateScore(5, 5)).toBe(25);
  });

  it.each([0, 6, 2.5, NaN])('rejects invalid rating %p', (value) => {
    expect(() => calculateScore(value, 3)).toThrow(RangeError);
    expect(() => calculateScore(3, value)).toThrow(RangeError);
  });

  it.each([
    [1, 'LOW'],
    [4, 'LOW'],
    [5, 'MEDIUM'],
    [9, 'MEDIUM'],
    [10, 'HIGH'],
    [16, 'HIGH'],
    [20, 'CRITICAL'],
    [25, 'CRITICAL'],
  ])('score %i is %s', (score, level) => {
    expect(levelFromScore(score)).toBe(level);
  });

  it('classifies every cell of the 5x5 matrix inside its declared range', () => {
    for (let p = 1; p <= 5; p++) {
      for (let i = 1; i <= 5; i++) {
        const score = calculateScore(p, i);
        const [min, max] = LEVEL_RANGES[levelFromScore(score)];
        expect(score).toBeGreaterThanOrEqual(min);
        expect(score).toBeLessThanOrEqual(max);
      }
    }
  });

  it('formats sequential codes', () => {
    expect(riskCode(1)).toBe('RSK-001');
    expect(riskCode(42)).toBe('RSK-042');
    expect(riskCode(1234)).toBe('RSK-1234');
  });
});
