/** THE FUNCTIONS BEHIND HIS DECISIONS OF 2026-10-10 — DEC-4059b, DEC-4059c, DEC-4059d and the DEC-4036f follow-up.
 *  Each test names the function by its identifier and the decision it holds. */
import { maturityClass, assetClassOf, historyCoverage, taxTreatmentOf, propertyUseMap, type AssetAccount } from './index';
import { reclassifyAccounts } from './reclassify';
import { rentalList, rentalNetAnnual } from '../income/onboarding';
import { incomeSummary } from '../../../MoneyKeel/functions/cashflow/income-summary';
import { mapAccountType } from '../../services/sync/snaptrade';
import { ingestSync } from '../../services/sync/ingest';

const acct = (o: Partial<AssetAccount> & Record<string, any>): AssetAccount =>
  ({ asset_id: 'x', label: 'acct', tax_bucket: 'TAXABLE', balance: 1000, target_return: 0, ...o }) as AssetAccount;
const NOW = new Date(2026, 9, 10);   // 2026-10-10, local

describe('MK-NW-F-009 maturityClass · MK-NW-F-120 classEvidenceOf — a maturity that cannot be read is no date (DEC-4059b/c)', () => {
  test('a real date or a month alone is a bond; words, an impossible day or blank are not', () => {
    expect(['2031-06-15', '2027-06', '2024-01-01'].map(maturityClass)).toEqual(['bonds', 'bonds', 'bonds']);
    expect(['tomorrow-ish', '2027-02-30', '2027-13', '', '   ', null].map((t) => maturityClass(t as any))).toEqual(['cash', 'cash', 'cash', 'cash', 'cash', 'cash']);
  });
  test('the class of an account follows the same reading — unreadable text does not make a savings account a bond', () => {
    expect(assetClassOf(acct({ label: 'Savings', kind: 'savings', tax_bucket: 'CASH', maturity_date: 'tomorrow-ish' }))).toBe('cash');
    expect(assetClassOf(acct({ label: 'Savings', kind: 'savings', tax_bucket: 'CASH', maturity_date: '2028-01-01' }))).toBe('bonds');
  });
});

describe('MK-NW-F-046 historyCoverage — a start date that cannot be read is refused, and the person\'s date is used (DEC-4059c)', () => {
  const linked = (o: Record<string, any>) => acct({ label: 'Schwab brokerage', institution: 'Schwab', source: 'connected', ...o });
  test('not a real date, or after today: the refusal, never "a few days of history (from )"', () => {
    for (const from of ['garbage', '2026-02-31', '2026-12-01']) {
      expect(historyCoverage(linked({ history_from: from }), '2025-10-10', NOW))
        .toStrictEqual({ kind: 'unreadable', from: null, monthsCovered: null, sentence: 'History start date cannot be read.' });
    }
  });
  test('today itself is readable: a few days of history', () => {
    expect(historyCoverage(linked({ history_from: '2026-10-10' }), '2025-10-10', NOW)?.sentence).toMatch(/a few days of history \(from Oct 10, 2026\)/);
  });
  test('the person\'s date outranks the sync\'s, readable or not', () => {
    expect(historyCoverage(linked({ history_from: '2099-01-01', history_start_override: '2026-04-10' }), '2025-10-10', NOW)?.sentence)
      .toBe('Schwab shared 6 months of history (from Apr 10, 2026) — figures before that aren\'t counted.');
    expect(historyCoverage(linked({ history_from: '2024-01-01', history_start_override: '2026-04-10' }), '2025-10-10', NOW)?.kind).toBe('partial');
  });
});

describe('MK-XS-F-102 ingestSync — a sync never overwrites the person\'s history start date (DEC-4059c, tenet 5)', () => {
  test('the override survives, while the sync still records its own depth', () => {
    const prior = acct({ asset_id: 'st-1', label: 'Schwab', institution: 'Schwab', source: 'connected', snaptrade_account_id: '1',
      history_from: '2099-01-01', history_start_override: '2025-03-01' } as any);
    const r = ingestSync([prior], {}, [{ account: { id: '1', name: 'Schwab', institution_name: 'Schwab', raw_type: 'individual', number: '1234',
      balance: { total: { amount: 1000, currency: 'USD' } } } as any, activities: [{ id: 'a', trade_date: '2025-06-01', type: 'DIVIDEND', amount: 5 } as any] }]);
    const a: any = r.accounts.find((x) => x.asset_id === 'st-1');
    expect(a.history_start_override).toBe('2025-03-01');
    expect(a.history_from).toBe('2025-06-01');
  });
});

