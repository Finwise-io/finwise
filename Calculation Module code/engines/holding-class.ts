// ENGINE — what asset class is this holding? (B7, founder brief 2026-08-20)
//
// THE DEFECT THIS REPLACES. A Vanguard position clearly LABELLED money market was still counted as
// cash — the broker-tag path overrode the name. And the logic lived in four places (the SnapTrade
// mapper, the file importer, the reclassify migration, the assets domain), so each road could
// disagree with the next.
//
// THE RULE (the founder's, verbatim in the brief): name-first classification on EVERY road, broker
// tag as fallback only. Classify as a fund only on evidence — the cash-equivalent flag, the ticker
// list, a name match, or the person's own answer, which outranks all of them and must survive the
// next sync. An unlabelled broker balance is cash. When a holding changes class between syncs, keep
// the previous class and FLAG it rather than moving the money quietly. (A false negative is cheap —
// the money stays in net worth and its income still lands; a false positive silently moves money
// out of the emergency-reserve figure.)
//
// The class vocabulary is the founder's five buckets, minus physical assets which never pass
// through here: cash · stocks_etf (Stocks / Funds) · bonds (Bonds & CDs) · alternatives.

export type HoldingClass = 'cash' | 'stocks_etf' | 'bonds' | 'alternatives';

// ── the name evidence, in ONE place ────────────────────────────────────────────────────────────
// (consolidated 2026-08-20 from src/domain/assets AND src/domain/import — each road had its own
// partial copy of this list, which is how the same fund could class differently by door)
const SWEEP_RE = /\b(sweep|settlement)\b/i;
const MONEY_MARKET_RE = /\b(money[\s-]?market|mmkt|mmf)\b/i;
// A broker that sends only a ticker (VMFXX, SPAXX…) never shows the words "money market" — the
// founder's own gap #2. The widely-held sweep/money-market funds at the big brokers:
export const MONEY_MARKET_TICKERS = new Set([
  'VMFXX', 'VMRXX', 'VUSXX', 'VMSXX',                    // Vanguard
  'SPAXX', 'FDRXX', 'FZFXX', 'FZDXX', 'SPRXX',           // Fidelity
  'SWVXX', 'SNVXX', 'SNSXX', 'SWGXX',                    // Schwab
  'TTTXX', 'MVRXX', 'GOFXX', 'FGXXX',                    // Merrill / BlackRock / Goldman
]);
export const TBILL_ETF_TICKERS = new Set(['SGOV', 'BIL']);
// Crypto trusts/ETFs and spot-commodity funds → alternatives, not equities (PRD F1 #19).
// COIN (Coinbase) is deliberately absent — that's a stock.
const CRYPTO_TICKERS = new Set(['BTC', 'ETH', 'GBTC', 'ETHE', 'IBIT', 'FBTC', 'BITO', 'ARKB', 'HODL']);
const COMMODITY_TICKERS = new Set(['GLD', 'SLV', 'IAU', 'SGOL', 'GLDM', 'PPLT', 'PALL', 'USO', 'UNG', 'DBC', 'PDBC']);
// A commodity word inside a COMPANY name (Barrick Gold Corp) is a mining stock, not a commodity.
const COMPANY_WORDS = /\b(corp|corporation|inc|ltd|plc|mining|miners?|resources|company)\b/i;
// OCC-style option symbols — how brokerages export options (PRD G2): ROOT+YYMMDD+C/P+strike×1000,
// e.g. 'AAPL250117C00220000', or date-style 'AAPL 01/17/2026 220 C'.
const OCC_OPTION = /^[A-Z.]{1,6}\d{6}[CP]\d{5,8}$/;
const DATE_STYLE_OPTION = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\s+[\d.]+\s*[CP]\b/i;
const CD_TBILL_RE = /\b(cd|certificate of deposit|t-?bills?|treasury bills?)\b/i;
const FIXED_INCOME_RE = /\b(bond|note|treasury|treas|t-note|muni|debenture|cpn|zero cpn)\b/i;   // TREAS/CPN: Fidelity positions export, seen 2026-08-20
// a coupon-with-maturity shape ("1.625% … DUE 2026") is a bond however the broker tagged it
const COUPON_MATURITY_RE = /\d(\.\d+)?%.*\b(DUE|20\d\d)\b/i;

/** What the NAME (symbol + description together) says, or null when it says nothing.
 *  Ordered specific-before-general, same discipline as the event table. */
