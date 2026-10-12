// SnapTrade → MoneyKeel mapping (design v2 §4, approved 2026-07-18). PURE functions only —
// no network here. The relay Cloud Function fetches; these normalize into our store's language.
// Every rule that guards money accuracy is pinned in snaptrade.test.ts.
import type { TxnType } from '../../domain/transactions';
import { importKey } from '../../../Calculation Module code/engines/ledger';
import { classifyHoldingClass } from '../../../Calculation Module code/engines/holding-class';

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
    // SnapTrade SDK 12.2.22: "Mini options have 10 underlying shares per contract instead of the standard 100"
    is_mini_option?: boolean | null;
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
// tax_bucket undefined = not stated: an account type the broker's word does not settle is never guessed taxable (DEC-4036f, 2026-10-10)
export interface WrapperGuess { kind: string; tax_bucket: 'CASH' | 'TAXABLE' | 'PRE_TAX' | 'ROTH' | undefined; confident: boolean }
/* ─ MK-XS-F-104 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * mapAccountType
 *
 * Answers ..... What kind of account is this, and how is it taxed?
 *
 * Formula .....
 *     t = (raw type ?? '').to lower case()
 *     has = (...words: string[]) => words.some((w) => includes(w))
 *     kind = '401k'   if has('401')
 *     'roth_ira'   otherwise
 *     tax bucket = 'ROTH'
 *     confident = true   when has('roth')
 *     kind = '401k'
 *     tax bucket = 'PRE_TAX'
 *     confident = true   when has('401k', '401(k)', '403b', '403(b)', '457')
 *     kind = 'trad_ira'
 *     tax bucket = 'PRE_TAX'
 *     confident = true   when has('rollover', 'traditional', 'sep', 'simple ira')
 *     kind = 'trad_ira'
 *     tax bucket = 'PRE_TAX'
 *     confident = true   when has('ira')
 *     kind = 'hsa'
 *     tax bucket = 'PRE_TAX'
 *     confident = true   when has('hsa')
 *     kind = 'checking'
 *     tax bucket = 'CASH'
 *     confident = true   when has('checking')
 *     kind = 'brokerage'
 *     tax bucket = undefined
 *     confident = false   when has('savings')
 *     kind = 'college_529'
 *     tax bucket = 'TAXABLE'
 *     confident = true   when has('529', 'education')
 *     the answer:
 *     kind = 'brokerage'
 *     tax bucket = 'TAXABLE'
 *     confident = true
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-XS-F-102 ingestSync
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-102 ingestSync
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-104
 * Changed ..... 2026-08-03 (fc3df97)
 */
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
  // NOT CONFIDENT IS NOT TAXABLE (DEC-4036f, 2026-10-10): "An account with no account type chosen is never assumed
  // taxable." The tax type stays unstated until the person answers the Held-in question.
  if (has('savings')) return { kind: 'brokerage', tax_bucket: undefined, confident: false };
  if (has('529', 'education')) return { kind: 'college_529', tax_bucket: 'TAXABLE', confident: true };
  if (has('individual', 'joint', 'brokerage', 'margin', 'cash', 'taxable', 'trust'))
    return { kind: 'brokerage', tax_bucket: 'TAXABLE', confident: true };
  if (category === 'DEPOSIT') return { kind: 'checking', tax_bucket: 'CASH', confident: true };
  // Unknown → a display kind only; no tax type until the person confirms it (DEC-4036f, 2026-10-10) — it used to be TAXABLE.
  return { kind: 'brokerage', tax_bucket: undefined, confident: false };
}

// ── positions → our holdings ───────────────────────────────────────────────────────────────────
/* ─ MK-XS-F-145 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * flatSymbol
 *
 * Answers ..... ── positions → our holdings ───────────────────────────────────────────────────────────────────
 *
 * Formula .....
 *     s = symbol
 *     nothing   when s is missing
 *     the answer:
 *     symbol   if symbol and typeof symbol = 'object'
 *     s   otherwise
 *
 * Called by ... MK-XS-F-105 mapPosition
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-102 ingestSync · MK-XS-F-105 mapPosition
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-007 purchase price and date (per lot)
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-145
 * Changed ..... not in git yet (—)
 */
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
  brokerTag: string;              // the broker's own type code, passed through for the continuity check
  cashEquivalent: boolean;
  lots: { purchase_date: string | null; shares: number; cost_per_share: number | null }[];
}
// B7 (founder brief 2026-08-20): classification lives in the ONE function — name first, broker tag
// as fallback only. This road only gathers the evidence. (Supersedes the inline 2026-08-04 rule
// and the B47 finding-5 fixed-income patterns — both moved into the function, behavior kept.)
/* ─ MK-XS-F-105 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * mapPosition
 *
 * Answers ..... B7 (founder brief 2026-08-20): classification lives in the ONE function — name first, broker tag as fallback only.
 *
 * Formula .....
 *     sym = flat symbol(p)
 *     shares = units (or 0 when missing)
 *     nothing   when sym is missing (or shares = 0 when missing or zero)
 *     code = (sym.type.code ?? '').to lower case()
 *     tick = (sym.raw symbol or sym.symbol or '').to upper case()
 *
 * Called by ... MK-XS-F-102 ingestSync
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-102 ingestSync
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-010 transaction words (the institution's own wording)
 *
 * Decides .....
 *     · If units is missing it uses 0.
 *     · If quantity is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-105
 * Changed ..... 2026-08-20 (026b132)
 */
