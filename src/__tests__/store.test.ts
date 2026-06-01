/**
 * Tests for the Zustand store — actions, selectors, and gamification.
 * Uses useStore.getState() / setState() directly to avoid React rendering overhead.
 */

const _storage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem:    jest.fn((k: string) => Promise.resolve(_storage[k] ?? null)),
    setItem:    jest.fn((k: string, v: string) => { _storage[k] = v; return Promise.resolve(); }),
    removeItem: jest.fn((k: string) => { delete _storage[k]; return Promise.resolve(); }),
    clear:      jest.fn(() => { Object.keys(_storage).forEach(k => delete _storage[k]); return Promise.resolve(); }),
    getAllKeys:  jest.fn(() => Promise.resolve(Object.keys(_storage))),
    multiGet:   jest.fn((keys: string[]) => Promise.resolve(keys.map(k => [k, _storage[k] ?? null]))),
    multiSet:   jest.fn((pairs: [string, string][]) => { pairs.forEach(([k, v]) => { _storage[k] = v; }); return Promise.resolve(); }),
  },
}));

import { useStore } from '../store/useStore';

// Reset store state before every test
beforeEach(() => {
  useStore.getState().resetAll();
});

// ── Expenses ────────────────────────────────────────────────────────────────

describe('addExpense', () => {
  it('adds an expense with a generated id and createdAt', () => {
    const { addExpense } = useStore.getState();
    addExpense({ amount: 25, category: 'Dining', store: 'Chipotle', date: new Date().toISOString() });
    const { expenses } = useStore.getState();
    expect(expenses).toHaveLength(1);
    expect(expenses[0].id).toBeTruthy();
    expect(expenses[0].createdAt).toBeTruthy();
    expect(expenses[0].amount).toBe(25);
    expect(expenses[0].category).toBe('Dining');
  });

  it('prepends new expenses (most recent first)', () => {
    const { addExpense } = useStore.getState();
    addExpense({ amount: 10, category: 'Groceries', store: 'Trader Joe\'s', date: new Date().toISOString() });
    addExpense({ amount: 20, category: 'Dining', store: 'Pizza Place', date: new Date().toISOString() });
    const { expenses } = useStore.getState();
    expect(expenses[0].amount).toBe(20);
  });

  it('awards at least 10 XP per expense (first expense also earns the badge +50)', () => {
    const before = useStore.getState().xp;
    useStore.getState().addExpense({ amount: 50, category: 'Gas', store: 'Shell', date: new Date().toISOString() });
    // First expense earns 10 XP + 50 XP for the first_expense badge
    expect(useStore.getState().xp).toBe(before + 60);
    // Second expense earns only 10 XP (badge already earned)
    const after = useStore.getState().xp;
    useStore.getState().addExpense({ amount: 20, category: 'Dining', store: 'Y', date: new Date().toISOString() });
    expect(useStore.getState().xp).toBe(after + 10);
  });

  it('earns first_expense badge on first expense', () => {
    useStore.getState().addExpense({ amount: 10, category: 'Fun', store: 'Netflix', date: new Date().toISOString() });
    const badge = useStore.getState().badges.find(b => b.id === 'first_expense');
    expect(badge?.earned).toBe(true);
  });
});

describe('deleteExpense', () => {
  it('removes the expense with the matching id', () => {
    useStore.getState().addExpense({ amount: 10, category: 'Groceries', store: 'Whole Foods', date: new Date().toISOString() });
    const id = useStore.getState().expenses[0].id;
    useStore.getState().deleteExpense(id);
    expect(useStore.getState().expenses).toHaveLength(0);
  });

  it('leaves other expenses untouched', () => {
    const { addExpense, deleteExpense } = useStore.getState();
    addExpense({ amount: 10, category: 'Groceries', store: 'A', date: new Date().toISOString() });
    addExpense({ amount: 20, category: 'Dining', store: 'B', date: new Date().toISOString() });
    const firstId = useStore.getState().expenses[1].id; // older one
    deleteExpense(firstId);
    expect(useStore.getState().expenses).toHaveLength(1);
    expect(useStore.getState().expenses[0].store).toBe('B');
  });
});

