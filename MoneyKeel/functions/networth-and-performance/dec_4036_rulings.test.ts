// HIS ANSWERS ON THE OPEN NET WORTH POINTS (DEC-4036b to DEC-4036k, 2026-10-10) — one function test per part, with the
// examples of each ruling. The screens that show them are held by src/screens/__tests__/dec_4036_screens.test.tsx.
import {
  wrapperAccount, taxTreatmentOf, taxWordsOf, TAX_TYPE_NOT_STATED, accountDisplayName, accountClassBreakdown,
  assetsFromOnboarding, asksCashOrInvestments, CASH_OR_INVESTMENTS_ASK, primaryCarIdOf, carValueNotEnteredNotes,
  earmarkLeavesOut, earmarkLeavesOutWords, retirementEarmarkedValue, benchmarkReturn, type AssetAccount,
} from '../../../src/domain/assets';
import { couponIncomeAnnual, interestIncomeAnnual, bondInfo } from '../../../src/domain/bonds';
import { altPartsOf, alternativesSummary } from '../../../src/domain/alternatives';
import { rowOf, isCertificateOfDeposit, theBonds, MATURITY_NOT_ENTERED } from './bonds';
import { theAlternativesOutlook, notClassifiedWords } from './alternatives-outlook';

const TODAY = new Date('2026-10-10T12:00:00');
const acct = (o: Partial<AssetAccount> & Record<string, any>): AssetAccount =>
  ({ asset_id: o.asset_id ?? 'a', label: o.label ?? 'Account', tax_bucket: 'TAXABLE', balance: 0, target_return: 0, ...o }) as AssetAccount;

describe('DEC-4036b · a bond or CD with no maturity date keeps counting its interest', () => {
  const undated = acct({ asset_id: 't', label: 'Treasury', kind: 'fixed_income', asset_class: 'bonds', balance: 10000, face_value: 10000, coupon_rate: 0.04 });
  test('Treasury $10,000 at 4%, no date: $400 a year counted, by both interest figures', () => {
    expect(couponIncomeAnnual([undated], TODAY)).toBeCloseTo(400, 6);
    expect(interestIncomeAnnual([undated], TODAY)).toBeCloseTo(400, 6);
  });
  test('its row carries no date and no years left, and still its $400; the words for the date are "maturity date not entered"', () => {
    const r = rowOf(undated, TODAY);
    expect({ maturity: r.maturity, yearsLeft: r.yearsLeft, couponPerYear: r.couponPerYear }).toEqual({ maturity: '', yearsLeft: null, couponPerYear: 400 });
    expect(MATURITY_NOT_ENTERED).toBe('maturity date not entered');
    expect(theBonds({ accounts: [undated], accountId: 't', today: TODAY }).one!.matured).toBe(false);   // unknown, not matured
  });
});

describe('DEC-4036c · "CD" is read from the account\'s own name or type, never its institution', () => {
  test('a brokerage account at "CD Capital" is not a CD', () => {
    expect(isCertificateOfDeposit({ kind: 'brokerage', label: 'Investment account', institution: 'CD Capital' })).toBe(false);
    expect(bondInfo(acct({ label: 'Investment account', institution: 'CD Capital' })).isCd).toBe(false);
  });
  test('the name or the type still says it', () => {
    expect(isCertificateOfDeposit({ label: 'Marcus 12-Month CD', institution: 'Marcus' })).toBe(true);
    expect(isCertificateOfDeposit({ kind: 'cd', label: 'Deposit', institution: 'Bank' })).toBe(true);
  });
});

describe('DEC-4036d · a 529 is always tax-free for education', () => {
  test('stored "taxable", it is counted tax-free, as its words say', () => {
    const a = acct({ kind: 'college_529', tax_bucket: 'TAXABLE', tax_treatment: 'taxable' });
    expect(taxTreatmentOf(a)).toBe('tax_free');
    expect(taxWordsOf(a)).toBe('tax-free for education');
  });
});

describe('DEC-4036e · an HSA is always pre-tax going in, whatever bucket it is filed in', () => {
  test('filed under Roth, or stated tax-free, it is pre-tax (tax_deferred), and reads "pre-tax — tax-free for medical costs"', () => {
    for (const a of [acct({ kind: 'hsa', tax_bucket: 'ROTH' }), acct({ kind: 'hsa', tax_bucket: 'TAXABLE', tax_treatment: 'tax_free' })]) {
      expect(taxTreatmentOf(a)).toBe('tax_deferred');
      expect(taxWordsOf(a)).toBe('pre-tax — tax-free for medical costs');
    }
  });
});

describe('DEC-4036f · an account with no account type chosen is never assumed taxable', () => {
  test('nothing chosen, or an old wrapper word, gives no kind and no tax type', () => {
    expect(wrapperAccount(null)).toStrictEqual({ kind: undefined, tax_bucket: undefined });
    expect(wrapperAccount('unknown legacy wrapper' as any)).toStrictEqual({ kind: undefined, tax_bucket: undefined });
    expect(wrapperAccount('taxable')).toEqual({ kind: 'brokerage', tax_bucket: 'TAXABLE' });   // chosen taxable stays taxable
  });
  test('no bucket and no treatment: "not_stated" and "tax type not stated"; an unknown bucket word the same', () => {
    const none = acct({ kind: undefined, tax_bucket: undefined as any });
    expect(taxTreatmentOf(none)).toBe('not_stated');
    expect(taxWordsOf(none)).toBe(TAX_TYPE_NOT_STATED);
    expect(TAX_TYPE_NOT_STATED).toBe('tax type not stated');
    expect(taxTreatmentOf(acct({ tax_bucket: 'ISA' as any }))).toBe('not_stated');
  });
  test('a kind that states its own bucket still answers: a Roth IRA with no bucket is tax-free', () => {
    expect(taxTreatmentOf(acct({ kind: 'roth_ira', tax_bucket: undefined as any }))).toBe('tax_free');
  });
  test('an account with no tax type takes no wrapper word it has not earned', () => {
    expect(accountDisplayName({ label: 'Account', institution: 'Vanguard', mask: '1234', tax_bucket: undefined })).toBe('Vanguard -1234');
  });
});

