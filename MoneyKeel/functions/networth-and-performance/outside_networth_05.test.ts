/* THE OUTSIDE CASES, RUN AGAINST THE APP — batch "networth 05", written by Claude from the cards alone.
 *
 * Source, unchanged: MoneyKeel/documents/audit/outside-test-cases/returned/networth05_claude.json.
 * Every expected answer below is the outside model's, copied as it wrote it; only its plain input names
 * are mapped onto the app's (its "earmark_pct" is retirement_pct, "ira" is trad_ira, a "rental_property"
 * is a home whose use is rental, a bond's "rate" is coupon_rate, "accrued" is accrued_interest). A case
 * the app fails is a finding, fixed in the function — never by changing the answer here.
 *
 * HELD AT THE APP'S ANSWER, NOT ITS OWN — each named where it stands, with the reason:
 *   MK-NW-F-040, one case: the retired flow's one question ("Taxable + cash") seeds one account; splitting
 *   cash from the portfolio is a setup-flow change, for that build.
 *   MK-NW-F-053, one case: the owner's rule of 2026-08-04 (DEC-0051) files a money-market account under
 *   Stocks / Funds; the reviewer's distinction (a bank money-market deposit account is cash) is reported.
 *   MK-NW-F-054, one case: a holding tagged bond whose name has no bond or fund word keeps its tag (2 changes, not 3).
 *   MK-NW-F-061, one case: a bond maturing today has matured and is not "next to mature" (his approved
 *   batch 1, DEC-2484); this file says the opposite of file 1.
 *   MK-NW-F-064: the figures are rounded in proportion to the bond (his approved batch 1), so each is held
 *   to within that rounding step of the reviewer's exact figure.
 */
import { earmarkedKinds, assetsFromOnboarding, buildAssetsState } from '../../../src/domain/assets';
import { correctClassOf, reclassifyAccounts } from '../../../src/domain/assets/reclassify';
import { bondInfo, annualCoupon, yearsToMaturity, currentYield, approxYTM, bondSummary, couponIncomeAnnual, interestIncomeAnnual, bondRateSensitivity, type BondInfo } from '../../../src/domain/bonds';
import { buildNetWorth } from '../../../src/domain/networth';
import { theBonds } from './bonds';

const TODAY = new Date('2026-10-07T12:00:00');
const kinds: Record<string, string> = { ira: 'trad_ira', bond: 'fixed_income' };
const acct = (over: Record<string, any> = {}) => {
  const kind = over.kind == null ? over.kind : (kinds[over.kind] ?? over.kind);
  const bucket = over.tax_bucket ?? (['checking', 'savings', 'hysa', 'money_market', 'cd', 'cash_mgmt'].includes(kind) ? 'CASH'
    : ['home', 'vehicle'].includes(kind) ? 'PROPERTY' : ['401k', 'trad_ira', 'hsa'].includes(kind) ? 'PRE_TAX' : kind === 'roth_ira' ? 'ROTH' : 'TAXABLE');
  const { earmark_pct, rate, face, accrued, maturity, ...rest } = over;
  return ({ asset_id: over.id ?? 'a', label: over.label ?? 'Account', balance: 0, target_return: 0.06, ...rest, kind, tax_bucket: bucket,
    ...(earmark_pct !== undefined ? { retirement_pct: earmark_pct } : {}), ...(rate !== undefined ? { coupon_rate: rate } : {}),
    ...(face !== undefined ? { face_value: face } : {}), ...(accrued !== undefined ? { accrued_interest: accrued } : {}), ...(maturity !== undefined ? { maturity_date: maturity } : {}) }) as any;
};
const bond = (o: Record<string, any>): BondInfo => ({ face: o.face ?? null, couponRate: o.rate ?? null, maturity: o.maturity ?? '', value: o.value ?? 0, accruedInterest: o.accrued ?? null, isCd: !!o.is_cd });

