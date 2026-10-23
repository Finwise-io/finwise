// ENGINE — what kind of thing is this holding?
//
// THE DEFECT THIS REPLACES. Three separate pieces of code answered this question — one for a file
// you upload, one for a connected broker, one for a whole account — written at different times with
// different rules. The same holding got different answers depending which door it came through: a
// gold fund, a bitcoin fund and an option all counted as Alternatives from a file but as ordinary
// shares from the broker. A person's gold could sit in a different slice of the pie chart purely
// because of how it arrived.
//
// ONE RULE, USED BY EVERY DOOR. Each caller passes what it happens to know — a ticker, a name, the
// institution's own type code — and the same evidence ladder runs over all of it.
//
// THE LADDER, strongest evidence first:
//   1. what the PERSON said           — never overruled
//   2. what the INSTITUTION declared  — a real type field, where one exists (FDX holdingType)
//   3. the SHAPE of the symbol        — an option symbol is unmistakable; a CUSIP is not a ticker
//   4. a KNOWN ticker                 — curated lists, because a name alone can lie
//   5. the WORDS in the name          — where the maturity of every CD in the world actually lives
//   6. honestly unclassified          — never "probably shares"

export type AssetClass =
  | 'cash' | 'bonds' | 'stocks_funds' | 'alternatives'
  | 'real_estate' | 'personal_property' | 'unclassified';

export const CLASS_LABEL: Record<AssetClass, string> = {
  cash: 'Cash',
  bonds: 'Bonds & CDs',
  stocks_funds: 'Stocks / Funds',
  alternatives: 'Alternatives',
  real_estate: 'Real estate',
  personal_property: 'Personal property',
  unclassified: 'Unclassified',
};

export interface ClassifyInput {
  /** The person's own answer, or a class an importer already resolved. Always wins. */
  stated?: AssetClass | null;
  ticker?: string | null;
  name?: string | null;
  /** The institution's own type word, where it sends one: FDX holdingType, SnapTrade type.code. */
  institutionType?: string | null;
  /** FDX holdingSubType — 'CASH' or 'MONEYMARKET'. */
  institutionSubType?: string | null;
  /** True where the source flags a holding as cash-like. Never trusted ALONE — brokers tag a CD
   *  this way — but real evidence when the words agree. */
  cashEquivalent?: boolean;
  /** Set when the account itself is being classified rather than a holding inside it. */
  accountKind?: string | null;
  hasHoldings?: boolean;
}

export interface Classified {
  assetClass: AssetClass;
  label: string;
  /** Which rung of the ladder decided it — so a wrong answer can be traced to its rule. */
  because: string;
  confident: boolean;
}

// ── curated lists. A name can lie ("Barrick Gold Corp" is a mining share); a ticker cannot. ──────
const MONEY_MARKET = new Set(['VMFXX','VMRXX','VUSXX','VMSXX','SPAXX','FDRXX','FZFXX','FZDXX','SPRXX',
  'SWVXX','SNVXX','SNSXX','SWGXX','TTTXX','MVRXX','GOFXX','FGXXX']);
const TBILL_ETF   = new Set(['SGOV','BIL','SHV','SCHO','VGSH']);
const CRYPTO      = new Set(['BTC','ETH','GBTC','ETHE','IBIT','FBTC','BITO','ARKB','HODL','ETHA']);
const COMMODITY   = new Set(['GLD','SLV','IAU','SGOL','GLDM','PPLT','PALL','USO','UNG','DBC','PDBC','AAAU']);
// Currency funds — the gap the old rules had. Neither path caught a currency holding, because the
// only rule looked for the word "currency" standing alone and brokers write "CURRENCYSHARES".
const CURRENCY_ETF = new Set(['FXE','FXY','FXB','FXF','FXA','FXC','UUP','UDN']);
// ISO 4217 codes a broker may hold directly. The founder's Fidelity file holds CHF — "SWISS FRANC".
const CURRENCY_CODE = new Set(['CHF','EUR','GBP','JPY','CAD','AUD','NZD','SEK','NOK','DKK','MXN','SGD','HKD']);

// A company word rescues a mining share from the commodity rule.
const COMPANY_WORDS = /\b(corp|corporation|inc\b|ltd|plc|mining|miners?|resources|company|holdings)\b/i;

/** The standard brokerage option symbol: root + 6-digit date + C or P + strike.
 *  Fidelity writes it with a leading dash and a space: " -DIA261231P470". */
