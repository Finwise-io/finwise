import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export type RetirementPlan = {
  currentAge: number;
  retireAge: number;
  currentSavings: number;
  monthlyContribution: number;
  expectedReturn: number;
  nestEggYears: number;
  targetYear: number;
};

type AppState = {
  // Auth
  user: UserProfile | null;
  onboardingComplete: boolean;

  // Onboarding settings
  selectedGoals: string[];
  budgetFrequency: 'daily' | 'weekly' | 'monthly' | 'annually';
  payFrequency: string;
  incomeIsFixed: boolean;
  budgetCategories: BudgetCategory[];
  expenseTargetType: 'fixed' | 'percent';
  expenseTargetAmount: number;
  expenseTargetPercent: number;
  savingsDistribution: 'fixed' | 'percent' | 'leftover';

  // Data
  incomes: IncomeEntry[];
  expenses: ExpenseEntry[];
  recurringIncomes: RecurringIncome[];
  savings: SavingsEntry[];
  investments: InvestmentEntry[];
  goals: Goal[];
  badges: Badge[];
  retirementPlan: RetirementPlan | null;

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

  // Economic data
  inflationRate: number;
  treasuryYield: number;
  lastEconomicFetch: string | null;

  // Actions - Auth
  setUser: (user: UserProfile | null) => void;
  setOnboardingComplete: (v: boolean) => void;

  // Actions - Onboarding
  setSelectedGoals: (goals: string[]) => void;
  setBudgetFrequency: (f: 'daily' | 'weekly' | 'monthly' | 'annually') => void;
  setPayFrequency: (f: string) => void;
  setIncomeIsFixed: (v: boolean) => void;
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
  addRecurringIncome: (entry: Omit<RecurringIncome, 'id'>) => void;
  updateRecurringIncome: (id: string, updates: Partial<RecurringIncome>) => void;
  deleteRecurringIncome: (id: string) => void;
  applyRecurringIncomes: () => void;

  addGoal: (goal: Omit<Goal, 'id'>) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  importFromCSV: (rows: Record<string, string>[]) => void;

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

      // Onboarding settings
      selectedGoals: [],
      budgetFrequency: 'monthly',
      payFrequency: 'monthly',
      incomeIsFixed: true,
      budgetCategories: [],
      expenseTargetType: 'percent',
      expenseTargetAmount: 0,
      expenseTargetPercent: 80,
      savingsDistribution: 'leftover',
      retirementPlan: null,

      // Data
      incomes: [],
      expenses: [],
      recurringIncomes: [],
      savings: [],
      investments: [],
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
      inflationRate: 3.2,
      treasuryYield: 4.35,
      lastEconomicFetch: null,

      // ── Auth actions ─────────────────────────────────────────────
      setUser: (user) => set({ user }),
      setOnboardingComplete: (v) => set({ onboardingComplete: v }),

      // ── Onboarding actions ───────────────────────────────────────
      setSelectedGoals: (goals) => set({ selectedGoals: goals }),
      setBudgetFrequency: (f) => set({ budgetFrequency: f }),
      setPayFrequency: (f) => set({ payFrequency: f }),
      setIncomeIsFixed: (v) => set({ incomeIsFixed: v }),
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

          // Generate all missed entries up to and including today
          let updated = { ...r };
          while (next <= today) {
            state.addIncome({
              type: 'recurring',
              amount: r.amount,
              source: r.source,
              date: next.toISOString(),
              notes: `Auto: ${r.frequency}`,
            });
            // Advance nextDate
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
        set({ inflationRate: inflation, treasuryYield: treasury, lastEconomicFetch: new Date().toISOString() }),

      resetAll: () => set({
        incomes: [], expenses: [], savings: [], investments: [],
        recurringIncomes: [],
        goals: [], badges: DEFAULT_BADGES, xp: 0, streak: 0,
        lastCheckIn: null, onboardingComplete: false, retirementPlan: null,
        selectedGoals: [], budgetCategories: [],
      }),

      loadFromCloud: (data) => set((s) => ({
        ...s,
        ...data,
        // Never overwrite user from cloud — that comes from Firebase Auth
        user: s.user,
      })),
    }),
    {
      name: 'finwise-storage-v2',
      storage: createJSONStorage(() => AsyncStorage),
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
    // Period names (correct)
    periodIncome, periodSpend, periodSavings,
    // Month aliases (used by HomeScreen, AnalyticsScreen, TipsScreen)
    monthIncome: periodIncome,
    monthSpend: periodSpend,
    // Shared
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
    { level: 1, name: 'Beginner',      min: 0 },
    { level: 2, name: 'Saver',         min: 100 },
    { level: 3, name: 'Planner',       min: 300 },
    { level: 4, name: 'Budgeter',      min: 600 },
    { level: 5, name: 'Investor',      min: 1000 },
    { level: 6, name: 'Strategist',    min: 1500 },
    { level: 7, name: 'Money Master',  min: 2200 },
    { level: 8, name: 'Wealth Builder',min: 3000 },
    { level: 9, name: 'Financial Guru',min: 4000 },
    { level: 10,name: 'FinWise Legend',min: 5500 },
  ];
  let current = levels[0], next = levels[1];
  for (let i = 0; i < levels.length; i++) {
    if (xp >= levels[i].min) { current = levels[i]; next = levels[i + 1] || levels[levels.length - 1]; }
  }
  const pct = next.min > current.min ? Math.min(((xp - current.min) / (next.min - current.min)) * 100, 100) : 100;
  return { ...current, next, xp, pct };
}
