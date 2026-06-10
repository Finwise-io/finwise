// Cost-of-living factors for the retirement-location question (retLocation free text).
// Factor scales the user's expected retirement spending: US average = 1.0 baseline.
// Rough composite cost-of-living-plus-rent indices (Numbeo-style, 2025 era), rounded to 0.05 —
// deliberately coarse: this is a planning adjustment, not a quote.
const COL_TABLE: { keys: string[]; name: string; factor: number }[] = [
  { keys: ['usa', 'us', 'united states', 'america'], name: 'United States', factor: 1.0 },
  { keys: ['switzerland'], name: 'Switzerland', factor: 1.35 },
  { keys: ['singapore'], name: 'Singapore', factor: 1.1 },
  { keys: ['hong kong'], name: 'Hong Kong', factor: 1.05 },
  { keys: ['ireland'], name: 'Ireland', factor: 1.0 },
  { keys: ['israel'], name: 'Israel', factor: 1.0 },
  { keys: ['australia'], name: 'Australia', factor: 0.95 },
  { keys: ['uk', 'united kingdom', 'england', 'britain', 'scotland', 'wales'], name: 'United Kingdom', factor: 0.95 },
  { keys: ['netherlands', 'holland'], name: 'Netherlands', factor: 0.95 },
  { keys: ['uae', 'dubai', 'emirates', 'abu dhabi'], name: 'United Arab Emirates', factor: 0.9 },
  { keys: ['canada'], name: 'Canada', factor: 0.85 },
  { keys: ['france'], name: 'France', factor: 0.85 },
  { keys: ['germany'], name: 'Germany', factor: 0.85 },
  { keys: ['new zealand'], name: 'New Zealand', factor: 0.85 },
  { keys: ['japan'], name: 'Japan', factor: 0.8 },
  { keys: ['italy'], name: 'Italy', factor: 0.75 },
  { keys: ['puerto rico'], name: 'Puerto Rico', factor: 0.75 },
  { keys: ['spain'], name: 'Spain', factor: 0.65 },
  { keys: ['portugal'], name: 'Portugal', factor: 0.6 },
  { keys: ['greece'], name: 'Greece', factor: 0.6 },
  { keys: ['croatia'], name: 'Croatia', factor: 0.6 },
  { keys: ['panama'], name: 'Panama', factor: 0.6 },
  { keys: ['czech', 'czechia'], name: 'Czechia', factor: 0.6 },
  { keys: ['costa rica'], name: 'Costa Rica', factor: 0.55 },
  { keys: ['poland'], name: 'Poland', factor: 0.55 },
  { keys: ['hungary'], name: 'Hungary', factor: 0.55 },
  { keys: ['mexico'], name: 'Mexico', factor: 0.5 },
  { keys: ['brazil'], name: 'Brazil', factor: 0.5 },
  { keys: ['thailand'], name: 'Thailand', factor: 0.45 },
  { keys: ['philippines'], name: 'Philippines', factor: 0.45 },
  { keys: ['malaysia'], name: 'Malaysia', factor: 0.45 },
  { keys: ['indonesia', 'bali'], name: 'Indonesia', factor: 0.45 },
  { keys: ['colombia'], name: 'Colombia', factor: 0.45 },
  { keys: ['ecuador'], name: 'Ecuador', factor: 0.45 },
  { keys: ['argentina'], name: 'Argentina', factor: 0.45 },
  { keys: ['south africa'], name: 'South Africa', factor: 0.45 },
  { keys: ['vietnam'], name: 'Vietnam', factor: 0.4 },
  { keys: ['turkey'], name: 'Turkey', factor: 0.4 },
  { keys: ['morocco'], name: 'Morocco', factor: 0.4 },
  { keys: ['india'], name: 'India', factor: 0.3 },
  { keys: ['egypt'], name: 'Egypt', factor: 0.3 },
];

export interface ColMatch { factor: number; name: string | null }

/** Cost-of-living factor for a free-text location. Unrecognized (or blank) → 1.0, name null —
 *  callers use `name` to tell the user honestly whether an adjustment is applied. */
export function colFactor(location?: string | null): ColMatch {
  const q = String(location ?? '').trim().toLowerCase();
  if (!q) return { factor: 1, name: null };
  for (const row of COL_TABLE) {
    if (row.keys.some((k) => q === k || q.includes(k) || (k.length > 3 && k.includes(q) && q.length >= 4))) {
      return { factor: row.factor, name: row.name };
    }
  }
  return { factor: 1, name: null };
}
