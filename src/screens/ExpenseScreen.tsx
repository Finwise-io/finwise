import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, FlatList,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useStore, RecurringExpense } from '../store/useStore';
import { Button, Card, TipCard, ProgressBar, SegmentedControl } from '../components/UI';
import { Colors, Typography, Spacing, Radii } from '../utils/theme';
import { parseReceiptWithOCR } from '../services/receiptOCR';
import { format, addDays, addMonths } from 'date-fns';
import { EXPENSE_CATEGORIES, getCategoryIcon as getCatIcon, useAllCategories } from '../constants/categories';

type Tab = 'list' | 'add' | 'recurring';

export default function ExpenseScreen() {
  const router = useRouter();
  const { addExpense, deleteExpense, expenses, monthlyBudgetTarget, recurringExpenses, addRecurringExpense, deleteRecurringExpense, updateRecurringExpense, customCategories } = useStore() as any;
  const CATEGORIES = useAllCategories(customCategories || []);

  const [tab, setTab] = useState<Tab>('list');
  const [editId, setEditId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  // Recurring form state
  const [recurCategory, setRecurCategory] = useState('Utilities');
  const [recurStore, setRecurStore] = useState('');
  const [recurAmount, setRecurAmount] = useState('');
  const [recurFreq, setRecurFreq] = useState<RecurringExpense['frequency']>('monthly');
  const [recurStart, setRecurStart] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [recurNotes, setRecurNotes] = useState('');

  function handleAddRecurring() {
    const amt = parseFloat(recurAmount);
    if (!amt || !recurStore.trim()) {
      Alert.alert('Missing info', 'Enter a name/store and amount.');
      return;
    }
    let nextDate: Date;
    if (recurFreq === 'monthly') nextDate = addMonths(new Date(recurStart + 'T12:00:00'), 0);
    else nextDate = addDays(new Date(recurStart + 'T12:00:00'), 0);

    addRecurringExpense({
      category: recurCategory,
      store: recurStore.trim(),
      amount: amt,
      frequency: recurFreq,
      nextDate: new Date(recurStart + 'T12:00:00').toISOString(),
      active: true,
      notes: recurNotes.trim() || undefined,
    });
    setRecurStore(''); setRecurAmount(''); setRecurNotes('');
    setRecurStart(format(new Date(), 'yyyy-MM-dd'));
    Alert.alert('Recurring expense added!', `$${amt.toFixed(2)} ${recurFreq} for "${recurStore}" will auto-log on each due date.`);
  }

  function handleDeleteRecurring(id: string) {
    Alert.alert('Remove recurring expense', 'Stop auto-logging this expense?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteRecurringExpense(id) },
    ]);
  }

  function toggleRecurring(id: string, active: boolean) {
    updateRecurringExpense(id, { active });
  }

  // Form state
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Groceries');
  const [store, setStore] = useState('');
  const [dateStr, setDateStr] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [timeStr, setTimeStr] = useState(format(new Date(), 'HH:mm'));
  const [notes, setNotes] = useState('');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const parsedAmount = parseFloat(amount) || 0;
  const isValid = parsedAmount > 0;

  // Sort expenses newest first
  const sortedExpenses = [...expenses].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Category budget check
  const now = new Date();
  const catSpend = expenses
    .filter((e: any) => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && e.category === category;
    })
    .reduce((s: number, e: any) => s + e.amount, 0);
  const catBudget = monthlyBudgetTarget * getCategoryBudgetPct(category);
  const catPct = catBudget > 0 ? ((catSpend + parsedAmount) / catBudget) * 100 : 0;

  function handleEdit(entry: any) {
    setEditId(entry.id);
    setAmount(entry.amount?.toString() || '');
    setCategory(entry.category || 'Groceries');
    setStore(entry.store || '');
    setNotes(entry.notes || '');
    if (entry.date) {
      const d = new Date(entry.date);
      setDateStr(format(d, 'yyyy-MM-dd'));
      setTimeStr(format(d, 'HH:mm'));
    }
    setTab('add');
  }

  function handleDelete(id: string) {
    Alert.alert('Delete expense', 'Remove this expense entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteExpense(id) },
    ]);
  }

  function resetForm() {
    setEditId(null);
    setAmount(''); setStore(''); setNotes(''); setReceiptUri(null);
    setCategory('Groceries');
    setDateStr(format(new Date(), 'yyyy-MM-dd'));
    setTimeStr(format(new Date(), 'HH:mm'));
  }

  async function handleScanReceipt() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Camera needed', 'Allow camera in Settings.'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (result.canceled) return;
    setScanning(true);
    const parsed = await parseReceiptWithOCR(result.assets[0].uri);
    setScanning(false);
    if (parsed?.amount) {
      setAmount(parsed.amount.toFixed(2));
      if (parsed.store) setStore(parsed.store);
      if (parsed.category) setCategory(parsed.category);
      Alert.alert('Receipt scanned!', `Found $${parsed.amount.toFixed(2)}${parsed.store ? ` at ${parsed.store}` : ''}. Check details below.`);
    } else {
      Alert.alert('Could not read receipt', 'Please enter details manually.');
    }
  }

  function handleSave() {
    if (!isValid) { Alert.alert('Enter an amount', 'How much did you spend?'); return; }
    setSaving(true);
    if (editId) deleteExpense(editId);
    const dateTime = new Date(`${dateStr}T${timeStr}:00`);
    addExpense({
      amount: parsedAmount, category,
      store: store.trim(), date: dateTime.toISOString(),
      notes: notes.trim() || undefined,
      receiptUri: receiptUri || undefined,
    });
    setSaving(false);
    resetForm();
    Alert.alert(
      editId ? 'Expense updated! ✓' : 'Expense saved! 🧾',
      `$${parsedAmount.toFixed(2)}${store ? ` at ${store}` : ''} logged.`,
      [
        { text: 'Add another', style: 'cancel', onPress: () => setTab('add') },
        { text: 'Done', onPress: () => setTab('list') },
      ]
    );
  }

  if (scanning) {
    return (
      <View style={styles.scanning}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.scanningText}>Reading receipt...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.root}>
        <SegmentedControl
          options={['My expenses', 'Add new', 'Recurring']}
          selected={tab === 'list' ? 'My expenses' : tab === 'add' ? 'Add new' : 'Recurring'}
          onSelect={v => { setTab(v === 'My expenses' ? 'list' : v === 'Add new' ? 'add' : 'recurring'); if (v !== 'Recurring') resetForm(); }}
        />

        {/* ── LIST TAB ──────────────────────────────────────────── */}
        {tab === 'list' && (
          <FlatList
            data={sortedExpenses}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: Spacing.base, gap: Spacing.xs, paddingBottom: 40 }}
            ListHeaderComponent={sortedExpenses.length > 0 ? (
              <Text style={styles.listHint}>Tap to edit • Hold to delete</Text>
            ) : null}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>🧾</Text>
                <Text style={styles.emptyTitle}>No expenses yet</Text>
                <Text style={styles.emptySub}>Tap "Add new" to log your first expense</Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={() => setTab('add')}>
                  <Text style={styles.emptyBtnText}>+ Add expense</Text>
                </TouchableOpacity>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.entryRow}
                onPress={() => handleEdit(item)}
                onLongPress={() => handleDelete(item.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.entryIcon, { backgroundColor: CATEGORIES.find(c => c.label === (item as any).category)?.bg || Colors.bgSecondary }]}>
                  <Text style={{ fontSize: 20 }}>{getCatIcon((item as any).category)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.entryLabel}>{(item as any).store || (item as any).category}</Text>
                  <Text style={styles.entryDate}>
                    {(item as any).category} · {format(new Date(item.date), 'MMM d, yyyy')}
                    {(item as any).notes ? ` · ${(item as any).notes}` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.entryAmt}>-${(item as any).amount.toFixed(2)}</Text>
                  <Text style={styles.entryEdit}>Tap to edit</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}

        {/* ── ADD/EDIT TAB ─────────────────────────────────────── */}
        {tab === 'add' && (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {editId && (
              <View style={styles.editBanner}>
                <Text style={styles.editBannerText}>✏️ Editing entry — save to update</Text>
                <TouchableOpacity onPress={() => { resetForm(); setTab('list'); }}>
                  <Text style={styles.editCancel}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Scan receipt */}
            {!editId && (
              <TouchableOpacity style={styles.scanBox} onPress={handleScanReceipt} activeOpacity={0.8}>
                <Text style={{ fontSize: 32 }}>📷</Text>
                <Text style={styles.scanTitle}>Scan receipt</Text>
                <Text style={styles.scanHint}>Auto-fill from any receipt photo</Text>
              </TouchableOpacity>
            )}

            {/* Amount */}
            <Card>
              <Text style={styles.inputLabel}>Amount ($)</Text>
              <TextInput
                style={styles.bigInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="$0.00"
                keyboardType="decimal-pad"
                returnKeyType="done"
                onSubmitEditing={handleSave}
                placeholderTextColor={Colors.textTertiary}
                autoFocus={!editId}
              />
            </Card>

            {/* Category */}
            <Card>
              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.catGrid}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.label}
                    style={[styles.catBtn, category === cat.label && styles.catBtnOn]}
                    onPress={() => setCategory(cat.label)}
                  >
                    <View style={[styles.catIcon, { backgroundColor: cat.bg }]}>
                      <Text style={{ fontSize: 20 }}>{cat.icon}</Text>
                    </View>
                    <Text style={[styles.catLabel, category === cat.label && styles.catLabelOn]}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>

            {/* Budget check */}
            {parsedAmount > 0 && catBudget > 0 && (
              <TipCard color={catPct > 100 ? 'red' : 'green'}>
                <Text style={{ fontSize: Typography.sizes.base, fontWeight: '600', color: catPct > 100 ? Colors.red : Colors.primaryDeep, marginBottom: 6 }}>
                  {catPct > 100 ? '⚠️' : '✅'} {category} budget
                </Text>
                <ProgressBar pct={Math.min(catPct, 100)} color={catPct > 100 ? Colors.red : Colors.primary} />
                <Text style={{ fontSize: Typography.sizes.sm, color: catPct > 100 ? Colors.red : Colors.primaryDeep, marginTop: 5 }}>
                  ${(catSpend + parsedAmount).toFixed(0)} of ${catBudget.toFixed(0)} this month
                  {catPct > 100 ? ` — over by $${(catSpend + parsedAmount - catBudget).toFixed(0)}` : ''}
                </Text>
              </TipCard>
            )}

            {/* Store + date/time */}
            <Card>
              <Text style={styles.inputLabel}>Store or place</Text>
              <TextInput
                style={[styles.input, { marginBottom: Spacing.md }]}
                value={store} onChangeText={setStore}
                placeholder="e.g. Walmart, Shell, CVS"
                returnKeyType="next"
                placeholderTextColor={Colors.textTertiary}
                autoCorrect={false}
              />
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Date</Text>
                  <TextInput style={styles.input} value={dateStr} onChangeText={setDateStr}
                    placeholder="YYYY-MM-DD" returnKeyType="next" placeholderTextColor={Colors.textTertiary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Time</Text>
                  <TextInput style={styles.input} value={timeStr} onChangeText={setTimeStr}
                    placeholder="HH:MM" returnKeyType="next" placeholderTextColor={Colors.textTertiary} />
                </View>
              </View>
              <Text style={[styles.inputLabel, { marginTop: Spacing.md }]}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, { height: 64, textAlignVertical: 'top' }]}
                value={notes} onChangeText={setNotes}
                placeholder="e.g. weekly grocery run..."
                multiline returnKeyType="done" onSubmitEditing={handleSave}
                placeholderTextColor={Colors.textTertiary}
              />
            </Card>

            <Button
              label={editId ? 'Update expense ✓' : isValid ? `Save $${parsedAmount.toFixed(2)} ✓` : 'Enter amount above'}
              onPress={handleSave}
              loading={saving}
              disabled={!isValid}
            />
            <View style={{ height: 40 }} />
          </ScrollView>
        )}

        {/* ── RECURRING TAB ─────────────────────────────────────── */}
        {tab === 'recurring' && (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

            {/* Existing recurring expenses */}
            {(recurringExpenses as RecurringExpense[]).length > 0 && (
              <Card>
                <Text style={[styles.inputLabel, { marginTop: 0 }]}>Active recurring expenses</Text>
                {(recurringExpenses as RecurringExpense[]).map((r: RecurringExpense) => (
                  <View key={r.id} style={styles.entryRow}>
                    <View style={[styles.entryIcon, { backgroundColor: CATEGORIES.find(c => c.label === r.category)?.bg || Colors.bgSecondary }]}>
                      <Text style={{ fontSize: 20 }}>{getCatIcon(r.category)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.entryLabel}>{r.store}</Text>
                      <Text style={styles.entryDate}>{r.category} · ${r.amount.toFixed(2)} · {r.frequency}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteRecurring(r.id)} style={{ padding: 8 }}>
                      <Text style={{ color: Colors.red, fontSize: 18 }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </Card>
            )}

            {/* Add new recurring */}
            <Card>
              <Text style={[styles.inputLabel, { marginTop: 0 }]}>Add recurring expense</Text>

              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.catGrid}>
                {CATEGORIES.filter(c => ['Utilities', 'Subscriptions', 'Rent', 'Gas', 'Transit', 'Health', 'Other'].includes(c.label)).map(cat => (
                  <TouchableOpacity key={cat.label}
                    style={[styles.catBtn, recurCategory === cat.label && styles.catBtnOn]}
                    onPress={() => setRecurCategory(cat.label)}>
                    <View style={[styles.catIcon, { backgroundColor: cat.bg }]}>
                      <Text style={{ fontSize: 20 }}>{cat.icon}</Text>
                    </View>
                    <Text style={[styles.catLabel, recurCategory === cat.label && styles.catLabelOn]}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Name / provider</Text>
              <TextInput style={styles.input} value={recurStore} onChangeText={setRecurStore}
                placeholder="e.g. Netflix, PG&E, Rent" placeholderTextColor={Colors.textTertiary} />

              <Text style={styles.inputLabel}>Amount ($)</Text>
              <TextInput style={styles.input} value={recurAmount} onChangeText={setRecurAmount}
                keyboardType="decimal-pad" placeholder="99.99" placeholderTextColor={Colors.textTertiary} />

              <Text style={styles.inputLabel}>Frequency</Text>
              <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm }}>
                {(['weekly', 'biweekly', 'monthly'] as const).map(f => (
                  <TouchableOpacity key={f}
                    style={[styles.catBtn, { flex: 1, width: undefined }, recurFreq === f && styles.catBtnOn]}
                    onPress={() => setRecurFreq(f)}>
                    <Text style={[styles.catLabel, recurFreq === f && styles.catLabelOn]}>
                      {f === 'biweekly' ? 'Bi-weekly' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>First due date</Text>
              <TextInput style={styles.input} value={recurStart} onChangeText={setRecurStart}
                placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textTertiary} />

              <Button label="Add recurring expense" onPress={handleAddRecurring} style={{ marginTop: Spacing.md }} />
            </Card>

            <TipCard color="green">
              <Text style={{ fontSize: Typography.sizes.sm, color: Colors.primaryDeep, lineHeight: 20 }}>
                💡 Recurring expenses auto-log on their due date each time you open the app. Use this for rent, subscriptions, utilities, and any fixed monthly bills.
              </Text>
            </TipCard>
            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function getCategoryBudgetPct(cat: string): number {
  // Keyed to the canonical BUDGET_CATEGORIES labels (#16).
  const p: Record<string, number> = {
    'Rent / Mortgage': 0.30, 'Utilities': 0.10, 'Phone / Internet': 0.03, 'Insurance': 0.05,
    'Subscriptions': 0.03, 'Repairs / maintenance': 0.03, 'Travel / holidays': 0.05, 'Gifts': 0.02,
    'Groceries': 0.17, 'Gas / Transport': 0.06, 'Dining out': 0.08, 'Shopping': 0.05, 'Entertainment': 0.05,
    'Other': 0.02,
  };
  return p[cat] || 0.05;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary, paddingTop: Spacing.sm },
  content: { padding: Spacing.base, gap: Spacing.sm },
  listHint: { fontSize: 11, color: Colors.textTertiary, textAlign: 'center', paddingBottom: 8 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: Typography.sizes.md, fontWeight: '600', color: Colors.textPrimary, marginBottom: 6 },
  emptySub: { fontSize: Typography.sizes.base, color: Colors.textSecondary, textAlign: 'center', marginBottom: 20 },
  emptyBtn: { backgroundColor: Colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: Radii.lg },
  emptyBtnText: { color: '#fff', fontWeight: '600', fontSize: Typography.sizes.base },
  entryRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardBg, borderRadius: Radii.lg, borderWidth: 0.5, borderColor: Colors.border, padding: Spacing.sm, gap: Spacing.sm },
  entryIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  entryLabel: { fontSize: Typography.sizes.base, fontWeight: '500', color: Colors.textPrimary },
  entryDate: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, marginTop: 1 },
  entryAmt: { fontSize: Typography.sizes.md, fontWeight: '700', color: Colors.red },
  entryEdit: { fontSize: 10, color: Colors.textTertiary, marginTop: 2 },
  editBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.amberLight, borderRadius: Radii.md, padding: Spacing.sm },
  editBannerText: { fontSize: Typography.sizes.sm, color: Colors.amber, fontWeight: '500' },
  editCancel: { fontSize: Typography.sizes.sm, color: Colors.red, fontWeight: '600' },
  scanBox: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed', padding: 20, alignItems: 'center', gap: 6 },
  scanTitle: { fontSize: Typography.sizes.md, fontWeight: '600', color: Colors.textPrimary },
  scanHint: { fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  inputLabel: { fontSize: Typography.sizes.base, fontWeight: '500', color: Colors.textPrimary, marginBottom: 8 },
  input: { backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, borderWidth: 0.5, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 13, fontSize: Typography.sizes.md, color: Colors.textPrimary },
  bigInput: { fontSize: 32, fontWeight: '700', textAlign: 'center', paddingVertical: 16, color: Colors.textPrimary, backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, borderWidth: 0.5, borderColor: Colors.border },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  catBtn: { width: '22%', alignItems: 'center', gap: 4, padding: Spacing.sm, borderRadius: Radii.md, borderWidth: 0.5, borderColor: Colors.border, backgroundColor: Colors.bgSecondary },
  catBtnOn: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryMid },
  catIcon: { width: 40, height: 40, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
  catLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500', textAlign: 'center' },
  catLabelOn: { color: Colors.primaryDeep },
  scanning: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, backgroundColor: Colors.bgSecondary },
  scanningText: { fontSize: Typography.sizes.lg, fontWeight: '600', color: Colors.textPrimary },
});
