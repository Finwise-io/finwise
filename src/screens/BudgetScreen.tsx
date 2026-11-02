import { MoneyBox } from '../components/MoneyBox';   // every money box, one component (DEC-8385)
import { plural } from '../domain/_shared/plural';   // the one list of words and plurals (DEC-4082, 2026-10-10)
import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, FlatList,
  Modal, TextInput, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { fig, figPer, figSaid, figWords, saidSentence } from '../components/figure';   // rule 11: a figure prints with its identifier
import { SaidText } from '../components/SaidText';   // a line that prints figures, said through the one spoken writer (E2E-78)
import { readFileString } from '../services/fileRead';   // T19: supported read path
import { useRouter } from 'expo-router';
import { useStore, useMonthlyStats, DebtEntry } from '../store/useStore';
import { incomeProfileNow } from '../hooks/useIncomeProfile';   // the one profile income figures read (2026-10-26)
import { Card, SegmentedControl, Badge, Button, TipCard, ProgressBar, InfoDot, EmptyNote } from '../components/UI';
import { Colors, Typography, Spacing, Radii, Tap } from '../utils/theme';
import { getCategoryIcon, getCategoryBg, EXPENSE_CATEGORIES, CATEGORY_EMOJI_OPTIONS, CATEGORY_BG_OPTIONS, useAllCategories, BUDGET_CATEGORIES, categoryBucketFor, budgetCategoryIcon } from '../constants/categories';
import { budgetVsActual, plannedMonthlySpend, budgetEditorBuckets } from '../domain/budget';   // categoryMonthly dropped 2026-10-26: imported, never read (D1)
import { takeHomeMonthly, monthlySavings } from '../domain/savings';   // canonical take-home + planned surplus
import { incomeMonthlyGrid } from '../domain/income';
import { MortgageRateCompare } from '../components/MortgageRateCompare';
import { willItLastInputs } from '../domain/retirement/willItLast';
import { FALLBACK_TREASURY } from '../services/economicData';
import { minimumDebtService, payoffPlan, requiredPayment, debtKind, paymentShape, rateNotEntered, setupStudentLoans, setupLoanSentences, type PayoffMethod, type Debt } from '../domain/debt';
import { theDebts, debtLoad } from '../../MoneyKeel/functions/cashflow/the-debts';   // debtLoad: what the debts ask of the income (2026-11-01)
import { theNetWorth } from '../../MoneyKeel/functions/networth-and-performance/net-worth';   // which debts' payments were never entered: the one list
import { useNetWorthInputs } from '../hooks/useNetWorthInputs';
import { theMonth } from '../../MoneyKeel/functions/cashflow/the-month';   // the budget card is this month's plan (2026-10-24)
import { useThisMonthInputs } from '../hooks/useCashflowModel';
import { monthShown } from '../components/figure';
import { percentDigits } from '../../MoneyKeel/functions/_figure-spec';   // a percent to two decimals, the one rounding (Q49; CF2-11, 2026-10-27)
import { theBudgetCounted, expensesAsCounted } from '../../MoneyKeel/functions/cashflow/budget-counted';   // the budget as This month counts it (DEC-1923)
import { SectionBand } from '../components/SectionBand';
import { DebtEditorSheet } from '../components/DebtEditorSheet';   // B47 finding 11: THE one debt editor (same sheet as Net worth)
import { money, money2 } from '../domain/_shared/num';
import { Swipeable } from 'react-native-gesture-handler';
import { format } from 'date-fns';
import { modalAnimation } from '../hooks/reducedMotion';
import { isoLocalDate, localDay, localMoment } from '../domain/_shared/dates';

type Tab = 'Activity' | 'Budget' | 'Debts' | 'Import';

const DEBT_TYPES: { value: DebtEntry['type']; label: string; icon: string }[] = [
  { value: 'credit_card',   label: 'Credit card',   icon: '💳' },
  { value: 'student_loan',  label: 'Student loan',  icon: '🎓' },
  { value: 'car_loan',      label: 'Car loan',       icon: '🚗' },
  { value: 'mortgage',      label: 'Mortgage',      icon: '🏠' },
  { value: 'personal_loan', label: 'Personal loan', icon: '🤝' },
  { value: 'other',         label: 'Other',         icon: '📄' },
];

