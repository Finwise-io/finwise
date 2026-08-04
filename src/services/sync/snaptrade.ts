// SnapTrade → MoneyKeel mapping (design v2 §4, approved 2026-07-18). PURE functions only —
// no network here. The relay Cloud Function fetches; these normalize into our store's language.
// Every rule that guards money accuracy is pinned in snaptrade.test.ts.
import type { TxnType } from '../../domain/transactions';

// ── SnapTrade shapes (the subset we consume; field names per their API reference) ──────────────
export interface StAccount {
  id: string;
  brokerage_authorization: string;
  name?: string | null;
  number?: string | null;                    // may be masked by the brokerage
  institution_name: string;
  raw_type?: string | null;                  // broker's free-form account type
  account_category?: 'INVESTMENT' | 'DEPOSIT' | 'LOC' | null;
  status?: 'open' | 'closed' | 'archived' | 'unavailable' | null;
  balance?: { total?: { amount?: number | null; currency?: string | null } | null } | null;
  sync_status?: {
    holdings?: { initial_sync_completed?: boolean; last_successful_sync?: string | null } | null;
    transactions?: { initial_sync_completed?: boolean; last_successful_sync?: string | null; first_transaction_date?: string | null } | null;
  } | null;
}
export interface StSymbol {
  id?: string | null;                        // SnapTrade UUID — the STABLE key (tickers are not)
  symbol?: string | null;                    // may carry an exchange suffix
  raw_symbol?: string | null;
  description?: string | null;
  type?: { code?: string | null } | null;    // 'cs' | 'et' | 'oef' | 'cef' | 'bnd' | 'crypto' | …
  figi_code?: string | null;
}
export interface StPosition {
  symbol?: { symbol?: StSymbol | null } | StSymbol | null;   // legacy wrapper vs flat
  units?: number | null;
  price?: number | null;
  average_purchase_price?: number | null;
  cash_equivalent?: boolean | null;          // money-market: ALSO inside balances.cash (dedupe!)
  tax_lots?: { original_purchase_date?: string | null; quantity?: number | null; purchased_price?: number | null }[] | null;
}
export interface StOptionHolding {
  symbol?: { option_symbol?: {
    ticker?: string | null;                  // OCC ticker
    option_type?: 'CALL' | 'PUT' | null;
    strike_price?: number | null;
    expiration_date?: string | null;         // 'YYYY-MM-DD'
    underlying_symbol?: { symbol?: string | null; raw_symbol?: string | null } | null;
  } | null } | null;
  units?: number | null;                     // contracts (negative = short)
  price?: number | null;                     // per contract basis varies; value = units×price×multiplier
  average_purchase_price?: number | null;    // per contract
}
export interface StActivity {
  id?: string | null;                        // ⚠️ can CHANGE on reprocessing — never the dedupe key
  type?: string | null;
  option_type?: string | null;
  symbol?: StSymbol | null;                  // null for unrecognized / non-security rows
  option_symbol?: unknown | null;
  description?: string | null;
  trade_date?: string | null;                // often date-only
  settlement_date?: string | null;
  units?: number | null;
  price?: number | null;
  amount?: number | null;                    // signed: + cash in, − cash out
  fee?: number | null;
  external_reference_id?: string | null;
}

// ── account type → our kind + tax wrapper ──────────────────────────────────────────────────────
// SnapTrade has NO normalized wrapper — only the broker's raw string. We map the common shapes;
// anything unmatched returns confident:false and the connect flow ASKS with the Held-in chooser
// (wrong wrapper = wrong tax math — accuracy-is-trust P0, never guessed silently).
export interface WrapperGuess { kind: string; tax_bucket: 'CASH' | 'TAXABLE' | 'PRE_TAX' | 'ROTH'; confident: boolean }
export function mapAccountType(rawType: string | null | undefined, category?: string | null): WrapperGuess {
  const t = (rawType ?? '').toLowerCase();
  const has = (...words: string[]) => words.some((w) => t.includes(w));
  if (has('roth')) return { kind: has('401') ? '401k' : 'roth_ira', tax_bucket: 'ROTH', confident: true };
  if (has('401k', '401(k)', '403b', '403(b)', '457')) return { kind: '401k', tax_bucket: 'PRE_TAX', confident: true };
  if (has('rollover', 'traditional', 'sep', 'simple ira')) return { kind: 'trad_ira', tax_bucket: 'PRE_TAX', confident: true };
  if (has('ira')) return { kind: 'trad_ira', tax_bucket: 'PRE_TAX', confident: true };   // bare 'IRA' → traditional (most common)
  if (has('hsa')) return { kind: 'hsa', tax_bucket: 'PRE_TAX', confident: true };
  if (has('checking')) return { kind: 'checking', tax_bucket: 'CASH', confident: true };
  // FOUNDER-VERIFIED 2026-08-04 (research v1 correction): SnapTrade is brokerage-only — an account
  // typed 'savings' through it is a BROKERAGE account wearing the wrong label (E*TRADE does this).
  // Labels lose to reality (rule 6). Not confident → the wrapper question can still fix IRAs.
  if (has('savings')) return { kind: 'brokerage', tax_bucket: 'TAXABLE', confident: false };
  if (has('529', 'education')) return { kind: 'college_529', tax_bucket: 'TAXABLE', confident: true };
  if (has('individual', 'joint', 'brokerage', 'margin', 'cash', 'taxable', 'trust'))
    return { kind: 'brokerage', tax_bucket: 'TAXABLE', confident: true };
  if (category === 'DEPOSIT') return { kind: 'checking', tax_bucket: 'CASH', confident: true };
  // Unknown → sensible display default, but the UI must CONFIRM before tax math trusts it.
  return { kind: 'brokerage', tax_bucket: 'TAXABLE', confident: false };
}