const OCC_OPTION = /^-?[A-Z.]{1,6}\d{6}[CP]\d{1,8}$/;
/** A CUSIP: nine characters, letters and digits, at least one digit. NOT a ticker — a CD sent to a
 *  share-price feed comes back with no price and reads as worth nothing. */
const CUSIP = /^[0-9A-Z]{9}$/;

/* ─ MK-ST-F-056 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * has
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     re.test(s)
 *
 * Called by ... MK-CF-F-020 cashflowYear · MK-CF-F-092 incomeMonthlyGrid
 *               MK-CF-F-109 reviewTransactions · MK-CF-F-114 undoSnapshot
 *               MK-CF-F-115 restoreUndo · MK-CF-F-146 payFiguresAgree
 *               MK-CF-F-150 debtPaymentsCountedAsExpenses · MK-CF-F-153 radar
 *               MK-CF-F-172 hasWage · MK-CF-F-189 essentialsFromLoggedSpending
 *               MK-NW-F-026 accountDisplayNames · MK-NW-F-027 accountClassBreakdown
 *               MK-NW-F-084 categoryEarnings · MK-NW-F-092 investmentAccountIdsOf
 *               MK-NW-F-104 closedWith · MK-NW-F-106 mortgagesByProperty
 *               MK-NW-F-117 propertyUseMap · MK-NW-F-130 notIncludedSentence
 *               MK-NW-F-143 gainRowBetween · MK-NW-F-149 withoutBlankRows
 *               MK-NW-O-003 theNetWorth · MK-NW-O-004 theEmergencyFund
 *               MK-NW-O-008 thePerformance · MK-PF-F-015 topHoldingConcentration
 *               MK-PF-F-047 isIndividualBondOrCD · MK-PF-F-052 purchaseDateOnRecord
 *               MK-PF-F-053 isBroadIndexOption · MK-PF-F-075 soldOutPositions
 *               MK-PL-F-009 rmdTakenThisYear · MK-PL-F-031 taxOrganizer
 *               MK-ST-F-010 nameEvidence · MK-ST-F-024 rmdStartAge
 *               MK-ST-F-031 valueOn · MK-ST-F-061 isMonthEnd
 *               MK-ST-F-073 rebuildDays · MK-ST-F-081 timeWeightedReturn
 *               MK-ST-F-082 movementsOf · MK-ST-F-083 accountValuesOn
 *               MK-ST-F-089 amountNotOnRecord · MK-XS-F-004 buildDatedGrid
 *               MK-XS-F-006 pruneDaily · MK-XS-F-014 classifyHolding
 *               MK-XS-F-102 ingestSync · MK-XS-F-104 mapAccountType
 *               MK-XS-F-109 dedupeActivities · MK-XS-F-175 uid
 *               MK-XS-F-187 fixStoredMoney · MK-XS-F-188 fixStoredFees
 *
 * Reaches ..... 388 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-140 LEFT_OUT · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               … and 370 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-056
 * Changed ..... not in git yet (—)
 */
const has = (s: string, re: RegExp) => re.test(s);

/* ─ MK-XS-F-014 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * classifyHolding
 *
 * Answers ..... For a line in a FILE you upload: which class is it?
 *
 * Formula .....
 *     ticker = string(input.ticker ?? '').trim().replace( ÷ \ × +$ ÷ , '').replace( ÷ ^- ÷ , '').to upper case()
 *     name = string(input.name ?? '').trim()
 *     both = `${ticker} ${name}`.trim()
 *     itype = string(input.institution type ?? '').trim().to upper case()
 *     isub = string(input.institution sub type ?? '').trim().to upper case()
 *     out(input.stated, 'you set this yourself')   when input.stated
 *     out('stocks_funds', 'the institution says it is a money − market fund')   when isub = 'MONEYMARKET'
 *     out('cash', 'the institution says it is cash')   when isub = 'CASH'
 *     out(STRONG_TYPE[itype], `the institution's own type says ${itype}`)   when STRONG_TYPE[itype]
 *     weak type = a list with no repeats of ['STOCK', 'MUTUALFUND', 'ETF', 'CS', 'ET', 'MF', 'OEF', 'CEF', 'ADR']
 *     the answer = out('alternatives', 'the symbol is shaped like an option contract')
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-003 institution name
 *               MK-XS-I-048 the person’s own asset-class answer
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-014
 * Changed ..... 2026-08-18 (e3e7833)
 */
