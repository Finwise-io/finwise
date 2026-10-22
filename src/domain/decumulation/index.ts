// Decumulation (retirement drawdown) — pure helpers for the "will it last?" view.
// Tax-bucket split of the nest egg, net withdrawal + rate vs the 4% guideline, deterministic
// depletion age, a tax-efficient withdrawal order, and required minimum distributions (RMDs).
import type { AssetAccount } from '../assets';
import { rmdStartAgeFromAge, rmdDivisor as tableRmdDivisor } from '../../../Calculation Module code/engines/rmd';
import { earmarkedAmount, primaryCarIdOf, primaryHomeIdOf, accountDisplayNames, taxTreatmentOf, assetKind } from '../assets';
import { marketValue, paidOnRecord, contractMultiplier } from '../performance';
import { moneyIntoAccount } from '../../../Calculation Module code/engines/ledger';

// ---- where the money sits, by tax treatment ----
export interface BucketSplit { taxable: number; preTax: number; roth: number; cash: number; total: number; }
/** An account the split counted as taxable because no tax type is stated on it (DEC-4105, 2026-10-10). */
export interface CountedTaxable { asset_id: string; name: string; }
/** The split, and the accounts in its taxable money for want of a tax type — each screen that shows a figure built
 *  from the split names them (DEC-4105, 2026-10-10). Kept apart from BucketSplit, whose keys are the four buckets. */
export type TaxSplit = BucketSplit & { countedTaxableNotStated: CountedTaxable[] };

/** WHICH OF THE SPLIT'S BUCKETS AN ACCOUNT FALLS IN — the one rule taxBucketSplit and taxableGainShare share, so the
 *  same money is taxable in both (DEC-4105, 2026-10-10, tenet 4). Property is in none; a stored pre-tax, Roth or cash
 *  type is its own bucket; everything else — a stored Taxable, and an account with no tax type — is taxable. */
// THE SAME READING AS THE ACCOUNT'S OWN PAGE (taxTreatmentOf, MK-NW-F-012), so a 401(k) saved with no tax type is
// pre-tax here as it is there, an HSA is pre-tax and a 529 tax-free whatever bucket is stored (DEC-4036d/e). Only an
// account whose tax the app cannot tell is counted taxable — and named (DEC-4105, 2026-10-10, tenet 4).
/* ─ MK-PL-F-086 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * splitBucketOf
 *
 * Answers ..... WHICH OF THE SPLIT'S BUCKETS AN ACCOUNT FALLS IN — the one rule taxBucketSplit and taxableGainShare share, so the same money is taxable in both (DEC-4105, 2026-10-10, tenet 4).
 *
 * Formula .....
 *     nothing   when tax bucket = 'PROPERTY'
 *     'cash'   when tax bucket = 'CASH' (or !tax bucket and asset kind(kind).bucket = 'CASH' when missing or zero)
 *     t = tax treatment of(a)
 *     the answer:
 *     'preTax'   if t = 'tax_deferred'
 *     'roth'   if t = 'tax_free'
 *     'taxable'   otherwise   otherwise
 *
 * Called by ... MK-PL-F-001 taxBucketSplit · MK-PL-F-081 taxableGainShare
 *               MK-PL-F-087 taxTypeNotStated
 *
 * Reaches ..... 9 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-031 buildSnapshot · MK-CF-O-017 futurePaycheck
 *               MK-PL-F-049 retirementSpendMonthly · MK-PL-F-068 selectWillItLast
 *               MK-XS-F-032 snapshotFromOnboarding · MK-PL-F-001 taxBucketSplit
 *               MK-PL-F-087 taxTypeNotStated · MK-PL-F-081 taxableGainShare
 *               MK-PL-F-067 willItLastInputs
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-086
 * Changed ..... not in git yet (—)
 */
