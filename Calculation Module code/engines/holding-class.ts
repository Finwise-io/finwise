// ENGINE — what asset class is this holding? (B7, founder brief 2026-08-20; the order changed by his ruling of
// 2026-10-20, below)
//
// THE ORDER, AS HE RULED IT ON 2026-10-20: "always the class broker sends." It settles DEC-2159 (2026-09-30, his
// "Q10: Draft order is correct" — the institution's own class field first) against brief B7 (2026-08-20, "name
// first, broker tag as fallback only"); the newer ruling wins. So, for a linked or imported holding:
//   1. the person's own answer — it outranks everything and survives every sync (B7, DEC-2161: kept);
//   2. THE CLASS THE BROKER SENDS — its cash-equivalent flag (the broker saying "this is cash"), else its own type
//      (brokerClassOf, below — no identifier yet: SnapTrade's security type code, or an import file's type column);
//   3. only when the broker sends no usable class: the name, a maturity date, the class stored when it arrived,
//      and last the defaults (B7's ladder, unchanged).
// Consequences he was shown in the worked example: a money-market fund the broker flags is Cash (it was Stocks /
// Funds by DEC-0051, DEC-0092); a bond ETF and a T-bill ETF the broker sends as an ETF are Stocks / Funds (they were
// Bonds & CDs by their names and DEC-0051's T-bill rule). An individual bond or CD the broker sends as a bond stays
// Bonds & CDs.
//
// THIS IS THE ONE PLACE THE ORDER LIVES. The sync (MK-XS-F-102 ingestSync, MK-XS-F-105 mapPosition), the file
// importer (MK-XS-F-172 assetClassForSymbol) and every reader of a saved holding (MK-NW-F-109 holdingClassOf — the
// account split, the class rows, the emergency fund, Performance's categories, the account page) all ask it.
//
// THE DEFECT B7 REPLACED, kept for the record: a Vanguard position LABELLED money market was counted as cash
// because the broker-tag path overrode the name, and the logic lived in four places that could disagree. The four
// places are still one; the order inside it is his newer ruling. When the automatic rules (step 3) would move a
// holding between syncs, the previous class is kept and FLAGGED rather than moving the money quietly; the broker's
// own class is not held back that way — "always", in his word.
//
// The class vocabulary is the founder's five buckets, minus physical assets which never pass
// through here: cash · stocks_etf (Stocks / Funds) · bonds (Bonds & CDs) · alternatives.

import { maturityParts } from '../../src/domain/_shared/dates';   // the one reading of a maturity date (MK-NW-F-124, 2026-10-13)

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
// A COUPON BESIDE A BOND WORD IS A BOND, WHOEVER ISSUED IT (outside re-run, 2026-10-13): "Apple Corp 4.5% Bond" —
// the percent says the word Bond is the instrument, so the company word does not switch it off.
const COUPON_BOND_RE = /\d(\.\d+)?\s*%\s*(bonds?|notes?|debentures?|cpn)\b|\b(bonds?|notes?|debentures?)\s+\d(\.\d+)?\s*%/i;
// A BOND WORD THAT STARTS A COMPANY'S NAME IS THE NAME (DEC-2747d, re-run 2026-10-13): a bond word followed
// straight away by a business word — "Treasury Wine Estates", "Bond Brands Group" — names a company, with or
// without Ltd after it. A real Treasury is followed by a type, a term or a year ("Treasury Bond 10Y",
// "Treasury 2031", "TREAS NOTE"), never by one of these words.
const BOND_WORD_COMPANY_RE = /\b(treasury|treas|bond|note|muni)\s+(wines?|estates?|group|holdings?|brands?|partners|properties|industries|hotels?|foods?|energy|technologies|systems|pharmaceuticals?|enterprises?)\b/i;

/** What the NAME (symbol + description together) says, or null when it says nothing.
 *  Ordered specific-before-general, same discipline as the event table. */