export function classifyHolding(input: ClassifyInput): Classified {
  const out = (assetClass: AssetClass, because: string, confident = true): Classified =>
    ({ assetClass, label: CLASS_LABEL[assetClass], because, confident });

  // Fidelity marks its core cash position with trailing asterisks — "SPAXX**" — a footnote marker,
  // not part of the ticker. Strip decoration before any comparison.
  const ticker = String(input.ticker ?? '').trim().replace(/\*+$/, '').replace(/^-/, '').toUpperCase();
  const name = String(input.name ?? '').trim();
  const both = `${ticker} ${name}`.trim();
  const itype = String(input.institutionType ?? '').trim().toUpperCase();
  const isub = String(input.institutionSubType ?? '').trim().toUpperCase();

  // ── 1 · the person's own answer ────────────────────────────────────────────────────────────────
  if (input.stated) return out(input.stated, 'you set this yourself');

  // ── 2 · what the institution declared, where it sends a real type ─────────────────────────────
  if (isub === 'MONEYMARKET') return out('stocks_funds', 'the institution says it is a money-market fund');
  if (isub === 'CASH') return out('cash', 'the institution says it is cash');
  // A SPECIFIC declaration is strong evidence: no broker calls something a bond by accident.
  const STRONG_TYPE: Record<string, AssetClass> = {
    BOND: 'bonds', CD: 'bonds', BND: 'bonds', FIXEDINCOME: 'bonds',
    OPTION: 'alternatives', DIGITALASSET: 'alternatives', CRYPTO: 'alternatives',
  };
  if (STRONG_TYPE[itype]) return out(STRONG_TYPE[itype], `the institution's own type says ${itype}`);

  // The GENERIC equity codes are weak and must NOT be trusted here — they are the default a broker
  // assigns to anything it has not thought about. This was the actual defect: a gold fund and a
  // spot-bitcoin fund both arrive tagged as ordinary shares, so trusting this rung above the
  // curated lists is precisely how the same holding got two different answers. It is applied far
  // below, only once the ticker and the words have had their say.
  const WEAK_TYPE = new Set(['STOCK', 'MUTUALFUND', 'ETF', 'CS', 'ET', 'MF', 'OEF', 'CEF', 'ADR']);

  // ── 3 · the shape of the symbol ───────────────────────────────────────────────────────────────
  if (OCC_OPTION.test(ticker) || has(both, /\b(put|call)s?\b/i) || has(name, /\$\d[\d,.]*\s*(put|call)/i)) {
    return out('alternatives', 'the symbol is shaped like an option contract');
  }

  // ── 4 · a known ticker ────────────────────────────────────────────────────────────────────────
  if (MONEY_MARKET.has(ticker)) return out('stocks_funds', 'a known money-market fund — it pays dividends, so its income must be measured');
  if (TBILL_ETF.has(ticker))    return out('bonds', 'a known short-Treasury fund');
  if (CRYPTO.has(ticker))       return out('alternatives', 'a known crypto holding');
  if (COMMODITY.has(ticker))    return out('alternatives', 'a known commodity fund');
  if (CURRENCY_ETF.has(ticker)) return out('alternatives', 'a known currency fund');
  if (CURRENCY_CODE.has(ticker) && !name.match(/\b(corp|inc|fund|trust)\b/i)) {
    return out('alternatives', 'a currency held directly');
  }

  // ── 5 · the words in the name ─────────────────────────────────────────────────────────────────
  if (has(both, /\b(sweep|settlement)\b|fdic.?insured deposit/i)) return out('cash', 'the name says it is uninvested cash');
  if (has(both, /\bmoney[\s-]?market\b|\bmmkt\b|\bmmf\b/i)) return out('stocks_funds', 'the name says money market — it pays dividends, so it is measured, not cash');
  if (looksFixedIncome(both)) return out('bonds', 'the name says it is a bond, CD or Treasury');
  if (has(both, /\b(currency|currencies|forex)\b|currencyshares/i)) return out('alternatives', 'the name says it is a currency');
  if (has(both, /\b(bitcoin|ethereum|crypto(currenc(y|ies))?)\b/i)) return out('alternatives', 'the name says it is crypto');
  if (has(both, /\b(gold|silver|platinum|palladium|commodit(y|ies)|bullion)\b/i) && !COMPANY_WORDS.test(both)) {
    return out('alternatives', 'the name says it is a commodity, and it is not a company name');
  }

  // ── 6 · NOW the broker's generic equity code, having heard the ticker and the words ───────────
  if (WEAK_TYPE.has(itype)) return out('stocks_funds', `the institution's type code says ${itype}, and nothing contradicts it`);

  // ── 7 · account-level fallbacks, then honesty ─────────────────────────────────────────────────
  if (input.accountKind) {
    const k = String(input.accountKind).toLowerCase();
    const BY_KIND: Record<string, AssetClass> = {
      checking: 'cash', savings: 'cash', hysa: 'cash', cash_mgmt: 'cash',
      money_market: 'stocks_funds', cd: 'bonds', fixed_income: 'bonds', stocks_etf: 'stocks_funds',
      crypto: 'alternatives', commodities: 'alternatives', options: 'alternatives',
      private_equity: 'alternatives', hedge_funds: 'alternatives', annuities: 'alternatives',
      other_asset: 'alternatives', home: 'real_estate', vehicle: 'personal_property',
    };
    if (BY_KIND[k]) return out(BY_KIND[k], `the account type you chose is ${k}`);
  }
  // A CUSIP is an IDENTIFIER, not a clue about what the thing is. I first wrote this rung as
  // "a CUSIP almost always means fixed income" and the founder's own Fidelity file disproved it
  // immediately: 02315N709 is VANGUARD TARGET 2040, a target-date fund. Mutual funds, shares and
  // bonds all carry CUSIPs. With no name and no type, the honest answer is that we do not know.
  // A CUSIP is an IDENTIFIER, not a clue. But a NAME is evidence even when nothing specific in it
  // matched — "VANGUARD TARGET 2040" is plainly a fund. So the ordinary default applies whenever we
  // have something to read; only a bare identifier with no name leaves us genuinely knowing nothing.
  const bareCusip = CUSIP.test(ticker) && /\d/.test(ticker) && !name;
  if (bareCusip) {
    return out('unclassified', 'we have only a CUSIP — an identifier that says nothing about what it is', false);
  }
  if (ticker || name) return out('stocks_funds', 'nothing suggests otherwise, so the ordinary default applies');
  if (input.hasHoldings) return out('stocks_funds', 'it holds securities we can see');

  return out('unclassified', 'we were not told enough to say, and will not guess', false);
}

