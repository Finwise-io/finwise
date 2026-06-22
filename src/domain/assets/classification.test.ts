// Two-axis classification (taxonomy spec, Term #1): assetClass × taxTreatment, derived from the
// legacy kind/tax_bucket until set explicitly. Orthogonal axes; real assets excluded downstream.
import { assetClassOf, taxTreatmentOf, realEstateUseOf, isRealAsset, type AssetAccount } from './index';

const acct = (over: Partial<AssetAccount>): AssetAccount => ({
  asset_id: 'a' as any, label: 'x', tax_bucket: 'TAXABLE', balance: 0, target_return: 0, ...over,
});

describe('assetClassOf — WHAT it is', () => {
  test('derives from kind across every kind', () => {
    expect(assetClassOf(acct({ kind: 'checking', tax_bucket: 'CASH' }))).toBe('cash');
    expect(assetClassOf(acct({ kind: 'savings', tax_bucket: 'CASH' }))).toBe('cash');
    expect(assetClassOf(acct({ kind: 'stocks_etf' }))).toBe('stocks_etf');
    expect(assetClassOf(acct({ kind: 'brokerage' }))).toBe('stocks_etf');
    expect(assetClassOf(acct({ kind: 'fixed_income' }))).toBe('bonds');
    expect(assetClassOf(acct({ kind: 'crypto' }))).toBe('alternatives');
    expect(assetClassOf(acct({ kind: 'annuities' }))).toBe('alternatives');
    expect(assetClassOf(acct({ kind: '401k', tax_bucket: 'PRE_TAX' }))).toBe('stocks_etf');
    expect(assetClassOf(acct({ kind: 'roth_ira', tax_bucket: 'ROTH' }))).toBe('stocks_etf');
    expect(assetClassOf(acct({ kind: 'college_529' }))).toBe('stocks_etf');
    expect(assetClassOf(acct({ kind: 'home', tax_bucket: 'PROPERTY' }))).toBe('real_estate');
    expect(assetClassOf(acct({ kind: 'vehicle', tax_bucket: 'PROPERTY' }))).toBe('personal_property');
  });

  test('a maturity date ⇒ bonds regardless of kind (fixes the bond-fund/stock misclassification)', () => {
    expect(assetClassOf(acct({ kind: 'stocks_etf', maturity_date: '2030-01-01' }))).toBe('bonds');
    expect(assetClassOf(acct({ kind: 'brokerage', maturity_date: '2028-06-01' }))).toBe('bonds');
  });

  test('explicit asset_class overrides derivation (importer / editor / per-holding)', () => {
    expect(assetClassOf(acct({ kind: '401k', asset_class: 'bonds' }))).toBe('bonds');
    expect(assetClassOf(acct({ kind: 'brokerage', asset_class: 'alternatives' }))).toBe('alternatives');
  });

  test('falls back to the tax bucket when kind is missing', () => {
    expect(assetClassOf(acct({ tax_bucket: 'CASH' }))).toBe('cash');
    expect(assetClassOf(acct({ tax_bucket: 'PROPERTY' }))).toBe('real_estate');
    expect(assetClassOf(acct({ tax_bucket: 'TAXABLE' }))).toBe('stocks_etf');
  });
});

describe('taxTreatmentOf — HOW it is taxed (wrapper axis)', () => {
  test('maps the tax bucket', () => {
    expect(taxTreatmentOf(acct({ tax_bucket: 'CASH' }))).toBe('taxable');
    expect(taxTreatmentOf(acct({ tax_bucket: 'TAXABLE' }))).toBe('taxable');
    expect(taxTreatmentOf(acct({ tax_bucket: 'PROPERTY' }))).toBe('taxable');   // real estate is taxable
    expect(taxTreatmentOf(acct({ tax_bucket: 'PRE_TAX' }))).toBe('tax_deferred');
    expect(taxTreatmentOf(acct({ tax_bucket: 'ROTH' }))).toBe('tax_free');
  });
  test('explicit tax_treatment overrides', () => {
    expect(taxTreatmentOf(acct({ tax_bucket: 'TAXABLE', tax_treatment: 'tax_free' }))).toBe('tax_free');
  });
});

describe('real-asset helpers', () => {
  test('isRealAsset = real estate or personal property (excluded from investable / nest egg)', () => {
    expect(isRealAsset(acct({ kind: 'home', tax_bucket: 'PROPERTY' }))).toBe(true);
    expect(isRealAsset(acct({ kind: 'vehicle', tax_bucket: 'PROPERTY' }))).toBe(true);
    expect(isRealAsset(acct({ kind: 'stocks_etf' }))).toBe(false);
    expect(isRealAsset(acct({ kind: '401k', tax_bucket: 'PRE_TAX' }))).toBe(false);
  });
  test('real-estate use defaults to primary; explicit re_use overrides', () => {
    expect(realEstateUseOf(acct({ kind: 'home', tax_bucket: 'PROPERTY' }))).toBe('primary');
    expect(realEstateUseOf(acct({ kind: 'home', tax_bucket: 'PROPERTY', re_use: 'rental' }))).toBe('rental');
  });
});

// Orthogonality: the two axes are independent — a tax-deferred 401(k) can be any asset class.
describe('the two axes are orthogonal', () => {
  test('a 401(k) is tax_deferred whether it holds stocks or bonds', () => {
    const stocks401k = acct({ kind: '401k', tax_bucket: 'PRE_TAX', asset_class: 'stocks_etf' });
    const bonds401k = acct({ kind: '401k', tax_bucket: 'PRE_TAX', asset_class: 'bonds' });
    expect(taxTreatmentOf(stocks401k)).toBe('tax_deferred');
    expect(taxTreatmentOf(bonds401k)).toBe('tax_deferred');
    expect(assetClassOf(stocks401k)).toBe('stocks_etf');
    expect(assetClassOf(bonds401k)).toBe('bonds');
  });
});
