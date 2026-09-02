/**
 * TODAY IS THE LOCAL DAY, NOT THE UTC ONE.
 *
 * `new Date().toISOString().slice(0, 10)` reads as today's date and is not. After about 5pm in
 * California it already says tomorrow — so an expense logged on the evening of the 31st was filed in
 * the next month, a balance was stamped with a date the person had not reached yet, and a "funded
 * this month" flag flipped a day early.
 *
 * It was in 35 places. Two of them were declared helpers, which the one-name-one-function guard
 * found; the rest were written inline, which it could not see. Hence this one: the defect is the
 * CALL, not the name.
 *
 * The allowlist is for values that genuinely ARE a UTC instant — a market bar's timestamp, a
 * provider's sync cursor — where the local day would be the wrong answer.
 */
import fs from 'fs';
import path from 'path';

const ALLOWED = new Set([
  'src/services/marketData.ts',          // a market bar is stamped in UTC by the exchange feed
  'src/services/sync/snaptradeSync.ts',  // a cursor compared against the provider's own dates
  'src/domain/_shared/dates.ts',         // the docstring that explains the trap
]);

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p, out); }
    else if (/\.tsx?$/.test(e.name) && !e.name.includes('.test.')) out.push(p);
  }
  return out;
}

test('nothing stamps today from the UTC clock', () => {
  const offenders: string[] = [];
  for (const file of walk('src')) {
    if (ALLOWED.has(file)) continue;
    const src = fs.readFileSync(file, 'utf8');
    src.split('\n').forEach((line, i) => {
      if (/new Date\(\)\.toISOString\(\)\.slice\(/.test(line)) offenders.push(`  ${file}:${i + 1}`);
    });
  }
  expect(offenders.join('\n')).toBe('');
});
