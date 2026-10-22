// F6 (founder walk, 2026-08-14): "Holdings imported using SnapTrade — VMFXX (Money Market) got
// imported as cash."
//
// FOUNDER RULE 2026-08-04 says the opposite: "CASH means cash only — a sweep/settlement balance.
// Instruments that pay dividends or interest live in the MEASURED buckets, or the change/return
// math silently loses their income: money-market funds → Stocks / Funds."
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

// DEC-2159 / his 2026-10-20 words, "always the class broker sends": the founder rule of 2026-08-04 above made a
// money-market fund Stocks / Funds by its name. His newer ruling makes the class the broker sends decide, and a broker
// that flags a fund cash-equivalent is saying "this is cash". So F6's reported behaviour — VMFXX under Cash — is now the
// rule wherever the broker flags it; a fund the broker does not flag (E*TRADE sends VMFXX as 'oef', flag false) is
// Stocks / Funds. The cash beside it is still net of it, so it is counted once.
test('DEC-2159 / his 2026-10-20 words: a money-market fund the broker flags cash-equivalent is Cash (was: measured under Stocks / Funds)', () => {
  const m = mapPosition(VMFXX)!;
  expect(m.assetClass).toBe('cash');              // was 'stocks_etf' (founder rule 2026-08-04, DEC-0051)
  expect(m.cashEquivalent).toBe(true);            // the broker flags it as cash
  const unflagged = mapPosition({ ...VMFXX, cash_equivalent: false, symbol: { symbol: { ...VMFXX.symbol.symbol, type: { code: 'oef' } } } })!;
  expect(unflagged.assetClass).toBe('stocks_etf'); // no flag: the broker's fund type decides
});

test('and the cash sleeve nets it out, so the same money is never counted twice', () => {
  const m = mapPosition(VMFXX)!;
  // the broker's cash balance INCLUDES the money-market fund; the sleeve subtracts it
  expect(netCashSleeve(60_000, [m])).toBe(10_000);
});

// THE DEFECT, AS IT STOOD UNTIL 2026-10-05, and the proof it is closed. The sync dropped every holding
// the broker flags as cash-equivalent (`.filter((m) => !m.cashEquivalent)`) while the cash figure was
// also made net of it — so the fund was in neither place. This test used to act that out with the two
// helpers; it now runs the sync itself, for a large fund and for one small enough that the rounding
// rule swept it into Cash.
import { ingestSync } from './ingest';
import { accountClassBreakdown, cashTotal } from '../../domain/assets';

test.each([[50_000], [900]])('a money-market fund the broker flags as cash-equivalent ($%d) is a holding under Cash (DEC-2159 / his 2026-10-20 words; was Stocks / Funds), and the account adds up', (fund) => {
  const NOW = '2026-10-05T12:00:00Z';
  const total = 100_000 + fund + 1_000;                                    // VTI + the fund + uninvested cash
  const r = ingestSync([], {}, [{
    account: { id: 'acc-1', name: 'Vanguard Brokerage', number: '****7665', institution_name: 'Vanguard',
      balance: { total: { amount: total, currency: 'USD' } }, meta: { type: 'INDIVIDUAL' }, sync_status: { holdings: { last_successful_sync: NOW } } },
    balancesCash: 1_000 + fund,                                            // the broker counts the fund inside its cash figure
    positions: [
      { symbol: { symbol: { id: 'u-vti', raw_symbol: 'VTI', symbol: 'VTI', description: 'Vanguard Total', type: { code: 'et' } } }, units: 400, price: 250, average_purchase_price: 200 },
      { ...VMFXX, units: fund },
    ],
    activities: [],
  } as any], NOW);
  const a = r.accounts[0];
  expect(a.positions!.map((x: any) => x.ticker)).toEqual(['VTI', 'VMFXX']);   // it used to be dropped from the list
  expect(a.cash_balance).toBe(1_000);                                      // and the cash is still net of it — counted once
  expect(a.recon_break).toBeUndefined();                                   // it used to read "does not add up" by exactly the fund
  const b = accountClassBreakdown(a)!;
  expect(b.cash).toBe(1_000 + fund);                                       // was 1,000: the broker's flag says the fund is cash
  expect(b.stocks_etf).toBe(100_000);                                      // was 100,000 + the fund
  expect(cashTotal([a])).toBe(1_000 + fund);                               // so the emergency fund counts it, once (was 1,000)
});

// ── THE SECOND CONTRADICTION, and the one that puts it on screen under Cash ──────────────────────
// The founder's clarification: "It imported VMFXX from Vanguard as CASH versus subtracting VMFXX
// from cash." The asset-class mapping was corrected on 2026-08-04 — but the KIND's own metadata
// was not, and the Net Worth screen groups by that.
import { ASSET_KINDS, assetClassOf, assetKind } from '../../domain/assets';

test('F6 CLOSED 2026-10-08: the kind mapping and the kind metadata agree — a money-market fund is measured, not Cash', () => {
  const mm = ASSET_KINDS.find((k) => k.id === 'money_market')!;
  expect(assetClassOf({ kind: 'money_market' } as any)).toBe('stocks_etf');   // his rule DEC-0051
  expect(mm.section).toBe('Investments');
  expect(mm.bucket).toBe('TAXABLE');
});

test('so one holding answers "which class am I?" one way', () => {
  const holding = { kind: 'money_market', label: 'VMFXX', balance: 50_000 } as any;
  expect(assetClassOf(holding)).toBe('stocks_etf');
  expect(assetKind(holding.kind)!.section).toBe('Investments');   // it was 'Cash' — F6, as he reported it
});
