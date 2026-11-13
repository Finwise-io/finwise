// THE PROFILE MERGES ITEM BY ITEM, BY TIME STAMP (design v02 of the cloud copy of the master record, 2026-11-12, R8–R11,
// R15, R17, R18). "The profile" = what the cloud keeps beside the record: accounts, budget, plan.
//
// · Each setting, each list item with an id and each dated entry is one ITEM, with the time it last changed (its stamp).
// · The phone keeps a list of its UNSAVED CHANGES (item → time and value). A save, and each start, merges: an item this phone
//   changed later than the cloud's stamp keeps the phone's value; every other item is the cloud's (R8).
// · Both sides changed one item: the later counts, the other is kept in a note (R9).
// · A deletion is a stamped change; its marker is dropped after 180 days (R10).
// · An item with no stamp (written before this change) is older than any stamped change (R18).
//
// Everything here is pure: the cloud transaction (services/firebase saveUserData) and the app's root call it.

/** The fields synced to the cloud's profile. R17: the account holder's choices and setup answers join it; the old activity
 *  list, the daily values and what the phone works out again stay on the phone (the record carries them). */
export const SYNC_FIELDS = [
  'onboardingComplete', 'selectedGoals', 'budgetFrequency', 'payFrequency',
  'budgetCategories', 'expenseTargetType', 'expenseTargetAmount',
  'expenseTargetPercent', 'savingsDistribution', 'retirementPlan',
  'incomes', 'expenses', 'savings', 'investments', 'goals', 'badges',
  'recurringIncomes', 'recurringExpenses', 'customCategories',
  'assetAccounts', 'liabilities', 'nwSeeded', 'snaptradeConnections', 'wrapperConfirmQueue', 'nwSetupChoice', 'allocatedByMonth', 'allocPromptSkipped', 'monthlySnapshots', 'nwDaily', 'retirementAssumptions', 'retirementScenarios', 'bigCosts', 'benchmarkReturns', 'estatePlan',
  'currency', 'locale',
  'xp', 'streak', 'lastCheckIn', 'monthlyBudgetTarget', 'hourlyRate',
  'jobRiskLevel', 'emergencyMonths', 'onboardingPaused', 'onboardingProfile',
  // the cash on hand typed on the Bill calendar, with its day (DEC-8371, workplan row 363, 2026-10-27, FX-CF-A)
  'billCalendarStart',
  // R17 (design v02, 2026-11-12): added to the profile
  'planHistory', 'dismissedInsights', 'knownPayees',
  'goalsSeeded', 'employmentStatus',
  'milestoneHighSeen', 'transitionChecks', 'drawOrder', 'lensOverride',
] as const;

/** R17: fields that stay on the phone only (the record carries them, or they are calculated again, or they are the phone's). */
export const PHONE_ONLY_FIELDS = [
  'transactions', 'snapshotDays', 'invDaily',
  'txnFlags', 'lastRetireChance',
  'snaptradeActivityCursor', 'snaptradeLastSyncAt', 'snaptradeSeenKeys',
  'rebuiltFrom', 'rebuiltAt', 'syncFailures', 'priceCache', 'pricesFetchedAt', 'assetRecordFaults', 'debts', 'onboardingDraft',
] as const;

/** Copies the fields the cloud keeps in the profile out of the phone, leaving out any field with no value, because the cloud refuses one. */
/* ─ MK-XS-F-289 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * pickSyncFields
 *
 * Answers ..... Copies the fields the cloud keeps in the profile out of the phone, leaving out any field with no value, because the cloud refuses one.
 *
 * Formula .....
 *     out = {}
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *               MK-XS-I-026 big costs (amount and year)
 *               MK-XS-I-027 goals (target, saved, date)
 *               MK-XS-I-031 daily and monthly snapshots
 *
 * Decides .....
 *     · Uses a built-in d e l e t i o n k e e p d a y s of 180.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-289
 * Changed ..... not in git yet (—)
 */
export function pickSyncFields(state: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const key of SYNC_FIELDS) out[key] = state[key];
  return JSON.parse(JSON.stringify(out));   // the cloud refuses undefined values
}

/** R8: lists of words merge as sets. */
const SET_LISTS = new Set(['selectedGoals', 'wrapperConfirmQueue']);
/** R8: entries keyed by a day or a month, each its own item. */
const DATED_MAPS = new Set(['allocatedByMonth', 'allocPromptSkipped', 'monthlySnapshots', 'nwDaily']);
/** R10: deletion markers older than this are dropped. */
export const DELETION_KEEP_DAYS = 180;