/* ─ MK-ST-F-010 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * nameEvidence
 *
 * Answers ..... What the NAME (symbol + description together) says, or null when it says nothing.
 *
 * Formula .....
 *     t = string(label ?? '').trim()
 *     nothing   when t is missing
 *     words = for each of split( ÷ [\s·—-]+ ÷ ): to upper case()
 *     'stocks_etf'   when MONEY_MARKET_RE.test(t) (or words.some((w) => MONEY_MARKET_TICKERS.has(w)) when missing or zero)
 *     'cash'   when SWEEP_RE.test(t)
 *     'bonds'   when words.some((w) => TBILL_ETF_TICKERS.has(w))
 *     'alternatives'   when OCC_OPTION.test(replace( ÷ \s+ ÷ g, '').to upper case())
 *     option shape = ÷ \d{4}-\d{2}-\d{2}|\d{1,2}\ ÷ \d{1,2}(\ ÷ \d{2,4})?|\$\s?\d|\b\d+(\.\d+)?\s × (c|p|call|put)s?\b ÷ test(t)
 *     a fund = ÷ \b(etf|fund|trust|covered call)\b ÷ test(t)
 *     'alternatives'   when DATE_STYLE_OPTION.test(t) (or ÷ \b(put|call)s?\b ÷ test(t) and option shape and !a fund when missing or zero)
 *     'stocks_etf'   when ÷ \b(put|call)s?\b ÷ test(t) and a fund
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-008 incomeBearingClassOf · MK-ST-F-011 classifyHoldingClass
 *
 * Reaches ..... 305 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-140 LEFT_OUT · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               … and 287 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-013 bond maturity date
 *               MK-XS-I-070 the class a broker sends for a holding — its security type and its cash-equivalent flag
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-010
 * Changed ..... 2026-08-20 (026b132)
 */
export function nameEvidence(label?: string | null): HoldingClass | null {
  const t = String(label ?? '').trim();
  if (!t) return null;
  const words = t.split(/[\s·—-]+/).map((w) => w.toUpperCase());
  // A MONEY-MARKET FUND IS A FUND WHEREVER IT SITS (owner, DEC-0051): "Vanguard Federal Money Market
  // Fund (settlement fund)" is the fund; "settlement" says what it is used for. Read before the sweep
  // words, which used to win (outside review, 2026-10-07).
  if (MONEY_MARKET_RE.test(t) || words.some((w) => MONEY_MARKET_TICKERS.has(w))) return 'stocks_etf';
  if (SWEEP_RE.test(t)) return 'cash';                   // uninvested brokerage cash IS cash
  if (words.some((w) => TBILL_ETF_TICKERS.has(w))) return 'bonds';
  // options before anything — a PUT on a treasury ETF is an option, not a bond
  if (OCC_OPTION.test(t.replace(/\s+/g, '').toUpperCase())) return 'alternatives';
  // THE WORD PUT OR CALL IS AN OPTION ONLY WITH AN OPTION'S SHAPE — an expiry date or a strike — and never
  // in a fund's name (outside review, 2026-10-07): 'GLOBAL X NASDAQ 100 COVERED CALL ETF' is an equity
  // fund that writes calls, and it was being filed under Alternatives.
  const optionShape = /\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(\/\d{2,4})?|\$\s?\d|\b\d+(\.\d+)?\s*(c|p|call|put)s?\b/i.test(t);
  const aFund = /\b(etf|fund|trust|covered call)\b/i.test(t);
  if (DATE_STYLE_OPTION.test(t) || (/\b(put|call)s?\b/i.test(t) && optionShape && !aFund)) return 'alternatives';
  if (/\b(put|call)s?\b/i.test(t) && aFund) return 'stocks_etf';   // a fund that writes options is a fund
  // A DWELLING IS NOT A SECURITY (same review): 'Silver Lake house', 'Bond Street flat' — the metal and
  // bond words are a place's name. A name that says house, flat, condo and the like is no evidence.
  if (/\b(house|home|flat|condo|apartment|cabin|cottage|townhouse|villa|residence)\b/i.test(t)) return null;
  if (words.some((w) => CRYPTO_TICKERS.has(w)) || /\b(bitcoin|ethereum|crypto(currenc(y|ies))?)\b/i.test(t)) return 'alternatives';
  if (words.some((w) => COMMODITY_TICKERS.has(w))) return 'alternatives';
  if (/\b(gold|silver|platinum|palladium|commodit(y|ies))\b/i.test(t) && !COMPANY_WORDS.test(t)) return 'alternatives';
  // "CURRENCYSHARES" is one word in the broker's shortening, so \bcurrency\b missed it — the
  // cross-path probe documented that gap; the word and the two seen tickers (FXE, FXY) close it.
  if (/\b(currency|currencies|currencyshares|forex)\b/i.test(t) || words.some((w) => w === 'FXE' || w === 'FXY')) return 'alternatives';
  // a bond word inside a COMPANY name (Treasury Wine Estates Ltd) is a share, not a bond — the same
  // company test the commodity words use, plus a bond word followed by a business word (Treasury Wine
  // Estates, no Ltd). A coupon with a year, or a coupon beside a bond word, is a bond whatever the name.
  // UST is the market's short name for a US Treasury ("UST 2031").
  const aCompany = COMPANY_WORDS.test(t) || BOND_WORD_COMPANY_RE.test(t);
  if (CD_TBILL_RE.test(t) || ((FIXED_INCOME_RE.test(t) || words.includes('UST')) && !aCompany) || COUPON_MATURITY_RE.test(t)
    || COUPON_BOND_RE.test(t) || /CERTIFICATE OF DEP|T[- ]BILL/i.test(t)) return 'bonds';
  return null;
}

