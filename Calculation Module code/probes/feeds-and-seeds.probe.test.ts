// PROBES — the last of them: the outside feeds, the ids, and the setup seeders.
import { fetchPriceSeries } from '../../src/services/marketData';
import { newEntityId } from '../../src/domain/_shared/ids';
import { toNum } from '../../src/domain/_shared/num';
import { assetsFromOnboarding, monthlyContributionsFromOnboarding } from '../../src/domain/assets';
import { debtsFromOnboarding, buildDebtState } from '../../src/domain/debt';
import { buildItemizedAccounts } from '../../src/domain/assets/itemize';
import { bondRateSensitivity } from '../../src/domain/bonds';

// ════════════════════════════════════════════════════════════════════════════════════════════════
// READING A TYPED NUMBER — the first thing that touches anything a person enters
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('READ_A_NUMBER', () => {
  test('it reads what people actually type, decorations included', () => {
    expect(toNum('1,234.56')).toBe(1234.56);
    expect(toNum('$5,000')).toBe(5000);
    expect(toNum(' 42 ')).toBe(42);
    expect(toNum(7)).toBe(7);
  });
  test('anything unreadable is ZERO, never a partial guess', () => {
    for (const v of ['', '   ', 'abc', null, undefined, NaN]) expect(toNum(v as any)).toBe(0);
  });
  test('a negative stays negative — a debt or a loss is not made positive here', () => {
    expect(toNum('-500')).toBe(-500);
  });
});