const splitBucketOf = (a: AssetAccount): keyof BucketSplit | null => {
  if (a.tax_bucket === 'PROPERTY') return null;
  if (a.tax_bucket === 'CASH' || (!a.tax_bucket && assetKind(a.kind)?.bucket === 'CASH')) return 'cash';
  const t = taxTreatmentOf(a);
  return t === 'tax_deferred' ? 'preTax' : t === 'tax_free' ? 'roth' : 'taxable';
};
/** counted taxable only because no tax type is stated on it (DEC-4105, 2026-10-10) */
/* ─ MK-PL-F-087 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * taxTypeNotStated
 *
 * Answers ..... counted taxable only because no tax type is stated on it (DEC-4105, 2026-10-10)
 *
 * Formula .....
 *     split bucket of(a) = 'taxable' and tax treatment of(a) = 'not_stated'
 *
 * Called by ... MK-PL-F-001 taxBucketSplit
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-031 buildSnapshot · MK-CF-O-017 futurePaycheck
 *               MK-PL-F-049 retirementSpendMonthly · MK-PL-F-068 selectWillItLast
 *               MK-XS-F-032 snapshotFromOnboarding · MK-PL-F-001 taxBucketSplit
 *               MK-PL-F-067 willItLastInputs
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-087
 * Changed ..... not in git yet (—)
 */
const taxTypeNotStated = (a: AssetAccount) => splitBucketOf(a) === 'taxable' && taxTreatmentOf(a) === 'not_stated';
/* ─ MK-PL-F-001 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * taxBucketSplit
 *
 * Answers ..... How is the retirement money split by the tax that will be owed on it?
 *
 * Formula .....
 *     s = taxable = 0
 *     pre tax = 0
 *     roth = 0
 *     cash = 0
 *     total = 0
 *     counted taxable not stated = []
 *     car = primary car id of(accounts ?? []), home = primary home id of(accounts ?? [])
 *     names = account display names(accounts ?? [])
 *     bucket = split bucket of(a)
 *     v = earmarked amount(a, car, home)
 *     the answer = s
 *
 * Called by ... MK-CF-O-017 futurePaycheck · MK-PL-F-049 retirementSpendMonthly
 *               MK-PL-F-067 willItLastInputs
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-031 buildSnapshot · MK-CF-O-017 futurePaycheck
 *               MK-PL-F-049 retirementSpendMonthly · MK-PL-F-068 selectWillItLast
 *               MK-XS-F-032 snapshotFromOnboarding · MK-PL-F-067 willItLastInputs
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-001
 * Changed ..... 2026-06-05 (8ada09f)
 */
export function taxBucketSplit(accounts: AssetAccount[]): TaxSplit {
  const s: TaxSplit = { taxable: 0, preTax: 0, roth: 0, cash: 0, total: 0, countedTaxableNotStated: [] };
  // the household's home and car, so the shares agree with the nest egg (outside review OpenAI final, 2026-10-09, DEC-2747e · DEC-2746b)
  const car = primaryCarIdOf(accounts ?? []), home = primaryHomeIdOf(accounts ?? []);
  const names = accountDisplayNames(accounts ?? []);   // the one account name, as every screen writes it
  for (const a of accounts ?? []) {
    const bucket = splitBucketOf(a);
    if (bucket == null) continue;               // property
    const v = earmarkedAmount(a, car, home);    // retirement-earmarked portion of the account
    if (v <= 0) continue;
    s[bucket] += v;                             // no tax type stated → taxable, as before
    s.total += v;
    // NO TAX TYPE IS COUNTED TAXABLE, AND NAMED (DEC-4105, 2026-10-10). His words: "An account with no tax type would
    // be counted as taxable for the plan, with a line naming it". The split says which accounts it counted that way.
    if (taxTypeNotStated(a)) s.countedTaxableNotStated.push({ asset_id: a.asset_id, name: names.get(a.asset_id) ?? a.label });
  }
  return s;
}

/** THE LINE THAT NAMES IT (DEC-4105, 2026-10-10) — his words, one per account the split counted taxable for want of a
 *  tax type. Every Plan and retirement screen that shows a figure built from the split prints these, once. */
/* ─ MK-PL-F-088 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * countedTaxableLine
 *
 * Answers ..... THE LINE THAT NAMES IT (DEC-4105, 2026-10-10) — his words, one per account the split counted taxable for want of a tax type.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-048 the person’s own asset-class answer
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-088
 * Changed ..... not in git yet (—)
 */
export const countedTaxableLine = (name: string) => `${name} — tax type not stated; counted as taxable until you choose.`;

// ---- net withdrawal & rate ----
export type RateBand = 'safe' | 'moderate' | 'high' | 'none';

