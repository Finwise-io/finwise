// ENGINE — what kind of event is this broker line?
//
// THE DEFECT THIS REPLACES. When the app met a word it did not recognise, it guessed from the sign
// of the amount: money in must be a deposit. On a real Vanguard activity FILE that produced
// $1,064,493 of contributions and $424,818 of withdrawals on an account where nothing came in or
// went out — the same ~$220k of Treasury bills, rolled three times, counted as new money on every
// roll, because 'Sweep out', 'Sweep in' and 'Corp Action (Redemption)' were not in the table.
//
// THE RULE THAT ENDS THAT CLASS OF BUG: an unrecognised word becomes UNKNOWN. It is recorded, it is
// shown to the person, and it counts in NO total. Money we cannot classify is never money you paid
// in. Everything else here follows from naming the events properly.
//
// The vocabulary is FDX's, because that is the standard US institutions are converging on under the
// CFPB's open-banking rule — DIVIDEND_REINVESTED, RETURN_OF_CAPITAL and the journal events all exist
// there as first-class values. Every mapping below is either a word we have SEEN or one taken from a
// published spec; nothing is imagined.
//
// WHERE EACH WORD WAS SEEN MATTERS, and the founder was right to draw the line (2026-08-18): a
// DOWNLOADED FILE and a CONNECTION are different roads with different vocabularies. The sample files
// show how an institution WORDS things; they are not what its API returns. So each mapping records
// its source, and the two are never treated as interchangeable:
//   · "Vanguard file"  — seen in a downloaded export. Proves the FILE road only.
//   · "E*TRADE live"   — observed on a real connection. Proves the CONNECTION road.
//   · "FDX" / "spec"   — published documentation. Proves neither until observed.
//
// A rule matching on words is deliberately robust to this: it catches "Sweep out" whether that
// phrasing arrives from a file or a feed, and an unrecognised word is UNKNOWN either way. But no
// claim about what a connection sends may rest on a file alone.
import type { Money } from './money';

/** Whether money crossed the boundary of the person's own accounts. This is the axis that decides
 *  contributions and withdrawals, and it is the one the old code got wrong. */
export type Externality = 'EXTERNAL' | 'INTERNAL' | 'NONE';
/** What the money IS: their own principal moving, income earned, or a cost paid. */
export type Kind = 'PRINCIPAL' | 'INCOME' | 'COST' | 'NONE';

export type CanonicalEvent =
  | 'CASH_IN' | 'CASH_OUT'                       // money genuinely entering or leaving
  | 'SECURITIES_IN' | 'SECURITIES_OUT'           // in-kind transfers — value crosses without cash
  | 'BUY' | 'SELL'                               // internal: cash becomes shares, or the reverse
  | 'DIVIDEND' | 'CAPITAL_GAIN_DISTRIBUTION' | 'INTEREST'   // income
  | 'REINVEST_PURCHASE'                          // the BUYING half of a reinvestment — NOT income
  | 'RETURN_OF_CAPITAL'                          // a bond or CD maturing: your own money back
  | 'SWEEP'                                      // between an account's own cash and its sweep fund
  | 'INTERNAL_TRANSFER'                          // between two accounts the person owns
  | 'FEE' | 'TAX_WITHHELD' | 'MARGIN_INTEREST'   // costs
  | 'CORPORATE_ACTION'                           // split, merger, spin-off — units change, no cash
  | 'OPTION_EXERCISE' | 'OPTION_EXPIRY'
  | 'UNKNOWN';                                   // the honest answer, and it counts in nothing

export interface EventRule {
  event: CanonicalEvent;
  externality: Externality;
  kind: Kind;
  /** Which running totals this event may touch. UNKNOWN touches none, by design.
   *  costBasis and realisedGain joined the axis 2026-08-20 (audit item 31): the sheet's committed
   *  rule — a reinvested distribution RAISES cost basis (Metrics K14) — was unrepresentable while
   *  the vocabulary stopped at units. */
  totals: ReadonlyArray<'contributions' | 'withdrawals' | 'income' | 'costs' | 'units' | 'costBasis' | 'realisedGain'>;
  /** Direction where the event itself determines it, regardless of how the source signed it. */
  direction?: 'IN' | 'OUT';
  why?: string;
}

const R = (event: CanonicalEvent, externality: Externality, kind: Kind,
           totals: EventRule['totals'], direction?: 'IN' | 'OUT', why?: string): EventRule =>
  ({ event, externality, kind, totals, direction, why });

