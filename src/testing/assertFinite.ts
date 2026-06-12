// Deep-walks a value and returns the path of every numeric leaf that is NaN or ±Infinity.
// Used by the invariants and edge-extreme suites to prove no persona ever surfaces a broken number.
export function nonFinitePaths(value: unknown, path = '$', out: string[] = []): string[] {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) out.push(`${path} = ${value}`);
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => nonFinitePaths(v, `${path}[${i}]`, out));
    return out;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) nonFinitePaths(v, `${path}.${k}`, out);
  }
  return out;
}

export function expectAllFinite(value: unknown, label?: string): void {
  const bad = nonFinitePaths(value);
  if (bad.length) {
    throw new Error(`Non-finite numbers${label ? ` in ${label}` : ''}:\n  ${bad.join('\n  ')}`);
  }
}
