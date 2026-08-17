// F6 (founder walk, 2026-08-14): "Holdings imported using SnapTrade — VMFXX (Money Market) got
// imported as cash."
//
// FOUNDER RULE 2026-08-04 says the opposite: "CASH means cash only — a sweep/settlement balance.
// Instruments that pay dividends or interest live in the MEASURED buckets, or the change/return
// math silently loses their income: money-market funds → Stocks / ETFs."
//
// That rule IS implemented in three places — the classifier here, the file importer, and the
// re-classifier that migrates existing data. It is the CONNECTED path, the one the founder actually
// uses, that still has the old behaviour.
import { mapPosition, netCashSleeve } from './snaptrade';

const VMFXX = {
  symbol: { symbol: { raw_symbol: 'VMFXX', symbol: 'VMFXX', description: 'VANGUARD FEDERAL MONEY MARKET FUND',
                      type: { code: 'mf' } } },
  units: 50_000, price: 1, average_purchase_price: 1, cash_equivalent: true,
} as any;

test('the classifier itself gets it RIGHT — a money-market fund is measured, not cash', () => {
  const m = mapPosition(VMFXX)!;
  expect(m.assetClass).toBe('stocks_etf');        // founder rule 2026-08-04
  expect(m.cashEquivalent).toBe(true);            // the broker still flags it as cash-like
});

test('and the cash sleeve nets it out, so the same money is never counted twice', () => {
  const m = mapPosition(VMFXX)!;
  // the broker's cash balance INCLUDES the money-market fund; the sleeve subtracts it
  expect(netCashSleeve(60_000, [m])).toBe(10_000);
});

test('THE DEFECT: the two rules together make the money vanish from the breakdown', () => {
  const m = mapPosition(VMFXX)!;
  // ingest.ts drops every cash-equivalent position: `.filter((m) => !m.cashEquivalent)`
  const shownAsHoldings = [m].filter((x) => !x.cashEquivalent);
  const sleeve = netCashSleeve(60_000, [m]);
  // so $50,000 is subtracted from cash AND never appears as a holding
  expect(shownAsHoldings).toHaveLength(0);
  expect(sleeve).toBe(10_000);
  const accountedFor = sleeve + shownAsHoldings.reduce((t, x) => t + x.price! * x.shares, 0);
  expect(accountedFor).toBe(10_000);
  // …against a real $60,000 of money. The $50,000 is in neither place.
  expect(60_000 - accountedFor).toBe(50_000);
});

// ── THE SECOND CONTRADICTION, and the one that puts it on screen under Cash ──────────────────────
// The founder's clarification: "It imported VMFXX from Vanguard as CASH versus subtracting VMFXX
// from cash." The asset-class mapping was corrected on 2026-08-04 — but the KIND's own metadata
// was not, and the Net Worth screen groups by that.
import { ASSET_KINDS, assetClassOf, assetKind } from '../../domain/assets';

test('the kind mapping says STOCKS but the kind metadata still says CASH — two sources, disagreeing', () => {
  const mm = ASSET_KINDS.find((k) => k.id === 'money_market')!;
  // corrected 2026-08-04: a money-market fund pays dividends, so it is measured
  expect(assetClassOf({ kind: 'money_market' } as any)).toBe('stocks_etf');
  // NOT corrected: the same kind still declares itself Cash, and Net Worth groups by this
  expect(mm.section).toBe('Cash');
  expect(mm.bucket).toBe('CASH');
  expect(assetKind('money_market')!.section).toBe('Cash');
});

test('so one holding answers "which class am I?" two different ways', () => {
  const holding = { kind: 'money_market', label: 'VMFXX', balance: 50_000 } as any;
  const byClass = assetClassOf(holding);                       // Stocks / ETFs
  const bySection = assetKind(holding.kind)!.section;           // Cash
  expect(byClass).toBe('stocks_etf');
  expect(bySection).toBe('Cash');
  expect(byClass === 'cash').toBe(false);
  // the screen groups by section, so the founder sees it under Cash — F6, exactly as reported
});
