// "Itemize this account" — decompose a lump-sum account (e.g. a $2.5MM "Chase" you entered at setup) into
// its real holdings (stocks, bonds, options, cash). Each holding becomes its own class-tagged account that
// INHERITS the lump's institution + tax wrapper, so a 401(k) lump's holdings stay PRE_TAX and everything
// still groups under "Chase" in the By-institution view. The donut then classifies each correctly.
//
// THE INVARIANT (trust): the account total NEVER drifts. A positive remainder (lump − Σ holdings) is kept
// as a cash sleeve at the same institution, so  Σ(itemized) + remainder  ===  the lump you started with.
import type { AssetAccount, TaxBucket } from './index';

export type ItemClass = 'stocks_etf' | 'bonds' | 'alternatives' | 'cash';

export interface ItemHolding {
  cls: ItemClass;
  label: string;
  value: number;
  ticker?: string;                 // stocks_etf (optional — surfaced in the label)
  couponRate?: number;             // bonds (decimal)
  maturityDate?: string;           // bonds ('YYYY-MM-DD')
  kind?: string;                   // alternatives sub-kind (crypto/options/…); defaults per class
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
 * Decides .....
 *     · If value is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-049
 * Changed ..... 2026-06-28 (e637ba5)
 */
export const itemizedTotal = (items: ItemHolding[]): number =>
  (items.reduce((t, h) => t + (h.value || 0), 0));

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
  ((lumpBalance || 0) - itemizedTotal(items));

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
 *     sum + remainder   if keep remainder as cash and remainder > 0
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
export const itemizedResultTotal = (
  lump: Pick<AssetAccount, 'balance'>, items: ItemHolding[], keepRemainderAsCash = true,
): number => {
  const sum = itemizedTotal(items);
  const remainder = itemizeRemainder(lump.balance, items);
  return keepRemainderAsCash && remainder > 0 ? (sum + remainder) : sum;
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
 *     institution = (lump.institution or lump.label or '').trim() (or undefined when missing or zero)
 *     bucket = lump.tax bucket
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
 * Decides .....
 *     · If value is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If coupon rate is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-052
 * Changed ..... 2026-06-28 (e637ba5)
 */
export function buildItemizedAccounts(
  lump: AssetAccount, items: ItemHolding[], keepRemainderAsCash = true,
): Omit<AssetAccount, 'asset_id'>[] {
  const institution = (lump.institution || lump.label || '').trim() || undefined;
  const bucket: TaxBucket = lump.tax_bucket;
  const out: Omit<AssetAccount, 'asset_id'>[] = items.map((h) => {
    const acct: Omit<AssetAccount, 'asset_id'> = {
      label: (h.label || h.ticker || 'Holding').trim(),
      institution,
      asset_class: h.cls,
      kind: h.kind || KIND_FOR[h.cls],
      tax_bucket: bucket,
      balance: (h.value || 0),
      target_return: 0,
    };
    if (h.cls === 'bonds') {
      acct.coupon_rate = h.couponRate || 0;
      acct.maturity_date = h.maturityDate || undefined;
      acct.face_value = (h.value || 0);
    }
    return acct;
  });
  const remainder = itemizeRemainder(lump.balance, items);
  if (keepRemainderAsCash && remainder > 0) {
    out.push({
      label: `${institution || 'Account'} cash`,
      institution,
      asset_class: 'cash',
      kind: 'cash_mgmt',
      tax_bucket: bucket,
      balance: remainder,
      target_return: 0,
    });
  }
  return out;
}