export const EVENTS: Record<CanonicalEvent, EventRule> = {
  CASH_IN:        R('CASH_IN', 'EXTERNAL', 'PRINCIPAL', ['contributions'], 'IN'),
  CASH_OUT:       R('CASH_OUT', 'EXTERNAL', 'PRINCIPAL', ['withdrawals'], 'OUT'),
  SECURITIES_IN:  R('SECURITIES_IN', 'EXTERNAL', 'PRINCIPAL', ['contributions', 'units', 'costBasis'], 'IN',
    'Valued at market on the transfer date. Booked at zero, the whole position appears as gain the moment it lands.'),
  SECURITIES_OUT: R('SECURITIES_OUT', 'EXTERNAL', 'PRINCIPAL', ['withdrawals', 'units'], 'OUT',
    'Shares moved to another firm or gifted. If only cash counts as a withdrawal, this reads as a total loss.'),
  BUY:            R('BUY', 'INTERNAL', 'PRINCIPAL', ['units', 'costBasis']),
  SELL:           R('SELL', 'INTERNAL', 'PRINCIPAL', ['units', 'realisedGain']),
  DIVIDEND:       R('DIVIDEND', 'INTERNAL', 'INCOME', ['income'], 'IN'),
  CAPITAL_GAIN_DISTRIBUTION: R('CAPITAL_GAIN_DISTRIBUTION', 'INTERNAL', 'INCOME', ['income'], 'IN'),
  INTEREST:       R('INTEREST', 'INTERNAL', 'INCOME', ['income'], 'IN'),
  REINVEST_PURCHASE: R('REINVEST_PURCHASE', 'INTERNAL', 'PRINCIPAL', ['units', 'costBasis'], 'OUT',
    'The BUYING half of a reinvested distribution. The income was already counted on its own line; counting this too is the founder\'s $2,387. It RAISES cost basis (Metrics K14) — taxed once as income, that money must not be taxed again as gain at the sale.'),
  RETURN_OF_CAPITAL: R('RETURN_OF_CAPITAL', 'INTERNAL', 'PRINCIPAL', ['units'], 'IN',
    'A bond or CD maturing. The money was always yours — it changed form. Booked as a deposit it invents money you never paid in.'),
  SWEEP:          R('SWEEP', 'INTERNAL', 'PRINCIPAL', [],
    undefined, 'Between an account\'s own cash and its money-market fund. Nothing entered or left; this is most of the founder\'s phantom $1m.'),
  INTERNAL_TRANSFER: R('INTERNAL_TRANSFER', 'INTERNAL', 'PRINCIPAL', [],
    undefined, 'Between two accounts the person owns. Cancels ACROSS THE HOUSEHOLD, not per screen, or it double-counts.'),
  FEE:            R('FEE', 'INTERNAL', 'COST', ['costs'], 'OUT'),
  TAX_WITHHELD:   R('TAX_WITHHELD', 'INTERNAL', 'COST', ['costs'], 'OUT'),
  MARGIN_INTEREST: R('MARGIN_INTEREST', 'INTERNAL', 'COST', ['costs'], 'OUT'),
  CORPORATE_ACTION: R('CORPORATE_ACTION', 'INTERNAL', 'NONE', ['units'],
    undefined, 'Units change, cash does not — unless cash-in-lieu rides the row, which must then be recorded.'),
  OPTION_EXERCISE: R('OPTION_EXERCISE', 'INTERNAL', 'PRINCIPAL', ['units'],
    undefined, 'Share-settled: the cash arrives on the paired trade. CASH-SETTLED: the money is on THIS row and must not be dropped.'),
  OPTION_EXPIRY:  R('OPTION_EXPIRY', 'INTERNAL', 'NONE', ['units'],
    undefined, 'Worthless expiry moves no cash. An in-the-money option is auto-exercised and arrives as an exercise.'),
  UNKNOWN:        R('UNKNOWN', 'NONE', 'NONE', [],
    undefined, 'We could not classify it. It is kept and shown, and it counts in NOTHING. This one rule is what ends the phantom-contribution class of bug.'),
};

/** A word we have actually seen, or one published in a spec. `seen` records which. */
interface Mapping { match: RegExp; event: CanonicalEvent; source: string; seen: boolean }