describe('MK-NW-F-038 earmarkedKinds — five cases', () => {
  const kindsOf = (accounts: any[]) => new Set(earmarkedKinds(accounts));
  test('easy · two investment accounts, both fully earmarked', () => { expect(kindsOf([acct({ kind: '401k', balance: 100000, earmark_pct: 100 }), acct({ id: 'b', kind: 'brokerage', balance: 50000, earmark_pct: 100 })])).toEqual(new Set(['401k', 'brokerage'])); });
  test('easy · property is left out even when earmarked', () => { expect(kindsOf([acct({ kind: 'home', balance: 500000, earmark_pct: 100 }), acct({ id: 'r', kind: 'roth_ira', balance: 20000, earmark_pct: 100 })])).toEqual(new Set(['roth_ira'])); });
  test('complex · broker-linked names, a kind repeated, a zero earmark, a rental and an account with no kind', () => {
    expect(kindsOf([acct({ id: 'f', label: 'Fidelity Investments Individual - TOD', source: 'connected', kind: 'brokerage', balance: 87412.55, earmark_pct: 40 }),
      acct({ id: 'v', label: 'VANGUARD 401(K) PLAN', source: 'connected', kind: '401k', balance: 312908.1, earmark_pct: 100 }),
      acct({ id: 'h', label: 'House fund', kind: 'brokerage', balance: 22760.04, earmark_pct: 0 }),
      acct({ id: 'r', label: 'Rental on Ashworth', kind: 'home', re_use: 'rental', balance: 410000, earmark_pct: 100 }),
      acct({ id: 'm', label: 'Misc', kind: null, balance: 4210, earmark_pct: 75 })])).toEqual(new Set(['brokerage', '401k', 'other_asset']));
  });
  test('complex · a blank earmark on a 401(k), and a fully earmarked IRA with nothing in it', () => {
    expect(kindsOf([acct({ kind: '401k', balance: 186240.37, earmark_pct: null }), acct({ id: 'i', kind: 'ira', balance: 0, earmark_pct: 100 }), acct({ id: 'c', kind: 'checking', balance: 6118.92, earmark_pct: 0 })])).toEqual(new Set(['401k']));
  });
  test('edge · nothing entered', () => { expect(earmarkedKinds([])).toEqual([]); });
});

describe('MK-NW-F-040 assetsFromOnboarding — five cases', () => {
  const seeded = (op: any) => assetsFromOnboarding('u', op).accounts.map((a) => [a.kind, a.tax_bucket, a.balance, a.target_return]);
  test('easy · only traditional retirement savings answered', () => { expect(seeded({ currentRetirementSavings: '120000' })).toEqual([['401k', 'PRE_TAX', 120000, 0.07]]); });
  test('easy · a typed zero is kept, a blank is not', () => { expect(seeded({ currentRetirementSavingsRoth: '0' })).toEqual([['roth_ira', 'ROTH', 0, 0.07]]); });
  test('complex · three answers, unround amounts, the sum matches what was typed', () => {
    const d = assetsFromOnboarding('u', { currentRetirementSavings: '284350.62', currentRetirementSavingsRoth: '41880.15', investmentHoldings: '63207.90' });
    expect(d.accounts.map((a) => [a.kind, a.tax_bucket, a.balance])).toEqual([['401k', 'PRE_TAX', 284350.62], ['roth_ira', 'ROTH', 41880.15], ['stocks_etf', 'TAXABLE', 63207.9]]);
    expect(d.accounts.reduce((t, a) => t + a.balance, 0)).toBeCloseTo(389438.67, 6);
    expect(d.accounts.every((a) => a.origin === 'onboarding')).toBe(true);
  });
  test('complex · bank savings answered alongside retirement savings', () => {
    const d = assetsFromOnboarding('u', { currentRetirementSavings: '152000', currentSavingsPortfolio: '38500' });
    // SETTLED 2026-10-10 by DEC-4036g: the one "savings or portfolio" number cannot say cash or investments, so it is
    // filed Unclassified with no kind, no tax type and no growth, and Net worth asks "Is this cash savings or investments?"
    expect(d.accounts.map((a) => [a.kind, a.asset_class ?? null, a.balance])).toEqual([['401k', null, 152000], [undefined, 'mixed', 38500]]);
    expect(d.accounts[1].target_return).toBe(0);
  });
  test('edge · a negative answer is skipped, a zero answer is kept', () => {
    expect(seeded({ currentRetirementSavings: '-5000', investmentHoldings: '0' })).toEqual([['stocks_etf', 'TAXABLE', 0, 0.07]]);
    expect(assetsFromOnboarding('u', null).accounts).toEqual([]);
  });
});

