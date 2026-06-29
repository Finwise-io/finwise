// "Itemize this account" — decompose a lump-sum account (e.g. a $2.5MM "Chase" you entered at setup) into
// its real holdings (stocks, bonds, options, cash). Each holding becomes its own class-tagged account that
// INHERITS the lump's institution + tax wrapper, so a 401(k) lump's holdings stay PRE_TAX and everything
// still groups under "Chase" in the By-institution view. The donut then classifies each correctly.
//
// THE INVARIANT (trust): the account total NEVER drifts. A positive remainder (lump − Σ holdings) is kept
// as a cash sleeve at the same institution, so  Σ(itemized) + remainder  ===  the lump you started with.
import { round2 } from '../_shared/num';
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
export const itemizedTotal = (items: ItemHolding[]): number =>
  round2(items.reduce((t, h) => t + (h.value || 0), 0));

/** Lump balance − Σ holdings. Positive = still unallocated; negative = holdings exceed the entered total. */
export const itemizeRemainder = (lumpBalance: number, items: ItemHolding[]): number =>
  round2((lumpBalance || 0) - itemizedTotal(items));

/** The account total AFTER itemizing. With keep-as-cash and a non-negative remainder this equals the lump
 *  exactly (total preserved). If holdings exceed the lump, the total rises to Σ (the estimate was low). */
export const itemizedResultTotal = (
  lump: Pick<AssetAccount, 'balance'>, items: ItemHolding[], keepRemainderAsCash = true,
): number => {
  const sum = itemizedTotal(items);
  const remainder = itemizeRemainder(lump.balance, items);
  return keepRemainderAsCash && remainder > 0 ? round2(sum + remainder) : sum;
};

/** Build the new accounts to CREATE when committing an itemization. The caller then deletes the lump and
 *  addAsset()s each of these. Each inherits the lump's institution + tax bucket; a positive remainder
 *  becomes a cash sleeve so the total reconciles exactly. */
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
      balance: round2(h.value || 0),
      target_return: 0,
    };
    if (h.cls === 'bonds') {
      acct.coupon_rate = h.couponRate || 0;
      acct.maturity_date = h.maturityDate || undefined;
      acct.face_value = round2(h.value || 0);
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
