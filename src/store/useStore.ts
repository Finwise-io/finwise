import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureStorage } from './secureStorage';
import { assetsFromOnboarding, type AssetAccount } from '../domain/assets';
import { benchmarkTicker, marketValue, latestClose, type Position, type PriceSeries } from '../domain/performance';
import { applyTransaction, makeTransaction, type Transaction } from '../domain/transactions';
import { round2 } from '../domain/_shared/num';
import { fetchPriceSeries } from '../services/marketData';

// Recompute the cached `balance` of every ledger-managed account = cash sleeve + Σ(position × live price).
// Pure manual accounts (no positions, no cash sleeve) keep their entered balance.
function recomputeBalances(accs: AssetAccount[], cache: Record<string, PriceSeries>): AssetAccount[] {
  return accs.map((a) => {
    const ledgerManaged = (a.positions?.length ?? 0) > 0 || a.cash_balance != null;
    if (!ledgerManaged) return a;
    const mv = (a.positions ?? []).reduce((t, p) => { const px = latestClose(cache[p.ticker.trim().toUpperCase()]); return t + (px == null ? 0 : marketValue(p, px)); }, 0);
    return { ...a, balance: round2((a.cash_balance || 0) + mv) };
  });
}
import { debtsFromOnboarding, type Debt } from '../domain/debt';
import { newEntityId } from '../domain/_shared/ids';
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
  nwSetupChoice: 'guided' | 'self' | null;
  allocatedByMonth: Record<string, number>;     // 'YYYY-MM' → total savings allocated to assets
  allocPromptSkipped: Record<string, boolean>;   // months where the user dismissed the allocate prompt
  monthlySnapshots: Record<string, any>;         // 'YYYY-MM' → frozen month-end metrics (net worth, income, spend, savings, debt)
  retirementAssumptions: RetirementAssumptions;   // user overrides for the retirement projection (null fields → derive from data)
  estatePlan: Record<string, boolean>;            // estate checklist: item id → done
  retirementScenarios: RetirementScenario[];      // saved what-if scenarios
  benchmarkReturns: Record<string, number>;       // asset-kind → expected annual return (decimal); overrides ASSET_KINDS defaults
  priceCache: Record<string, PriceSeries>;        // ticker (UPPERCASE) → daily close series (for performance + live value)
  pricesFetchedAt: string | null;                 // ISO of last successful market-data refresh
  transactions: Transaction[];                    // append-only ledger (newest first) — audit/history

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
  fontScale: number;   // 1 = default, 1.15 large, 1.3 larger (accessibility)

  // Economic data
  inflationRate: number;
  treasuryYield: number;

  // Actions - Auth
  setUser: (user: UserProfile | null) => void;
  setOnboardingComplete: (v: boolean) => void;
  setOnboardingPaused: (v: boolean) => void;
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
  updateAsset: (id: string, updates: Partial<AssetAccount>) => void;
  deleteAsset: (id: string) => void;
  addPosition: (accountId: string, position: Omit<Position, 'position_id'>) => void;
  updatePosition: (accountId: string, positionId: string, patch: Partial<Position>) => void;
  deletePosition: (accountId: string, positionId: string) => void;
  refreshPrices: () => Promise<void>;
  maybeRefreshPrices: () => Promise<void>;   // throttled (10 min) — safe to call on screen open
  recordTransaction: (t: Omit<Transaction, 'id' | 'created_at'>) => void;   // append to ledger + apply to accounts
  deleteTransaction: (id: string) => void;
  addLiability: (d: Omit<Debt, 'debt_id'>) => void;
  updateLiability: (id: string, updates: Partial<Debt>) => void;
  deleteLiability: (id: string) => void;
  seedNetWorth: (op: Record<string, any> | null) => void;
  setNwSetupChoice: (v: 'guided' | 'self' | null) => void;
  allocateSavings: (ym: string, items: { assetId: string; amount: number }[]) => void;
  skipAllocPrompt: (ym: string) => void;
  captureMonthlySnapshot: (ym: string, data: any) => void;
  setRetirementAssumptions: (patch: Partial<RetirementAssumptions>) => void;
  toggleEstateItem: (id: string) => void;
  saveRetirementScenario: (name: string, assumptions: Partial<RetirementAssumptions>, retireAge: number, chance: number) => void;
  deleteRetirementScenario: (id: string) => void;
  setBenchmarkReturn: (kind: string, ret: number) => void;
  setCurrency: (currency: string, locale?: string) => void;
  setDisplayMode: (m: 'simple' | 'advisor') => void;
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
      nwSetupChoice: null,
      allocatedByMonth: {},
      allocPromptSkipped: {},
      monthlySnapshots: {},
      retirementAssumptions: { retireAge: null, horizonAge: null, contribMonthly: null, spendMonthly: null, guaranteedMonthly: null, risk: null, expectedReturn: null, inflation: null, ssEligible: null, ssMonthly: null, ssClaimAge: null, actualReturn: null, returnBasis: null },
      estatePlan: {},
      retirementScenarios: [],
      benchmarkReturns: {},
      priceCache: {},
      pricesFetchedAt: null,
      transactions: [],
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
      fontScale: 1,
      inflationRate: 3.2,
      treasuryYield: 4.35,

      // ── Auth actions ─────────────────────────────────────────────
      setUser: (user) => set({ user }),
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
        const accounts = applyTransaction(s.assetAccounts, t);
        return { assetAccounts: recomputeBalances(accounts, s.priceCache), transactions: [t, ...s.transactions] };
      }),
      deleteTransaction: (id) => set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) })),
      // Fetch live prices for every held ticker (+ its benchmark) and refresh each position-account's
      // balance = Σ(shares × latest price). Balance becomes a cache derived from positions.
      refreshPrices: async () => {
        const accts = get().assetAccounts;
        const tickers: string[] = [];
        accts.forEach((a) => (a.positions ?? []).forEach((p) => { tickers.push(p.ticker); tickers.push(benchmarkTicker(p.kind)); }));
        if (!tickers.length) return;
        const fetched = await fetchPriceSeries(tickers);
        if (!Object.keys(fetched).length) return;            // offline/blocked → keep cache
        const cache = { ...get().priceCache, ...fetched };
        set({ priceCache: cache, pricesFetchedAt: new Date().toISOString(), assetAccounts: recomputeBalances(get().assetAccounts, cache) });
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
      skipAllocPrompt: (ym) => set((s) => ({ allocPromptSkipped: { ...s.allocPromptSkipped, [ym]: true } })),
      // Freeze a month's metrics. The CURRENT month is overwritten on each change (so it ends the month
      // at its final state); past months stay frozen. We keep ALL months (history is cheap, data is key).
      captureMonthlySnapshot: (ym, data) => set((s) => ({ monthlySnapshots: { ...s.monthlySnapshots, [ym]: { ...data } } })),
      setRetirementAssumptions: (patch) => set((s) => ({ retirementAssumptions: { ...s.retirementAssumptions, ...patch } })),
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
        assetAccounts: [], liabilities: [], nwSeeded: false, nwSetupChoice: null,
        allocatedByMonth: {}, allocPromptSkipped: {}, monthlySnapshots: {},
        retirementAssumptions: { retireAge: null, horizonAge: null, contribMonthly: null, spendMonthly: null, guaranteedMonthly: null, risk: null, expectedReturn: null, inflation: null, ssEligible: null, ssMonthly: null, ssClaimAge: null, actualReturn: null, returnBasis: null },
      estatePlan: {},
        retirementScenarios: [],
        benchmarkReturns: {},
        priceCache: {}, pricesFetchedAt: null, transactions: [],
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
        selectedGoals: [], retirementPlan: null, retirementScenarios: [],
        retirementAssumptions: { retireAge: null, horizonAge: null, contribMonthly: null, spendMonthly: null, guaranteedMonthly: null, risk: null, expectedReturn: null, inflation: null, ssEligible: null, ssMonthly: null, ssClaimAge: null, actualReturn: null, returnBasis: null },
        ...(s.nwSeeded ? {
          assetAccounts: s.assetAccounts.filter((a) => a.origin !== 'onboarding'),
          liabilities: s.liabilities.filter((d) => d.origin !== 'onboarding'),
          nwSeeded: false, nwSetupChoice: null, monthlySnapshots: {},
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
    { level: 10,name: 'FinWise Legend', min: 5500 },
  ];
  let current = levels[0], next = levels[1];
  for (let i = 0; i < levels.length; i++) {
    if (xp >= levels[i].min) { current = levels[i]; next = levels[i + 1] || levels[levels.length - 1]; }
  }
  const pct = next.min > current.min ? Math.min(((xp - current.min) / (next.min - current.min)) * 100, 100) : 100;
  return { ...current, next, xp, pct };
}

export function useNetWorth() {
  const { savings, investments, debts } = useStore();
  const totalSavings     = savings.reduce((s, e) => s + e.amount, 0);
  const totalInvestments = investments.reduce((s, e) => s + e.amount, 0);
  const totalDebt        = debts.reduce((s, d) => s + d.balance, 0);
  return { totalSavings, totalInvestments, totalDebt, netWorth: totalSavings + totalInvestments - totalDebt };
}