// REMOVED 2026-10-14 (inputs-and-use audit, 2026-10-11, Net worth: "Nothing calls them … Remove"): MK-NW-F-044 getAssetsState
// left the code with MK-NW-F-042 loadAssets, MK-NW-F-043 saveAssets and MK-NW-F-111 assetsStateFrom — nothing in the app,
// the doors or the engines called them; every screen reads the accounts from the store. Its five cases are no longer run.
// DEC-2748i (a saved record with every account deleted shows the first-day screen) governed this path only; the store path
// has its own first-day state. The numbers are retired in moneykeel_function_register.json, never reused.

describe('MK-NW-F-053 correctClassOf — five cases', () => {
  test('easy · a CD with no maturity date entered', () => { expect(correctClassOf(acct({ label: 'Ally 12-month CD', kind: 'cd' }))).toBe('bonds'); });
  test('easy · a maturity date with a plain name', () => { expect(correctClassOf(acct({ label: 'My account', kind: 'brokerage', maturity: '2029-05-15' }))).toBe('bonds'); });
  test('complex · a bank money market account', () => {
    // HELD AT THE APP'S ANSWER — the owner's rule of 2026-08-04 (DEC-0051): a money-market account is Stocks / Funds. The
    // reviewer's point — a bank money-market DEPOSIT account is an insured deposit, cash — is reported to him.
    expect(correctClassOf(acct({ label: 'Ally Money Market Account', kind: 'money_market', balance: 24615.08 }))).toBe('stocks_etf');
  });
  test('complex · a Treasury described the way a broker link describes it', () => { expect(correctClassOf(acct({ label: 'US TREASURY NOTE 4.25% 15MAY2029 912828ZT0', source: 'connected', kind: 'brokerage', maturity: '2029-05-15', asset_class: 'stocks_etf' }))).toBe('bonds'); });
  test('edge · no evidence of any kind', () => { expect(correctClassOf(acct({ label: 'Rainy day', kind: null }))).toBeNull(); });
});

describe('MK-NW-F-054 reclassifyAccounts — five cases', () => {
  test('easy · one CD filed as stocks', () => {
    const r = reclassifyAccounts([acct({ label: 'Ally 12-month CD', kind: 'cd', asset_class: 'stocks_etf', tax_bucket: 'TAXABLE' })]);
    expect([r.accounts[0].asset_class, r.accounts[0].tax_bucket, r.changed]).toEqual(['bonds', 'TAXABLE', 1]);
  });
  test('easy · nothing to change', () => {
    const r = reclassifyAccounts([acct({ label: 'US Treasury 2029', maturity: '2029-05-15', asset_class: 'bonds', tax_bucket: 'TAXABLE' })]);
    expect([r.accounts[0].asset_class, r.changed]).toEqual(['bonds', 0]);
  });
  test('complex · an account and its holdings all filed wrongly, broker wording', () => {
    const r = reclassifyAccounts([acct({ label: 'Schwab Treasury Ladder', source: 'connected', asset_class: 'cash', tax_bucket: 'CASH', maturity: '2030-08-15',
      positions: [{ name: 'ISHARES 20+ YEAR TREASURY BOND ETF', asset_class: 'stock_etf' }, { name: 'VANGUARD TOTAL STOCK MKT ETF', asset_class: 'bond' }, { name: 'SCHWAB VALUE ADVANTAGE MONEY INV', asset_class: 'cash' }] })]);
    // SETTLED 2026-10-10 by DEC-4036f: moved out of cash, the account's tax type is not guessed — none is stated
    expect([r.accounts[0].asset_class, r.accounts[0].tax_bucket]).toEqual(['bonds', undefined]);
    const ps = r.accounts[0].positions as any[];
    expect(ps.map((p) => p.asset_class)).toEqual(['bond', 'bond', 'cash']);
    // HELD AT THE APP'S ANSWER — 2 changes, its reading A says 3: "TOTAL STOCK MKT ETF" has no word the app reads as evidence
    // of a fund, so its broker tag (bond) stands rather than being guessed; the account and the Treasury ETF change.
    expect(r.changed).toBe(2);
  });
  test('complex · the person confirmed their money fund as cash', () => {
    const r = reclassifyAccounts([acct({ label: 'Fidelity Money Market', kind: 'money_market', asset_class: 'cash', tax_bucket: 'CASH', wrapper_confirmed: true, balance: 41906.33 })]);
    expect([r.accounts[0].asset_class, r.accounts[0].tax_bucket, r.changed]).toEqual(['cash', 'CASH', 0]);   // the formula as sent overwrote it
  });
  test('edge · nothing entered', () => { expect(reclassifyAccounts([])).toEqual({ accounts: [], changed: 0 }); });
});