type Kind = 'whole' | 'set' | 'id-list' | 'dated-list' | 'dated-map';
/** R8: lists whose items carry an id, each item its own (where an item lacks an id, the list is one item). */
const ID_LISTS = new Set(['budgetCategories', 'incomes', 'expenses', 'savings', 'investments', 'goals', 'badges',
  'recurringIncomes', 'recurringExpenses', 'customCategories', 'assetAccounts', 'liabilities', 'snaptradeConnections',
  'retirementScenarios', 'bigCosts']);
/** The id a list item carries, read from its id or its asset id; nothing when the item has neither. */
/* ─ MK-XS-F-290 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * idOf
 *
 * Answers ..... The id a list item carries, read from its id or its asset id; nothing when the item has neither.
 *
 * Formula .....
 *     id (or asset id (or nothing when missing) when missing)   if x and typeof x = 'object'
 *     nothing   otherwise
 *
 * Called by ... MK-XS-F-253 giveBackField · MK-XS-F-291 kindOf
 *               MK-XS-F-292 entriesOf
 *
 * Reaches ..... 10 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-292 entriesOf · MK-XS-F-253 giveBackField
 *               MK-XS-F-254 giveBackSetAside · MK-XS-F-293 itemsOf
 *               MK-XS-F-291 kindOf · MK-XS-F-298 mergeProfile
 *               MK-XS-F-073 saveUserData · MK-XS-F-299 settleSync
 *               MK-XS-F-295 startSync · MK-XS-F-296 trackChanges
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-290
 * Changed ..... not in git yet (—)
 */
const idOf = (x: any): string | null => (x && typeof x === 'object' ? (x.id ?? x.asset_id ?? null) : null);

/** How one profile field merges: as a set of words, a dated list, entries keyed by day or month, a list of items with ids, or as one whole item. */
/* ─ MK-XS-F-291 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * kindOf
 *
 * Answers ..... How one profile field merges: as a set of words, a dated list, entries keyed by day or month, a list of items with ids, or as one whole item.
 *
 * Formula .....
 *     'set'   when SET_LISTS.has(field) and (v = nothing or array.is array(v))
 *     'dated − list'   when field = 'planHistory' and (v = nothing or array.is array(v))
 *     'dated − map'   when DATED_MAPS.has(field) and (v = nothing or (typeof v = 'object' and !array.is array(v)))
 *     'id − list'   when ID_LISTS.has(field) and (v = nothing or (array.is array(v) and every((x) => id of(x) ≠ nothing)))
 *     'whole'
 *
 * Called by ... MK-XS-F-292 entriesOf · MK-XS-F-298 mergeProfile
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-292 entriesOf · MK-XS-F-293 itemsOf
 *               MK-XS-F-298 mergeProfile · MK-XS-F-073 saveUserData
 *               MK-XS-F-299 settleSync · MK-XS-F-295 startSync
 *               MK-XS-F-296 trackChanges
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-291
 * Changed ..... not in git yet (—)
 */
function kindOf(field: string, v: any): Kind {
  if (SET_LISTS.has(field) && (v == null || Array.isArray(v))) return 'set';
  if (field === 'planHistory' && (v == null || Array.isArray(v))) return 'dated-list';
  if (DATED_MAPS.has(field) && (v == null || (typeof v === 'object' && !Array.isArray(v)))) return 'dated-map';
  if (ID_LISTS.has(field) && (v == null || (Array.isArray(v) && v.every((x) => idOf(x) != null)))) return 'id-list';
  return 'whole';
}

/** One field's items, in order: [item key, value]. A whole field is one item named by the field. */
/* ─ MK-XS-F-292 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * entriesOf
 *
 * Answers ..... One field's items, in order: [item key, value].
 *
 * Formula .....
 *     []   when v = undefined
 *
 * Called by ... MK-XS-F-293 itemsOf · MK-XS-F-298 mergeProfile
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-293 itemsOf · MK-XS-F-298 mergeProfile
 *               MK-XS-F-073 saveUserData · MK-XS-F-299 settleSync
 *               MK-XS-F-295 startSync · MK-XS-F-296 trackChanges
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-292
 * Changed ..... not in git yet (—)
 */
