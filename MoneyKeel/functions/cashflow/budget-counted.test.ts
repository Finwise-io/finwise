/** A DEBT IS COUNTED FROM DEBTS — his rule, 2026-10-04 (DEC-1923): "Once user enters mortgage or any debt -
 *  the app deduct it directly to calculate surplus, emergency fund, and any other place instead of leaving it
 *  for user to add it to planned expenses." And what a property is used for (DEC-1926): "unless rental income
 *  is added on the income screen, assume property is second or vacation home." */
import { theBudgetCounted } from './budget-counted';
import { propertyUses } from '../networth-and-performance/net-worth';
import { plannedMonthlySpend } from '../../../src/domain/budget';

const home = (id: string, label: string, more: Record<string, any> = {}) => ({ asset_id: id, label, kind: 'home', tax_bucket: 'PROPERTY', balance: 400000, ...more }) as any;
const mortgage = (id: string, label: string, property_id?: string) => ({ debt_id: id, label, debt_type: 'MORTGAGE', remaining_balance: 300000, interest_rate_apr: 0.06, minimum_monthly_payment: 2400, property_id }) as any;
const BUDGET = { monthlySpending: '5000', spendCats: [
  { id: 'rent', label: 'Rent / Mortgage', amount: 2300, bucket: 'fixed', tier: 'critical' },
  { id: 'groceries', label: 'Groceries', amount: 900, bucket: 'flexible', tier: 'critical' }] };

describe('propertyUses — nobody is asked what a property is for', () => {
  test('rent entered for it on the Income screen makes it a rental; without it, it is a second or vacation home', () => {
    // addAsset puts the newest first, so the property entered first is the last one
    const accounts = [home('p3', 'Condo'), home('p2', 'Lake house'), home('p1', 'Home', { re_use: 'primary' })];
    const uses = propertyUses(accounts, [{ income: '1800', expenses: '600', property_id: 'p3' }]);
    expect([...uses]).toEqual(expect.arrayContaining([['p1', 'home'], ['p2', 'second'], ['p3', 'rental']]));
    // take the rent away and the condo is a second home again
    expect(propertyUses(accounts, []).get('p3')).toBe('second');
  });

  test('the home is the property the person marked; with none marked, the one entered first', () => {
    expect(propertyUses([home('p2', 'Lake house', { re_use: 'primary' }), home('p1', 'First house', { re_use: 'secondary' })], []).get('p2')).toBe('home');
    const unmarked = propertyUses([home('p2', 'Lake house'), home('p1', 'First house')], []);
    expect([unmarked.get('p1'), unmarked.get('p2')]).toEqual(['home', 'second']);
    // one property, nothing marked: it is the home
    expect(propertyUses([home('p1', 'Home')], []).get('p1')).toBe('home');
  });

  test('rent stored before the rule names no property: it belongs to the one property that is not the home, when there is exactly one', () => {
    const rent = [{ income: '1800', expenses: '600' }];
    expect(propertyUses([home('p2', 'Duplex'), home('p1', 'Home')], rent).get('p2')).toBe('rental');
    const three = propertyUses([home('p3', 'Condo'), home('p2', 'Duplex'), home('p1', 'Home')], rent);
    expect([three.get('p2'), three.get('p3')]).toEqual(['second', 'second']);      // two candidates: not guessed
  });

  test('a rental cannot also be the home, even when it was marked so', () => {
    expect(propertyUses([home('p1', 'House', { re_use: 'primary' })], [{ income: '900', property_id: 'p1' }]).get('p1')).toBe('rental');
  });
});

