// Realized profit/loss — the founder's PRD ask (Invest r3 + NW r43, verified missing by the
// 2026-07-18 comment audit). Computed HONESTLY from the ledger: FIFO — the oldest recorded buy
// lots are consumed first by each sale; a sale with no recorded basis contributes nothing and is
// counted separately (we never invent a cost). Works for manual ledgers and connected history.
import type { Transaction } from '../transactions';

export interface RealizedResult {
  realizedAllTime: number;      // Σ (proceeds − basis) over sells WITH known basis
  realizedThisYear: number;     // same, sale-dated in the current calendar year
  sellsCounted: number;         // sells that had basis
  sellsWithoutBasis: number;    // sells we could not honestly price (no recorded buy)
}

export function realizedFromLedger(
  txns: Transaction[],
  opts: { ticker?: string; accountId?: string; now?: Date } = {},
): RealizedResult {
  const now = opts.now ?? new Date();
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
      const gain = Math.round((covered * t.price! - basis) * 100) / 100;
      all += gain;
      if (t.date.startsWith(yr)) year += gain;
      counted++;
    }
    if (toSell > 1e-9) uncovered++;   // partially/fully unpriceable — reported, never guessed
  }
  return {
    realizedAllTime: Math.round(all * 100) / 100,
    realizedThisYear: Math.round(year * 100) / 100,
    sellsCounted: counted,
    sellsWithoutBasis: uncovered,
  };
}