export interface ClassEvidence {
  /** The security's readable name/description, as the institution wrote it. */
  name?: string | null;
  /** The display ticker, if any. */
  ticker?: string | null;
  /** The broker's own type, exactly as sent — SnapTrade's code ('cs', 'et', 'oef', 'mf', 'bnd', 'crypto', …) or the
   *  words in an import file's type column ('Fixed Income', 'ETFs & Closed End Funds'). It DECIDES when it names one
   *  of our classes (his ruling, 2026-10-20: "always the class broker sends"); otherwise it says nothing. */
  brokerTag?: string | null;
  /** The broker's cash-equivalent flag — the broker saying "this is cash". It decides: Cash (his ruling, 2026-10-20). */
  cashEquivalent?: boolean;
  /** Any maturity date — a maturity-dated instrument is a bond (founder rule 2026-08-04). */
  maturityDate?: string | null;
  /** The class a saved holding was stored under when it arrived, or the kind the person picked when adding it by
   *  hand — read after the name and a maturity date, before the defaults (MK-NW-F-109 holdingClassOf passes it). */
  storedClass?: HoldingClass | null;
  /** True when this row is a priced security with units — not a bare balance. */
  hasSecurityIdentity?: boolean;
  /** The person's own answer. Outranks everything and survives every sync. */
  userAnswer?: HoldingClass | null;
  /** The class this holding carried after the LAST sync, for the quiet-move guard. */
  previousClass?: HoldingClass | null;
}

export interface ClassVerdict {
  cls: HoldingClass;
  source: 'user' | 'broker' | 'name' | 'maturity' | 'stored' | 'security-default' | 'unlabelled';
  /** Set when the evidence wanted to move the money but the previous class was kept instead. */
  flagged?: { was: HoldingClass; evidenceSays: HoldingClass };
  why: string;
}