// Ordered: the FIRST match wins, so the specific must precede the general. "Dividend Reinvestment"
// has to be tested before "Dividend", or every reinvestment is booked as income twice.
//
// WORDS MAY ARRIVE RUN TOGETHER. Found by testing the founder's own challenge — that an engine coded
// to one institution is bound to fail. FDX writes its values as single tokens: DIVIDENDREINVEST,
// RETURNOFCAPITAL, MARGININTEREST. A rule needing a word boundary or a space matched Vanguard's
// "Dividend Reinvestment" and missed the standard's own spelling of the same event. Patterns now
// accept both, because the point is to recognise the EVENT however it is spelled — not one dialect.
const MAPPINGS: Mapping[] = [
  // ── reinvestment, before any plain income word ────────────────────────────────────────────────
  { match: /reinvest/i, event: 'REINVEST_PURCHASE', source: 'Vanguard "Reinvestment"; FDX DIVIDENDREINVEST, REINVESTOFINCOME', seen: true },
  { match: /^REI$/i, event: 'REINVEST_PURCHASE', source: 'SnapTrade REI', seen: true },

  // ── the sweep and journal events behind the phantom contributions ─────────────────────────────
  { match: /\bsweep\b/i, event: 'SWEEP', source: 'Vanguard "Sweep in" / "Sweep out"', seen: true },
  { match: /^JRNL(FUND|SEC)$/i, event: 'INTERNAL_TRANSFER', source: 'FDX JRNLFUND / JRNLSEC', seen: false },
  { match: /\bjournal\b/i, event: 'INTERNAL_TRANSFER', source: 'FDX journal events', seen: false },

  // ── maturity payouts: your own money returning ────────────────────────────────────────────────
  { match: /redemption|return\s?of\s?(capital|principal)|\bmatur(ed|ity)\b|called\s?bond/i,
    event: 'RETURN_OF_CAPITAL', source: 'Vanguard "Corp Action (Redemption)"; E*TRADE REDEMPTION; FDX RETURNOFCAPITAL', seen: true },

  // ── options, before generic buy/sell ──────────────────────────────────────────────────────────
  { match: /option\s?expir/i, event: 'OPTION_EXPIRY', source: 'E*TRADE OPTIONEXPIRATION; FDX OPTIONEXPIRATION', seen: true },
  { match: /option\s?(exercise|assignment)/i, event: 'OPTION_EXERCISE', source: 'E*TRADE OPTIONEXERCISE / OPTIONASSIGNMENT', seen: true },

  // ── costs, before income (a "fee reversal" must not read as income) ───────────────────────────
  { match: /margin\s?interest/i, event: 'MARGIN_INTEREST', source: 'FDX MARGININTEREST; E*TRADE bills it as MISC', seen: true },
  { match: /\bfee\b|\bcommission\b|service charge|^SRVCHG$/i, event: 'FEE', source: 'Fidelity/Vanguard "Fee"; FDX FEE, SRVCHG', seen: true },
  { match: /\btax\b|withh?eld/i, event: 'TAX_WITHHELD', source: 'FDX TAX; E*TRADE TAX', seen: true },

  // ── income ────────────────────────────────────────────────────────────────────────────────────
  { match: /capital\s?gain|^(LT|ST)?CG(LONG|SHORT)?$/i, event: 'CAPITAL_GAIN_DISTRIBUTION', source: 'OFX CGLONG/CGSHORT; FDX capital-gain subtypes', seen: false },
  { match: /\bdividend\b|^DIV$/i, event: 'DIVIDEND', source: 'Vanguard "Dividend"; Fidelity DIVIDEND; FDX DIVIDEND', seen: true },
  { match: /\binterest\b/i, event: 'INTEREST', source: 'Vanguard "Interest"; Fidelity "INTEREST as of …"; FDX INTEREST', seen: true },

  // ── in-kind movement, before plain transfer. AUDIT ITEM 32: one pattern used to send BOTH
  // directions to SECURITIES_IN — an outbound transfer booked as a contribution (the $1.4m class).
  // Direction now comes from the words themselves; an in-kind row carrying NO direction word is
  // UNKNOWN (recorded, shown, counts in nothing) — never defaulted (rule R2). ─────────────────────
  { match: /exchange received in|external.?asset.?transfer.?in\b|in.?kind.*(received|\bin\b)/i,
    event: 'SECURITIES_IN', source: 'E*TRADE EXCHANGE RECEIVED IN / EXTERNAL_ASSET_TRANSFER_IN', seen: true },
  { match: /exchange delivered out|external.?asset.?transfer.?out\b|in.?kind.*(delivered|\bout\b)/i,
    event: 'SECURITIES_OUT', source: 'E*TRADE EXCHANGE DELIVERED OUT / EXTERNAL_ASSET_TRANSFER_OUT', seen: true },

  // ── external money ────────────────────────────────────────────────────────────────────────────
  { match: /^contribution\b|wire\s?in\b|^directdep|^dep(osit)?\b/i, event: 'CASH_IN', source: 'E*TRADE CONTRIBUTION / WIRE IN; FDX CONTRIBUTION, DEPOSIT', seen: true },
  { match: /^withdrawal\b|wire\s?out\b|^directdebit/i, event: 'CASH_OUT', source: 'E*TRADE WITHDRAWAL / WIRE OUT; FDX WITHDRAWAL', seen: true },

  // ── trades ────────────────────────────────────────────────────────────────────────────────────
  { match: /^BUY|purchase|^PURCHASED?(TO(OPEN|CLOSE|COVER))?$/i, event: 'BUY', source: 'Vanguard "Buy"; FDX PURCHASED', seen: true },
  { match: /^SELL|^SOLD(TO(OPEN|CLOSE))?$/i, event: 'SELL', source: 'FDX SOLD; E*TRADE SELL', seen: true },

  // ── corporate actions ─────────────────────────────────────────────────────────────────────────
  { match: /\bsplit\b|\bmerger\b|spin.?off|^ADJUSTMENT$|corp action/i, event: 'CORPORATE_ACTION', source: 'FDX SPLIT, ADJUSTMENT; Vanguard "Corp Action (…)"', seen: true },

  // ── generic transfer, last, because the specific ones above are all transfers too ─────────────
  { match: /^X?FER$|^TRANSFER$/i, event: 'INTERNAL_TRANSFER', source: 'FDX TRANSFER, XFER', seen: false },
];