describe('updateExpense', () => {
  it('updates specified fields only', () => {
    useStore.getState().addExpense({ amount: 30, category: 'Fun', store: 'Cinema', date: new Date().toISOString() });
    const id = useStore.getState().expenses[0].id;
    useStore.getState().updateExpense(id, { amount: 45, store: 'IMAX' });
    const updated = useStore.getState().expenses[0];
    expect(updated.amount).toBe(45);
    expect(updated.store).toBe('IMAX');
    expect(updated.category).toBe('Fun'); // unchanged
  });
});

// ── Incomes ─────────────────────────────────────────────────────────────────

describe('addIncome', () => {
  it('adds an income entry with generated id', () => {
    useStore.getState().addIncome({ type: 'salary', amount: 3000, source: 'Job', date: new Date().toISOString() });
    expect(useStore.getState().incomes).toHaveLength(1);
    expect(useStore.getState().incomes[0].amount).toBe(3000);
  });

  it('awards 15 XP per income entry', () => {
    const before = useStore.getState().xp;
    useStore.getState().addIncome({ type: 'salary', amount: 1000, source: 'Freelance', date: new Date().toISOString() });
    expect(useStore.getState().xp).toBeGreaterThanOrEqual(before + 15);
  });

  it('earns first_income badge', () => {
    useStore.getState().addIncome({ type: 'salary', amount: 500, source: 'Side gig', date: new Date().toISOString() });
    const badge = useStore.getState().badges.find(b => b.id === 'first_income');
    expect(badge?.earned).toBe(true);
  });
});

describe('deleteIncome', () => {
  it('removes income by id', () => {
    useStore.getState().addIncome({ type: 'salary', amount: 1000, source: 'Job', date: new Date().toISOString() });
    const id = useStore.getState().incomes[0].id;
    useStore.getState().deleteIncome(id);
    expect(useStore.getState().incomes).toHaveLength(0);
  });
});

// ── Debts ────────────────────────────────────────────────────────────────────

describe('addDebt', () => {
  it('adds a debt entry with generated id', () => {
    useStore.getState().addDebt({
      name: 'Credit Card', type: 'credit_card',
      balance: 2000, interestRate: 22.9, minimumPayment: 50,
      date: new Date().toISOString(),
    });
    expect(useStore.getState().debts).toHaveLength(1);
    expect(useStore.getState().debts[0].balance).toBe(2000);
  });
});

describe('deleteDebt', () => {
  it('removes debt by id', () => {
    useStore.getState().addDebt({
      name: 'Student Loan', type: 'student_loan',
      balance: 15000, interestRate: 5.5, minimumPayment: 150,
      date: new Date().toISOString(),
    });
    const id = useStore.getState().debts[0].id;
    useStore.getState().deleteDebt(id);
    expect(useStore.getState().debts).toHaveLength(0);
  });
});

describe('updateDebt', () => {
  it('updates debt balance', () => {
    useStore.getState().addDebt({
      name: 'Car Loan', type: 'car_loan',
      balance: 8000, interestRate: 6.5, minimumPayment: 300,
      date: new Date().toISOString(),
    });
    const id = useStore.getState().debts[0].id;
    useStore.getState().updateDebt(id, { balance: 7500 });
    expect(useStore.getState().debts[0].balance).toBe(7500);
  });
});

// ── Goals ────────────────────────────────────────────────────────────────────

describe('addGoal', () => {
  it('adds a goal and earns goal_set badge', () => {
    useStore.getState().addGoal({
      label: 'Vacation', icon: '✈️', target: 3000, saved: 0, color: '#00c878',
    });
    expect(useStore.getState().goals).toHaveLength(1);
    const badge = useStore.getState().badges.find(b => b.id === 'goal_set');
    expect(badge?.earned).toBe(true);
  });
});