// ── THE CLASS THE BROKER SENDS (his ruling, 2026-10-20: "always the class broker sends") ───────────────────────────
// SnapTrade's security type codes — the 14 its positions reference documents (docs.snaptrade.com, read 2026-08-04;
// docs/FCC-core-55-70/institution-data-research-v2-official-specs-2026-08-04.md §1.3) — plus 'mf' (the Vanguard
// fixture's mutual fund) and 'adr' / 'cd' (kept from the old tag table). A code that names none of our classes is
// NOT listed and falls through to the name and the other rules: 'ut' Unit (a unit trust or a SPAC unit), 'struct'
// Structured Product (a note or an equity-linked product), 'wi' When Issued (a stock or a bond not yet issued).
// SnapTrade sends no "cash", "money market" or "CD" code; its cash-equivalent flag is how it says cash.
export const BROKER_TYPE_CLASS: Readonly<Record<string, HoldingClass>> = {
  cs: 'stocks_etf',      // Common Stock
  ps: 'stocks_etf',      // Preferred Stock
  ad: 'stocks_etf',      // ADR
  adr: 'stocks_etf',     // ADR (older spelling)
  et: 'stocks_etf',      // ETF — a bond ETF or a T-bill ETF too: the broker sends ETF
  oef: 'stocks_etf',     // Open Ended Fund — a money-market fund the broker does NOT flag arrives this way
  cef: 'stocks_etf',     // Closed End Fund
  mf: 'stocks_etf',      // mutual fund
  bnd: 'bonds',          // Bond
  cd: 'bonds',           // CD
  crypto: 'alternatives',
  pm: 'alternatives',    // Precious Metals
  wt: 'alternatives',    // Warrant — a right to buy at a set price, filed where options are
  rt: 'alternatives',    // Right — the same
};
// The words a holdings FILE writes in its own type column (Schwab's "Security Type": Equity · ETFs & Closed End Funds
// · Mutual Funds · Fixed Income · Cash and Money Market · Option), read in this order: cash words first (a broker that
// files a fund under "Cash and Money Market" is saying cash, as the flag does), then the options-like words, then the
// fund and share words, then the bond words — so "ETFs & Closed End Funds" is a fund and "Fixed Income" a bond.
const FILE_TYPE_WORDS: [RegExp, HoldingClass][] = [
  [/\b(cash|money[\s-]?markets?|sweep)\b/i, 'cash'],
  [/\b(options?|crypto(currenc(y|ies))?|precious metals?|commodit(y|ies)|warrants?|rights?|futures?)\b/i, 'alternatives'],
  [/\b(equit(y|ies)|stocks?|shares?|etfs?|funds?|adrs?|closed[\s-]end)\b/i, 'stocks_etf'],
  [/\b(fixed[\s-]income|bonds?|cds?|certificates? of deposit|treasur(y|ies)|t-?bills?|munis?|municipals?)\b/i, 'bonds'],
];

/** What the BROKER says a holding is — its cash-equivalent flag, else its own type — or null when it sends no
 *  usable class. ONE reading, for the sync, the importer and every saved holding (his ruling, 2026-10-20).
 *  Cash when the flag is true; else the class its type code names (BROKER_TYPE_CLASS); else the class the words of
 *  a file's type column name (FILE_TYPE_WORDS, first match); else nothing. (No identifier yet — the build issues it.) */
/* ─ MK-ST-F-086 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * brokerClassOf
 *
 * Answers ..... What the BROKER says a holding is — its cash-equivalent flag, else its own type — or null when it sends no usable class.
 *
 * Formula .....
 *     cls = 'cash'
 *     why = 'the broker marks it cash − equivalent'   when cash equivalent = true
 *     t = string(type ?? '').trim()
 *     nothing   when t is missing
 *     by code = BROKER_TYPE_CLASS[to lower case()]
 *     cls = by code
 *     why = `the broker sends its type as ${t}`   when by code
 *     by words = FILE_TYPE_WORDS.find(([re]) => re.test(t))
 *     the answer:
 *     cls = by words[1]
 *     why = `the broker's file gives its type as ${t}`   if by words
 *     nothing   otherwise
 *
 * Called by ... MK-PF-F-013 benchmarkTicker · MK-ST-F-011 classifyHoldingClass
 *
 * Reaches ..... 132 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-076 ALT
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-079 EF · MK-NW-F-080 HOLD
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-140 LEFT_OUT · MK-NW-F-082 NW
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-027 accountClassBreakdown
 *               MK-NW-F-025 accountDisplayName · MK-NW-F-026 accountDisplayNames
 *               … and 114 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-070 the class a broker sends for a holding — its security type and its cash-equivalent flag
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-086
 * Changed ..... not in git yet (—)
 */
export function brokerClassOf(type?: string | null, cashEquivalent?: boolean | null): { cls: HoldingClass; why: string } | null {
  if (cashEquivalent === true) return { cls: 'cash', why: 'the broker marks it cash-equivalent' };
  const t = String(type ?? '').trim();
  if (!t) return null;
  const byCode = BROKER_TYPE_CLASS[t.toLowerCase()];
  if (byCode) return { cls: byCode, why: `the broker sends its type as ${t}` };
  const byWords = FILE_TYPE_WORDS.find(([re]) => re.test(t));
  return byWords ? { cls: byWords[1], why: `the broker's file gives its type as ${t}` } : null;
}

