// Realized profit/loss — the founder's PRD ask (Invest r3 + NW r43, verified missing by the
// 2026-07-18 comment audit). Computed HONESTLY from the ledger: FIFO — the oldest recorded buy
// lots are consumed first by each sale; a sale with no recorded basis contributes nothing and is
// counted separately (we never invent a cost). Works for manual ledgers and connected history.
import type { Transaction } from '../transactions';
import { contractMultiplier, type Position } from './index';

export interface RealizedResult {
  realizedAllTime: number;      // Σ (proceeds − basis) over sells WITH known basis
  realizedThisYear: number;     // same, sale-dated in the current calendar year
  sellsCounted: number;         // sells that had basis
  sellsWithoutBasis: number;    // sells we could not honestly price (no recorded buy)
}

/* ─ MK-PF-F-028 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * realizedFromLedger
 *
 * Answers ..... How much profit have I actually taken?
 *
 * Formula .....
 *     rows = the ledger's BUY, Opening holding and SELL rows with a ticker, shares and a price (filtered to the ticker / account asked for), oldest first
 *     for each row: a buy is queued per account and ticker; a sale takes from the oldest queued buys: take = min(lot shares, shares still to sell); basis += take × lot price; lot shares −= take; still to sell −= take; the lot is dropped when empty
 *     gain = covered shares × sale price − basis, to the cent; added to the all-time total, and to this year's when the sale date is in this year
 *     a sale with shares still uncovered is counted as a sale without basis — reported, never guessed
 *     the answer = { realized all time, realized this year, sells counted, sells without basis }
 *
 * Called by ... MK-NW-O-006 theHolding
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-080 HOLD · MK-NW-O-006 theHolding
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-009 transaction date
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *
 * Decides .....
 *     · If shares is missing it uses 0.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *     · Sales dated in the current calendar year make the this-year total; the device clock decides which year that is.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-028
 * Changed ..... 2026-07-18 (50e9885)
 */
export function realizedFromLedger(
  txns: Transaction[],
  opts: { ticker?: string; accountId?: string; now?: Date; holding?: Pick<Position, 'kind' | 'multiplier'> } = {},
): RealizedResult {
  const now = opts.now ?? new Date();
  // × THE CONTRACT MULTIPLIER of the holding asked about (DEC-0274: "options: value = contracts × 100 × price"),
  // as cost, value and the long/short split already apply it: two contracts bought at $3.20 and sold at $5.45
  // made $450, they read $4.50 (outside review Claude Performance, 2026-10-11). The records carry a price per
  // share and a count of contracts; the holding says how many shares a contract is.
  const mult = opts.holding ? contractMultiplier(opts.holding) : 1;
  const yr = String(now.getFullYear());
  const rows = txns
    .filter((t) => (t.type === 'BUY' || t.type === 'OPENING_POSITION' || t.type === 'SELL'))
    .filter((t) => !!t.ticker && (t.shares ?? 0) > 0 && t.price != null)
    .filter((t) => (opts.ticker ? String(t.ticker).toUpperCase() === opts.ticker.toUpperCase() : true))
    .filter((t) => (opts.accountId ? t.account_id === opts.accountId : true))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));    // oldest first — FIFO needs time order

  // FIFO queues per ticker+account (a Schwab AAPL lot never covers a Robinhood AAPL sale)
  const queues = new Map<string, { shares: number; price: number }[]>();
  const keyOf = (t: Transaction) => `${t.account_id}|${String(t.ticker).toUpperCase()}`;
  let all = 0, year = 0, counted = 0, uncovered = 0;

  for (const t of rows) {
    const k = keyOf(t);
    if (t.type !== 'SELL') {
      const q = queues.get(k) ?? [];
      q.push({ shares: t.shares!, price: t.price! });
      queues.set(k, q);
      continue;
    }
    const q = queues.get(k) ?? [];
    let toSell = t.shares!;
    let basis = 0, covered = 0;
    while (toSell > 0 && q.length > 0) {
      const lot = q[0];
      const take = Math.min(lot.shares, toSell);
      basis += take * lot.price;
      covered += take;
      lot.shares -= take;
      toSell -= take;
      if (lot.shares <= 1e-9) q.shift();
    }
    if (covered > 0) {
      const gain = (covered * t.price! - basis) * mult;
      all += gain;
      if (t.date.startsWith(yr)) year += gain;
      counted++;
    }
    if (toSell > 1e-9) uncovered++;   // partially/fully unpriceable — reported, never guessed
  }
  return {
    realizedAllTime: (all),
    realizedThisYear: (year),
    sellsCounted: counted,
    sellsWithoutBasis: uncovered,
  };
}