/** HOW A WITHDRAWAL RATE READS, IN HIS OWN-MATH FRAMING — DEC-0036, and ONE place for it (DEC-0215).
 *
 *  His reword: the heads-up about drawing more than about 4% a year stops citing a published rule of
 *  thumb and speaks about THIS person's money instead — *"above what your own numbers support
 *  long-term"*. A guideline is a fact about the world; what he wants on screen is a statement about
 *  him, which is also the only one the app can stand behind.
 *
 *  It lived in three hand-typed copies — the Plan hub and the retirement cockpit twice — all still
 *  saying "within the ~4% guideline", with a comment in the Plan hub admitting the sweep was left for
 *  later. His one-door-one-term rule (DEC-0215) is explicit that a wording change lands on every
 *  screen that offers it, so the words now have a single home and the screens ask for them.
 *
 *  `short` is for the form that sits inside a sentence, in brackets after the figures it describes.
 */
/* ─ MK-PL-F-084 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * rateBandWords
 *
 * Answers ..... HOW A WITHDRAWAL RATE READS, IN HIS OWN-MATH FRAMING — DEC-0036, and ONE place for it (DEC-0215).
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-084
 * Changed ..... not in git yet (—)
 */
export function rateBandWords(band: RateBand | null | undefined, opts?: { short?: boolean }): string {
  if (opts?.short) {
    return band === 'safe' ? 'within what your own numbers support'
      : band === 'moderate' ? 'near the edge of what your own numbers support'
      : 'above what your own numbers support';
  }
  return band === 'safe' ? 'within what your own numbers support long-term'
    : band === 'moderate' ? 'near the edge of what your own numbers support long-term'
    : 'above what your own numbers support long-term';
}
export interface WithdrawalPlan {
  spendAnnual: number; guaranteedAnnual: number; netWithdrawal: number;
  withdrawalRate: number | null;   // net withdrawal ÷ nest egg (decimal)
  rateBand: RateBand;              // vs the ~4% guideline
}
/* ─ MK-PL-F-002 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * withdrawalPlan
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     spend annual = spend monthly × 12
 *     guaranteed annual = guaranteed monthly × 12
 *     net withdrawal = max(0, spend annual − guaranteed annual)
 *     withdrawal rate = net withdrawal ÷ nest egg   if nest egg > 0
 *     nothing   otherwise
 *     the answer = { spend annual, guaranteed annual, net withdrawal, withdrawal rate, rate band }
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-002
 * Changed ..... 2026-06-05 (8ada09f)
 */
export function withdrawalPlan(spendMonthly: number, guaranteedMonthly: number, nestEgg: number): WithdrawalPlan {
  const spendAnnual = (spendMonthly * 12);
  const guaranteedAnnual = (guaranteedMonthly * 12);
  const netWithdrawal = Math.max(0, (spendAnnual - guaranteedAnnual));
  const withdrawalRate = nestEgg > 0 ? ((netWithdrawal / nestEgg)) : null;
  const rateBand: RateBand = netWithdrawal === 0 ? 'none'
    : withdrawalRate == null ? 'none'
    : withdrawalRate <= 0.04 ? 'safe'
    : withdrawalRate <= 0.05 ? 'moderate' : 'high';
  return { spendAnnual, guaranteedAnnual, netWithdrawal, withdrawalRate, rateBand };
}

// ---- deterministic depletion ----
/** Age the portfolio runs out (deterministic), or null if it lasts to the horizon.
 *  Net withdrawal grows with inflation; balance grows at the expected return. */
/* ─ MK-PL-F-003 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * depletionAge
 *
 * Answers ..... ---- deterministic depletion ---- Age the portfolio runs out (deterministic), or null if it lasts to the horizon.
 *
 * Formula .....
 *     bal = nest egg
 *     net = net withdrawal now
 *     rmd on = (pre tax share ?? 0) > 0
 *     pre tax bal = bal × min(1, max(0, pre tax share!))   if rmd on
 *     0   otherwise
 *     rate = min(0.6, max(0, rmd tax rate (or 0.22 when missing)))
 *     growth = 1 + return rate
 *     a + 1   when bal ≤ 0
 *     the answer = nothing
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-029 inflation rate
 *
 * Decides .....
 *     · If pre tax share is missing it uses 0.
 *     · If required withdrawal tax rate is missing it uses 22%.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-003
 * Changed ..... 2026-07-14 (6952f12)
 */