describe('MK-XS-F-104 mapAccountType · MK-NW-F-054 reclassifyAccounts · MK-NW-F-012 taxTreatmentOf — nothing chosen is never taxable (DEC-4036f)', () => {
  test('a linked account whose type the broker\'s word does not settle has no tax type', () => {
    expect(mapAccountType('Premium Savings').tax_bucket).toBeUndefined();
    expect(mapAccountType('Mystery account').tax_bucket).toBeUndefined();
    expect(mapAccountType('Individual').tax_bucket).toBe('TAXABLE');           // the broker said it: a taxable account
  });
  test('moved out of cash by the class sweep, an account gets no tax type — it used to become Taxable', () => {
    const r = reclassifyAccounts([acct({ label: 'Ally 12-month CD', kind: 'cd', asset_class: 'cash', tax_bucket: 'CASH' })]);
    expect([r.accounts[0].asset_class, r.accounts[0].tax_bucket]).toEqual(['bonds', undefined]);
  });
  test('a kind whose catalogue bucket is Taxable says nothing about tax; a kind that names its tax still does', () => {
    for (const kind of ['crypto', 'fixed_income', 'brokerage', 'cd', 'other_asset']) expect(taxTreatmentOf(acct({ kind, tax_bucket: undefined as any }))).toBe('not_stated');
    expect(taxTreatmentOf(acct({ kind: '401k', tax_bucket: undefined as any }))).toBe('tax_deferred');
    expect(taxTreatmentOf(acct({ kind: 'roth_ira', tax_bucket: undefined as any }))).toBe('tax_free');
    expect(taxTreatmentOf(acct({ kind: 'crypto', tax_bucket: 'TAXABLE' }))).toBe('taxable');
  });
});

describe('MK-CF-F-067 rentalList · MK-NW-F-115 liveRent · MK-NW-F-117 propertyUseMap · MK-CF-O-004 incomeSummary — no property, not rent (DEC-4059d)', () => {
  const home = (id: string, o: Record<string, any> = {}) => acct({ asset_id: id, label: id, kind: 'home', tax_bucket: 'PROPERTY', ...o });
  test('an entry with no property, and the old single rent figure, are counted nowhere', () => {
    expect(rentalList({ rentals: [{ type: 'long', income: '2000', expenses: '500' }] } as any)).toEqual([]);
    expect(rentalList({ rentalIncome: '2000', rentalExpenses: '500' } as any)).toEqual([]);
    expect(rentalNetAnnual({ rentals: [{ income: '2000', expenses: '500', property_id: ' ' }] } as any)).toBe(0);
    expect(incomeSummary({ taxMode: 'manual', manualTaxRate: '0', rentals: [{ income: '2000', expenses: '500' }] }).lands.rentMonthly).toBe(0);
  });
  test('the same entry naming its property counts', () => {
    expect(rentalList({ rentals: [{ type: 'long', income: '2000', expenses: '500', property_id: 'p2' }] } as any)).toEqual([{ type: 'long', income: 2000, expenses: 500 }]);
    expect(incomeSummary({ taxMode: 'manual', manualTaxRate: '0', rentals: [{ income: '2000', expenses: '500', property_id: 'p2' }] }).lands.rentMonthly).toBe(1500);
  });
  test('an entry with no property makes no property a rental', () => {
    const m = propertyUseMap([home('p2'), home('p1', { re_use: 'primary' })], [{ income: '2000', expenses: '0' }]);
    expect([m.get('p1'), m.get('p2')]).toEqual(['home', 'second']);
    expect(propertyUseMap([home('p2'), home('p1', { re_use: 'primary' })], [{ income: '2000', expenses: '0', property_id: 'p2' }]).get('p2')).toBe('rental');
  });
});