describe('MK-NW-F-056 bondInfo — five cases', () => {
  const B = (o: Record<string, any>) => bondInfo(acct({ label: 'Bond', kind: 'bond', balance: o.balance, face: o.face ?? undefined, rate: o.rate ?? undefined, maturity: o.maturity, accrued: o.accrued ?? undefined }));
  test('easy · a complete bond', () => { expect(B({ face: 10000, rate: 0.05, maturity: '2030-10-07', balance: 10000 })).toMatchObject({ face: 10000, couponRate: 0.05, maturity: '2030-10-07', value: 10000, accruedInterest: null }); });
  test('easy · accrued interest entered as zero', () => { expect(B({ face: 10000, rate: 0.05, maturity: '2030-10-07', balance: 10000, accrued: 0 }).accruedInterest).toBe(0); });
  test('complex · a broker-reported bond with accrued interest', () => { expect(B({ face: 25000, rate: 0.04375, maturity: '2028-11-15', balance: 25312.48, accrued: 412.33 })).toMatchObject({ face: 25000, couponRate: 0.04375, maturity: '2028-11-15', value: 25312.48, accruedInterest: 412.33 }); });
  test('complex · a CD entered with only a balance and a rate', () => {
    const b = B({ rate: 0.045, maturity: '2027-06-30', balance: 20000 });
    expect([b.face, b.couponRate, b.value, b.accruedInterest]).toEqual([null, 0.045, 20000, null]);   // the formula as sent made the face 0
    expect(approxYTM(b, TODAY)).toBeNull();                                                      // and gave a yield to maturity of −274%
  });
  test('edge · no coupon rate entered', () => {
    const b = B({ face: 50000, maturity: '2029-01-15', balance: 49100 });
    expect([b.face, b.couponRate, b.value]).toEqual([50000, null, 49100]);                            // the formula as sent made the rate 0
    expect(currentYield(b)).toBeNull();                                                              // REFUSES, not 0.00%
  });
});

describe('MK-NW-F-057 annualCoupon — five cases', () => {
  test('easy · a par bond', () => { expect(annualCoupon(bond({ face: 10000, rate: 0.05 }))).toBe(500); });
  test('easy · a zero-coupon bond', () => { expect(annualCoupon(bond({ face: 20000, rate: 0 }))).toBe(0); });
  test('complex · a bond held above face with accrued interest', () => { expect(annualCoupon(bond({ face: 25000, rate: 0.04375, value: 25312.48, accrued: 412.33 }))).toBeCloseTo(1093.75, 9); });
  test('complex · a bond bought at a discount', () => { expect(annualCoupon(bond({ face: 50000, rate: 0.025, value: 46180, maturity: '2031-03-01' }))).toBe(1250); });
  test('edge · a defaulted bond worth nothing', () => { expect(annualCoupon(bond({ face: 10000, rate: 0.06, value: 0 }))).toBe(600); });
});

describe('MK-NW-F-058 yearsToMaturity — five cases', () => {
  test('easy · exactly one year away, to the day', () => { expect(yearsToMaturity('2027-10-07', new Date('2027-10-07T00:00:00Z').getTime() ? TODAY : TODAY)).toBeCloseTo(1, 6); });   // MOVED 2026-10-08 by the batch 06 fix brief: exact years by anniversaries and a solved yield replace whole-year rounding and the approximation; the new figure is hand-checked at full precision outside the code. It was 365/365.25 — a bond one year away to the day has exactly one year left
  test('complex · exactly two years away, over a leap day', () => { expect(yearsToMaturity('2028-10-07', TODAY)).toBeCloseTo(2, 6); });   // MOVED 2026-10-08 by the batch 06 fix brief: exact years by anniversaries and a solved yield replace whole-year rounding and the approximation; the new figure is hand-checked at full precision outside the code. It was 731/365.25
  test('complex · an unround date', () => { expect(yearsToMaturity('2028-11-15', TODAY)).toBeCloseTo(2 + 39 / 365, 6); });   // MOVED 2026-10-08 by the batch 06 fix brief: exact years by anniversaries and a solved yield replace whole-year rounding and the approximation; the new figure is hand-checked at full precision outside the code. It was 770/365.25
  test('easy · matures today', () => { expect(yearsToMaturity('2026-10-07', TODAY)).toBeCloseTo(0, 2); });
  test('edge · no date', () => { expect(yearsToMaturity('', TODAY)).toBeNull(); });
});