export function depletionAge(o: { age: number; horizon: number; nestEgg: number; netWithdrawalNow: number; returnRate: number; inflation: number; preTaxShare?: number; rmdTaxRate?: number }): number | null {
  let bal = o.nestEgg;
  let net = o.netWithdrawalNow;
  // PRD F9#12: from 73 the forced pre-tax withdrawal's TAX drags the egg (optional — legacy unchanged)
  const rmdOn = (o.preTaxShare ?? 0) > 0;
  let preTaxBal = rmdOn ? bal * Math.min(1, Math.max(0, o.preTaxShare!)) : 0;
  const rate = Math.min(0.6, Math.max(0, o.rmdTaxRate ?? 0.22));
  for (let a = o.age; a < o.horizon; a++) {
    const growth = 1 + o.returnRate;
    bal = bal * growth - net;
    if (rmdOn) {
      preTaxBal = Math.max(0, Math.min(bal, preTaxBal * growth - net * (bal > 0 ? preTaxBal / Math.max(bal, preTaxBal) : 1)));
      if (a >= rmdStartAgeFor(a) && preTaxBal > 0) {
        const rmd = rmdAtAge(preTaxBal, a);
        preTaxBal -= rmd;
        bal -= rmd * rate;
      }
    }
    if (bal <= 0) return a + 1;          // depleted during this year
    net = net * (1 + o.inflation);
  }
  return null;                            // survives to horizon
}

// ---- tax-efficient withdrawal order ----
export interface OrderStep { bucket: keyof BucketSplit | 'rmd'; label: string; amount: number; why: string; }
/** Tax-efficient withdrawal order. Pass `age` so RMD-age users see the mandatory RMD as step 1
 *  (RMDs legally force pre-tax withdrawals first — a static cash→taxable→pre-tax→roth order is wrong
 *  once you're 73+). Omitting age keeps the classic order for accumulation/pre-RMD users. */
export type DrawBucket = 'cash' | 'taxable' | 'preTax' | 'roth';
export const DEFAULT_DRAW_ORDER: DrawBucket[] = ['cash', 'taxable', 'preTax', 'roth'];

/* ─ MK-PL-F-004 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * withdrawalOrder
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     steps = seq where split[bucket] > 0for each of : ...each = ...each
 *     amount = split[bucket]
 *     pre = steps.find((s) => bucket = 'preTax')
 *     the answer = steps
 *
 * Called by ... MK-CF-O-017 futurePaycheck
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-CF-O-017 futurePaycheck
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-029 inflation rate
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-004
 * Changed ..... 2026-08-02 (a58480f)
 */
export function withdrawalOrder(split: BucketSplit, age = 0, userOrder?: DrawBucket[] | null): OrderStep[] {
  const base: { bucket: keyof BucketSplit; label: string; why: string }[] = [
    { bucket: 'cash', label: 'Cash', why: 'Spend first — it earns the least, so use it before it loses to inflation.' },
    { bucket: 'taxable', label: 'Taxable / brokerage', why: 'Next — lets your tax-advantaged accounts keep compounding (you only owe tax on gains).' },
    { bucket: 'preTax', label: 'Pre-tax (401k / Traditional IRA)', why: 'Then pre-tax — withdrawals are taxed as income, and required withdrawals force this from 73 anyway.' },
    { bucket: 'roth', label: 'Roth', why: 'Last — tax-free growth and no RMDs, so let it run as long as possible.' },
  ];
  // a saved user preference reorders the buckets (the steer sheet writes it; the RMD pin below
  // is law, not preference, and always stays on top)
  const seq = (userOrder && userOrder.length === 4 && DEFAULT_DRAW_ORDER.every((b) => userOrder.includes(b)))
    ? userOrder.map((b) => base.find((x) => x.bucket === b)!)
    : base;
  const steps: OrderStep[] = seq.filter((s) => split[s.bucket] > 0).map((s) => ({ ...s, amount: split[s.bucket] }));
  if (age >= rmdStartAgeFor(age) && split.preTax > 0) {
    const pre = steps.find((s) => s.bucket === 'preTax');
    if (pre) pre.why = 'The rest, beyond your required withdrawal — taxed as income.';
    return [{ bucket: 'rmd', label: 'Required withdrawal (RMD) — first', amount: rmdAtAge(split.preTax, age),
      why: `Mandatory at ${age}: you must take this from pre-tax first, taxed as income whether you need it or not.` }, ...steps];
  }
  return steps;
}

