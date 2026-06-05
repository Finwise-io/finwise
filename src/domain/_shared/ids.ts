// Shared identity keys (the spec's "Shared Core Data Contracts" pattern).
// Modules reference each other by these ids — never by duplicating fields.
export type UserId = string;     // Firebase auth uid
export type EntityId = string;   // asset_id | debt_id | goal_id | income_source_id …

export function newEntityId(prefix: string): EntityId {
  // short, readable, collision-resistant enough for per-user entities
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
