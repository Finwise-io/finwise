// Cash flow main (FCC detailed design v1.1, Cash flow sheet) — ONE screen, lens-switched:
//   retired → the paycheck told truthfully month by month: the F5 hero, 12 dated bars, the
//             draw-order preview, and the will-it-last strip (mirroring its home in Plan)
//   working → today's real cash flow (in/out/surplus, after debt), the same dated bars, and the
//             future-paycheck PROJECTION card (same F5 function, projection mode, estimate-labeled)
// Every by-month number is an F2/F5 cell — this screen computes NOTHING of its own.
import { inflowLabel, monthOutflow } from '../../MoneyKeel/functions/cashflow/this-month';
import { theMonth } from '../../MoneyKeel/functions/cashflow/the-month';
import { isoLocalDate } from '../domain/_shared/dates';
import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { SectionBand } from '../components/SectionBand';
import { Colors, Typography, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { budgetVsActual } from '../domain/budget';
import { actualDebtPayment } from '../domain/debt';
import { retirementIncomeMonthly, guaranteedOutsideStreams, salaryGrossByMonth, monthlyTaxRates } from '../domain/income';
import { rsuAnnual, rentalNetAnnual } from '../domain/income/onboarding';   // pre-48 A3: canonical source totals
import { taxBucketSplit, withdrawalOrder } from '../domain/decumulation';
import { simulate } from '../domain/retirement';
import { selectWillItLast, willItLastInputs } from '../domain/retirement/willItLast';
import { oddsLine } from '../domain/planning/hub';
import { resolveLens } from '../domain/profile/lens';
import { DrawSteerSheet } from '../components/DrawSteerSheet';
import { buildPaycheckYear } from '../domain/paycheck';
import { resolveNetWorthRows } from '../domain/snapshot';
import { ageFromProfile } from '../utils/persona';
import { PaycheckCard } from '../components/PaycheckCard';
import { QuickAddExpense, ExpenseFab } from '../components/MoneySheets';
import { useCashflowModel } from '../hooks/useCashflowModel';
import { maskedMoney, spokenMoney } from '../components/useMoney';
import BudgetScreen from './BudgetScreen';
import { HeroAmount } from '../components/HeroAmount';
import { EstimateTag, EmptyNote } from '../components/UI';
import { HiddenBalancesBanner } from '../components/HiddenBalancesBanner';
import { modalAnimation } from '../hooks/reducedMotion';
import { DotJoined } from '../components/SepDot';
import { hasMonthlySalaryTable } from '../domain/income/salary-months';
import { earnerWages } from '../domain/income/earners';
import { wageGrossByMonth, salaryAnnual } from '../domain/income';

const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CashFlowScreen() {
  const router = useRouter();
  const store = useStore() as any;
  const op = store.onboardingProfile ?? null;
  const uid = store.user?.uid ?? 'local';
  const expenses = store.expenses ?? [];
  const liabilities = store.liabilities ?? [];
  const [sheet, setSheet] = useState(false);
  const [whyOrder, setWhyOrder] = useState(false);
  const customCats = useMemo(() => (Array.isArray(op?.spendCats) ? op.spendCats : []).filter((c: any) => c?.custom && c?.label), [op]);
  const now = new Date();

  // the ONE model — the same cells the hero card, month rows and month detail read
  const { lens, year, grid } = useCashflowModel();

  const bva = useMemo(() => budgetVsActual(expenses, op, now), [expenses, op]);
  const { accounts } = useMemo(
    () => resolveNetWorthRows(uid, op, store.nwSeeded ?? false, store.assetAccounts ?? [], store.liabilities ?? []),
    [uid, op, store.nwSeeded, store.assetAccounts, store.liabilities]);

  // will-it-last strip mirrors Plan (the one selector — identical seeded run)
  const wil = useMemo(
    () => selectWillItLast({ op, accounts, assumptions: store.retirementAssumptions ?? {}, inflationRate: store.inflationRate, employmentStatus: store.employmentStatus }),
    [op, accounts, store.retirementAssumptions, store.inflationRate, store.employmentStatus]);

  const header = `${MONTHS_LONG[now.getMonth()]} ${now.getFullYear()}`;

  // ── v1.3 CASH FLOW SURFACE (FINAL mock approved 2026-07-19): four tabs, one month switcher ──
  const [surfTab, setSurfTab] = useState<'This month' | 'Income' | 'Expenses' | 'Debts'>('This month');
  const [surfOffset, setSurfOffset] = useState(0);           // 0 = current · negative past · positive future
  const selDate = new Date(now.getFullYear(), now.getMonth() + surfOffset, 1);
  const selYm = `${selDate.getFullYear()}-${String(selDate.getMonth() + 1).padStart(2, '0')}`;
  const selLabel = selDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    + (surfOffset < 0 ? ' — final' : surfOffset > 0 ? ' — planned' : '');
  // the income question is ANSWERED when any source exists (the first-open gate)
  const incomeReady = !!(salaryAnnual(op) > 0 || hasMonthlySalaryTable(op) || op?.seAmount || retirementIncomeMonthly(op) > 0);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bgSecondary }}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
      automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled">
        <HiddenBalancesBanner />
      <View style={styles.headRow}>
        <Text style={styles.h1}>Cash flow</Text>
        <Text style={styles.headDate}>{header}</Text>
      </View>

      {/* the ONE month switcher — steers every tab (approved §C) */}
      <View style={styles.switchRow}>
        <TouchableOpacity accessibilityRole="button" onPress={() => setSurfOffset((m) => m - 1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Previous month"><Text style={styles.switchArrow}>‹</Text></TouchableOpacity>
        <Text style={styles.switchLabel}>{selLabel}</Text>
        <TouchableOpacity accessibilityRole="button" onPress={() => setSurfOffset((m) => Math.min(11, m + 1))} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Next month"><Text style={styles.switchArrow}>›</Text></TouchableOpacity>
        {surfOffset !== 0 && (
          <TouchableOpacity accessibilityRole="button" onPress={() => setSurfOffset(0)} accessibilityLabel="Back to the current month">
            <Text style={styles.switchToday}>today ›</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* the four tabs (approved: This month · Income · Expenses · Debts) */}
      <View style={styles.subTabs}>
        {(['This month', 'Income', 'Expenses', 'Debts'] as const).map((t) => (
          <TouchableOpacity key={t} accessibilityRole="button" style={[styles.subTab, surfTab === t && styles.subTabOn]}
            onPress={() => setSurfTab(t)} accessibilityLabel={`${t} tab${surfTab === t ? ', selected' : ''}`}>
            <Text style={[styles.subTabT, surfTab === t && styles.subTabTOn]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {surfTab === 'This month' && (!incomeReady && lens !== 'retired' ? (
        /* FIRST OPEN (approved): no zeros — the two setup doors */
        <View style={styles.card}>
          <SectionBand inCard inset={16} title="SET UP YOUR MONTH — 2 STEPS" />
          {/* The approved mock (income-v5, 2a) replaces the bottom sheet with a full screen: a sheet
              caps at 88% of the display, and three figures plus a fourteen-month table plus a second
              earner never fitted in one. Founder approval 2026-08-27. */}
          <TouchableOpacity accessibilityRole="button" style={styles.door} onPress={() => router.push('/base-pay')}
            accessibilityLabel="Step 1: set up your income — your base pay, one section per earner">
            <View style={{ flex: 1 }}><Text style={styles.doorT}>1 · Your base pay</Text><Text style={styles.doorSub}>one section per earner — bonus and other income come after</Text></View>
            <Text style={styles.link}>Set up ›</Text>
          </TouchableOpacity>
          <SpendingQuestion op={op} store={store} />
          <Text style={styles.note}>✓ Answers save to your plan — Home, Plan and this screen use the same numbers. No zeros shown until they're real.</Text>
        </View>
      ) : surfOffset === 0 ? (
        lens === 'retired' ? (
          <RetiredMain year={year} accounts={accounts} bva={bva} onWhyOrder={() => { setWhyOrder(true); (useStore.getState() as any).setTransitionCheck?.('drawOrder', true); }} />
        ) : (
          <>
            <WorkingMain grid={grid} bva={bva} op={op} liabilities={liabilities} store={store} />
            <PlanSummaryCard op={op} bva={bva} />
          </>
        )
      ) : (
        <OtherMonthCard offset={surfOffset} ym={selYm} label={selLabel} grid={grid} store={store} onSpending={() => setSurfTab('Expenses')} />
      ))}

      {surfTab === 'Income' && (
        <IncomeTab op={op} store={store} ym={selYm} onSetup={() => router.push('/base-pay')} onSummary={() => router.push('/income-summary')} />
      )}

      {surfTab === 'Expenses' && (
        <SpendingTab grid={grid} offset={surfOffset} expenses={expenses} ym={selYm} bva={bva} monthWord={selDate.toLocaleDateString('en-US', { month: 'long' })} />
      )}

      {surfTab === 'Debts' && (
        <View style={styles.embedWrap}>
          <BudgetScreen embedded initialTab="Debts" />
        </View>
      )}

      {surfTab === 'This month' && (incomeReady || lens === 'retired') && surfOffset === 0 && (<>
      {/* BY MONTH — the dated 12 cells; tap a month for its detail (also a quick-jump for the switcher) */}
      <View style={styles.card}>
        <SectionBand inCard inset={16} title={`BY MONTH · ${grid.cells[0]?.label} – ${grid.cells[11]?.label}`} />
        <MonthBars lens={lens} year={year} grid={grid} onOpen={(slot) => router.push(`/month-detail?slot=${slot}` as any)} />
        <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/bill-calendar')}
          accessibilityLabel="All bills and the calendar">
          <Text style={styles.link}>All bills & the calendar ›</Text>
        </TouchableOpacity>
      </View>

      {/* will-it-last strip — mirrors Plan, never a second computation */}
      <TouchableOpacity accessibilityRole="button" style={styles.card} activeOpacity={0.85} onPress={() => router.push('/(tabs)/plan')}
        accessibilityLabel={wil.chance != null ? `Will my money last: ${wil.chance} percent, an estimate. Lives in your Plan.` : 'See your odds in Plan'}>
        <SectionBand inCard inset={16} title="WILL MY MONEY LAST?" />
        {wil.chance != null
          ? <Text style={styles.wilTxt}>{wil.chance}% <EstimateTag /></Text>
          : <Text style={styles.note}>Answer 3 quick questions in Plan to see your odds</Text>}
        <Text style={styles.link}>Lives in your Plan ›</Text>
      </TouchableOpacity>
      </>)}
    </ScrollView>

    {/* '+ Expense' (M4): same corner, same label as Home — one habit, one spot */}
    <ExpenseFab onPress={() => setSheet(true)} />
    <QuickAddExpense visible={sheet} onClose={() => setSheet(false)} customCats={customCats}
      isCurrentMonth baseDate={now} monthLabel={header} />

    {/* draw-order 'Why?' — the plain-English text already written in withdrawalOrder */}
    <DrawOrderWhy visible={whyOrder} onClose={() => setWhyOrder(false)} accounts={accounts} op={op} />
    </View>
  );
}


// ── v1.3 surface pieces (FINAL mock, approved 2026-07-19) ───────────────────────

/** First-open step 2: the expenses question, answered in place → canonical monthlySpending. */
function SpendingQuestion({ op, store }: { op: any; store: any }) {
  const [v, setV] = useState('');
  const save = () => { if (parseFloat(v) > 0) store.setOnboardingProfile?.({ ...(op ?? {}), monthlySpending: v }); };
  return (
    <View style={styles.door}>
      <View style={{ flex: 1 }}>
        <Text style={styles.doorT}>2 · About what goes out monthly?</Text>
        <Text style={styles.doorSub}>rent, food, bills — roughly</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={styles.doorT}>$</Text>
        <TextInput style={styles.doorInput} keyboardType="decimal-pad" value={v} onChangeText={setV} onEndEditing={save}
          placeholder="—" placeholderTextColor={Colors.textTertiary} accessibilityLabel="Typical monthly expenses" />
      </View>
    </View>
  );
}

/** THIS MONTH extras: the category plan absorbed from the old Budget tab — summary + editor. */
function PlanSummaryCard({ op, bva }: { op: any; bva: any }) {
  const [open, setOpen] = useState(false);
  // the ONE budget function's buckets, in plain words (fixed / once-in-a-while / everyday)
  const BUCKET_WORDS: Record<string, string> = { fixed: 'Bills & fixed', nonmonthly: 'Once in a while', flexible: 'Everyday expenses' };
  const top: { label: string; amount: number }[] = (bva?.buckets ?? [])
    .map((b: any) => ({ label: BUCKET_WORDS[b.key] ?? b.key, amount: Math.round(b.planned || 0) }))
    .filter((b: any) => b.amount > 0);
  const rest = 0;
  return (
    <View style={styles.card}>
      <SectionBand inCard inset={16} title="YOUR BUDGET" />
      {top.length === 0 && <EmptyNote door="expenses" />}   {/* Q48 (MK-CF-M-015) */}
      {top.map((c) => <Row key={c.label} label={c.label} value={maskedMoney(c.amount)} />)}

      <TouchableOpacity accessibilityRole="button" onPress={() => setOpen(true)} accessibilityLabel="Edit your budget — each category, with the live surplus math">
        <Text style={styles.link}>Edit the plan ›</Text>
      </TouchableOpacity>
      <Modal visible={open} animationType={modalAnimation()} onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: Colors.bgSecondary, paddingTop: 54 }}>
          <View style={[styles.headRow, { paddingHorizontal: Spacing.base }]}>
            <Text style={styles.h1}>Your budget</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Done editing the plan" onPress={() => setOpen(false)}>
              <Text style={styles.link}>Done</Text>
            </TouchableOpacity>
          </View>
          <BudgetScreen embedded initialTab="Budget" />
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

/** A PAST month (frozen actuals) or a FUTURE month (the plan, labeled) — approved §C. */
function OtherMonthCard({ offset, ym, label, grid, store, onSpending }: { offset: number; ym: string; label: string; grid: any; store: any; onSpending: () => void }) {
  if (offset > 0) {
    const cell = grid.cells[offset];
    if (!cell) return <View style={styles.card}><Text style={styles.note}>Beyond the 12-month window — see All bills &amp; the calendar for later items.</Text></View>;
    const bigBills = (cell.billItems ?? []).filter((b: any) => (b.amount ?? 0) >= 500);
    return (
      <View style={styles.card}>
        <SectionBand inCard inset={16} title={`${label.toUpperCase()} — THE PLAN (AN ESTIMATE)`} />
        <Row label="Planned inflow" value={maskedMoney(Math.round(cell.inflow))} />
        {(cell.incomeItems ?? []).length === 0 && <EmptyNote door="income" />}   {/* Q48 (MK-CF-M-001) */}
        <Row label={bigBills.length ? `Planned outflow (expenses + debt) · incl. ${bigBills[0].label}` : 'Planned outflow (expenses + debt)'} value={maskedMoney(Math.round(cell.outflow))} dim />
        {(cell.billItems ?? []).filter((b: any) => b.label !== 'Everyday expenses').length === 0 && <EmptyNote door="bills" />}   {/* Q48 (MK-CF-M-002) */}
        <Row label="= Planned surplus" value={maskedMoney(Math.round(cell.net))} strong color={cell.net >= 0 ? Colors.gainText : Colors.red} />
        {cell.net < 0 && <Text style={styles.note}>A tight month you can see coming — the bill calendar feeds this.</Text>}
        <Text style={styles.note}>Every figure is planned — an estimate, never dressed as fact.</Text>
      </View>
    );
  }
  // past: the frozen snapshot when it exists, else the ledger's sums for that month
  const snap = (store.monthlySnapshots ?? {})[ym];
  const incomes = (store.incomes ?? []).filter((i: any) => String(i.date ?? '').startsWith(ym)).reduce((t: number, i: any) => t + (Number(i.amount) || 0), 0);
  const spent = (store.expenses ?? []).filter((e: any) => String(e.date ?? '').startsWith(ym)).reduce((t: number, e: any) => t + (Number(e.amount) || 0), 0);
  const inn = snap ? Math.round(snap.income_net ?? incomes) : Math.round(incomes);
  const out = Math.round(monthOutflow(snap, spent));   // G12: one producer (MoneyKeel/functions/cashflow/this-month.ts), the screen only rounds for display
  return (
    <View style={styles.card}>
      <SectionBand inCard inset={16} title={`${label.toUpperCase()} — WHAT ACTUALLY HAPPENED`} />
      <Row label="Actual inflow" value={maskedMoney(inn)} />
      <Row label="Outflow (expenses + debt)" value={maskedMoney(out)} dim />
      <Row label="= Surplus" value={maskedMoney(inn - out)} strong color={inn - out >= 0 ? Colors.gainText : Colors.red} />
      {!snap && inn === 0 && out === 0 && <Text style={styles.note}>Nothing recorded for this month — it predates your tracking.</Text>}
      <TouchableOpacity accessibilityRole="button" onPress={onSpending} accessibilityLabel="See that month’s activity on the Expenses tab">
        <Text style={styles.link}>That month’s activity ›</Text>
      </TouchableOpacity>
      <Text style={styles.note}>Frozen — past months never change under you.</Text>
    </View>
  );
}

/** INCOME tab: sources + the steady/varies pop-up door + received-this-month + the Teller door. */
function IncomeTab({ op, store, ym, onSetup, onSummary }: { op: any; store: any; ym: string; onSetup: () => void; onSummary: () => void }) {
  const router = useRouter();
  const varies = hasMonthlySalaryTable(op);
  const guaranteed = retirementIncomeMonthly(op);
  const received = (store.incomes ?? []).filter((i: any) => String(i.date ?? '').startsWith(ym));
  const sources: { label: string; sub: string | string[]; amount: string }[] = [];
  // B46 finding 8 ("steady $5,000" vs In $8,600): this row must tell the TRUTH about what's stored —
  // the old code hardcoded 'take-home · monthly' and printed the raw per-period entry, so a salary
  // saved as gross/biweekly showed a number nothing else on the screen could reconcile with. The sub
  // now names the entered form and bridges to the SAME monthly take-home the In line uses.
  // ONE ROW PER EARNER. This showed a single salary however many people earned one, so a household
  // on two wages saw one of them here and the total of both on the In line — two numbers on one
  // screen that could not be reconciled. Founder ruling 2026-08-27 (B32).
  for (const w of earnerWages(op)) {
    if (!Number(w.baseSalary)) continue;
    const mIdx = new Date().getMonth();
    const monthlyNet = Math.round(wageGrossByMonth(w)[mIdx] * (1 - monthlyTaxRates(op)[mIdx]));
    const FREQ_WORD: Record<string, string> = { monthly: 'monthly', biweekly: 'every 2 weeks', weekly: 'weekly', semimonthly: 'twice a month', annual: 'yearly' };
    const unit = FREQ_WORD[String(w.salaryFreq ?? 'monthly')] ?? 'monthly';
    const basis = w.salaryMode === 'takehome' ? 'take-home' : 'before tax';
    const plainMonthlyTakehome = w.salaryMode === 'takehome' && (w.salaryFreq ?? 'monthly') === 'monthly';
    const whose = earnerWages(op).length > 1 ? (w === (op as any) ? 'You' : (op as any)?.partnerName || 'Spouse') : null;
    sources.push({
      label: `${whose ? whose + ' · ' : ''}${varies ? 'Salary — varies' : 'Salary — steady'}`,
      sub: varies ? 'by-month table · tap Set up to adjust'
        : plainMonthlyTakehome ? 'take-home · monthly'
        : [basis, unit, `≈ ${maskedMoney(monthlyNet)}/month take-home`],
      amount: maskedMoney(Math.round(Number(w.baseSalary) || 0)),
    });
  }
  if (op?.seAmount) sources.push({ label: 'Self-employment', sub: op.seFreq === 'monthly' ? 'net · monthly' : 'net · yearly', amount: maskedMoney(Math.round(Number(op.seAmount) || 0)) });
  // pre-48 audit A3 (PRD F2#2): every stored source is VISIBLE here — bonus with its month,
  // equity vesting, rental; invisible income was unexplainable months on the grid
  const MO = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  if (Number(op?.bonusAnnual) > 0) sources.push({ label: 'Bonus', sub: op?.bonusMonth ? `lands in ${MO[(Number(op.bonusMonth) - 1 + 12) % 12]} · tap to edit` : 'month not set — tap to set it', amount: `${maskedMoney(Math.round(Number(op.bonusAnnual)))}/year` });
  const rsuTotal = rsuAnnual(op);
  if (rsuTotal > 0) sources.push({ label: 'Stock vesting (equity)', sub: 'vests through the year · tap to edit', amount: `${maskedMoney(Math.round(rsuTotal))}/year` });
  const rentalTotal = rentalNetAnnual(op);
  if (rentalTotal > 0) sources.push({ label: 'Rental property', sub: 'net · tap to edit', amount: `${maskedMoney(Math.round(rentalTotal / 12))}/month` });
  if (guaranteed > 0) sources.push({ label: 'Social Security · pension', sub: 'guaranteed income', amount: `${maskedMoney(Math.round(guaranteed))}/month` });
  return (
    <>
      <View style={styles.card}>
        <SectionBand inCard inset={16} title="YOUR SOURCES" />
        {sources.length === 0 && <EmptyNote door="income" />}   {/* Q48 */}
        {sources.map((sc) => (
          <View key={sc.label} style={styles.row}>
            <View style={{ flex: 1 }}><Text style={styles.rowL}>{sc.label}</Text>{Array.isArray(sc.sub) ? <DotJoined style={styles.doorSub} parts={sc.sub} /> : <Text style={styles.doorSub}>{sc.sub}</Text>}</View>
            <Text style={styles.rowV}>{sc.amount}</Text>
          </View>
        ))}
        {/* B47 finding 10: ONE add entry, zero explanation — the chooser's labels carry the meaning.
            (Superseded the two-door + two-sentence layout the founder rightly called out.) */}
        <TouchableOpacity accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}
          accessibilityLabel="Add income"
          onPress={() => {
            Alert.alert('Add income', undefined, [
              { text: 'Salary / take-home', onPress: onSetup },
              { text: 'Stock vesting (equity)', onPress: () => router.push('/income-manager?open=equity' as any) },
              { text: 'Rental property', onPress: () => router.push('/income-manager?open=rental' as any) },
              { text: 'Self-employment', onPress: () => router.push('/income-manager?open=self' as any) },
              { text: 'Bonus / one-time', onPress: () => router.push('/income-manager?open=bonus' as any) },
              { text: 'Cancel', style: 'cancel' },
            ]);
          }}>
          <Text style={styles.link}>＋ Add income ›</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.card}>
        <SectionBand inCard inset={16} title={`RECEIVED · ${ym}`} />
        {received.length === 0 && <EmptyNote door="income" />}   {/* Q48 */}
        {received.slice(0, 6).map((i: any) => (
          <Row key={i.id} label={`${String(i.date).slice(5)} · ${i.source || i.type || 'Income'}`} value={`+${maskedMoney(Math.round(Number(i.amount) || 0))}`} color={Colors.gainText} />
        ))}
      </View>
      <View style={styles.card}>
        <SectionBand inCard inset={16} title="COMING SOON" />
        <View style={styles.door}>
          <View style={{ flex: 1 }}><Text style={styles.doorT}>Connect your bank</Text><Text style={styles.doorSub}>paychecks appear on their own</Text></View>
          <Text style={styles.soonPill}>SOON</Text>
        </View>
      </View>
      {/* Your income, all of it — the summary (approved mock income-v5, 5a). Two totals: the take-home,
          and what it is taxed on. It reads the rate set on Your base pay and never asks again. */}
      <TouchableOpacity accessibilityRole="button" style={styles.door} onPress={onSummary}
        accessibilityLabel="Your income, all of it — the take-home and what it is taxed on">
        <View style={{ flex: 1 }}><Text style={styles.doorT}>Your income, all of it</Text>
          <Text style={styles.doorSub}>the take-home, and what it is taxed on</Text></View>
        <Text style={styles.link}>Open ›</Text>
      </TouchableOpacity>

    </>
  );
}


/** EXPENSES tab — the APPROVED mock's presentation (row 40 conformance): big-ticket radar,
 *  the month's recent rows with source chips, categories vs plan, and the two linked doors —
 *  All transactions (the proven browse/search/edit body) and Import a statement. Day one shows
 *  the three honest doors instead of an empty list. */
function SpendingTab({ grid, offset, expenses, ym, bva, monthWord }: { grid: any; offset: number; expenses: any[]; ym: string; bva: any; monthWord: string }) {
  const [allTxns, setAllTxns] = useState(false);
  const [importing, setImporting] = useState(false);
  const monthExp = (expenses ?? []).filter((e: any) => String(e.date ?? '').startsWith(ym))
    .sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)));
  const spent = monthExp.reduce((t: number, e: any) => t + (Number(e.amount) || 0), 0);
  const BUCKET_WORDS: Record<string, string> = { fixed: 'Bills & fixed', nonmonthly: 'Once in a while', flexible: 'Everyday expenses' };
  return (
    <>
      <BigTicketRadar grid={grid} offset={offset} expenses={expenses} ym={ym} />

      {(expenses ?? []).length === 0 ? (
        /* day one — the three doors (approved §A), never an empty list */
        <View style={styles.card}>
          <SectionBand inCard inset={16} title="GET YOUR EXPENSES IN" />
          <View style={styles.door}>
            <View style={{ flex: 1 }}><Text style={styles.doorT}>Connect your bank or card</Text><Text style={styles.doorSub}>every transaction, automatically</Text></View>
            <Text style={styles.soonPill}>SOON</Text>
          </View>
          <TouchableOpacity accessibilityRole="button" style={styles.door} onPress={() => setImporting(true)}
            accessibilityLabel="Import a statement — a CSV from your bank">
            <View style={{ flex: 1 }}><Text style={styles.doorT}>Import a statement</Text><Text style={styles.doorSub}>a CSV from your bank — takes a minute</Text></View>
            <Text style={styles.link}>›</Text>
          </TouchableOpacity>
          <View style={styles.door}>
            {/* ONE DOOR, ONE TERM (founder, 2026-09-14). "Add by hand" is the account door — it adds an
                ACCOUNT, from the one list in constants/doors.ts. This one adds an EXPENSE, so it says so:
                the same words for two different doors is how Home and Net worth came to disagree. */}
            <View style={{ flex: 1 }}><Text style={styles.doorT}>Add an expense by hand</Text><Text style={styles.doorSub}>the ＋ Expense button, any time</Text></View>
          </View>
          <Text style={styles.note}>Everything you add now stays — when your bank connects, nothing is doubled (each entry keeps its source).</Text>
        </View>
      ) : (
        <View style={styles.card}>
          <SectionBand inCard inset={16} title={`${monthWord.toUpperCase()} · ${maskedMoney(Math.round(spent))} SPENT`} />
          {monthExp.length === 0 && <EmptyNote door="expenses" />}   {/* Q48: the band above reads $0 SPENT */}
          {monthExp.slice(0, 6).map((e: any) => (
            <View key={e.id} style={styles.row}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowL} numberOfLines={1}>{String(e.date).slice(5)} · {e.store || e.category}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.doorSub}>{e.category}</Text>
                  <Text style={styles.srcChip}>{e.source === 'import' ? 'imported' : 'by hand'}</Text>
                </View>
              </View>
              <Text style={styles.rowV}>{maskedMoney(Math.round(Number(e.amount) || 0))}</Text>
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: 18 }}>
            <TouchableOpacity accessibilityRole="button" onPress={() => setAllTxns(true)}
              accessibilityLabel="All transactions — browse, search, edit">
              <Text style={styles.link}>All transactions · search ›</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" onPress={() => setImporting(true)}
              accessibilityLabel="Import a statement">
              <Text style={styles.link}>Import a statement ›</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {(bva?.buckets ?? []).some((b: any) => (b.planned || 0) > 0) && (
        <View style={styles.card}>
          <SectionBand inCard inset={16} title="BY CATEGORY VS PLAN" />
          {(bva.buckets as any[]).filter((b) => (b.planned || 0) > 0).map((b) => (
            <Row key={b.key} label={BUCKET_WORDS[b.key] ?? b.key}
              value={`${maskedMoney(Math.round(b.spent || 0))} of ${maskedMoney(Math.round(b.planned || 0))}`}
              color={(b.spent || 0) > (b.planned || 0) ? Colors.amber : undefined} />
          ))}
        </View>
      )}

      {/* the linked doors — the PROVEN bodies, presented full-screen */}
      <Modal visible={allTxns} animationType={modalAnimation()} onRequestClose={() => setAllTxns(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: Colors.bgSecondary, paddingTop: 54 }}>
          <View style={[styles.headRow, { paddingHorizontal: Spacing.base }]}>
            <Text style={styles.h1}>All transactions</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Done with transactions" onPress={() => setAllTxns(false)}>
              <Text style={styles.link}>Done</Text>
            </TouchableOpacity>
          </View>
          <BudgetScreen embedded initialTab="Activity" />
        </KeyboardAvoidingView>
      </Modal>
      <Modal visible={importing} animationType={modalAnimation()} onRequestClose={() => setImporting(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: Colors.bgSecondary, paddingTop: 54 }}>
          <View style={[styles.headRow, { paddingHorizontal: Spacing.base }]}>
            <Text style={styles.h1}>Import a statement</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Done importing" onPress={() => setImporting(false)}>
              <Text style={styles.link}>Done</Text>
            </TouchableOpacity>
          </View>
          <BudgetScreen embedded initialTab="Import" />
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

/** EXPENSES tab header: the big-ticket radar — dated bills due + one-offs far above the usual. */
function BigTicketRadar({ grid, offset, expenses, ym }: { grid: any; offset: number; expenses: any[]; ym: string }) {
  const cell = offset >= 0 ? grid.cells[offset] : null;
  const bills = (cell?.billItems ?? []).filter((b: any) => (b.amount ?? 0) >= 500).slice(0, 3);
  const monthExp = (expenses ?? []).filter((e: any) => String(e.date ?? '').startsWith(ym));
  const byCat: Record<string, number[]> = {};
  (expenses ?? []).forEach((e: any) => { const k = e.category ?? '?'; (byCat[k] = byCat[k] ?? []).push(Number(e.amount) || 0); });
  const usual = (cat: string) => { const v = byCat[cat] ?? []; return v.length ? v.reduce((t, x) => t + x, 0) / v.length : 0; };
  const oneOffs = monthExp.filter((e: any) => (Number(e.amount) || 0) >= Math.max(500, 3 * usual(e.category))).slice(0, 3);
  if (bills.length === 0 && oneOffs.length === 0) {
    // Q48 (MK-CF-M-028): the section stays, at $0, with the one line and the door — never vanishes
    return (
      <View style={styles.card}>
        <SectionBand inCard inset={16} title="BIG-TICKET RADAR" value={maskedMoney(0)} />
        <EmptyNote door="bills" />
      </View>
    );
  }
  return (
    <View style={styles.card}>
      <SectionBand inCard inset={16} title="BIG-TICKET RADAR" />
      {bills.map((b: any, i: number) => (
        <Row key={`b${i}`} label={`${b.label ?? 'Big bill'} · due ${cell.label}`} value={maskedMoney(Math.round(b.amount))} color={Colors.amber} />
      ))}
      {oneOffs.map((e: any) => (
        <Row key={e.id} label={`${String(e.date).slice(5)} · ${e.store || e.category} · well above your usual ${e.category}`} value={maskedMoney(Math.round(Number(e.amount) || 0))} />
      ))}
    </View>
  );
}

// ── retired: hero + draw-order preview ──────────────────────────────────────────
function RetiredMain({ year, accounts, bva, onWhyOrder }: { year: any; accounts: any[]; bva: any; onWhyOrder: () => void }) {
  const router = useRouter();
  const store = useStore() as any;
  const age = ageFromProfile(store.onboardingProfile) ?? 68;
  const split = taxBucketSplit(accounts);
  const order = withdrawalOrder(split, age, store.drawOrder ?? null);   // the saved steer preference applies
  const [steerOpen, setSteerOpen] = useState(false);
  const m0 = year.months[0];
  const safePool = Math.max(0, Math.round(m0?.netSafeToSpend ?? 0));
  const now = new Date();
  const monthPct = Math.round((now.getDate() / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()) * 100);
  const spentPct = safePool > 0 ? Math.round((bva.spent_total / safePool) * 100) : 0;
  return (
    <>
      <PaycheckCard />
      {safePool > 0 && (
        <TouchableOpacity accessibilityRole="button" style={styles.card} activeOpacity={0.85} onPress={() => router.push('/month-detail?slot=0' as any)}
          accessibilityLabel={`Expense pace: ${spokenMoney(Math.round(bva.spent_total))} of ${spokenMoney(safePool)} surplus — ${spentPct} percent spent, ${monthPct} percent of the month gone. Opens this month's detail.`}>
          <View style={styles.paceTrack}>
            <View style={[styles.paceFill, { width: `${Math.min(100, spentPct)}%`, backgroundColor: spentPct > 100 ? Colors.red : spentPct > monthPct + 10 ? Colors.amber : Colors.primary }]} />
            <View style={[styles.paceMark, { left: `${Math.min(99, monthPct)}%` }]} />
          </View>
          {/* P0 (design audit CF-1): the pace card's numbers are its message — money size, never 12pt gray */}
          <Text style={styles.paceLine}>Spent {maskedMoney(Math.round(bva.spent_total))} of {maskedMoney(safePool)} surplus this month</Text>
          <Text style={styles.paceSub}>{spentPct}% spent, {monthPct}% of the month gone ›</Text>
        </TouchableOpacity>
      )}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.cardHdr, { flex: 1, marginBottom: 0 }]}>DRAW COMES FROM</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => setSteerOpen(true)} accessibilityLabel="Steer it — reorder where the draw comes from">
            <Text style={styles.link}>Steer it ›</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" onPress={onWhyOrder} accessibilityLabel="Why this order?" style={{ marginLeft: 12 }}>
            <Text style={styles.link}>Why? ›</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.orderLine}>
          {order.map((s: any, i: number) => `${i + 1} ${s.label}`).join('   ')}
        </Text>
        <Text style={styles.note}>{store.drawOrder ? 'Your order — steered by you. Balances match your Net worth.' : 'The order the math would tap your accounts — not a directive. Balances match your Net worth.'}</Text>
      </View>
      <DrawSteerSheet visible={steerOpen} onClose={() => setSteerOpen(false)} />
    </>
  );
}

