/** EVERY RETURN IS TIME-WEIGHTED — and the three methods it replaced cannot come back by a side door.
 *
 *  Owner decision, 2026-10-04 (DEC-1669): "All return should be True Weighted Return and not Dietz
 *  return." Not a Modified Dietz return, not a money-weighted return, not a change in balance.
 *
 *  The three old calculations were removed the same day. This guard reads every function a screen can
 *  ask, every screen and the engines, and fails the build if one of them is written or called again.
 *  It counts what it read, so it cannot pass by reading nothing.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const filesUnder = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  if (e.isDirectory()) return e.name === '__tests__' || e.name === 'node_modules' ? [] : filesUnder(p);
  return /\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : [];
});
/** The code a file runs: its comments are history, and history may name the old methods. */
const code = (file: string) => fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const OLD: [name: string, call: RegExp][] = [
  ['Modified Dietz (modifiedDietzOverWindow)', /\bmodifiedDietzOverWindow\s*\(/],
  ['the money-weighted rate (moneyWeightedReturn)', /\bmoneyWeightedReturn\s*\(/],
  ['the change in balance (investableChangePct from history)', /\binvestableChangePct\s*\(/],
];
test('no function a screen can ask, and no screen, works out a return any other way', () => {
  const files = [...filesUnder(path.join(ROOT, 'MoneyKeel', 'functions')), ...filesUnder(path.join(ROOT, 'src', 'screens')),
    ...filesUnder(path.join(ROOT, 'src', 'components')), ...filesUnder(path.join(ROOT, 'src', 'domain')),
    ...filesUnder(path.join(ROOT, 'Calculation Module code', 'engines'))];
  expect(files.length).toBeGreaterThanOrEqual(150);                       // the guard proves it looked
  const offences: string[] = [];
  for (const f of files) for (const [name, call] of OLD) if (call.test(code(f))) offences.push(`${path.relative(ROOT, f)} calls ${name}`);
  expect(offences).toEqual([]);
});

test('the two functions that hand out a return both ask the time-weighted engine', () => {
  for (const f of ['MoneyKeel/functions/networth-and-performance/performance.ts', 'MoneyKeel/functions/networth-and-performance/net-worth.ts']) {
    expect(code(path.join(ROOT, f))).toMatch(/\btimeWeightedReturn\s*\(/);
  }
});

test('the files that held the old methods no longer hold them', () => {
  expect(fs.existsSync(path.join(ROOT, 'src', 'domain', 'performance', 'moneyWeighted.ts'))).toBe(false);
  expect(fs.readFileSync(path.join(ROOT, 'Calculation Module code', 'engines', 'window-return.ts'), 'utf8')).not.toMatch(/export function modifiedDietzOverWindow/);
  expect(fs.readFileSync(path.join(ROOT, 'src', 'domain', 'history.ts'), 'utf8')).not.toMatch(/export function investableChangePct/);
});

test('the guard fires: a line that calls an old method is caught, and a comment that names one is not', () => {
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  expect(OLD[0][1].test(strip('const v = modifiedDietzOverWindow({ a });'))).toBe(true);
  expect(OLD[0][1].test(strip('// it used to call modifiedDietzOverWindow({ a })\n/* and moneyWeightedReturn(x) */'))).toBe(false);
});