// ── positions → our holdings ───────────────────────────────────────────────────────────────────
const flatSymbol = (p: StPosition): StSymbol | null => {
  const s: any = p.symbol;
  if (!s) return null;
  return s.symbol && typeof s.symbol === 'object' ? s.symbol : s;   // unwrap legacy wrapper
};
export type MappedAssetClass = 'stocks_etf' | 'bonds' | 'alternatives' | 'cash';
export interface MappedPosition {
  ticker: string;                 // display ticker (raw_symbol preferred)
  symbolId: string | null;        // SnapTrade UUID — the stable identity
  name: string;
  shares: number;
  price: number | null;
  costPerShare: number | null;
  assetClass: MappedAssetClass;
  cashEquivalent: boolean;
  lots: { purchase_date: string | null; shares: number; cost_per_share: number | null }[];
}
// FOUNDER RULE 2026-08-04 (supersedes the 2026-07-19 money-market=cash mapping): cash = cash ONLY
// (the sweep/settlement balance). Money-market FUNDS pay dividends → they class as Stocks/ETFs and
// are measured; T-bill ETFs → bonds. The sleeve dedupe below still keys on the broker's
// cash_equivalent flag, so nothing double-counts.
const TBILL_ETF_TICKERS = new Set(['SGOV', 'BIL']);

export function mapPosition(p: StPosition): MappedPosition | null {
  const sym = flatSymbol(p);
  const shares = p.units ?? 0;
  if (!sym || shares === 0) return null;
  const code = (sym.type?.code ?? '').toLowerCase();
  const tick = (sym.raw_symbol || sym.symbol || '').toUpperCase();
  // B47 finding 5 (Vanguard): brokered CDs arrive WITHOUT the 'bnd' type code and fell through to
  // equities — a CD under Stocks/ETFs. Fixed-income shapes are recognized by description too:
  // CDs, Treasuries/T-bills, and coupon-with-maturity patterns land in Bonds & CDs (the same
  // bucket the founder's E*TRADE CDs always used).
  const desc = (sym.description ?? '').toUpperCase();
  const looksFixedIncome = code === 'cd'
    || /\bCD\b|CERTIFICATE OF DEP|TREASURY|T[- ]BILL/.test(desc)
    || /\d(\.\d+)?%.*\b(DUE|20\d\d)\b/.test(desc);
  const assetClass: MappedAssetClass =
    code === 'bnd' || looksFixedIncome || TBILL_ETF_TICKERS.has(tick) ? 'bonds'
    : code === 'crypto' ? 'alternatives'
    : 'stocks_etf';                                     // cs/et/oef/cef/adr, money-market funds, unknown → equities (founder rule: cash = cash only)
  const lots = (p.tax_lots ?? [])
    .filter((l) => (l.quantity ?? 0) > 0)
    .map((l) => ({ purchase_date: l.original_purchase_date ?? null, shares: l.quantity as number, cost_per_share: l.purchased_price ?? null }));
  return {
    ticker: (sym.raw_symbol || sym.symbol || '?').toUpperCase(),
    symbolId: sym.id ?? null,
    name: sym.description || sym.raw_symbol || sym.symbol || 'Unknown holding',
    shares,
    price: p.price ?? null,
    costPerShare: p.average_purchase_price ?? null,
    assetClass,
    cashEquivalent: !!p.cash_equivalent,
    // no broker lots → ONE synthetic lot from the average price (gain-since-purchase stays exact;
    // per-lot history honestly absent rather than invented)
    lots: lots.length ? lots : [{ purchase_date: null, shares, cost_per_share: p.average_purchase_price ?? null }],
  };
}