describe('theBudgetCounted — the Rent / Mortgage line stands down when the home’s mortgage is in Debts', () => {
  test('a homeowner with the mortgage in Debts: the line is not counted, and neither is its share of the typed total', () => {
    const c = theBudgetCounted({ profile: BUDGET, accounts: [home('p1', 'Home')], debts: [mortgage('m1', 'Chase', 'p1')] });
    expect(c.rentLineInDebts).toEqual({ budgeted: 2300, mortgage: 'Chase' });
    expect(c.homeMortgage).toBe('Chase');
    expect(c.sentence).toBe('Your Rent / Mortgage budget line is not counted here: your home’s mortgage, Chase, is in Debts and is counted from there.');
    expect(plannedMonthlySpend(BUDGET as any)).toBe(5000);
    expect(plannedMonthlySpend(c.profile)).toBe(2700);                 // 5,000 − the 2,300 that Debts now stands for
    expect(BUDGET.spendCats[0].amount).toBe(2300);                     // what the person typed is not rewritten
  });

  test('a renter, a home with no mortgage, and a mortgage on another property: the line is counted as it always was', () => {
    for (const [accounts, debts] of [
      [[], []],                                                                  // rents, owns nothing
      [[home('p1', 'Home')], []],                                                // owns outright
      [[home('p2', 'Lake house'), home('p1', 'Home')], [mortgage('m1', 'Lake loan', 'p2')]],   // the mortgage is on the second home
      [[home('p1', 'Duplex', { re_use: 'rental' })], [mortgage('m1', 'Duplex loan', 'p1')]],   // a renter who owns a rental
    ] as [any[], any[]][]) {
      const c = theBudgetCounted({ profile: BUDGET, accounts, debts });
      expect([c.rentLineInDebts, c.sentence, c.profile]).toEqual([null, '', BUDGET]);
    }
  });

  test('no line budgeted: nothing to stand down, but the home’s mortgage is still named', () => {
    const c = theBudgetCounted({ profile: { spendCats: [{ id: 'groceries', label: 'Groceries', amount: 900 }] }, accounts: [home('p1', 'Home')], debts: [mortgage('m1', 'Chase', 'p1')] });
    expect([c.rentLineInDebts, c.homeMortgage]).toEqual([null, 'Chase']);
  });
});

// OPENAI REVIEW, 2026-10-09: "no rent entries handed in" must not be confused with "the person has none".
// The profile is in hand, so a profile with no rent entries at all is read as NONE — and a property stored as
// 'rental' with no rent entered is a second home (his rule DEC-1926), exactly as with an empty list.
test('a profile with no rent entries is read as none recorded, the same as an empty list', () => {
  const accounts: any[] = [{ asset_id: 'r', label: 'Old rental', kind: 'home', tax_bucket: 'PROPERTY', re_use: 'rental', balance: 300000 }];
  const debts: any[] = [];
  const a = theBudgetCounted({ profile: { spendCats: [{ id: 'rent', amount: 1800 }] }, accounts, debts });
  const b = theBudgetCounted({ profile: { spendCats: [{ id: 'rent', amount: 1800 }], rentals: [] }, accounts, debts });
  expect([a.rentLineInDebts, a.sentence, a.homeMortgage]).toEqual([b.rentLineInDebts, b.sentence, b.homeMortgage]);
  expect(propertyUses(accounts, [] as any).get('r')).toBe('second');   // no rent entered → a second home
});

test('an old house stored as a rental (no rent entered) beside a house with nothing stated and a mortgage: that house is the home, its mortgage counted once', () => {
  const accounts: any[] = [
    { asset_id: 'b', label: 'Maple Ave', kind: 'home', tax_bucket: 'PROPERTY', balance: 600000 },                       // entered second (newest first)
    { asset_id: 'a', label: 'Old rental', kind: 'home', tax_bucket: 'PROPERTY', re_use: 'rental', balance: 300000 }];
  const debts: any[] = [{ debt_id: 'm', label: 'Maple Ave mortgage', debt_type: 'mortgage', property_id: 'b', remaining_balance: 400000, minimum_monthly_payment: 2400, interest_rate_apr: 0.06 }];
  for (const rentals of [undefined, []]) {
    const r = theBudgetCounted({ profile: { spendCats: [{ id: 'rent', amount: 2400 }], rentals }, accounts, debts });
    expect(r.homeMortgage).not.toBeNull();                                  // the Rent / Mortgage line stands down
    expect(propertyUses(accounts, rentals as any).get('b')).toBe('home');
  }
});
