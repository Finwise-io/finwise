import { pruneDaily } from '../domain/history';
import { reclassifyAccounts, RECLASSIFY_VERSION } from '../domain/assets/reclassify';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureStorage } from './secureStorage';
import { assetsFromOnboarding, type AssetAccount } from '../domain/assets';
import { benchmarkTicker, marketValue, latestClose, costBasis, type Position, type PriceSeries } from '../domain/performance';
import { applyTransaction, makeTransaction, undoSnapshot, restoreUndo, inverseOf, type Transaction } from '../domain/transactions';
import { reviewTransactions, type TxnFlag } from '../domain/transactions/flags';
import { round2 } from '../domain/_shared/num';
import { fetchPriceSeries } from '../services/marketData';

// Recompute the cached `balance` of every ledger-managed account = cash sleeve + Σ(position × live price).
// Pure manual accounts (no positions, no cash sleeve) keep their entered balance.
function recomputeBalances(accs: AssetAccount[], cache: Record<string, PriceSeries>): AssetAccount[] {
  return accs.map((a) => {
    // Only accounts whose value is BUILT from their holdings (a fully position-tracked brokerage, or one
    // with an explicit cash sleeve) get their balance derived. A manual-balance account (e.g. a $2.2M
    // Fidelity total) where the user added one holding just to track its performance keeps its entered
    // balance — those positions are a SUBSET, so summing them would wipe the rest of the account.
    // AUDIT FIX 2026-07-18 (P0): a CONNECTED account's balance is the broker's own total —
    // it includes options and money-market value our positions list deliberately doesn't carry.
    // Recomputing from sleeve+positions would overwrite it and drop that value. Never touch it.
    if (a.source === 'connected') return a;
    const ledgerManaged = a.derive_balance === true || a.cash_balance != null;
    if (!ledgerManaged) return a;
    // B-19: a held position with no cached price falls back to its cost basis (what you paid),
    // not $0 — counting it as $0 silently understated net worth.
    const mv = (a.positions ?? []).reduce((t, p) => { const px = latestClose(cache[p.ticker.trim().toUpperCase()]); return t + (px == null ? costBasis(p) : marketValue(p, px)); }, 0);
    return { ...a, balance: round2((a.cash_balance || 0) + mv) };
  });
}
import { debtsFromOnboarding, type Debt } from '../domain/debt';
import { ingestSync as ingestSyncPure, type AccountSyncPayload } from '../services/sync/ingest';
import { newEntityId } from '../domain/_shared/ids';
import { goalsFromOnboarding } from '../domain/goals';
import { setMoneyFormat, CURRENCIES } from '../domain/_shared/money';

export type IncomeEntry = {
  id: string;
  type: string;
  amount: number;
  hours?: number;
  rate?: number;
  source: string;
  date: string;
  notes?: string;
  createdAt: string;
};

export type ExpenseEntry = {
  id: string;
  amount: number;
  category: string;
  store: string;
  date: string;
  notes?: string;
  receiptUri?: string;
  createdAt: string;
};

export type SavingsEntry = {
  id: string;
  amount: number;
  label: string;
  date: string;
};

export type InvestmentEntry = {
  id: string;
  amount: number;
  type: string;
  date: string;
  notes?: string;
};

export type Goal = {
  id: string;
  label: string;
  icon: string;
  target: number;
  saved: number;
  color: string;
  duration?: string;
  targetDate?: string;   // 'YYYY-MM' — when the user wants to hit the goal
  savingsType?: 'fixed' | 'percent' | 'leftover';
  savingsAmount?: number;
  savingsPercent?: number;
  fundedByMonth?: Record<string, number>;   // 'YYYY-MM' → $ actually allocated to THIS goal that month (drives on-track/behind)
  origin?: 'onboarding';  // seeded from onboarding goals; cleared on restart, kept-distinct from user goals
};

export type Badge = {
  id: string;
  label: string;
  icon: string;
  earned: boolean;
  earnedAt?: string;
  description: string;
};

export type UserProfile = {
  uid: string;
  email: string;
  name: string;
  createdAt: string;
};

export type BudgetCategory = {
  category: string;
  limit: number;
  type: 'fixed' | 'percent';
};

export type RecurringIncome = {
  id: string;
  source: string;
  amount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  nextDate: string;
  active: boolean;
};

export type RecurringExpense = {
  id: string;
  category: string;
  store: string;
  amount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  nextDate: string;
  active: boolean;
  notes?: string;
};

export type DebtEntry = {
  id: string;
  name: string;
  type: 'credit_card' | 'student_loan' | 'car_loan' | 'mortgage' | 'personal_loan' | 'other';
  balance: number;
  interestRate: number;   // APR %
  minimumPayment: number;
  date: string;
};

export type RetirementPlan = {
  currentAge: number;
  retireAge: number;
  monthlyIncome: number;
  currentSavings: number;
  monthlyContribution: number;
  employerMonthlyMatch: number;  // employer's monthly $ contribution
  expectedReturn: number;
  nestEggYears: number;
  targetYear: number;
};

export type CustomCategory = {
  label: string;
  icon: string;
  bg: string;
};

// Editable overrides for the retirement projection. Any null field is derived
// from live data (age from birthYear, nest egg from assets, contributions from
// onboarding, etc.) so an untouched plan always tracks reality.
export type RetirementAssumptions = {
  retireAge: number | null;
  horizonAge: number | null;
  contribMonthly: number | null;
  spendMonthly: number | null;
  guaranteedMonthly: number | null;          // legacy: total guaranteed income (kept for older callers)
  risk: 'conservative' | 'moderate' | 'aggressive' | null;
  expectedReturn: number | null;             // decimal nominal, e.g. 0.06 (null → from asset mix)
  inflation: number | null;                  // decimal, e.g. 0.025 (null → from economic data)
  ssEligible: boolean | null;                // null = not yet asked
  ssMonthly: number | null;                  // estimated Social Security benefit, today's $/mo
  ssClaimAge: number | null;                 // age SS begins (default 67)
  actualReturn: number | null;               // self-reported actual portfolio return, trailing 12mo (decimal)
  returnBasis: 'benchmark' | 'actual' | 'scenario' | null;  // which growth rate drives the nest-egg projection
  // F4/F11 (FCC): adopted goal commitments — each appears as a named planned line on Cash flow
  // ('Parents $2,000/mo · from your Plan'); written ONLY through the adoption sheet.
  commitments?: { goalId: string; label: string; monthlyAmount: number; endDate?: string }[];
};

// A saved what-if the user can re-open / compare (stickiness).
export type RetirementScenario = {
  id: string;
  name: string;
  createdAt: string;
  assumptions: RetirementAssumptions;
  // cached headline so the chip can show it without recompute
  retireAge: number;
  chance: number;
};