/** Fixed income by its words. This is where a CD's identity actually lives — verified in FDX 6.3
 *  and 6.4 that no standard carries a maturity or coupon field on a holding. */
/* ─ MK-ST-F-001 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * looksFixedIncome
 *
 * Answers ..... Fixed income by its words.
 *
 * Formula .....
 *     t = text.to upper case()
 *     true   when ÷ \b(CD|CERTIFICATE OF DEPOSIT|T-?BILL|TREASURY BILLS?|TREAS BILLS?|TREASURY NOTE|TREAS NOTE|TREASURY BOND|TREAS |DEBENTURE|MUNI|ZERO CPN)\b ÷ .test(t)
 *     true   when ÷ \b bds\b|\b bond\b|\b notes?\b ÷ .test(t) and ! ÷ \b noted\b ÷ .test(t)
 *     true   when ÷ \b bd\b\s × (INDEX|FD|FUND) ÷ .test(t)
 *     true   when ÷ \d(\.\d+)?\s × %. × \b(20\d\d|DUE|MTD)\b ÷ .test(t)
 *     true   when ÷ \b cpn\b\s × [\d.] ÷ .test(t)
 *     the answer = false
 *
 * Called by ... MK-XS-F-014 classifyHolding
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-014 classifyHolding
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-001
 * Changed ..... 2026-08-18 (e3e7833)
 */
export function looksFixedIncome(text: string): boolean {
  const t = text.toUpperCase();
  if (/\b(CD|CERTIFICATE OF DEPOSIT|T-?BILL|TREASURY BILLS?|TREAS BILLS?|TREASURY NOTE|TREAS NOTE|TREASURY BOND|TREAS |DEBENTURE|MUNI|ZERO CPN)\b/.test(t)) return true;
  if (/\bBDS\b|\bBOND\b|\bNOTES?\b/.test(t) && !/\bNOTED\b/.test(t)) return true;
  // a fund that holds bonds belongs with the bonds when the money is being allocated.
  // Fidelity abbreviates: "VANGUARD BD INDEX FDS INTERMED TERM".
  if (/\bBD\b\s*(INDEX|FD|FUND)/.test(t)) return true;
  // a rate followed by a maturity: "4.00% 08/24/2026", "3.87500% 02/15/2043", "CPN 1.62500"
  if (/\d(\.\d+)?\s*%.*\b(20\d\d|DUE|MTD)\b/.test(t)) return true;
  if (/\bCPN\b\s*[\d.]/.test(t)) return true;
  return false;
}