function entriesOf(field: string, v: any, kind: Kind = kindOf(field, v)): [string, any][] {
  if (v === undefined) return [];
  switch (kind) {
    case 'set': return (v ?? []).map((w: any) => [`${field}#${String(w)}`, w]);
    case 'dated-list': return (v ?? []).map((e: any) => [`${field}#${e?.date ?? ''}|${e?.label ?? ''}`, e]);
    case 'dated-map': return Object.keys(v ?? {}).map((d) => [`${field}@${d}`, v[d]]);
    case 'id-list': return v.map((x: any) => [`${field}#${String(idOf(x))}`, x]);
    default: return [[field, v]];
  }
}

/** Every item of a profile: item key → value. */
/* ─ MK-XS-F-293 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * itemsOf
 *
 * Answers ..... Every item of a profile: item key → value.
 *
 * Formula .....
 *     out = new map<string, any>()
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-XS-F-295 startSync · MK-XS-F-296 trackChanges
 *               MK-XS-F-299 settleSync
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-299 settleSync · MK-XS-F-295 startSync
 *               MK-XS-F-296 trackChanges
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-293
 * Changed ..... not in git yet (—)
 */
export function itemsOf(profile: Record<string, any>): Map<string, any> {
  const out = new Map<string, any>();
  for (const f of SYNC_FIELDS) for (const [k, v] of entriesOf(f, profile?.[f])) out.set(k, v);
  return out;
}

/** A value written out the same way whatever order its keys were set in. */
/* ─ MK-XS-F-294 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * stableJson
 *
 * Answers ..... A value written out the same way whatever order its keys were set in.
 *
 * Formula .....
 *     'undefined'   when v = undefined
 *     JSON.stringify(v)   when v = nothing (or v is not a object when missing or zero)
 *     '[' + map(stable json).join(',') + ']'   when array.is array(v)
 *     '{' + object.keys(v).filter((k) => v[k] ! = undefined).sort().map((k) => JSON.stringify(k) + ':' + stable json(v[k])).join(',') + '}'
 *
 * Called by ... MK-XS-F-295 startSync · MK-XS-F-296 trackChanges
 *               MK-XS-F-298 mergeProfile · MK-XS-F-299 settleSync
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-298 mergeProfile · MK-XS-F-073 saveUserData
 *               MK-XS-F-299 settleSync · MK-XS-F-295 startSync
 *               MK-XS-F-296 trackChanges
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-294
 * Changed ..... not in git yet (—)
 */
export function stableJson(v: any): string {
  if (v === undefined) return 'undefined';
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(stableJson).join(',') + ']';
  return '{' + Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + stableJson(v[k])).join(',') + '}';
}

/** The stamps a profile carries in the cloud: item → when it last changed; `deletions`: item → when it was deleted. */
export interface ProfileStamps { [item: string]: any; deletions?: Record<string, string> }
/** One unsaved change on this phone: when, and the value (`deleted` where the item was taken away). */
export interface PendingChange { at: string; value?: any; deleted?: boolean }
/** R9: the value that lost, shown in a note. */
export interface MergeNote { item: string; kept: any; other: any; otherAt: string | null; at: string;
  /** when the kept value was set, and `lost` where it is this phone's change that was not kept: the note the person sees
   *  (two-phone change note v01, 2026-11-12) sits on that phone only; `answered` is the person's Keep / Change */
  keptAt?: string | null; lost?: boolean; answered?: 'keep' | 'change' }
/** What the phone keeps of its profile's sync, for one data owner: the items as last agreed with the cloud (written out), its
 *  unsaved changes, and the notes of values that lost. */
export interface ProfileSync { owner: string; base: Record<string, string>; pending: Record<string, PendingChange>; notes: MergeNote[] }

/** R18: a phone with no list of unsaved changes starts an empty one — what it holds now is taken as agreed. */
/* ─ MK-XS-F-295 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * startSync
 *
 * Answers ..... R18: a phone with no list of unsaved changes starts an empty one — what it holds now is taken as agreed.
 *
 * Formula .....
 *     base = {}
 *     the answer:
 *     owner = owner
 *     base = base
 *     pending = {}
 *     notes = []
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-295
 * Changed ..... not in git yet (—)
 */
export function startSync(owner: string, profile: Record<string, any>): ProfileSync {
  const base: Record<string, string> = {};
  for (const [k, v] of itemsOf(profile)) base[k] = stableJson(v);
  return { owner, base, pending: {}, notes: [] };
}

