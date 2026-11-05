import { lastMonths } from './dashboard.service';

describe('lastMonths', () => {
  it('returns 12 consecutive months ending in the current one', () => {
    const months = lastMonths(new Date('2026-03-15T12:00:00Z'));
    expect(months).toHaveLength(12);
    expect(months[0]).toBe('2025-04');
    expect(months[11]).toBe('2026-03');
  });

  it('crosses the year boundary', () => {
    expect(lastMonths(new Date('2026-01-31T23:00:00Z'), 3)).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
    ]);
  });
});