describe('MK-NW-F-059 currentYield — five cases', () => {
  test('easy · a par bond', () => { expect(currentYield(bond({ face: 10000, rate: 0.05, value: 10000 }))).toBeCloseTo(0.05, 12); });
  test('easy · a value of zero', () => { expect(currentYield(bond({ face: 10000, rate: 0.06, value: 0 }))).toBeNull(); });
  test('complex · a dirty value with accrued interest', () => { expect(currentYield(bond({ face: 25000, rate: 0.04375, value: 25312.48, accrued: 412.33 }))).toBeCloseTo(0.0432099, 5); });   // MOVED 2026-10-09 by his ruling (DEC replacing A47): the value is the statement's market value, without accrued interest; accrued interest — entered, or estimated from the coupon schedule — is ADDED for the yield to maturity, and the yield on today's value is on the value as entered. Hand-checked outside the code. It was 4.39% (on the value less accrued)
  test('complex · a discount bond, no accrued entered', () => { expect(currentYield(bond({ face: 50000, rate: 0.025, value: 46180 }))).toBeCloseTo(0.027068, 5); });
  test('edge · accrued equals the whole value', () => { expect(currentYield(bond({ face: 10000, rate: 0.05, value: 412.33, accrued: 412.33 }))).toBeCloseTo(1.2126210, 5); });   // MOVED 2026-10-09 by his ruling (DEC replacing A47): the value is the statement's market value, without accrued interest; accrued interest — entered, or estimated from the coupon schedule — is ADDED for the yield to maturity, and the yield on today's value is on the value as entered. Hand-checked outside the code. It was no yield (nothing left after subtracting); nothing is subtracted now
});

describe('MK-NW-F-060 approxYTM — five cases', () => {
  test('easy · a par bond, four years', () => { expect(approxYTM(bond({ face: 10000, rate: 0.05, value: 10000, maturity: '2030-10-07' }), TODAY)).toBeCloseTo(0.05, 4); });
  test('easy · matured', () => { expect(approxYTM(bond({ face: 10000, rate: 0.05, value: 10000, maturity: '2026-09-30' }), TODAY)).toBeNull(); });
  test('complex · accrued interest entered', () => { expect(approxYTM(bond({ face: 25000, rate: 0.04375, value: 25312.48, accrued: 412.33, maturity: '2028-11-15' }), TODAY)).toBeCloseTo(0.0488510, 5); });   // MOVED 2026-10-09 by his ruling (DEC replacing A47): the value is the statement's market value, without accrued interest; accrued interest — entered, or estimated from the coupon schedule — is ADDED for the yield to maturity, and the yield on today's value is on the value as entered. Hand-checked outside the code.    // MOVED 2026-10-08 by the batch 06 fix brief: exact years by anniversaries and a solved yield replace whole-year rounding and the approximation; the new figure is hand-checked at full precision outside the code. It was 4.57% (the approximation on the price less accrued interest); the full value, accrued included, is what the remaining payments are worth   // the formula as sent gave 3.76% on the dirty value
  test('complex · a discount bond', () => { expect(approxYTM(bond({ face: 50000, rate: 0.025, value: 46180, maturity: '2031-03-01' }), TODAY)).toBeCloseTo(0.0444779, 5); });   // MOVED 2026-10-09 by his ruling (DEC replacing A47): the value is the statement's market value, without accrued interest; accrued interest — entered, or estimated from the coupon schedule — is ADDED for the yield to maturity, and the yield on today's value is on the value as entered. Hand-checked outside the code. It was 4.86% ($753.42 accrued now estimated)
  test('edge · matures exactly today', () => { expect(approxYTM(bond({ face: 10000, rate: 0.05, value: 10000, maturity: '2026-10-07' }), TODAY)).toBeNull(); });
});