/** Note what changed on the phone since the last look: every item that differs from what was agreed with the cloud becomes an
 *  unsaved change stamped `at` (an item changed again gets the later time; an item changed back drops out). */
/* ─ MK-XS-F-296 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * trackChanges
 *
 * Answers ..... Note what changed on the phone since the last look: every item that differs from what was agreed with the cloud becomes an unsaved change stamped `at` (an item changed again gets the later time; an item changed back drops out).
 *
 * Formula .....
 *     now = items of(profile)
 *     pending = { ...sync.pending }
 *     changed = false
 *     keys = new set<string>([...now.keys(), ...object.keys(sync.base), ...object.keys(pending)])
 *     has = now.has(k)
 *     cur = stable json(now.get(k))   if has
 *     nothing   otherwise
 *     base = sync.base[k]   if k in sync.base
 *     nothing   otherwise
 *     p = pending[k]
 *     p cur = nothing   if deleted
 *     stable json(value)   otherwise   if p
 *     undefined   otherwise
 *     the answer:
 *     { ...sync, pending }   if changed
 *     sync   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-296
 * Changed ..... not in git yet (—)
 */
export function trackChanges(sync: ProfileSync, profile: Record<string, any>, at: string): ProfileSync {
  const now = itemsOf(profile);
  const pending: Record<string, PendingChange> = { ...sync.pending };
  let changed = false;
  const keys = new Set<string>([...now.keys(), ...Object.keys(sync.base), ...Object.keys(pending)]);
  for (const k of keys) {
    const has = now.has(k);
    const cur = has ? stableJson(now.get(k)) : null;
    const base = k in sync.base ? sync.base[k] : null;
    const p = pending[k];
    if (cur === base) { if (p) { delete pending[k]; changed = true; } continue; }
    const pCur = p ? (p.deleted ? null : stableJson(p.value)) : undefined;
    if (p && pCur === cur) continue;   // the same change, already stamped
    pending[k] = has ? { at, value: JSON.parse(JSON.stringify(now.get(k))) } : { at, deleted: true };
    changed = true;
  }
  return changed ? { ...sync, pending } : sync;
}