describe('deleteGoal', () => {
  it('removes goal by id', () => {
    useStore.getState().addGoal({ label: 'Car', icon: '🚗', target: 10000, saved: 0, color: '#blue' });
    const id = useStore.getState().goals[0].id;
    useStore.getState().deleteGoal(id);
    expect(useStore.getState().goals).toHaveLength(0);
  });
});

// ── Custom Categories ────────────────────────────────────────────────────────

describe('addCustomCategory', () => {
  it('adds a custom category', () => {
    useStore.getState().addCustomCategory({ label: 'Pets', icon: '🐾', bg: '#E1F5EE' });
    expect(useStore.getState().customCategories).toHaveLength(1);
    expect(useStore.getState().customCategories[0].label).toBe('Pets');
  });
});

describe('deleteCustomCategory', () => {
  it('removes custom category by label', () => {
    useStore.getState().addCustomCategory({ label: 'Pets', icon: '🐾', bg: '#E1F5EE' });
    useStore.getState().addCustomCategory({ label: 'Travel', icon: '✈️', bg: '#E3F2FD' });
    useStore.getState().deleteCustomCategory('Pets');
    expect(useStore.getState().customCategories).toHaveLength(1);
    expect(useStore.getState().customCategories[0].label).toBe('Travel');
  });
});

// ── CSV Import ───────────────────────────────────────────────────────────────

describe('importFromCSV', () => {
  it('imports valid rows as expenses', () => {
    useStore.getState().importFromCSV([
      { amount: '25.50', category: 'Groceries', store: 'Trader Joe\'s', date: '2026-05-01' },
      { amount: '12.00', category: 'Dining', store: 'Chipotle', date: '2026-05-02' },
    ]);
    expect(useStore.getState().expenses).toHaveLength(2);
    expect(useStore.getState().expenses[0].amount).toBe(25.5);
  });

  it('skips rows missing amount or category', () => {
    useStore.getState().importFromCSV([
      { amount: '', category: 'Dining', store: 'X', date: '2026-05-01' },    // no amount
      { amount: '10', category: '', store: 'Y', date: '2026-05-01' },         // no category
      { amount: '30', category: 'Gas', store: 'Shell', date: '2026-05-01' }, // valid
    ]);
    expect(useStore.getState().expenses).toHaveLength(1);
  });

  it('awards XP proportional to number of imported rows', () => {
    const before = useStore.getState().xp;
    useStore.getState().importFromCSV([
      { amount: '10', category: 'Groceries', store: 'A', date: '2026-05-01' },
      { amount: '20', category: 'Dining',    store: 'B', date: '2026-05-01' },
    ]);
    expect(useStore.getState().xp).toBe(before + 10); // 2 rows × 5 XP
  });
});

// ── Gamification ─────────────────────────────────────────────────────────────

describe('addXP', () => {
  it('accumulates XP correctly', () => {
    useStore.getState().addXP(50);
    useStore.getState().addXP(25);
    expect(useStore.getState().xp).toBe(75);
  });
});

describe('earnBadge', () => {
  it('marks a badge as earned and awards 50 XP', () => {
    const before = useStore.getState().xp;
    useStore.getState().earnBadge('investor');
    const badge = useStore.getState().badges.find(b => b.id === 'investor');
    expect(badge?.earned).toBe(true);
    expect(badge?.earnedAt).toBeTruthy();
    expect(useStore.getState().xp).toBe(before + 50);
  });

  it('does not award XP twice for the same badge', () => {
    useStore.getState().earnBadge('investor');
    const xpAfterFirst = useStore.getState().xp;
    useStore.getState().earnBadge('investor');
    expect(useStore.getState().xp).toBe(xpAfterFirst);
  });
});