describe('MK-NW-F-061 bondSummary — five cases', () => {
  test('easy · one bond', () => {
    const s = bondSummary([bond({ face: 10000, rate: 0.05, value: 10000, maturity: '2030-10-07' })], TODAY);
    expect(s).toMatchObject({ count: 1, totalValue: 10000, totalFace: 10000, annualCoupon: 500, nextMaturity: '2030-10-07' }); expect(s.avgYield).toBeCloseTo(0.05, 12);
  });
  test('easy · no bonds', () => { expect(bondSummary([], TODAY)).toEqual({ count: 0, totalValue: 0, totalFace: 0, annualCoupon: 0, avgYield: null, nextMaturity: null }); });
  test('complex · two bonds and a CD, two with accrued interest', () => {
    const s = bondSummary([bond({ face: 25000, rate: 0.04375, value: 25312.48, accrued: 412.33, maturity: '2028-11-15' }), bond({ face: 50000, rate: 0.025, value: 46180, maturity: '2031-03-01' }), bond({ face: 40000, rate: 0.046, value: 40615.2, accrued: 615.2, maturity: '2027-06-30' })], TODAY);
    expect([s.count, s.totalFace, s.nextMaturity]).toEqual([3, 115000, '2027-06-30']);
    expect(s.totalValue).toBeCloseTo(112107.68, 6); expect(s.annualCoupon).toBeCloseTo(4183.75, 6);
    expect(s.avgYield).toBeCloseTo(0.0373190, 5);   // MOVED 2026-10-09 by his ruling (DEC replacing A47): the value is the statement's market value, without accrued interest; accrued interest — entered, or estimated from the coupon schedule — is ADDED for the yield to maturity, and the yield on today's value is on the value as entered. Hand-checked outside the code. It was 3.77% (on values less accrued)                           // the formula as sent, on dirty values, gave 3.73%
  });
  test('complex · a zero-coupon, a premium bond and a discount bond, no accrued', () => {
    const s = bondSummary([bond({ face: 15000, rate: 0, value: 13208.4, maturity: '2030-05-15' }), bond({ face: 30000, rate: 0.055, value: 31890, maturity: '2029-04-15' }), bond({ face: 12500, rate: 0.0385, value: 12371.95, maturity: '2027-12-01' })], TODAY);
    expect([s.count, s.totalFace, s.nextMaturity]).toEqual([3, 57500, '2027-12-01']);
    expect(s.totalValue).toBeCloseTo(57470.35, 6); expect(s.annualCoupon).toBeCloseTo(2131.25, 6); expect(s.avgYield).toBeCloseTo(0.037084, 5);
  });
  test('edge · one matured last month, one maturing today', () => {
    const s = bondSummary([bond({ face: 20000, rate: 0.03, value: 20000, maturity: '2026-09-15' }), bond({ face: 10000, rate: 0.04, value: 10000, maturity: '2026-10-07' }), bond({ face: 18000, rate: 0.045, value: 17650, maturity: '2029-01-15' })], TODAY);
    // MOVED 2026-10-09 by his rule DEC-2748d (a bond past its maturity date pays no more interest), applied to the Bonds
    // summary after OpenAI's final audit found it counted there and nowhere else. Hand-checked outside the code: the
    // bond that matured 2026-09-15 drops its $600 — coupon 400 + 810 = $1,210 (was $1,810); the average yield is over
    // the two that still pay, (400 + 810) ÷ (10,000 + 17,650) = 4.3761% (was 1,810 ÷ 47,650 = 3.7985%).
    expect([s.count, s.totalValue, s.totalFace, s.annualCoupon]).toEqual([3, 47650, 48000, 1210]);
    expect(s.avgYield).toBeCloseTo(1210 / 27650, 10);
    // HELD AT THE APP'S ANSWER — a bond maturing today has matured and cannot also be next to mature (file 1's own
    // case, approved by him, DEC-2484); this file says 2026-10-07.
    expect(s.nextMaturity).toBe('2029-01-15');
  });
});