/** The moment a time stamp names, in milliseconds; a missing stamp counts as earlier than any stamped change. */
/* ─ MK-XS-F-297 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * t
 *
 * Answers ..... The moment a time stamp names, in milliseconds; a missing stamp counts as earlier than any stamped change.
 *
 * Formula .....
 *     date.parse(s)   if s
 *     -infinity   otherwise
 *
 * Called by ... MK-CF-F-002 plannedMonthlySpend · MK-CF-F-005 actualMonthFlow
 *               MK-CF-F-007 nonMonthlyBasis · MK-CF-F-012 annualCashflow
 *               MK-CF-F-013 budgetFromOnboarding · MK-CF-F-019 upcomingBills
 *               MK-CF-F-024 totalDebtMonthly · MK-CF-F-025 minimumDebtService
 *               MK-CF-F-027 totalDebtBalance · MK-CF-F-034 payoffPlan
 *               MK-CF-F-036 buildDebtState · MK-CF-F-045 grossAnnualBaseline
 *               MK-CF-F-046 employerMatchAnnual · MK-CF-F-049 buildIncomeState
 *               MK-CF-F-066 rsuAnnual · MK-CF-F-068 rentalNetAnnual
 *               MK-CF-F-075 retirementIncomeMonthly · MK-CF-F-079 incomeFromOnboarding
 *               MK-CF-F-082 salaryAnnual · MK-CF-F-083 totalGrossAnnual
 *               MK-CF-F-084 taxableAnnual · MK-CF-F-092 incomeMonthlyGrid
 *               MK-CF-F-107 buildPaycheckYear · MK-CF-F-108 isMoneyOut
 *               MK-CF-F-109 reviewTransactions · MK-CF-F-111 applyTransaction
 *               MK-CF-F-114 undoSnapshot · MK-CF-F-116 inverseOf
 *               MK-CF-F-118 cashEffect · MK-CF-F-119 investmentIncomeAnnual
 *               MK-CF-F-120 pctBaseMonthly · MK-CF-F-138 addLot
 *               MK-CF-F-139 removeShares · MK-CF-F-143 annualisedGross
 *               MK-CF-F-144 takeHomeAsEntered · MK-CF-F-151 actualSpending
 *               MK-CF-F-156 plannedMonthFlow · MK-CF-F-175 sumOverEarners
 *               MK-CF-F-176 sumMonthsOverEarners · MK-CF-F-181 rateInForce
 *               MK-CF-F-183 paidOutByAccount · MK-CF-F-184 incomeFromAccounts
 *               MK-CF-F-188 householdPreTaxContributionsAnnual · MK-CF-F-189 essentialsFromLoggedSpending
 *               MK-CF-F-220 pastMonthFlow · MK-CF-F-230 taxedAfterPreTax
 *               MK-CF-F-231 addedAfterRecord · MK-CF-F-233 earnerWageShares
 *               MK-CF-F-234 wagesLandingByMonth · MK-CF-F-250 guaranteedReceivedNow
 *               MK-CF-F-255 spendByMonthByCategory · MK-CF-F-260 householdEmployerMatchAnnual
 *               MK-CF-F-264 interestAndDividendsForYear · MK-CF-F-269 landsOnceInYear
 *               MK-CF-F-274 taxedSourcesAnnual · MK-CF-F-288 openingRecordsHeld
 *               MK-CF-F-289 purchaseRecordsFollowEdit · MK-CF-F-290 purchaseRecordsAfterHoldingRemoved
 *               MK-CF-F-291 purchaseRecordsFollowReimport · MK-CF-F-292 optionTradesOnTheWayIn
 *               MK-CF-O-001 basePay · MK-CF-O-002 expenses
 *               MK-CF-O-004 incomeSummary · MK-CF-O-010 theMonth
 *               MK-CF-O-017 futurePaycheck · MK-CF-O-018 theDebts
 *               MK-CF-O-020 theBudgetCounted · MK-HM-F-003 milestoneFloor
 *               MK-NW-F-002 alternativesSummary · MK-NW-F-004 portfolioActualReturn
 *               MK-NW-F-016 cashTotal · MK-NW-F-025 accountDisplayName
 *               MK-NW-F-027 accountClassBreakdown · MK-NW-F-033 retirementEarmarkedValue
 *               MK-NW-F-035 blendedVolatility · MK-NW-F-037 blendedReturn
 *               MK-NW-F-039 buildAssetsState · MK-NW-F-048 uberGroupRows
 *               MK-NW-F-049 itemizedTotal · MK-NW-F-061 bondSummary
 *               MK-NW-F-062 couponIncomeAnnual · MK-NW-F-063 interestIncomeAnnual
 *               MK-NW-F-066 sumWhere · MK-NW-F-069 priceAtYield
 *               MK-NW-F-084 categoryEarnings · MK-NW-F-107 propertyUses
 *               MK-NW-F-113 altPartsOf · MK-NW-F-129 gainRowName
 *               MK-NW-F-141 holdingBondFacts · MK-NW-F-142 classReturnOf
 *               MK-NW-F-143 gainRowBetween · MK-NW-F-151 linkedSplit
 *               MK-NW-F-167 COMPARE · MK-NW-F-168 holdingRowsIn
 *               MK-NW-F-172 classValueOf · MK-NW-F-180 barSegments
 *               MK-NW-F-181 barDrawnWidths · MK-NW-F-183 accountsInClasses
 *               MK-NW-F-199 fileToRecord · MK-NW-F-217 transactionRow
 *               MK-NW-F-223 openingRow · MK-NW-F-224 typedChangeToRecord
 *               MK-NW-F-226 fileValues · MK-NW-F-228 moveOldCopies
 *               MK-NW-F-231 instantOf · MK-NW-F-242 valueBatchesOf
 *               MK-NW-F-247 valuesThatDiffer · MK-NW-F-252 walkHolding
 *               MK-NW-F-253 openPurchases · MK-NW-F-254 sharesTakenBy
 *               MK-NW-F-255 soldBeyondRecord · MK-NW-F-256 salesNeedingAnAnswer
 *               MK-NW-F-257 typedSalesTheListContradicts · MK-NW-F-262 sharesOnRecord
 *               MK-NW-F-263 sharesThatDisagree · MK-NW-F-277 purchasesFromList
 *               MK-NW-F-278 answerListQuestion · MK-NW-F-282 removeRow
 *               MK-NW-F-286 dayOfInstant · MK-NW-F-314 listNamesTheSoldLot
 *               MK-NW-F-319 listQuestionToAsk · MK-NW-F-340 oneQuestionPerExercise
 *               MK-NW-F-345 accountWalksShown · MK-NW-F-356 optionOfLine
 *               MK-NW-F-361 valueToday · MK-NW-F-365 accountReadOut
 *               MK-NW-F-372 transactionsReadOut · MK-NW-F-375 invDailyReadOut
 *               MK-NW-F-379 lotsSummary · MK-NW-F-381 readOutDifferences
 *               MK-NW-F-383 keepActivityIds · MK-NW-F-385 screensReadTheRecord
 *               MK-NW-F-400 choiceMakes · MK-NW-F-419 fileLessRecordedTrades
 *               MK-NW-O-002 theAccount · MK-NW-O-003 theNetWorth
 *               MK-NW-O-005 theAlternativesOutlook · MK-NW-O-006 theHolding
 *               MK-NW-O-008 thePerformance · MK-PF-F-014 buildPerformance
 *               MK-PF-F-015 topHoldingConcentration · MK-PF-F-020 portfolioBenchReturn
 *               MK-PF-F-028 realizedFromLedger · MK-PF-F-047 isIndividualBondOrCD
 *               MK-PF-F-048 bondInterestInWindow · MK-PF-F-071 returnSplitAtPurchases
 *               MK-PF-F-072 tradesAfter · MK-PF-F-074 marketSplitAtPurchases
 *               MK-PF-F-075 soldOutPositions · MK-PL-F-009 rmdTakenThisYear
 *               MK-PL-F-016 availableToSaveSummary · MK-PL-F-026 planDoor
 *               MK-PL-F-031 taxOrganizer · MK-PL-F-036 weighGoals
 *               MK-PL-F-050 simulate · MK-PL-F-052 withSsStream
 *               MK-PL-F-055 projectNestEgg · MK-PL-F-067 willItLastInputs
 *               MK-PL-F-098 goalsCapacity · MK-ST-F-001 looksFixedIncome
 *               MK-ST-F-010 nameEvidence · MK-ST-F-021 toNumber
 *               MK-ST-F-028 buildDayFromAccounts · MK-ST-F-036 reconcile
 *               MK-ST-F-071 rebuildableFrom · MK-ST-F-072 undo
 *               MK-ST-F-073 rebuildDays · MK-ST-F-081 timeWeightedReturn
 *               MK-ST-F-082 movementsOf · MK-ST-F-085 rentFigure
 *               MK-ST-F-086 brokerClassOf · MK-ST-F-088 moneyIntoAccount
 *               MK-ST-F-089 amountNotOnRecord · MK-XS-F-002 dataGaps
 *               MK-XS-F-004 buildDatedGrid · MK-XS-F-027 takeHomeMonthly
 *               MK-XS-F-029 monthlySavings · MK-XS-F-030 effectiveAnnualContribution
 *               MK-XS-F-031 buildSnapshot · MK-XS-F-083 fetchPriceSeries
 *               MK-XS-F-102 ingestSync · MK-XS-F-107 mapActivityType
 *               MK-XS-F-110 netCashSleeve · MK-XS-F-114 usdCash
 *               MK-XS-F-115 shouldDailySync · MK-XS-F-116 runSnapTradeSync
 *               MK-XS-F-127 toIsoDate · MK-XS-F-128 cleanTicker
 *               MK-XS-F-143 yahooSymbol · MK-XS-F-174 recomputeBalances
 *               MK-XS-F-184 theirCost · MK-XS-F-186 holdingName
 *               MK-XS-F-187 fixStoredMoney · MK-XS-F-188 fixStoredFees
 *               MK-XS-F-193 walkShown · MK-XS-F-194 partsShown
 *               MK-XS-F-199 profileOnTheWayIn · MK-XS-F-219 importedAccountOf
 *               MK-XS-F-298 mergeProfile · MK-XS-F-303 renameInside
 *               MK-XS-F-313 stampMillis · MK-XS-F-320 typedValueDatedByDays
 *
 * Reaches ..... 762 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 744 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-297
 * Changed ..... not in git yet (—)
 */