export function mapPosition(p: StPosition): MappedPosition | null {
  const sym = flatSymbol(p);
  const shares = p.units ?? 0;
  if (!sym || shares === 0) return null;
  const code = (sym.type?.code ?? '').toLowerCase();
  const tick = (sym.raw_symbol || sym.symbol || '').toUpperCase();
  const assetClass: MappedAssetClass = classifyHoldingClass({
    name: sym.description, ticker: tick, brokerTag: code,
    cashEquivalent: !!p.cash_equivalent, hasSecurityIdentity: true,
  }).cls;
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
    brokerTag: code,
    cashEquivalent: !!p.cash_equivalent,
    // no broker lots → ONE synthetic lot from the average price (gain-since-purchase stays exact;
    // per-lot history honestly absent rather than invented)
    lots: lots.length ? lots : [{ purchase_date: null, shares, cost_per_share: p.average_purchase_price ?? null }],
  };
}

// ── option holdings → alternatives rows (G2 closure: itemized, never hidden) ──────────────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/* ─ MK-XS-F-146 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * prettyExpiry
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     `${MONTHS[m − 1]} ${d} ${y}`   if y and m and d
 *     'unknown expiry'   otherwise
 *
 * Called by ... MK-XS-F-106 mapOptionHolding
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-102 ingestSync · MK-XS-F-106 mapOptionHolding
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-034 option positions — contracts, strike, expiry, put or call
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-146
 * Changed ..... not in git yet (—)
 */
const prettyExpiry = (iso: string | null | undefined) => {
  const [y, m, d] = String(iso ?? '').split('-').map(Number);
  return y && m && d ? `${MONTHS[m - 1]} ${d} ${y}` : 'unknown expiry';
};
export interface MappedOption { label: string; contracts: number; value: number; costBasis: number | null; multiplier: number }
/* ─ MK-XS-F-106 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * mapOptionHolding
 *
 * Answers ..... What is this option position worth, and what do we call it?
 *
 * Formula .....
 *     os = symbol.option symbol
 *     contracts = units (or 0 when missing)
 *     nothing   when os is missing (or contracts = 0 when missing or zero)
 *     multiplier = multiplier given (or 10   if os.is mini option = true
 *     100   otherwise when missing)
 *     under = (os.underlying symbol.raw symbol or os.underlying symbol.symbol or os.ticker or '?').to upper case()
 *     kind word = 'put'   if os.option type = 'PUT'
 *     'call'   otherwise
 *     strike = `$${os.strike price}`   if os.strike price ≠ nothing
 *     ''   otherwise
 *
 * Called by ... MK-XS-F-102 ingestSync
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-102 ingestSync
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-034 option positions — contracts, strike, expiry, put or call
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *
 * Decides .....
 *     · If units is missing it uses 0.
 *     · If price is missing it uses 0.
 *     · Rounds the answer to two decimals (cents).
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-106
 * Changed ..... 2026-07-18 (99d220a)
 */
export function mapOptionHolding(o: StOptionHolding, multiplierGiven?: number): MappedOption | null {
  const os = o.symbol?.option_symbol;
  const contracts = o.units ?? 0;
  if (!os || contracts === 0) return null;
  // SHARES PER CONTRACT, AS THE BROKER STATES IT (his approval, 2026-10-12, DEC-4646; MK-XS-I-063, DEC-0274: "100
  // unless the broker or the person states otherwise"). SnapTrade marks a mini option, which is 10 shares a contract;
  // every other option is 100. It was always 100, so a mini option read ten times its value.
  const multiplier = multiplierGiven ?? (os.is_mini_option === true ? 10 : 100);
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
    // carried onto the stored option row, so whatever reads it later uses the broker's figure, never a guessed 100
    multiplier,
  };
}