type AppState = {
  // Auth
  user: UserProfile | null;
  onboardingComplete: boolean;
  onboardingPaused: boolean;   // user tapped "Save & come back later" → allow them into the app
  appLockEnabled: boolean;     // F-2: require Face ID / Touch ID / passcode to open the app (device-local)
  // Shared-household sync: when set, ALL cloud reads/writes target users/{householdId} instead of
  // users/{uid} — both partners see and edit the same data. Device-local identity, never synced.
  householdId: string | null;

  // Onboarding settings
  employmentStatus: string | null;
  onboardingDraft: { stepIndex: number; status: string | null; tracks: string[]; name: string; answers?: Record<string, any> } | null;
  onboardingProfile: Record<string, any> | null;
  selectedGoals: string[];
  budgetFrequency: 'daily' | 'weekly' | 'monthly' | 'annually';
  payFrequency: string;
  budgetCategories: BudgetCategory[];
  expenseTargetType: 'fixed' | 'percent';
  expenseTargetAmount: number;
  expenseTargetPercent: number;
  savingsDistribution: 'fixed' | 'percent' | 'leftover';

  // Data
  incomes: IncomeEntry[];
  expenses: ExpenseEntry[];
  recurringIncomes: RecurringIncome[];
  recurringExpenses: RecurringExpense[];
  savings: SavingsEntry[];
  investments: InvestmentEntry[];
  /** @deprecated legacy debt list — superseded by `liabilities`. BudgetScreen migrates these into
   *  liabilities on mount; kept (unsynced) only as the migration landing spot. Remove once migrated. */
  debts: DebtEntry[];
  goals: Goal[];
  badges: Badge[];
  retirementPlan: RetirementPlan | null;
  customCategories: CustomCategory[];

  // Net Worth — per-account assets & liabilities (managed in the Net Worth module)
  assetAccounts: AssetAccount[];
  liabilities: Debt[];
  nwSeeded: boolean;
  goalsSeeded: boolean;
  nwSetupChoice: 'guided' | 'self' | null;
  bigCosts: { id: string; label: string; amount: number; year: number }[];   // big one-time costs (founder-approved 2026-08-02)
  addBigCost: (c: { label: string; amount: number; year: number }) => void;
  updateBigCost: (id: string, patch: Partial<{ label: string; amount: number; year: number }>) => void;
  deleteBigCost: (id: string) => void;
  allocatedByMonth: Record<string, number>;     // 'YYYY-MM' → total savings allocated to assets
  allocPromptSkipped: Record<string, boolean>;   // months where the user dismissed the allocate prompt
  monthlySnapshots: Record<string, any>;         // 'YYYY-MM' → frozen month-end metrics (net worth, income, spend, savings, debt)
  nwDaily: Record<string, number>;               // 'YYYY-MM-DD' → net worth chart point (founder 2026-07-19: graph within days); pruned to DAILY_KEEP
  invDaily: Record<string, number>;              // 'YYYY-MM-DD' → cash+investments point — the NW change-% denominator (founder rule 2026-08-04)
  retirementAssumptions: RetirementAssumptions;   // user overrides for the retirement projection (null fields → derive from data)
  estatePlan: Record<string, boolean>;            // estate checklist: item id → done
  retirementScenarios: RetirementScenario[];      // saved what-if scenarios
  lastRetireChance: number | null;                // last Monte-Carlo success % the cockpit computed (so Insights can show the retire-offtrack card without re-running the sim)
  benchmarkReturns: Record<string, number>;       // asset-kind → expected annual return (decimal); overrides ASSET_KINDS defaults
  priceCache: Record<string, PriceSeries>;        // ticker (UPPERCASE) → daily close series (for performance + live value)
  pricesFetchedAt: string | null;
  priceRefreshFailed: boolean;                 // last refresh got nothing back (offline/blocked) — Home says so                 // ISO of last successful market-data refresh
  transactions: Transaction[];                    // append-only ledger (newest first) — audit/history
  snaptradeSeenKeys: Record<string, true>;        // SnapTrade activity dedupe registry (composite keys)
  snaptradeConnections: { id: string; brokerage: string; disabled: boolean }[];  // last-known connections meta
  snaptradeLastSyncAt: string | null;             // ISO of last successful full sync (drives the daily debounce)
  wrapperConfirmQueue: string[];                  // asset_ids whose tax wrapper the user must confirm
  snaptradeActivityCursor: Record<string, string>; // per-account activity cursor (device-local; advances only after the broker's initial sync completes)
  txnFlags: TxnFlag[];                            // F10 "worth a look" flags (newest first)
  knownPayees: Record<string, string[]>;          // F10: per-account payees confirmed by "Yes, this was me"

  // Gamification
  xp: number;
  streak: number;
  lastCheckIn: string | null;

  // Budget
  monthlyBudgetTarget: number;
  hourlyRate: number;

  // Job safety
  jobRiskLevel: 'low' | 'medium' | 'high' | null;
  emergencyMonths: number;

  // Region & currency (drives app-wide money formatting)
  currency: string;   // ISO 4217, e.g. 'USD'
  locale: string;     // BCP-47, e.g. 'en-US'

  // Display mode — Simple hides jargon/advanced detail; Advisor shows full depth
  displayMode: 'simple' | 'advisor';
  hideBalances: boolean;   // privacy: mask money as •••• everywhere (eye toggle / Settings)
  // FCC lens: the explicit stage choice (first-run question / Settings → Your setup). null = derive
  // from the onboarding profile via resolveLens(). One field, read by the one lens resolver.
  lensOverride: 'working' | 'retired' | null;
  milestoneHighSeen: number | null;    // highest acknowledged net-worth milestone rung; null = baseline not set
  setMilestoneHighSeen: (t: number | null) => void;
  transitionChecks: Record<string, boolean>;   // getting-ready checklist flags the target screens can't derive (drawOrder, health)
  setTransitionCheck: (key: string, done: boolean) => void;
  drawOrder: string[] | null;                  // steer sheet's saved preference; null = the math's order
  setDrawOrder: (o: string[] | null) => void;
  dismissedInsights: Record<string, string>;   // insight id → hidden-until ISO date (snooze/dismiss, persisted)
  dismissInsight: (id: string, untilIso: string) => void;
  pendingRecoveryCode: string | null;   // transient: a just-issued recovery code to show at the root (survives navigation)
  securingAccount: boolean;             // transient: true while the slow PBKDF2 key-wrapping runs after signup (gates the recovery modal's checkbox so the 10s freeze reads as "Securing…", not a dead button)
  fontScale: number;   // 1 = default, 1.15 large, 1.3 larger (accessibility)

  // Economic data
  inflationRate: number;
  treasuryYield: number;

  // Actions - Auth
  setUser: (user: UserProfile | null) => void;
  setOnboardingComplete: (v: boolean) => void;
  setOnboardingPaused: (v: boolean) => void;
  setAppLockEnabled: (v: boolean) => void;
  setHouseholdId: (v: string | null) => void;
  restartOnboarding: () => void;   // clean overwrite: clear setup answers + onboarding-seeded data

  // Actions - Onboarding
  setEmploymentStatus: (s: string | null) => void;
  setOnboardingDraft: (d: AppState['onboardingDraft']) => void;
  setOnboardingProfile: (p: Record<string, any> | null) => void;
  setSelectedGoals: (goals: string[]) => void;
  setBudgetFrequency: (f: 'daily' | 'weekly' | 'monthly' | 'annually') => void;
  setPayFrequency: (f: string) => void;
  setBudgetCategories: (cats: BudgetCategory[]) => void;
  setExpenseTarget: (type: 'fixed' | 'percent', amount: number, percent: number) => void;
  setSavingsDistribution: (type: 'fixed' | 'percent' | 'leftover') => void;
  setRetirementPlan: (plan: RetirementPlan) => void;
  setLastRetireChance: (n: number | null) => void;

  // Actions - Data
  addIncome: (entry: Omit<IncomeEntry, 'id' | 'createdAt'>) => void;
  addExpense: (entry: Omit<ExpenseEntry, 'id' | 'createdAt'>) => void;
  addSavings: (entry: Omit<SavingsEntry, 'id'>) => void;
  addInvestment: (entry: Omit<InvestmentEntry, 'id'>) => void;
  deleteIncome: (id: string) => void;
  deleteExpense: (id: string) => void;
  updateIncome: (id: string, updates: Partial<IncomeEntry>) => void;
  updateExpense: (id: string, updates: Partial<ExpenseEntry>) => void;
  addAsset: (a: Omit<AssetAccount, 'asset_id'>) => void;
  ingestSnapTradeSync: (payloads: AccountSyncPayload[], connections: { id: string; brokerage: string; disabled: boolean }[]) => void;
  confirmAccountWrapper: (assetId: string, kind: string, taxBucket: AssetAccount['tax_bucket']) => void;
  removeConnectionAccounts: (connectionId: string, keepAsManual: boolean) => void;
  setSnaptradeActivityCursor: (c: Record<string, string>) => void;
  updateAsset: (id: string, updates: Partial<AssetAccount>) => void;
  deleteAsset: (id: string) => void;
  addPosition: (accountId: string, position: Omit<Position, 'position_id'>) => void;
  updatePosition: (accountId: string, positionId: string, patch: Partial<Position>) => void;
  deletePosition: (accountId: string, positionId: string) => void;
  refreshPrices: () => Promise<void>;
  maybeRefreshPrices: () => Promise<void>;   // throttled (10 min) — safe to call on screen open
  recordTransaction: (t: Omit<Transaction, 'id' | 'created_at'>) => void;   // append to ledger + apply to accounts + F10 review
  resolveTxnFlag: (flagId: string, resolution: 'was_me' | 'flagged' | 'settled') => void;   // F10 two-button resolution
  deleteTransaction: (id: string) => boolean;   // reverses the row's balance effect; false = blocked (legacy un-invertible row)
  addLiability: (d: Omit<Debt, 'debt_id'>) => void;
  updateLiability: (id: string, updates: Partial<Debt>) => void;
  deleteLiability: (id: string) => void;
  seedNetWorth: (op: Record<string, any> | null) => void;
  seedGoals: (op: Record<string, any> | null) => void;
  setNwSetupChoice: (v: 'guided' | 'self' | null) => void;
  allocateSavings: (ym: string, items: { assetId: string; amount: number }[]) => void;
  fundGoals: (ym: string, items: { goalId: string; amount: number }[]) => void;   // B-71: surplus → goals
  skipAllocPrompt: (ym: string) => void;
  captureMonthlySnapshot: (ym: string, data: any) => void;
  captureDailyNw: (dateKey: string, nw: number, investable?: number) => void;
  runReclassifyOnce: () => void;
  reclassifyVersion?: string;
  reclassifiedCount?: number;
  setRetirementAssumptions: (patch: Partial<RetirementAssumptions>) => void;
  // F11 composer: adoption is the ONE write path a decision screen uses — it snapshots the current
  // plan first so "Back to previous plan" can restore it exactly. History keeps the last 5.
  planHistory: { snapshot: RetirementAssumptions; label: string; date: string }[];
  adoptPlan: (patch: Partial<RetirementAssumptions>, label: string) => void;
  revertPlan: () => void;
  toggleEstateItem: (id: string) => void;
  saveRetirementScenario: (name: string, assumptions: Partial<RetirementAssumptions>, retireAge: number, chance: number) => void;
  deleteRetirementScenario: (id: string) => void;
  setBenchmarkReturn: (kind: string, ret: number) => void;
  setCurrency: (currency: string, locale?: string) => void;
  setDisplayMode: (m: 'simple' | 'advisor') => void;
  toggleHideBalances: () => void;
  setLensOverride: (l: 'working' | 'retired' | null) => void;
  setPendingRecoveryCode: (c: string | null) => void;
  setSecuringAccount: (b: boolean) => void;
  setFontScale: (s: number) => void;
  addRecurringIncome: (entry: Omit<RecurringIncome, 'id'>) => void;
  updateRecurringIncome: (id: string, updates: Partial<RecurringIncome>) => void;
  deleteRecurringIncome: (id: string) => void;
  applyRecurringIncomes: () => void;
  addRecurringExpense: (entry: Omit<RecurringExpense, 'id'>) => void;
  updateRecurringExpense: (id: string, updates: Partial<RecurringExpense>) => void;
  deleteRecurringExpense: (id: string) => void;
  applyRecurringExpenses: () => void;
  addDebt: (entry: Omit<DebtEntry, 'id'>) => void;
  updateDebt: (id: string, updates: Partial<DebtEntry>) => void;
  deleteDebt: (id: string) => void;
  addGoal: (goal: Omit<Goal, 'id'>) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  importFromCSV: (rows: Record<string, string>[]) => void;
  addCustomCategory: (cat: CustomCategory) => void;
  deleteCustomCategory: (label: string) => void;

  // Actions - Gamification
  addXP: (amount: number) => void;
  checkStreak: () => void;
  earnBadge: (id: string) => void;

  // Actions - Settings
  setJobRisk: (level: 'low' | 'medium' | 'high') => void;
  setEmergencyMonths: (months: number) => void;
  setMonthlyBudgetTarget: (amount: number) => void;
  setHourlyRate: (rate: number) => void;
  setEconomicData: (inflation: number, treasury: number) => void;
  resetAll: () => void;

  // Cloud sync
  loadFromCloud: (data: Partial<AppState>) => void;
};

