import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, FlatList,
  Modal, TextInput, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useStore, useMonthlyStats, useCategorySpend, DebtEntry } from '../store/useStore';
import { Card, SegmentedControl, Badge, Button, TipCard, ProgressBar } from '../components/UI';
import { Colors, Typography, Spacing, Radii } from '../utils/theme';
import { getCategoryIcon, getCategoryBg, EXPENSE_CATEGORIES, CATEGORY_EMOJI_OPTIONS, CATEGORY_BG_OPTIONS, useAllCategories } from '../constants/categories';
import { format } from 'date-fns';

type Tab = 'Transactions' | 'Budget' | 'Debts' | 'Import';

const DEBT_TYPES: { value: DebtEntry['type']; label: string; icon: string }[] = [
  { value: 'credit_card',   label: 'Credit card',   icon: '💳' },
  { value: 'student_loan',  label: 'Student loan',  icon: '🎓' },
  { value: 'car_loan',      label: 'Car loan',       icon: '🚗' },
  { value: 'mortgage',      label: 'Mortgage',      icon: '🏠' },
  { value: 'personal_loan', label: 'Personal loan', icon: '🤝' },
  { value: 'other',         label: 'Other',         icon: '📄' },
];

export default function BudgetScreen() {
  const {
    incomes, expenses, deleteIncome, deleteExpense, importFromCSV,
    budgetCategories, setBudgetCategories,
    expenseTargetPercent,
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
  const [tab, setTab] = useState<Tab>('Transactions');
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

  const totalDebt = debtsView.reduce((s: number, d: DebtEntry) => s + d.balance, 0);

  function openAddDebt() {
    setEditDebtId(null);
    setDebtName(''); setDebtBalance(''); setDebtRate(''); setDebtMinPayment('');
    setDebtType('credit_card');
    setDebtFormVisible(true);
  }

  function openEditDebt(d: DebtEntry) {
    setEditDebtId(d.id);
    setDebtName(d.name);
    setDebtType(d.type);
    setDebtBalance(String(d.balance));
    setDebtRate(String(d.interestRate));
    setDebtMinPayment(String(d.minimumPayment));
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
    if (editDebtId) {
      updateLiability(editDebtId, toDebt(entry));
    } else {
      addLiability(toDebt(entry));
    }
    setDebtFormVisible(false);
  }

  function handleDeleteDebt(id: string) {
    Alert.alert('Delete debt', 'Remove this debt entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteLiability(id) },
    ]);
  }

  function handleDeleteEntry(kind: 'income' | 'expense', id: string) {
    Alert.alert(
      'Delete entry',
      'Remove this entry? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => kind === 'income' ? deleteIncome(id) : deleteExpense(id) },
      ]
    );
  }

  const allEntries = [
    ...incomes.map((i: any) => ({ ...i, kind: 'income' as const })),
    ...expenses.map((e: any) => ({ ...e, kind: 'expense' as const })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filtered = allEntries.filter((e) => {
    if (filter === 'Income') return e.kind === 'income';
    if (filter === 'Expenses') return e.kind === 'expense';
    return true;
  });

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
      const content = await FileSystem.readAsStringAsync(file.uri);

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
        [{ text: 'View transactions', onPress: () => setTab('Transactions') }]
      );
    } catch (err) {
      Alert.alert('Import failed', 'Could not read the file. Make sure it\'s a valid CSV with columns: amount, category, store, date.');
    } finally {
      setImporting(false);
    }
  }

  function openLimitsModal() {
    const initial: Record<string, string> = {};
    allCategories.forEach(({ label }) => {
      const existing = budgetCategories.find((c: any) => c.category === label);
      initial[label] = existing ? String(existing.limit) : '';
    });
    setDraftLimits(initial);
    setLimitsVisible(true);
  }

  function saveLimits() {
    const updated = allCategories
      .filter(({ label }) => draftLimits[label] && parseFloat(draftLimits[label]) > 0)
      .map(({ label }) => ({ category: label, limit: parseFloat(draftLimits[label]), type: 'fixed' as const }));
    setBudgetCategories(updated);
    setLimitsVisible(false);
  }

  // Overall target bar
  const targetAmount = monthIncome > 0 ? monthIncome * (expenseTargetPercent / 100) : 0;
  const overallPct = targetAmount > 0 ? (monthSpend / targetAmount) * 100 : 0;
  const overallOver = monthSpend > targetAmount && targetAmount > 0;

  return (
    <View style={styles.root}>
      <SegmentedControl
        options={['Transactions', 'Budget', 'Debts', 'Import']}
        selected={tab}
        onSelect={(v) => setTab(v as Tab)}
      />

      {/* ── Transactions tab ─────────────────────────────────────── */}
      {tab === 'Transactions' && (
        <>
          <View style={styles.strip}>
            <View style={styles.stripItem}>
              <Text style={styles.stripLabel}>Income</Text>
              <Text style={[styles.stripValue, { color: Colors.primary }]}>${monthIncome.toFixed(0)}</Text>
            </View>
            <View style={styles.stripDivider} />
            <View style={styles.stripItem}>
              <Text style={styles.stripLabel}>Spent</Text>
              <Text style={[styles.stripValue, { color: Colors.red }]}>${monthSpend.toFixed(0)}</Text>
            </View>
            <View style={styles.stripDivider} />
            <View style={styles.stripItem}>
              <Text style={styles.stripLabel}>Net</Text>
              <Text style={[styles.stripValue, { color: monthIncome - monthSpend >= 0 ? Colors.primary : Colors.red }]}>
                ${Math.abs(monthIncome - monthSpend).toFixed(0)}
              </Text>
            </View>
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
            data={filtered}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={{ padding: Spacing.base, gap: Spacing.xs, paddingBottom: 40 }}
            ListHeaderComponent={filtered.length > 0 ? (
              <Text style={{ fontSize: 11, color: '#9E9E99', textAlign: 'center', paddingBottom: 8 }}>
                Hold any entry to delete it
              </Text>
            ) : null}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={{ fontSize: 40, marginBottom: Spacing.sm }}>📭</Text>
                <Text style={styles.emptyTitle}>No entries yet</Text>
                <Text style={styles.emptySub}>Add income and expenses to see them here</Text>
              </View>
            }
            renderItem={({ item }) => {
              const isIncome = item.kind === 'income';
              const label = isIncome ? (item as any).source : (item as any).store || (item as any).category;
              const sub = isIncome ? 'Income' : (item as any).category;
              return (
                <TouchableOpacity
                  onLongPress={() => handleDeleteEntry(item.kind, item.id)}
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
              );
            }}
          />
        </>
      )}

      {/* ── Budget tab ───────────────────────────────────────────── */}
      {tab === 'Budget' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.base, gap: Spacing.sm, paddingBottom: 48 }}>

          {/* Overall target card */}
          <Card>
            <View style={styles.budgetHeaderRow}>
              <View>
                <Text style={styles.budgetCardTitle}>Monthly spend target</Text>
                <Text style={styles.budgetCardSub}>
                  {expenseTargetPercent}% of income · ${targetAmount.toFixed(0)} limit
                </Text>
              </View>
              <Badge
                label={overallOver ? 'Over target' : 'On track'}
                color={overallOver ? 'red' : 'green'}
              />
            </View>
            <View style={{ marginTop: Spacing.md }}>
              <ProgressBar pct={Math.min(overallPct, 100)} color={overallOver ? Colors.red : Colors.primary} height={8} />
              <View style={styles.budgetFooterRow}>
                <Text style={styles.budgetFooterText}>${monthSpend.toFixed(0)} spent</Text>
                <Text style={[styles.budgetFooterText, { color: overallOver ? Colors.red : Colors.primary }]}>
                  {overallOver
                    ? `$${(monthSpend - targetAmount).toFixed(0)} over`
                    : `$${(targetAmount - monthSpend).toFixed(0)} remaining`}
                </Text>
              </View>
            </View>
          </Card>

          {/* Category breakdown */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>By category</Text>
            <TouchableOpacity onPress={openLimitsModal}>
              <Text style={styles.sectionLink}>Set limits →</Text>
            </TouchableOpacity>
          </View>

          {categorySpend.length === 0 ? (
            <Card>
              <View style={styles.empty}>
                <Text style={{ fontSize: 36, marginBottom: Spacing.sm }}>📊</Text>
                <Text style={styles.emptyTitle}>No expenses yet</Text>
                <Text style={styles.emptySub}>Log expenses to see category breakdown</Text>
              </View>
            </Card>
          ) : (
            categorySpend.map(({ category, total }) => {
              const catDef = budgetCategories.find((c: any) => c.category === category);
              const limit = catDef?.limit ?? 0;
              const pct = limit > 0 ? (total / limit) * 100 : 0;
              const isOver = limit > 0 && total > limit;
              const barColor = !limit ? Colors.primary : isOver ? Colors.red : Colors.primary;

              return (
                <Card key={category} style={styles.catCard}>
                  <View style={styles.catRow}>
                    <View style={[styles.catIcon, { backgroundColor: getCategoryBg(category) }]}>
                      <Text style={{ fontSize: 18 }}>{getCategoryIcon(category)}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                      <View style={styles.catTitleRow}>
                        <Text style={styles.catLabel}>{category}</Text>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[styles.catAmt, { color: isOver ? Colors.red : Colors.textPrimary }]}>
                            ${total.toFixed(0)}
                            {limit > 0 && <Text style={styles.catLimit}> / ${limit.toFixed(0)}</Text>}
                          </Text>
                          {isOver && <Text style={styles.catOverText}>Over by ${(total - limit).toFixed(0)}</Text>}
                        </View>
                      </View>
                      {limit > 0 ? (
                        <ProgressBar pct={Math.min(pct, 100)} color={barColor} height={5} />
                      ) : (
                        <View style={styles.noLimitBar}>
                          <Text style={styles.noLimitText}>No limit set</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Card>
              );
            })
          )}

          {categorySpend.length > 0 && (
            <TouchableOpacity style={styles.setLimitsBtn} onPress={openLimitsModal} activeOpacity={0.8}>
              <Text style={styles.setLimitsBtnText}>✏️  Set monthly limits</Text>
            </TouchableOpacity>
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

          {/* Summary card */}
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={styles.budgetCardTitle}>Total debt</Text>
                <Text style={[styles.budgetCardSub, { marginTop: 2 }]}>
                  {debtsView.length} account{debtsView.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <Text style={{ fontSize: 24, fontWeight: '700', color: totalDebt > 0 ? Colors.red : Colors.primary }}>
                ${totalDebt.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </Text>
            </View>
            {totalDebt > 0 && (
              <TipCard color="amber">
                <Text style={{ fontSize: Typography.sizes.sm, color: Colors.amber, lineHeight: 20 }}>
                  💡 High-interest debt (credit cards) costs you money every month. Focus on paying those off first — avalanche method saves the most interest.
                </Text>
              </TipCard>
            )}
          </Card>

          {/* Debt list */}
          {debtsView.length === 0 ? (
            <Card>
              <View style={styles.empty}>
                <Text style={{ fontSize: 36, marginBottom: Spacing.sm }}>🦸</Text>
                <Text style={styles.emptyTitle}>No debts tracked</Text>
                <Text style={styles.emptySub}>Add any loans, credit cards, or other debts to see your true net worth</Text>
              </View>
            </Card>
          ) : (
            debtsView
              .slice()
              .sort((a: DebtEntry, b: DebtEntry) => b.balance - a.balance)
              .map((d: DebtEntry) => {
                const dt = DEBT_TYPES.find(t => t.value === d.type);
                const monthlyInterest = d.balance * (d.interestRate / 100 / 12);
                return (
                  <TouchableOpacity key={d.id} onPress={() => openEditDebt(d)} onLongPress={() => handleDeleteDebt(d.id)} activeOpacity={0.8}>
                    <Card style={styles.catCard}>
                      <View style={styles.catRow}>
                        <View style={[styles.catIcon, { backgroundColor: Colors.redLight }]}>
                          <Text style={{ fontSize: 18 }}>{dt?.icon || '📄'}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                          <View style={styles.catTitleRow}>
                            <Text style={styles.catLabel}>{d.name}</Text>
                            <Text style={[styles.catAmt, { color: Colors.red }]}>
                              ${d.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </Text>
                          </View>
                          <Text style={styles.catLimit}>
                            {dt?.label}{d.interestRate > 0 ? ` · ${d.interestRate}% APR` : ''}{d.minimumPayment > 0 ? ` · $${d.minimumPayment}/mo min` : ''}
                          </Text>
                          {d.interestRate > 0 && (
                            <Text style={[styles.catLimit, { color: Colors.red, marginTop: 2 }]}>
                              ~${monthlyInterest.toFixed(0)}/mo in interest
                            </Text>
                          )}
                        </View>
                      </View>
                    </Card>
                  </TouchableOpacity>
                );
              })
          )}

          <TouchableOpacity style={styles.setLimitsBtn} onPress={openAddDebt} activeOpacity={0.8}>
            <Text style={styles.setLimitsBtnText}>+ Add debt account</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: Typography.sizes.xs, color: Colors.textTertiary, textAlign: 'center' }}>
            Tap to edit • Hold to delete
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
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Import tab ───────────────────────────────────────────── */}
      {tab === 'Import' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.base, gap: Spacing.sm }}>
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
                Set a monthly dollar limit per category. Leave blank for no limit. You'll see a progress bar and over-budget warning when you exceed it.
              </Text>
            </TipCard>
            {allCategories.map(({ label, icon, bg }) => (
              <View key={label} style={styles.limitRow}>
                <View style={[styles.catIcon, { backgroundColor: bg }]}>
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
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary, paddingTop: Spacing.sm },

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