/* ─ MK-ST-F-011 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * classifyHoldingClass
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     cls = user answer
 *     source = 'user'
 *     why = 'your own answer — it outranks every automatic rule and survives every sync'   when user answer
 *     broker = broker class of(broker tag, cash equivalent)
 *     cls = broker.cls
 *     source = 'broker'
 *     why = broker.why   when broker
 *     by name = name evidence(`${ticker ?? ''} ${name ?? ''}`)
 *     cls = by name
 *     source = 'name'
 *     why = 'the institution\'s own words for it'   when by name
 *     cls = 'bonds'
 *     source = 'maturity'
 *     why = 'it carries a maturity date'   when maturity parts(maturity date)
 *     cls = stored class
 *     source = 'stored'
 *     why = 'the class it was given when it was added'   when stored class
 *     cls = 'stocks_etf'
 *     source = 'security − default'
 *     why = 'a priced security with units is an investment; with no other evidence it sits in stocks ÷ Funds'   when has security identity
 *     the answer:
 *     cls = 'cash'
 *     source = 'unlabelled'
 *     why = 'an unlabelled broker balance is cash'
 *
 * Called by ... MK-NW-F-026 accountDisplayNames · MK-NW-F-109 holdingClassOf
 *               MK-XS-F-102 ingestSync · MK-XS-F-105 mapPosition
 *               MK-XS-F-172 assetClassForSymbol
 *
 * Reaches ..... 131 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-076 ALT
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-079 EF · MK-NW-F-080 HOLD
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-140 LEFT_OUT · MK-NW-F-082 NW
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-027 accountClassBreakdown
 *               MK-NW-F-025 accountDisplayName · MK-NW-F-026 accountDisplayNames
 *               … and 113 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-003 institution name
 *               MK-XS-I-013 bond maturity date
 *               MK-XS-I-070 the class a broker sends for a holding — its security type and its cash-equivalent flag
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-011
 * Changed ..... 2026-08-20 (026b132)
 */
export function classifyHoldingClass(e: ClassEvidence): ClassVerdict {
  // 1 · the person's own answer wins, always, and never raises a flag (brief B7; DEC-2161 — a sync keeps what they entered)
  if (e.userAnswer) return { cls: e.userAnswer, source: 'user', why: 'your own answer — it outranks every automatic rule and survives every sync' };

  // 2 · THE CLASS THE BROKER SENDS decides (his ruling, 2026-10-20: "always the class broker sends" — it settles
  //     DEC-2159 against brief B7, whose name-first order it replaces). Its cash-equivalent flag is the broker saying
  //     "this is cash"; otherwise its own type. Not held back by the quiet-move guard below: the broker's word, always.
  const broker = brokerClassOf(e.brokerTag, e.cashEquivalent);
  if (broker) return { cls: broker.cls, source: 'broker', why: broker.why };

  // 3 · only when the broker sends no usable class: the evidence, name first (brief B7's ladder, unchanged)
  const evident = ((): Omit<ClassVerdict, 'flagged'> => {
    const byName = nameEvidence(`${e.ticker ?? ''} ${e.name ?? ''}`);
    if (byName) return { cls: byName, source: 'name', why: 'the institution\'s own words for it' };
    // a maturity date counts only when it reads as a date — the one reading every maturity reader asks (MK-NW-F-124, 2026-10-13)
    if (maturityParts(e.maturityDate)) return { cls: 'bonds', source: 'maturity', why: 'it carries a maturity date' };
    // a saved holding's class as it arrived, or the kind the person picked when adding it by hand
    if (e.storedClass) return { cls: e.storedClass, source: 'stored', why: 'the class it was given when it was added' };
    // 4 · no evidence at all
    if (e.hasSecurityIdentity) return { cls: 'stocks_etf', source: 'security-default', why: 'a priced security with units is an investment; with no other evidence it sits in Stocks / Funds' };
    return { cls: 'cash', source: 'unlabelled', why: 'an unlabelled broker balance is cash' };
  })();

  // 5 · the quiet-move guard: the automatic rules may not move money between classes across a sync
  if (e.previousClass && e.previousClass !== evident.cls) {
    return {
      cls: e.previousClass, source: evident.source,
      flagged: { was: e.previousClass, evidenceSays: evident.cls },
      why: `kept as ${e.previousClass}: the new sync's evidence says ${evident.cls}, and money never moves class quietly — this is flagged for you to confirm`,
    };
  }
  return evident;
}