const t = (s: string | null | undefined) => (s ? Date.parse(s) : -Infinity);

/** R8–R10, R18: merge the cloud's profile with this phone's unsaved changes. The cloud's value counts for every item, except
 *  where this phone changed it later than the cloud's stamp (no stamp: older than any stamped change). Both changed one item:
 *  the later counts, the other goes in a note (R9). Deletion markers older than 180 days are dropped (R10). */
/* ─ MK-XS-F-298 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * mergeProfile
 *
 * Answers ..... R8–R10, R18: merge the cloud's profile with this phone's unsaved changes.
 *
 * Formula .....
 *     stamps = { ...(cloud stamps ?? {}) }
 *     deletions = { ...(cloud stamps.deletions ?? {}) }
 *     notes = []
 *     phone won = []
 *     profile = {}
 *     cv = cloud.[f]
 *     pend = the names in sync.pending where each = f (or starts with(f + '#') (or starts with(f + '@') when missing or zero) when missing or zero)
 *     kind = kind of(f, cv)   if cv ! = undefined
 *     'whole'   if pend.includes(f)
 *     kind of(f, undefined)   otherwise   otherwise
 *     cloud entries = entries of(f, cv, kind)
 *     cloud vals = a lookup of cloud entries
 *     order = for each of cloud entries: ([k]) => k
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-XS-F-073 saveUserData
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-073 saveUserData
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-298
 * Changed ..... not in git yet (—)
 */