// ── option holdings → alternatives rows (G2 closure: itemized, never hidden) ──────────────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const prettyExpiry = (iso: string | null | undefined) => {
  const [y, m, d] = String(iso ?? '').split('-').map(Number);
  return y && m && d ? `${MONTHS[m - 1]} ${d} ${y}` : 'unknown expiry';
};
export interface MappedOption { label: string; contracts: number; value: number; costBasis: number | null }
export function mapOptionHolding(o: StOptionHolding, multiplier = 100): MappedOption | null {
  const os = o.symbol?.option_symbol;
  const contracts = o.units ?? 0;
  if (!os || contracts === 0) return null;
  const under = (os.underlying_symbol?.raw_symbol || os.underlying_symbol?.symbol || os.ticker || '?').toUpperCase();
  const kindWord = os.option_type === 'PUT' ? 'put' : 'call';
  const strike = os.strike_price != null ? `$${os.strike_price}` : '';
  return {
    label: `${under} ${strike} ${kindWord} · exp ${prettyExpiry(os.expiration_date)}${contracts < 0 ? ' (short)' : ''}`.replace(/\s+/g, ' ').trim(),
    contracts,
    value: Math.round((o.price ?? 0) * contracts * multiplier * 100) / 100,
    // LIVE-VERIFIED 2026-07-19 (real E*TRADE): `price` is per SHARE (×100 for the contract) but
    // `average_purchase_price` is already the whole CONTRACT's dollars — it matched the actual
    // BUY_TO_OPEN cash to the cent. Multiplying it too would overstate the basis 100-fold.
    costBasis: o.average_purchase_price != null ? Math.round(o.average_purchase_price * contracts * 100) / 100 : null,
  };
}

