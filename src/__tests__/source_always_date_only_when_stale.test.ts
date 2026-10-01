/** SOURCE ALWAYS, DATE ONLY WHEN STALE — DEC-0301, and ONE rule for what "old" means.
 *
 *  His ruling: *"source always, date only when stale."* Every figure says where it came from; a date
 *  appears only when the figure has gone old — so a date on screen always means something needs
 *  attention. His approved design says the same on its own face: change row 12 of the Net worth mock
 *  (v08, approved 2026-09-14) reads *"The source chip reads 🔗 Linked; a date appears only when the
 *  numbers are stale"*, with his words *"connected only unless stale"*.
 *
 *  The Net worth compliance validation of 2026-10-01 found half of it built. The rename to "Linked"
 *  had landed; the date had not — `sourceWording` printed `Linked · 2026-08-18` on every linked
 *  account, fresh or stale, in raw ISO. And "stale" was defined three times over: the price cache at
 *  four days, a connection at "more than three", and the source chip not at all. The thresholds
 *  happened to agree; the words did not, so one age read as "44 days ago" in one place and
 *  "44 days old" in another.
 *
 *  So this pins both halves: the behaviour, and the fact that there is only one rule behind it.
 */
import fs from 'fs';
import path from 'path';
import { sourceWording, type AssetAccount } from '../domain/assets';
import { connectionFreshness } from '../services/sync';
import { priceFreshness } from '../services/marketData';
import { STALE_AFTER_DAYS, ageLabel, isStale, daysSince } from '../domain/_shared/freshness';

const NOON = Date.parse('2026-10-01T12:00:00Z');
const daysBefore = (n: number) => new Date(NOON - n * 86_400_000).toISOString();
const acct = (o: Partial<AssetAccount>) =>
  ({ asset_id: 'a1', label: 'Chase', kind: 'checking', tax_bucket: 'CASH', value: 1000, ...o }) as AssetAccount;

describe('source always, date only when stale (DEC-0301)', () => {
  it('a fresh account says its source and no date', () => {
    for (const d of [0, 1, 2, 3]) {
      expect(sourceWording(acct({ source: 'connected', last_synced: daysBefore(d) }), NOON)).toBe('Linked');
      expect(sourceWording(acct({ source: 'imported', last_synced: daysBefore(d) }), NOON)).toBe('Imported');
    }
  });

  it('a stale account says how old it is — in words, never a raw date', () => {
    const chip = sourceWording(acct({ source: 'connected', last_synced: daysBefore(9) }), NOON);
    expect(chip).toBe('Linked · 9 days old');
    expect(chip).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('never recorded counts as stale, and says so rather than printing a dash', () => {
    expect(sourceWording(acct({ source: 'connected' }), NOON)).toBe('Linked · not updated yet');
    expect(sourceWording(acct({ source: 'imported' }), NOON)).toBe('Imported · not updated yet');
  });

  it('a hand-entered account says whose job it is to keep it current (DEC-0437)', () => {
    expect(sourceWording(acct({}), NOON)).toBe('By hand · you update it');
    expect(sourceWording(acct({ source: 'manual' }), NOON)).toBe('By hand · you update it');
  });

  it('ONE threshold — the chip, the connection and the price cache agree on every day', () => {
    for (let d = 0; d <= 10; d += 1) {
      const when = daysBefore(d);
      const chipHasDate = sourceWording(acct({ source: 'connected', last_synced: when }), NOON).includes('·');
      expect(chipHasDate).toBe(isStale(when, NOON));
      expect(connectionFreshness(when, NOON)!.stale).toBe(isStale(when, NOON));
      expect(priceFreshness(when, NOON).stale).toBe(isStale(when, NOON));
    }
    expect(STALE_AFTER_DAYS).toBe(4);
    expect(isStale(daysBefore(3), NOON)).toBe(false);
    expect(isStale(daysBefore(4), NOON)).toBe(true);
  });

  it('ONE wording — the chip and the connection say the same age the same way', () => {
    for (const d of [0, 1, 5, 44]) {
      expect(connectionFreshness(daysBefore(d), NOON)!.label).toBe(ageLabel(daysBefore(d), NOON));
    }
    expect(ageLabel(daysBefore(0), NOON)).toBe('today');
    expect(ageLabel(daysBefore(1), NOON)).toBe('yesterday');
    expect(ageLabel(daysBefore(5), NOON)).toBe('5 days old');
    expect(daysSince(daysBefore(5), NOON)).toBe(5);
  });

  it('nothing defines its own threshold — and it says how many files it read', () => {
    const SRC = path.join(__dirname, '..');
    const home = path.join(SRC, 'domain', '_shared', 'freshness.ts');
    const files: string[] = [];
    (function walk(dir: string) {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name === '__tests__' || e.name === '__snapshots__' || e.name === 'node_modules') continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.tsx?$/.test(e.name) && !/\.test\./.test(e.name)) files.push(p);
      }
    })(SRC);
    expect(files.length).toBeGreaterThanOrEqual(120);

    const offenders: string[] = [];
    for (const f of files) {
      if (f === home) continue;
      const code = fs.readFileSync(f, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[\s;,)}])\/\/.*$/gm, '$1 ');
      // a second copy of the arithmetic is a second definition of "old"
      if (/86[_,]?400[_,]?000/.test(code) && /stale/i.test(code)) offenders.push(path.relative(SRC, f));
    }
    expect(offenders).toEqual([]);
  });
});
