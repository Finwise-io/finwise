import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, FlatList,
  Modal, TextInput, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { readFileString } from '../services/fileRead';   // T19: supported read path
import { useRouter } from 'expo-router';
import { useStore, useMonthlyStats, useCategorySpend, DebtEntry } from '../store/useStore';
import { Card, SegmentedControl, Badge, Button, TipCard, ProgressBar } from '../components/UI';
import { Colors, Typography, Spacing, Radii } from '../utils/theme';
import { getCategoryIcon, getCategoryBg, EXPENSE_CATEGORIES, CATEGORY_EMOJI_OPTIONS, CATEGORY_BG_OPTIONS, useAllCategories, BUDGET_CATEGORIES, categoryBucketFor, budgetCategoryIcon } from '../constants/categories';
import { budgetVsActual, plannedMonthlySpend } from '../domain/budget';
import { takeHomeMonthly, monthlySavings } from '../domain/savings';   // canonical take-home + planned surplus
import { incomeMonthlyGrid, totalGrossAnnual, effectiveRate } from '../domain/income';
import { totalDebtMonthly, minimumDebtService, payoffPlan, requiredPayment, debtKind, type PayoffMethod } from '../domain/debt';
import { money } from '../domain/_shared/num';
import { Swipeable } from 'react-native-gesture-handler';
import { format } from 'date-fns';

type Tab = 'Activity' | 'Budget' | 'Debts' | 'Import';

const DEBT_TYPES: { value: DebtEntry['type']; label: string; icon: string }[] = [
  { value: 'credit_card',   label: 'Credit card',   icon: '💳' },
  { value: 'student_loan',  label: 'Student loan',  icon: '🎓' },
  { value: 'car_loan',      label: 'Car loan',       icon: '🚗' },
  { value: 'mortgage',      label: 'Mortgage',      icon: '🏠' },
  { value: 'personal_loan', label: 'Personal loan', icon: '🤝' },
  { value: 'other',         label: 'Other',         icon: '📄' },
];

