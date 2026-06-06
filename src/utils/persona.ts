// Life-stage persona — drives which surfaces the home foregrounds.
export type Persona = 'building' | 'preretiree' | 'retired';

export function ageFromProfile(op: Record<string, any> | null): number | null {
  const by = op?.birthYear ? parseInt(String(op.birthYear).replace(/[^0-9]/g, ''), 10) : NaN;
  return Number.isFinite(by) && by > 1900 ? new Date().getFullYear() - by : null;
}

export function personaOf(opts: { age: number | null; employmentStatus?: string | null; targetRetireAge?: number | null }): Persona {
  const { age, employmentStatus } = opts;
  if (employmentStatus === 'retired' || (age != null && age >= (opts.targetRetireAge ?? 65))) return 'retired';
  if (age != null && age >= 50) return 'preretiree';
  return 'building';
}
