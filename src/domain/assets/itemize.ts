// "Itemize this account" — decompose a lump-sum account (e.g. a $2.5MM "Chase" you entered at setup) into
// its real holdings (stocks, bonds, options, cash). Each holding becomes its own class-tagged account that
// INHERITS the lump's institution + tax wrapper, so a 401(k) lump's holdings stay PRE_TAX and everything
// still groups under "Chase" in the By-institution view. The donut then classifies each correctly.
//
// THE INVARIANT (trust): the account total NEVER drifts. A positive remainder (lump − Σ holdings) is kept
// as a cash sleeve at the same institution, so  Σ(itemized) + remainder  ===  the lump you started with.
import { plural } from '../_shared/plural';   // the one list of words and plurals (DEC-4082, 2026-10-10)
import type { AssetAccount, TaxBucket } from './index';
import { benchmarkReturn } from './index';
import { Dec } from '../../../Calculation Module code/engines/decimal';

export type ItemClass = 'stocks_etf' | 'bonds' | 'alternatives' | 'cash';

export interface ItemHolding {
  cls: ItemClass;
  label: string;
  value: number | null;   // a holding listed with no value yet is null, never 0 (batch 06)
  ticker?: string;                 // stocks_etf (optional — surfaced in the label)
  couponRate?: number;             // bonds (decimal)
  maturityDate?: string;           // bonds ('YYYY-MM-DD')
  kind?: string;                   // alternatives sub-kind (crypto/options/…); defaults per class
  faceValue?: number;              // bonds — what it pays back at maturity, when the person knows it; never invented
}

const KIND_FOR: Record<ItemClass, string> = {
  stocks_etf: 'stocks_etf', bonds: 'fixed_income', alternatives: 'other_asset', cash: 'cash_mgmt',
};

/** Σ of the itemized holding values. */
/* ─ MK-NW-F-049 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * itemizedTotal
 *
 * Answers ..... Σ of the itemized holding values.
 *
 * Formula .....
 *     the answer = Σ over items of (value, or 0 when missing)
 *
 * Called by ... MK-NW-F-050 itemizeRemainder · MK-NW-F-051 itemizedResultTotal
 *               MK-NW-F-073 itemising
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-052 buildItemizedAccounts
 *               MK-NW-F-073 itemising · MK-NW-F-050 itemizeRemainder
 *               MK-NW-F-051 itemizedResultTotal
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-049
 * Changed ..... 2026-06-28 (e637ba5)
 */
export const itemizedTotal = (items: ItemHolding[]): number =>
  // DECIMAL, AND ONLY WHAT HAS A VALUE (outside review batch 06, 2026-10-07; his rule Q56): sums kept
  // exact so 30,000.30 − 10,000.10 − 20,000.20 is 0, not a float crumb; a holding with no value is not
  // $0 — itemizeMissingCount says how many were left out. A negative value (a short option) counts.
  Number(items.filter((h) => h.value != null && Number.isFinite(h.value)).reduce((t, h) => t.add(Dec.of(h.value as number)), Dec.ZERO).toString());

/** How many listed holdings have no value — so a remainder is said to be not final, never presented as complete. */
/* ─ MK-NW-F-118 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * itemizeMissingCount
 *
 * Answers ..... How many listed holdings have no value — so a remainder is said to be not final, never presented as complete.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-NW-F-073 itemising
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-073 itemising
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-118
 * Changed ..... not in git yet (—)
 */
export const itemizeMissingCount = (items: ItemHolding[]): number =>
  items.filter((h) => h.value == null || !Number.isFinite(h.value)).length;

/** Lump balance − Σ holdings. Positive = still unallocated; negative = holdings exceed the entered total. */

/** The entered total of an account less the value of the holdings listed under it: positive when some is still unexplained, negative when the holdings add up to more. */
/* ─ MK-NW-F-050 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * itemizeRemainder
 *
 * Answers ..... The entered total of an account less the value of the holdings listed under it: positive when some is still unexplained, negative when the holdings add up to more.
 *
 * Formula .....
 *     the answer = (lump balance, or 0) − itemized total(items)
 *
 * Called by ... MK-NW-F-051 itemizedResultTotal · MK-NW-F-052 buildItemizedAccounts
 *               MK-NW-F-073 itemising
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-052 buildItemizedAccounts
 *               MK-NW-F-073 itemising · MK-NW-F-051 itemizedResultTotal
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · If lump balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-050
 * Changed ..... 2026-06-28 (e637ba5)
 */
export const itemizeRemainder = (lumpBalance: number, items: ItemHolding[]): number =>
  Number(Dec.of(lumpBalance || 0).sub(Dec.of(itemizedTotal(items))).toString());

/** The account total AFTER itemizing. With keep-as-cash and a non-negative remainder this equals the lump
 *  exactly (total preserved). If holdings exceed the lump, the total rises to Σ (the estimate was low). */
/* ─ MK-NW-F-051 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * itemizedResultTotal
 *
 * Answers ..... The account total AFTER itemizing.
 *
 * Formula .....
 *     sum = itemized total(items)
 *     remainder = itemize remainder(lump.balance, items)
 *     the answer:
 *     sum + remainder   if remainder > 0
 *     sum   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-051
 * Changed ..... 2026-06-28 (e637ba5)
 */