// v1.3 CASH FLOW SURFACE (founder-approved 2026-07-19): this screen's battle-tested tab bodies now
// ALSO render EMBEDDED inside the consolidated Cash flow surface (its Expenses/Debts tabs and the
// plan editor). `embedded` hides this screen's own tab selector; a provided `monthOffset` makes the
// surface's ONE month switcher steer the Activity body (its own arrows hide). Standalone rendering
// still works (the /budget route redirects, but tests and deep links keep functioning).
/** Days until a debt's next payment is due, from its due day — none when no day is recorded. */
const dueInDays = (d: { due_day?: number | null }): number | null => {
  const dd = d.due_day; if (!dd) return null;
  const now = new Date(); const t = now.getDate();
  const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  let n = dd - t; if (n < 0) n += dim;                 // days to the next occurrence
  return n;
};
/** The words a debt row prints when its payment is due within ten days, and says to a screen reader — one wording for both. */
const dueWords = (d: { due_day?: number | null }): string | null => {
  const n = dueInDays(d);
  if (n == null || n > 10) return null;               // only surface when it's soon
  return n === 0 ? 'payment due today' : `payment due in ${plural(n, 'day')}`;
};
export default function BudgetScreen({ embedded, initialTab, monthOffset: moProp, onMonthOffset }: { embedded?: boolean; initialTab?: 'Activity' | 'Budget' | 'Debts' | 'Import'; monthOffset?: number; onMonthOffset?: (n: number) => void } = {}) {
  const router = useRouter();
  const {
    incomes, expenses, deleteIncome, deleteExpense, importFromCSV,
    addIncome, updateIncome, updateExpense,
    applyRecurringIncomes, applyRecurringExpenses,
    recurringIncomes, recurringExpenses, deleteRecurringIncome, deleteRecurringExpense,
    onboardingProfile: op, setOnboardingProfile, addExpense,
    liabilities, addLiability, updateLiability, deleteLiability,
    debts, deleteDebt,   // legacy — read only for a one-time migration to liabilities
    customCategories, addCustomCategory, deleteCustomCategory,
    treasuryYield, treasuryIsFallback,   // the ten-year, for the mortgage rate comparison
    monthlySnapshots,                    // the month-ends on record — what the Debts tab's PROGRESS measures from
    assetAccounts,                       // where a mortgage's home is, so the budget is counted as This month counts it
  } = useStore() as any;
  // Single source of truth for debt = `liabilities` (Net worth model). Adapt it to the
  // DebtEntry shape this screen's UI already renders.
  const TYPE_UP: Record<string, string> = { credit_card: 'CREDIT_CARD', student_loan: 'STUDENT_LOAN', car_loan: 'AUTO', mortgage: 'MORTGAGE', personal_loan: 'PERSONAL', other: 'OTHER' };
  const TYPE_DOWN: Record<string, DebtEntry['type']> = { CREDIT_CARD: 'credit_card', STUDENT_LOAN: 'student_loan', AUTO: 'car_loan', MORTGAGE: 'mortgage', PERSONAL: 'personal_loan', OTHER: 'other' };
  const toEntry = (d: any): DebtEntry => ({ id: d.debt_id, name: d.label, type: TYPE_DOWN[d.debt_type] ?? 'other', balance: d.remaining_balance || 0, interestRate: (d.interest_rate_apr || 0) * 100, minimumPayment: d.minimum_monthly_payment || 0, date: '' });
  const toDebt = (e: { name: string; type: string; balance: number; interestRate: number; minimumPayment: number }) => ({ label: e.name, debt_type: TYPE_UP[e.type] ?? 'OTHER', remaining_balance: e.balance, interest_rate_apr: (e.interestRate || 0) / 100, minimum_monthly_payment: e.minimumPayment || 0 });
  const debtsView: DebtEntry[] = (liabilities ?? []).map(toEntry);
  // one-time migration of any legacy `debts` into `liabilities`
  React.useEffect(() => {
    if (Array.isArray(debts) && debts.length) {
      debts.forEach((d: DebtEntry) => { addLiability(toDebt(d)); deleteDebt(d.id); });
    }
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  const allCategories = useAllCategories(customCategories || []);
  const { monthIncome, monthSpend } = useMonthlyStats();
  const [tab, setTab] = useState<Tab>(initialTab ?? 'Activity');
  const [filter, setFilter] = useState<'All' | 'Income' | 'Expenses'>('All');
  const [importing, setImporting] = useState(false);
  const [limitsVisible, setLimitsVisible] = useState(false);
  const [draftLimits, setDraftLimits] = useState<Record<string, string>>({});
  const [draftUnits, setDraftUnits] = useState<Record<string, 'dollar' | 'pct'>>({});   // per-category $ or %

  // Custom category form
  const [catFormVisible, setCatFormVisible] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('📦');
  const [newCatBg, setNewCatBg] = useState(Colors.bgSecondary);

  function saveCustomCategory() {
    const label = newCatLabel.trim();
    if (!label) { Alert.alert('Enter a name', 'Category name is required.'); return; }
    if (allCategories.find(c => c.label.toLowerCase() === label.toLowerCase())) {
      Alert.alert('Already exists', 'A category with this name already exists.'); return;
    }
    addCustomCategory({ label, icon: newCatIcon, bg: newCatBg });
    setNewCatLabel(''); setNewCatIcon('📦'); setNewCatBg(Colors.bgSecondary);
    setCatFormVisible(false);
  }

  // Debt editor — the ONE shared sheet (B47 finding 11); the old drifted Modal form is gone
  const [debtSheet, setDebtSheet] = useState<{ open: boolean; edit?: Debt }>({ open: false });
  // payoff plan + log-payment
  const [payoffMethod, setPayoffMethod] = useState<PayoffMethod>('avalanche');
  // PERSISTED (2026-08-14): typing an extra payment used to vanish on leaving the screen, so it
  // never became part of the plan and the retirement effect below could not be computed at all.
  const storedExtra = (useStore.getState() as any).retirementAssumptions?.debtExtraMonthly;
  const [extraPay, setExtraPayRaw] = useState(storedExtra ? String(storedExtra) : '');
  const setExtraPay = (v: string) => {
    setExtraPayRaw(v);
    const n = Number(String(v).replace(/[^0-9.]/g, ''));
    (useStore.getState() as any).setRetirementAssumptions?.({ debtExtraMonthly: n > 0 ? n : null });
  };
  const [payDebt, setPayDebt] = useState<any | null>(null);
  const [payAmt, setPayAmt] = useState('');
  // Activity: month browse, search, add/edit sheet, delete-with-undo
  const [monthOffsetInternal, setMonthOffsetInternal] = useState(0);
  const monthOffset = moProp ?? monthOffsetInternal;
  const setMonthOffset = (f: number | ((m: number) => number)) => {
    const n = typeof f === 'function' ? (f as (m: number) => number)(monthOffset) : f;
    if (onMonthOffset) onMonthOffset(n); else setMonthOffsetInternal(n);
  };
  const [search, setSearch] = useState('');
  const [txnSheet, setTxnSheet] = useState<{ open: boolean; editing?: any }>({ open: false });
  const [deleted, setDeleted] = useState<{ kind: 'income' | 'expense'; entry: any } | null>(null);
  const [recurringMgr, setRecurringMgr] = useState(false);
  // materialize any due recurring income/expenses once when Money opens (idempotent: the function
  // advances each rule's nextDate, so re-running generates nothing until the next period is due)
  React.useEffect(() => { applyRecurringIncomes?.(); applyRecurringExpenses?.(); }, []);

  // ONE DEBT TOTAL (2026-11-01, the lead's R22; CF4-03): a student loan entered in setup is a debt, so YOUR DEBT counts it — it read
  // "$0 · Nothing entered yet" directly above "$30,000 borrowed"
  const setupLoans = setupStudentLoans(op, liabilities ?? []);   // only the setup loans no debt entered is (FX-NW, R22: counted once)
  const totalDebt = debtsView.reduce((s: number, d: DebtEntry) => s + d.balance, 0) + setupLoans.owed;

  function handleDeleteDebt(id: string) {
    Alert.alert('Delete debt', 'Remove this debt entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteLiability(id) },
    ]);
  }

  // forgiving delete (§2.5): remove immediately, surface an Undo banner that re-adds it
  function deleteEntry(kind: 'income' | 'expense', entry: any) {
    setDeleted({ kind, entry });
    if (kind === 'income') deleteIncome(entry.id); else deleteExpense(entry.id);
  }
  function undoDelete() {
    if (!deleted) return;
    const { kind, entry } = deleted;
    if (kind === 'income') addIncome({ type: entry.type ?? 'other', amount: entry.amount, source: entry.source ?? 'Income', date: entry.date, notes: entry.notes, hours: entry.hours, rate: entry.rate });
    else addExpense({ amount: entry.amount, category: entry.category, store: entry.store ?? '', date: entry.date, notes: entry.notes, receiptUri: entry.receiptUri });
    setDeleted(null);
  }
  React.useEffect(() => {
    if (!deleted) return;
    const t = setTimeout(() => setDeleted(null), 5000);
    return () => clearTimeout(t);
  }, [deleted]);

  const allEntries = [
    ...incomes.map((i: any) => ({ ...i, kind: 'income' as const })),
    ...expenses.map((e: any) => ({ ...e, kind: 'expense' as const })),
  ].sort((a, b) => (localMoment(b.date)?.getTime() ?? 0) - (localMoment(a.date)?.getTime() ?? 0));   // each day where the person is (CF-21)

  // Activity: browse by month + free-text search; the strip reflects the SELECTED month
  const selDate = new Date(); selDate.setMonth(selDate.getMonth() + monthOffset);
  const selYm = `${selDate.getFullYear()}-${String(selDate.getMonth() + 1).padStart(2, '0')}`;
  const selMonthLabel = selDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const isCurrentMonth = monthOffset === 0;
  const inSelMonth = (e: any) => localDay(e.date).startsWith(selYm);   // the expense's own day, read where the person is (CF-21)
  const q = search.trim().toLowerCase();
  // Income = recurring take-home for the month (onboarding salary, same source Home/Budget use)
  // + any logged one-time income. Without this, a salaried user with no logged income shows $0.
  const baseNetSel = Math.round((op ? incomeMonthlyGrid(incomeProfileNow(op), 'net') : [])[selDate.getMonth()]?.amount ?? 0);   // the accounts' interest in the tax (2026-10-26, FIX-INCOME-A; src/hooks/useIncomeProfile.ts)
  const loggedIncomeSel = allEntries.filter((e) => e.kind === 'income' && inSelMonth(e)).reduce((t, e) => t + (Number(e.amount) || 0), 0);
  const monthIncomeSel = baseNetSel + loggedIncomeSel;
  const monthSpendSel = allEntries.filter((e) => e.kind === 'expense' && inSelMonth(e)).reduce((t, e) => t + (Number(e.amount) || 0), 0);
  // "Actual expenses" sums ALL expenses, and debt payments are logged as expenses (category 'Debt payment'),
  // so it already includes debt → "Income − spend(incl. debt) = Surplus" (canonical, matches Home/Cash-flow).
  const monthDebtSel = allEntries.filter((e) => e.kind === 'expense' && (e as any).category === 'Debt payment' && inSelMonth(e)).reduce((t, e) => t + (Number(e.amount) || 0), 0);
  const filtered = allEntries.filter((e) => {
    if (!inSelMonth(e)) return false;
    if (filter === 'Income' && e.kind !== 'income') return false;
    if (filter === 'Expenses' && e.kind !== 'expense') return false;
    if (q && !`${e.source ?? ''} ${e.store ?? ''} ${e.category ?? ''} ${e.notes ?? ''}`.toLowerCase().includes(q)) return false;
    return true;
  });
  // synthetic ledger row so the recurring take-home is visible and the Income strip reconciles
  const recurringRow = baseNetSel > 0 && filter !== 'Expenses' && (!q || 'take-home pay income paycheck salary recurring'.includes(q))
    ? { id: '__recurring_income__', kind: 'income' as const, recurring: true, source: 'Take-home pay', amount: baseNetSel, date: `${selYm}-15`, category: '', notes: '' }
    : null;
  const listData: any[] = recurringRow ? [recurringRow, ...filtered] : filtered;

  async function handleImport() {
    try {
      setImporting(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) { setImporting(false); return; }

      const file = result.assets[0];
      const content = await readFileString(file.uri);

      const lines = content.split('\n').filter((l) => l.trim());
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));

      const rows = lines.slice(1).map((line) => {
        const vals = line.split(',').map((v) => v.trim().replace(/"/g, ''));
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = vals[i] || ''; });
        return row;
      });

      importFromCSV(rows);
      Alert.alert(
        'Import complete! 📊',
        `${rows.length} rows imported successfully. Check your activity.`,
        [{ text: 'View activity', onPress: () => setTab('Activity') }]
      );
    } catch (err) {
      Alert.alert('Import failed', 'Could not read the file. Make sure it’s a valid CSV with columns: amount, category, store, date.');
    } finally {
      setImporting(false);
    }
  }

  // ── Budget = the monthly PLAN: Income − Expenses − Debt = Surplus (single source of truth) ──
  const num = (v: any) => parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')) || 0;
  // This is the PLANNED monthly surplus (typical month) — take-home (after tax AND 401k) − planned spend
  // − debt — the SAME canonical monthlySavings the savings rate and Cash-Flow screen use, so the plan
  // total agrees everywhere (2026-06-23 surplus decision). Home shows the "Actual" (this-month) version.
  // THE CARD IS THIS MONTH'S PLAN, FROM THE DOOR THIS MONTH READS (2026-10-24; Cash flow journey E2E-73; DEC-3523 tenets 3
  // and 4; DEC-0002, DEC-0447, DEC-1923): the inputs assembled once (useThisMonthInputs, DEC-0345), MK-CF-O-010 theMonth's
  // planned block, its rows as printed (monthShown). It worked a typical month of its own from the budget as typed: with
  // nothing set it printed "− Expenses (plan) $0 · = Planned surplus $2,350" beside This month's "— not set" and no planned
  // surplus; with a $1,200 December bill it read $100 more expenses in September than This month; a Rent / Mortgage line
  // beside the home's mortgage was counted twice. "= Planned surplus" is MK-CF-M-002, one figure on both.
  const monthIn = useThisMonthInputs();
  const planMonth = useMemo(() => theMonth(monthIn).planned, [monthIn]);
  const planRows = monthShown(planMonth.lines, !!planMonth.refusal);
  const budgetSet = planMonth.planSet;
  const planIncome = planRows.inflow;                                                       // the take-home, after tax and the 401(k)s
  const planExpenses = budgetSet ? (planRows.byKind.spend ?? 0) : 0;                       // the Expenses row, as printed
  const planDebt = planRows.byKind.debt ?? 0;                                               // the debt rows, as printed
  const planLeftOver = budgetSet && !planMonth.refusal ? planRows.surplus : NaN;            // no budget, no planned surplus
  // ONE HELPER FOR THE BUCKETS AND THE ROWS UNDER THEM (2026-10-25, Cash flow drawing match CF-21; tenet 2): the rows came from
  // useCategorySpend, which read "2026-08-01" as Jul 31 in a US time zone and counted debt payments, while each bucket's total
  // came from here — Fixed read $22 over rows of $400 + $22, Flexible $1,678 over rows making $1,256. Now both are this one
  // reading of the month's expenses (budgetVsActual, MK-CF-F-014), with the budget counted as This month counts it.
  const counted = useMemo(() => theBudgetCounted({ profile: op, accounts: assetAccounts ?? [], debts: liabilities ?? [] }), [op, assetAccounts, liabilities]);
  // what was logged under a budget line that stood down for a debt is that debt's payment, not an expense against the plan (2026-10-25, FIX-MONTH)
  const countedExpenses = expensesAsCounted(expenses, counted.profile);
  const bva = budgetVsActual(countedExpenses, counted.profile, new Date());
  const spentTotal = Math.round(bva.spent_total);
  const spentPct = planExpenses > 0 ? Math.min(1, spentTotal / planExpenses) : 0;
  const spentOver = spentTotal > planExpenses && planExpenses > 0;
  // the share at full precision, written to two decimals once (Q49; 2026-10-27, CF2-11): 1,100 ÷ 7,200 reads 15.28%, it read 15%
  const budgetShareOfIncome = planIncome > 0 ? planExpenses / planIncome : 0;

  // per-category $ limit = the SHARED canonical conversion (build-34 #3): same helper spendBuckets uses,
  // so each line item reconciles with its bucket header (% against take-home after tax + 401(k), not net-of-tax).

  // editable budget categories = canonical BUDGET_CATEGORIES + user custom (each carries a bucket)
  const limitCats: { id: string; label: string; bucket: 'fixed' | 'nonmonthly' | 'flexible'; icon: string }[] = [
    ...BUDGET_CATEGORIES.map((c) => ({ id: c.id, label: c.label, bucket: c.bucket, icon: c.icon })),
    ...((customCategories ?? []) as any[]).map((c) => ({ id: c.label, label: c.label, bucket: categoryBucketFor(c.label, customCategories ?? []) as any, icon: c.icon })),
  ];

  // THE BUCKETS AND THEIR ROWS, FOR THIS MONTH, FROM ONE FUNCTION (budgetEditorBuckets, 2026-10-25, CF-21): each bucket's plan is this
  // month's, so they add up to "− Expenses (plan)"; the rows are the month's expenses read once, so they add up to their bucket
  const spendCats: any[] = Array.isArray(op?.spendCats) ? op.spendCats : [];
  const BUCKET_LABEL: Record<string, string> = { fixed: 'Fixed', nonmonthly: 'Non-monthly', flexible: 'Flexible' };
  const editorBuckets = budgetEditorBuckets(countedExpenses, counted.profile, new Date());

  function openLimitsModal() {
    const vals: Record<string, string> = {};
    const units: Record<string, 'dollar' | 'pct'> = {};
    limitCats.forEach(({ label }) => {
      const existing = spendCats.find((c) => c.label === label);
      if (existing && num(existing.amount) > 0) {
        // show the RAW value in its own unit (so a % category stays a %, not its $-conversion)
        vals[label] = String(existing.amount);
        units[label] = existing.unit === 'pct' ? 'pct' : 'dollar';
      } else {
        vals[label] = '';
        units[label] = 'dollar';
      }
    });
    setDraftLimits(vals);
    setDraftUnits(units);
    setLimitsVisible(true);
  }

  function saveLimits() {
    // preserve spendCats that aren't user-editable here; rebuild the editable ones from the draft
    const editable = new Set(limitCats.map((c) => c.label));
    const next = spendCats.filter((c) => !editable.has(c.label));
    limitCats.forEach((c) => {
      const amt = num(draftLimits[c.label]);
      if (amt > 0) {
        const unit = draftUnits[c.label] ?? 'dollar';   // honor the $/% the user picked
        const prev = spendCats.find((x) => x.label === c.label);
        next.push({ id: prev?.id ?? c.id, label: c.label, bucket: c.bucket, amount: amt, unit });
      }
    });
    setOnboardingProfile({ ...(op ?? {}), spendCats: next });
    setLimitsVisible(false);
  }

  // ── Debts: payoff plan (avalanche/snowball) + log-payment (ledger, per DR-14) ──
  const rawDebts: any[] = liabilities ?? [];
  const activeDebts = rawDebts.filter((d) => (d.remaining_balance || 0) > 0);
  // A PAYMENT NEVER ENTERED IS NOT $0 (2026-10-25, tenet 3, DEC-3523; cash-flow_v01's READ THIS FIRST row of that date): asked of the Net
  // worth door, the one list Net worth names them from. Its row says so, the line under the total names it, and the payoff plan refuses
  // a debt-free date rather than reading the payment as $0 ("never at this rate").
  const nwIn = useNetWorthInputs();
  const payNotEntered = theNetWorth(nwIn).debtPaymentsNotEntered.filter((x) => activeDebts.some((d) => String(d.debt_id) === x.id));
  const payIsNotEntered = (d: any) => payNotEntered.some((x) => x.id === String(d.debt_id));
  // WHAT IS PAID ON ONE DEBT, IN WORDS THAT ARE TRUE (2026-10-25, MK-CF-M-073 tenets 1 and 5): a $300 payment chosen on a $200
  // minimum read "$300/month min" — the person's payment called the minimum. The figure is requiredPayment's (the one function the
  // total "in payments" adds up); the word says whether it is the minimum or the payment they set
  const payWords = (d: any, min: 'min' | 'minimum') => {
    const pays = requiredPayment(d), chosen = Number(d.monthly_payment) || 0, minimum = Number(d.minimum_monthly_payment) || 0;
    if (chosen > minimum) return `${fig('MK-CF-M-073', Math.round(pays))}/month · your payment`;
    if (chosen > 0 && chosen < minimum) return `${fig('MK-CF-M-073', Math.round(pays))}/month ${min} · the payment you set is below it`;
    return `${fig('MK-CF-M-073', Math.round(pays))}/month ${min}`;
  };
  const totalMinMonthly = Math.round(minimumDebtService(activeDebts));   // canonical DTI obligation, single source
  const totalInterestMonthly = Math.round(activeDebts.reduce((t, d) => t + (d.remaining_balance || 0) * (d.interest_rate_apr || 0) / 12, 0));
  const plan = payoffPlan(rawDebts, num(extraPay), payoffMethod);
  // the biggest long-term loan — a mortgage for anyone who has one. Cards are excluded: at 22% the
  // comparison is not a question, and printing one would make it look like one.
  // the plan as committed, so the retirement consequence can be a real run rather than a guess
  const planForDebt = useMemo(() => {
    const st = useStore.getState() as any;
    return willItLastInputs({ op: st.onboardingProfile, accounts: st.assetAccounts,
      assumptions: st.retirementAssumptions, bigCosts: st.bigCosts,
      employmentStatus: st.employmentStatus, transactions: st.transactions ?? [] });   // no economic feed: the plan's own inflation (DEC-0259; 2026-10-31, BRIEF-94)
  }, [rawDebts.length, extraPay]);

  const bigLoan = rawDebts
    .filter((d: any) => d.remaining_balance > 50_000 && d.interest_rate_apr > 0 && d.interest_rate_apr < 0.12)
    .sort((a: any, b: any) => b.remaining_balance - a.remaining_balance)[0] ?? null;
  // PAST THE HORIZON IS SAID IN WORDS, NEVER A DATE (2026-10-26, the lead's ruling on FIX-BILLS' payoff walk; tenet 1): payments that
  // do get ahead, still owing after a thousand years, gave the month the walk stopped as a debt-free date
  const debtFreeLabel = plan.neverPaysOff ? 'never at this rate'
    : plan.pastHorizon ? 'not within 1,000 years'
    : plan.months <= 0 ? 'now'
    : (() => { const dt = new Date(); dt.setMonth(dt.getMonth() + plan.months); return dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); })();
  // NOTHING RANKED ON A RATE NOT ENTERED (2026-10-27, the lead's ruling R6 on CF2-12; tenet 3, DEC-0296): highest rate first puts the
  // debts with a rate first and each debt whose rate is not entered after them; while a rate is not entered no debt is "pay first"
  // under that order and none is "the costliest" — both turn on the rate nobody gave. The Lake house mortgage, rate not entered,
  // read "pay first" above a car loan at 6.90% marked "— the costliest". Smallest balance first ranks on balances, which are entered.
  const rateMissing = activeDebts.some((d) => rateNotEntered(d));
  const orderedDebts = activeDebts.slice().sort((a, b) => payoffMethod === 'avalanche'
    ? ((rateNotEntered(a) ? 1 : 0) - (rateNotEntered(b) ? 1 : 0)) || ((b.interest_rate_apr || 0) - (a.interest_rate_apr || 0))
    : (a.remaining_balance - b.remaining_balance));
  const rankedFirst = activeDebts.length > 1 && !(payoffMethod === 'avalanche' && rateMissing);
  const payoffMonthFor = (id: string) => plan.order.find((o) => o.debt_id === id)?.payoffMonth;

  // the row's own words, as the drawing writes them: "22.90% — the costliest", "6.40% · 3 years left"
  const costliest = activeDebts.length > 1 && !rateMissing
    ? activeDebts.slice().sort((a, b) => (b.interest_rate_apr || 0) - (a.interest_rate_apr || 0))[0]?.debt_id : null;
  const timeLeft = (months: number) => (months >= 12
    ? `${plural(Math.round(months / 12), 'year')} left`
    : `${plural(months, 'month')} left`);
  // PROGRESS, from the door (MK-CF-O-018): the earliest month-end recorded this year against today
  const yearKeys = Object.keys((monthlySnapshots ?? {}) as Record<string, any>).filter((k) => k.startsWith(`${new Date().getFullYear()}-`)).sort();
  const firstSnap = yearKeys.length ? (monthlySnapshots as any)[yearKeys[0]] : null;
  // the plan's own figures and its refusal, from the door (2026-10-25, FIX-MONTH; MK-CF-O-018): what is paid plus the extra, and no date
  // when a payment or a rate was never entered
  const debtsDoor = theDebts({ debts: activeDebts as any, startOfYearDebt: firstSnap?.gross_debt ?? null, accounts: assetAccounts ?? [], extraMonthly: num(extraPay), method: payoffMethod });
  const debtProgress = debtsDoor.progress;
  const load = useMemo(() => debtLoad(op, activeDebts as any), [op, activeDebts]);   // what the debts ask of the income (2026-11-01)
  // which property each mortgage is on — Net worth's one reading, through the Debts tab's door (MK-CF-O-018; DEC-1925, CF-23)
  const mortgageOn = debtsDoor.mortgages ?? { properties: 0, mortgages: 0, byProperty: [], unmatched: [], ok: true, sentence: '' };
  const debtProgressSince = yearKeys.length
    ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][Number(yearKeys[0].slice(5, 7)) - 1] : '';

  // THE PAYMENT AS IT IS, TO THE CENT (2026-10-24, Cash flow journey E2E-74): a $386.42 car payment was offered as "386", and
  // tapping Log recorded $386 — 42¢ less paid, and the balance 42¢ too high. A payment is written to two decimals (Q49).
  function openPay(d: any) { const due = requiredPayment(d); setPayDebt(d); setPayAmt(String(Number.isInteger(due) ? due : due.toFixed(2))); }
  function logPayment() {
    const d = payDebt; const amt = num(payAmt);
    if (!d || amt <= 0) return;
    // the payment names its debt by id, so it is matched to that debt and never to another of the same name (2026-10-25, FIX-MONTH; DEC-1923)
    addExpense({ amount: amt, category: 'Debt payment', store: d.label, date: isoLocalDate(new Date()), notes: '', debtId: String(d.debt_id) });
    updateLiability(d.debt_id, { remaining_balance: Math.max(0, (d.remaining_balance || 0) - amt) });
    setPayDebt(null); setPayAmt('');
  }

  return (
    <View style={styles.root}>
      {!embedded && (
        <SegmentedControl
          options={['Activity', 'Budget', 'Debts']}
          selected={tab === 'Import' ? 'Activity' : tab}
          onSelect={(v) => setTab(v as Tab)}
        />
      )}

      {/* ── Activity tab — the ledger: browse, search, add/edit, delete-with-undo ─── */}
      {tab === 'Activity' && (
        <>
          <View style={styles.monthBar}>
            {moProp == null && (<>
            <TouchableOpacity onPress={() => setMonthOffset((m) => m - 1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Text style={styles.monthArrow}>‹</Text></TouchableOpacity>
            <Text style={styles.monthLabel}>{selMonthLabel}</Text>
            <TouchableOpacity disabled={isCurrentMonth} onPress={() => setMonthOffset((m) => Math.min(0, m + 1))} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Text style={[styles.monthArrow, isCurrentMonth && { opacity: 0.25 }]}>›</Text></TouchableOpacity>
            </>)}
            <View style={{ flex: 1 }} />
            {(recurringIncomes.length + recurringExpenses.length) > 0 && <TouchableOpacity hitSlop={Tap.slop} onPress={() => setRecurringMgr(true)}><Text style={styles.sectionLink}>↻ Recurring</Text></TouchableOpacity>}
            <TouchableOpacity hitSlop={Tap.slop} onPress={() => setTab('Import')}><Text style={styles.sectionLink}>⤓ Import</Text></TouchableOpacity>
          </View>

          <View style={styles.strip}>
            <View style={styles.stripItem}>
              <Text style={styles.stripLabel}>Income (take-home)</Text>
              <Text style={[styles.stripValue, { color: Colors.primary }]}>{fig('MK-CF-M-051', Math.round(monthIncomeSel))}</Text>
            </View>
            <View style={styles.stripDivider} />
            <View style={styles.stripItem}>
              <Text style={styles.stripLabel}>{monthDebtSel > 0 ? 'Actual expenses + debt' : 'Actual expenses'}</Text>
              <Text style={[styles.stripValue, { color: Colors.red }]}>{fig('MK-CF-M-013', Math.round(monthSpendSel))}</Text>
            </View>
            <View style={styles.stripDivider} />
            <View style={styles.stripItem}>
              <Text style={styles.stripLabel}>Surplus</Text>
              <Text style={[styles.stripValue, { color: monthIncomeSel - monthSpendSel >= 0 ? Colors.primary : Colors.red }]}>
                {fig('MK-CF-M-003', Math.round(monthIncomeSel - monthSpendSel))}
              </Text>
            </View>
          </View>

          <View style={styles.searchWrap}>
            <Text style={{ fontSize: 15 }}>🔍</Text>
            <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Search payee, category, note" placeholderTextColor={Colors.textTertiary} returnKeyType="search" />
            {search.length > 0 && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={Tap.slop} onPress={() => setSearch('')}><Text style={{ color: Colors.textSecondary, fontSize: 17, paddingHorizontal: 6 }}>✕</Text></TouchableOpacity>}
          </View>

          <View style={styles.filterRow}>
            {(['All', 'Income', 'Expenses'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterBtn, filter === f && styles.filterBtnOn]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterText, filter === f && styles.filterTextOn]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <FlatList
            data={listData}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={{ padding: Spacing.base, gap: Spacing.xs, paddingBottom: 96 }}
            ListHeaderComponent={filtered.length > 0 ? (
              <Text style={{ fontSize: 11, color: Colors.textTertiary, textAlign: 'center', paddingBottom: 8 }}>
                Tap to edit or delete • or swipe left
              </Text>
            ) : null}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={{ fontSize: 38, marginBottom: Spacing.sm }}>📭</Text>
                <Text style={styles.emptyTitle}>{search ? 'No matches' : 'Nothing this month'}</Text>
                <Text style={styles.emptySub}>{search ? 'Try a different search.' : 'Tap ＋ Add to log income or an expense.'}</Text>
              </View>
            }
            renderItem={({ item }) => {
              const isIncome = item.kind === 'income';
              if ((item as any).recurring) {
                return (
                  <TouchableOpacity onPress={() => router.push('/income-manager')} style={styles.txRow} activeOpacity={0.85}>
                    <View style={[styles.txIcon, { backgroundColor: Colors.primaryLight }]}><Text style={{ fontSize: 17 }}>💵</Text></View>
                    <View style={styles.txMid}>
                      <Text style={styles.txLabel} numberOfLines={1}>{(item as any).source}</Text>
                      <Text style={styles.txSub}>Recurring · {selMonthLabel} · tap to manage</Text>
                    </View>
                    <Text style={[styles.txAmt, { color: Colors.primary }]}>+{fig('MK-CF-M-012', (item as any).amount)}</Text>
                  </TouchableOpacity>
                );
              }
              const label = isIncome ? (item as any).source : (item as any).store || (item as any).category;
              const isRecurringGen = (item as any).type === 'recurring' || String((item as any).notes || '').startsWith('Auto:');
              const sub = `${isIncome ? 'Income' : (item as any).category}${isRecurringGen ? ' · ↻ monthly' : ''}`;
              return (
                <Swipeable
                  overshootRight={false}
                  renderRightActions={() => (
                    <TouchableOpacity hitSlop={Tap.slop} style={styles.swipeDel} onPress={() => deleteEntry(item.kind, item)}>
                      <Text style={styles.swipeDelTxt}>Delete</Text>
                    </TouchableOpacity>
                  )}
                >
                  <TouchableOpacity
                    onPress={() => setTxnSheet({ open: true, editing: item })}
                    style={styles.txRow}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.txIcon, { backgroundColor: isIncome ? Colors.primaryLight : Colors.bgTertiary }]}>
                      <Text style={{ fontSize: 17 }}>{isIncome ? '💵' : getCategoryIcon((item as any).category)}</Text>
                    </View>
                    <View style={styles.txMid}>
                      <Text style={styles.txLabel} numberOfLines={1}>{label}</Text>
                      <Text style={styles.txSub}>{(() => { const at = localMoment(item.date); return at ? format(at, String(item.date).length > 10 ? 'MMM d, h:mm a' : 'MMM d') : ''; })()} · {sub}</Text>
                      {(item as any).notes ? <Text style={styles.txNote} numberOfLines={1}>{(item as any).notes}</Text> : null}
                    </View>
                    <Text style={[styles.txAmt, { color: isIncome ? Colors.primary : Colors.red }]}>
                      {isIncome ? '+' : '-'}{fig('MK-CF-M-014', (item as any).amount)}
                    </Text>
                  </TouchableOpacity>
                </Swipeable>
              );
            }}
          />
          {/* delete-with-undo banner (§2.5) */}
          {deleted && (
            <View style={styles.undoBar}>
              <Text style={styles.undoTxt} numberOfLines={1}>Deleted {deleted.kind === 'income' ? (deleted.entry.source || 'income') : (deleted.entry.store || deleted.entry.category || 'expense')}</Text>
              <TouchableOpacity hitSlop={Tap.slop} onPress={undoDelete}><Text style={styles.undoAction}>Undo</Text></TouchableOpacity>
            </View>
          )}
          {/* FAB */}
          <TouchableOpacity style={styles.fab} activeOpacity={0.9} onPress={() => setTxnSheet({ open: true })}>
            <Text style={styles.fabTxt}>＋ Add</Text>
          </TouchableOpacity>
        </>
      )}

      {/* ── Budget tab ───────────────────────────────────────────── */}
      {tab === 'Budget' && (
        <ScrollView automaticallyAdjustKeyboardInsets style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.base, gap: Spacing.sm, paddingBottom: 48 }}>

          {/* YOUR MONTHLY PLAN — Income − Expenses − Debt = Surplus. A square box whose title is a dark-green bar (his words, DEC-8839; the lead's R1, 2026-10-27; cash-flow_v01's row of that date) */}
          <Card style={styles.debtCard}>
            {/* THE BAR THIS MONTH'S PLANNED CARD CARRIES (2026-10-31, CF3-01; DEC-8839): the sheet's own title already reads "Your budget",
                which the card does not say again (CF-22), so its box title is This month's — "PLANNED · AUGUST +$350" */}
            <SectionBand inCard onRowEdges inset={16} title={`PLANNED · ${new Date().toLocaleDateString('en-US', { month: 'long' }).toUpperCase()}`}
              value={Number.isFinite(planLeftOver) ? `${planLeftOver < 0 ? '−' : '+'}${fig('MK-CF-M-002', Math.abs(planLeftOver))}` : '—'} />
            <View style={styles.planRow}><Text style={styles.planLabel}>Income (take-home)</Text><Text style={styles.planVal}>{fig('MK-CF-M-031', planIncome)}</Text></View>
            {/* nothing set reads as This month reads it: "— not set", and no planned surplus (tenet 3) */}
            <View style={styles.planRow}><Text style={styles.planLabel}>− Expenses (plan)</Text><Text style={styles.planVal}>{budgetSet ? fig('MK-CF-M-001', planExpenses) : '— not set'}</Text></View>
            {/* a budget line that stood down for a debt says so here too, in This month's words (2026-10-31, CF3-03; the 2026-10-25 line on a
                debt counted once names this editor): the register household's $2,300 Rent / Mortgage line left the plan with nothing said */}
            {!!counted.sentence && <Text style={styles.countedNote}>{counted.sentence}</Text>}
            {planDebt > 0 && <View style={styles.planRow}><Text style={styles.planLabel}>− Debt payments</Text><Text style={styles.planVal}>{fig('MK-NW-M-012', planDebt)}</Text></View>}
            <View style={[styles.planRow, styles.planTotalRow]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.planTotalLabel}>= Planned surplus</Text>
                <InfoDot term="surplus" line={styles.planTotalLabel} />
              </View>
              {/* one figure, one form: This month prints the planned surplus with its sign, "+$350", so the editor does (CF-22) */}
              {/* printed as This month prints it: 15/800 in the gain green, red when short (2026-10-31, CF3-02) — it was 20/700 brand green */}
              <Text style={[styles.planTotalVal, { color: !(planLeftOver < 0) ? Colors.gainText : Colors.red }]}>{Number.isFinite(planLeftOver) ? `${planLeftOver < 0 ? '−' : '+'}${fig('MK-CF-M-002', Math.abs(planLeftOver))}` : '—'}</Text>
            </View>
            {budgetSet && planIncome > 0 && <Text style={styles.planNote}>Your expense budget is {percentDigits(budgetShareOfIncome)}% of take-home pay.</Text>}
            {/* NO PLAN, NO "OF $0 PLAN" (2026-10-25, CF-20; the drawing's rule 6, "never $0 dressed as an answer"): what is spent
                is measured against a budget, so with none set the bar and its two lines are not drawn */}
            {budgetSet && <View style={{ marginTop: Spacing.md }}>
              <ProgressBar pct={Math.round(spentPct * 100)} color={spentOver ? Colors.red : Colors.primary} height={8} />
              <View style={styles.budgetFooterRow}>
                <Text style={styles.budgetFooterText}>{fig('MK-CF-M-013', spentTotal)} spent so far</Text>
                <Text style={[styles.budgetFooterText, { color: spentOver ? Colors.red : Colors.gainText }]}>
                  {spentOver ? `${fig('MK-CF-M-056', spentTotal - planExpenses)} over` : `${fig('MK-CF-M-056', planExpenses - spentTotal)} left`} · of {fig('MK-CF-M-001', planExpenses)} plan
                </Text>
              </View>
            </View>}
          </Card>

          {/* EXPENSES BY BUCKET — bucketed spendCats (the single budget source) */}
          {/* one box: its title on a dark-green bar, its door on the line under it, each bucket on a light-green bar carrying its spend
              and plan (his words, DEC-8839; the lead's R1, 2026-10-27; cash-flow_v01's row of that date) */}
          <View style={styles.debtCard}>
          <SectionBand inCard onRowEdges inset={16} title="EXPENSES BY BUCKET" />
          <TouchableOpacity onPress={openLimitsModal} style={styles.underBarDoor} accessibilityRole="button" accessibilityLabel="Set your budget"><Text style={styles.sectionLink}>Set your budget ›</Text></TouchableOpacity>
          {!budgetSet && spentTotal === 0 ? (
              <View style={styles.empty}>
                <Text style={{ fontSize: 38, marginBottom: Spacing.sm }}>📊</Text>
                <Text style={styles.emptyTitle}>No budget yet</Text>
                <Text style={styles.emptySub}>Tap “Set your budget” to plan what you’ll spend, by category.</Text>
              </View>
          ) : (
            editorBuckets.map((ba) => {
              const bk = ba.key;
              const rows = ba.rows;
              if (rows.length === 0 && ba.planned === 0 && ba.spent === 0) return null;
              const bpct = ba.planned > 0 ? Math.min(1, ba.spent / ba.planned) : 0;
              const bover = ba.spent > ba.planned && ba.planned > 0;
              return (
                <View key={bk}>
                  {/* the bucket on a light-green bar, its spend and plan riding it (R1); a bucket with no plan reads "· no limit", as its
                      categories do — never "/ $0", a limit nobody set (2026-10-25, F5) */}
                  <View style={styles.subBarGap}>
                    <SectionBand inCard light onRowEdges inset={16} title={BUCKET_LABEL[bk]}
                      value={`${fig('MK-CF-M-015', Math.round(ba.spent))}${ba.planned > 0 ? ` / ${fig('MK-CF-M-015', Math.round(ba.planned))}` : ' · no limit'}`} />
                  </View>
                  <ProgressBar pct={Math.round(bpct * 100)} color={bover ? Colors.red : Colors.primary} height={6} />
                  {/* the rows as printed add up to the bucket's printed spend (spentShown — the 2026-10-24 row, tenet 2) */}
                  {rows.map((r) => {
                    const rover = r.planned > 0 && r.spent > r.planned;
                    return (
                      <View key={r.label} style={styles.bcatRow}>
                        <Text style={styles.bcatIcon}>{budgetCategoryIcon(r.label, customCategories ?? [])}</Text>
                        <Text style={styles.bcatLabel} numberOfLines={1}>{r.label}</Text>
                        <Text style={[styles.bcatAmt, rover && { color: Colors.red }]}>
                          {fig('MK-CF-M-015', r.spentShown)}{r.planned > 0 ? <Text style={styles.bcatLimit}> / {fig('MK-CF-M-015', Math.round(r.planned))}</Text> : <Text style={styles.bcatLimit}> · no limit</Text>}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              );
            })
          )}
          </View>
          {/* (removed the duplicate bottom "Set monthly limits" button — the "Set your budget ›" header link
              above is the single entry point, consistent with the other section headers.) */}

          {/* DEBT THIS MONTH — managed in the Debts tab */}
          {(liabilities ?? []).length > 0 && (
            <>
              <View style={styles.debtCard}>
                <SectionBand inCard onRowEdges inset={16} title="DEBT THIS MONTH" />
                <TouchableOpacity onPress={() => setTab('Debts')} style={styles.underBarDoor} accessibilityRole="button" accessibilityLabel="Manage your debts"><Text style={styles.sectionLink}>Manage ›</Text></TouchableOpacity>
                {debtsView.map((d, i) => (
                  <View key={d.id} style={[styles.bcatRow, i > 0 && { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8, marginTop: 2 }]}>
                    <Text style={styles.bcatIcon}>{DEBT_TYPES.find((t) => t.value === d.type)?.icon || '📄'}</Text>
                    <Text style={styles.bcatLabel} numberOfLines={1}>{d.name}</Text>
                    <Text style={styles.bcatAmt}>{fig('MK-NW-M-011', Math.round(d.minimumPayment))}<Text style={styles.bcatLimit}>/month min</Text></Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Custom categories */}
          <View style={styles.debtCard}>
          <SectionBand inCard onRowEdges inset={16} title="CUSTOM CATEGORIES" />
          <TouchableOpacity onPress={() => setCatFormVisible(true)} style={styles.underBarDoor} accessibilityRole="button" accessibilityLabel="Add a custom category">
            <Text style={styles.sectionLink}>+ Add ›</Text>
          </TouchableOpacity>
          {(customCategories || []).length === 0 ? (
              <Text style={{ fontSize: Typography.sizes.sm, color: Colors.textSecondary, textAlign: 'center', paddingVertical: Spacing.md }}>
                No custom categories yet — tap “+ Add” to create one
              </Text>
          ) : (
            (customCategories as { label: string; icon: string; bg: string }[]).map(c => (
              <View key={c.label} style={styles.catCard}>
                <View style={styles.catRow}>
                  <View style={[styles.catIcon, { backgroundColor: c.bg }]}>
                    <Text style={{ fontSize: 17 }}>{c.icon}</Text>
                  </View>
                  <Text style={[styles.catLabel, { flex: 1, marginLeft: Spacing.sm }]}>{c.label}</Text>
                  <TouchableOpacity hitSlop={Tap.slop} onPress={() => Alert.alert('Delete category', `Remove “${c.label}”?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteCustomCategory(c.label) },
                  ])}>
                    <Text style={{ color: Colors.red, fontSize: 17, padding: 8 }}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
          </View>
        </ScrollView>
      )}

      {/* Custom category modal */}
      <Modal visible={catFormVisible} animationType={modalAnimation()} presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity hitSlop={Tap.slop} onPress={() => setCatFormVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New category</Text>
            <TouchableOpacity hitSlop={Tap.slop} onPress={saveCustomCategory}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>
          <ScrollView automaticallyAdjustKeyboardInsets contentContainerStyle={{ padding: Spacing.base, gap: Spacing.sm, paddingBottom: 48 }}>
            <Text style={styles.limitLabel}>Name</Text>
            <TextInput
              style={[styles.limitInput, { backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, borderWidth: 0.5, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 13, fontSize: Typography.sizes.md, color: Colors.textPrimary }]}
              value={newCatLabel} onChangeText={setNewCatLabel}
              placeholder="e.g. Pet care, Kids, Gym"
              placeholderTextColor={Colors.textTertiary}
              autoFocus
            />
            <Text style={styles.limitLabel}>Icon</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORY_EMOJI_OPTIONS.map(e => (
                <TouchableOpacity key={e}
                  style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: newCatIcon === e ? Colors.primaryLight : Colors.bgSecondary, borderWidth: 0.5, borderColor: newCatIcon === e ? Colors.primaryMid : Colors.border }}
                  onPress={() => setNewCatIcon(e)}>
                  <Text style={{ fontSize: 24 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.limitLabel}>Background colour</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORY_BG_OPTIONS.map(bg => (
                <TouchableOpacity key={bg}
                  style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: bg, borderWidth: newCatBg === bg ? 2 : 0.5, borderColor: newCatBg === bg ? Colors.primary : Colors.border }}
                  onPress={() => setNewCatBg(bg)} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, backgroundColor: Colors.bgSecondary, borderRadius: Radii.lg }}>
              <View style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: newCatBg }}>
                <Text style={{ fontSize: 24 }}>{newCatIcon}</Text>
              </View>
              <Text style={{ fontSize: Typography.sizes.md, fontWeight: '600', color: Colors.textPrimary }}>{newCatLabel || 'Preview'}</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Debts tab ────────────────────────────────────────────── */}
      {tab === 'Debts' && (
        <ScrollView automaticallyAdjustKeyboardInsets style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.base, gap: Spacing.sm, paddingBottom: 48 }}>

          {/* YOUR DEBT — the total first, then what it asks of the month (cash-flow_v01, frame 6). The drawing's cards run edge to
              edge with square corners and name their sections with a quiet grey label — none of the three carries a total
              (2026-10-25, CF-02 and CF-15) */}
          <View style={styles.debtCard}>
            {/* every box title on a dark-green bar, edge to edge (his words, DEC-8839; the lead's R1, 2026-10-27; cash-flow_v01's row of that date) — the four were quiet grey labels and a plain title */}
            <SectionBand inCard onRowEdges inset={16} title="YOUR DEBT" />
            {/* a $0 in the drawing's grey for a $0 with nothing behind it, never the brand green (2026-11-01, CF4-04) */}
            <Text style={[styles.debtHero, { color: totalDebt > 0 ? Colors.red : Colors.textSecondary }]} accessible
              accessibilityLabel={`You owe ${figSaid('MK-NW-M-009', Math.round(totalDebt))}`}>{fig('MK-NW-M-009', Math.round(totalDebt))}</Text>
            {/* NOTHING ENTERED IS SAID, WITH ONE DOOR (Q48 — DEC-0260, DEC-0431; 2026-10-25, CF-18): a brand-new person read "across 0
                debts · $0/month in payments · ~$0/month interest", a 🎉, an edit hint with nothing to tap and a second door */}
            {activeDebts.length > 0
              ? <SaidText style={styles.debtSub}>
                  {/* as drawn (frame 6, row 33): the payments only — each debt's interest is on its own line (row 6, DEC-1560); the total
                      also printed "· ~$113/month interest", a figure no row keeps (2026-10-27, CF2-03) */}
                  across {plural(activeDebts.length, 'debt')} · {fig('MK-NW-M-012', Math.round(debtsDoor.paymentsMonthly))}/month in payments
                </SaidText>
              : setupLoans.owed > 0 ? null : <EmptyNote door="debts" onPress={() => setDebtSheet({ open: true })} />}
            {/* the student loans entered in setup are in the total, and said (R22, CF4-03) */}
            {setupLoans.owed > 0 && (
              <SaidText style={styles.debtSub}>Includes {fig('MK-CF-M-105', setupLoans.owed)} of student loans entered in setup — repayment starts after you graduate.</SaidText>
            )}
            {/* a setup loan not owed yet, or with no start month, said in words — the one rule, the same sentences as Net worth (R22a, 2026-11-01) */}
            {setupLoanSentences(op, (liabilities ?? []) as Debt[], (n) => fig('MK-NW-M-010', Math.round(n))).map((t) => (
              <SaidText key={t} style={styles.debtSub}>{t}</SaidText>
            ))}
            {/* the payments above leave out one never entered, and say so in Net worth's words (2026-10-25) */}
            {payNotEntered.length > 0 && (
              <Text style={styles.debtSub}>{payNotEntered.map((x) => x.label).join(', ')} {plural(payNotEntered.length, 'payment', '·')} not entered, so {payNotEntered.length === 1 ? 'it is' : 'they are'} not included. Enter {payNotEntered.length === 1 ? 'it' : 'them'} to include.</Text>
            )}
            {/* a rate never entered: no interest figure, and the debt named (2026-10-25, FIX-MONTH; tenet 3) */}
            {!!debtsDoor.interestRefusal && <Text style={styles.debtSub}>{debtsDoor.interestRefusal}</Text>}
          </View>

          {/* PAYOFF PLAN */}
          {activeDebts.length > 0 && (
            <Card style={styles.debtCard}>
              <SectionBand inCard onRowEdges inset={16} title="PAYOFF PLAN" />
              <View style={{ marginTop: 6 }}>
                <SegmentedControl
                  options={['Avalanche', 'Snowball']}
                  selected={payoffMethod === 'avalanche' ? 'Avalanche' : 'Snowball'}
                  onSelect={(v) => setPayoffMethod(v === 'Avalanche' ? 'avalanche' : 'snowball')}
                />
              </View>
              <Text style={styles.planNote}>{payoffMethod === 'avalanche' ? 'Highest interest rate first — saves the most interest.' : 'Smallest balance first — quick wins for momentum.'}</Text>
              <View style={[styles.limitRow, { marginTop: Spacing.sm }]}>
                <Text style={styles.limitLabel} accessibilityLabel="Extra a month">Extra / month</Text>
                <View style={styles.limitInputWrap}>
                  <Text style={styles.limitDollar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">$</Text>
                  <MoneyBox bare dollarBeside style={styles.limitInput} value={extraPay} onChangeText={setExtraPay} returnKeyType="done"
                    a11y="Extra payment a month, in dollars" />
                </View>
              </View>
              {/* A PAYMENT NEVER ENTERED GIVES NO DEBT-FREE DATE (2026-10-25, tenet 3): it read "never at this rate" and the balance-grows
                  warning, as if the payment were $0 — This month's refusal, in its words */}
              {/* a payment or a rate never entered: the plan's own refusal, naming each (2026-10-25, FIX-MONTH; MK-CF-O-018) */}
              {debtsDoor.refusal ? (
                <Text style={[styles.planNote, { marginTop: Spacing.sm }]}>{debtsDoor.refusal}</Text>
              ) : (<>
              <View style={styles.payoffSummary}>
                {/* each figure and its words are one element, said through the one spoken writer (E2E-78): "hidden", "a month" */}
                <View style={styles.payoffStat} accessible accessibilityLabel={`Debt-free ${debtFreeLabel}`}><Text style={[styles.payoffStatV, (plan.neverPaysOff || plan.pastHorizon) && { color: Colors.red }]}>{figWords('MK-CF-M-058', debtFreeLabel)}</Text><Text style={styles.payoffStatL}>debt-free</Text></View>
                <View style={styles.payoffStat} accessible accessibilityLabel={saidSentence(`${fig('MK-CF-M-072', Math.round(debtsDoor.planMonthly))}/month total`)}><Text style={styles.payoffStatV}>{fig('MK-CF-M-072', Math.round(debtsDoor.planMonthly))}</Text><Text style={styles.payoffStatL}>/month total</Text></View>
                <View style={styles.payoffStat} accessible accessibilityLabel={saidSentence(`${plan.neverPaysOff || plan.pastHorizon ? 'no figure' : fig('MK-CF-M-059', Math.round(plan.totalInterest))} total interest`)}><Text style={[styles.payoffStatV, { color: Colors.red }]}>{plan.neverPaysOff || plan.pastHorizon ? '—' : fig('MK-CF-M-059', Math.round(plan.totalInterest))}</Text><Text style={styles.payoffStatL}>total interest</Text></View>
              </View>
              {plan.neverPaysOff && (
                <Text style={[styles.planNote, { color: Colors.red, marginTop: 8 }]}>⚠️ At this payment your balance grows faster than you pay it down. Add an extra payment to start getting ahead.</Text>
              )}
              {/* the Goals tab's own sentence for the same case, with what is still owed then (it is part of the debt-free answer) */}
              {!plan.neverPaysOff && plan.pastHorizon && (
                <Text style={[styles.planNote, { color: Colors.red, marginTop: 8 }]}>{figWords('MK-CF-M-058', `⚠ Not paid off within 1,000 years at this rate — ${fig('MK-CF-M-096', Math.round(plan.stillOwed))} still owed then. Add extra to make progress.`)}</Text>
              )}
              </>)}
              {/* THE QUESTION THE DECISION ACTUALLY TURNS ON (founder, 2026-08-14), and the screen
                  never asked it: is this loan cheaper or dearer than a risk-free alternative?
                  Shown against the LARGEST long-term debt, which is the mortgage for anyone who has
                  one — a credit card at 22% needs no comparison to know the answer. */}
              {bigLoan && (
                <MortgageRateCompare
                  balance={bigLoan.remaining_balance}
                  annualRate={bigLoan.interest_rate_apr}
                  monthlyPayment={bigLoan.minimum_monthly_payment}
                  extraMonthly={num(extraPay)}
                  treasuryYield={(treasuryYield ?? FALLBACK_TREASURY) / 100}
                  isFallback={treasuryIsFallback}
                  planInputs={planForDebt}
                />
              )}
            </Card>
          )}

          {/* YOUR DEBTS — one card, as drawn: each debt a row in the order to pay it (the first is the one to pay first), then the one
              "Log a payment ›". No icons; "· " with its space; a time left only for a loan paid in fixed payments — a card's minimum
              floats with its balance, so the drawn Visa reads "22.90% — the costliest" (2026-10-25, CF-05, CF-06, CF-07); a mortgage
              names its property (DEC-1925, CF-23) */}
          {activeDebts.length > 0 && (
            <View style={styles.debtCard}>
              <SectionBand inCard onRowEdges inset={16} title="YOUR DEBTS" />
              {orderedDebts.map((d, idx) => {
                const monthlyInterest = debtsDoor.interestByDebt[String(d.debt_id)] ?? 0;   // the door's figure, MK-CF-M-089 (2026-10-26) — it was calculated here
                const pm = paymentShape(d) === 'installment' ? payoffMonthFor(d.debt_id) : undefined;
                // a rate never entered says so, never "0.00%"; a typed 0 is 0.00% (2026-10-25, FIX-MONTH; tenet 3)
                const noRate = rateNotEntered(d);
                const rate = noRate ? 'rate not entered' : `${((d.interest_rate_apr || 0) * 100).toFixed(2)}%`;   // printed on the row and said in its label — written once
                const interestWords = noRate ? '' : `~${fig('MK-CF-M-089', Math.round(monthlyInterest))}/month interest`;   // one debt's interest: its own number, MK-CF-M-089 (2026-10-26)
                const isMortgage = String(d.debt_type ?? '').toUpperCase() === 'MORTGAGE';
                const home = isMortgage ? mortgageOn.byProperty.find((b) => b.mortgageId === String(d.debt_id))?.property : undefined;
                const homeless = isMortgage && mortgageOn.unmatched.some((u) => u.id === String(d.debt_id));
                const head = `${rate}${costliest === d.debt_id ? ' — the costliest' : ''}${home ? ` · on ${home}` : ''}${pm ? ` · ${timeLeft(pm)}` : ''}`;
                return (
                  <TouchableOpacity key={d.debt_id} style={[styles.debtRow, idx > 0 && styles.debtRowRule]} onPress={() => setDebtSheet({ open: true, edit: d })} onLongPress={() => handleDeleteDebt(d.debt_id)} activeOpacity={0.8}
                    // ONE ELEMENT THAT SAYS ITS ROW IN WORDS (2026-10-24, Cash flow journey E2E-78): it was heard as its printed run —
                    // the icon, "/month", "~", "›" and, under hide-balances, the dots
                    accessibilityRole="button"
                    accessibilityLabel={saidSentence(`${d.label}${idx === 0 && rankedFirst ? ', pay first' : ''}, ${head.replace(/ · /g, ', ')}, ${payIsNotEntered(d) ? 'payment not entered' : payWords(d, 'minimum')}${interestWords ? `, ${interestWords}` : ''}${dueWords(d) ? `, ${dueWords(d)}` : ''}, ${fig('MK-NW-M-010', Math.round(d.remaining_balance || 0))} owed.${homeless ? ` ${mortgageOn.sentence}` : ''} Opens it to edit; hold to delete.`)}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.catTitleRow}>
                        <Text style={styles.debtName} numberOfLines={1}>{d.label}</Text>
                        {idx === 0 && rankedFirst && <Text style={styles.payFirstTag}>pay first</Text>}
                      </View>
                      <Text style={styles.catLimit}>
                        {head} · {payIsNotEntered(d) ? 'payment not entered' : payWords(d, 'min')}{interestWords ? ` · ${interestWords}` : ''}
                      </Text>
                      {homeless && <Text style={[styles.catLimit, { color: Colors.amber }]}>{mortgageOn.sentence}</Text>}
                      {(() => {
                        const w = dueWords(d); if (!w) return null;
                        return <Text style={[styles.dueNote, { color: dueInDays(d)! <= 2 ? Colors.red : Colors.amber }]}>🔔 {w}</Text>;
                      })()}
                    </View>
                    <Text style={[styles.catAmt, { color: Colors.red, marginLeft: 8 }]}>−{fig('MK-NW-M-010', Math.round(d.remaining_balance || 0))} ›</Text>
                  </TouchableOpacity>
                );
              })}
              {/* ONE "Log a payment ›" under the list, as drawn — it asks which debt when there are several.
                  Each row carried its own button, so the same words repeated down the screen. */}
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Log a payment" style={{ minHeight: 44, justifyContent: 'center' }}
                onPress={() => (orderedDebts.length === 1 ? openPay(orderedDebts[0])
                  : Alert.alert('Log a payment', 'Which debt did you pay?', [...orderedDebts.map((d) => ({ text: d.label, onPress: () => openPay(d) })), { text: 'Cancel', style: 'cancel' as const }]))}>
                <Text style={styles.debtLink}>Log a payment ›</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* "+ Add debt account" UNDER THE LIST, as row 6 keeps it (DEC-1560; 2026-10-27, CF2-05) — it was printed after PROGRESS. The
              edit hint "Tap a debt to edit • Hold to delete" is on no drawing and no row (CF2-04): each row says it in words to a screen reader */}
          {activeDebts.length > 0 && (
            <TouchableOpacity hitSlop={Tap.slop} style={styles.setLimitsBtn} onPress={() => setDebtSheet({ open: true })} activeOpacity={0.8}
              accessibilityRole="button" accessibilityLabel="Add debt account">
              <Text style={styles.setLimitsBtnText}>+ Add debt account</Text>
            </TouchableOpacity>
          )}

          {/* PROGRESS — only where there is an earlier recorded total to measure from; the bar is filled to the share paid down, as
              drawn (2026-10-25, CF-03) */}
          {debtProgress && (
            <View style={styles.debtCard}>
              <SectionBand inCard onRowEdges inset={16} title="PROGRESS" />
              <View style={styles.paceTrack} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <View style={[styles.paceFill, { width: `${Math.max(0, Math.min(100, debtProgress.share * 100))}%` }]} />
              </View>
              <SaidText style={styles.progressLine}>{fig('MK-CF-M-074', Math.round(debtProgress.paidDown))} paid down since {debtProgressSince} — {fig('MK-CF-M-075', debtProgress.share)} of where you started</SaidText>
            </View>
          )}

          {/* DEBT-TO-INCOME and STUDENT LOAN OUTLOOK — moved here from Goals (2026-11-01, the lead's ruling; cash-flow_v01's row of that date:
              Goals v03 sends every Goals door to Plan · Goals, so the old screen that held them opens from nowhere). The figures and words
              are the Goals screen's, from its own functions, unchanged — MK-CF-F-033 debtToIncome over MK-CF-F-025 minimumDebtService, and MK-CF-F-028 loanPayment — each under its number */}
          {activeDebts.length > 0 && (
            <View style={styles.debtCard}>
              <SectionBand inCard onRowEdges inset={16} title="DEBT-TO-INCOME" />
              {load.dti ? (<>
                <View style={styles.dtiHead}>
                  <Text style={[styles.dtiPct, { color: load.dti.status === 'good' ? Colors.gainText : load.dti.status === 'caution' ? Colors.amber : Colors.red }]}>{fig('MK-CF-M-102', load.dti.ratio)}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dtiVerdict}>{load.dti.status === 'good' ? 'Healthy' : load.dti.status === 'caution' ? 'Getting high' : 'High'}</Text>
                    <SaidText style={styles.dtiSub}>{figPer('MK-CF-M-103', load.dti.monthlyDebt)} in minimum debt payments ÷ {figPer('MK-CF-M-104', load.dti.grossMonthly)} income</SaidText>
                  </View>
                </View>
                <Text style={styles.planNote2}>{load.dti.homeowner ? 'Aim for 36% or less (homeowners, incl. mortgage).' : 'Aim for 20% or less (renters; rent isn’t counted).'} {load.dti.status !== 'good' ? 'Paying debt down lowers this.' : 'You’re in good shape.'}</Text>
              </>) : (
                <Text style={styles.planNote2}>Your income is not entered, so there is no debt-to-income figure — we won’t guess one.</Text>
              )}
            </View>
          )}
          {load.loans && (
            <View style={styles.debtCard}>
              <SectionBand inCard onRowEdges inset={16} title="STUDENT LOAN OUTLOOK" />
              <Text style={styles.loanBig}>{fig('MK-CF-M-105', load.loans.borrowed)} <Text style={styles.loanBigSub}>borrowed</Text></Text>
              {load.loans.monthly > 0 ? (<>
                <SaidText style={styles.loanLine}>≈<Text style={{ fontWeight: '800' }}>{figPer('MK-CF-M-106', load.loans.monthly)}</Text> once you’re repaying · {fig('MK-CF-M-107', load.loans.interest)} total interest</SaidText>
                {load.loans.shareOfIncome != null && <Text style={styles.planNote2}>That’s ~{fig('MK-CF-M-108', load.loans.shareOfIncome)} of today’s income — keeping total debt under 20% keeps you comfortable.</Text>}
              </>) : (
                <Text style={styles.planNote2}>Add an interest rate and term to each loan (in setup) to see the monthly repayment.</Text>
              )}
            </View>
          )}

        </ScrollView>
      )}

      <DebtEditorSheet state={debtSheet} onClose={() => setDebtSheet({ open: false })} />

      {/* ── Import tab ───────────────────────────────────────────── */}
      {tab === 'Import' && (
        <ScrollView automaticallyAdjustKeyboardInsets style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.base, gap: Spacing.sm }}>
          <TouchableOpacity hitSlop={Tap.slop} onPress={() => setTab('Activity')} style={{ alignSelf: 'flex-start' }}><Text style={styles.sectionLink}>‹ Back to Activity</Text></TouchableOpacity>
          {/* the box titles on dark-green bars (his words, DEC-8839; the lead's R1, 2026-10-27; cash-flow_v01's row of that date) */}
          <Card style={styles.importBox}>
            <SectionBand inCard onRowEdges inset={16} title="IMPORT FROM EXCEL OR CSV" />
            <Text style={{ fontSize: 38, marginBottom: Spacing.md, marginTop: Spacing.sm }}>📂</Text>
            <Text style={styles.importSub}>
              Upload a spreadsheet of your bank activity and we’ll import it automatically.
            </Text>
            <Button label={importing ? 'Importing...' : 'Choose file'} onPress={handleImport} loading={importing} style={{ marginTop: Spacing.md }} />
          </Card>

          <TipCard color="green">
            <Text style={{ fontSize: Typography.sizes.base, fontWeight: Typography.weights.medium, color: Colors.primaryDeep, marginBottom: 4 }}>
              Required CSV columns:
            </Text>
            <Text style={{ fontSize: Typography.sizes.sm, color: Colors.primaryDeep, lineHeight: 22 }}>
              • <Text style={{ fontWeight: '600' }}>amount</Text> — e.g. 45.99{'\n'}
              • <Text style={{ fontWeight: '600' }}>category</Text> — e.g. Groceries{'\n'}
              • <Text style={{ fontWeight: '600' }}>store</Text> — e.g. Walmart (optional){'\n'}
              • <Text style={{ fontWeight: '600' }}>date</Text> — e.g. 2024-04-01 (optional)
            </Text>
          </TipCard>

          <Card style={styles.debtCard}>
            <SectionBand inCard onRowEdges inset={16} title="EXAMPLE CSV FORMAT" />
            <View style={styles.codeBlock}>
              <Text style={styles.code}>amount,category,store,date</Text>
              <Text style={styles.code}>67.38,Groceries,Whole Foods,2024-04-02</Text>
              <Text style={styles.code}>54.00,Gas,Shell,2024-04-02</Text>
              <Text style={styles.code}>18.99,Subscriptions,Netflix,2024-04-01</Text>
            </View>
          </Card>

          <TipCard color="amber">
            <Text style={{ fontSize: Typography.sizes.sm, color: Colors.amber, lineHeight: 20 }}>
              💡 Export your bank statement as CSV and rename the columns to match. Most banks let you do this from online banking.
            </Text>
          </TipCard>
        </ScrollView>
      )}

      {/* ── Limits modal ─────────────────────────────────────────── */}
      {/* ── Log-payment modal ─────────────────────────────────────── */}
      <Modal visible={!!payDebt} animationType={modalAnimation()} presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity hitSlop={Tap.slop} onPress={() => setPayDebt(null)}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>Log payment</Text>
            <TouchableOpacity hitSlop={Tap.slop} onPress={logPayment}><Text style={styles.modalSave}>Log</Text></TouchableOpacity>
          </View>
          <ScrollView automaticallyAdjustKeyboardInsets contentContainerStyle={{ padding: Spacing.base, gap: Spacing.sm }}>
            <Text style={[styles.budgetCardSub, { marginBottom: 4 }]}>{payDebt?.label} · {fig('MK-NW-M-010', Math.round(payDebt?.remaining_balance || 0))} balance</Text>
            <View style={styles.limitRow}>
              <Text style={styles.limitLabel}>Amount</Text>
              <View style={styles.limitInputWrap}>
                <Text style={styles.limitDollar}>$</Text>
                <MoneyBox bare dollarBeside style={styles.limitInput} value={payAmt} onChangeText={setPayAmt} a11y="Amount" autoFocus />
              </View>
            </View>
            <Text style={{ fontSize: Typography.sizes.xs, color: Colors.textTertiary, lineHeight: 18 }}>
              Adds a “Debt payment” to your activity and lowers this balance.{'\n'}New balance: {fig('MK-NW-M-010', Math.max(0, Math.round((payDebt?.remaining_balance || 0) - num(payAmt))))}.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={limitsVisible} animationType={modalAnimation()} presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity hitSlop={Tap.slop} onPress={() => setLimitsVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Monthly limits</Text>
            <TouchableOpacity hitSlop={Tap.slop} onPress={saveLimits}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>
          <ScrollView automaticallyAdjustKeyboardInsets contentContainerStyle={{ padding: Spacing.base, gap: Spacing.sm, paddingBottom: 48 }}>
            <TipCard color="green">
              <Text style={{ fontSize: Typography.sizes.sm, color: Colors.primaryDeep, lineHeight: 20 }}>
                Set a monthly limit per category — tap the $ to switch it to a % of your take-home pay. Leave blank for no limit. These limits are your expense budget everywhere in the app.
              </Text>
            </TipCard>
            {(['fixed', 'nonmonthly', 'flexible'] as const).map((bk) => (
              <View key={bk}>
                {/* each bucket on a light-green bar, edge to edge of the sheet (his words, DEC-8839; the lead's R1, 2026-10-27; cash-flow_v01's row of that date) */}
                <View style={styles.sheetBarBleed}><SectionBand light title={BUCKET_LABEL[bk]} /></View>
                {limitCats.filter((c) => c.bucket === bk).map(({ label, icon }) => (
                  <View key={label} style={styles.limitRow}>
                    <View style={[styles.catIcon, { backgroundColor: Colors.bgSecondary }]}>
                      <Text style={{ fontSize: 17 }}>{icon}</Text>
                    </View>
                    <Text style={styles.limitLabel}>{label}</Text>
                    <View style={styles.limitInputWrap}>
                      <TouchableOpacity hitSlop={Tap.slop}
                        onPress={() => setDraftUnits((u) => ({ ...u, [label]: (u[label] ?? 'dollar') === 'pct' ? 'dollar' : 'pct' }))} accessibilityRole="button"
                        accessibilityLabel={`${label} unit, currently ${(draftUnits[label] ?? 'dollar') === 'pct' ? 'percent' : 'dollars'}; tap to switch`}>
                        <Text style={[styles.limitDollar, { color: Colors.primary, fontWeight: '800' }]}>
                          {(draftUnits[label] ?? 'dollar') === 'pct' ? '%' : '$'}
                        </Text>
                      </TouchableOpacity>
                      <MoneyBox bare unitBeside
                        style={styles.limitInput}
                        value={draftLimits[label] ?? ''}
                        onChangeText={(v) => setDraftLimits((d) => ({ ...d, [label]: v }))}
                        placeholder={(draftUnits[label] ?? 'dollar') === 'pct' ? '% of take-home' : 'No limit'}
                        returnKeyType="done"
                        // a screen reader names the box by its category (2026-10-24, E2E-73): it read only "No limit", fifteen times
                        a11y={`${label}, monthly limit`}
                      />
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <TxnSheet state={txnSheet} onClose={() => setTxnSheet({ open: false })}
        onDelete={(entry) => { setTxnSheet({ open: false }); deleteEntry(entry.kind, entry); }} />

      {/* ── Recurring manager ─────────────────────────────────────── */}
      <Modal visible={recurringMgr} animationType={modalAnimation()} presentationStyle="pageSheet">
        <View style={styles.modalHeader}>
          <View style={{ width: 50 }} />
          <Text style={styles.modalTitle}>Recurring</Text>
          <TouchableOpacity hitSlop={Tap.slop} onPress={() => setRecurringMgr(false)}><Text style={styles.modalSave}>Done</Text></TouchableOpacity>
        </View>
        <ScrollView automaticallyAdjustKeyboardInsets contentContainerStyle={{ padding: Spacing.base, gap: Spacing.sm }}>
          <Text style={[styles.budgetCardSub, { marginBottom: 4 }]}>These auto-add each month. “Stop” keeps past entries but generates no more.</Text>
          {(recurringExpenses.length + recurringIncomes.length) === 0 ? (
            <Text style={styles.emptySub}>Nothing recurring yet. Flip “Repeats monthly” when you add an expense.</Text>
          ) : (
            <>
              {recurringExpenses.map((r: any) => (
                <View key={r.id} style={styles.limitRow}>
                  <Text style={styles.bcatIcon}>{budgetCategoryIcon(r.category, customCategories || [])}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.limitLabel}>{r.store || r.category}</Text>
                    <Text style={{ fontSize: Typography.sizes.xs, color: Colors.textTertiary }}>{fig('MK-CF-M-014', Math.round(r.amount))} · {r.frequency} · {r.category}</Text>
                  </View>
                  <TouchableOpacity hitSlop={Tap.slop} onPress={() => deleteRecurringExpense(r.id)}><Text style={{ color: Colors.red, fontWeight: '700', fontSize: Typography.sizes.sm }}>Stop</Text></TouchableOpacity>
                </View>
              ))}
              {recurringIncomes.map((r: any) => (
                <View key={r.id} style={styles.limitRow}>
                  <Text style={styles.bcatIcon}>💵</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.limitLabel}>{r.source}</Text>
                    <Text style={{ fontSize: Typography.sizes.xs, color: Colors.textTertiary }}>{fig('MK-CF-M-012', Math.round(r.amount))} · {r.frequency} · income</Text>
                  </View>
                  <TouchableOpacity hitSlop={Tap.slop} onPress={() => deleteRecurringIncome(r.id)}><Text style={{ color: Colors.red, fontWeight: '700', fontSize: Typography.sizes.sm }}>Stop</Text></TouchableOpacity>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </Modal>
    </View>
  );
}

// next month's same day as an ISO string (the recurring function reads new Date(nextDate))
const nextMonthISO = (ymd: string) => { const [y, m, dd] = ymd.split('-').map(Number); return new Date(y, m, dd).toISOString(); };

// ── Add / edit one row of activity (income or expense) ────────────────────────
function TxnSheet({ state, onClose, onDelete }: { state: { open: boolean; editing?: any }; onClose: () => void; onDelete: (entry: any) => void }) {
  const store = useStore() as any;
  const editing = state.editing;
  // canonical bucketed categories (+ custom) so a logged expense maps cleanly to a budget bucket
  const cats: { label: string; icon: string }[] = [
    ...BUDGET_CATEGORIES.map((c) => ({ label: c.label, icon: c.icon })),
    ...((store.customCategories || []) as any[]).map((c) => ({ label: c.label, icon: c.icon })),
  ];
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Groceries');
  const [src, setSrc] = useState('Paycheck');
  const [payee, setPayee] = useState('');
  const [notes, setNotes] = useState('');
  const [day, setDay] = useState<'today' | 'yesterday'>('today');
  const [repeats, setRepeats] = useState(false);

  React.useEffect(() => {
    if (!state.open) return;
    if (editing) {
      const isInc = editing.kind === 'income';
      setKind(isInc ? 'income' : 'expense');
      setAmount(String(editing.amount ?? ''));
      setCategory(editing.category || 'Groceries');
      setSrc(editing.source || 'Paycheck');
      setPayee(editing.store || '');
      setNotes(editing.notes || '');
    } else {
      setKind('expense'); setAmount(''); setCategory('Groceries'); setSrc('Paycheck'); setPayee(''); setNotes(''); setDay('today'); setRepeats(false);
    }
  }, [state.open]);

  const amt = parseFloat(String(amount).replace(/[^0-9.]/g, '')) || 0;
  const save = () => {
    if (amt <= 0) return;
    // editing keeps its original date; a new entry uses today / yesterday
    const date = editing ? editing.date : (() => { const d = new Date(); if (day === 'yesterday') d.setDate(d.getDate() - 1); return isoLocalDate(d); })();
    if (kind === 'income') {
      const payload = { type: editing?.type ?? 'other', amount: amt, source: src.trim() || 'Income', date, notes: notes.trim() };
      if (editing) store.updateIncome(editing.id, payload); else store.addIncome(payload);
      if (!editing && repeats) store.addRecurringIncome({ source: src.trim() || 'Income', amount: amt, frequency: 'monthly', nextDate: nextMonthISO(date), active: true });
    } else {
      const payload = { amount: amt, category, store: payee.trim(), date, notes: notes.trim() };
      if (editing) store.updateExpense(editing.id, payload); else store.addExpense(payload);
      if (!editing && repeats) store.addRecurringExpense({ category, store: payee.trim(), amount: amt, frequency: 'monthly', nextDate: nextMonthISO(date), active: true, notes: notes.trim() });
    }
    onClose();
  };

  return (
    <Modal visible={state.open} animationType={modalAnimation()} presentationStyle="pageSheet">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.modalHeader}>
          <TouchableOpacity hitSlop={Tap.slop} onPress={onClose}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
          <Text style={styles.modalTitle}>{editing ? 'Edit' : 'Add'} {kind === 'income' ? 'income' : 'expense'}</Text>
          <TouchableOpacity hitSlop={Tap.slop} onPress={save} disabled={amt <= 0}><Text style={[styles.modalSave, amt <= 0 && { opacity: 0.4 }]}>Save</Text></TouchableOpacity>
        </View>
        <ScrollView automaticallyAdjustKeyboardInsets contentContainerStyle={{ padding: Spacing.base, gap: Spacing.sm, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          {!editing && (
            <View style={{ marginBottom: 4 }}>
              <SegmentedControl options={['Expense', 'Income']} selected={kind === 'income' ? 'Income' : 'Expense'} onSelect={(v) => setKind(v === 'Income' ? 'income' : 'expense')} />
            </View>
          )}
          <View style={styles.limitRow}>
            <Text style={styles.limitLabel}>Amount</Text>
            <View style={styles.limitInputWrap}>
              <Text style={styles.limitDollar}>$</Text>
              <MoneyBox bare dollarBeside style={styles.limitInput} value={amount} onChangeText={setAmount} a11y="Amount" autoFocus />
            </View>
          </View>
          {kind === 'expense' ? (
            <>
              <Text style={styles.limitLabel}>Category</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {cats.map((c) => (
                  <TouchableOpacity key={c.label} style={[styles.txCatChip, category === c.label && styles.txCatChipOn]} onPress={() => setCategory(c.label)}>
                    <Text style={{ fontSize: 15 }}>{c.icon}</Text>
                    <Text style={[styles.txCatChipT, category === c.label && styles.txCatChipTOn]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.limitRow}>
                <Text style={styles.limitLabel}>Payee</Text>
                <View style={[styles.limitInputWrap, { flex: 1, minWidth: 0 }]}>
                  <TextInput style={[styles.limitInput, { flex: 1 }]} value={payee} onChangeText={setPayee} placeholder="e.g. Trader Joe’s" placeholderTextColor={Colors.textTertiary} />
                </View>
              </View>
            </>
          ) : (
            <View style={styles.limitRow}>
              <Text style={styles.limitLabel}>Source</Text>
              <View style={[styles.limitInputWrap, { flex: 1, minWidth: 0 }]}>
                <TextInput style={[styles.limitInput, { flex: 1 }]} value={src} onChangeText={setSrc} placeholder="e.g. Paycheck, Bonus, Gift" placeholderTextColor={Colors.textTertiary} />
              </View>
            </View>
          )}
          {!editing && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['today', 'yesterday'] as const).map((dd) => (
                <TouchableOpacity key={dd} style={[styles.filterBtn, day === dd && styles.filterBtnOn]} onPress={() => setDay(dd)}>
                  <Text style={[styles.filterText, day === dd && styles.filterTextOn, { textTransform: 'capitalize' }]}>{dd}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {!editing && (
            <View style={[styles.limitRow, { justifyContent: 'space-between' }]}>
              <View><Text style={styles.limitLabel}>Repeats monthly</Text><Text style={{ fontSize: Typography.sizes.xs, color: Colors.textTertiary }}>auto-adds it each month</Text></View>
              <Switch value={repeats} onValueChange={setRepeats} trackColor={{ true: Colors.primary, false: Colors.border }} />
            </View>
          )}
          <View style={styles.limitRow}>
            <Text style={styles.limitLabel}>Note</Text>
            <View style={[styles.limitInputWrap, { flex: 1, minWidth: 0 }]}>
              <TextInput style={[styles.limitInput, { flex: 1 }]} value={notes} onChangeText={setNotes} placeholder="optional" placeholderTextColor={Colors.textTertiary} />
            </View>
          </View>
          {editing && (
            <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 14, marginTop: 4 }} onPress={() => onDelete(editing)}>
              <Text style={{ color: Colors.red, fontWeight: Typography.weights.bold, fontSize: Typography.sizes.base }}>Delete this {editing.kind === 'income' ? 'income' : 'expense'}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary, paddingTop: Spacing.sm },
  // Activity
  monthBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: Spacing.base, marginBottom: Spacing.xs },
  monthArrow: { fontSize: 24, color: Colors.primary, fontWeight: '700', width: 22, textAlign: 'center' },
  monthLabel: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: Spacing.base, marginBottom: Spacing.xs, backgroundColor: Colors.cardBg, borderRadius: Radii.lg, borderWidth: 0.5, borderColor: Colors.border, paddingHorizontal: Spacing.sm, height: 40 },
  searchInput: { flex: 1, fontSize: Typography.sizes.base, color: Colors.textPrimary, paddingVertical: 0 },
  undoBar: { position: 'absolute', left: Spacing.base, right: Spacing.base, bottom: 74, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.textPrimary, borderRadius: Radii.lg, paddingHorizontal: Spacing.md, paddingVertical: 12 },
  undoTxt: { flex: 1, color: Colors.white, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium },
  undoAction: { color: Colors.primaryMid, fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, paddingLeft: Spacing.md },
  fab: { position: 'absolute', right: Spacing.base, bottom: 18, backgroundColor: Colors.primary, borderRadius: Radii.md /* DEC-0231: rounded corners, not semicircle ends */, paddingHorizontal: 20, paddingVertical: 13, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  fabTxt: { color: Colors.white, fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold },
  // rounded corners, not semicircle ends — the one shape of a choice (DEC-0231, 2026-09-25; corrected 2026-10-20)
  txCatChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, paddingHorizontal: 13, borderWidth: 1, borderColor: Colors.border, minHeight: 44 },
  txCatChipOn: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  txCatChipT: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, fontWeight: Typography.weights.medium },
  txCatChipTOn: { color: Colors.primaryDeep, fontWeight: Typography.weights.bold },
  swipeDel: { backgroundColor: Colors.red, justifyContent: 'center', alignItems: 'center', width: 84, borderTopRightRadius: Radii.lg, borderBottomRightRadius: Radii.lg, marginLeft: -Radii.lg, paddingLeft: Radii.lg },
  swipeDelTxt: { color: Colors.white, fontWeight: Typography.weights.bold, fontSize: Typography.sizes.sm },
  dueNote: { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.bold, marginTop: 2 },

  // Strip
  strip: {
    flexDirection: 'row', backgroundColor: Colors.cardBg,
    marginHorizontal: Spacing.base, borderRadius: Radii.lg,
    borderWidth: 0.5, borderColor: Colors.border,
    marginBottom: Spacing.sm, padding: Spacing.md,
  },
  stripItem: { flex: 1, alignItems: 'center' },
  stripLabel: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, marginBottom: 2 },
  stripValue: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
  stripDivider: { width: 0.5, backgroundColor: Colors.border, marginHorizontal: Spacing.sm },

  // Filter
  filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.base, gap: Spacing.sm, marginBottom: Spacing.xs },
  // rounded corners, not semicircle ends — the one shape of a choice (DEC-0231, 2026-09-25; corrected 2026-10-20)
  filterBtn: { paddingHorizontal: 16, borderRadius: Radii.md, backgroundColor: Colors.bgSecondary, borderWidth: 0.5, borderColor: Colors.border, minHeight: 44, justifyContent: 'center' },
  filterBtnOn: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryMid },
  filterText: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, fontWeight: Typography.weights.medium },
  filterTextOn: { color: Colors.primaryDeep },

  // List
  list: { flex: 1 },
  txRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardBg, borderRadius: Radii.lg, borderWidth: 0.5, borderColor: Colors.border, padding: Spacing.sm, gap: Spacing.sm },
  txIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txMid: { flex: 1 },
  txLabel: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.medium, color: Colors.textPrimary },
  txSub: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, marginTop: 1 },
  txNote: { fontSize: Typography.sizes.xs, color: Colors.textTertiary, marginTop: 1 },
  txAmt: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.medium, color: Colors.textPrimary, marginBottom: 4 },
  emptySub: { fontSize: Typography.sizes.base, color: Colors.textSecondary },

  // Budget tab
  budgetHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  budgetCardTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.textPrimary, marginBottom: 2 },
  budgetCardSub: { fontSize: Typography.sizes.xs, color: Colors.textSecondary },
  // monthly-plan card
  planRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  planLabel: { fontSize: Typography.sizes.base, color: Colors.textSecondary },
  planVal: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold, color: Colors.textPrimary },
  planTotalRow: { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 4, paddingTop: 9 },
  // the closing row as This month draws it: 15 points, weight 800 (2026-10-31, CF3-02; DEC-0059) — it was 17 and 20 at 700
  planTotalLabel: { fontSize: Typography.sizes.base, fontWeight: '800', color: Colors.textPrimary },
  planTotalVal: { fontSize: Typography.sizes.base, fontWeight: '800', fontVariant: ['tabular-nums'] },
  planNote: { fontSize: Typography.sizes.xs, color: Colors.textTertiary, marginTop: 6 },
  // the sentence This month prints under its rows, in This month's size and colour (CF3-03)
  // the two boxes moved from Goals (2026-11-01): the Goals screen's own sizes, on the type scale
  dtiHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  dtiPct: { fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'] },
  // the verdict word beside the figure ("Healthy"), not a heading — the bar above is the box's title
  dtiVerdict: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  dtiSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  loanBig: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginTop: 4, fontVariant: ['tabular-nums'] },
  loanBigSub: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  loanLine: { fontSize: 15, color: Colors.textPrimary, marginTop: 6 },
  planNote2: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginTop: 8 },
  countedNote: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginVertical: 6 },
  // bucket section
  bucketHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  bucketName: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.textPrimary, letterSpacing: 0.3 },
  bucketTotal: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.textSecondary },
  bcatRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 7 },
  bcatIcon: { fontSize: 17, width: 22, textAlign: 'center' },
  bcatLabel: { flex: 1, fontSize: Typography.sizes.sm, color: Colors.textPrimary, fontWeight: Typography.weights.medium },
  bcatAmt: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.textPrimary },
  bcatLimit: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, fontWeight: Typography.weights.regular },
  limitBucketHdr: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.textSecondary, marginTop: Spacing.sm, marginBottom: 4, letterSpacing: 0.3 },
  // debts payoff
  payoffSummary: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm },
  payoffStat: { flex: 1, alignItems: 'center' },
  payoffStatV: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  payoffStatL: { fontSize: Typography.sizes.xs, color: Colors.textTertiary, marginTop: 1 },
  debtHero: { fontSize: 30, fontWeight: '800', marginTop: 2, fontVariant: ['tabular-nums'] },
  // "pay first" as drawn: a word in caps beside the name, no fill (cash-flow_v01 .pill, CF-14)
  payFirstTag: { marginLeft: 6, fontSize: 11, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase', color: Colors.textPrimary },
  progressLine: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginTop: 5 },
  // THE DEBTS TAB AS DRAWN (2026-10-25): cards edge to edge with square corners, a quiet grey label naming each, one row a debt
  debtCard: { backgroundColor: Colors.white, padding: Spacing.base, marginHorizontal: -Spacing.base, borderRadius: 0, borderWidth: 0 },
  importBox: { backgroundColor: Colors.white, padding: Spacing.base, marginHorizontal: -Spacing.base, borderRadius: 0, borderWidth: 0, alignItems: 'center' },
  // a door under its box's bar (R1, 2026-10-27): right-aligned, 44 high
  underBarDoor: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center' },
  // a light sub-bar inside a box: SectionBand inCard pulls itself up by the inset, so the gap above it gives that back and 8 more
  subBarGap: { marginTop: Spacing.base + Spacing.sm },
  // a bar on a sheet with 16 points of margin takes the margin back, so it runs edge to edge
  sheetBarBleed: { marginHorizontal: -Spacing.base, marginTop: Spacing.sm },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, color: Colors.textSecondary, textTransform: 'uppercase', marginBottom: 4 },
  debtRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingVertical: 7 },
  debtRowRule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  debtLink: { fontSize: 13, color: Colors.primary, fontWeight: '700' },
  debtSub: { fontSize: 13, color: Colors.textSecondary, fontWeight: '700' },   // the drawing's line under the total (.heroSub)
  debtName: { fontSize: Typography.sizes.base, color: Colors.textPrimary },
  paceTrack: { height: 7, borderRadius: 4, backgroundColor: Colors.bgTertiary, marginTop: 10, overflow: 'hidden' },
  paceFill: { height: 7, backgroundColor: Colors.primary },
  payFirst: { fontSize: Typography.sizes.xs, color: Colors.primary, fontWeight: Typography.weights.bold },
  logPayBtn: { marginTop: Spacing.sm, alignSelf: 'flex-start', backgroundColor: Colors.primaryLight, borderRadius: Radii.md, paddingHorizontal: 16, minHeight: 44, justifyContent: 'center' },
  logPayTxt: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.primaryDeep },
  budgetFooterRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  budgetFooterText: { fontSize: Typography.sizes.xs, color: Colors.textSecondary },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.medium, color: Colors.textPrimary },
  sectionLink: { fontSize: Typography.sizes.sm, color: Colors.primary, fontWeight: Typography.weights.medium },
  catCard: { padding: Spacing.sm },
  catRow: { flexDirection: 'row', alignItems: 'center' },
  catIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  catTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },   // the tag sits beside the name, as drawn
  catLabel: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.medium, color: Colors.textPrimary },
  catAmt: { fontSize: Typography.sizes.base, fontWeight: '700' },   // the drawing's red figure at 700 (CF-14)
  catLimit: { fontSize: 11, color: Colors.textTertiary, fontWeight: '400' },   // the drawing's grey line under a name
  catOverText: { fontSize: 13, color: Colors.red, marginTop: 1 },
  noLimitBar: { height: 5, borderRadius: 5, backgroundColor: Colors.bgTertiary, justifyContent: 'center', alignItems: 'center' },
  noLimitText: { fontSize: 11, color: Colors.textTertiary },
  setLimitsBtn: { backgroundColor: Colors.primaryLight, borderRadius: Radii.lg, padding: Spacing.md, alignItems: 'center', borderWidth: 0.5, borderColor: Colors.primaryMid },
  setLimitsBtnText: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.medium, color: Colors.primaryDeep },

  // Import tab
  importTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.textPrimary, marginBottom: Spacing.xs },
  importSub: { fontSize: Typography.sizes.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  codeBlock: { backgroundColor: Colors.textPrimary, borderRadius: Radii.md, padding: Spacing.md, marginTop: Spacing.sm, gap: 4 },
  code: { fontSize: 13, color: Colors.successGreen, fontFamily: 'monospace' },

  // Limits modal
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.base, borderBottomWidth: 0.5, borderBottomColor: Colors.border, backgroundColor: Colors.cardBg },
  // a sheet's title at the sheet-title size, 20/800 (2026-10-31, CF3-06; DEC-8931) — it was 17/600
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  modalCancel: { fontSize: Typography.sizes.base, color: Colors.textSecondary },
  modalSave: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold, color: Colors.primary },
  limitRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardBg, borderRadius: Radii.lg, borderWidth: 0.5, borderColor: Colors.border, padding: Spacing.sm, gap: Spacing.sm },
  limitLabel: { flex: 1, fontSize: Typography.sizes.base, fontWeight: Typography.weights.medium, color: Colors.textPrimary },
  limitInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, borderWidth: 0.5, borderColor: Colors.border, paddingHorizontal: Spacing.sm, height: 38, minWidth: 100 },
  limitDollar: { fontSize: Typography.sizes.base, color: Colors.textSecondary, marginRight: 2 },
  limitInput: { flex: 1, fontSize: Typography.sizes.base, color: Colors.textPrimary, paddingVertical: 0 },
});