// ---- Required Minimum Distributions ----
// B4 (founder brief 2026-08-20): the rule lives in ONE dated, sourced table — the Calculation
// Module's rmd function. The start age follows the birth-year rule (73 born 1951–1959, 75 born
// 1960+); Roth 401(k)s are exempt BY CONSTRUCTION here — taxBucketSplit puts every ROTH-bucket
// account outside the pre-tax base this math runs on (pinned by test).
/** The start age for a person known only by AGE (birth year ≈ this year − age). */
/* ─ MK-PL-F-005 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * rmdStartAgeFor
 *
 * Answers ..... ---- Required Minimum Distributions ---- B4 (founder brief 2026-08-20): the rule lives in ONE dated, sourced table — the Calculation Module's rmd function.
 *
 * Formula .....
 *     73   if age = nothing
 *     rmd start age from age(age, now year)   otherwise
 *
 * Called by ... MK-PL-F-003 depletionAge · MK-PL-F-004 withdrawalOrder
 *               MK-PL-F-008 rmdSchedule · MK-PL-F-010 drawOrderOutcome
 *               MK-PL-F-027 nextDecision
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-PL-F-003 depletionAge · MK-PL-F-010 drawOrderOutcome
 *               MK-CF-O-017 futurePaycheck · MK-PL-F-027 nextDecision
 *               MK-PL-F-008 rmdSchedule · MK-PL-F-004 withdrawalOrder
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-005
 * Changed ..... 2026-08-20 (16a56f7)
 */
export function rmdStartAgeFor(age?: number | null, nowYear = new Date().getFullYear()): number {
  return age == null ? 73 : rmdStartAgeFromAge(age, nowYear);
}
/* ─ MK-PL-F-078 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * rmdDivisorAtAge
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     table rmd divisor(age, now year − age)
 *
 * Called by ... MK-PL-F-007 rmdAtAge · MK-PL-F-008 rmdSchedule
 *
 * Reaches ..... 8 functions. Change the arithmetic above and these change with it:
 *               MK-PL-F-003 depletionAge · MK-PL-F-010 drawOrderOutcome
 *               MK-CF-O-017 futurePaycheck · MK-PL-F-027 nextDecision
 *               MK-PL-F-007 rmdAtAge · MK-PL-F-080 rmdRequiredThisYear
 *               MK-PL-F-008 rmdSchedule · MK-PL-F-004 withdrawalOrder
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-078
 * Changed ..... not in git yet (—)
 */
export function rmdDivisorAtAge(age: number, nowYear = new Date().getFullYear()): number {
  return tableRmdDivisor(age, nowYear - age);
}
/** Required minimum distribution from pre-tax balances at a given age (0 before the start age). */
/* ─ MK-PL-F-007 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * rmdAtAge
 *
 * Answers ..... Required minimum distribution from pre-tax balances at a given age (0 before the start age).
 *
 * Formula .....
 *     required withdrawal = round(pre-tax balance ÷ divisor(age), 2 dp)
 *                         = 0   when the divisor is 0
 *
 * Called by ... MK-PL-F-003 depletionAge · MK-PL-F-004 withdrawalOrder
 *               MK-PL-F-008 rmdSchedule · MK-PL-F-010 drawOrderOutcome
 *               MK-PL-F-080 rmdRequiredThisYear
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-PL-F-003 depletionAge · MK-PL-F-010 drawOrderOutcome
 *               MK-CF-O-017 futurePaycheck · MK-PL-F-027 nextDecision
 *               MK-PL-F-080 rmdRequiredThisYear · MK-PL-F-008 rmdSchedule
 *               MK-PL-F-004 withdrawalOrder
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses the IRS Uniform Lifetime table for everyone (A37). A person whose sole beneficiary is a spouse more than ten years younger may use the Joint Life and Last Survivor table, which gives a SMALLER required amount — not modelled, and not said on the screen yet.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-007
 * Changed ..... 2026-07-14 (63edc6b)
 */
export function rmdAtAge(preTaxBalance: number, age: number): number {
  const d = rmdDivisorAtAge(age);
  return d > 0 ? (preTaxBalance / d) : 0;
}

