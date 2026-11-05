export type Changes = Record<string, [unknown, unknown]>;

function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (value === undefined) return null;
  return value;
}

/**
 * Field-by-field diff between two snapshots: `{ field: [before, after] }`.
 * Only `fields` are compared, so timestamps and relations are ignored.
 */
export function diff<T extends object>(
  before: T,
  after: T,
  fields: (keyof T)[],
): Changes {
  const changes: Changes = {};
  for (const field of fields) {
    const a = normalize(before[field]);
    const b = normalize(after[field]);
    if (a !== b) changes[field as string] = [a, b];
  }
  return changes;
}

/** Snapshot of a newly created/deleted record, as `{ field: [null, value] }` or the reverse. */
export function snapshot<T extends object>(
  record: T,
  fields: (keyof T)[],
  direction: 'create' | 'delete',
): Changes {
  const changes: Changes = {};
  for (const field of fields) {
    const value = normalize(record[field]);
    if (value === null || value === '') continue;
    changes[field as string] =
      direction === 'create' ? [null, value] : [value, null];
  }
  return changes;
}
