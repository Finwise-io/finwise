/**  WHAT YOUR OWN ACCOUNTS PAY YOU — worked out, with the working shown.
 *
 *  The app holds the accounts, so it can work this out rather than ask. Asking invites a second,
 *  different answer to one question with nothing to reconcile them (approved mock income-v5, 3c).
 *
 *  IT DOES NOT ADD UP HISTORY AND FORECAST. Three screens showed
 *  `investmentIncomeAnnual(transactions) + interestIncomeAnnual(accounts)` — the coupons actually
 *  received in the last year, PLUS the coupons those same bonds are expected to pay. A $10,000
 *  Treasury at 5% that had paid its $500 was shown as $1,000 of income. This answers one question
 *  only: what will these accounts pay in a year, from the rates on the accounts themselves.
 *
 *  WHAT IT CANNOT SEE. Dividends from shares and funds. Nothing in the app records a dividend yield,
 *  and inventing one would be a guess dressed as a figure. So the total says what it covers, and the
 *  person can correct it — which is the honest shape when the data is partial.
 */
import type { AssetAccount } from '../assets';
import { assetClassOf } from '../assets';
import { round2, money } from '../_shared/num';
import { isoLocalDate } from '../_shared/dates';

const DEFAULT_BOND_YIELD = 0.042;   // US Aggregate ~yield, used when a bond fund states no rate

export interface AccountIncomeLine {
  label: string;        // the account, as the person named it
  why: string;          // how we got the figure — the rate and what it was applied to
  annual: number;
  assumed: boolean;     // true when we fell back to a default rate rather than one they gave
}

export interface AccountIncome {
  annual: number;
  lines: AccountIncomeLine[];
  covers: string;       // what is in the figure, in words
  missing: string | null;   // what we know we cannot see
}

/** A rate as the person would say it: 3.8%, not 0.038. Named for what it does, and named
 *  uniquely — `pct` already means something on the bonds screen. */
/* ─ MK-CF-F-182 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * asPercent
 *
 * Answers ..... A rate as the person would say it: 3.8%, not 0.038.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-CF-F-184 incomeFromAccounts
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-CF-F-184 incomeFromAccounts
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Multiplies by 100 — a percentage, or an option contract treated as 100 shares. Worth checking which.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-182
 * Changed ..... not in git yet (—)
 */
const asPercent = (r: number) => `${round2(r * 100)}%`;

/** What each account actually PAID OUT in the last year, by account. Reinvested income is excluded:
 *  it never reached the bank. */
/* ─ MK-CF-F-183 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * paidOutByAccount
 *
 * Answers ..... What each account actually PAID OUT in the last year, by account.
 *
 * Formula .....
 *     cutoff = iso local date(new date(now.get full year() − 1, now.get month(), now.get date()))
 *     out = new map<string, number>()
 *     id = string(account id ?? '')
 *     the answer = out
 *
 * Called by ... MK-CF-F-184 incomeFromAccounts
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-CF-F-184 incomeFromAccounts
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-008 transaction amount
 *               MK-XS-I-024 logged spending
 *
 * Decides .....
 *     · If amount is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-183
 * Changed ..... not in git yet (—)
 */
function paidOutByAccount(txns: any[] | null | undefined, now: Date): Map<string, number> {
  const cutoff = isoLocalDate(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()));
  const out = new Map<string, number>();
  for (const t of txns ?? []) {
    if (!['DIVIDEND', 'INTEREST', 'COUPON'].includes(String(t?.type))) continue;
    if (t?.reinvested) continue;
    if (String(t?.date ?? '') < cutoff) continue;
    const id = String(t?.account_id ?? '');
    if (!id) continue;
    out.set(id, round2((out.get(id) ?? 0) + (t.amount || 0)));
  }
  return out;
}

/** One line per account that pays something, and the total.
 *
 *  PER ACCOUNT, ONE ANSWER. Where the record shows what an account actually paid in the last year,
 *  that is the figure — it happened. Where it does not, the rate on the account is projected. The
 *  two are never added: three screens did add them, and a $10,000 Treasury at 5% that had paid its
 *  $500 was shown as $1,000 of income. */
/* ─ MK-CF-F-184 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * incomeFromAccounts
 *
 * Answers ..... One line per account that pays something, and the total.
 *
 * Formula .....
 *     paid = paid out by account(transactions, now)
 *     lines = []
 *     unseen = []
 *     cls = asset class of(a)
 *     label = string((a as any).label or (a as any).institution or 'Account')
 *     balance = (a as any).balance (or 0 when missing or zero)
 *     rate = (a as any).coupon rate (or 0 when missing or zero)
 *     actual = paid.get(string((a as any).asset id ?? ''))
 *     face = (a as any).face value (or 0 when missing or zero)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-003 institution name
 *               MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-011 bond face value
 *               MK-XS-I-012 bond coupon rate
 *               MK-XS-I-024 logged spending
 *               MK-XS-I-028 assumed return
 *
 * Decides .....
 *     · If balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If coupon rate is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If face value is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-184
 * Changed ..... not in git yet (—)
 */
export function incomeFromAccounts(
  accounts: AssetAccount[] | null | undefined,
  transactions?: any[] | null,
  now: Date = new Date(),
): AccountIncome {
  const paid = paidOutByAccount(transactions, now);
  const lines: AccountIncomeLine[] = [];
  // Accounts that hold money and produced no line. Naming them by CLASS was wrong: assetClassOf
  // answers 'mixed' for a brokerage, an IRA and a 401(k) — the ordinary cases — so a check for
  // 'stocks_etf' saw none of them and the app claimed to have covered everything.
  const unseen: string[] = [];

  for (const a of accounts ?? []) {
    const cls = assetClassOf(a);
    const label = String((a as any).label || (a as any).institution || 'Account');
    const balance = (a as any).balance || 0;
    const rate = (a as any).coupon_rate || 0;
    const actual = paid.get(String((a as any).asset_id ?? ''));
    if (actual != null && actual > 0) {
      lines.push({ label, why: 'paid out over the last year', annual: actual, assumed: false });
      continue;                                       // it happened; nothing to project
    }

    if (cls === 'bonds') {
      const face = (a as any).face_value || 0;
      if (rate > 0 && face > 0) {
        lines.push({ label, why: `${asPercent(rate)} coupon on ${money(face)} face`, annual: round2(rate * face), assumed: false });
      } else if (rate > 0) {
        lines.push({ label, why: `${asPercent(rate)} on ${money(balance)}`, annual: round2(rate * balance), assumed: false });
      } else {
        const y = ((a as any).target_return && (a as any).target_return > 0) ? (a as any).target_return : DEFAULT_BOND_YIELD;
        lines.push({ label, why: `${asPercent(y)} assumed on ${money(balance)}`, annual: round2(y * balance), assumed: true });
      }
      continue;
    }
    if (cls === 'cash' && rate > 0) {
      lines.push({ label, why: `${asPercent(rate)} on ${money(balance)}`, annual: round2(rate * balance), assumed: false });
      continue;
    }
    if (balance > 0) unseen.push(label);
  }

  return {
    annual: round2(lines.reduce((t, l) => t + l.annual, 0)),
    lines,
    covers: 'interest and coupons from the accounts you have told us about',
    missing: unseen.length
      ? `Not counted: ${unseen.slice(0, 3).join(', ')}${unseen.length > 3 ? ` and ${unseen.length - 3} more` : ''}. `
        + 'We do not hold a dividend yield for shares and funds, so we cannot say what they pay — add it below if you know.'
      : null,
  };
}
