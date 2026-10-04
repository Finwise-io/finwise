/** THE DOOR FOR "what might these investments earn in a year" — MK-NW-O-006 (Q-NW-6). */
import { theAlternativesOutlook } from './alternatives-outlook';

const alt = (over: any) => ({ tax_bucket: 'TAXABLE', balance: 0, ...over } as any);

test('the rate is weighted by what each is worth, and the money follows from it', () => {
  const a = theAlternativesOutlook({ accounts: [
    alt({ asset_id: 'x1', label: 'Bitcoin', kind: 'crypto', balance: 6000 }),
    alt({ asset_id: 'x2', label: 'Fund', kind: 'private_equity', balance: 4000 }),
  ] });
  expect(a.count).toBe(2);
  expect(a.expectedReturn).toBeGreaterThan(0);
  expect(a.estimatedGrowthPerYear).toBeCloseTo(10000 * (a.expectedReturn as number), 6);
});

test('NOTHING HELD IS NOT A FORECAST OF NOTHING — there is no figure at all', () => {
  const a = theAlternativesOutlook({ accounts: [] });
  expect(a.count).toBe(0);
  expect(a.estimatedGrowthPerYear).toBeNull();
});

test('an alternative worth nothing yet gives no forecast either', () => {
  const a = theAlternativesOutlook({ accounts: [alt({ asset_id: 'x', label: 'Art', kind: 'collectibles', balance: 0 })] });
  expect(a.estimatedGrowthPerYear).toBeNull();
});
