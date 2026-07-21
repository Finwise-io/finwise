import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, FlatList,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { DateField } from '../components/DateField';
import { useStore, RecurringIncome } from '../store/useStore';
import { Button, Card, TipCard, SegmentedControl } from '../components/UI';
import { money2 } from '../domain/_shared/num';
import { Colors, Typography, Spacing, Radii } from '../utils/theme';
import { format, addDays, addMonths } from 'date-fns';

type IncomeFreq = 'hourly' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually';
type Tab = 'list' | 'add' | 'recurring';

const FREQ_OPTIONS: { value: IncomeFreq; label: string; sub: string; icon: string }[] = [
  { value: 'hourly',    label: 'Hourly',         sub: 'Paid by the hour',       icon: '⏱' },
  { value: 'daily',     label: 'Daily',          sub: 'Paid each day',          icon: '☀️' },
  { value: 'weekly',    label: 'Weekly',         sub: 'Every week',             icon: '📅' },
  { value: 'biweekly',  label: 'Every 2 weeks',  sub: 'Bi-weekly paycheck',     icon: '🗓' },
  { value: 'monthly',   label: 'Monthly',        sub: 'Once a month',           icon: '📆' },
  { value: 'quarterly', label: 'Quarterly',      sub: 'Every 3 months',         icon: '📊' },
  { value: 'annually',  label: 'Annually',       sub: 'Once a year / salary',   icon: '🎯' },
];

const LUMP_SOURCES = ['Paycheck', 'Freelance', 'Side gig', 'Bonus', 'Tip', 'Gift', 'Rental income', 'Other'];