// ── working: in/out/surplus + spent-so-far + commitments + the projection card ──
function WorkingMain({ grid, bva, op, liabilities, store }: { grid: any; bva: any; op: any; liabilities: any[]; store: any }) {
  const router = useRouter();
  const cell = grid.cells[0];
  const inflow = cell?.inflow ?? 0;
  const outflow = cell?.outflow ?? 0;
  // B46 finding 7 (founder: "In 8,600 − Out 0 = surplus 9,172. How?"): the card's "=" must be true
  // BY CONSTRUCTION — surplus is In − Out from the SAME month cell. The old code read a second
  // function (monthlySavings, the plan-level capacity concept) whose basis can legitimately differ;
  // printing it behind an equals sign made the app contradict itself on one card.
  const surplus = Math.round(inflow - outflow);
  const debtMo = Math.round(actualDebtPayment(liabilities));
  // ONE DOOR (MK-CF-O-010 theMonth, Q-CF-2), and THE FLOW SPELLED OUT. Until 2026-09-28 this card
  // showed three rows — Inflow, Outflow, = Planned surplus — and hid the rest on Month detail. The
  // approved design (cash-flow_v01, approved 2026-08-26, AFTER the build that shipped the three
  // rows) spells out every row, and his rule under that drawing is "every row shown is a row
  // deducted — nothing appears without being in the sum". His ruling of 2026-09-27 settles which
  // wins: the newer approval is the design.
  const month = useMemo(() => theMonth({
    ym: isoLocalDate(new Date()).slice(0, 7),   // the LOCAL day, never UTC (guard: local_day_not_utc)
    takeHomeMonthly: inflow,
    inflowSources: (cell?.incomeItems ?? []).map((i: any) => i.source),
    debts: liabilities as any,
    // THE SAME BASIS THE SURPLUS USES. Fed bva.planned_total instead, the rows stopped summing to
    // the surplus on screen — $7,200 in, a $0 expenses row, and a $2,700 surplus, which is the one
    // thing the approved design forbids ("every row shown is a row deducted"). The month cell's own
    // bill items ARE the outflow by construction (grid.test: outflow === sum(billItems)), so the
    // spelled-out rows and the total can never disagree.
    plannedExpenses: (cell?.billItems ?? []).filter((b: any) => b.kind === 'bill').reduce((t: number, b: any) => t + (b.amount || 0), 0),
    // the SAME per-category plan the budget card below shows — one budget, read once
    plannedByCategory: (bva?.buckets ?? []).map((b: any) => ({ label: String(b.key), monthly: Math.round(b.planned || 0) })),
    expenses: (store.expenses ?? []) as any,
  }), [inflow, cell, liabilities, bva, store.expenses]);
  const A = store.retirementAssumptions ?? {};

  // Committed from your Plan (F11): adopted commitments visibly reduce free-to-spend
  const commitments = (A.commitments ?? []) as { label: string; monthlyAmount: number }[];
  const committed = commitments.reduce((t, c) => t + (c.monthlyAmount || 0), 0);

  // HIS ONE WORDING FOR THE ODDS (DEC-0104, DEC-0109): *"make sure we are using same language
  // everywhere to convey same message — xx% odds of lasting to age abc."* This screen said
  // "{chance}% odds of lasting" and stopped there, so the one number a person meets on Home, Net
  // worth and Plan as "78% odds of lasting to age 90" read here as a different, shorter claim. The
  // horizon travels with the chance now, and the sentence comes from the one helper.
  const wil = React.useMemo(() => selectWillItLast({
    op, accounts: store.assetAccounts ?? [], assumptions: A,
    inflationRate: store.inflationRate, employmentStatus: store.employmentStatus,
  }), [op, store.assetAccounts, A, store.inflationRate, store.employmentStatus]);
  const wilChance = wil.chance;

  // Future paycheck — PROJECTION (same F5 function, projection mode; estimate label is mandatory copy)
  const projection = React.useMemo(() => {
    const age = ageFromProfile(op);
    const retireAge = A.retireAge ?? (Number(op?.targetRetirementAge) || 67);
    // OUTSIDE money only — Social Security, pension, annuity, other (MK-CF-F-076). The six-source
    // figure (MK-CF-F-075) also carries planned withdrawals and the required withdrawal, and this card
    // prints a 'Draw from savings' line beside it — counting both is the double count founder ruling
    // brief Q-38 (2026-08-20) forbids. Found 2026-09-08 executing second-verification G13.
    const futureGuaranteed = guaranteedOutsideStreams(op).reduce((t, st) => t + st.monthly, 0);
    if (age == null || age >= retireAge) return null;
    const inputs = willItLastInputs({ op, accounts: store.assetAccounts ?? [], assumptions: A, bigCosts: store.bigCosts, inflationRate: store.inflationRate, employmentStatus: store.employmentStatus });
    if (!inputs || inputs.start_balance <= 0) return null;
    const projectedEgg = simulate(inputs).projected_at_retirement;
    if (!projectedEgg || projectedEgg <= 0) return null;
    const projYear = buildPaycheckYear(op, {
      nestEgg: projectedEgg,
      sim: { current_age: retireAge, horizon_age: Math.max(retireAge + 5, inputs.horizon_age), mean_return: inputs.mean_return, vol_return: inputs.vol_return, inflation: inputs.inflation, seed: 42, paths: 1000 },
    });
    return { retireAge, monthly: Math.round(futureGuaranteed + projYear.safeDrawMonthly), guaranteed: Math.round(futureGuaranteed), draw: Math.round(projYear.safeDrawMonthly) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [op, store.assetAccounts, A, store.inflationRate, store.employmentStatus]);

  return (
    <>
      <View style={styles.card}>
        <SectionBand inCard inset={16} title="THIS MONTH" />
        {(() => { const free = committed > 0 ? surplus - committed : surplus; return (
          <>
            <HeroAmount style={[styles.heroNum, { color: free >= 0 ? Colors.gainText : Colors.red }]} accessible
              accessibilityLabel={`${free >= 0 ? '' : 'minus '}${spokenMoney(Math.abs(free))} ${committed > 0 ? 'surplus after your budget' : 'planned surplus'} this month`}>
              {free >= 0 ? '+' : '−'}{maskedMoney(Math.abs(free))}
            </HeroAmount>
            <Text style={styles.heroSub}>{committed > 0 ? 'Surplus after your budget' : 'Planned surplus'}</Text>
          </>
        ); })()}
        <View style={styles.divider} />
        {/* EVERY ROW, as the approved design draws it: the inflow, each debt by name, the budget,
            each big-ticket item — and then the surplus they actually add up to. */}
        {month.planned.lines.map((l, i) => (
          <Row key={`${l.label}-${i}`} label={l.label} value={`${l.amount < 0 ? '−' : ''}${maskedMoney(Math.abs(Math.round(l.amount)))}`}
            dim={l.kind !== 'in'} />
        ))}
        {(cell?.incomeItems ?? []).length === 0 && <EmptyNote door="income" />}   {/* Q48 (MK-CF-M-018) */}
        {(cell?.billItems ?? []).filter((b: any) => b.kind === 'bill' && b.label !== 'Everyday expenses').length === 0 && debtMo === 0 && <EmptyNote door="bills" />}   {/* Q48 (MK-CF-M-019): no bill and no debt entered — the everyday-expenses line is the budget, not a bill */}
        <Row label={committed > 0 ? 'Surplus after your budget' : '= Planned surplus'}
          value={maskedMoney(committed > 0 ? surplus - committed : surplus)} strong
          color={(committed > 0 ? surplus - committed : surplus) >= 0 ? Colors.gainText : Colors.red} />
        {committed > 0 && commitments.map((c, i) => (
          <Row key={i} label={`${c.label} · from your Plan`} value={`−${maskedMoney(c.monthlyAmount)}`} dim />
        ))}
        {(() => {
          const now = new Date();
          const monthPct = Math.round((now.getDate() / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()) * 100);
          const spentPct = bva.planned_total > 0 ? Math.round((bva.spent_total / bva.planned_total) * 100) : 0;
          return (
            <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/month-detail?slot=0' as any)}
              accessibilityLabel={`Expense pace: ${spokenMoney(Math.round(bva.spent_total))} of ${spokenMoney(Math.round(bva.planned_total))} planned — ${spentPct} percent spent, ${monthPct} percent of the month gone. Opens this month's detail.`}>
              <View style={styles.paceTrack}>
                <View style={[styles.paceFill, { width: `${Math.min(100, spentPct)}%`, backgroundColor: spentPct > 100 ? Colors.red : spentPct > monthPct + 10 ? Colors.amber : Colors.primary }]} />
                <View style={[styles.paceMark, { left: `${Math.min(99, monthPct)}%` }]} />
              </View>
              <Text style={styles.paceLine}>Spent {maskedMoney(Math.round(bva.spent_total))} of {maskedMoney(Math.round(bva.planned_total))} planned</Text>
              <Text style={styles.paceSub}>{spentPct}% spent, {monthPct}% of the month gone ›</Text>
            </TouchableOpacity>
          );
        })()}
      </View>

      {projection && (
        <TouchableOpacity accessibilityRole="button" style={styles.projCard} activeOpacity={0.85} onPress={() => router.push('/(tabs)/plan')}
          accessibilityLabel={`Your future paycheck — a projection, an estimate, not a promise. At ${projection.retireAge}: about ${spokenMoney(projection.monthly)} a month.`}>
          <SectionBand inCard inset={16} title="YOUR FUTURE PAYCHECK" />
          <Text style={styles.projTag}>PROJECTION — an estimate, not a promise</Text>
          <Text style={styles.projHero}>At {projection.retireAge}:  ~{maskedMoney(projection.monthly)}/month</Text>
          {projection.guaranteed > 0 && <Row label="Social Security · pension" value={`~${maskedMoney(projection.guaranteed)}`} dim />}
          <Row label="Draw from savings" value={`~${maskedMoney(projection.draw)}`} dim />
          {wilChance != null && <Text style={styles.note}>Based on your plan's {oddsLine(resolveLens(op ?? {}, store.lensOverride), wilChance, wil.horizonAge)} · see Plan ›</Text>}
        </TouchableOpacity>
      )}
    </>
  );
}

// ── the dated 12-month bars (both lenses) ───────────────────────────────────────
function MonthBars({ lens, year, grid, onOpen }: { lens: string; year: any; grid: any; onOpen: (slot: number) => void }) {
  const cells = lens === 'retired'
    ? year.months.map((m: any, s: number) => ({
        label: m.label,
        inflow: m.guaranteedTotal + m.safeDraw,
        outflow: m.billsTotal,
        flag: m.billsTotal > 0
          ? `! ${m.bills[0]?.label ?? 'big bill'} −${maskedMoney(Math.round(m.bills[0]?.amount ?? m.billsTotal))}`
          : (m.guaranteedTotal > year.months[0].guaranteedTotal + 0.005
            ? (() => { const extra = m.guaranteedTotal - year.months[0].guaranteedTotal; return `+ ${m.guaranteed.find((g: any) => g.amount > 0)?.source ?? 'extra income'} +${maskedMoney(Math.round(extra))}`; })()
            : null),
        spoken: `${m.label}: ${Math.round(m.guaranteedTotal + m.safeDraw)} dollars in, ${Math.round(m.billsTotal)} out${m.billsTotal > 0 ? `, ${m.bills[0]?.label} due` : ''}`,
      }))
    : grid.cells.map((c: any) => ({
        label: c.label,
        inflow: c.inflow,
        outflow: c.outflow,
        flag: (() => {
          const bonus = c.incomeItems.find((i: any) => i.source === 'Bonus');
          if (bonus) return `+ Bonus ${maskedMoney(Math.round(bonus.amount))}`;
          return c.net < -0.005 ? '! short month' : null;
        })(),
        spoken: `${c.label}: ${Math.round(c.inflow)} dollars in, ${Math.round(c.outflow)} out${c.net < -0.005 ? ', a short month' : ''}`,
      }));
  const max = Math.max(1, ...cells.map((c: any) => Math.max(c.inflow, c.outflow)));
  return (
    <View>
      {cells.map((c: any, s: number) => (
        <TouchableOpacity accessibilityRole="button" key={c.label} style={styles.barRow} onPress={() => onOpen(s)}
          accessibilityLabel={c.spoken} accessibilityHint="Opens this month's detail">
          <Text style={styles.barLabel}>{c.label}</Text>
          <View style={{ flex: 1 }}>
            <View style={styles.barTrack}><View style={[styles.barIn, { width: `${Math.max(2, (c.inflow / max) * 100)}%` }]} /></View>
            <View style={[styles.barTrack, { marginTop: 2 }]}><View style={[styles.barOut, { width: `${Math.max(2, (c.outflow / max) * 100)}%` }]} /></View>
            {/* P0 (design audit CF-2): the flag is why the chart exists — a full-width readable
                line under the bars, never a 10.5pt truncated gutter caption */}
            {c.flag && <Text style={styles.barFlag}>{c.flag}</Text>}
          </View>
        </TouchableOpacity>
      ))}
      <View style={styles.legendRow}>
        <View style={styles.legend}><View style={[styles.dot, { backgroundColor: Colors.chartIn }]} /><Text style={styles.legendT}>in</Text></View>
        <View style={styles.legend}><View style={[styles.dot, { backgroundColor: Colors.chartOut }]} /><Text style={styles.legendT}>out</Text></View>
        <Text style={styles.legendT}>· tap a month for detail</Text>
      </View>
    </View>
  );
}

// ── the 'Why this order?' explainer (text already written in withdrawalOrder) ──
function DrawOrderWhy({ visible, onClose, accounts, op }: { visible: boolean; onClose: () => void; accounts: any[]; op: any }) {
  const age = ageFromProfile(op) ?? 68;
  const order = withdrawalOrder(taxBucketSplit(accounts), age);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={styles.modalCard}>
          <Text style={styles.modalT}>Why this order?</Text>
          {order.map((s: any, i: number) => (
            <View key={i} style={{ marginBottom: 10 }}>
              <Text style={styles.whyStep}>{i + 1}. {s.label} — {maskedMoney(s.amount ?? 0)}</Text>
              <Text style={styles.whyTxt}>{s.why}</Text>
            </View>
          ))}
          <TouchableOpacity accessibilityRole="button" style={styles.modalBtn} onPress={onClose}>
            <Text style={styles.modalBtnT}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Row({ label, value, dim, strong, color }: { label: string; value: string; dim?: boolean; strong?: boolean; color?: string }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowL, dim && { color: Colors.textSecondary }, strong && { fontWeight: '800' }]}>{label}</Text>
      <Text style={[styles.rowV, strong && { fontWeight: '800' }, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.base, paddingBottom: 110 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 8, minHeight: 44 },
  switchArrow: { fontSize: 20, fontWeight: '800', color: Colors.primary, paddingHorizontal: 6 },
  switchLabel: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  switchToday: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  subTabs: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  subTab: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.border },
  subTabOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  subTabT: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  subTabTOn: { color: Colors.primaryDark, fontWeight: '800' },
  door: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, marginTop: 8 },
  doorT: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  doorSub: { fontSize: 11, color: Colors.textTertiary },
  doorInput: { minWidth: 84, borderBottomWidth: 1.5, borderColor: Colors.borderStrong, fontSize: 17, fontWeight: '800', color: Colors.textPrimary, paddingVertical: 4, fontVariant: ['tabular-nums'] },
  srcChip: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, backgroundColor: Colors.bgTertiary, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' },
  soonPill: { fontSize: 11, fontWeight: '800', color: Colors.primaryDark, backgroundColor: Colors.primaryLight, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  embedWrap: { minHeight: 420, marginHorizontal: -Spacing.base },
  headRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: Spacing.sm },
  h1: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  headDate: { fontSize: Typography.sizes.sm, fontWeight: '700', color: Colors.textSecondary },
  card: { backgroundColor: Colors.white, borderRadius: Radii.lg, padding: Spacing.base, marginBottom: Spacing.base },
  projCard: { backgroundColor: Colors.white, borderRadius: Radii.lg, padding: Spacing.base, marginBottom: Spacing.base, borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed' },
  cardHdr: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  rowL: { fontSize: Typography.sizes.base, color: Colors.textPrimary },
  rowV: { fontSize: Typography.sizes.base, color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 6 },
  heroNum: { fontSize: 38, fontWeight: '800', marginTop: 2 },
  heroSub: { fontSize: 13, color: Colors.textSecondary, fontWeight: '700', marginBottom: 6 },
  paceTrack: { height: 10, borderRadius: 5, backgroundColor: Colors.bgTertiary, marginTop: 10, overflow: 'hidden' },
  paceFill: { height: 10, borderRadius: 5 },
  paceMark: { position: 'absolute', top: -2, width: 2, height: 14, backgroundColor: Colors.textSecondary },
  note: { fontSize: 13, color: Colors.textSecondary, marginTop: 8, lineHeight: 18 },
  // P0 CF-1: the pace numbers lead at 15pt primary; the ratio line supports at 13pt
  paceLine: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginTop: 8, fontVariant: ['tabular-nums'] },
  paceSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, fontVariant: ['tabular-nums'] },
  link: { fontSize: 13, color: Colors.primary, fontWeight: '700', marginTop: 8, paddingVertical: 12 },
  orderLine: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginTop: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingVertical: 4 },
  barLabel: { width: 52, fontSize: 11, fontWeight: '700', color: Colors.textSecondary },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: Colors.bgSecondary, overflow: 'hidden' },
  barIn: { height: 8, borderRadius: 4, backgroundColor: Colors.chartIn },
  barOut: { height: 8, borderRadius: 4, backgroundColor: Colors.chartOut },
  barFlag: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginTop: 3 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  legendT: { fontSize: 13, color: Colors.textSecondary },
  wilTxt: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  wilEst: { fontSize: 13, fontWeight: '500', color: Colors.textTertiary },
  projTag: { fontSize: 11, fontWeight: '800', color: Colors.amber, letterSpacing: 0.4, marginBottom: 4 },
  projHero: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: Spacing.lg },
  modalCard: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, maxHeight: '80%' },
  modalT: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, marginBottom: 10 },
  whyStep: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  whyTxt: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginTop: 2 },
  modalBtn: { alignSelf: 'flex-end', marginTop: 4, padding: 8 },
  modalBtnT: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
});