// ── activities → our ledger types (design v2 §4 table) ─────────────────────────────────────────
export interface MappedActivity {
  txnType: TxnType | 'ADJUST' | 'SKIP';   // ADJUST = position note, NO cash effect; SKIP = not ingested
  reinvested?: boolean;
  note?: string;
  cashSign?: 1 | -1;                      // for option cash-effect rows mapped to DEPOSIT/WITHDRAWAL
}
export function mapActivityType(a: StActivity): MappedActivity {
  const t = (a.type ?? '').toUpperCase();
  const isOption = !!a.option_symbol || !!a.option_type;
  // Option trades: the option POSITION lives at balance level (alternatives rows), but their CASH
  // effect is real — a bought option is cash out, a sold one cash in. Never dropped silently.
  // AUDIT FIX 2026-07-18: option trades map to BUY/SELL (internal moves), NEVER to
  // DEPOSIT/WITHDRAWAL — those two are external flows and feed the money-weighted return;
  // faking them there corrupts the user's personal-return number.
  if (isOption && (t === 'BUY' || t === 'SELL')) {
    return { txnType: t as 'BUY' | 'SELL', note: t === 'BUY' ? 'option purchase' : 'option sale' };
  }
  switch (t) {
    case 'BUY': return { txnType: 'BUY' };
    case 'SELL': return { txnType: 'SELL' };
    case 'DIVIDEND': return { txnType: 'DIVIDEND' };
    case 'REI': return { txnType: 'DIVIDEND', reinvested: true };
    case 'STOCK_DIVIDEND': return { txnType: 'DIVIDEND', reinvested: true, note: 'stock dividend' };
    case 'CONTRIBUTION': return { txnType: 'DEPOSIT' };
    case 'WITHDRAWAL': return { txnType: 'WITHDRAWAL' };
    case 'INTEREST': return { txnType: 'INTEREST' };
    case 'FEE': return { txnType: 'FEE' };
    case 'TAX': return { txnType: 'FEE', note: 'tax withheld' };
    case 'TRANSFER': return { txnType: 'TRANSFER' };
    case 'EXTERNAL_ASSET_TRANSFER_IN': return { txnType: 'TRANSFER_IN_KIND', note: 'transferred in' };
    case 'EXTERNAL_ASSET_TRANSFER_OUT': return { txnType: 'TRANSFER_IN_KIND', note: 'transferred out' };
    case 'SPLIT': return { txnType: 'ADJUST', note: 'stock split' };            // share counts change, cash does not
    case 'ADJUSTMENT': return { txnType: 'ADJUST', note: 'broker adjustment' };
    case 'OPTIONEXPIRATION': return { txnType: 'SKIP', note: 'option expired' };  // no cash on expiry
    case 'OPTIONASSIGNMENT':
    case 'OPTIONEXERCISE': return { txnType: 'SKIP', note: 'option exercise/assignment — shares arrive via the paired BUY/SELL row' };
    // ── LIVE-VERIFIED types (real E*TRADE, 2026-07-19) the docs never listed ──────────────────
    // A maturing bond/T-bill pays out as REDEMPTION (+cash, −units, CUSIP symbol). It is investment
    // PROCEEDS — mapping it by sign would book it as a fake DEPOSIT and corrupt the money-weighted
    // return (the live account had six figures of these). SELL keeps it internal and feeds realized P/L.
    case 'REDEMPTION': return { txnType: 'SELL', note: 'bond/CD redeemed at maturity' };
    case 'WIRE IN': return { txnType: 'DEPOSIT', note: 'wire in' };
    case 'WIRE OUT': return { txnType: 'WITHDRAWAL', note: 'wire out' };
    // In-kind security movements (reorg exchanges): units move, no cash — never a fake cash flow.
    case 'EXCHANGE RECEIVED IN': return { txnType: 'TRANSFER_IN_KIND', note: 'securities exchanged in' };
    case 'EXCHANGE DELIVERED OUT': return { txnType: 'TRANSFER_IN_KIND', note: 'securities exchanged out' };
    // E*TRADE bills margin interest as MISC ("Thru 08/31/24 for 31 days") and books fee reversals
    // as positive SERVICE FEE rows. Both are INTERNAL costs/credits, not external flows.
    case 'MISC':
      return (a.amount ?? 0) < 0
        ? { txnType: 'FEE', note: 'brokerage charge (MISC)' }
        : { txnType: 'INTEREST', note: 'brokerage credit (MISC)' };
    default:
      // Any *FEE* variant (SERVICE FEE, REORG FEE, ADR FEE…) is a cost/credit, never a cash flow.
      if (t.includes('FEE')) return { txnType: 'FEE', note: `broker: ${a.type}` };
      // Unknown broker type (their docs: 261 raw types at one broker) — key off the money fields.
      if ((a.amount ?? 0) > 0) return { txnType: 'DEPOSIT', note: `broker: ${a.type ?? 'unknown'}` };
      if ((a.amount ?? 0) < 0) return { txnType: 'WITHDRAWAL', note: `broker: ${a.type ?? 'unknown'}` };
      return { txnType: 'SKIP', note: `broker: ${a.type ?? 'unknown'} (no cash amount)` };
  }
}

// ── duplicate-proofing ─────────────────────────────────────────────────────────────────────────
// SnapTrade activity ids can change when they reprocess history, so identity = the composite of
// everything that makes the row THAT row. Re-ingesting an overlapping window never doubles money.
export function activityKey(accountId: string, a: StActivity): string {
  return [
    accountId,
    a.trade_date ?? a.settlement_date ?? '',
    (a.type ?? '').toUpperCase(),
    a.amount ?? '',
    a.units ?? '',
    a.symbol?.id ?? a.symbol?.raw_symbol ?? '',
    a.external_reference_id ?? '',
    a.description ?? '',   // audit fix: separates two otherwise-identical same-day fills
  ].join('|');
}
export function dedupeActivities(accountId: string, incoming: StActivity[], seenKeys: Set<string>): StActivity[] {
  const fresh: StActivity[] = [];
  for (const a of incoming) {
    const k = activityKey(accountId, a);
    if (seenKeys.has(k)) continue;
    seenKeys.add(k);
    fresh.push(a);
  }
  return fresh;
}

// ── the cash sleeve, deduped ───────────────────────────────────────────────────────────────────
// SnapTrade counts money-market (cash_equivalent) positions INSIDE balances.cash too. We show them
// as holdings, so the sleeve = cash − Σ(cash-equivalent position values), floored at zero.
export function netCashSleeve(balancesCash: number | null | undefined, positions: MappedPosition[]): number {
  const mmf = positions.filter((p) => p.cashEquivalent)
    .reduce((t, p) => t + (p.price ?? 0) * p.shares, 0);
  const net = Math.round(((balancesCash ?? 0) - mmf) * 100) / 100;
  // a real margin debit stays NEGATIVE (audit fix — flooring it overstated the account);
  // only sub-dollar rounding dust clamps to zero
  return net < 0 && net > -1 ? 0 : net;
}