describe('DEC-4036g · the old sign-up answer "savings or portfolio" is filed Unclassified and asked about', () => {
  test('$8,000 answered: Unclassified, no kind, no tax type, no growth, and the question', () => {
    const [s] = assetsFromOnboarding('u' as any, { currentSavingsPortfolio: '8000' }).accounts;
    expect({ cls: s.asset_class, kind: s.kind, bucket: s.tax_bucket, balance: s.balance, growth: s.target_return }).toEqual(
      { cls: 'mixed', kind: undefined, bucket: undefined, balance: 8000, growth: 0 });
    expect(asksCashOrInvestments(s)).toBe(true);
    expect(CASH_OR_INVESTMENTS_ASK).toBe('Is this cash savings or investments?');
    expect(asksCashOrInvestments({ ...s, asset_class: 'cash' })).toBe(false);   // answered: the question goes
  });
});

describe('DEC-4036h · money no priced holding explains is "<amount> asset type not classified"', () => {
  const P = (name: string, shares: number, price: number | null) =>
    ({ position_id: name, ticker: '', name, asset_class: 'other', last_price: price, lots: [{ lot_id: 'l', shares, cost_per_share: 0 }] });
  const brokerage = acct({ asset_id: 'b', label: 'Brokerage', source: 'connected', balance: 4000, positions: [P('Gold', 25, 100), P('Private holding', 1, null)] as any });
  test('$4,000: $2,500 of gold, and $1,500 with no kind and no rate', () => {
    expect(altPartsOf(brokerage)).toStrictEqual([{ value: 2500, kind: 'commodities' }, { value: 1500, kind: undefined, notClassified: true }]);
  });
  test('the total still equals the Alternatives line; the rate and the growth are over the classified $2,500 only', () => {
    const gold = benchmarkReturn('commodities');
    const s = alternativesSummary([brokerage]);
    expect(s.totalValue).toBeCloseTo(4000, 6);
    expect(s.notClassifiedValue).toBeCloseTo(1500, 6);
    expect(s.blendedReturn).toBeCloseTo(gold, 12);
    expect(s.estAnnualGrowth).toBeCloseTo(2500 * gold, 6);
    const o = theAlternativesOutlook({ accounts: [brokerage] });
    expect(o.leavesOut).toBe('Expected return and growth leave out $1,500 asset type not classified.');
    expect(notClassifiedWords(1500)).toBe('$1,500 asset type not classified');
  });
  test('nothing unexplained: no words, nothing left out', () => {
    const o = theAlternativesOutlook({ accounts: [acct({ asset_id: 'c', label: 'Bitcoin', kind: 'crypto', asset_class: 'alternatives', balance: 6000 })] });
    expect({ notClassified: o.notClassifiedValue, leavesOut: o.leavesOut }).toEqual({ notClassified: 0, leavesOut: null });
  });
});

describe('DEC-4036i · an overdrawn hand-built account is negative cash', () => {
  test('balance −$100 with a cash field of $50 → Cash −$100, nothing else', () => {
    const got = accountClassBreakdown(acct({ kind: 'brokerage', balance: -100, cash_balance: 50 }))!;
    expect(got.cash).toBe(-100);
    expect(Object.values(got).reduce((t, v) => t + v, 0)).toBe(-100);
    expect(got.mixed).toBe(0);
  });
});

describe('DEC-4036j · the car you drive is picked among vehicles with a value', () => {
  const cars = [acct({ asset_id: 'A', label: 'Car A', kind: 'vehicle', tax_bucket: 'PROPERTY', balance: null as any }),
    acct({ asset_id: 'B', label: 'Car B', kind: 'vehicle', tax_bucket: 'PROPERTY', balance: 8000 })];
  test('Car B is picked; Car A is named as possibly the one', () => {
    expect(primaryCarIdOf(cars)).toBe('B');
    expect(carValueNotEnteredNotes(cars)).toEqual(["Car A's value not entered — it may be the car you drive."]);
  });
  test('no vehicle valued: one is still picked, and the other is named', () => {
    const none = cars.map((c) => ({ ...c, balance: null as any }));
    expect(primaryCarIdOf(none)).toBe('A');
    expect(carValueNotEnteredNotes(none)).toEqual(["Car B's value not entered — it may be the car you drive."]);
  });
});

describe('DEC-4036k · the retirement money names an account it leaves out for a missing balance', () => {
  const accounts = [acct({ asset_id: 'l', label: 'Linked 401(k)', kind: '401k', tax_bucket: 'PRE_TAX', source: 'connected', balance: null as any }),
    acct({ asset_id: 'b', label: 'Brokerage', kind: 'brokerage', balance: 10000 })];
  test('$10,000, "leaves out Linked 401(k) — Value not entered"', () => {
    expect(retirementEarmarkedValue(accounts)).toBeCloseTo(10000, 6);
    expect(earmarkLeavesOut(accounts)).toEqual(['Linked 401(k)']);
    expect(earmarkLeavesOutWords(accounts)).toBe('leaves out Linked 401(k) — Value not entered');
  });
  test('an account set to count 0% is not named; nothing missing gives no words', () => {
    expect(earmarkLeavesOutWords([{ ...accounts[0], retirement_pct: 0 }, accounts[1]])).toBeNull();
    expect(earmarkLeavesOutWords([accounts[1]])).toBeNull();
  });
});
