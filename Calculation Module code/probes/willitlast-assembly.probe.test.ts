// PROBES — assembling everything into the odds, and the money helpers underneath it all.
//
// willItLastInputs is where the whole workbook meets: the pot, the return, the swing, spending,
// Social Security, inflation and the horizon are gathered into one set of inputs. It is also where
// a person's OWN choices override the defaults, which is the part worth pinning.
import { willItLastInputs, selectWillItLast, volOf } from '../../src/domain/retirement/willItLast';
import { activeCurrency, formatMoney, formatMoneyCents } from '../../src/domain/_shared/money';

const acct = (o: any = {}) => ({ asset_id: 'a', label: 'acct', tax_bucket: 'TAXABLE',
  kind: 'brokerage', balance: 900_000, target_return: 0.07, ...o } as any);
const args = (o: any = {}) => ({
  op: { birthYear: 1962, monthlySpending: 6_000, targetRetirementAge: 65, horizonAge: 92 },
  accounts: [acct()], assumptions: {}, employmentStatus: 'working', ...o,
} as any);

describe('WILL_IT_LAST_INPUTS — where the whole workbook meets', () => {
  test('it gathers a complete set of inputs from the answers and the accounts', () => {
    const i = willItLastInputs(args())!;
    expect(i.current_age).toBe(new Date().getFullYear() - 1962);
    expect(i.retire_age).toBe(65);
    expect(i.horizon_age).toBe(92);
    expect(i.start_balance).toBeGreaterThan(0);
    expect(i.mean_return).toBeGreaterThan(0);
    expect(i.vol_return).toBeGreaterThan(0);
  });

  test('NO AGE MEANS NO ANSWER — the odds are not computed from a guessed age', () => {
    expect(willItLastInputs(args({ op: { monthlySpending: 6_000 } }))).toBeNull();
  });

  // FIXED 2026-08-18. These pin the fix so the old behaviour cannot return.
  test('money promised to someone else comes off the pot — WHETHER OR NOT they have retired', () => {
    const withLegacy = (o: any) => willItLastInputs(args({ op: {
      birthYear: 1962, monthlySpending: 6_000, targetRetirementAge: 65, horizonAge: 92, legacyTarget: 200_000 }, ...o }))!;
    expect(withLegacy({}).start_balance).toBe(willItLastInputs(args())!.start_balance - 200_000);
    expect(withLegacy({ employmentStatus: 'retired' }).start_balance)
      .toBe(willItLastInputs(args({ employmentStatus: 'retired' }))!.start_balance - 200_000);
  });

  test('so the odds no longer LURCH on the day a person retires', () => {
    // before the fix: 38% while working with or without a legacy, then 26% → 8% on retiring. The
    // years when the plan could still be changed were exactly the years it said nothing.
    const working = selectWillItLast(args({ op: {
      birthYear: 1962, monthlySpending: 6_000, targetRetirementAge: 65, horizonAge: 92, legacyTarget: 200_000 } }));
    const noLegacy = selectWillItLast(args());
    expect(working.chance!).toBeLessThan(noLegacy.chance!);   // it counts NOW, while it can be acted on
  });

  test('a legacy larger than the pot cannot make the spendable money negative', () => {
    const i = willItLastInputs(args({ op: {
      birthYear: 1962, monthlySpending: 6_000, targetRetirementAge: 65, horizonAge: 92, legacyTarget: 5_000_000 } }))!;
    expect(i.start_balance).toBe(0);
  });

  test('the person\'s own choices override every default', () => {
    const i = willItLastInputs(args({ assumptions: { retireAge: 70, spendMonthly: 9_000, inflation: 0.04 } }))!;
    expect(i.retire_age).toBe(70);
    expect(i.inflation).toBe(0.04);
  });

  test('SOCIAL SECURITY USES THE CHEQUE THE CHOSEN CLAIM AGE ACTUALLY PAYS', () => {
    // ssMonthly is the age-67 statement amount; claiming at 62 pays ~70% of it. Using the statement
    // figure regardless would overstate guaranteed income for anyone claiming early.
    const at67 = willItLastInputs(args({ assumptions: { ssMonthly: 3_000, ssClaimAge: 67, ssEligible: true } }))!;
    const at62 = willItLastInputs(args({ assumptions: { ssMonthly: 3_000, ssClaimAge: 62, ssEligible: true } }))!;
    expect(at62.guaranteed_monthly_income).toBeLessThan(at67.guaranteed_monthly_income);
    expect(at62.guaranteed_monthly_income).toBeCloseTo(2_100, 0);      // 70% of 3,000
  });

  test('not eligible means ZERO guaranteed income, not a default', () => {
    expect(willItLastInputs(args({ assumptions: { ssMonthly: 3_000, ssEligible: false } }))!.guaranteed_monthly_income).toBe(0);
  });
});

describe('SELECT_WILL_IT_LAST — and its refusal', () => {
  test('with enough captured it produces odds', () => {
    const r = selectWillItLast(args());
    expect(r.captured).toBe(true);
    expect(typeof r.chance).toBe('number');
  });

  test('NO POT MEANS NO ODDS — it refuses rather than showing a confident zero', () => {
    const r = selectWillItLast(args({ accounts: [] }));
    expect(r.captured).toBe(false);
    expect(r.chance).toBeNull();
  });

  test('the best-to-worst range re-runs at a lower and higher return, and always contains the answer', () => {
    const r = selectWillItLast(args({ withBand: true }));
    expect(r.band).not.toBeNull();
    expect(r.band!.low).toBeLessThanOrEqual(r.chance!);
    expect(r.band!.high).toBeGreaterThanOrEqual(r.chance!);
  });
});

describe('VOL_OF — the old rule of thumb, kept only as a last resort', () => {
  test('it estimates the swing from the return, and is clamped at both ends', () => {
    expect(volOf(0.07)).toBeCloseTo(0.119, 3);
    expect(volOf(0.001)).toBe(0.05);        // floored
    expect(volOf(0.5)).toBe(0.2);           // capped
  });

  test('it is NOT used when there are accounts — real per-type volatility is', () => {
    // founder change 2026-08-11: deriving the swing from the return made a cash-heavy pot look
    // almost risk-free. With accounts, the blended figure is used instead of this.
    const i = willItLastInputs(args())!;
    expect(i.vol_return).not.toBe(volOf(i.mean_return));
  });
});

describe('MONEY WORDS — how a figure is written', () => {
  test('whole dollars, with separators, and a currency symbol', () => {
    expect(formatMoney(1234567)).toMatch(/1,234,567/);
    expect(formatMoney(0)).toMatch(/0/);
    // CORRECTED BY THE PROBE: it returns the whole currency record, not a string. currencySymbol()
    // is the one that gives you the symbol.
    expect(typeof activeCurrency()).toBe('object');
    expect(typeof activeCurrency().symbol).toBe('string');
  });
  test('cents where cents matter', () => {
    expect(formatMoneyCents(1234.56)).toMatch(/1,234\.56/);
  });
  test('a negative is written as a negative, never dropped', () => {
    expect(formatMoney(-500)).toMatch(/500/);
    expect(formatMoney(-500)).not.toBe(formatMoney(500));
  });
});