const DEFAULT_BADGES: Badge[] = [
  { id: 'first_budget',    label: 'First budget',    icon: '🏆', earned: false, description: 'Set up your first monthly budget' },
  { id: 'first_income',    label: 'First paycheck',  icon: '💵', earned: false, description: 'Log your first income entry' },
  { id: 'first_expense',   label: 'Receipt master',  icon: '🧾', earned: false, description: 'Log your first expense' },
  { id: 'saver_100',       label: 'Saver',           icon: '🏦', earned: false, description: 'Save $100 in one month' },
  { id: 'streak_7',        label: '7-day streak',    icon: '🔥', earned: false, description: 'Check in 7 days in a row' },
  { id: 'streak_30',       label: '30-day streak',   icon: '🌟', earned: false, description: 'Check in 30 days in a row' },
  { id: 'expense_analyzer',label: 'Analyst',         icon: '🔍', earned: false, description: 'Run your first AI expense analysis' },
  { id: 'goal_set',        label: 'Goal setter',     icon: '🎯', earned: false, description: 'Create your first savings goal' },
  { id: 'emergency_fund',  label: 'Safety net',      icon: '🛡', earned: false, description: 'Fund your emergency fund goal' },
  { id: 'debt_free',       label: 'Debt free',       icon: '🦸', earned: false, description: 'Zero debt for 3 months running' },
  { id: 'savings_10k',     label: '$10k saved',      icon: '💰', earned: false, description: 'Reach $10,000 in savings' },
  { id: 'investor',        label: 'Investor',        icon: '📈', earned: false, description: 'Log your first investment' },
  { id: 'retirement_set',  label: 'Future planner',  icon: '🏖', earned: false, description: 'Set up your retirement plan' },
];

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      onboardingComplete: false,
      onboardingPaused: false,
      appLockEnabled: false,
      householdId: null,

      // Onboarding settings
      employmentStatus: null,
      onboardingDraft: null,
      onboardingProfile: null,
      selectedGoals: [],
      budgetFrequency: 'monthly',
      payFrequency: 'monthly',
      budgetCategories: [],
      expenseTargetType: 'percent',
      expenseTargetAmount: 0,
      expenseTargetPercent: 80,
      savingsDistribution: 'leftover',
      retirementPlan: null,
      customCategories: [],

      // Data
      incomes: [],
      expenses: [],
      recurringIncomes: [],
      recurringExpenses: [],
      savings: [],
      investments: [],
      debts: [],
      assetAccounts: [],
      liabilities: [],
      nwSeeded: false,
      goalsSeeded: false,
      nwSetupChoice: null,
      bigCosts: [],
      addBigCost: (c) => set((st: any) => ({ bigCosts: [...(st.bigCosts ?? []), { id: `bc_${(st.bigCosts?.length ?? 0) + 1}_${c.year}`, ...c }] })),
      updateBigCost: (id, patch) => set((st: any) => ({ bigCosts: (st.bigCosts ?? []).map((x: any) => x.id === id ? { ...x, ...patch } : x) })),
      deleteBigCost: (id) => set((st: any) => ({ bigCosts: (st.bigCosts ?? []).filter((x: any) => x.id !== id) })),
      allocatedByMonth: {},
      allocPromptSkipped: {},
      monthlySnapshots: {},
      nwDaily: {},
      invDaily: {},
      retirementAssumptions: { retireAge: null, horizonAge: null, contribMonthly: null, spendMonthly: null, guaranteedMonthly: null, risk: null, expectedReturn: null, inflation: null, ssEligible: null, ssMonthly: null, ssClaimAge: null, actualReturn: null, returnBasis: null },
      estatePlan: {},
      retirementScenarios: [],
      planHistory: [],
      lastRetireChance: null,
      benchmarkReturns: {},
      priceCache: {},
      pricesFetchedAt: null, priceRefreshFailed: false,
      transactions: [],
      snaptradeSeenKeys: {},
      snaptradeConnections: [],
      snaptradeLastSyncAt: null,
      snaptradeActivityCursor: {},
      wrapperConfirmQueue: [],
      txnFlags: [],
      knownPayees: {},
      goals: [],
      badges: DEFAULT_BADGES,

      // Gamification
      xp: 0,
      streak: 0,
      lastCheckIn: null,

      // Budget
      monthlyBudgetTarget: 3500,
      hourlyRate: 25,

      // Job safety
      jobRiskLevel: null,
      emergencyMonths: 6,

      // Economic
      currency: 'USD',
      locale: 'en-US',
      displayMode: 'simple',
      hideBalances: false,
      lensOverride: null,   // derive from onboarding until the person answers the stage question
      milestoneHighSeen: null,
      transitionChecks: {},
      drawOrder: null,
      dismissedInsights: {},
      pendingRecoveryCode: null,
      securingAccount: false,
      fontScale: 1,
      inflationRate: 3.2,
      treasuryYield: 4.35,

      // ── Auth actions ─────────────────────────────────────────────
      setUser: (user) => set({ user }),
      setAppLockEnabled: (v) => set({ appLockEnabled: v }),
      setOnboardingComplete: (v) => set({ onboardingComplete: v }),
      setOnboardingPaused: (v) => set({ onboardingPaused: v }),
      setHouseholdId: (v) => set({ householdId: v }),

      // ── Onboarding actions ───────────────────────────────────────
      setEmploymentStatus: (s) => set({ employmentStatus: s }),
      setOnboardingDraft: (d) => set({ onboardingDraft: d }),
      setOnboardingProfile: (p) => set({ onboardingProfile: p }),
      setSelectedGoals: (goals) => set({ selectedGoals: goals }),
      setBudgetFrequency: (f) => set({ budgetFrequency: f }),
      setPayFrequency: (f) => set({ payFrequency: f }),
      setBudgetCategories: (cats) => set({ budgetCategories: cats }),
      setExpenseTarget: (type, amount, percent) => set({ expenseTargetType: type, expenseTargetAmount: amount, expenseTargetPercent: percent }),
      setSavingsDistribution: (type) => set({ savingsDistribution: type }),
      setRetirementPlan: (plan) => { set({ retirementPlan: plan }); get().earnBadge('retirement_set'); },
      setLastRetireChance: (n) => set({ lastRetireChance: n }),

      // ── Data actions ─────────────────────────────────────────────
      addIncome: (entry) => {
        const e: IncomeEntry = { ...entry, id: uid(), createdAt: new Date().toISOString() };
        set((s) => ({ incomes: [e, ...s.incomes] }));
        get().addXP(15);
        get().earnBadge('first_income');
        get().checkStreak();
      },

      addExpense: (entry) => {
        const e: ExpenseEntry = { ...entry, id: uid(), createdAt: new Date().toISOString() };
        set((s) => ({ expenses: [e, ...s.expenses] }));
        get().addXP(10);
        get().earnBadge('first_expense');
        get().checkStreak();
      },

      addSavings: (entry) => {
        const e: SavingsEntry = { ...entry, id: uid() };
        set((s) => ({ savings: [e, ...s.savings] }));
        get().addXP(20);
      },

      addInvestment: (entry) => {
        const e: InvestmentEntry = { ...entry, id: uid() };
        set((s) => ({ investments: [e, ...s.investments] }));
        get().addXP(25);
        get().earnBadge('investor');
      },

      deleteIncome:  (id) => set((s) => ({ incomes:  s.incomes.filter((i) => i.id !== id) })),
      deleteExpense: (id) => set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),
      updateIncome:  (id, updates) => set((s) => ({ incomes:  s.incomes.map((i)  => i.id === id ? { ...i, ...updates } : i) })),
      updateExpense: (id, updates) => set((s) => ({ expenses: s.expenses.map((e) => e.id === id ? { ...e, ...updates } : e) })),

      // ── Net Worth: assets & liabilities ──────────────────────────
      addAsset:       (a) => set((s) => ({ assetAccounts: [{ ...a, asset_id: newEntityId('ast') }, ...s.assetAccounts] })),
      // SnapTrade sync (design v2): holdings are authoritative; activities append as HISTORY ONLY
      // (never applied to balances — the no-double-count rule pinned in ingest.test.ts).
      // AUDIT FIX 2026-07-18 (P1 race): ingest runs INSIDE set() against the state as it is at
      // write time — a sync that started before cloud hydration can no longer replace hydrated
      // accounts with a stale empty snapshot.
      ingestSnapTradeSync: (payloads, connections) => set((s) => {
        const r = ingestSyncPure(s.assetAccounts, s.snaptradeSeenKeys ?? {}, payloads);
        return {
          assetAccounts: r.accounts,
          transactions: [...r.newTransactions, ...s.transactions],
          snaptradeSeenKeys: r.seenKeys,
          snaptradeConnections: connections,
          snaptradeLastSyncAt: new Date().toISOString(),
          wrapperConfirmQueue: Array.from(new Set([...(s.wrapperConfirmQueue ?? []), ...r.needsWrapperConfirm])),
        };
      }),
      setSnaptradeActivityCursor: (c) => set(() => ({ snaptradeActivityCursor: c })),
      confirmAccountWrapper: (assetId, kind, taxBucket) => set((s) => ({
        assetAccounts: s.assetAccounts.map((a) => (a.asset_id === assetId ? { ...a, kind, tax_bucket: taxBucket, wrapper_confirmed: true } : a)),
        wrapperConfirmQueue: (s.wrapperConfirmQueue ?? []).filter((id) => id !== assetId),
      })),
      // Disconnecting: the user chooses — keep the rows as frozen manual copies, or remove them.
      removeConnectionAccounts: (connectionId, keepAsManual) => set((s) => {
        const connIds = new Set(s.assetAccounts.filter((a) => a.connection_id === connectionId).map((a) => a.asset_id));
        return {
          assetAccounts: keepAsManual
            ? s.assetAccounts.map((a) => (a.connection_id === connectionId ? { ...a, source: 'manual' as const, connection_id: undefined, last_synced: undefined, snaptrade_account_id: undefined } : a))
            : s.assetAccounts.filter((a) => a.connection_id !== connectionId),
          snaptradeConnections: (s.snaptradeConnections ?? []).filter((c) => c.id !== connectionId),
          wrapperConfirmQueue: (s.wrapperConfirmQueue ?? []).filter((id) => !connIds.has(id) || keepAsManual),
        };
      }),
      updateAsset:    (id, u) => set((s) => ({ assetAccounts: s.assetAccounts.map((x) => x.asset_id === id ? { ...x, ...u } : x) })),
      deleteAsset:    (id) => set((s) => ({ assetAccounts: s.assetAccounts.filter((x) => x.asset_id !== id) })),
      addPosition: (accountId, position) => set((s) => {
        const pos = { ...position, position_id: newEntityId('pos') };
        const accounts = s.assetAccounts.map((a) => a.asset_id === accountId ? { ...a, positions: [...(a.positions ?? []), pos] } : a);
        // log an OPENING_POSITION transaction per lot (first-time capture of holdings you already own)
        const txns = (pos.lots ?? []).map((l) => makeTransaction({ date: l.purchase_date, type: 'OPENING_POSITION', account_id: accountId, position_id: pos.position_id, ticker: pos.ticker, kind: pos.kind, shares: l.shares, price: l.cost_per_share }));
        return { assetAccounts: recomputeBalances(accounts, s.priceCache), transactions: [...txns, ...s.transactions] };
      }),
      updatePosition: (accountId, positionId, patch) => set((s) => {
        const accounts = s.assetAccounts.map((a) => a.asset_id === accountId
          ? { ...a, positions: (a.positions ?? []).map((p) => p.position_id === positionId ? { ...p, ...patch } : p) } : a);
        return { assetAccounts: recomputeBalances(accounts, s.priceCache) };
      }),
      deletePosition: (accountId, positionId) => set((s) => {
        const accounts = s.assetAccounts.map((a) => a.asset_id === accountId
          ? { ...a, positions: (a.positions ?? []).filter((p) => p.position_id !== positionId) } : a);
        return { assetAccounts: recomputeBalances(accounts, s.priceCache) };
      }),
      recordTransaction: (partial) => set((s) => {
        const t = makeTransaction(partial);
        t.undo_prev = undoSnapshot(s.assetAccounts, t);   // pre-apply copies -> deletes can reverse exactly
        const accounts = applyTransaction(s.assetAccounts, t);
        // F10: review connected-account money-out against this account's history (manual rows pass silently)
        const newFlags = reviewTransactions([t], { history: s.transactions, knownPayees: s.knownPayees });
        return {
          assetAccounts: recomputeBalances(accounts, s.priceCache),
          transactions: [t, ...s.transactions],
          ...(newFlags.length ? { txnFlags: [...newFlags, ...s.txnFlags] } : {}),
        };
      }),
      // F10 resolution — always an explicit choice (no swipe-dismiss). 'was_me' also remembers the
      // payee on that account so it is never questioned again (the only learning in v1).
      resolveTxnFlag: (flagId, resolution) => set((s) => {
        const f = s.txnFlags.find((x) => x.flag_id === flagId);
        if (!f) return {};
        const nowIso = new Date().toISOString();
        const txnFlags = s.txnFlags.map((x) => x.flag_id === flagId
          ? { ...x, status: (resolution === 'settled' ? 'was_me' : resolution) as TxnFlag['status'], resolved_at: nowIso }
          : x);
        let knownPayees = s.knownPayees;
        if (resolution === 'was_me' && f.reason === 'first_time_payee' && f.payee) {
          const list = knownPayees[f.account_id] ?? [];
          if (!list.includes(f.payee)) knownPayees = { ...knownPayees, [f.account_id]: [...list, f.payee] };
        }
        return { txnFlags, knownPayees };
      }),
      // P0: deleting a ledger row must reverse its balance effect — ledger and balances may never drift.
      // Array is NEWEST-FIRST. Unwind newest→target via each row's undo_prev (inverseOf fallback for
      // legacy cash-delta rows), drop the target, replay the newer rows oldest→newest (fresh snapshots),
      // recompute once. Returns false (state untouched) when an un-invertible legacy row blocks the unwind.
      deleteTransaction: (id) => {
        let ok = true;
        set((s) => {
          const idx = s.transactions.findIndex((t) => t.id === id);
          if (idx < 0) { ok = false; return {}; }
          // AUDIT FIX 2026-07-18: connected rows are HISTORY ONLY (never applied) — deleting one
          // removes the row and nothing else. The undo/replay machinery is for applied manual rows.
          if (s.transactions[idx].source === 'connected') {
            // same F10 hygiene as the manual path: an OPEN flag dies with its transaction;
            // a resolved flag survives as the audit trail (edge-case audit E2)
            return {
              transactions: s.transactions.filter((t) => t.id !== id),
              txnFlags: (s.txnFlags ?? []).filter((f: any) => !(f.status === 'open' && (f.transaction_ids ?? []).includes(id))),
            };
          }
          const newerFirst = s.transactions.slice(0, idx);
          const target = s.transactions[idx];
          if (![...newerFirst, target].every((t) => t.undo_prev || inverseOf(t))) { ok = false; return {}; }
          let accounts = s.assetAccounts;
          for (const t of [...newerFirst, target]) {
            accounts = t.undo_prev ? restoreUndo(accounts, t) : applyTransaction(accounts, inverseOf(t)!);
          }
          const replayed: Transaction[] = [];
          for (const t of [...newerFirst].reverse()) {
            const fresh = { ...t, undo_prev: undoSnapshot(accounts, t) };
            accounts = applyTransaction(accounts, fresh);
            replayed.unshift(fresh);
          }
          return {
            assetAccounts: recomputeBalances(accounts, s.priceCache),
            transactions: [...replayed, ...s.transactions.slice(idx + 1)],
            // F10 hygiene (edge-case audit E2): an OPEN flag must not outlive its transaction —
            // deleting the row drops the open card (Home never questions money that no longer
            // exists). RESOLVED flags stay: they carry their own facts and are the audit trail.
            txnFlags: s.txnFlags.filter((f) => !(f.status === 'open' && f.transaction_ids.includes(String(id)))),
          };
        });
        return ok;
      },
      // Fetch live prices for every held ticker (+ its benchmark) and refresh each position-account's
      // balance = Σ(shares × latest price). Balance becomes a cache derived from positions.
      refreshPrices: async () => {
        const accts = get().assetAccounts;
        const tickers: string[] = [];
        accts.forEach((a) => (a.positions ?? []).forEach((p) => { tickers.push(p.ticker); tickers.push(benchmarkTicker(p.kind)); }));
        if (!tickers.length) return;
        const fetched = await fetchPriceSeries(tickers);
        if (!Object.keys(fetched).length) {                  // offline/blocked → keep cache, SAY so (mock approved 2026-07-31)
          set({ priceRefreshFailed: true });
          return;
        }
        const cache = { ...get().priceCache, ...fetched };
        set({ priceRefreshFailed: false, priceCache: cache, pricesFetchedAt: new Date().toISOString(), assetAccounts: recomputeBalances(get().assetAccounts, cache) });
      },
      maybeRefreshPrices: async () => {
        const s = get();
        if (!s.assetAccounts.some((a) => a.positions?.length)) return;
        const last = s.pricesFetchedAt ? Date.parse(s.pricesFetchedAt) : 0;
        if (Date.now() - last < 10 * 60 * 1000) return;   // fetched within 10 min → skip
        await s.refreshPrices();
      },
      addLiability:   (d) => set((s) => ({ liabilities: [{ ...d, debt_id: newEntityId('debt') }, ...s.liabilities] })),
      updateLiability:(id, u) => set((s) => ({ liabilities: s.liabilities.map((x) => x.debt_id === id ? { ...x, ...u } : x) })),
      deleteLiability:(id) => set((s) => ({ liabilities: s.liabilities.filter((x) => x.debt_id !== id) })),
      // Re-seeding is an explicit "redo my setup": replace ONLY the onboarding-seeded rows (origin
      // tag) — onboarding answers WIN for those; accounts/debts the user added by hand are never
      // touched. Rows saved before the origin tag existed look user-created, so they're kept too —
      // except when a fresh seeded row matches one by label+bucket, where the fresh row replaces it
      // so existing users don't end up with duplicates. nwSeeded = "seeded at least once".
      seedNetWorth:   (op) => set((s) => {
        const freshAssets = assetsFromOnboarding('local', op).accounts;
        const freshDebts = debtsFromOnboarding('local', op).debts;
        const keptAssets = s.assetAccounts.filter((a) => a.origin !== 'onboarding'
          && !freshAssets.some((f) => f.label === a.label && f.tax_bucket === a.tax_bucket));
        const keptDebts = s.liabilities.filter((d) => d.origin !== 'onboarding'
          && !freshDebts.some((f) => f.label === d.label));
        return { assetAccounts: [...freshAssets, ...keptAssets], liabilities: [...freshDebts, ...keptDebts], nwSeeded: true };
      }),
      // B-29: bring the goals captured in onboarding into the Plan tab. Seeds once (goalsSeeded
      // guard) so deleting a seeded goal sticks; a fresh onboarding run re-seeds (restartOnboarding
      // clears the flag + the onboarding-origin goals).
      seedGoals: (op) => set((s) => {
        if (s.goalsSeeded) return {};
        const palette = ['#178F6B', '#2563EB', '#D97706', '#7C3AED', '#DB2777'];
        const fresh: Goal[] = goalsFromOnboarding('local', op).goals.map((g, i) => ({
          id: newEntityId('goal'), label: g.label, icon: '🎯', target: g.target_amount, saved: 0,
          color: palette[i % palette.length],
          targetDate: g.target_year ? `${g.target_year}-01` : undefined,
          origin: 'onboarding' as const,
        }));
        if (!fresh.length) return { goalsSeeded: true };
        return { goals: [...fresh, ...s.goals], goalsSeeded: true };
      }),
      setNwSetupChoice: (v) => set({ nwSetupChoice: v }),
      allocateSavings: (ym, items) => set((s) => {
        const now = new Date(); const cym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        let total = 0;
        const accounts = s.assetAccounts.map((a) => {
          const it = items.find((i) => i.assetId === a.asset_id && i.amount > 0);
          if (!it) return a;
          total += it.amount;
          const prior = a.change_month === cym ? (a.change_amount ?? 0) : 0;
          return { ...a, balance: a.balance + it.amount, change_amount: prior + it.amount, change_month: cym };
        });
        return { assetAccounts: accounts, allocatedByMonth: { ...s.allocatedByMonth, [ym]: (s.allocatedByMonth[ym] ?? 0) + total } };
      }),
      // B-71: fund goals FROM this month's surplus — bumps each goal's `saved` (real money tracked, not a
      // self-reported tally) and counts toward allocatedByMonth so the surplus "left to assign" is accurate.
      fundGoals: (ym, items) => set((s) => {
        let total = 0;
        const goals = s.goals.map((g) => {
          const it = items.find((i) => i.goalId === g.id && i.amount > 0);
          if (!it) return g;
          total += it.amount;
          return {
            ...g,
            saved: Math.round(((g.saved || 0) + it.amount) * 100) / 100,
            fundedByMonth: { ...(g.fundedByMonth ?? {}), [ym]: Math.round((((g.fundedByMonth ?? {})[ym] ?? 0) + it.amount) * 100) / 100 },
          };
        });
        return { goals, allocatedByMonth: { ...s.allocatedByMonth, [ym]: (s.allocatedByMonth[ym] ?? 0) + total } };
      }),
      skipAllocPrompt: (ym) => set((s) => ({ allocPromptSkipped: { ...s.allocPromptSkipped, [ym]: true } })),
      // Freeze a month's metrics. The CURRENT month is overwritten on each change (so it ends the month
      // at its final state); past months stay frozen. We keep ALL months (history is cheap, data is key).
      captureMonthlySnapshot: (ym, data) => set((s) => ({ monthlySnapshots: { ...s.monthlySnapshots, [ym]: { ...data } } })),
      // daily chart point — once per day (last write of the day wins), bounded retention
      // FOUNDER GAPS 1 & 2 (2026-08-10): re-classify ALREADY-STORED accounts under the cash-only
      // rule. Runs once per device, then records its version so it never repeats.
      runReclassifyOnce: () => set((s: any) => {
        if (s.reclassifyVersion === RECLASSIFY_VERSION) return {};
        const { accounts, changed } = reclassifyAccounts(s.assetAccounts ?? []);
        return { assetAccounts: accounts, reclassifyVersion: RECLASSIFY_VERSION, reclassifiedCount: changed };
      }),
      captureDailyNw: (dateKey: string, nw: number, investable?: number) => set((s: any) => ({
        nwDaily: pruneDaily({ ...(s.nwDaily ?? {}), [dateKey]: nw }),
        ...(investable != null ? { invDaily: pruneDaily({ ...(s.invDaily ?? {}), [dateKey]: investable }) } : {}),
      })),
      setRetirementAssumptions: (patch) => set((s) => ({ retirementAssumptions: { ...s.retirementAssumptions, ...patch } })),
      adoptPlan: (patch, label) => set((s) => ({
        planHistory: [{ snapshot: { ...s.retirementAssumptions }, label, date: new Date().toISOString().slice(0, 10) }, ...s.planHistory].slice(0, 5),
        retirementAssumptions: { ...s.retirementAssumptions, ...patch },
      })),
      revertPlan: () => set((s) => {
        const [prev, ...rest] = s.planHistory;
        if (!prev) return {};
        return { retirementAssumptions: { ...prev.snapshot }, planHistory: rest };
      }),
      toggleEstateItem: (id) => set((s) => ({ estatePlan: { ...s.estatePlan, [id]: !s.estatePlan?.[id] } })),
      saveRetirementScenario: (name, assumptions, retireAge, chance) => set((s) => ({
        retirementScenarios: [
          ...s.retirementScenarios,
          { id: newEntityId('scn'), name, createdAt: new Date().toISOString(), assumptions: { ...s.retirementAssumptions, ...assumptions }, retireAge, chance },
        ],
      })),
      deleteRetirementScenario: (id) => set((s) => ({ retirementScenarios: s.retirementScenarios.filter((x) => x.id !== id) })),
      setBenchmarkReturn: (kind, ret) => set((s) => ({ benchmarkReturns: { ...s.benchmarkReturns, [kind]: ret } })),
      setCurrency: (currency, locale) => {
        const resolved = locale || CURRENCIES.find((c) => c.code === currency)?.locale || 'en-US';
        setMoneyFormat(currency, resolved);                 // apply immediately to all formatters
        set({ currency, locale: resolved });
      },
      setDisplayMode: (m) => set({ displayMode: m }),
      toggleHideBalances: () => set((s) => ({ hideBalances: !s.hideBalances })),
      setLensOverride: (l) => set({ lensOverride: l }),
      setMilestoneHighSeen: (t) => set({ milestoneHighSeen: t }),
      setTransitionCheck: (key, done) => set((st) => ({ transitionChecks: { ...st.transitionChecks, [key]: done } })),
      setDrawOrder: (o) => set({ drawOrder: o }),
      dismissInsight: (id, untilIso) => set((st) => ({ dismissedInsights: { ...st.dismissedInsights, [id]: untilIso } })),
      setPendingRecoveryCode: (c) => set({ pendingRecoveryCode: c }),
      setSecuringAccount: (b) => set({ securingAccount: b }),
      setFontScale: (s) => set({ fontScale: s }),

      addRecurringIncome: (entry) => {
        const r: RecurringIncome = { ...entry, id: uid() };
        set((s) => ({ recurringIncomes: [r, ...s.recurringIncomes] }));
      },
      updateRecurringIncome: (id, updates) =>
        set((s) => ({ recurringIncomes: s.recurringIncomes.map((r) => r.id === id ? { ...r, ...updates } : r) })),
      deleteRecurringIncome: (id) =>
        set((s) => ({ recurringIncomes: s.recurringIncomes.filter((r) => r.id !== id) })),

      applyRecurringIncomes: () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const state = get();
        const freqDays: Record<RecurringIncome['frequency'], number> = { weekly: 7, biweekly: 14, monthly: 0 };

        const updatedRecurring = state.recurringIncomes.map((r) => {
          if (!r.active) return r;
          let next = new Date(r.nextDate);
          next.setHours(0, 0, 0, 0);
          if (next > today) return r;

          let updated = { ...r };
          while (next <= today) {
            state.addIncome({
              type: 'recurring',
              amount: r.amount,
              source: r.source,
              date: next.toISOString(),
              notes: `Auto: ${r.frequency}`,
            });
            if (r.frequency === 'monthly') {
              next = new Date(next.getFullYear(), next.getMonth() + 1, next.getDate());
            } else {
              next = new Date(next.getTime() + freqDays[r.frequency] * 86400000);
            }
          }
          updated.nextDate = next.toISOString();
          return updated;
        });

        set({ recurringIncomes: updatedRecurring });
      },

      addRecurringExpense: (entry) => {
        const r: RecurringExpense = { ...entry, id: uid() };
        set((s) => ({ recurringExpenses: [r, ...s.recurringExpenses] }));
      },
      updateRecurringExpense: (id, updates) =>
        set((s) => ({ recurringExpenses: s.recurringExpenses.map((r) => r.id === id ? { ...r, ...updates } : r) })),
      deleteRecurringExpense: (id) =>
        set((s) => ({ recurringExpenses: s.recurringExpenses.filter((r) => r.id !== id) })),

      applyRecurringExpenses: () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const state = get();
        const freqDays: Record<RecurringExpense['frequency'], number> = { weekly: 7, biweekly: 14, monthly: 0 };

        const updated = state.recurringExpenses.map((r) => {
          if (!r.active) return r;
          let next = new Date(r.nextDate);
          next.setHours(0, 0, 0, 0);
          if (next > today) return r;

          let u = { ...r };
          while (next <= today) {
            state.addExpense({
              amount: r.amount,
              category: r.category,
              store: r.store,
              date: next.toISOString(),
              notes: r.notes || `Auto: ${r.frequency}`,
            });
            if (r.frequency === 'monthly') {
              next = new Date(next.getFullYear(), next.getMonth() + 1, next.getDate());
            } else {
              next = new Date(next.getTime() + freqDays[r.frequency] * 86400000);
            }
          }
          u.nextDate = next.toISOString();
          return u;
        });

        set({ recurringExpenses: updated });
      },

      addDebt: (entry) => {
        const d: DebtEntry = { ...entry, id: uid() };
        set((s) => ({ debts: [d, ...s.debts] }));
        get().addXP(5);
      },
      updateDebt: (id, updates) =>
        set((s) => ({ debts: s.debts.map((d) => d.id === id ? { ...d, ...updates } : d) })),
      deleteDebt: (id) => set((s) => ({ debts: s.debts.filter((d) => d.id !== id) })),

      addGoal: (goal) => {
        const g: Goal = { ...goal, id: uid() };
        set((s) => ({ goals: [...s.goals, g] }));
        get().addXP(30);
        get().earnBadge('goal_set');
      },
      updateGoal: (id, updates) =>
        set((s) => ({ goals: s.goals.map((g) => g.id === id ? { ...g, ...updates } : g) })),
      deleteGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),

      importFromCSV: (rows) => {
        const newExpenses: ExpenseEntry[] = rows
          .filter((r) => r.amount && r.category)
          .map((r) => ({
            id: uid(),
            amount: parseFloat(r.amount) || 0,
            category: r.category || 'Other',
            store: r.store || r.merchant || '',
            date: r.date || new Date().toISOString(),
            notes: r.notes || '',
            createdAt: new Date().toISOString(),
          }));
        set((s) => ({ expenses: [...newExpenses, ...s.expenses] }));
        get().addXP(newExpenses.length * 5);
      },

      addCustomCategory: (cat) =>
        set((s) => ({ customCategories: [...s.customCategories, cat] })),
      deleteCustomCategory: (label) =>
        set((s) => ({ customCategories: s.customCategories.filter((c) => c.label !== label) })),

      // ── Gamification actions ─────────────────────────────────────
      addXP: (amount) => set((s) => ({ xp: s.xp + amount })),

      checkStreak: () => {
        const today = new Date().toDateString();
        const last = get().lastCheckIn;
        if (last === today) return;
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        const newStreak = last === yesterday ? get().streak + 1 : 1;
        set({ streak: newStreak, lastCheckIn: today });
        if (newStreak >= 7)  get().earnBadge('streak_7');
        if (newStreak >= 30) get().earnBadge('streak_30');
      },

      earnBadge: (id) => {
        if (get().badges.find((b) => b.id === id)?.earned) return;
        set((s) => ({
          badges: s.badges.map((b) =>
            b.id === id ? { ...b, earned: true, earnedAt: new Date().toISOString() } : b
          ),
        }));
        get().addXP(50);
      },

      // ── Settings actions ─────────────────────────────────────────
      setJobRisk: (level) => set({ jobRiskLevel: level }),
      setEmergencyMonths: (months) => set({ emergencyMonths: months }),
      setMonthlyBudgetTarget: (amount) => set({ monthlyBudgetTarget: amount }),
      setHourlyRate: (rate) => set({ hourlyRate: rate }),
      setEconomicData: (inflation, treasury) =>
        set({ inflationRate: inflation, treasuryYield: treasury }),

      resetAll: () => set({
        incomes: [], expenses: [], savings: [], investments: [],
        recurringIncomes: [], recurringExpenses: [], debts: [],
        assetAccounts: [], liabilities: [], nwSeeded: false, goalsSeeded: false, nwSetupChoice: null,
        bigCosts: [],
      addBigCost: (c) => set((st: any) => ({ bigCosts: [...(st.bigCosts ?? []), { id: `bc_${(st.bigCosts?.length ?? 0) + 1}_${c.year}`, ...c }] })),
      updateBigCost: (id, patch) => set((st: any) => ({ bigCosts: (st.bigCosts ?? []).map((x: any) => x.id === id ? { ...x, ...patch } : x) })),
      deleteBigCost: (id) => set((st: any) => ({ bigCosts: (st.bigCosts ?? []).filter((x: any) => x.id !== id) })),
      allocatedByMonth: {}, allocPromptSkipped: {}, monthlySnapshots: {}, nwDaily: {}, invDaily: {},
        retirementAssumptions: { retireAge: null, horizonAge: null, contribMonthly: null, spendMonthly: null, guaranteedMonthly: null, risk: null, expectedReturn: null, inflation: null, ssEligible: null, ssMonthly: null, ssClaimAge: null, actualReturn: null, returnBasis: null },
      estatePlan: {},
        retirementScenarios: [], planHistory: [],
      lastRetireChance: null,
        benchmarkReturns: {},
        priceCache: {}, pricesFetchedAt: null, transactions: [], txnFlags: [], knownPayees: {},
        snaptradeSeenKeys: {}, snaptradeConnections: [], snaptradeLastSyncAt: null, snaptradeActivityCursor: {}, wrapperConfirmQueue: [],
        lensOverride: null,
        milestoneHighSeen: null, transitionChecks: {}, drawOrder: null, dismissedInsights: {},
        goals: [], badges: DEFAULT_BADGES, xp: 0, streak: 0,
        lastCheckIn: null, onboardingComplete: false, onboardingPaused: false, retirementPlan: null,
        employmentStatus: null, onboardingDraft: null, onboardingProfile: null, selectedGoals: [], budgetCategories: [], customCategories: [],
        currency: 'USD', locale: 'en-US', displayMode: 'simple',
      }),

      // Re-run setup as a CLEAN OVERWRITE: wipe the onboarding answers + everything setup derived
      // (so Home doesn't keep showing stale figures), but KEEP prefs, login, gamification, and anything
      // the user entered themselves (logged transactions; Net Worth accounts they added by hand —
      // only the onboarding-SEEDED net worth, flagged by nwSeeded, is cleared).
      restartOnboarding: () => set((s) => ({
        onboardingProfile: null, onboardingComplete: false, onboardingPaused: false, onboardingDraft: null,
        selectedGoals: [], retirementPlan: null, retirementScenarios: [], planHistory: [],
        retirementAssumptions: { retireAge: null, horizonAge: null, contribMonthly: null, spendMonthly: null, guaranteedMonthly: null, risk: null, expectedReturn: null, inflation: null, ssEligible: null, ssMonthly: null, ssClaimAge: null, actualReturn: null, returnBasis: null },
        // clear onboarding-seeded goals (keep hand-added ones) + reset the seed flag so a re-run re-seeds
        goals: s.goals.filter((g) => g.origin !== 'onboarding'), goalsSeeded: false,
        ...(s.nwSeeded ? {
          assetAccounts: s.assetAccounts.filter((a) => a.origin !== 'onboarding'),
          liabilities: s.liabilities.filter((d) => d.origin !== 'onboarding'),
          nwSeeded: false, nwSetupChoice: null, monthlySnapshots: {}, nwDaily: {},
        } : {}),
      })),

      loadFromCloud: (data) => set((s) => ({
        ...s,
        ...data,
        user: s.user,
      })),
    }),
    {
      name: 'finwise-storage-v3',
      storage: createJSONStorage(() => secureStorage),   // AES-encrypted at rest (key in SecureStore)
    }
  )
);