/** This year's required withdrawal and the balance it stands on. */
export interface RmdThisYear { amount: number; basis: 'prior_year_end' | 'today'; balanceUsed: number }
/** What must be taken out this year, and which balance is it based on? (Founder ruling 2026-09-08, G8.) */
/* ─ MK-PL-F-080 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * rmdRequiredThisYear
 *
 * Answers ..... What must be taken out this year, and which balance is it based on?
 *
 * Formula .....
 *     balance used = the pre-tax balance on 31 December last year, when the person entered one (> 0); otherwise today's pre-tax balance
 *     amount = rmd at age(balance used, age)
 *     basis = 'prior_year_end' or 'today' — so the screen can say which
 *
 * Called by ... MK-PL-F-027 nextDecision
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-PL-F-027 nextDecision
 *
 * Serves ...... MK-PL-M-013
 * Reads ....... MK-XS-I-061 pre-tax balance on 31 December last year
 *
 * Decides .....
 *     · If pre tax today is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · The law bases the year's required withdrawal on the prior 31 December balance (Treas. Reg. §1.401(a)(9)-5); when that balance is not entered, today's balance stands in and the screen says so — founder ruling 2026-09-08 (second verification G8).
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-080
 * Changed ..... not in git yet (—)
 */
export function rmdRequiredThisYear(preTaxToday: number, priorYearEndPreTax: number | null | undefined, age: number): RmdThisYear {
  const prior = priorYearEndPreTax != null && priorYearEndPreTax > 0 ? priorYearEndPreTax : null;
  const balanceUsed = prior ?? Math.max(0, preTaxToday || 0);
  return { amount: rmdAtAge(balanceUsed, age), basis: prior != null ? 'prior_year_end' : 'today', balanceUsed };
}

// ── FCC: the required-withdrawals screen (detailed design Plan r43-r51) ─────────────────────

export interface RmdYearRow {
  age: number;
  year: number;
  projectedPreTax: number;   // estimate — moves with balances and returns
  divisor: number;
  amount: number;            // the mandated withdrawal that year (estimate for future years)
  isCurrent: boolean;
}

/** Year-by-year mandated-withdrawal schedule (ESTIMATES: future balances move with returns).
 *  ONE growth rule: balance grows at `expReturn`, then the year's RMD leaves the pre-tax bucket.
 *  Starts at the LATER of age 73 / current age; runs `years` rows. The SAME rmdAtAge() every
 *  other surface uses (agreement-pinned). */
/* ─ MK-PL-F-008 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * rmdSchedule
 *
 * Answers ..... Year-by-year mandated-withdrawal schedule (ESTIMATES: future balances move with returns).
 *
 * Formula .....
 *     rows = []
 *     rows   when pre tax now ≤ 0
 *     start age = max(rmd start age for(age now, now year), age now)
 *     bal = pre tax now
 *     r = max(0, exp return (or 0 when missing or zero))
 *     age = start age + i
 *     amount = rmd at age(bal, age)
 *     the answer = rows
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · If exp return is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-008
 * Changed ..... 2026-08-20 (16a56f7)
 */
export function rmdSchedule(preTaxNow: number, ageNow: number, expReturn: number, years = 15, nowYear = new Date().getFullYear()): RmdYearRow[] {
  const rows: RmdYearRow[] = [];
  if (preTaxNow <= 0) return rows;
  const startAge = Math.max(rmdStartAgeFor(ageNow, nowYear), ageNow);
  let bal = preTaxNow;
  // walk row 9: the SAME growth step every projection uses — no schedule-only clamp, no inline math
  const { growOneYear } = require('../retirement');
  const r = Math.max(0, expReturn || 0);
  for (let age = ageNow; age < startAge; age++) bal = growOneYear(bal, r);   // grow to the start year
  for (let i = 0; i < years; i++) {
    const age = startAge + i;
    const amount = rmdAtAge(bal, age);
    rows.push({ age, year: nowYear + (age - ageNow), projectedPreTax: Math.round(bal), divisor: rmdDivisorAtAge(age), amount, isCurrent: age === ageNow });
    bal = Math.max(0, growOneYear(bal - amount, r));
  }
  return rows;
}

/** Withdrawals already taken THIS year from the pre-tax accounts (the one ledger — no side lists).
 *  Counts WITHDRAWAL rows whose account is in the pre-tax bucket, dated this calendar year. */