export function nameEvidence(label?: string | null): HoldingClass | null {
  const t = String(label ?? '').trim();
  if (!t) return null;
  const words = t.split(/[\s·—-]+/).map((w) => w.toUpperCase());
  if (SWEEP_RE.test(t)) return 'cash';                   // uninvested brokerage cash IS cash
  if (MONEY_MARKET_RE.test(t) || words.some((w) => MONEY_MARKET_TICKERS.has(w))) return 'stocks_etf';
  if (words.some((w) => TBILL_ETF_TICKERS.has(w))) return 'bonds';
  // options before anything — a PUT on a treasury ETF is an option, not a bond
  if (OCC_OPTION.test(t.replace(/\s+/g, '').toUpperCase())) return 'alternatives';
  if (DATE_STYLE_OPTION.test(t) || /\b(put|call)s?\b/i.test(t)) return 'alternatives';
  if (words.some((w) => CRYPTO_TICKERS.has(w)) || /\b(bitcoin|ethereum|crypto(currenc(y|ies))?)\b/i.test(t)) return 'alternatives';
  if (words.some((w) => COMMODITY_TICKERS.has(w))) return 'alternatives';
  if (/\b(gold|silver|platinum|palladium|commodit(y|ies))\b/i.test(t) && !COMPANY_WORDS.test(t)) return 'alternatives';
  // "CURRENCYSHARES" is one word in the broker's shortening, so \bcurrency\b missed it — the
  // cross-path probe documented that gap; the word and the two seen tickers (FXE, FXY) close it.
  if (/\b(currency|currencies|currencyshares|forex)\b/i.test(t) || words.some((w) => w === 'FXE' || w === 'FXY')) return 'alternatives';
  if (CD_TBILL_RE.test(t) || FIXED_INCOME_RE.test(t) || COUPON_MATURITY_RE.test(t)
    || /CERTIFICATE OF DEP|T[- ]BILL/i.test(t)) return 'bonds';
  return null;
}

export interface ClassEvidence {
  /** The security's readable name/description, as the institution wrote it. */
  name?: string | null;
  /** The display ticker, if any. */
  ticker?: string | null;
  /** The broker's own type tag ('cs', 'et', 'oef', 'bnd', 'crypto', 'cd', …) — FALLBACK ONLY. */
  brokerTag?: string | null;
  /** The broker's cash-equivalent flag — evidence of a money-market FUND, not of cash. */
  cashEquivalent?: boolean;
  /** Any maturity date — a maturity-dated instrument is a bond (founder rule 2026-08-04). */
  maturityDate?: string | null;
  /** True when this row is a priced security with units — not a bare balance. */
  hasSecurityIdentity?: boolean;
  /** The person's own answer. Outranks everything and survives every sync. */
  userAnswer?: HoldingClass | null;
  /** The class this holding carried after the LAST sync, for the quiet-move guard. */
  previousClass?: HoldingClass | null;
}

export interface ClassVerdict {
  cls: HoldingClass;
  source: 'user' | 'name' | 'flag' | 'maturity' | 'broker-tag' | 'security-default' | 'unlabelled';
  /** Set when the evidence wanted to move the money but the previous class was kept instead. */
  flagged?: { was: HoldingClass; evidenceSays: HoldingClass };
  why: string;
}

const TAG_CLASS: Record<string, HoldingClass> = {
  bnd: 'bonds', cd: 'bonds',
  crypto: 'alternatives',
  cs: 'stocks_etf', et: 'stocks_etf', oef: 'stocks_etf', cef: 'stocks_etf', adr: 'stocks_etf',
};

export function classifyHoldingClass(e: ClassEvidence): ClassVerdict {
  // 1 · the person's own answer wins, always, and never raises a flag
  if (e.userAnswer) return { cls: e.userAnswer, source: 'user', why: 'your own answer — it outranks every automatic rule and survives every sync' };

  // 2 · evidence, name first
  const evident = ((): Omit<ClassVerdict, 'flagged'> => {
    const byName = nameEvidence(`${e.ticker ?? ''} ${e.name ?? ''}`);
    if (byName) return { cls: byName, source: 'name', why: 'the institution\'s own words for it' };
    if (e.maturityDate && String(e.maturityDate).trim()) return { cls: 'bonds', source: 'maturity', why: 'it carries a maturity date' };
    if (e.cashEquivalent) return { cls: 'stocks_etf', source: 'flag', why: 'the broker\'s cash-equivalent flag — a money-market fund, measured where its income lands' };
    const tag = TAG_CLASS[String(e.brokerTag ?? '').toLowerCase()];
    if (tag) return { cls: tag, source: 'broker-tag', why: 'the broker\'s type tag — fallback only, a name would have outranked it' };
    // 3 · no evidence at all
    if (e.hasSecurityIdentity) return { cls: 'stocks_etf', source: 'security-default', why: 'a priced security with units is an investment; with no other evidence it sits in Stocks / Funds' };
    return { cls: 'cash', source: 'unlabelled', why: 'an unlabelled broker balance is cash' };
  })();

  // 4 · the quiet-move guard: evidence may not move money between classes across a sync
  if (e.previousClass && e.previousClass !== evident.cls) {
    return {
      cls: e.previousClass, source: evident.source,
      flagged: { was: e.previousClass, evidenceSays: evident.cls },
      why: `kept as ${e.previousClass}: the new sync's evidence says ${evident.cls}, and money never moves class quietly — this is flagged for you to confirm`,
    };
  }
  return evident;
}
