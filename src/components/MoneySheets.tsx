// Shared money bottom-sheets, extracted from the old HomeScreen so Home and Cash flow reuse ONE
// implementation (FCC M4: one habit, one spot): QuickAddExpense (the '+ Expense' sheet), IncomeSheet,
// AllocateSavings (month-end surplus prompt), DebtPaySheet, plus the ExpenseFab floating button.
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money, money2 } from '../domain/_shared/num';
import { currencySymbol } from '../domain/_shared/money';
import { BUDGET_CATEGORIES, categoryBucketFor } from '../constants/categories';
import { assetKind } from '../domain/assets';
import { requiredPayment } from '../domain/debt';
import { pickReceipt, ocrReceipt, ocrAvailable } from '../services/receiptScan';
import { modalAnimation } from '../hooks/reducedMotion';

const BUCKET_TITLE: Record<string, string> = { fixed: 'Fixed', nonmonthly: 'Non-monthly', flexible: 'Flexible' };
const iso = (d: Date) => d.toISOString().slice(0, 10);
const ordinal = (n: number) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };

// ── shared sheet chrome ────────────────────────────────────────────────────────
// Every sheet gets an explicit ✕ besides the backdrop tap — the visible way out.
function SheetClose({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={onPress}
      style={sh.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <Text style={sh.closeTxt}>✕</Text>
    </TouchableOpacity>
  );
}

// One cell of the even choice grid — icon over a 2-line label, all cells the same width so rows
// never come out ragged. Selection shows a ✓ mark, never color alone (FCC accessibility rule).
function GridChip({ icon, label, on, onPress }: { icon: string; label: string; on: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={label}
      style={[sh.catCell, on && sh.chipOn]} onPress={onPress}>
      <Text style={sh.catIcon}>{icon}</Text>
      <Text style={[sh.catLabel, on && sh.catLabelOn]} numberOfLines={2}>{on ? '✓ ' : ''}{label}</Text>
    </TouchableOpacity>
  );
}

// ── '+ Expense' floating button (M4, decided 2026-07-12): labeled, bottom-right thumb zone,
//    on HOME and CASH FLOW only. Lists on those screens get bottom padding so it never covers a row.
export function ExpenseFab({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={fab.btn} activeOpacity={0.9} onPress={onPress}
      accessibilityRole="button" accessibilityLabel="Add expense" accessibilityHint="Opens the quick add-expense form">
      <Text style={fab.txt}>＋ Expense</Text>
    </TouchableOpacity>
  );
}
const fab = StyleSheet.create({
  btn: { position: 'absolute', right: Spacing.lg, bottom: 24, backgroundColor: Colors.primary, borderRadius: 28, paddingHorizontal: 20, paddingVertical: 14, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  txt: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

// ── quick-add expense sheet (two taps: amount → category → Save; no chooser menu) ─────────────
export function QuickAddExpense({ visible, onClose, customCats, isCurrentMonth, baseDate, monthLabel }: {
  visible: boolean; onClose: () => void; customCats: any[]; isCurrentMonth: boolean; baseDate: Date; monthLabel: string;
}) {
  const store = useStore() as any;
  const [amount, setAmount] = useState('');
  const [cat, setCat] = useState('');           // selected category label, or '__other__'
  const [otherName, setOtherName] = useState('');
  const [merchant, setMerchant] = useState('');
  const [day, setDay] = useState<'today' | 'yesterday'>('today');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  // Categories grouped the way the budget thinks, everyday spending first (the ones you log most),
  // so the list reads in a deliberate order — not the storage order (founder UX review 2026-07-16).
  const catSections: { title: string; items: { label: string; icon: string }[] }[] = [
    { title: 'EVERYDAY', items: BUDGET_CATEGORIES.filter((c) => c.bucket === 'flexible').map((c) => ({ label: c.label, icon: c.icon })) },
    { title: 'ONCE IN A WHILE', items: BUDGET_CATEGORIES.filter((c) => c.bucket === 'nonmonthly').map((c) => ({ label: c.label, icon: c.icon })) },
    { title: 'BILLS & FIXED', items: BUDGET_CATEGORIES.filter((c) => c.bucket === 'fixed').map((c) => ({ label: c.label, icon: c.icon })) },
    { title: 'MORE', items: [...customCats.map((c) => ({ label: c.label, icon: c.icon || '📦' })), { label: '__other__', icon: '📦' }] },
  ];

  const isOther = cat === '__other__';
  const finalCat = isOther ? otherName.trim() : cat;
  const amt = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;
  const ready = amt > 0 && !!finalCat;
  const bucket = finalCat ? BUCKET_TITLE[categoryBucketFor(finalCat, customCats)] : '';

  const reset = () => { setAmount(''); setCat(''); setOtherName(''); setMerchant(''); setDay('today'); setReceiptUri(null); };
  const save = () => {
    if (!ready) return;
    let date: string;
    if (isCurrentMonth) { const d = new Date(); if (day === 'yesterday') d.setDate(d.getDate() - 1); date = iso(d); }
    else date = iso(baseDate);   // logging into a past month → use that month
    store.addExpense?.({ amount: amt, category: finalCat, store: merchant.trim(), date, notes: '', receiptUri: receiptUri ?? undefined });
    reset(); onClose();
  };

  const doScan = async (source: 'camera' | 'library') => {
    try {
      const uri = await pickReceipt(source);
      if (!uri) return;
      setReceiptUri(uri);
      setScanning(true);
      const { amount: a, merchant: m } = await ocrReceipt(uri);
      if (a) setAmount(String(a));
      if (m) setMerchant(m);
      setScanning(false);
      if (!ocrAvailable()) Alert.alert('Receipt attached', 'Enter the amount — automatic scanning turns on after the next app rebuild.');
    } catch {
      setScanning(false);
      Alert.alert('Scanner needs a rebuild', 'Run “npx expo run:ios” once to enable the camera & receipt scanner.');
    }
  };
  const onScan = () => Alert.alert('Scan a receipt', undefined, [
    { text: 'Take photo', onPress: () => doScan('camera') },
    { text: 'Choose from library', onPress: () => doScan('library') },
    { text: 'Cancel', style: 'cancel' },
  ]);

  return (
    <Modal visible={visible} transparent animationType={modalAnimation()} onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableOpacity accessibilityRole="button" style={sh.backdrop} activeOpacity={1} onPress={onClose}>
        <ScrollView style={{ maxHeight: '88%' }} keyboardShouldPersistTaps="handled" onStartShouldSetResponder={() => true}>
          <View style={sh.card}>
            <View style={sh.handle} />
            <SheetClose onPress={() => { reset(); onClose(); }} />
            <Text style={sh.title}>Add expense</Text>

            <TouchableOpacity accessibilityRole="button" style={sh.scanBtn} onPress={onScan} disabled={scanning}>
              <Text style={sh.scanTxt}>{scanning ? 'Scanning…' : receiptUri ? '📎 Receipt attached · rescan' : '📷 Scan a receipt'}</Text>
            </TouchableOpacity>

            <View style={sh.amtRow}>
              <Text style={sh.amtPrefix}>{currencySymbol()}</Text>
              <TextInput style={sh.amtInput} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textTertiary}
                value={amount} onChangeText={setAmount} autoFocus />
            </View>
            <Text style={sh.bucketHint}>{finalCat ? `${finalCat} → ${bucket} budget` : 'Pick a category'}</Text>

            {catSections.map((sec) => (
              <View key={sec.title}>
                <Text style={sh.catHdr}>{sec.title}</Text>
                <View style={sh.catGrid}>
                  {sec.items.map((c) => (
                    <GridChip key={c.label} icon={c.icon} label={c.label === '__other__' ? 'Other' : c.label}
                      on={cat === c.label} onPress={() => setCat(c.label)} />
                  ))}
                </View>
              </View>
            ))}

            {isOther && (
              <TextInput style={sh.input} placeholder="Specify category (e.g. Pet care)" placeholderTextColor={Colors.textTertiary}
                value={otherName} onChangeText={setOtherName} autoFocus />
            )}

            <TextInput style={sh.input} placeholder="Where? (optional)" placeholderTextColor={Colors.textTertiary}
              value={merchant} onChangeText={setMerchant} />

            {/* date — selection carries a ✓ and weight, never tint alone (approved mock 2026-07-16) */}
            {isCurrentMonth ? (
              <View style={sh.dayRow}>
                {(['today', 'yesterday'] as const).map((d) => (
                  <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: day === d }} key={d}
                    style={[sh.dayChip, day === d && sh.chipOn]} onPress={() => setDay(d)}>
                    <Text style={[sh.chipTxt, { textTransform: 'capitalize' }, day === d && sh.chipTxtOn]}>{day === d ? '✓ ' : ''}{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={sh.dateNote}>Adding to {monthLabel}</Text>
            )}

            <TouchableOpacity accessibilityRole="button" style={[sh.save, !ready && { opacity: 0.4 }]} disabled={!ready} onPress={save}>
              {/* show cents when the user typed cents — the button must say exactly what will be saved */}
              <Text style={sh.saveTxt}>Add {amt > 0 ? (amt % 1 ? money2(amt) : money(amt)) : 'expense'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── log a debt payment (amount + date) ────────────────────────────────────────
export function DebtPaySheet({ state, onClose }: { state: { open: boolean; debt?: any }; onClose: () => void }) {
  const store = useStore() as any;
  const d = state.debt;
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState<'today' | 'yesterday'>('today');
  useEffect(() => { if (state.open && d) { setAmount(String(requiredPayment(d))); setDay('today'); } }, [state.open]);
  const amt = parseFloat(String(amount).replace(/[^0-9.]/g, '')) || 0;

  const save = () => {
    if (!d || amt <= 0) return;
    const dt = new Date(); if (day === 'yesterday') dt.setDate(dt.getDate() - 1);
    store.addExpense?.({ amount: amt, category: 'Debt payment', store: d.label, date: iso(dt), notes: '' });
    store.updateLiability?.(d.debt_id, { remaining_balance: Math.max(0, d.remaining_balance - amt) });
    onClose();
  };

  return (
    <Modal visible={state.open} transparent animationType={modalAnimation()} onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableOpacity accessibilityRole="button" style={sh.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={sh.card} onStartShouldSetResponder={() => true}>
          <View style={sh.handle} />
          <SheetClose onPress={onClose} />
          <Text style={sh.title}>Pay {d?.label}</Text>
          <Text style={sh.bucketHint}>{money(d?.remaining_balance ?? 0)} balance · {d?.due_day ? `due ${ordinal(d.due_day)}` : 'no due date'}</Text>
          <View style={sh.amtRow}>
            <Text style={sh.amtPrefix}>{currencySymbol()}</Text>
            <TextInput style={sh.amtInput} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textTertiary} value={amount} onChangeText={setAmount} autoFocus />
          </View>
          <View style={sh.dayRow}>
            {(['today', 'yesterday'] as const).map((dd) => (
              <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: day === dd }} key={dd}
                style={[sh.dayChip, day === dd && sh.chipOn]} onPress={() => setDay(dd)}>
                <Text style={[sh.chipTxt, { textTransform: 'capitalize' }, day === dd && sh.chipTxtOn]}>{day === dd ? '✓ ' : ''}{dd}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity accessibilityRole="button" style={[sh.save, amt <= 0 && { opacity: 0.4 }]} disabled={amt <= 0} onPress={save}>
            <Text style={sh.saveTxt}>Log payment of {money(amt)}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── allocate this month's savings to accounts/instruments ─────────────────────
export function AllocateSavings({ state, onClose }: { state: { open: boolean; ym?: string; label?: string; available?: number; isPrompt?: boolean }; onClose: () => void }) {
  const store = useStore() as any;
  const accounts = (store.assetAccounts ?? []) as any[];
  // B-71: fund GOALS from the same surplus, alongside accounts — active goals only (not yet fully funded)
  const goals = ((store.goals ?? []) as any[]).filter((g) => (g.saved || 0) < (g.target || 0));
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [goalAmts, setGoalAmts] = useState<Record<string, string>>({});
  const [units, setUnits] = useState<Record<string, 'dollar' | 'pct'>>({});
  useEffect(() => { if (state.open) { setAmounts({}); setGoalAmts({}); setUnits({}); } }, [state.open]);

  const available = state.available ?? 0;
  const parse = (v: string) => parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')) || 0;
  const dollarOf = (id: string) => (units[id] === 'pct' ? (parse(amounts[id]) / 100) * available : parse(amounts[id]));
  const goalDollarOf = (id: string) => parse(goalAmts[id]);
  const goalTotal = goals.reduce((t, g) => t + goalDollarOf(g.id), 0);
  const total = accounts.reduce((t, a) => t + dollarOf(a.asset_id), 0) + goalTotal;
  const over = total > available + 0.5;
  const hasTargets = accounts.length > 0 || goals.length > 0;

  const save = () => {
    const items = accounts.map((a) => ({ assetId: a.asset_id, amount: Math.round(dollarOf(a.asset_id) * 100) / 100 })).filter((i) => i.amount > 0);
    const goalItems = goals.map((g) => ({ goalId: g.id, amount: Math.round(goalDollarOf(g.id) * 100) / 100 })).filter((i) => i.amount > 0);
    if (items.length && state.ym) store.allocateSavings?.(state.ym, items);
    if (goalItems.length && state.ym) store.fundGoals?.(state.ym, goalItems);
    onClose();
  };
  const skip = () => { if (state.ym) store.skipAllocPrompt?.(state.ym); onClose(); };

  return (
    <Modal visible={state.open} transparent animationType={modalAnimation()} onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableOpacity accessibilityRole="button" style={sh.backdrop} activeOpacity={1} onPress={onClose}>
        <ScrollView style={{ maxHeight: '88%' }} keyboardShouldPersistTaps="handled" onStartShouldSetResponder={() => true}>
          <View style={sh.card}>
            <View style={sh.handle} />
            <SheetClose onPress={onClose} />
            <Text style={sh.title}>Put your {state.label} surplus to work</Text>
            <Text style={[sh.allocHead, over && { color: Colors.red }]}>{money(Math.max(0, available - total))} of {money(available)} left to assign</Text>

            {goals.length > 0 && <Text style={sh.allocSectionHdr}>GOALS</Text>}
            {goals.map((g) => (
              <View key={g.id} style={sh.allocRow}>
                <Text style={sh.allocIcon}>{g.icon ?? '🎯'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={sh.allocName}>{g.label}</Text>
                  <Text style={sh.allocSub}>{money(g.saved || 0)} of {money(g.target || 0)}</Text>
                </View>
                <TextInput style={sh.allocInput} keyboardType="decimal-pad" placeholder={`${currencySymbol()}0`} placeholderTextColor={Colors.textTertiary}
                  value={goalAmts[g.id] || ''} onChangeText={(t) => setGoalAmts((m) => ({ ...m, [g.id]: t }))}
                  accessibilityLabel={`Amount toward ${g.label}`} />
              </View>
            ))}

            {accounts.length > 0 && goals.length > 0 && <Text style={sh.allocSectionHdr}>ACCOUNTS / INVESTING</Text>}
            {accounts.map((a) => {
              const unit = units[a.asset_id] ?? 'dollar';
              const d = dollarOf(a.asset_id);
              return (
                <View key={a.asset_id} style={sh.allocRow}>
                  <Text style={sh.allocIcon}>{assetKind(a.kind)?.icon ?? '💼'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={sh.allocName}>{a.label}</Text>
                    <Text style={sh.allocSub}>{assetKind(a.kind)?.label ?? a.tax_bucket}{unit === 'pct' && parse(amounts[a.asset_id]) > 0 ? ` · = ${money(d)}` : (a.institution ? ` · ${a.institution}` : '')}</Text>
                  </View>
                  <TextInput style={sh.allocInput} keyboardType="decimal-pad" placeholder={unit === 'pct' ? '0%' : `${currencySymbol()}0`} placeholderTextColor={Colors.textTertiary}
                    value={amounts[a.asset_id] || ''} onChangeText={(t) => setAmounts((m) => ({ ...m, [a.asset_id]: t }))} />
                  <TouchableOpacity accessibilityRole="button" style={sh.unitToggle} onPress={() => setUnits((u) => ({ ...u, [a.asset_id]: unit === 'pct' ? 'dollar' : 'pct' }))}>
                    <Text style={sh.unitToggleTxt}>{unit === 'pct' ? '%' : currencySymbol()}</Text>
                  </TouchableOpacity>
                </View>
              );
            })}

            {!hasTargets && <Text style={sh.dateNote}>Add a goal or an account first, then come back to put your surplus to work.</Text>}
            {hasTargets && (
              <TouchableOpacity accessibilityRole="button" style={[sh.save, (total <= 0 || over) && { opacity: 0.4 }]} disabled={total <= 0 || over} onPress={save}>
                <Text style={sh.saveTxt}>{over ? 'Over available' : `Assign ${money(total)}`}</Text>
              </TouchableOpacity>
            )}
            {state.isPrompt && <TouchableOpacity accessibilityRole="button" onPress={skip}><Text style={sh.remove}>Skip for now</Text></TouchableOpacity>}
          </View>
        </ScrollView>
      </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── income bottom sheet — add a one-off inflow OR edit base pay ────────────────
const FREQS = [{ v: 'hourly', l: 'Hourly' }, { v: 'weekly', l: 'Weekly' }, { v: 'biweekly', l: 'Bi-weekly' }, { v: 'monthly', l: 'Monthly' }];
const INCOME_SOURCES = [
  { label: 'Gift', icon: '🎁' }, { label: 'Bonus', icon: '💰' }, { label: 'Stock sale', icon: '📈' },
  { label: 'Refund', icon: '🧾' }, { label: 'Side gig', icon: '🛠️' }, { label: 'Other', icon: '📦' },
];
export function IncomeSheet({ visible, onClose, op, isCurrentMonth, baseDate, monthLabel }: {
  visible: boolean; onClose: () => void; op: any; isCurrentMonth: boolean; baseDate: Date; monthLabel: string;
}) {
  const store = useStore() as any;
  const router = useRouter();
  const [tab, setTab] = useState<'add' | 'base'>('add');
  // add one-off income
  const [amount, setAmount] = useState('');
  const [src, setSrc] = useState('');
  const [otherSrc, setOtherSrc] = useState('');
  const [day, setDay] = useState<'today' | 'yesterday'>('today');
  // edit base pay
  const [baseAmt, setBaseAmt] = useState('');
  const [mode, setMode] = useState<'gross' | 'takehome'>('gross');
  const [freq, setFreq] = useState('monthly');

  React.useEffect(() => {
    if (!visible) return;
    setTab('add'); setAmount(''); setSrc(''); setOtherSrc(''); setDay('today');
    setBaseAmt(String(op?.baseSalary ?? ''));
    setMode(op?.salaryMode === 'takehome' ? 'takehome' : 'gross');
    setFreq(op?.salaryFreq ?? 'monthly');
  }, [visible]);

  const amt = parseFloat(String(amount).replace(/[^0-9.]/g, '')) || 0;
  const finalSrc = src === 'Other' ? otherSrc.trim() : src;
  const addReady = amt > 0 && !!finalSrc;
  const bAmt = parseFloat(String(baseAmt).replace(/[^0-9.]/g, '')) || 0;

  const saveAdd = () => {
    if (!addReady) return;
    let date: string;
    if (isCurrentMonth) { const d = new Date(); if (day === 'yesterday') d.setDate(d.getDate() - 1); date = iso(d); }
    else date = iso(baseDate);
    store.addIncome?.({ type: 'oneoff', amount: amt, source: finalSrc, date, notes: '' });
    onClose();
  };
  const saveBase = () => {
    store.setOnboardingProfile?.({ ...(op ?? {}), baseSalary: String(bAmt), salaryMode: mode, salaryFreq: freq });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType={modalAnimation()} onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableOpacity accessibilityRole="button" style={sh.backdrop} activeOpacity={1} onPress={onClose}>
        <ScrollView style={{ maxHeight: '88%' }} keyboardShouldPersistTaps="handled" onStartShouldSetResponder={() => true}>
          <View style={sh.card}>
            <View style={sh.handle} />
            <SheetClose onPress={onClose} />
            <View style={sh.tabRow}>
              <TouchableOpacity accessibilityRole="button" style={[sh.tab, tab === 'add' && sh.tabOn]} onPress={() => setTab('add')}><Text style={[sh.tabTxt, tab === 'add' && sh.tabTxtOn]}>Add income</Text></TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" style={[sh.tab, tab === 'base' && sh.tabOn]} onPress={() => setTab('base')}><Text style={[sh.tabTxt, tab === 'base' && sh.tabTxtOn]}>Edit base pay</Text></TouchableOpacity>
            </View>
            <TouchableOpacity accessibilityRole="button" onPress={() => { onClose(); router.push('/income-manager'); }}>
              <Text style={sh.manageLink}>See & edit all your income sources ›</Text>
            </TouchableOpacity>

            {tab === 'add' ? (
              <>
                <Text style={sh.bucketHint}>A one-off for {isCurrentMonth ? 'this month' : monthLabel} — gift, stock sale, refund…</Text>
                <View style={sh.amtRow}>
                  <Text style={sh.amtPrefix}>{currencySymbol()}</Text>
                  <TextInput style={sh.amtInput} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textTertiary} value={amount} onChangeText={setAmount} autoFocus />
                </View>
                <View style={sh.catGrid}>
                  {INCOME_SOURCES.map((c) => (
                    <GridChip key={c.label} icon={c.icon} label={c.label} on={src === c.label} onPress={() => setSrc(c.label)} />
                  ))}
                </View>
                {src === 'Other' && (
                  <TextInput style={sh.input} placeholder="Specify source" placeholderTextColor={Colors.textTertiary} value={otherSrc} onChangeText={setOtherSrc} autoFocus />
                )}
                {isCurrentMonth ? (
                  <View style={sh.dayRow}>
                    {(['today', 'yesterday'] as const).map((d) => (
                      <TouchableOpacity accessibilityRole="button" key={d} style={[sh.dayChip, day === d && sh.chipOn]} onPress={() => setDay(d)}>
                        <Text style={[sh.chipTxt, { textTransform: 'capitalize' }]}>{d}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : <Text style={sh.dateNote}>Adding to {monthLabel}</Text>}
                <TouchableOpacity accessibilityRole="button" style={[sh.save, !addReady && { opacity: 0.4 }]} disabled={!addReady} onPress={saveAdd}>
                  <Text style={sh.saveTxt}>Add {amt > 0 ? money(amt) : 'income'}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={sh.bucketHint}>Your recurring base pay. Bonus, equity & rental live in Setup.</Text>
                {/* P0 fix (design audit MS-1): which mode is selected must read in WORDS + weight,
                    never tint alone — it changes what the salary number means */}
                <View style={sh.toggleRow}>
                  {(['gross', 'takehome'] as const).map((m) => (
                    <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: mode === m }} key={m}
                      style={[sh.seg, mode === m && sh.chipOn]} onPress={() => setMode(m)}>
                      <Text style={[sh.chipTxt, mode === m && sh.chipTxtOn]}>{mode === m ? '✓ ' : ''}{m === 'gross' ? 'Gross' : 'Take-home'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={sh.amtRow}>
                  <Text style={sh.amtPrefix}>{currencySymbol()}</Text>
                  <TextInput style={sh.amtInput} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textTertiary} value={baseAmt} onChangeText={setBaseAmt} />
                </View>
                <View style={sh.freqRow}>
                  {FREQS.map((f) => (
                    <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: freq === f.v }} key={f.v}
                      style={[sh.freqChip, freq === f.v && sh.chipOn]} onPress={() => setFreq(f.v)}>
                      <Text style={[sh.freqTxt, freq === f.v && sh.chipTxtOn]}>{freq === f.v ? '✓ ' : ''}{f.l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity accessibilityRole="button" style={[sh.save, bAmt <= 0 && { opacity: 0.4 }]} disabled={bAmt <= 0} onPress={saveBase}>
                  <Text style={sh.saveTxt}>Save base pay</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const sh = StyleSheet.create({
  // Sheet family type comes from the official ladder only (11/13/15/17/20/44-hero) —
  // approved mock 2026-07-16; selection is always ✓ + weight, never tint alone.
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  card: { backgroundColor: Colors.bgSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: 32 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
  title: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  tabRow: { flexDirection: 'row', backgroundColor: Colors.bgTertiary, borderRadius: Radii.md, padding: 3, marginBottom: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: Radii.sm, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  tabOn: { backgroundColor: Colors.cardBg },
  tabTxt: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  tabTxtOn: { color: Colors.primary, fontWeight: '700' },
  scanBtn: { marginTop: Spacing.md, alignSelf: 'center', paddingHorizontal: 16, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.primary, backgroundColor: Colors.primaryLight, minHeight: 44, justifyContent: 'center' },
  scanTxt: { fontSize: 13, fontWeight: '700', color: Colors.primaryDark },
  amtRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginTop: Spacing.md },
  amtPrefix: { fontSize: 30, fontWeight: '800', color: Colors.textSecondary },
  amtInput: { fontSize: 44, fontWeight: '800', color: Colors.textPrimary, minWidth: 80, textAlign: 'center', paddingHorizontal: 6, paddingVertical: 0, paddingBottom: 2, borderBottomWidth: 2, borderBottomColor: Colors.primary, fontVariant: ['tabular-nums'] },
  bucketHint: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 6, marginBottom: Spacing.sm },
  manageLink: { fontSize: 14, fontWeight: '700', color: Colors.primary, textAlign: 'center', marginTop: 4, paddingVertical: 12, minHeight: 44 },
  // the even choice grid — 3 equal cells per row, packed from the left (no ragged centered rows)
  catHdr: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.7, marginTop: Spacing.md, marginBottom: 6 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  catCell: { width: '31.5%', minHeight: 66, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 4 },
  catIcon: { fontSize: 20 },
  catLabel: { fontSize: 12.5, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center', lineHeight: 15, marginTop: 3 },
  catLabelOn: { fontWeight: '800', color: Colors.primaryDark },
  closeBtn: { position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.bgTertiary, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  closeTxt: { fontSize: 13, fontWeight: '800', color: Colors.textSecondary },
  chipOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipTxtOn: { fontWeight: '800', color: Colors.primaryDark },
  chipTxt: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  input: { backgroundColor: Colors.cardBg, borderRadius: Radii.md, padding: Spacing.md, fontSize: 15, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, marginTop: Spacing.md, minHeight: 48 },
  dayRow: { flexDirection: 'row', gap: 8, marginTop: Spacing.md },
  dayChip: { paddingHorizontal: 18, borderRadius: 22, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg, minHeight: 44, justifyContent: 'center' },
  toggleRow: { flexDirection: 'row', gap: 8, marginTop: Spacing.md, justifyContent: 'center' },
  seg: { flex: 1, borderRadius: Radii.md, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  freqRow: { flexDirection: 'row', gap: 8, marginTop: Spacing.md },
  freqChip: { flex: 1, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  freqTxt: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  dateNote: { fontSize: 13, color: Colors.textSecondary, marginTop: Spacing.md, textAlign: 'center' },
  save: { backgroundColor: Colors.primary, borderRadius: Radii.lg, alignItems: 'center', marginTop: Spacing.md, minHeight: 50, justifyContent: 'center' },
  saveTxt: { color: '#fff', fontSize: 17, fontWeight: '800' },
  remove: { color: Colors.textSecondary, fontWeight: '700', textAlign: 'center', paddingVertical: Spacing.md, fontSize: 15 },
  allocHead: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginTop: 2, marginBottom: Spacing.sm, fontVariant: ['tabular-nums'] },
  allocSectionHdr: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.5, marginTop: Spacing.sm, marginBottom: 2 },
  allocRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border, minHeight: 52 },
  allocIcon: { fontSize: 20, width: 24, textAlign: 'center' },
  allocName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  // the "$2,400 of $5,000" progress line is load-bearing money — 12.5pt secondary, never 11pt (audit MS-2)
  allocSub: { fontSize: 12.5, color: Colors.textSecondary, marginTop: 1, fontVariant: ['tabular-nums'] },
  allocInput: { width: 80, backgroundColor: Colors.cardBg, borderRadius: Radii.sm, paddingHorizontal: 8, paddingVertical: 10, fontSize: 15, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, textAlign: 'right', minHeight: 44 },
  unitToggle: { width: 44, height: 44, borderRadius: Radii.sm, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.cardBg },
  unitToggleTxt: { fontSize: 15, fontWeight: '700', color: Colors.primary },
});