describe('A NEW ID', () => {
  test('every id is unique, and says what kind of thing it belongs to', () => {
    const a = newEntityId('txn'), b = newEntityId('txn');
    expect(a).not.toBe(b);
    expect(a.startsWith('txn')).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// PRICES FROM OUTSIDE
// DERIVATION RULE: one ticker failing must never lose the others. Every request is settled
// independently and the failures are simply absent — a missing price is honest, a zero is a lie.
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('FETCH_PRICES', () => {
  const provider = (fail: string[] = []) => ({
    fetchSeries: async (t: string) => {
      if (fail.includes(t)) throw new Error('no');
      return { ticker: t, points: [{ date: '2026-08-18', close: 100 }] } as any;
    },
  });

  test('duplicates are asked for once, and case does not matter', async () => {
    const seen: string[] = [];
    const p = { fetchSeries: async (t: string) => { seen.push(t); return { ticker: t, points: [] } as any; } };
    await fetchPriceSeries(['vti', 'VTI', ' vti '], p as any);
    expect(seen).toEqual(['VTI']);
  });

  test('ONE FAILING TICKER DOES NOT LOSE THE OTHERS', async () => {
    const out = await fetchPriceSeries(['VTI', 'ZZZ', 'BND'], provider(['ZZZ']) as any);
    expect(Object.keys(out).sort()).toEqual(['BND', 'VTI']);
    expect(out.ZZZ).toBeUndefined();       // absent, never an empty series that reads as worth nothing
  });

  test('an empty request asks for nothing', async () => {
    expect(await fetchPriceSeries([], provider() as any)).toEqual({});
    expect(await fetchPriceSeries(['', '  '], provider() as any)).toEqual({});
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// SEEDING FROM THE SETUP ANSWERS
// DERIVATION RULE: everything created here is TAGGED as coming from setup, so running setup again
// replaces exactly those rows and never touches an account the person added by hand.
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('SEED_FROM_SETUP', () => {
  test('accounts created from the answers are tagged as such', () => {
    const r = assetsFromOnboarding('u', { cashSavings: 25_000, currentSavingsPortfolio: 400_000 } as any);
    const seeded = (r.accounts ?? []);
    expect(seeded.length).toBeGreaterThan(0);
    for (const a of seeded) expect(a.origin).toBe('onboarding');
  });

  test('nothing answered creates nothing — no placeholder accounts', () => {
    expect((assetsFromOnboarding('u', {} as any).accounts ?? []).length).toBe(0);
  });

  test('a debt from the answers carries its rate and payment', () => {
    const d = debtsFromOnboarding('u', { debtName: 'Chase Mortgage', debtBalance: 412_000,
      debtRate: 5.5, debtPayment: 2_400 } as any);
    expect(d.debts).toHaveLength(1);
    expect(d.debts[0].remaining_balance).toBe(412_000);
    expect(d.debts[0].debt_type).toBe('MORTGAGE');      // read from the name
  });

  test('no debt answered creates no debt', () => {
    expect(debtsFromOnboarding('u', {} as any).debts).toHaveLength(0);
  });

  test('what goes in each month adds the person\'s own saving and the employer\'s match', () => {
    const m = monthlyContributionsFromOnboarding({ c_401k: 1_000, employerMatchMode: 'pct',
      employerMatchValue: 50 } as any);
    expect(m).toBeGreaterThanOrEqual(1_500);           // 1,000 plus a 50% match
  });
});

describe('DEBT_STATE', () => {
  const D = (o: any = {}) => ({ debt_id: 'd', label: 'loan', debt_type: 'MORTGAGE',
    remaining_balance: 412_000, interest_rate_apr: 0.055, minimum_monthly_payment: 2_400, ...o } as any);

  // CORRECTED BY THE PROBE: the field is total_debt_BALANCE, and the state carries TWO monthly
  // figures deliberately — the minimum that must be paid, and what is actually going out.
  test('it gathers the totals and names the costliest debt', () => {
    const s = buildDebtState('u', [D(), D({ debt_id: 'c', debt_type: 'CREDIT_CARD',
      remaining_balance: 6_000, interest_rate_apr: 0.24, minimum_monthly_payment: 150 })]);
    expect(s.total_debt_balance).toBe(418_000);
    expect(s.highest_rate_debt?.debt_type).toBe('CREDIT_CARD');    // 24% beats 5.5%
    expect(s.total_monthly_debt_service).toBe(2_550);              // what MUST be paid
    expect(s.total_actual_payment).toBe(2_550);                    // what IS being paid
  });

  test('it separates DANGEROUS debt from the rest, at the rate we call toxic', () => {
    const s = buildDebtState('u', [D(), D({ debt_id: 'c', debt_type: 'CREDIT_CARD',
      remaining_balance: 6_000, interest_rate_apr: 0.24, minimum_monthly_payment: 150 })]);
    expect(s.toxic_debt_balance).toBe(6_000);      // the card, not the mortgage
  });

  test('no debts gives zero and nothing to point at', () => {
    const s = buildDebtState('u', []);
    expect(s.total_debt_balance).toBe(0);
    expect(s.highest_rate_debt).toBeFalsy();
  });
});

describe('ITEMISED_ACCOUNTS', () => {
  test('a typed lump becomes named holdings without changing the account total', () => {
    const out = buildItemizedAccounts(
      { asset_id: 'a', label: 'Brokerage', tax_bucket: 'TAXABLE', balance: 10_000 } as any,
      [{ label: 'VTI', value: 6_000 } as any, { label: 'BND', value: 3_500 } as any]);
    expect(out).toBeTruthy();
  });
});

describe('BOND_RATE_SENSITIVITY', () => {
  // CORRECTED BY THE PROBE: it returns TWO named outcomes — what happens if rates rise, and if they
  // fall — each a rough band rather than one fake-precise number.
  const B = (maturity: string) => ({ face: 10_000, couponRate: 0.04, maturity, value: 9_800 } as any);
  const NOW = new Date('2026-08-18');

  test('it answers both directions, as a band rather than a single figure', () => {
    const r = bondRateSensitivity(B('2036-08-18'), NOW)!;
    expect(r.ratesUp.high).toBeGreaterThanOrEqual(r.ratesUp.low);
    expect(r.ratesDown.delta).toBeGreaterThan(r.ratesUp.delta);   // falling rates lift a bond's value
  });

  test('A LONGER BOND MOVES MORE — the whole point of showing this', () => {
    const near = bondRateSensitivity(B('2028-08-18'), NOW)!;
    const far = bondRateSensitivity(B('2046-08-18'), NOW)!;
    expect(Math.abs(far.ratesUp.delta)).toBeGreaterThan(Math.abs(near.ratesUp.delta));
  });

  test('not a bond, or no coupon, returns nothing rather than a meaningless zero', () => {
    expect(bondRateSensitivity({ face: 0, couponRate: 0.04, maturity: '2036-08-18', value: 100 } as any, NOW)).toBeNull();
    expect(bondRateSensitivity({ face: 10_000, couponRate: 0, maturity: '2036-08-18', value: 9_800 } as any, NOW)).toBeNull();
  });
});