export default function BudgetScreen() {
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
  } = useStore() as any;
  // Single source of truth for debt = `liabilities` (Net Worth model). Adapt it to the
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
  const categorySpend = useCategorySpend();
  const [tab, setTab] = useState<Tab>('Activity');
  const [filter, setFilter] = useState<'All' | 'Income' | 'Expenses'>('All');
  const [importing, setImporting] = useState(false);
  const [limitsVisible, setLimitsVisible] = useState(false);
  const [draftLimits, setDraftLimits] = useState<Record<string, string>>({});

  // Custom category form
  const [catFormVisible, setCatFormVisible] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('📦');
  const [newCatBg, setNewCatBg] = useState('#F5F5F5');

  function saveCustomCategory() {
    const label = newCatLabel.trim();
    if (!label) { Alert.alert('Enter a name', 'Category name is required.'); return; }
    if (allCategories.find(c => c.label.toLowerCase() === label.toLowerCase())) {
      Alert.alert('Already exists', 'A category with this name already exists.'); return;
    }
    addCustomCategory({ label, icon: newCatIcon, bg: newCatBg });
    setNewCatLabel(''); setNewCatIcon('📦'); setNewCatBg('#F5F5F5');
    setCatFormVisible(false);
  }

  // Debt form state
  const [debtFormVisible, setDebtFormVisible] = useState(false);
  const [editDebtId, setEditDebtId] = useState<string | null>(null);
  const [debtName, setDebtName] = useState('');
  const [debtType, setDebtType] = useState<DebtEntry['type']>('credit_card');
  const [debtBalance, setDebtBalance] = useState('');
  const [debtRate, setDebtRate] = useState('');
  const [debtMinPayment, setDebtMinPayment] = useState('');
  const [debtDueDay, setDebtDueDay] = useState('');
  // payoff plan + log-payment
  const [payoffMethod, setPayoffMethod] = useState<PayoffMethod>('avalanche');
  const [extraPay, setExtraPay] = useState('');
  const [payDebt, setPayDebt] = useState<any | null>(null);
  const [payAmt, setPayAmt] = useState('');
  // Activity: month browse, search, add/edit sheet, delete-with-undo
  const [monthOffset, setMonthOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [txnSheet, setTxnSheet] = useState<{ open: boolean; editing?: any }>({ open: false });
  const [deleted, setDeleted] = useState<{ kind: 'income' | 'expense'; entry: any } | null>(null);
  const [recurringMgr, setRecurringMgr] = useState(false);
  // materialize any due recurring income/expenses once when Money opens (idempotent: the engine
  // advances each rule's nextDate, so re-running generates nothing until the next period is due)
  React.useEffect(() => { applyRecurringIncomes?.(); applyRecurringExpenses?.(); }, []);

  const totalDebt = debtsView.reduce((s: number, d: DebtEntry) => s + d.balance, 0);

  function openAddDebt() {
    setEditDebtId(null);
    setDebtName(''); setDebtBalance(''); setDebtRate(''); setDebtMinPayment(''); setDebtDueDay('');
    setDebtType('credit_card');
    setDebtFormVisible(true);
  }

  function openEditDebt(d: DebtEntry, dueDay?: number) {
    setEditDebtId(d.id);
    setDebtName(d.name);
    setDebtType(d.type);
    setDebtBalance(String(d.balance));
    setDebtRate(String(d.interestRate));
    setDebtMinPayment(String(d.minimumPayment));
    setDebtDueDay(dueDay ? String(dueDay) : '');
    setDebtFormVisible(true);
  }

  function saveDebt() {
    const balance = parseFloat(debtBalance);
    if (!debtName.trim() || !balance || balance <= 0) {
      Alert.alert('Missing info', 'Enter a name and balance.');
      return;
    }
    const entry = {
      name: debtName.trim(),
      type: debtType,
      balance,
      interestRate: parseFloat(debtRate) || 0,
      minimumPayment: parseFloat(debtMinPayment) || 0,
      date: new Date().toISOString(),
    };
    const due = parseInt(debtDueDay, 10);
    const payload = { ...toDebt(entry), due_day: (due >= 1 && due <= 31) ? due : undefined };
    if (editDebtId) {
      updateLiability(editDebtId, payload);
    } else {
      addLiability(payload);
    }
    setDebtFormVisible(false);
  }

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
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Activity: browse by month + free-text search; the strip reflects the SELECTED month
  const selDate = new Date(); selDate.setMonth(selDate.getMonth() + monthOffset);
  const selYm = `${selDate.getFullYear()}-${String(selDate.getMonth() + 1).padStart(2, '0')}`;
  const selMonthLabel = selDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const isCurrentMonth = monthOffset === 0;
  const inSelMonth = (e: any) => String(e.date ?? '').startsWith(selYm);
  const q = search.trim().toLowerCase();
  // Income = recurring take-home for the month (onboarding salary, same source Home/Budget use)
  // + any logged one-off income. Without this, a salaried user with no logged income shows $0.
  const baseNetSel = Math.round((op ? incomeMonthlyGrid(op, 'net') : [])[selDate.getMonth()]?.amount ?? 0);
  const loggedIncomeSel = allEntries.filter((e) => e.kind === 'income' && inSelMonth(e)).reduce((t, e) => t + (Number(e.amount) || 0), 0);
  const monthIncomeSel = baseNetSel + loggedIncomeSel;
  const monthSpendSel = allEntries.filter((e) => e.kind === 'expense' && inSelMonth(e)).reduce((t, e) => t + (Number(e.amount) || 0), 0);
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
        `${rows.length} rows imported successfully. Check your transactions.`,
        [{ text: 'View transactions', onPress: () => setTab('Activity') }]
      );
    } catch (err) {
      Alert.alert('Import failed', 'Could not read the file. Make sure it\'s a valid CSV with columns: amount, category, store, date.');
    } finally {
      setImporting(false);
    }
  }

  // ── Budget = the monthly PLAN: Income − Expenses − Debt = Left over (single source of truth) ──
  const num = (v: any) => parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')) || 0;
  // This is the PLANNED monthly surplus (typical month) — take-home (after tax AND 401k) − planned spend
  // − debt — the SAME canonical monthlySavings the savings rate and Cash-Flow screen use, so the plan
  // total agrees everywhere (2026-06-23 surplus decision). Home shows the "Actual" (this-month) version.
  const planIncome = Math.round(takeHomeMonthly(op));            // take-home = after tax + 401(k)
  const bva = budgetVsActual(expenses, op, new Date());
  const planExpenses = Math.round(plannedMonthlySpend(op));      // canonical planned spend
  const planDebt = Math.round(totalDebtMonthly(liabilities ?? []));
  const planLeftOver = planIncome - planExpenses - planDebt;     // ≈ monthlySavings(op, liabilities)
  const spentTotal = Math.round(bva.spent_total);
  const spentPct = planExpenses > 0 ? Math.min(1, spentTotal / planExpenses) : 0;
  const spentOver = spentTotal > planExpenses && planExpenses > 0;
  const budgetPctOfIncome = planIncome > 0 ? Math.round((planExpenses / planIncome) * 100) : 0;

  // per-category $ limit from a spendCat (mirrors spendBuckets() % / non-monthly conversion)
  const netMonthly = (totalGrossAnnual(op) * (1 - effectiveRate(op))) / 12;
  const catDollar = (c: any) => {
    const amt = num(c.amount);
    if (c.unit === 'pct') return (amt / 100) * netMonthly;
    return c.bucket === 'nonmonthly' ? amt / 12 : amt;
  };

  // editable budget categories = canonical BUDGET_CATEGORIES + user custom (each carries a bucket)
  const limitCats: { id: string; label: string; bucket: 'fixed' | 'nonmonthly' | 'flexible'; icon: string }[] = [
    ...BUDGET_CATEGORIES.map((c) => ({ id: c.id, label: c.label, bucket: c.bucket, icon: c.icon })),
    ...((customCategories ?? []) as any[]).map((c) => ({ id: c.label, label: c.label, bucket: categoryBucketFor(c.label, customCategories ?? []) as any, icon: c.icon })),
  ];

  // merge configured limits (spendCats) + logged spend (categorySpend) into per-bucket rows
  const spendCats: any[] = Array.isArray(op?.spendCats) ? op.spendCats : [];
  const spentByLabel: Record<string, number> = {};
  categorySpend.forEach(({ category, total }) => { spentByLabel[category] = (spentByLabel[category] ?? 0) + total; });
  const BUCKET_LABEL: Record<string, string> = { fixed: 'Fixed', nonmonthly: 'Non-monthly', flexible: 'Flexible' };
  const rowsByBucket: Record<string, { label: string; icon: string; limit: number; spent: number }[]> = { fixed: [], nonmonthly: [], flexible: [] };
  const seenCats = new Set<string>();
  spendCats.forEach((c) => {
    if (!c?.label) return;
    const bucket = c.bucket || categoryBucketFor(c.label, customCategories ?? []);
    if (!rowsByBucket[bucket]) return;
    rowsByBucket[bucket].push({ label: c.label, icon: budgetCategoryIcon(c.label, customCategories ?? []), limit: catDollar(c), spent: spentByLabel[c.label] ?? 0 });
    seenCats.add(c.label);
  });
  categorySpend.forEach(({ category, total }) => {
    if (seenCats.has(category)) return;
    const bucket = categoryBucketFor(category, customCategories ?? []);
    if (!rowsByBucket[bucket]) return;
    rowsByBucket[bucket].push({ label: category, icon: budgetCategoryIcon(category, customCategories ?? []), limit: 0, spent: total });
  });
  const bucketActual: Record<string, any> = {};
  bva.buckets.forEach((b: any) => { bucketActual[b.key] = b; });

  function openLimitsModal() {
    const initial: Record<string, string> = {};
    limitCats.forEach(({ label }) => {
      const existing = spendCats.find((c) => c.label === label);
      initial[label] = existing && num(existing.amount) > 0 ? String(Math.round(catDollar(existing))) : '';
    });
    setDraftLimits(initial);
    setLimitsVisible(true);
  }

  function saveLimits() {
    // preserve spendCats that aren't user-editable here; rebuild the editable ones from the draft
    const editable = new Set(limitCats.map((c) => c.label));
    const next = spendCats.filter((c) => !editable.has(c.label));
    limitCats.forEach((c) => {
      const dollar = num(draftLimits[c.label]);
      if (dollar > 0) {
        const prev = spendCats.find((x) => x.label === c.label);
        next.push({ id: prev?.id ?? c.id, label: c.label, bucket: c.bucket, amount: dollar, unit: 'dollar' });
      }
    });
    setOnboardingProfile({ ...(op ?? {}), spendCats: next });
    setLimitsVisible(false);
  }

  // ── Debts: payoff plan (avalanche/snowball) + log-payment (ledger, per DR-14) ──
  const rawDebts: any[] = liabilities ?? [];
  const activeDebts = rawDebts.filter((d) => (d.remaining_balance || 0) > 0);
  const totalMinMonthly = Math.round(minimumDebtService(activeDebts));   // canonical DTI obligation, single source
  const totalInterestMonthly = Math.round(activeDebts.reduce((t, d) => t + (d.remaining_balance || 0) * (d.interest_rate_apr || 0) / 12, 0));
  const plan = payoffPlan(rawDebts, num(extraPay), payoffMethod);
  const debtFreeLabel = plan.neverPaysOff ? 'never at this rate'
    : plan.months <= 0 ? 'now'
    : (() => { const dt = new Date(); dt.setMonth(dt.getMonth() + plan.months); return dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); })();
  const orderedDebts = activeDebts.slice().sort((a, b) => payoffMethod === 'avalanche'
    ? (b.interest_rate_apr - a.interest_rate_apr)
    : (a.remaining_balance - b.remaining_balance));
  const payoffMonthFor = (id: string) => plan.order.find((o) => o.debt_id === id)?.payoffMonth;

  function openPay(d: any) { setPayDebt(d); setPayAmt(String(Math.round(requiredPayment(d)))); }
  function logPayment() {
    const d = payDebt; const amt = num(payAmt);
    if (!d || amt <= 0) return;
    addExpense({ amount: amt, category: 'Debt payment', store: d.label, date: new Date().toISOString().slice(0, 10), notes: '' });
    updateLiability(d.debt_id, { remaining_balance: Math.max(0, (d.remaining_balance || 0) - amt) });
    setPayDebt(null); setPayAmt('');
  }

  return (
    <View style={styles.root}>
      <SegmentedControl
        options={['Activity', 'Budget', 'Debts']}
        selected={tab === 'Import' ? 'Activity' : tab}
        onSelect={(v) => setTab(v as Tab)}
      />

      {/* ── Activity tab — the ledger: browse, search, add/edit, delete-with-undo ─── */}
      {tab === 'Activity' && (
        <>
          <View style={styles.monthBar}>
            <TouchableOpacity onPress={() => setMonthOffset((m) => m - 1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Text style={styles.monthArrow}>‹</Text></TouchableOpacity>
            <Text style={styles.monthLabel}>{selMonthLabel}</Text>
            <TouchableOpacity disabled={isCurrentMonth} onPress={() => setMonthOffset((m) => Math.min(0, m + 1))} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Text style={[styles.monthArrow, isCurrentMonth && { opacity: 0.25 }]}>›</Text></TouchableOpacity>
            <View style={{ flex: 1 }} />
            {(recurringIncomes.length + recurringExpenses.length) > 0 && <TouchableOpacity onPress={() => setRecurringMgr(true)}><Text style={styles.sectionLink}>↻ Recurring</Text></TouchableOpacity>}
            <TouchableOpacity onPress={() => setTab('Import')}><Text style={styles.sectionLink}>⤓ Import</Text></TouchableOpacity>
          </View>

          <View style={styles.strip}>
            <View style={styles.stripItem}>
              <Text style={styles.stripLabel}>Income</Text>
              <Text style={[styles.stripValue, { color: Colors.primary }]}>{money(Math.round(monthIncomeSel))}</Text>
            </View>
            <View style={styles.stripDivider} />
            <View style={styles.stripItem}>
              <Text style={styles.stripLabel}>Actual spend</Text>
              <Text style={[styles.stripValue, { color: Colors.red }]}>{money(Math.round(monthSpendSel))}</Text>
            </View>
            <View style={styles.stripDivider} />
            <View style={styles.stripItem}>
              <Text style={styles.stripLabel}>Net</Text>
              <Text style={[styles.stripValue, { color: monthIncomeSel - monthSpendSel >= 0 ? Colors.primary : Colors.red }]}>
                {money(Math.round(monthIncomeSel - monthSpendSel))}
              </Text>
            </View>
          </View>

          <View style={styles.searchWrap}>
            <Text style={{ fontSize: 15 }}>🔍</Text>
            <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Search payee, category, note" placeholderTextColor={Colors.textTertiary} returnKeyType="search" />
            {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Text style={{ color: Colors.textTertiary, fontSize: 16, paddingHorizontal: 4 }}>✕</Text></TouchableOpacity>}
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
              <Text style={{ fontSize: 11, color: '#9E9E99', textAlign: 'center', paddingBottom: 8 }}>
                Tap to edit or delete • or swipe left
              </Text>
            ) : null}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={{ fontSize: 40, marginBottom: Spacing.sm }}>📭</Text>
                <Text style={styles.emptyTitle}>{search ? 'No matches' : 'Nothing this month'}</Text>
                <Text style={styles.emptySub}>{search ? 'Try a different search.' : 'Tap ＋ Add to log income or an expense.'}</Text>
              </View>
            }
            renderItem={({ item }) => {
              const isIncome = item.kind === 'income';
              if ((item as any).recurring) {
                return (
                  <TouchableOpacity onPress={() => router.push('/income-manager')} style={styles.txRow} activeOpacity={0.85}>
                    <View style={[styles.txIcon, { backgroundColor: Colors.primaryLight }]}><Text style={{ fontSize: 18 }}>💵</Text></View>
                    <View style={styles.txMid}>
                      <Text style={styles.txLabel} numberOfLines={1}>{(item as any).source}</Text>
                      <Text style={styles.txSub}>Recurring · {selMonthLabel} · tap to manage</Text>
                    </View>
                    <Text style={[styles.txAmt, { color: Colors.primary }]}>+${(item as any).amount.toFixed(2)}</Text>
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
                    <TouchableOpacity style={styles.swipeDel} onPress={() => deleteEntry(item.kind, item)}>
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
                      <Text style={{ fontSize: 18 }}>{isIncome ? '💵' : getCategoryIcon((item as any).category)}</Text>
                    </View>
                    <View style={styles.txMid}>
                      <Text style={styles.txLabel} numberOfLines={1}>{label}</Text>
                      <Text style={styles.txSub}>{format(new Date(item.date), 'MMM d, h:mm a')} · {sub}</Text>
                      {(item as any).notes ? <Text style={styles.txNote} numberOfLines={1}>{(item as any).notes}</Text> : null}
                    </View>
                    <Text style={[styles.txAmt, { color: isIncome ? Colors.primary : Colors.red }]}>
                      {isIncome ? '+' : '-'}${(item as any).amount.toFixed(2)}
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
              <TouchableOpacity onPress={undoDelete}><Text style={styles.undoAction}>Undo</Text></TouchableOpacity>
            </View>
          )}
          {/* FAB */}
          <TouchableOpacity style={styles.fab} activeOpacity={0.9} onPress={() => setTxnSheet({ open: true })}>
            <Text style={styles.fabTxt}>＋  Add</Text>
          </TouchableOpacity>
        </>
      )}

      {/* ── Budget tab ───────────────────────────────────────────── */}
      {tab === 'Budget' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.base, gap: Spacing.sm, paddingBottom: 48 }}>

          {/* YOUR MONTHLY PLAN — Income − Expenses − Debt = Left over */}
          <Card>
            <Text style={styles.budgetCardTitle}>Your monthly plan</Text>
            <View style={styles.planRow}><Text style={styles.planLabel}>Income (take-home)</Text><Text style={styles.planVal}>{money(planIncome)}</Text></View>
            <View style={styles.planRow}><Text style={styles.planLabel}>−  Expenses (plan)</Text><Text style={styles.planVal}>{money(planExpenses)}</Text></View>
            {planDebt > 0 && <View style={styles.planRow}><Text style={styles.planLabel}>−  Debt (min payments)</Text><Text style={styles.planVal}>{money(planDebt)}</Text></View>}
            <View style={[styles.planRow, styles.planTotalRow]}>
              <Text style={styles.planTotalLabel}>=  Planned surplus</Text>
              <Text style={[styles.planTotalVal, { color: planLeftOver >= 0 ? Colors.primary : Colors.red }]}>{money(planLeftOver)}</Text>
            </View>
            {planIncome > 0 && <Text style={styles.planNote}>Your expense plan is {budgetPctOfIncome}% of take-home pay.</Text>}
            <View style={{ marginTop: Spacing.md }}>
              <ProgressBar pct={Math.round(spentPct * 100)} color={spentOver ? Colors.red : Colors.primary} height={8} />
              <View style={styles.budgetFooterRow}>
                <Text style={styles.budgetFooterText}>{money(spentTotal)} spent so far</Text>
                <Text style={[styles.budgetFooterText, { color: spentOver ? Colors.red : Colors.primary }]}>
                  {spentOver ? `${money(spentTotal - planExpenses)} over` : `${money(planExpenses - spentTotal)} left`} · of {money(planExpenses)} plan
                </Text>
              </View>
            </View>
          </Card>

          {/* EXPENSES BY BUCKET — bucketed spendCats (the single budget source) */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Expenses by bucket</Text>
            <TouchableOpacity onPress={openLimitsModal}><Text style={styles.sectionLink}>Set limits →</Text></TouchableOpacity>
          </View>
          {planExpenses === 0 && spentTotal === 0 ? (
            <Card>
              <View style={styles.empty}>
                <Text style={{ fontSize: 36, marginBottom: Spacing.sm }}>📊</Text>
                <Text style={styles.emptyTitle}>No budget yet</Text>
                <Text style={styles.emptySub}>Tap “Set limits” to plan what you'll spend, by category.</Text>
              </View>
            </Card>
          ) : (
            (['fixed', 'nonmonthly', 'flexible'] as const).map((bk) => {
              const rows = rowsByBucket[bk];
              const ba = bucketActual[bk] ?? { planned: 0, spent: 0 };
              if (rows.length === 0 && ba.planned === 0 && ba.spent === 0) return null;
              const bpct = ba.planned > 0 ? Math.min(1, ba.spent / ba.planned) : 0;
              const bover = ba.spent > ba.planned && ba.planned > 0;
              return (
                <Card key={bk} style={styles.catCard}>
                  <View style={styles.bucketHeadRow}>
                    <Text style={styles.bucketName}>{BUCKET_LABEL[bk]}</Text>
                    <Text style={[styles.bucketTotal, bover && { color: Colors.red }]}>{money(Math.round(ba.spent))} / {money(Math.round(ba.planned))}</Text>
                  </View>
                  <ProgressBar pct={Math.round(bpct * 100)} color={bover ? Colors.red : Colors.primary} height={6} />
                  {rows.slice().sort((a, b) => b.spent - a.spent).map((r) => {
                    const rover = r.limit > 0 && r.spent > r.limit;
                    return (
                      <View key={r.label} style={styles.bcatRow}>
                        <Text style={styles.bcatIcon}>{r.icon}</Text>
                        <Text style={styles.bcatLabel} numberOfLines={1}>{r.label}</Text>
                        <Text style={[styles.bcatAmt, rover && { color: Colors.red }]}>
                          {money(Math.round(r.spent))}{r.limit > 0 ? <Text style={styles.bcatLimit}> / {money(Math.round(r.limit))}</Text> : <Text style={styles.bcatLimit}> · no limit</Text>}
                        </Text>
                      </View>
                    );
                  })}
                </Card>
              );
            })
          )}
          <TouchableOpacity style={styles.setLimitsBtn} onPress={openLimitsModal} activeOpacity={0.8}>
            <Text style={styles.setLimitsBtnText}>✏️  Set monthly limits</Text>
          </TouchableOpacity>

          {/* DEBT THIS MONTH — managed in the Debts tab */}
          {(liabilities ?? []).length > 0 && (
            <>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Debt this month</Text>
                <TouchableOpacity onPress={() => setTab('Debts')}><Text style={styles.sectionLink}>Manage →</Text></TouchableOpacity>
              </View>
              <Card style={styles.catCard}>
                {debtsView.map((d, i) => (
                  <View key={d.id} style={[styles.bcatRow, i > 0 && { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8, marginTop: 2 }]}>
                    <Text style={styles.bcatIcon}>{DEBT_TYPES.find((t) => t.value === d.type)?.icon || '📄'}</Text>
                    <Text style={styles.bcatLabel} numberOfLines={1}>{d.name}</Text>
                    <Text style={styles.bcatAmt}>{money(Math.round(d.minimumPayment))}<Text style={styles.bcatLimit}> /mo min</Text></Text>
                  </View>
                ))}
              </Card>
            </>
          )}

          {/* Custom categories */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Custom categories</Text>
            <TouchableOpacity onPress={() => setCatFormVisible(true)}>
              <Text style={styles.sectionLink}>+ Add →</Text>
            </TouchableOpacity>
          </View>
          {(customCategories || []).length === 0 ? (
            <Card>
              <Text style={{ fontSize: Typography.sizes.sm, color: Colors.textSecondary, textAlign: 'center', paddingVertical: Spacing.md }}>
                No custom categories yet — tap "+ Add" to create one
              </Text>
            </Card>
          ) : (
            (customCategories as { label: string; icon: string; bg: string }[]).map(c => (
              <Card key={c.label} style={styles.catCard}>
                <View style={styles.catRow}>
                  <View style={[styles.catIcon, { backgroundColor: c.bg }]}>
                    <Text style={{ fontSize: 18 }}>{c.icon}</Text>
                  </View>
                  <Text style={[styles.catLabel, { flex: 1, marginLeft: Spacing.sm }]}>{c.label}</Text>
                  <TouchableOpacity onPress={() => Alert.alert('Delete category', `Remove "${c.label}"?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteCustomCategory(c.label) },
                  ])}>
                    <Text style={{ color: Colors.red, fontSize: 16, padding: 8 }}>✕</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))
          )}
        </ScrollView>
      )}

      {/* Custom category modal */}
      <Modal visible={catFormVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setCatFormVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New category</Text>
            <TouchableOpacity onPress={saveCustomCategory}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: Spacing.base, gap: Spacing.sm, paddingBottom: 48 }}>
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
                  <Text style={{ fontSize: 22 }}>{e}</Text>
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
                <Text style={{ fontSize: 22 }}>{newCatIcon}</Text>
              </View>
              <Text style={{ fontSize: Typography.sizes.md, fontWeight: '600', color: Colors.textPrimary }}>{newCatLabel || 'Preview'}</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Debts tab ────────────────────────────────────────────── */}
      {tab === 'Debts' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.base, gap: Spacing.sm, paddingBottom: 48 }}>

          {/* SUMMARY */}
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.budgetCardTitle}>Total debt</Text>
                <Text style={[styles.budgetCardSub, { marginTop: 2 }]}>
                  {activeDebts.length} account{activeDebts.length !== 1 ? 's' : ''} · {money(totalMinMonthly)}/mo min · ~{money(totalInterestMonthly)}/mo interest
                </Text>
              </View>
              <Text style={{ fontSize: 24, fontWeight: '700', color: totalDebt > 0 ? Colors.red : Colors.primary }}>
                {money(Math.round(totalDebt))}
              </Text>
            </View>
          </Card>

          {/* PAYOFF PLAN */}
          {activeDebts.length > 0 && (
            <Card>
              <Text style={styles.budgetCardTitle}>Payoff plan</Text>
              <View style={{ marginTop: 6 }}>
                <SegmentedControl
                  options={['Avalanche', 'Snowball']}
                  selected={payoffMethod === 'avalanche' ? 'Avalanche' : 'Snowball'}
                  onSelect={(v) => setPayoffMethod(v === 'Avalanche' ? 'avalanche' : 'snowball')}
                />
              </View>
              <Text style={styles.planNote}>{payoffMethod === 'avalanche' ? 'Highest APR first — saves the most interest.' : 'Smallest balance first — quick wins for momentum.'}</Text>
              <View style={[styles.limitRow, { marginTop: Spacing.sm }]}>
                <Text style={styles.limitLabel}>Extra / month</Text>
                <View style={styles.limitInputWrap}>
                  <Text style={styles.limitDollar}>$</Text>
                  <TextInput style={styles.limitInput} value={extraPay} onChangeText={setExtraPay} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textTertiary} returnKeyType="done" />
                </View>
              </View>
              <View style={styles.payoffSummary}>
                <View style={styles.payoffStat}><Text style={[styles.payoffStatV, plan.neverPaysOff && { color: Colors.red }]}>{debtFreeLabel}</Text><Text style={styles.payoffStatL}>debt-free</Text></View>
                <View style={styles.payoffStat}><Text style={styles.payoffStatV}>{money(totalMinMonthly + Math.round(num(extraPay)))}</Text><Text style={styles.payoffStatL}>/mo total</Text></View>
                <View style={styles.payoffStat}><Text style={[styles.payoffStatV, { color: Colors.red }]}>{plan.neverPaysOff ? '—' : money(Math.round(plan.totalInterest))}</Text><Text style={styles.payoffStatL}>total interest</Text></View>
              </View>
              {plan.neverPaysOff && (
                <Text style={[styles.planNote, { color: Colors.red, marginTop: 8 }]}>⚠️ At this payment your balance grows faster than you pay it down. Add an extra payment to start getting ahead.</Text>
              )}
            </Card>
          )}

          {/* DEBT LIST — ordered by the chosen strategy */}
          {activeDebts.length === 0 ? (
            <Card>
              <View style={styles.empty}>
                <Text style={{ fontSize: 36, marginBottom: Spacing.sm }}>🦸</Text>
                <Text style={styles.emptyTitle}>No debts tracked</Text>
                <Text style={styles.emptySub}>Add any loans or credit cards to plan your payoff.</Text>
              </View>
            </Card>
          ) : (
            orderedDebts.map((d, idx) => {
              const dk = debtKind(d.debt_type);
              const monthlyInterest = (d.remaining_balance || 0) * (d.interest_rate_apr || 0) / 12;
              const pm = payoffMonthFor(d.debt_id);
              return (
                <Card key={d.debt_id} style={styles.catCard}>
                  <TouchableOpacity onPress={() => openEditDebt(toEntry(d), d.due_day)} onLongPress={() => handleDeleteDebt(d.debt_id)} activeOpacity={0.8}>
                    <View style={styles.catRow}>
                      <View style={[styles.catIcon, { backgroundColor: Colors.redLight }]}><Text style={{ fontSize: 18 }}>{dk?.icon || '📄'}</Text></View>
                      <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                        <View style={styles.catTitleRow}>
                          <Text style={styles.catLabel} numberOfLines={1}>{d.label}{idx === 0 && <Text style={styles.payFirst}>  • pay first</Text>}</Text>
                          <Text style={[styles.catAmt, { color: Colors.red }]}>{money(Math.round(d.remaining_balance || 0))}</Text>
                        </View>
                        <Text style={styles.catLimit}>
                          {((d.interest_rate_apr || 0) * 100).toFixed(2)}% APR · {money(Math.round(requiredPayment(d)))}/mo min · ~{money(Math.round(monthlyInterest))}/mo interest{pm ? ` · clear in ${pm} mo` : ''}
                        </Text>
                        {(() => {
                          const dd = d.due_day; if (!dd) return null;
                          const now = new Date(); const t = now.getDate();
                          const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                          let n = dd - t; if (n < 0) n += dim;                 // days to the next occurrence
                          if (n > 10) return null;                            // only surface when it's soon
                          return <Text style={[styles.dueNote, { color: n <= 2 ? Colors.red : Colors.amber }]}>🔔 {n === 0 ? 'payment due today' : `payment due in ${n} day${n === 1 ? '' : 's'}`}</Text>;
                        })()}
                      </View>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.logPayBtn} onPress={() => openPay(d)} activeOpacity={0.85}>
                    <Text style={styles.logPayTxt}>Log payment</Text>
                  </TouchableOpacity>
                </Card>
              );
            })
          )}

          <TouchableOpacity style={styles.setLimitsBtn} onPress={openAddDebt} activeOpacity={0.8}>
            <Text style={styles.setLimitsBtnText}>+ Add debt account</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: Typography.sizes.xs, color: Colors.textTertiary, textAlign: 'center' }}>
            Tap a debt to edit • Hold to delete
          </Text>
        </ScrollView>
      )}

      {/* ── Debt form modal ───────────────────────────────────────── */}
      <Modal visible={debtFormVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setDebtFormVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editDebtId ? 'Edit debt' : 'Add debt'}</Text>
            <TouchableOpacity onPress={saveDebt}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: Spacing.base, gap: Spacing.sm, paddingBottom: 48 }}>
            <Text style={styles.limitLabel}>Debt type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {DEBT_TYPES.map(t => (
                <TouchableOpacity key={t.value}
                  style={[styles.filterBtn, debtType === t.value && styles.filterBtnOn]}
                  onPress={() => setDebtType(t.value)}>
                  <Text style={[styles.filterText, debtType === t.value && styles.filterTextOn]}>
                    {t.icon} {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.limitRow}>
              <Text style={styles.limitLabel}>Name</Text>
              <View style={[styles.limitInputWrap, { flex: 1, minWidth: 0 }]}>
                <TextInput
                  style={[styles.limitInput, { flex: 1 }]}
                  value={debtName} onChangeText={setDebtName}
                  placeholder="e.g. Chase Sapphire"
                  placeholderTextColor={Colors.textTertiary}
                />
              </View>
            </View>
            <View style={styles.limitRow}>
              <Text style={styles.limitLabel}>Balance ($)</Text>
              <View style={styles.limitInputWrap}>
                <Text style={styles.limitDollar}>$</Text>
                <TextInput style={styles.limitInput} value={debtBalance} onChangeText={setDebtBalance}
                  keyboardType="decimal-pad" placeholder="5000" placeholderTextColor={Colors.textTertiary} />
              </View>
            </View>
            <View style={styles.limitRow}>
              <Text style={styles.limitLabel}>Interest rate (%)</Text>
              <View style={styles.limitInputWrap}>
                <TextInput style={styles.limitInput} value={debtRate} onChangeText={setDebtRate}
                  keyboardType="decimal-pad" placeholder="19.99" placeholderTextColor={Colors.textTertiary} />
                <Text style={styles.limitDollar}>%</Text>
              </View>
            </View>
            <View style={styles.limitRow}>
              <Text style={styles.limitLabel}>Min payment ($)</Text>
              <View style={styles.limitInputWrap}>
                <Text style={styles.limitDollar}>$</Text>
                <TextInput style={styles.limitInput} value={debtMinPayment} onChangeText={setDebtMinPayment}
                  keyboardType="decimal-pad" placeholder="25" placeholderTextColor={Colors.textTertiary} />
              </View>
            </View>
            <View style={styles.limitRow}>
              <Text style={styles.limitLabel}>Due day (1–31, optional)</Text>
              <View style={styles.limitInputWrap}>
                <TextInput style={styles.limitInput} value={debtDueDay} onChangeText={setDebtDueDay}
                  keyboardType="number-pad" placeholder="15" placeholderTextColor={Colors.textTertiary} />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Import tab ───────────────────────────────────────────── */}
      {tab === 'Import' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.base, gap: Spacing.sm }}>
          <TouchableOpacity onPress={() => setTab('Activity')} style={{ alignSelf: 'flex-start' }}><Text style={styles.sectionLink}>‹ Back to Activity</Text></TouchableOpacity>
          <Card style={{ alignItems: 'center', padding: Spacing.xl }}>
            <Text style={{ fontSize: 48, marginBottom: Spacing.md }}>📂</Text>
            <Text style={styles.importTitle}>Import from Excel or CSV</Text>
            <Text style={styles.importSub}>
              Upload a spreadsheet of your transactions and we'll import them automatically.
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

          <Card>
            <Text style={styles.importTitle}>Example CSV format</Text>
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
      <Modal visible={!!payDebt} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setPayDebt(null)}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>Log payment</Text>
            <TouchableOpacity onPress={logPayment}><Text style={styles.modalSave}>Log</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: Spacing.base, gap: Spacing.sm }}>
            <Text style={[styles.budgetCardSub, { marginBottom: 4 }]}>{payDebt?.label} · {money(Math.round(payDebt?.remaining_balance || 0))} balance</Text>
            <View style={styles.limitRow}>
              <Text style={styles.limitLabel}>Amount</Text>
              <View style={styles.limitInputWrap}>
                <Text style={styles.limitDollar}>$</Text>
                <TextInput style={styles.limitInput} value={payAmt} onChangeText={setPayAmt} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textTertiary} autoFocus />
              </View>
            </View>
            <Text style={{ fontSize: Typography.sizes.xs, color: Colors.textTertiary, lineHeight: 18 }}>
              Records a “Debt payment” in Activity and lowers this balance.{'\n'}New balance: {money(Math.max(0, Math.round((payDebt?.remaining_balance || 0) - num(payAmt))))}.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={limitsVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setLimitsVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Monthly limits</Text>
            <TouchableOpacity onPress={saveLimits}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: Spacing.base, gap: Spacing.sm, paddingBottom: 48 }}>
            <TipCard color="green">
              <Text style={{ fontSize: Typography.sizes.sm, color: Colors.primaryDeep, lineHeight: 20 }}>
                Set a monthly dollar limit per category. Leave blank for no limit. Categories are grouped by bucket — these limits are your expense plan everywhere in the app.
              </Text>
            </TipCard>
            {(['fixed', 'nonmonthly', 'flexible'] as const).map((bk) => (
              <View key={bk}>
                <Text style={styles.limitBucketHdr}>{BUCKET_LABEL[bk]}</Text>
                {limitCats.filter((c) => c.bucket === bk).map(({ label, icon }) => (
                  <View key={label} style={styles.limitRow}>
                    <View style={[styles.catIcon, { backgroundColor: Colors.bgSecondary }]}>
                      <Text style={{ fontSize: 18 }}>{icon}</Text>
                    </View>
                    <Text style={styles.limitLabel}>{label}</Text>
                    <View style={styles.limitInputWrap}>
                      <Text style={styles.limitDollar}>$</Text>
                      <TextInput
                        style={styles.limitInput}
                        value={draftLimits[label] ?? ''}
                        onChangeText={(v) => setDraftLimits((d) => ({ ...d, [label]: v }))}
                        keyboardType="decimal-pad"
                        placeholder="No limit"
                        placeholderTextColor={Colors.textTertiary}
                        returnKeyType="done"
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
      <Modal visible={recurringMgr} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalHeader}>
          <View style={{ width: 50 }} />
          <Text style={styles.modalTitle}>Recurring</Text>
          <TouchableOpacity onPress={() => setRecurringMgr(false)}><Text style={styles.modalSave}>Done</Text></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: Spacing.base, gap: Spacing.sm }}>
          <Text style={[styles.budgetCardSub, { marginBottom: 4 }]}>These auto-add each month. “Stop” keeps past entries but generates no more.</Text>
          {(recurringExpenses.length + recurringIncomes.length) === 0 ? (
            <Text style={styles.emptySub}>Nothing recurring yet. Flip “Repeats monthly” when you add a transaction.</Text>
          ) : (
            <>
              {recurringExpenses.map((r: any) => (
                <View key={r.id} style={styles.limitRow}>
                  <Text style={styles.bcatIcon}>{budgetCategoryIcon(r.category, customCategories || [])}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.limitLabel}>{r.store || r.category}</Text>
                    <Text style={{ fontSize: Typography.sizes.xs, color: Colors.textTertiary }}>{money(Math.round(r.amount))} · {r.frequency} · {r.category}</Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteRecurringExpense(r.id)}><Text style={{ color: Colors.red, fontWeight: '700', fontSize: Typography.sizes.sm }}>Stop</Text></TouchableOpacity>
                </View>
              ))}
              {recurringIncomes.map((r: any) => (
                <View key={r.id} style={styles.limitRow}>
                  <Text style={styles.bcatIcon}>💵</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.limitLabel}>{r.source}</Text>
                    <Text style={{ fontSize: Typography.sizes.xs, color: Colors.textTertiary }}>{money(Math.round(r.amount))} · {r.frequency} · income</Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteRecurringIncome(r.id)}><Text style={{ color: Colors.red, fontWeight: '700', fontSize: Typography.sizes.sm }}>Stop</Text></TouchableOpacity>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </Modal>
    </View>
  );
}

// next month's same day as an ISO string (the recurring engine reads new Date(nextDate))
const nextMonthISO = (ymd: string) => { const [y, m, dd] = ymd.split('-').map(Number); return new Date(y, m, dd).toISOString(); };

// ── Add / edit a transaction (income or expense) ──────────────────────────────
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
    const date = editing ? editing.date : (() => { const d = new Date(); if (day === 'yesterday') d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
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
    <Modal visible={state.open} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
          <Text style={styles.modalTitle}>{editing ? 'Edit' : 'Add'} {kind === 'income' ? 'income' : 'expense'}</Text>
          <TouchableOpacity onPress={save} disabled={amt <= 0}><Text style={[styles.modalSave, amt <= 0 && { opacity: 0.4 }]}>Save</Text></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: Spacing.base, gap: Spacing.sm, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          {!editing && (
            <View style={{ marginBottom: 4 }}>
              <SegmentedControl options={['Expense', 'Income']} selected={kind === 'income' ? 'Income' : 'Expense'} onSelect={(v) => setKind(v === 'Income' ? 'income' : 'expense')} />
            </View>
          )}
          <View style={styles.limitRow}>
            <Text style={styles.limitLabel}>Amount</Text>
            <View style={styles.limitInputWrap}>
              <Text style={styles.limitDollar}>$</Text>
              <TextInput style={styles.limitInput} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textTertiary} autoFocus />
            </View>
          </View>
          {kind === 'expense' ? (
            <>
              <Text style={styles.limitLabel}>Category</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {cats.map((c) => (
                  <TouchableOpacity key={c.label} style={[styles.txCatChip, category === c.label && styles.txCatChipOn]} onPress={() => setCategory(c.label)}>
                    <Text style={{ fontSize: 14 }}>{c.icon}</Text>
                    <Text style={[styles.txCatChipT, category === c.label && styles.txCatChipTOn]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.limitRow}>
                <Text style={styles.limitLabel}>Payee</Text>
                <View style={[styles.limitInputWrap, { flex: 1, minWidth: 0 }]}>
                  <TextInput style={[styles.limitInput, { flex: 1 }]} value={payee} onChangeText={setPayee} placeholder="e.g. Trader Joe's" placeholderTextColor={Colors.textTertiary} />
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
  monthArrow: { fontSize: 22, color: Colors.primary, fontWeight: '700', width: 22, textAlign: 'center' },
  monthLabel: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: Spacing.base, marginBottom: Spacing.xs, backgroundColor: Colors.cardBg, borderRadius: Radii.lg, borderWidth: 0.5, borderColor: Colors.border, paddingHorizontal: Spacing.sm, height: 40 },
  searchInput: { flex: 1, fontSize: Typography.sizes.base, color: Colors.textPrimary, paddingVertical: 0 },
  undoBar: { position: 'absolute', left: Spacing.base, right: Spacing.base, bottom: 74, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.textPrimary, borderRadius: Radii.lg, paddingHorizontal: Spacing.md, paddingVertical: 12 },
  undoTxt: { flex: 1, color: '#fff', fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium },
  undoAction: { color: Colors.primaryMid, fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, paddingLeft: Spacing.md },
  fab: { position: 'absolute', right: Spacing.base, bottom: 18, backgroundColor: Colors.primary, borderRadius: 24, paddingHorizontal: 20, paddingVertical: 13, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  fabTxt: { color: '#fff', fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold },
  txCatChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.bgSecondary, borderRadius: Radii.pill, paddingHorizontal: 11, paddingVertical: 7, borderWidth: 1, borderColor: Colors.border },
  txCatChipOn: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  txCatChipT: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, fontWeight: Typography.weights.medium },
  txCatChipTOn: { color: Colors.primaryDeep, fontWeight: Typography.weights.bold },
  swipeDel: { backgroundColor: Colors.red, justifyContent: 'center', alignItems: 'center', width: 84, borderTopRightRadius: Radii.lg, borderBottomRightRadius: Radii.lg, marginLeft: -Radii.lg, paddingLeft: Radii.lg },
  swipeDelTxt: { color: '#fff', fontWeight: Typography.weights.bold, fontSize: Typography.sizes.sm },
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
  filterBtn: { paddingVertical: 7, paddingHorizontal: 16, borderRadius: Radii.pill, backgroundColor: Colors.bgSecondary, borderWidth: 0.5, borderColor: Colors.border },
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
  planTotalLabel: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  planTotalVal: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
  planNote: { fontSize: Typography.sizes.xs, color: Colors.textTertiary, marginTop: 6 },
  // bucket section
  bucketHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  bucketName: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.textPrimary, letterSpacing: 0.3 },
  bucketTotal: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.textSecondary },
  bcatRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 7 },
  bcatIcon: { fontSize: 16, width: 22, textAlign: 'center' },
  bcatLabel: { flex: 1, fontSize: Typography.sizes.sm, color: Colors.textPrimary, fontWeight: Typography.weights.medium },
  bcatAmt: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.textPrimary },
  bcatLimit: { fontSize: Typography.sizes.xs, color: Colors.textTertiary, fontWeight: Typography.weights.regular },
  limitBucketHdr: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.textSecondary, marginTop: Spacing.sm, marginBottom: 4, letterSpacing: 0.3 },
  // debts payoff
  payoffSummary: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm },
  payoffStat: { flex: 1, alignItems: 'center' },
  payoffStatV: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  payoffStatL: { fontSize: Typography.sizes.xs, color: Colors.textTertiary, marginTop: 1 },
  payFirst: { fontSize: Typography.sizes.xs, color: Colors.primary, fontWeight: Typography.weights.bold },
  logPayBtn: { marginTop: Spacing.sm, alignSelf: 'flex-start', backgroundColor: Colors.primaryLight, borderRadius: Radii.md, paddingHorizontal: 14, paddingVertical: 8 },
  logPayTxt: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.primaryDeep },
  budgetFooterRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  budgetFooterText: { fontSize: Typography.sizes.xs, color: Colors.textSecondary },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.medium, color: Colors.textPrimary },
  sectionLink: { fontSize: Typography.sizes.sm, color: Colors.primary, fontWeight: Typography.weights.medium },
  catCard: { padding: Spacing.sm },
  catRow: { flexDirection: 'row', alignItems: 'center' },
  catIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  catTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  catLabel: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.medium, color: Colors.textPrimary },
  catAmt: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold },
  catLimit: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, fontWeight: '400' },
  catOverText: { fontSize: 10, color: Colors.red, marginTop: 1 },
  noLimitBar: { height: 5, borderRadius: 5, backgroundColor: Colors.bgTertiary, justifyContent: 'center', alignItems: 'center' },
  noLimitText: { fontSize: 9, color: Colors.textTertiary },
  setLimitsBtn: { backgroundColor: Colors.primaryLight, borderRadius: Radii.lg, padding: Spacing.md, alignItems: 'center', borderWidth: 0.5, borderColor: Colors.primaryMid },
  setLimitsBtnText: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.medium, color: Colors.primaryDeep },

  // Import tab
  importTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.textPrimary, marginBottom: Spacing.xs },
  importSub: { fontSize: Typography.sizes.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  codeBlock: { backgroundColor: '#1A1A18', borderRadius: Radii.md, padding: Spacing.md, marginTop: Spacing.sm, gap: 4 },
  code: { fontSize: 12, color: '#5DCAA5', fontFamily: 'monospace' },

  // Limits modal
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.base, borderBottomWidth: 0.5, borderBottomColor: Colors.border, backgroundColor: Colors.cardBg },
  modalTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.textPrimary },
  modalCancel: { fontSize: Typography.sizes.base, color: Colors.textSecondary },
  modalSave: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold, color: Colors.primary },
  limitRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardBg, borderRadius: Radii.lg, borderWidth: 0.5, borderColor: Colors.border, padding: Spacing.sm, gap: Spacing.sm },
  limitLabel: { flex: 1, fontSize: Typography.sizes.base, fontWeight: Typography.weights.medium, color: Colors.textPrimary },
  limitInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, borderWidth: 0.5, borderColor: Colors.border, paddingHorizontal: Spacing.sm, height: 38, minWidth: 100 },
  limitDollar: { fontSize: Typography.sizes.base, color: Colors.textSecondary, marginRight: 2 },
  limitInput: { flex: 1, fontSize: Typography.sizes.base, color: Colors.textPrimary, paddingVertical: 0 },
});