export const itemizedResultTotal = (lump: Pick<AssetAccount, 'balance'>, items: ItemHolding[]): number => {
  // ITEMISING NEVER LOWERS WHAT AN ACCOUNT IS WORTH. What is not yet itemised stays as cash, so the
  // total is the entered total — the screen promises "We keep the total at $X". It rises only when the
  // holdings listed come to more than that, and the screen says the new total before Done is tapped.
  // A "not kept as cash" path once let a part-itemised $186,442 fall to $148,001 (outside review, 2026-10-07).
  const sum = itemizedTotal(items);
  const remainder = itemizeRemainder(lump.balance, items);
  return remainder > 0 ? (sum + remainder) : sum;
};

/** Build the new accounts to CREATE when committing an itemization. The caller then deletes the lump and
 *  addAsset()s each of these. Each inherits the lump's institution + tax bucket; a positive remainder
 *  becomes a cash sleeve so the total reconciles exactly. */
/* ─ MK-NW-F-052 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * buildItemizedAccounts
 *
 * Answers ..... Build the new accounts to CREATE when committing an itemization.
 *
 * Formula .....
 *     missing = items (or none when missing) where value = nothing (or !number.is finite(value) when missing or zero)
 *     institution = (lump.institution or lump.label or '').trim() (or undefined when missing or zero)
 *     bucket = lump.tax bucket
 *     wrapper = lump.kind   if lump.kind and ['401k', 'trad_ira', 'roth_ira', 'hsa', 'college_529'].includes(lump.kind)
 *     undefined   otherwise
 *     the answer = acct
 *     remainder = itemize remainder(lump.balance, items)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-003 institution name
 *               MK-XS-I-011 bond face value
 *               MK-XS-I-012 bond coupon rate
 *               MK-XS-I-013 bond maturity date
 *               MK-XS-I-028 assumed return
 *               MK-XS-I-048 the person’s own asset-class answer
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-052
 * Changed ..... 2026-06-28 (e637ba5)
 */
export function buildItemizedAccounts(lump: AssetAccount, items: ItemHolding[]): Omit<AssetAccount, 'asset_id'>[] {
  // A MISSING VALUE IS NEVER $0: a holding with no value would become a $0 account and the cash left over
  // would be built as if final. Refuse instead; the caller builds before it deletes the lump, so the lump
  // stays as it was. (outside review OpenAI final, 2026-10-09, DEC-3279f)
  const missing = (items ?? []).filter((h) => h.value == null || !Number.isFinite(h.value));
  if (missing.length > 0) {
    throw new Error(`buildItemizedAccounts: ${plural(missing.length, 'holding', `${missing.length} listed`)} ${missing.length === 1 ? 'has' : 'have'} no value (${missing.map((h) => h.label || h.ticker || 'a holding').join(', ')}) — give each a value before itemising.`);
  }
  const institution = (lump.institution || lump.label || '').trim() || undefined;
  const bucket: TaxBucket = lump.tax_bucket;
  // WHAT THE LUMP CARRIED, EVERY NEW ACCOUNT CARRIES (outside review, 2026-10-07): its retirement share —
  // a lump set aside 40% became accounts at the 100% default, and the nest egg jumped from itemising
  // alone — its source, and its wrapper kind where the lump is a wrapper (a 401(k), an IRA, an HSA, a
  // 529), so the new accounts are still named and taxed as that wrapper.
  const wrapper = lump.kind && ['401k', 'trad_ira', 'roth_ira', 'hsa', 'college_529'].includes(lump.kind) ? lump.kind : undefined;
  const carried: Partial<AssetAccount> = {
    ...(lump.retirement_pct != null ? { retirement_pct: lump.retirement_pct } : {}),
    ...(lump.source ? { source: lump.source } : {}),
  };
  const out: Omit<AssetAccount, 'asset_id'>[] = items.map((h) => {
    const acct: Omit<AssetAccount, 'asset_id'> = {
      label: (h.label || h.ticker || 'Holding').trim(),
      institution,
      asset_class: h.cls,
      kind: wrapper ?? h.kind ?? KIND_FOR[h.cls],
      tax_bucket: bucket,
      balance: h.value as number,   // checked above: every listed holding has a value
      // the typical rate for what it IS, not 0 (outside review, 2026-10-07): an itemised fund at 0%
      // pulled the household's average return down
      target_return: benchmarkReturn(KIND_FOR[h.cls]),
      ...carried,
    };
    if (h.cls === 'bonds') {
      // a rate not entered stays blank, never 0 (his approval of batch 5, DEC-2748b)
      if (h.couponRate != null) acct.coupon_rate = h.couponRate;
      acct.maturity_date = h.maturityDate || undefined;
      // the face value is what the person entered, or nothing: today's value is not what it pays back,
      // and a face set to it made every itemised bond look bought at par (outside review, 2026-10-07)
      if (h.faceValue != null && h.faceValue > 0) acct.face_value = h.faceValue;
    }
    return acct;
  });
  // what is not itemised stays as cash, always — so the balances still add up to the entered total
  const remainder = itemizeRemainder(lump.balance, items);
  if (remainder > 0) {
    out.push({
      label: `${institution || 'Account'} cash`,
      institution,
      asset_class: 'cash',
      kind: wrapper ?? 'cash_mgmt',
      tax_bucket: bucket,
      balance: remainder,
      target_return: benchmarkReturn('cash_mgmt'),
      ...carried,
    });
  }
  return out;
}