export interface Classified {
  event: CanonicalEvent;
  rule: EventRule;
  /** The institution's own word, kept verbatim so an unknown is traceable and reportable. */
  word: string;
  /** Which mapping matched, and whether we have seen that word in a real file. */
  matchedBy?: string;
  recognised: boolean;
}

/** Classify one institution word. Anything unmatched is UNKNOWN — never guessed from an amount.
 *  Fidelity writes the action with detail appended ("INTEREST as of 2026-08-15 UNITED STATES…"),
 *  so a match anywhere in the string is correct; ordering above keeps that safe. */
/* ─ MK-ST-F-007 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * classifyEvent
 *
 * Answers ..... Classify one institution word.
 *
 * Formula .....
 *     w = string(word ?? '').trim()
 *     event = 'UNKNOWN'
 *     rule = EVENTS.UNKNOWN
 *     word = ''
 *     recognised = false   when w is missing
 *     the answer:
 *     event = event
 *     rule = EVENTS[event]
 *     word = w
 *     matched by = source
 *     recognised = true
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-ST-F-012 toLedgerRow · MK-XS-F-106 mapOptionHolding
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-102 ingestSync · MK-XS-F-106 mapOptionHolding
 *               MK-ST-F-012 toLedgerRow
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-007
 * Changed ..... 2026-08-18 (bfea15e)
 */
export function classifyEvent(word: string | null | undefined): Classified {
  const w = String(word ?? '').trim();
  if (!w) return { event: 'UNKNOWN', rule: EVENTS.UNKNOWN, word: '', recognised: false };
  for (const m of MAPPINGS) {
    if (m.match.test(w)) {
      return { event: m.event, rule: EVENTS[m.event], word: w, matchedBy: m.source, recognised: true };
    }
  }
  return { event: 'UNKNOWN', rule: EVENTS.UNKNOWN, word: w, recognised: false };
}

/** Does this event add to that total? The single place any screen may ask. */
/* ─ MK-ST-F-008 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * touches
 *
 * Answers ..... Does this event add to that total?
 *
 * Formula .....
 *     EVENTS[e].totals.includes(total)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-007 purchase price and date (per lot)
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-008
 * Changed ..... 2026-08-20 (c3e2601)
 */
export function touches(e: CanonicalEvent, total: 'contributions' | 'withdrawals' | 'income' | 'costs' | 'units' | 'costBasis' | 'realisedGain'): boolean {
  return EVENTS[e].totals.includes(total);
}

/** The direction an event implies, where the event itself decides it. */
/* ─ MK-ST-F-009 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * directionOf
 *
 * Answers ..... The direction an event implies, where the event itself decides it.
 *
 * Formula .....
 *     EVENTS[e].direction (or 'NONE' when missing)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-009
 * Changed ..... 2026-08-18 (bfea15e)
 */
export function directionOf(e: CanonicalEvent): Money['direction'] {
  return EVENTS[e].direction ?? 'NONE';
}