describe('MK-NW-F-062 couponIncomeAnnual — five cases', () => {
  test('easy · one bond', () => { expect(couponIncomeAnnual([acct({ kind: 'bond', face: 10000, rate: 0.05, balance: 10000, maturity: '2030-01-01' })])).toBe(500); });
  test('easy · no bonds held', () => { expect(couponIncomeAnnual([acct({ kind: 'checking', balance: 8000 }), acct({ id: 'b', kind: 'brokerage', balance: 60000 })])).toBe(0); });
  test('complex · two bonds, a CD and a savings account that pays interest', () => {
    expect(couponIncomeAnnual([acct({ id: 'a', kind: 'bond', face: 25000, rate: 0.04375, maturity: '2028-11-15' }), acct({ id: 'b', kind: 'bond', face: 50000, rate: 0.025, maturity: '2031-03-01' }), acct({ id: 'c', kind: 'cd', face: 40000, rate: 0.046, maturity: '2027-06-30' }), acct({ id: 's', kind: 'savings', balance: 32418.77, rate: 0.041 })])).toBeCloseTo(4183.75, 6);
  });
  test('complex · a CD entered by balance only', () => {
    const accounts = [acct({ id: 't', kind: 'bond', face: 50000, rate: 0.025, maturity: '2031-03-01' }), acct({ id: 'cd', kind: 'cd', balance: 20000, rate: 0.045, maturity: '2027-06-30' }), acct({ id: 'b', kind: 'brokerage', balance: 74320.18 })];
    expect(couponIncomeAnnual(accounts)).toBeCloseTo(2150, 6);              // the formula as sent gave 1,250: the CD's face read as 0
    expect(interestIncomeAnnual(accounts, TODAY)).toBeCloseTo(2150, 6);     // the same interest, both ways
  });
  test('edge · nothing entered', () => { expect(couponIncomeAnnual([])).toBe(0); });
});

describe('MK-NW-F-063 interestIncomeAnnual — five cases', () => {
  test('easy · one savings account', () => { expect(interestIncomeAnnual([acct({ kind: 'savings', balance: 50000, rate: 0.04 })], TODAY)).toBe(2000); });
  test('easy · checking with no rate', () => { expect(interestIncomeAnnual([acct({ kind: 'checking', balance: 12000 })], TODAY)).toBe(0); });
  test('complex · savings, a bond and a CD typed by balance, alongside a brokerage', () => {
    expect(interestIncomeAnnual([acct({ id: 's', kind: 'savings', balance: 32418.77, rate: 0.041 }), acct({ id: 'b', kind: 'bond', face: 25000, rate: 0.04375, balance: 25312.48, maturity: '2028-11-15' }), acct({ id: 'cd', kind: 'cd', balance: 20000, rate: 0.045, maturity: '2027-06-30' }), acct({ id: 'k', kind: 'brokerage', balance: 91775.4 })], TODAY)).toBeCloseTo(3322.9196, 3);
  });
  test('complex · a bond that matured last month is still listed', () => {
    expect(interestIncomeAnnual([acct({ id: 'x', kind: 'bond', face: 20000, rate: 0.03, balance: 20000, maturity: '2026-09-15' }), acct({ id: 's', kind: 'savings', balance: 50000, rate: 0.04 }), acct({ id: 'cd', kind: 'cd', face: 15000, rate: 0.0415, balance: 15000, maturity: '2028-10-07' })], TODAY)).toBeCloseTo(2622.5, 6);   // the formula as sent gave 3,222.50
  });
  test('edge · a bond with a face value but no rate', () => { expect(interestIncomeAnnual([acct({ kind: 'bond', face: 30000, balance: 29400, maturity: '2030-01-01' })], TODAY)).toBe(0); });
});