export function mergeProfile(cloud: Record<string, any> | null, cloudStamps: ProfileStamps | null | undefined,
  sync: Pick<ProfileSync, 'base' | 'pending'>, at: string):
  { profile: Record<string, any>; stamps: ProfileStamps; notes: MergeNote[]; phoneWon: string[] } {
  const stamps: ProfileStamps = { ...(cloudStamps ?? {}) };
  const deletions: Record<string, string> = { ...(cloudStamps?.deletions ?? {}) };
  delete stamps.deletions;
  const notes: MergeNote[] = [];
  const phoneWon: string[] = [];
  const profile: Record<string, any> = {};
  for (const f of SYNC_FIELDS) {
    const cv = cloud?.[f];
    const pend = Object.keys(sync.pending).filter((k) => k === f || k.startsWith(f + '#') || k.startsWith(f + '@'));
    const kind: Kind = cv !== undefined ? kindOf(f, cv) : pend.includes(f) ? 'whole' : kindOf(f, undefined);
    const cloudEntries = entriesOf(f, cv, kind);
    const cloudVals = new Map(cloudEntries);
    const order = cloudEntries.map(([k]) => k);
    for (const k of pend) if (!order.includes(k) && (kind === 'whole') === (k === f)) order.push(k);
    const kept: [string, any][] = [];
    for (const k of order) {
      const cloudHas = cloudVals.has(k);
      const cloudAt: string | null = (stamps[k] as string) ?? deletions[k] ?? null;
      const p = sync.pending[k];
      if (p && t(p.at) > t(cloudAt)) {
        // R9: the cloud changed it too since this phone last agreed with it — the phone's later value counts, the cloud's is noted
        const cloudNow = cloudHas ? stableJson(cloudVals.get(k)) : null;
        if (cloudAt != null && cloudNow !== (sync.base[k] ?? null)) notes.push({ item: k, kept: p.deleted ? null : p.value, other: cloudHas ? cloudVals.get(k) : null, otherAt: cloudAt, at });
        phoneWon.push(k);
        if (p.deleted) { deletions[k] = p.at; delete stamps[k]; }
        else { kept.push([k, p.value]); stamps[k] = p.at; delete deletions[k]; }
      } else {
        // the cloud's value counts; a change of this phone's that lost is noted (R9)
        if (p) notes.push({ item: k, kept: cloudHas ? cloudVals.get(k) : null, other: p.deleted ? null : p.value, otherAt: p.at, at, keptAt: cloudAt, lost: true });
        if (cloudHas) kept.push([k, cloudVals.get(k)]);
      }
    }
    if (kind === 'whole') { if (kept.length) profile[f] = kept[0][1]; continue; }
    if (cv === undefined && !kept.length) continue;
    if (kind === 'dated-map') profile[f] = Object.fromEntries(kept.map(([k, v]) => [k.slice(f.length + 1), v]));
    else profile[f] = kept.map(([, v]) => v);
  }
  // R10: markers kept 180 days
  const cutoff = t(at) - DELETION_KEEP_DAYS * 86400000;
  for (const [k, when] of Object.entries(deletions)) if (t(when) < cutoff) delete deletions[k];
  return { profile, stamps: { ...stamps, deletions }, notes, phoneWon };
}

