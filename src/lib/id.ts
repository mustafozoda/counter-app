/**
 * Collision-resistant local ids (sortable timestamp prefix + random suffix).
 * Server-generated UUIDs replace these at the sync boundary later; the
 * `loc_` prefix makes unsynced records easy to spot.
 */
export function createLocalId(): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `loc_${time}${rand}`;
}
