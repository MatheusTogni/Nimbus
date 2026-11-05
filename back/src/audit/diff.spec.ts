import { diff, snapshot } from './diff';

describe('audit diff', () => {
  const before = {
    title: 'Old',
    score: 12,
    reviewDate: new Date('2026-01-01T00:00:00Z'),
    ownerId: null as string | null,
    updatedAt: new Date('2026-01-01'),
  };

  it('returns only the changed tracked fields as [before, after]', () => {
    const after = {
      ...before,
      title: 'New',
      ownerId: 'u1',
      updatedAt: new Date('2026-02-01'),
    };
    expect(
      diff(before, after, ['title', 'score', 'ownerId', 'reviewDate']),
    ).toEqual({
      title: ['Old', 'New'],
      ownerId: [null, 'u1'],
    });
  });

  it('compares dates by value', () => {
    const after = { ...before, reviewDate: new Date('2026-01-01T00:00:00Z') };
    expect(diff(before, after, ['reviewDate'])).toEqual({});
  });

  it('serializes dates as ISO strings', () => {
    const after = { ...before, reviewDate: new Date('2026-03-01T00:00:00Z') };
    expect(diff(before, after, ['reviewDate'])).toEqual({
      reviewDate: ['2026-01-01T00:00:00.000Z', '2026-03-01T00:00:00.000Z'],
    });
  });

  it('builds creation and deletion snapshots without empty values', () => {
    expect(snapshot(before, ['title', 'ownerId'], 'create')).toEqual({
      title: [null, 'Old'],
    });
    expect(snapshot(before, ['title', 'score'], 'delete')).toEqual({
      title: ['Old', null],
      score: [12, null],
    });
  });
});
