// GUARD — EVERY READER OF A STORED RECORD'S AMOUNT READS IT ONE WAY (2026-10-21).
//
// A broker's −$50 dividend is a reversal: $50 that LEFT. The sync now keeps its size and its direction, and one function,
// moneyIntoAccount (ledger.ts), says what a stored deposit, withdrawal, transfer, dividend, interest, coupon or fee moved
// into its account. A reader that takes the amount itself reads the reversal as +$50 while ACTIVITY shows −$50 — two
// screens, two signs. This guard reads every source file (it proves it looked: it counts the files and the lines naming
// one of those kinds), and fails on any line that names one of those kinds next to a direct read of an amount without one
// of the one-way readers (moneyIntoAccount, or cashEffect / personalFlowTotals / movementsOf, which ask it). Each line
// still allowed is listed below with the reason it is not a reader of a stored record.
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const DIRS = ['src', 'MoneyKeel/functions', 'Calculation Module code/engines'];
const KIND = /'(DIVIDEND|INTEREST|COUPON|FEE|DEPOSIT|WITHDRAWAL|TRANSFER)'/;
const READ = /\b[a-zA-Z_]+\??\.amount\b(?!\s*[:=][^=])/;
const ONE_WAY = /moneyIntoAccount|cashEffect|personalFlowTotals|amountNotOnRecord|movementsOf/;

/** Lines that name a kind beside an amount and are NOT a stored record's amount being read — each with its reason. */
const NOT_A_STORED_READER: Record<string, string> = {
  'src/services/sync/snaptrade.ts': 'mapActivityType names a BROKER activity\'s kind from its own sign before anything is stored; no production code calls it (ingest uses toLedgerRow)',
  'MoneyKeel/functions/networth-and-performance/performance.ts': 'the sentence for interest or a dividend with no amount (v.amount is the refusal\'s, not a record\'s)',
  'Calculation Module code/engines/time-weighted-return.ts': 'u.amount is unnamedActivityOf\'s unsigned amount for a record the app could not name; interest reads moved (moneyIntoAccount)',
};

function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (!['node_modules', '__tests__', '__mocks__'].includes(e.name)) walk(p); }
      else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.|\.probe\./.test(e.name)) out.push(p);
    }
  };
  DIRS.forEach((d) => walk(path.join(ROOT, d)));
  return out;
}

test('every reader of a stored deposit, withdrawal, transfer, dividend, interest, coupon or fee amount reads it one way', () => {
  const files = sourceFiles();
  let kindLines = 0;
  const found = new Map<string, string[]>();
  for (const f of files) {
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    lines.forEach((l, i) => {
      if (/^\s*(\*|\/\*|\/\/)/.test(l)) return;
      if (!KIND.test(l.replace(/\/\/.*$/, ''))) return;
      kindLines++;
      const near = lines.slice(Math.max(0, i - 3), i + 14).filter((x) => !/^\s*(\/\/|\*)/.test(x)).map((x) => x.replace(/\/\/.*$/, '')).join('\n');
      if (READ.test(near) && !ONE_WAY.test(near)) {
        const rel = path.relative(ROOT, f);
        found.set(rel, [...(found.get(rel) ?? []), `${i + 1}: ${l.trim().slice(0, 100)}`]);
      }
    });
  }
  // it looked: 232 source files and 131 lines naming one of the kinds on 2026-10-21 — a pattern that stops matching goes red
  expect(files.length).toBeGreaterThanOrEqual(200);
  expect(kindLines).toBeGreaterThanOrEqual(120);
  const unexplained = [...found.entries()].filter(([f]) => !(f in NOT_A_STORED_READER));
  expect(unexplained).toEqual([]);
  // every allowance still names a file that has such a line, so a stale allowance cannot hide a new reader
  for (const f of Object.keys(NOT_A_STORED_READER)) expect(found.has(f)).toBe(true);
});

test('the guard still fires: the reader it was built to catch is caught, and the one-way reading is not', () => {
  const bad = "if (t.type === 'DIVIDEND') total += (t.amount || 0);";
  const good = "if (t.type === 'DIVIDEND') total += (moneyIntoAccount(t) ?? 0);";
  expect(KIND.test(bad) && READ.test(bad) && !ONE_WAY.test(bad)).toBe(true);
  expect(KIND.test(good) && READ.test(good) && !ONE_WAY.test(good)).toBe(false);
});