/* ─ MK-PL-F-009 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * rmdTakenThisYear
 *
 * Answers ..... Withdrawals already taken THIS year from the pre-tax accounts (the one ledger — no side lists).
 *
 * Formula .....
 *     ids = a list with no repeats of for each of pre tax account ids: string
 *
 * Called by ... MK-PL-F-027 nextDecision
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-PL-F-027 nextDecision
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-009 transaction date
 *               MK-XS-I-024 logged expenses
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-009
 * Changed ..... 2026-07-14 (0cbdfee)
 */
export function rmdTakenThisYear(transactions: { type?: string; account_id?: string; amount?: number; date?: string }[], preTaxAccountIds: string[], nowYear = new Date().getFullYear()): number {
  const ids = new Set(preTaxAccountIds.map(String));
  return ((transactions ?? [])
    .filter((t) => t.type === 'WITHDRAWAL' && ids.has(String(t.account_id)) && String(t.date ?? '').startsWith(String(nowYear)))
    // the one rule for a stored amount (moneyIntoAccount, 2026-10-21): a reversed withdrawal cancels, never adds
    .reduce((s, t) => s - (moneyIntoAccount(t) ?? 0), 0));
}

// ── the draw-order steer sheet's comparator (design r50) ───────────────────────────────────
// Deterministic bucket-by-bucket depletion with the assumptions stated, no Monte-Carlo cosplay:
// each year the expenses gap (spend − guaranteed) is drawn from the buckets in the given order;
// pre-tax draws are grossed up by the ordinary rate, taxable draws by the capital-gains rate on
// the gain share; cash and Roth draw tax-free. Balances grow at a REAL return (inflation already
// removed), so dollars stay today-sized. From 73 the law forces the RMD out of pre-tax first —
// spent toward the need, any excess moved (after tax) into the taxable bucket.
/** totalTaxes is null — with `unknown` saying why — when the tax on a draw cannot be calculated
 *  from the person's own data (founder rule rule R2 / brief Q-43 (2026-08-20): an unknown input gives no number, never a default). */
export interface DrawOutcome { lastsToAge: number | null; totalTaxes: number | null; unknown?: string }
/** If the draw came from the accounts in this order, how long would the money last and what tax would it cost? */
/* ─ MK-PL-F-010 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * drawOrderOutcome
 *
 * Answers ..... If the draw came from the accounts in this order, how long would the money last and what tax would it cost?
 *
 * Formula .....
 *     gross-up per bucket: cash 0 · Roth 0 · pre-tax = the person's ordinary rate · taxable = the person's capital-gains rate × the gain share of their taxable holdings
 *     UNKNOWN (no answer, with the reason) when the gain share is not known and there is a taxable balance to draw
 *     need each year = max(0, expenses − guaranteed income)
 *     for each age from today to the horizon:
 *         at the required-withdrawal age: take the required amount from pre-tax first, tax it at the ordinary rate, use the net towards the need, reinvest any excess in taxable
 *         then walk the buckets in the given order: gross needed = need ÷ (1 − rate); take = min(balance, gross needed); tax = take × rate; need −= take − tax
 *         need still > 0 → the money ran out this year: lasts to age = this age
 *         every bucket grows at the real return (never below −5%)
 *     total taxes = Σ tax, to the cent; lasts to age = nothing when it survives the whole horizon
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · If gain share is missing it uses 0.
 *     · Uses a built-in taxes of 0.
 *     · Never lets real growth fall below -0.05.
 *     · NO built-in tax rates (founder ruling 2026-09-08, second verification G6; rule R2/brief Q-43 (2026-08-20)): the caller hands in the person's own marginal ordinary rate (MK-CF-F-103) and long-term gains rate (MK-CF-F-104), and the gain share of their taxable holdings (MK-PL-F-081); unknown gain share with a taxable balance → no answer, with the reason.
 *     · Balances grow at the real return, floored at −5% a year.
 *     · The required withdrawal is taken first from the year it applies (MK-PL-F-007).
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-010
 * Changed ..... 2026-07-14 (0cbdfee)
 */