// ── activities → our ledger types (design v2 §4 table) ─────────────────────────────────────────
// ⚠️ INDICTED EXHIBIT — no production code imports this any more (Track 1 step 3, 2026-08-20).
// ingest.ts classifies through the Calculation Module (toLedgerRow → classifyEvent); this function
// remains ONLY as the proven cause in probes/vanguard-identity-diagnostic.probe.test.ts — its
// default branch guesses an unknown word from the sign of the amount, which minted $1,064,493.33
// of phantom contributions on the founder's real account. The no-stale-code guard fails any new
// call site by name.
export interface MappedActivity {
  txnType: TxnType | 'ADJUST' | 'SKIP';   // ADJUST = position note, NO cash effect; SKIP = not ingested
  reinvested?: boolean;
  note?: string;
  cashSign?: 1 | -1;                      // for option cash-effect rows mapped to DEPOSIT/WITHDRAWAL
}
/* ─ MK-XS-F-107 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * mapActivityType
 *
 * Answers ..... A line arrived from the broker. Is this money you paid IN, money you took OUT, or something that happened inside the account?
 *
 * Formula .....
 *     t = (type ?? '').to upper case()
 *     is option = !!option symbol (or !!option type when missing or zero)
 *     the answer:
 *     txn type = t as 'BUY' | 'SELL'
 *     note = 'option purchase'   if t = 'BUY'
 *     'option sale'   otherwise
 *     txn type = 'FEE'
 *     note = `broker: ${type}`   when includes('FEE')
 *     txn type = 'DEPOSIT'
 *     note = `broker: ${type ?? 'unknown'}`   when (amount ?? 0) > 0
 *     txn type = 'WITHDRAWAL'
 *     note = `broker: ${type ?? 'unknown'}`   when (amount ?? 0) < 0
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-013 bond maturity date
 *
 * Decides .....
 *     · If amount is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-107
 * Changed ..... 2026-07-18 (8fab2d2)
 */
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
// The identity itself lives in the Calculation Module (importKey — Track 1 step 2); this road
// only maps its fields in. The output is BYTE-IDENTICAL to the pre-function format, so every
// seenKeys registry already persisted on a device stays valid.
/* ─ MK-XS-F-108 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * activityKey
 *
 * Answers ..... ── duplicate-proofing ───────────────────────────────────────────────────────────────────────── SnapTrade activity ids can change when they reprocess history, so identity = the composite of everything that makes the row THAT row.
 *
 * Formula .....
 *     the answer = import key(account, trade date or settlement date, type, amount, units, security, reference, description)
 *
 * Called by ... MK-XS-F-102 ingestSync · MK-XS-F-109 dedupeActivities
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-109 dedupeActivities · MK-XS-F-102 ingestSync
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-010 transaction words (the institution's own wording)
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-108
 * Changed ..... 2026-08-20 (157df51)
 */
export function activityKey(accountId: string, a: StActivity): string {
  return importKey({
    account: accountId,
    date: a.trade_date ?? a.settlement_date,
    word: a.type,
    amount: a.amount,
    units: a.units,
    security: a.symbol?.id ?? a.symbol?.raw_symbol,
    ref: a.external_reference_id,
    description: a.description,   // audit fix: separates two otherwise-identical same-day fills
  });
}
/* ─ MK-XS-F-109 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * dedupeActivities
 *
 * Answers ..... Which of these activities are new since the last sync?
 *
 * Formula .....
 *     fresh = []
 *     k = activity key(account id, a)
 *     the answer = fresh
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-109
 * Changed ..... 2026-07-18 (99d220a)
 */
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
/* ─ MK-XS-F-110 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * netCashSleeve
 *
 * Answers ..... ── the cash sleeve, deduped ─────────────────────────────────────────────────────────────────── SnapTrade counts money-market (cash_equivalent) positions INSIDE balances.cash too.
 *
 * Formula .....
 *     net = round((balances cash ?? 0) − mmf, 2 dp)
 *     the answer:
 *     0   if net < 0 and net > -1
 *     net   otherwise
 *
 * Called by ... MK-XS-F-102 ingestSync
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-102 ingestSync
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *
 * Decides .....
 *     · If price is missing it uses 0.
 *     · If balances cash is missing it uses 0.
 *     · Rounds the answer to two decimals (cents).
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-110
 * Changed ..... 2026-08-07 (0482964)
 */
export function netCashSleeve(balancesCash: number | null | undefined, positions: MappedPosition[]): number {
  const mmf = positions.filter((p) => p.cashEquivalent)
    .reduce((t, p) => t + (p.price ?? 0) * p.shares, 0);
  const net = Math.round(((balancesCash ?? 0) - mmf) * 100) / 100;
  // a real margin debit stays NEGATIVE (audit fix — flooring it overstated the account);
  // only sub-dollar rounding dust clamps to zero
  return net < 0 && net > -1 ? 0 : net;
}


/** FOUNDER RULE 2026-08-04: record how far back the broker's OWN activity feed reaches, so a
 *  "past year" income figure can label itself honestly. Keeps the earliest date ever seen — a
 *  later sync returning a shallower page must never shorten the recorded depth. */
/* ─ MK-XS-F-111 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * mergeHistoryFrom
 *
 * Answers ..... FOUNDER RULE 2026-08-04: record how far back the broker's OWN activity feed reaches, so a "past year" income figure can label itself honestly.
 *
 * Formula .....
 *     earliest now = the first of dates
 *     existing   when earliest now is missing
 *     earliest now   when existing is missing
 *     the answer:
 *     earliest now   if earliest now < existing
 *     existing   otherwise
 *
 * Called by ... MK-XS-F-102 ingestSync
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-102 ingestSync
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-111
 * Changed ..... 2026-08-07 (0482964)
 */
export function mergeHistoryFrom(existing: string | undefined, activityDates: (string | null | undefined)[]): string | undefined {
  const dates = activityDates
    .map((d) => (d ? String(d).slice(0, 10) : ''))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
  const earliestNow = dates[0];
  if (!earliestNow) return existing;
  if (!existing) return earliestNow;
  return earliestNow < existing ? earliestNow : existing;
}