// ── Selectors ──────────────────────────────────────────────────────────
export function useMonthlyStats() {
  const { incomes, expenses, savings, budgetFrequency, monthlyBudgetTarget } = useStore();
  const now = new Date();

  const filterByPeriod = (date: string) => {
    const d = new Date(date);
    if (budgetFrequency === 'daily') {
      return d.toDateString() === now.toDateString();
    } else if (budgetFrequency === 'weekly') {
      const weekAgo = new Date(now.getTime() - 7 * 86400000);
      return d >= weekAgo;
    } else {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
  };

  const periodIncome  = incomes.filter((i) => filterByPeriod(i.date)).reduce((s, i) => s + i.amount, 0);
  const periodSpend   = expenses.filter((e) => filterByPeriod(e.date)).reduce((s, e) => s + e.amount, 0);
  const periodSavings = savings.filter((s) => filterByPeriod(s.date)).reduce((sum, s) => sum + s.amount, 0);
  const totalSavings  = savings.reduce((s, e) => s + e.amount, 0);
  const remaining     = periodIncome - periodSpend - periodSavings;
  const pctSpent      = periodIncome > 0 ? Math.min((periodSpend / periodIncome) * 100, 100) : 0;
  const isOverBudget  = periodSpend + periodSavings > periodIncome && periodIncome > 0;

  return {
    periodIncome, periodSpend, periodSavings,
    monthIncome: periodIncome,
    monthSpend: periodSpend,
    totalSavings, remaining, pctSpent, isOverBudget,
  };
}

export function useCategorySpend() {
  const { expenses, budgetFrequency } = useStore();
  const now = new Date();
  const filtered = expenses.filter((e) => {
    const d = new Date(e.date);
    if (budgetFrequency === 'daily') return d.toDateString() === now.toDateString();
    if (budgetFrequency === 'weekly') return d >= new Date(now.getTime() - 7 * 86400000);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const map: Record<string, number> = {};
  filtered.forEach((e) => { map[e.category] = (map[e.category] || 0) + e.amount; });
  return Object.entries(map).map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
}

export function useLevel() {
  const xp = useStore((s) => s.xp);
  const levels = [
    { level: 1, name: 'Beginner',       min: 0 },
    { level: 2, name: 'Saver',          min: 100 },
    { level: 3, name: 'Planner',        min: 300 },
    { level: 4, name: 'Budgeter',       min: 600 },
    { level: 5, name: 'Investor',       min: 1000 },
    { level: 6, name: 'Strategist',     min: 1500 },
    { level: 7, name: 'Money Master',   min: 2200 },
    { level: 8, name: 'Wealth Builder', min: 3000 },
    { level: 9, name: 'Financial Guru', min: 4000 },
    { level: 10,name: 'MoneyKeel Legend', min: 5500 },
  ];
  let current = levels[0], next = levels[1];
  for (let i = 0; i < levels.length; i++) {
    if (xp >= levels[i].min) { current = levels[i]; next = levels[i + 1] || levels[levels.length - 1]; }
  }
  const pct = next.min > current.min ? Math.min(((xp - current.min) / (next.min - current.min)) * 100, 100) : 100;
  return { ...current, next, xp, pct };
}

// useNetWorth (legacy net-worth path over the deprecated savings/investments/debts arrays) was REMOVED:
// it computed a second, independent net worth the UI never showed (P0: three coexisting net-worth paths).
// The one net worth = buildNetWorth over resolveNetWorthRows — everywhere, including frozen history.