export function drawOrderOutcome(
  split: BucketSplit,
  order: DrawBucket[],
  o: { age: number; horizon: number; spendAnnual: number; guaranteedAnnual: number; realGrowth: number; ordinaryRate: number; capGainsRate: number; gainShare: number | null },
): DrawOutcome {
  if (o.gainShare == null && split.taxable > 0) {
    return { lastsToAge: null, totalTaxes: null, unknown: 'no cost basis is recorded for your taxable holdings, so the tax on drawing them cannot be calculated' };
  }
  const ord = o.ordinaryRate, cg = o.capGainsRate * (o.gainShare ?? 0);
  const grossUp: Record<DrawBucket, number> = { cash: 0, taxable: cg, preTax: ord, roth: 0 };
  const bal: Record<DrawBucket, number> = { cash: split.cash, taxable: split.taxable, preTax: split.preTax, roth: split.roth };
  let taxes = 0;
  const need0 = Math.max(0, o.spendAnnual - o.guaranteedAnnual);
  if (need0 <= 0) return { lastsToAge: null, totalTaxes: 0 };
  for (let age = o.age; age <= o.horizon; age++) {
    let need = need0;
    if (age >= rmdStartAgeFor(o.age) && bal.preTax > 0) {
      const rmd = rmdAtAge(bal.preTax, age);
      const take = Math.min(rmd, bal.preTax);
      bal.preTax -= take;
      const tax = take * ord; taxes += tax;
      const net = take - tax;
      const toNeed = Math.min(net, need); need -= toNeed;
      bal.taxable += net - toNeed;                    // excess RMD reinvested after tax
    }
    for (const b of order) {
      if (need <= 0.005) break;
      if (bal[b] <= 0) continue;
      const rate = grossUp[b];
      const grossNeeded = need / (1 - rate);
      const take = Math.min(bal[b], grossNeeded);
      bal[b] -= take;
      const tax = take * rate; taxes += tax;
      need -= take - tax;
    }
    if (need > 0.005) return { lastsToAge: age, totalTaxes: (taxes) };
    (Object.keys(bal) as DrawBucket[]).forEach((b) => { bal[b] = bal[b] * (1 + Math.max(-0.05, o.realGrowth)); });
  }
  return { lastsToAge: null, totalTaxes: (taxes) };   // survives the whole horizon
}

/** What share of the person's taxable holdings is unrealised gain? */
/* ─ MK-PL-F-081 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * taxableGainShare
 *
 * Answers ..... What share of the person's taxable holdings is unrealised gain?
 *
 * Formula .....
 *     over every holding in a TAXABLE account that has a price (the broker's mark, else the price feed): value += market value(holding, price) · basis += cost basis(holding)
 *     nothing   when value ≤ 0 (no priced taxable holding)
 *     the answer = min(1, max(0, (value − basis) ÷ value))
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-005 holding price
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *
 * Decides .....
 *     · A holding with no price is left out; no priced taxable holding at all → nothing, never a guessed 50% (founder ruling 2026-09-08, G6).
 *     · A loss overall counts as a 0% gain share (no tax on drawing at a loss), never negative.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-081
 * Changed ..... not in git yet (—)
 */
export function taxableGainShare(accounts: AssetAccount[], priceOf: (ticker: string) => number | null): number | null {
  let value = 0, basis = 0;
  for (const a of accounts ?? []) {
    // THE SAME TAXABLE MONEY AS THE SPLIT (DEC-4105, 2026-10-10, tenet 4): an account with no tax type is taxable in the
    // split, so its gains count here too — it used to read only accounts stored Taxable, leaving that money taxed with no gain.
    if (splitBucketOf(a) !== 'taxable') continue;
    for (const p of a.positions ?? []) {
      const price = p.last_price ?? priceOf(p.ticker);
      if (price == null) continue;
      // a holding whose worth or cost is not on record makes the share unknown — never a $0 cost (tenet 3; outside review Claude Performance, 2026-10-11)
      // WHAT WAS PAID IS READ ONE WAY (paidOnRecord, 2026-10-21): the gain is taken over the purchases whose price paid is on
      // record — their value today against what was paid for them — as the Holding page's gain is. costBasis read a stored $0
      // as a real $0, so 10 shares at $100 and 10 saved at $0, today $120, read a gain share of 58.33% ($1,400 of $2,400)
      // where the page shows $200 of $1,200, 16.67%; and one purchase with no price paid made the whole share unknown.
      const mv = marketValue(p, price), paid = paidOnRecord(p);
      if (mv == null || paid.paid == null || paid.counted == null) return null;
      value += paid.counted * price * contractMultiplier(p);
      basis += paid.paid;
    }
  }
  if (value <= 0) return null;
  return Math.min(1, Math.max(0, (value - basis) / value));
}
