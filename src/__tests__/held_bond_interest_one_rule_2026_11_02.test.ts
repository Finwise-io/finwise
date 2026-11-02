/** A BOND HELD INSIDE A BROKERAGE PAYS INTEREST BY THE SAME RULE AS ONE HELD ON ITS OWN (2026-11-02, FX-NW; his ruling DEC-2748c: "a
 *  year's interest from a bond or CD has one rule everywhere: face × rate"; found by FX-CF-C, round 6; income-end-to-end v07 row of that
 *  date). A $10,000-face Treasury at 4.00% counted $400 a year as its own account and $0 — said nowhere — as a holding in a brokerage.
 *
 *  By hand: 10,000 × 0.04 = $400 a year, both ways, in every reader of interest income:
 *    · interestIncomeAnnual (MK-NW-F-063) — the one total;
 *    · incomeFromAccounts (MK-CF-F-184) — the lines Your income, the Income summary and sign-up's step show;
 *    · interestAndDividendsForYear — the Tax organizer's line (screen and file), calculated when nothing is on record;
 *    · theTaxOrganizer (MK-CF-O-…) — the door both the Tax organizer screen and its file read.
 */
import { interestIncomeAnnual, heldBondInterest } from '../domain/bonds';
import { incomeFromAccounts, interestAndDividendsForYear } from '../domain/income/from-accounts';
import { theTaxOrganizer } from '../../MoneyKeel/functions/cashflow/tax-organizer';

const NOW = new Date('2026-11-02T12:00:00');
const ALONE = [{ asset_id: 't', label: 'US Treasury 2030', kind: 'fixed_income', asset_class: 'bonds', tax_bucket: 'TAXABLE',
  balance: 9_850, face_value: 10_000, coupon_rate: 0.04, maturity_date: '2030-09-30' }] as any[];
const HELD = (pos: Record<string, unknown> = {}) => [{ asset_id: 'fid', label: 'Fidelity Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 9_850,
  positions: [{ position_id: 'p1', ticker: '912828ZQ6', label: 'US Treasury 2030', kind: 'fixed_income', face_value: 10_000, coupon_rate: 0.04,
    maturity_date: '2030-09-30', lots: [{ lot_id: 'l', shares: 10_000, cost_per_share: 0.985, purchase_date: '2026-01-05' }], ...pos }] }] as any[];

describe('one rule, both ways: $400 a year', () => {
  test.each([['held on its own', ALONE], ['held inside a brokerage', HELD()]])('%s', (_name, accounts) => {
    expect(interestIncomeAnnual(accounts, NOW)).toBeCloseTo(400, 9);                                       // 10,000 × 0.04
    const inc = incomeFromAccounts(accounts, [], NOW);
    expect(inc.annual).toBeCloseTo(400, 9);
    expect(inc.lines.map((l) => l.why)).toContain('4.00% coupon on $10,000 face');
    const year = interestAndDividendsForYear({}, accounts, [], 2026, NOW);
    expect([year.basis, year.amount]).toEqual(['calculated', 400]);
    // the Tax organizer (its screen and its file read this door): the line 'Interest & dividends', $400, calculated, with its working
    const line = (theTaxOrganizer({ profile: {}, accounts, debts: [], transactions: [], year: 2026 }) as any).income.find((l: any) => l.label === 'Interest & dividends');
    expect([line.amount, line.approx, line.note]).toEqual([400, true, 'calculated from your accounts — 4.00% coupon on $10,000 face']);
  });
  test('inside a brokerage the line names both: ‘US Treasury 2030 (in Fidelity Brokerage)’', () => {
    expect(incomeFromAccounts(HELD(), [], NOW).lines[0]).toMatchObject({ label: 'US Treasury 2030 (in Fidelity Brokerage)', annual: 400, assumed: false });
  });
});

describe('a held bond that cannot be counted is named, never $0 in silence', () => {
  test('no coupon rate: not counted, and said', () => {
    const accts = HELD({ coupon_rate: undefined });
    expect(heldBondInterest(accts[0], NOW)).toEqual([expect.objectContaining({ label: 'US Treasury 2030', yearly: null, why: 'no rate' })]);
    expect(interestIncomeAnnual(accts, NOW)).toBe(0);
    const line = incomeFromAccounts(accts, [], NOW).lines[0];
    expect(line).toMatchObject({ label: 'US Treasury 2030 (in Fidelity Brokerage)', why: 'no coupon rate entered — not counted until one is', annual: 0, assumed: true });
    expect(interestAndDividendsForYear({}, accts, [], 2026, NOW).basis).toBe('not entered');            // nothing to calculate from: no figure
  });
  test('no face value: not counted, and said', () => {
    const accts = HELD({ face_value: undefined });
    expect(heldBondInterest(accts[0], NOW)[0]).toMatchObject({ yearly: null, why: 'no face' });
    expect(incomeFromAccounts(accts, [], NOW).lines[0].why).toBe('4.00% coupon — face value not entered, so not counted until it is');
  });
  test('quoted per $100 of face with no face entered: its quantity is its face — $400', () => {
    expect(interestIncomeAnnual(HELD({ face_value: undefined, price_quote: 'per_100_of_face' }), NOW)).toBeCloseTo(400, 9);
  });
});

test('counted once: a brokerage whose interest was paid and recorded takes the record, nothing added on top', () => {
  const accts = HELD();
  const paid = [{ id: 'i1', account_id: 'fid', type: 'INTEREST', amount: 200, date: '2026-09-30' }];
  const inc = incomeFromAccounts(accts, paid, NOW);
  expect(inc.annual).toBe(200);                                                                              // the record, not 200 + 400
  expect(inc.lines).toHaveLength(1);
});

// THE OLD ANSWER, KEPT: inside a brokerage the Treasury counted nothing
test.failing('the old answer: a Treasury held inside a brokerage counts $0', () => {
  expect(interestIncomeAnnual(HELD(), NOW)).toBe(0);
});