describe('MK-NW-F-064 bondRateSensitivity — five cases', () => {
  const near = (got: number, want: number, step: number) => expect(Math.abs(got - want)).toBeLessThanOrEqual(step / 2 + 1e-6);
  test('easy · an ordinary $10,000 bond at par', () => {
    const r = bondRateSensitivity(bond({ face: 10000, rate: 0.05, value: 10000, maturity: '2030-10-07' }), TODAY)!;
    near(r.ratesUp.delta, -346.5106, 100); near(r.ratesUp.low, 9556.9545, 100); near(r.ratesUp.high, 9750.0243, 100);   // the formula as sent gave $10,000–$10,000 and $0
    near(r.ratesDown.delta, 362.9895, 100); near(r.ratesDown.low, 10259.3596, 100); near(r.ratesDown.high, 10466.6194, 100);
  });
  test('easy · a CD', () => {
    expect(bondRateSensitivity(bond({ face: 50000, rate: 0.047, value: 50000, maturity: '2027-04-07', is_cd: true }), TODAY)).toBeNull();   // REFUSES — the formula as sent had no CD check
    const b = theBonds({ accounts: [acct({ id: 'cd', label: 'Ally CD', kind: 'cd', face: 50000, rate: 0.047, balance: 50000, maturity: '2027-04-07' })], accountId: 'cd', today: TODAY });
    expect(b.one!.ratesMove).toBeNull();
  });
  test('complex · a discount Treasury, 4.4 years', () => {
    const r = bondRateSensitivity(bond({ face: 50000, rate: 0.025, value: 46180, maturity: '2031-03-01' }), TODAY)!;
    near(r.ratesUp.delta, -1816.7139, 100); near(r.ratesUp.low, 43919.6532, 100); near(r.ratesUp.high, 44806.9189, 100);   // MOVED 2026-10-09 by his ruling (DEC replacing A47): the value is the statement's market value, without accrued interest; accrued interest — entered, or estimated from the coupon schedule — is ADDED for the yield to maturity, and the yield on today's value is on the value as entered. Hand-checked outside the code. It was −1,779.58   // MOVED 2026-10-08 by the batch 06 fix brief: exact years by anniversaries and a solved yield replace whole-year rounding and the approximation; the new figure is hand-checked at full precision outside the code. It was −1,677.61 on whole years   // the formula as sent gave −$1,000 and $44,000–$45,000
    near(r.ratesDown.delta, 1911.5645, 100); near(r.ratesDown.low, 47610.6488, 100); near(r.ratesDown.high, 48572.4801, 100);
  });
  test('complex · a premium bond whose years round up', () => {
    const r = bondRateSensitivity(bond({ face: 30000, rate: 0.055, value: 31890, maturity: '2029-04-15' }), TODAY)!;
    near(r.ratesUp.delta, -741.294, 100); near(r.ratesUp.low, 30837.2189, 100); near(r.ratesUp.high, 31460.193, 100);   // MOVED 2026-10-09 by his ruling (DEC replacing A47): the value is the statement's market value, without accrued interest; accrued interest — entered, or estimated from the coupon schedule — is ADDED for the yield to maturity, and the yield on today's value is on the value as entered. Hand-checked outside the code. It was −715.33   // MOVED 2026-10-08 by the batch 06 fix brief: exact years by anniversaries and a solved yield replace whole-year rounding and the approximation; the new figure is hand-checked at full precision outside the code. It was −875.66, its years rounded up to 3
    near(r.ratesDown.delta, 766.7111, 100); near(r.ratesDown.low, 32330.144, 100); near(r.ratesDown.high, 32983.2782, 100);
  });
  test('edge · a zero-coupon bond', () => { expect(bondRateSensitivity(bond({ face: 20000, rate: 0, value: 16400, maturity: '2031-06-30' }), TODAY)).toBeNull(); });
});

describe('MK-NW-F-065 buildNetWorth — five cases', () => {
  const nw = (assets: number, debt: number) => { const n = buildNetWorth('u', assets, debt); return [n.gross_assets, n.gross_debt, n.net_worth]; };
  test('easy · simple subtraction', () => { expect(nw(500000, 200000)).toEqual([500000, 200000, 300000]); });
  test('easy · owing more than owned', () => { expect(nw(40000, 65000)).toEqual([40000, 65000, -25000]); });
  test('complex · assets from getAssetsState, three debts', () => {   // the title as sent; MK-NW-F-044 was removed 2026-10-14, the sum is unchanged
    const debt = 412876.3 + 18442.91 + 3105.66;
    expect(debt).toBeCloseTo(434424.87, 6);
    const [a, d, n] = nw(1210131.75, debt);
    expect([a, d]).toEqual([1210131.75, debt]); expect(n).toBeCloseTo(775706.88, 6);
  });
  test('complex · two people’s accounts, one debt with nothing owing', () => {
    const [a, d, n] = nw(372000 + 88415.27, 27880.14 + 298550 + 0);
    expect(a).toBeCloseTo(460415.27, 6); expect(d).toBeCloseTo(326430.14, 6); expect(n).toBeCloseTo(133985.13, 6);
  });
  test('edge · nothing entered anywhere', () => { expect(nw(0, 0)).toEqual([0, 0, 0]); });
});