/** After a save, or a load that merged: what was agreed with the cloud is the merged profile; the unsaved changes that went
 *  into it are done (a change made while the save ran stays). Notes are kept, newest last, at most 50. */
/* ─ MK-XS-F-299 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * settleSync
 *
 * Answers ..... After a save, or a load that merged: what was agreed with the cloud is the merged profile; the unsaved changes that went into it are done (a change made while the save ran stays).
 *
 * Formula .....
 *     base = {}
 *     pending = {}
 *     u = used[k]
 *     the answer:
 *     ...sync = ...sync
 *     base = base
 *     pending = pending
 *     notes = [...sync.notes, ...notes].slice(-50)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-299
 * Changed ..... not in git yet (—)
 */
export function settleSync(sync: ProfileSync, agreed: Record<string, any>, used: Record<string, PendingChange>, notes: MergeNote[]): ProfileSync {
  const base: Record<string, string> = {};
  for (const [k, v] of itemsOf(agreed)) base[k] = stableJson(v);
  const pending: Record<string, PendingChange> = {};
  for (const [k, p] of Object.entries(sync.pending)) {
    const u = used[k];
    if (u && u.at === p.at && stableJson(u.value) === stableJson(p.value) && !!u.deleted === !!p.deleted) continue;
    pending[k] = p;
  }
  return { ...sync, base, pending, notes: [...sync.notes, ...notes].slice(-50) };
}

/** The profile as the cloud stores it: the fields and their stamps. */
/* ─ MK-XS-F-300 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * withStamps
 *
 * Answers ..... The profile as the cloud stores it: the fields and their stamps.
 *
 * Formula .....
 *     { ...profile, stamps }
 *
 * Called by ... MK-XS-F-073 saveUserData
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-073 saveUserData
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-300
 * Changed ..... not in git yet (—)
 */
export function withStamps(profile: Record<string, any>, stamps: ProfileStamps): Record<string, any> {
  return { ...profile, stamps };
}
/** The cloud's stored profile split into the fields and the stamps. */
/* ─ MK-XS-F-301 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * splitStamps
 *
 * Answers ..... The cloud's stored profile split into the fields and the stamps.
 *
 * Formula .....
 *     profile = nothing
 *     stamps = nothing   when stored is missing
 *     profile = profile
 *     stamps = stamps (or nothing when missing)
 *
 * Called by ... MK-XS-F-073 saveUserData
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-073 saveUserData
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-301
 * Changed ..... not in git yet (—)
 */
export function splitStamps(stored: Record<string, any> | null | undefined): { profile: Record<string, any> | null; stamps: ProfileStamps | null } {
  if (!stored) return { profile: null, stamps: null };
  const { stamps, ...profile } = stored;
  return { profile, stamps: stamps ?? null };
}

/** R8a: an app older than the cloud's minimum version stops saving ("Update MoneyKeel to keep saving"). Versions compare
 *  number by number (1.0.58 > 1.0.9). No minimum, or an unreadable version: may save. */
/* ─ MK-XS-F-302 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * appMayStillSave
 *
 * Answers ..... R8a: an app older than the cloud's minimum version stops saving ("Update MoneyKeel to keep saving").
 *
 * Formula .....
 *     true   when min version is missing (or app version is missing when missing or zero)
 *     a = for each of app version.split('.'): parse int(each, 10) (or 0 when missing or zero)
 *     m = for each of min version.split('.'): parse int(each, 10) (or 0 when missing or zero)
 *     true   when (a[i] ?? 0) > (m[i] ?? 0)
 *     false   when (a[i] ?? 0) < (m[i] ?? 0)
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · If a[i] is missing it uses 0.
 *     · If m[i] is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-302
 * Changed ..... not in git yet (—)
 */
export function appMayStillSave(appVersion: string | null | undefined, minVersion: string | null | undefined): boolean {
  if (!minVersion || !appVersion) return true;
  const a = appVersion.split('.').map((n) => parseInt(n, 10) || 0);
  const m = minVersion.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, m.length); i++) {
    if ((a[i] ?? 0) > (m[i] ?? 0)) return true;
    if ((a[i] ?? 0) < (m[i] ?? 0)) return false;
  }
  return true;
}
export const UPDATE_TO_KEEP_SAVING = 'Update MoneyKeel to keep saving';
