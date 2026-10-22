/** HOW MANY UNITS A LINKED BOND COUNTS, AND WHAT ONE UNIT × ONE PRICE IS WORTH (2026-10-20; MK-XS-I-068 price quote).
 *
 *  What SnapTrade sends for a bond (src/services/sync/snaptrade.ts StPosition): a quantity (`units`), a price, an average
 *  purchase price, a cash-equivalent flag and tax lots — NO face value, NO coupon rate, NO maturity date, and no field
 *  saying how the price is quoted. Its documented security types include `bnd` (Bond) but no CD
 *  (docs/FCC-core-55-70/institution-data-research-v2-official-specs-2026-08-04.md §1.3). On the founder's live E*TRADE
 *  account the CDs arrived as CUSIP positions priced per $100 of face value (institution-data-research-v1, finding 7 and
 *  the coverage table: "bonds priced per $100 of face (all live-verified)"): the quantity is the face amount and the price
 *  is per $100 of it, so quantity × price is 100 times the value.
 *
 *  So the sync reads the quote from the broker's OWN total of the account (bondQuoteBasis in ingest.ts): holdings at
 *  quantity × price, plus options and cash, either equal it to the cent (quoted like a share) or, with each individual
 *  bond at quantity × price ÷ 100, they do (quoted per $100 of face). Every reader of a holding's value — the holding's
 *  own door, the account's class split, the daily record — reads that one answer (unitWorth / contractMultiplier).
 *  Nothing cannot tell: the bond is marked unclear, shown as quantity × price, and named in the amber box.
 */
import { ingestSync, bondQuoteBasis, stAssetId, type AccountSyncPayload } from './ingest';
import { theHolding } from '../../../MoneyKeel/functions/networth-and-performance/holding';
import { holdingBondFacts } from '../../../MoneyKeel/functions/networth-and-performance/bonds';
import { accountClassBreakdown } from '../../domain/assets';
import { buildDayFromAccounts, unitWorth } from '../../../Calculation Module code/engines/snapshots';
import { dataGaps } from '../../domain/gaps';

const NOW = '2026-10-20T12:00:00.000Z';
const payload = (total: number, positions: AccountSyncPayload['positions'], cash = 0): AccountSyncPayload => ({
  account: { id: 'acc-bond', brokerage_authorization: 'conn-1', name: 'E*TRADE Individual', number: '11112222', institution_name: 'E*TRADE',
    raw_type: 'Individual', balance: { total: { amount: total, currency: 'USD' } },
    sync_status: { holdings: { initial_sync_completed: true, last_successful_sync: '2026-10-20T06:00:00Z' } } } as any,
  balancesCash: cash, positions, activities: [],
});
/** A US Treasury note as SnapTrade sends it: its CUSIP in the symbol, the bond type code, a quantity and a price. */
const note = (units: number, price: number) => ({
  symbol: { id: 'u-tsy', raw_symbol: '91282CGM7', description: 'US TREASURY NOTE 4.25% 02/15/2028', type: { code: 'bnd' } } as any,
  units, price, average_purchase_price: 98,
});
const stored = (total: number, positions: AccountSyncPayload['positions'], cash = 0) => {
  const r = ingestSync([], {}, [payload(total, positions, cash)], NOW);
  const acct = r.accounts.find((a) => a.asset_id === stAssetId('acc-bond'))!;
  return { acct, pos: acct.positions![0] as any };
};

test('$100,000 face at 99.50, quoted per $100 of face, reads $99,500 — the broker\'s total of $99,500 settles it', () => {
  const { acct, pos } = stored(99_500, [note(100_000, 99.5)]);
  expect(pos.price_quote).toBe('per_100_of_face');
  expect(unitWorth(pos)).toBe(1 / 100);
  // the holding's own door: 100,000 × 99.50 ÷ 100 = 99,500 (read as a share it would be 9,950,000)
  expect(theHolding({ position: pos, accountId: String(acct.asset_id), price: pos.last_price, transactions: [] }).value).toBe(99_500);
  // the account's class split, which Net worth adds up
  expect(accountClassBreakdown(acct)!.bonds).toBe(99_500);
  // the daily record
  expect(buildDayFromAccounts([acct as any], '2026-10-20', NOW).holdings[0].value).toBe(99_500);
  // the account's balance is the broker's own total
  expect(acct.balance).toBe(99_500);
  // with no face value entered, its quantity IS its face amount (Q38 part 1): the line under it reads $100,000 face
  expect(holdingBondFacts(pos, 99_500, new Date('2026-10-20T12:00:00')).face).toBe(100_000);
});

test('the same bond sent like a share — 1,000 units at $99.50, total $99,500 — reads $99,500 too, and is not marked', () => {
  const { acct, pos } = stored(99_500, [note(1_000, 99.5)]);
  expect(pos.price_quote).toBeUndefined();
  expect(unitWorth(pos)).toBe(1);
  expect(theHolding({ position: pos, accountId: String(acct.asset_id), price: pos.last_price, transactions: [] }).value).toBe(99_500);
  expect(accountClassBreakdown(acct)!.bonds).toBe(99_500);
});

test('with a stock and cash beside it the broker\'s total still decides: $40,000 of VTI + $2,000 cash + the bond', () => {
  const vti = { symbol: { id: 'u-vti', raw_symbol: 'VTI', description: 'Vanguard Total', type: { code: 'et' } } as any, units: 160, price: 250, average_purchase_price: 200 };
  const { acct } = stored(141_500, [note(100_000, 99.5), vti], 2_000);
  const bond = (acct.positions as any[]).find((p) => p.ticker === '91282CGM7');
  const fund = (acct.positions as any[]).find((p) => p.ticker === 'VTI');
  expect(bond.price_quote).toBe('per_100_of_face');
  expect(fund.price_quote).toBeUndefined();   // only an individual bond or CD is ever read per $100 of face
});

test('when the total fits neither reading, the bond is marked unclear, shown as quantity × price, and named in the amber box', () => {
  const { acct, pos } = stored(50_000, [note(100_000, 99.5)]);
  expect(pos.price_quote).toBe('unclear');
  expect(unitWorth(pos)).toBe(1);
  const gap = dataGaps([acct], null, Date.parse(NOW), []).find((g) => g.kind === 'bond-quote')!;
  expect(gap.title).toBe('US TREASURY NOTE 4.25% 02/15/2028 — check its value');
  expect(gap.fixLabel).toBe('Enter its face value');
});

test('the rule itself, by hand: holdings at quantity × price plus the rest either equal the total, or do with each bond ÷ 100', () => {
  const h = (units: number, price: number, bond = true, face: number | null = null) => ({ units, price, cost: null, bond, face });
  expect(bondQuoteBasis([h(100_000, 99.5)], 0, 99_500)).toEqual(['per_100_of_face']);
  expect(bondQuoteBasis([h(1_000, 99.5)], 0, 99_500)).toEqual(['per_unit']);
  expect(bondQuoteBasis([h(100_000, 99.5)], 0, 50_000)).toEqual(['unclear']);
  // no total from the broker: a face value the person entered that equals the quantity says per $100 of face
  expect(bondQuoteBasis([h(100_000, 99.5, true, 100_000)], 0, null)).toEqual(['per_100_of_face']);
  // a holding that is not a bond has no answer
  expect(bondQuoteBasis([h(160, 250, false)], 0, 40_000)).toEqual([null]);
});
