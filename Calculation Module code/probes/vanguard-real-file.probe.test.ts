// THE ACCEPTANCE TEST, on the founder's own file.
//
// He asked: "Run your current methodology on this file and tell me Starting Value, Contributions,
// Withdrawals, interest, dividend, change in investment value and ending balance."
//
// So this probe does exactly that: every transaction row goes through the REAL translation table
// (mapActivityType), the sums use the REAL screen rule (copied from NetWorthScreen.tsx:662,
// Math.abs and all), and the walk is the REAL buildChangeWalk. No paraphrase anywhere.
//
// The file itself lives in real-downloads/ and is NOT in git (real balances). This test skips
// cleanly when the file is absent, and no balance from it is hard-coded here — every expected
// value is computed from the file at run time, and what is asserted are the IDENTITIES that
// constitute the findings.
import * as fs from 'fs';
import * as path from 'path';
import { mapActivityType } from '../../src/services/sync/snaptrade';
import { buildChangeWalk } from '../../src/domain/history';

// FOUNDER STANDING ORDER 2026-08-17: nothing from these files leaves this machine. The file is
// gitignored, and NO number from it is hard-coded here — even the statement's beginning value is
// read from an ignored side file, so this committed test carries no real balance at all.
const FILE = path.join(__dirname, '../../Calculation Module/real-downloads/tes-vk.csv');
const BEGIN_FILE = path.join(__dirname, '../../Calculation Module/real-downloads/tes-vk.beginning.txt');
const d = fs.existsSync(FILE) && fs.existsSync(BEGIN_FILE) ? describe : describe.skip;

d('THE FOUNDER\'S OWN VANGUARD FILE, through the real code', () => {
  const lines = fs.readFileSync(FILE, 'utf8').split('\n').map((l) => l.split(','));
  const txStart = lines.findIndex((l) => l[1] === 'Trade Date');
  const txns = lines.slice(txStart + 1).filter((l) => l.length > 11 && l[3]);
  const holdings = lines.slice(1, txStart).filter((l) => l[0]?.startsWith('xxxx') && l[5]);

  // every row through the REAL translation table
  const mapped = txns.map((l) => ({
    vanguardWord: l[3], desc: l[4], amount: Number(l[11]),
    ours: mapActivityType({ type: l[3], amount: Number(l[11]) } as any).txnType,
  }));

  // the REAL screen rule — NetWorthScreen.tsx:662: Math.abs, filtered by our mapped type
  const sumOf = (type: string) =>
    mapped.filter((m) => m.ours === type).reduce((n, m) => n + Math.abs(m.amount || 0), 0);
  const r2 = (n: number) => Math.round(n * 100) / 100;

  const contributions = r2(sumOf('DEPOSIT'));
  const withdrawals = r2(sumOf('WITHDRAWAL'));
  const dividends = r2(sumOf('DIVIDEND'));
  const interest = r2(sumOf('INTEREST'));
  const ending = r2(holdings.reduce((t, l) => t + Number(l[5] || 0), 0));
  const beginning = Number(fs.readFileSync(BEGIN_FILE, 'utf8').trim());
  // Vanguard's own statement beginning, from the ignored side file — a GIFT to the app: on the
  // founder's device it does not even have this number and back-solved a negative one.

  const walk = buildChangeWalk({
    beginning, ending, contributions, withdrawals, dividends, interest,
    fromLabel: 'statement start', toLabel: 'statement end',
  });

  // ── the ground truth, from the same file ──────────────────────────────────────────────────────
  const sumWhere = (f: (m: any) => boolean) => r2(mapped.filter(f).reduce((n, m) => n + m.amount, 0));
  const trueDividends = sumWhere((m) => m.vanguardWord === 'Dividend');
  const trueInterest = sumWhere((m) => m.vanguardWord === 'Interest');
  const trueFees = sumWhere((m) => m.vanguardWord === 'Fee');
  const trueMarket = r2(ending - beginning - trueDividends - trueInterest - trueFees);

  test('THE TABLE THE FOUNDER ASKED FOR — printed, both versions', () => {
    const row = (label: string, app: number | string, truth: number | string) =>
      console.log(`${label.padEnd(30)} ${String(app).padStart(15)} ${String(truth).padStart(15)}`);
    console.log(`${''.padEnd(30)} ${'WHAT THE APP SAYS'.padStart(15)} ${'THE TRUTH'.padStart(15)}`);
    row('Starting value', beginning.toLocaleString(), beginning.toLocaleString());
    row('Contributions', contributions.toLocaleString(), 0);
    row('Withdrawals', withdrawals.toLocaleString(), 0);
    row('Dividends', dividends.toLocaleString(), trueDividends.toLocaleString());
    row('Interest', interest.toLocaleString(), trueInterest.toLocaleString());
    row('Fees', '(no line exists)', trueFees.toLocaleString());
    row('Change in investment value', walk.marketChange.toLocaleString(), trueMarket.toLocaleString());
    row('Ending value', ending.toLocaleString(), ending.toLocaleString());
  });

  test('FINDING 1: every fake contribution is a sweep or a matured bond — internal money', () => {
    const fakeDeposits = mapped.filter((m) => m.ours === 'DEPOSIT');
    expect(fakeDeposits.length).toBeGreaterThan(0);
    for (const m of fakeDeposits) {
      expect(['Sweep out', 'Corp Action (Redemption)']).toContain(m.vanguardWord);
    }
    // and they equal the app's whole contributions figure — nothing else contributes to it
    expect(r2(fakeDeposits.reduce((n, m) => n + Math.abs(m.amount), 0))).toBe(contributions);
  });

  test('FINDING 2: the REDEMPTION protection exists but the word does not match', () => {
    // the code handles 'REDEMPTION' precisely to stop matured bonds booking as deposits —
    // but Vanguard writes 'Corp Action (Redemption)', which is not the same string.
    expect(mapActivityType({ type: 'REDEMPTION', amount: 200_000 } as any).txnType).toBe('SELL');
    expect(mapActivityType({ type: 'Corp Action (Redemption)', amount: 200_000 } as any).txnType).toBe('DEPOSIT');
  });

  test('FINDING 3: every reinvested dividend books as a WITHDRAWAL — money leaving', () => {
    // CORRECTION TO MY OWN EARLIER PROBE: I demonstrated reinvestment lines booking as deposits,
    // assuming positive amounts. Vanguard sends them NEGATIVE, so they book as withdrawals instead.
    // Same broken rule — the sign guess — opposite direction.
    const reinvest = mapped.filter((m) => m.vanguardWord === 'Reinvestment');
    expect(reinvest.length).toBeGreaterThan(0);
    for (const m of reinvest) expect(m.ours).toBe('WITHDRAWAL');
  });

  test('FINDING 4: dividends and interest DO come out right on this file', () => {
    expect(dividends).toBe(trueDividends);
    expect(interest).toBe(trueInterest);
    // …because every negative-amount hazard here happens to land elsewhere. The Math.abs fault
    // in the screen sum is still real, but THIS file does not trigger it on these two lines.
  });

  test('FINDING 5: the fake flows dwarf the real economics of the account', () => {
    expect(contributions).toBeGreaterThan(2 * ending);         // on an account where NOTHING came in
    expect(withdrawals).toBeGreaterThan(ending);               // and nothing left
    expect(Math.abs(walk.marketChange)).toBeGreaterThan(10 * Math.abs(trueMarket));
  });
});