describe('checkStreak', () => {
  it('sets streak to 1 on first check-in', () => {
    useStore.getState().checkStreak();
    expect(useStore.getState().streak).toBe(1);
  });

  it('does not increment streak if already checked in today', () => {
    useStore.getState().checkStreak();
    useStore.getState().checkStreak();
    expect(useStore.getState().streak).toBe(1);
  });
});

// ── Net Worth ─────────────────────────────────────────────────────────────────

describe('net worth calculation', () => {
  it('netWorth = savings + investments - debts', () => {
    useStore.getState().addSavings({ amount: 5000, label: 'Emergency', date: new Date().toISOString() });
    useStore.getState().addInvestment({ amount: 10000, type: '401k', date: new Date().toISOString() });
    useStore.getState().addDebt({
      name: 'Car Loan', type: 'car_loan',
      balance: 3000, interestRate: 5, minimumPayment: 200,
      date: new Date().toISOString(),
    });
    const { savings, investments, debts } = useStore.getState();
    const totalSavings     = savings.reduce((s, e) => s + e.amount, 0);
    const totalInvestments = investments.reduce((s, e) => s + e.amount, 0);
    const totalDebt        = debts.reduce((s, d) => s + d.balance, 0);
    const netWorth = totalSavings + totalInvestments - totalDebt;
    expect(netWorth).toBe(12000); // 5000 + 10000 - 3000
  });

  it('netWorth is negative when debts exceed assets', () => {
    useStore.getState().addDebt({
      name: 'Mortgage', type: 'mortgage',
      balance: 300000, interestRate: 4.5, minimumPayment: 1500,
      date: new Date().toISOString(),
    });
    const { savings, investments, debts } = useStore.getState();
    const totalSavings     = savings.reduce((s, e) => s + e.amount, 0);
    const totalInvestments = investments.reduce((s, e) => s + e.amount, 0);
    const totalDebt        = debts.reduce((s, d) => s + d.balance, 0);
    expect(totalSavings + totalInvestments - totalDebt).toBe(-300000);
  });
});

// ── Retirement Plan ──────────────────────────────────────────────────────────

describe('setRetirementPlan', () => {
  it('saves the retirement plan to store', () => {
    const plan = {
      currentAge: 30, retireAge: 65, monthlyIncome: 5000, currentSavings: 20000,
      monthlyContribution: 500, employerMonthlyMatch: 200,
      expectedReturn: 7, nestEggYears: 20, targetYear: 2056,
    };
    useStore.getState().setRetirementPlan(plan);
    expect(useStore.getState().retirementPlan).toEqual(plan);
  });

  it('earns the retirement_set badge', () => {
    useStore.getState().setRetirementPlan({
      currentAge: 28, retireAge: 65, monthlyIncome: 4000, currentSavings: 5000,
      monthlyContribution: 300, employerMonthlyMatch: 150,
      expectedReturn: 7, nestEggYears: 20, targetYear: 2063,
    });
    const badge = useStore.getState().badges.find(b => b.id === 'retirement_set');
    expect(badge?.earned).toBe(true);
  });
});

// ── resetAll ─────────────────────────────────────────────────────────────────

describe('resetAll', () => {
  it('clears all user data and resets gamification', () => {
    const { addExpense, addIncome, addDebt, addXP, resetAll } = useStore.getState();
    addExpense({ amount: 10, category: 'Fun', store: 'X', date: new Date().toISOString() });
    addIncome({ type: 'salary', amount: 1000, source: 'Job', date: new Date().toISOString() });
    addDebt({ name: 'CC', type: 'credit_card', balance: 500, interestRate: 20, minimumPayment: 25, date: new Date().toISOString() });
    addXP(100);
    resetAll();
    const s = useStore.getState();
    expect(s.expenses).toHaveLength(0);
    expect(s.incomes).toHaveLength(0);
    expect(s.debts).toHaveLength(0);
    expect(s.xp).toBe(0);
    expect(s.streak).toBe(0);
    expect(s.onboardingComplete).toBe(false);
    expect(s.retirementPlan).toBeNull();
  });
});
