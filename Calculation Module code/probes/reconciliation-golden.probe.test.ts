// THE TWO RECONCILIATION ASSERTIONS, AGAINST THE GOLDEN FILE (E11; Track 1 step 5).
// The real Vanguard download is the golden truth: its holdings block, its activity, and the
// statement figures the founder read from Vanguard's own page. The assertions must close on the
// honest numbers — and FAIL loudly on the old path's phantom bookings, which is the entire reason
// they exist: run on day one, they would have caught the bug on day one.
import * as fs from 'fs';
import * as path from 'path';
import { reconcileAccountTotal, reconcileLedgerIdentity } from '../engines/reconcile';
import { toLedgerRow, totalOf, type LedgerRow } from '../engines/ledger';
import { Dec } from '../engines/decimal';

const DIR = path.join(__dirname, '../../Calculation Module/real-downloads');
const lines = fs.readFileSync(path.join(DIR, 'tes-vk.csv'), 'utf8').split('\n').map((l) => l.split(','));
const txStart = lines.findIndex((l) => l[1] === 'Trade Date');
const holdings = lines.slice(0, txStart).filter((l) => l[5] && l[5].trim() && l[5] !== 'Total Value');
const txns = lines.slice(txStart + 1).filter((l) => l.length > 11 && l[3]);
const BEGINNING = fs.readFileSync(path.join(DIR, 'tes-vk.beginning.txt'), 'utf8').trim();

describe('ASSERTION 1 — holdings + cash = the stated total, to the cent', () => {
  // VMFXX at $1 is the settlement fund — the cash sleeve; everything else is a holding
  const sleeve = holdings.find((l) => l[2] === 'VMFXX')![5];
  const values = holdings.filter((l) => l[2] !== 'VMFXX').map((l) => l[5]);

  test('the golden file closes exactly', () => {
    const r = reconcileAccountTotal(values, sleeve, '362088.59');
    expect(r.ok).toBe(true);
    expect(r.difference.isZero()).toBe(true);
  });

  test('one double-counted money-market fund is CAUGHT, not absorbed by a tolerance', () => {
    // the sleeve counted inside the total AND as a holding — the exact double-count class B8 names
    const r = reconcileAccountTotal([...values, sleeve], sleeve, '362088.59');
    expect(r.ok).toBe(false);
    expect(r.difference.toString()).toBe('837.94');       // the named difference IS the sleeve
    expect(r.sentence).toContain('differ by $837.94');
  });
});

describe('ASSERTION 2 — the activity identity closes on the honest terms and BREAKS on the phantoms', () => {
  const rows: LedgerRow[] = txns.map((l) => toLedgerRow({
    word: l[3], description: l[4], amount: l[11],
    units: l[7] ? Number(l[7]) : undefined, ticker: l[6] || undefined,
  }, 'NEGATIVE_IS_OUT'));

  test('the engine terms close the statement to the cent', () => {
    const r = reconcileLedgerIdentity({
      beginning: BEGINNING, ending: '362088.59',
      contributions: totalOf(rows, 'contributions'), withdrawals: totalOf(rows, 'withdrawals'),
      income: totalOf(rows, 'income'), costs: totalOf(rows, 'costs'),
      marketChange: '-20928.07',                           // Vanguard's own residual, proven in the identity diagnostic
    });
    expect(r.ok).toBe(true);
  });

  test('the OLD bookings cannot close it — the assertion catches exactly the phantom net', () => {
    const r = reconcileLedgerIdentity({
      beginning: BEGINNING, ending: '362088.59',
      contributions: '1064493.33', withdrawals: '424818.32',   // what the sign-guess minted
      income: totalOf(rows, 'income'), costs: totalOf(rows, 'costs'),
      marketChange: '-20928.07',
    });
    expect(r.ok).toBe(false);
    // the miss is EXACTLY the phantom net — a named difference, not a mystery
    expect(r.difference.toString()).toBe(Dec.of('1064493.33').sub(Dec.of('424818.32')).toString());
  });
});