export default function IncomeScreen() {
  const router = useRouter();
  const { addIncome, deleteIncome, incomes, hourlyRate, setHourlyRate, recurringIncomes, addRecurringIncome, deleteRecurringIncome, updateRecurringIncome } = useStore() as any;

  const [tab, setTab] = useState<Tab>('list');
  const [editId, setEditId] = useState<string | null>(null);
  const [mode, setMode] = useState<'frequency' | 'lump'>('frequency');
  const [freq, setFreq] = useState<IncomeFreq>('monthly');
  const [amount, setAmount] = useState('');
  const [hours, setHours] = useState('');
  const [rate, setRate] = useState(hourlyRate > 0 ? hourlyRate.toString() : '');
  const [lumpSource, setLumpSource] = useState('Paycheck');
  const [lumpAmount, setLumpAmount] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Recurring form state
  const [recurSource, setRecurSource] = useState('');
  const [recurAmount, setRecurAmount] = useState('');
  const [recurFreq, setRecurFreq] = useState<RecurringIncome['frequency']>('monthly');
  const [recurStart, setRecurStart] = useState(format(new Date(), 'yyyy-MM-dd'));

  function handleAddRecurring() {
    const amt = parseFloat(recurAmount);
    if (!amt || !recurSource.trim()) {
      Alert.alert('Missing info', 'Enter a source name and amount.');
      return;
    }
    addRecurringIncome({
      source: recurSource.trim(),
      amount: amt,
      frequency: recurFreq,
      nextDate: new Date(recurStart + 'T12:00:00').toISOString(),
      active: true,
    });
    setRecurSource(''); setRecurAmount('');
    setRecurStart(format(new Date(), 'yyyy-MM-dd'));
    Alert.alert('Recurring income added!', `$${amt.toFixed(2)} ${recurFreq} from "${recurSource}" will auto-log on each due date.`); // money-mask-ok: transient confirmation echoing the amount the user just entered
  }

  function handleDeleteRecurring(id: string) {
    Alert.alert('Remove recurring income', 'Stop auto-logging this income?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteRecurringIncome(id) },
    ]);
  }

  // Sort incomes newest first
  const sortedIncomes = [...incomes].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const isHourly = freq === 'hourly';
  const hourlyTotal = (parseFloat(hours) || 0) * (parseFloat(rate) || 0);

  function getEnteredAmount(): number {
    if (mode === 'lump') return parseFloat(lumpAmount) || 0;
    if (isHourly) return hourlyTotal;
    return parseFloat(amount) || 0;
  }

  function getMonthlyEquiv(): number {
    const amt = getEnteredAmount();
    const m: Record<IncomeFreq, number> = {
      hourly: 160, daily: 21.7, weekly: 4.33,
      biweekly: 2.17, monthly: 1, quarterly: 1/3, annually: 1/12,
    };
    if (mode === 'lump') return amt;
    return amt * (m[freq] || 1);
  }

  const enteredAmount = getEnteredAmount();
  const monthlyEquiv = getMonthlyEquiv();
  const isValid = enteredAmount > 0;
  const freqLabel = FREQ_OPTIONS.find(f => f.value === freq)?.label || 'payment';

  function handleEdit(entry: any) {
    setEditId(entry.id);
    setAmount(entry.amount?.toString() || '');
    setNotes(entry.notes || '');
    setDate(entry.date ? format(new Date(entry.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    setTab('add');
  }

  function handleDelete(id: string) {
    Alert.alert('Delete income entry', 'Remove this income entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteIncome(id) },
    ]);
  }

  function resetForm() {
    setEditId(null);
    setAmount(''); setHours(''); setLumpAmount(''); setNotes('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
  }

  function handleSave() {
    if (!isValid) { Alert.alert('Enter an amount', 'Please enter the income amount.'); return; }
    setSaving(true);
    if (isHourly && parseFloat(rate) > 0) setHourlyRate(parseFloat(rate));

    // If editing, delete old entry first
    if (editId) deleteIncome(editId);

    const amountToSave = mode === 'lump' || isHourly ? enteredAmount : monthlyEquiv;
    addIncome({
      type: mode === 'lump' ? (lumpSource.toLowerCase().replace(/ /g, '_') as any) : freq,
      amount: amountToSave,
      hours: isHourly ? parseFloat(hours) : undefined,
      rate: isHourly ? parseFloat(rate) : undefined,
      source: mode === 'lump' ? lumpSource : isHourly ? `${hours}h @ $${rate}/hr` : `${freqLabel} income`,
      date: new Date(date + 'T12:00:00').toISOString(),
      notes: notes.trim() || undefined,
    });

    setSaving(false);
    resetForm();
    Alert.alert(
      editId ? 'Income updated! ✓' : 'Income saved! 💵',
      `$${amountToSave.toFixed(2)} logged.${monthlyEquiv !== enteredAmount ? `\n≈ $${monthlyEquiv.toFixed(2)}/month` : ''}`, // money-mask-ok: transient confirmation echoing the amount the user just entered
      [
        { text: 'Add more', style: 'cancel', onPress: () => setTab('add') },
        { text: 'Done', onPress: () => { setTab('list'); } },
      ]
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.root}>
        <SegmentedControl
          options={['My income', 'Add new', 'Recurring']}
          selected={tab === 'list' ? 'My income' : tab === 'add' ? 'Add new' : 'Recurring'}
          onSelect={v => {
            if (v === 'My income') { setTab('list'); resetForm(); }
            else if (v === 'Add new') { setTab('add'); resetForm(); }
            else { setTab('recurring'); }
          }}
        />

        {/* ── LIST TAB ──────────────────────────────────────────── */}
        {tab === 'list' && (
          <FlatList
            data={sortedIncomes}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: Spacing.base, gap: Spacing.xs, paddingBottom: 40 }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>💵</Text>
                <Text style={styles.emptyTitle}>No income entries yet</Text>
                <Text style={styles.emptySub}>Tap "Add new" above to log your first income</Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={() => setTab('add')}>
                  <Text style={styles.emptyBtnText}>+ Add income</Text>
                </TouchableOpacity>
              </View>
            }
            ListHeaderComponent={sortedIncomes.length > 0 ? (
              <Text style={styles.listHint}>Tap an entry to edit • Hold to delete</Text>
            ) : null}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.entryRow}
                onPress={() => handleEdit(item)}
                onLongPress={() => handleDelete(item.id)}
                activeOpacity={0.8}
              >
                <View style={styles.entryIcon}>
                  <Text style={{ fontSize: 20 }}>💵</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.entryLabel}>{(item as any).source || 'Income'}</Text>
                  <Text style={styles.entryDate}>
                    {format(new Date(item.date), 'MMM d, yyyy')}
                    {(item as any).notes ? ` · ${(item as any).notes}` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.entryAmt}>+{money2(item.amount)}</Text>
                  <Text style={styles.entryEdit}>Tap to edit</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}

        {/* ── RECURRING TAB ────────────────────────────────────── */}
        {tab === 'recurring' && (
          <ScrollView automaticallyAdjustKeyboardInsets contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <TipCard color="green">
              <Text style={{ fontSize: Typography.sizes.sm, color: Colors.primaryDeep, lineHeight: 20 }}>
                Set up recurring income (salary, rent, freelance) and it will auto-log each time it's due — no manual entry needed.
              </Text>
            </TipCard>

            {/* Existing recurring list */}
            {(recurringIncomes as RecurringIncome[]).length > 0 && (
              <Card>
                <Text style={styles.cardTitle}>Active recurring income</Text>
                {(recurringIncomes as RecurringIncome[]).map((r) => (
                  <View key={r.id} style={styles.recurRow}>
                    <View style={styles.entryIcon}>
                      <Text style={{ fontSize: 18 }}>🔄</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.entryLabel}>{r.source}</Text>
                      <Text style={styles.entryDate}>
                        {money2(r.amount)} · {r.frequency} · next: {format(new Date(r.nextDate), 'MMM d')}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => updateRecurringIncome(r.id, { active: !r.active })} style={styles.recurToggle}>
                      <Text style={[styles.recurToggleText, { color: r.active ? Colors.primary : Colors.textTertiary }]}>
                        {r.active ? 'Active' : 'Paused'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteRecurring(r.id)} style={{ padding: 8 }}>
                      <Text style={{ fontSize: 16, color: Colors.red }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </Card>
            )}

            {/* Add new recurring */}
            <Card>
              <Text style={styles.cardTitle}>Add recurring income</Text>
              <Text style={styles.inputLabel}>Source / label</Text>
              <TextInput
                style={[styles.input, { marginBottom: Spacing.md }]}
                value={recurSource} onChangeText={setRecurSource}
                placeholder="e.g. Monthly salary, Rent income"
                placeholderTextColor={Colors.textTertiary}
                returnKeyType="next"
              />
              <Text style={styles.inputLabel}>Amount per payment ($)</Text>
              <TextInput
                style={[styles.input, { marginBottom: Spacing.md }]}
                value={recurAmount} onChangeText={setRecurAmount}
                placeholder="0.00"
                keyboardType="decimal-pad"
                placeholderTextColor={Colors.textTertiary}
                returnKeyType="next"
              />
              <Text style={styles.inputLabel}>Frequency</Text>
              <View style={styles.quickRow}>
                {(['weekly', 'biweekly', 'monthly'] as const).map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.quickBtn, { flex: 1, alignItems: 'center' }, recurFreq === f && styles.quickBtnOn]}
                    onPress={() => setRecurFreq(f)}
                  >
                    <Text style={[styles.quickText, recurFreq === f && styles.quickTextOn]}>
                      {f === 'biweekly' ? 'Every 2 wks' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.inputLabel, { marginTop: Spacing.md }]}>First payment date</Text>
              <DateField value={recurStart} onChange={setRecurStart} label="start date" />
            </Card>

            <Button
              label="Add recurring income 🔄"
              onPress={handleAddRecurring}
              disabled={!recurAmount || !recurSource.trim()}
            />
            <View style={{ height: 40 }} />
          </ScrollView>
        )}

        {/* ── ADD/EDIT TAB ─────────────────────────────────────── */}
        {tab === 'add' && (
          <ScrollView automaticallyAdjustKeyboardInsets contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {editId && (
              <View style={styles.editBanner}>
                <Text style={styles.editBannerText}>✏️ Editing existing entry — save to update</Text>
                <TouchableOpacity onPress={() => { resetForm(); setTab('list'); }}>
                  <Text style={styles.editCancel}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}

            <SegmentedControl
              options={['By frequency', 'One-time payment']}
              selected={mode === 'frequency' ? 'By frequency' : 'One-time payment'}
              onSelect={v => setMode(v === 'By frequency' ? 'frequency' : 'lump')}
            />

            {/* FREQUENCY MODE */}
            {mode === 'frequency' && (
              <>
                <Card>
                  <Text style={styles.cardTitle}>How are you paid?</Text>
                  <View style={styles.freqGrid}>
                    {FREQ_OPTIONS.map(opt => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.freqBtn, freq === opt.value && styles.freqBtnOn]}
                        onPress={() => setFreq(opt.value)}
                      >
                        <Text style={styles.freqIcon}>{opt.icon}</Text>
                        <Text style={[styles.freqLabel, freq === opt.value && styles.freqLabelOn]}>{opt.label}</Text>
                        <Text style={[styles.freqSub, freq === opt.value && styles.freqSubOn]} numberOfLines={1}>{opt.sub}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Card>

                {isHourly ? (
                  <Card>
                    <Text style={styles.cardTitle}>Hours worked</Text>
                    <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Hours</Text>
                        <TextInput style={styles.input} value={hours} onChangeText={setHours}
                          placeholder="8" keyboardType="decimal-pad" returnKeyType="next"
                          placeholderTextColor={Colors.textTertiary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Rate ($/hr)</Text>
                        <TextInput style={styles.input} value={rate} onChangeText={setRate}
                          placeholder="25.00" keyboardType="decimal-pad" returnKeyType="done"
                          onSubmitEditing={handleSave}
                          placeholderTextColor={Colors.textTertiary} />
                      </View>
                    </View>
                    <View style={styles.quickRow}>
                      {['4','6','7','8','10','12'].map(h => (
                        <TouchableOpacity key={h} style={[styles.quickBtn, hours===h && styles.quickBtnOn]} onPress={() => setHours(h)}>
                          <Text style={[styles.quickText, hours===h && styles.quickTextOn]}>{h}h</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {hourlyTotal > 0 && (
                      <View style={styles.calcBox}>
                        <Text style={styles.calcLabel}>You earned</Text>
                        <Text style={styles.calcValue}>{money2(hourlyTotal)}</Text>
                      </View>
                    )}
                  </Card>
                ) : (
                  <Card>
                    <Text style={styles.cardTitle}>
                      {freq === 'annually' ? 'Annual salary' : freq === 'quarterly' ? 'Quarterly income'
                        : freq === 'biweekly' ? 'Amount per paycheck' : freq === 'weekly' ? 'Weekly pay'
                        : freq === 'daily' ? 'Daily pay' : 'Monthly take-home pay'}
                    </Text>
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
                    {amount !== '' && freq !== 'monthly' && (
                      <View style={styles.calcBox}>
                        <Text style={styles.calcLabel}>Monthly equivalent</Text>
                        <Text style={styles.calcValue}>{money2(monthlyEquiv)}/month</Text>
                      </View>
                    )}
                  </Card>
                )}
              </>
            )}

            {/* LUMP SUM MODE */}
            {mode === 'lump' && (
              <Card>
                <Text style={styles.cardTitle}>One-time payment</Text>
                <TextInput
                  style={styles.bigInput}
                  value={lumpAmount}
                  onChangeText={setLumpAmount}
                  placeholder="$0.00"
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                  placeholderTextColor={Colors.textTertiary}
                  autoFocus={!editId}
                />
                <Text style={[styles.inputLabel, { marginTop: Spacing.md }]}>Source</Text>
                <View style={styles.sourceGrid}>
                  {LUMP_SOURCES.map(src => (
                    <TouchableOpacity key={src} style={[styles.sourceBtn, lumpSource===src && styles.sourceBtnOn]} onPress={() => setLumpSource(src)}>
                      <Text style={[styles.sourceBtnText, lumpSource===src && styles.sourceBtnTextOn]}>{src}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Card>
            )}

            {/* Date + Notes */}
            <Card>
              <Text style={styles.inputLabel}>Date</Text>
              <DateField value={date} onChange={setDate} label="income date" style={{ marginBottom: Spacing.md }} />
              <Text style={styles.inputLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, { height: 64, textAlignVertical: 'top' }]}
                value={notes} onChangeText={setNotes}
                placeholder="e.g. overtime, bonus..." multiline
                returnKeyType="done" onSubmitEditing={handleSave}
                placeholderTextColor={Colors.textTertiary}
              />
            </Card>

            <Button
              label={editId ? `Update income ✓` : isValid ? `Save $${enteredAmount.toFixed(2)} ✓` : 'Enter amount above'} // money-mask-ok: input-echo of the amount the user is actively typing
              onPress={handleSave}
              loading={saving}
              disabled={!isValid}
            />
            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </View>
    </KeyboardAvoidingView>
  );
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
  entryIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  entryLabel: { fontSize: Typography.sizes.base, fontWeight: '500', color: Colors.textPrimary },
  entryDate: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, marginTop: 1 },
  entryAmt: { fontSize: Typography.sizes.md, fontWeight: '700', color: Colors.primary },
  entryEdit: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  editBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.amberLight, borderRadius: Radii.md, padding: Spacing.sm },
  editBannerText: { fontSize: Typography.sizes.sm, color: Colors.amber, fontWeight: '500' },
  editCancel: { fontSize: Typography.sizes.sm, color: Colors.red, fontWeight: '600' },
  cardTitle: { fontSize: Typography.sizes.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  inputLabel: { fontSize: Typography.sizes.base, fontWeight: '500', color: Colors.textPrimary, marginBottom: 6 },
  input: { backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, borderWidth: 0.5, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 13, fontSize: Typography.sizes.md, color: Colors.textPrimary },
  bigInput: { fontSize: 32, fontWeight: '700', textAlign: 'center', paddingVertical: 16, color: Colors.textPrimary, backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, borderWidth: 0.5, borderColor: Colors.border },
  freqGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  freqBtn: { width: '47%', padding: Spacing.sm, borderRadius: Radii.md, backgroundColor: Colors.bgSecondary, borderWidth: 0.5, borderColor: Colors.border, alignItems: 'center', gap: 3 },
  freqBtnOn: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryMid },
  freqIcon: { fontSize: 22 },
  freqLabel: { fontSize: Typography.sizes.base, color: Colors.textSecondary, fontWeight: '600', textAlign: 'center' },
  freqLabelOn: { color: Colors.primaryDeep, fontWeight: '700' },
  freqSub: { fontSize: 11, color: Colors.textTertiary, textAlign: 'center' },
  freqSubOn: { color: Colors.primaryDark },
  calcBox: { backgroundColor: Colors.primaryLight, borderRadius: Radii.md, padding: Spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm },
  calcLabel: { fontSize: Typography.sizes.sm, color: Colors.primaryDeep },
  calcValue: { fontSize: Typography.sizes.md, fontWeight: '700', color: Colors.primaryDark },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  quickBtn: { paddingVertical: 9, paddingHorizontal: 18, borderRadius: Radii.pill, backgroundColor: Colors.bgSecondary, borderWidth: 0.5, borderColor: Colors.border },
  quickBtnOn: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryMid },
  quickText: { fontSize: Typography.sizes.base, color: Colors.textSecondary, fontWeight: '500' },
  quickTextOn: { color: Colors.primaryDeep },
  recurRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 0.5, borderBottomColor: Colors.border, gap: Spacing.sm },
  recurToggle: { paddingHorizontal: 14, borderRadius: Radii.pill, borderWidth: 0.5, borderColor: Colors.border, minHeight: 44, justifyContent: 'center' },
  recurToggleText: { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.medium },
  sourceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  sourceBtn: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: Radii.pill, backgroundColor: Colors.bgSecondary, borderWidth: 0.5, borderColor: Colors.border },
  sourceBtnOn: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryMid },
  sourceBtnText: { fontSize: Typography.sizes.base, color: Colors.textSecondary, fontWeight: '500' },
  sourceBtnTextOn: { color: Colors.primaryDeep },
});
