// Cash flow main (FCC detailed design v1.1, Cash flow sheet) — ONE screen, lens-switched:
//   retired → the paycheck told truthfully month by month: the F5 hero, 12 dated bars, the
//             draw-order preview, and the will-it-last strip (mirroring its home in Plan)
//   working → THIS MONTH as the approved drawing has it (cash-flow_v01, frames A and B): what is
//             planned and what has actually happened, every row spelled out, each ending in its surplus
// Every number is a door's — this screen computes NOTHING of its own.
import { monthOutflow, type Line as MonthLine } from '../../MoneyKeel/functions/cashflow/this-month';
import { fig, figSaid } from '../components/figure';   // rule 11: a figure prints with its identifier
import { theBudgetCounted } from '../../MoneyKeel/functions/cashflow/budget-counted';
import { theMonth } from '../../MoneyKeel/functions/cashflow/the-month';
import { futurePaycheck } from '../../MoneyKeel/functions/cashflow/future-paycheck';
import { receivedInMonth } from '../../MoneyKeel/functions/cashflow/whats-coming';
import { isoLocalDate } from '../domain/_shared/dates';
import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { SectionBand } from '../components/SectionBand';
import { Colors, Typography, Spacing, Radii } from '../utils/theme';
import { budgetVsActual } from '../domain/budget';
import { retirementIncomeMonthly } from '../domain/income';
import { incomeSummary } from '../../MoneyKeel/functions/cashflow/income-summary';
import { rsuAnnual, rentalNetAnnual } from '../domain/income/onboarding';   // pre-48 A3: canonical source totals
import { taxBucketSplit, withdrawalOrder } from '../domain/decumulation';
import { selectWillItLast } from '../domain/retirement/willItLast';
import { oddsLine } from '../domain/planning/hub';
import { resolveLens } from '../domain/profile/lens';
import { DrawSteerSheet } from '../components/DrawSteerSheet';
import { resolveNetWorthRows } from '../domain/snapshot';
import { ageFromProfile } from '../utils/persona';
import { PaycheckCard } from '../components/PaycheckCard';
import { QuickAddExpense, ExpenseFab } from '../components/MoneySheets';
import { useCashflowModel } from '../hooks/useCashflowModel';
import BudgetScreen from './BudgetScreen';
import { EstimateTag, EmptyNote } from '../components/UI';
import { HiddenBalancesBanner } from '../components/HiddenBalancesBanner';
import { modalAnimation } from '../hooks/reducedMotion';
import { DotJoined } from '../components/SepDot';
import { hasMonthlySalaryTable } from '../domain/income/salary-months';
import { earnerWages } from '../domain/income/earners';
import { salaryAnnual } from '../domain/income';

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

  // the budget as it is counted: a mortgage in Debts is taken from Debts, so the Rent / Mortgage line
  // stands down (his rule, 2026-10-04, DEC-1923) — and the screen says so wherever the plan is shown
  const budget = useMemo(() => theBudgetCounted({ profile: op, accounts: store.assetAccounts ?? [], debts: liabilities }),
    [op, store.assetAccounts, liabilities]);
  const bva = useMemo(() => budgetVsActual(expenses, budget.profile, now), [expenses, budget]);
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
          <WorkingMain grid={grid} bva={bva} op={op} liabilities={liabilities} store={store} budgetSentence={budget.sentence} />
        )
      ) : (
        <OtherMonthCard offset={surfOffset} ym={selYm} label={selLabel} grid={grid} store={store} onSpending={() => setSurfTab('Expenses')} />
      ))}

      {surfTab === 'Income' && (
        <IncomeTab op={op} store={store} ym={selYm} expected={grid.cells[Math.max(0, surfOffset)]?.inflow ?? 0} current={surfOffset === 0}
          monthLabel={selDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          onSetup={() => router.push('/base-pay')} onSummary={() => router.push('/income-summary')} />
      )}

      {surfTab === 'Expenses' && (
        <ExpensesTab ym={selYm} liabilities={liabilities} bva={bva} expenses={expenses} onLog={() => setSheet(true)} budgetSentence={budget.sentence} />
      )}

      {surfTab === 'Debts' && (
        <View style={styles.embedWrap}>
          <BudgetScreen embedded initialTab="Debts" />
        </View>
      )}

      {/* THE WORKING MONTH ENDS WITH ITS TWO CARDS (cash-flow_v01, frames A and B): the twelve bars, the
          will-it-last strip, the budget card and the pace line that used to follow are not in the
          approved drawing (the future-paycheck card is kept — see WorkingMain). What follows is the retired lens, which that drawing
          does not cover and which is unchanged. */}
      {surfTab === 'This month' && lens === 'retired' && surfOffset === 0 && (<>
      {/* BY MONTH — the dated 12 cells; tap a month for its detail (also a quick-jump for the switcher) */}
      <View style={styles.card}>
        <SectionBand inCard inset={16} title={`BY MONTH · ${grid.cells[0]?.label} – ${grid.cells[11]?.label}`} />
        {/* RETIRED 2026-10-02 (his finding): the approved This month (cash-flow_v01, frame 1) draws no door to a
            month's detail or to a bill calendar — it spells every row out itself. The bars stay as the drawing
            has them; nothing opens from them. */}
        <MonthBars lens={lens} year={year} grid={grid} />
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
/** A PAST month (frozen actuals) or a FUTURE month (the plan, labeled) — approved §C. */
function OtherMonthCard({ offset, ym, label, grid, store, onSpending }: { offset: number; ym: string; label: string; grid: any; store: any; onSpending: () => void }) {
  if (offset > 0) {
    const cell = grid.cells[offset];
    if (!cell) return <View style={styles.card}><Text style={styles.note}>Beyond the 12-month window — see All bills &amp; the calendar for later items.</Text></View>;
    const bigBills = (cell.billItems ?? []).filter((b: any) => (b.amount ?? 0) >= 500);
    return (
      <View style={styles.card}>
        <SectionBand inCard inset={16} title={`${label.toUpperCase()} — THE PLAN (AN ESTIMATE)`} />
        <Row label="Planned inflow" value={fig('MK-CF-M-047', Math.round(cell.inflow))} />
        {(cell.incomeItems ?? []).length === 0 && <EmptyNote door="income" />}   {/* Q48 (MK-CF-M-001) */}
        <Row label={bigBills.length ? `Planned outflow (expenses + debt) · incl. ${bigBills[0].label}` : 'Planned outflow (expenses + debt)'} value={fig('MK-CF-M-048', Math.round(cell.outflow))} dim />
        {(cell.billItems ?? []).filter((b: any) => b.label !== 'Everyday expenses').length === 0 && <EmptyNote door="bills" />}   {/* Q48 (MK-CF-M-002) */}
        <Row label="= Planned surplus" value={fig('MK-CF-M-049', Math.round(cell.net))} strong color={cell.net >= 0 ? Colors.gainText : Colors.red} />
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
      <Row label="Actual inflow" value={fig('MK-CF-M-051', inn)} />
      <Row label="Outflow (expenses + debt)" value={fig('MK-CF-M-052', out)} dim />
      <Row label="= Surplus" value={fig('MK-CF-M-053', inn - out)} strong color={inn - out >= 0 ? Colors.gainText : Colors.red} />
      {!snap && inn === 0 && out === 0 && <Text style={styles.note}>Nothing recorded for this month — it predates your tracking.</Text>}
      <TouchableOpacity accessibilityRole="button" onPress={onSpending} accessibilityLabel="See that month’s activity on the Expenses tab">
        <Text style={styles.link}>That month’s activity ›</Text>
      </TouchableOpacity>
      <Text style={styles.note}>Frozen — past months never change under you.</Text>
    </View>
  );
}

/** INCOME tab: sources + the steady/varies pop-up door + received-this-month + the Teller door. */
function IncomeTab({ op, store, ym, expected, current, monthLabel, onSetup, onSummary }: { op: any; store: any; ym: string; expected: number; current: boolean; monthLabel: string; onSetup: () => void; onSummary: () => void }) {
  const router = useRouter();
  const varies = hasMonthlySalaryTable(op);
  const guaranteed = retirementIncomeMonthly(op);
  const received = receivedInMonth(store.incomes, ym);   // MK-CF-M-012, from the door (2026-10-02)
  // each source is a row AND the way to change it — the drawing sets a › on every one (cash-flow_v01,
  // frame 5). The rows used to say "tap to edit" and could not be tapped.
  const sources: { label: string; sub: string | string[]; amount: string; open: () => void }[] = [];
  const manage = (what: string) => () => router.push(`/income-manager?open=${what}` as any);
  // B46 finding 8 ("steady $5,000" vs In $8,600): this row must tell the TRUTH about what's stored —
  // the old code hardcoded 'take-home · monthly' and printed the raw per-period entry, so a salary
  // saved as gross/biweekly showed a number nothing else on the screen could reconcile with. The sub
  // now names the entered form and bridges to the SAME monthly take-home the In line uses.
  // ONE ROW PER EARNER. This showed a single salary however many people earned one, so a household
  // on two wages saw one of them here and the total of both on the In line — two numbers on one
  // screen that could not be reconciled. Founder ruling 2026-08-27 (B32).
  // THE TAKE-HOME ON THIS ROW IS THE ONE THE BASE-PAY CARD SHOWS. It used to be worked here — this
  // month's gross × (1 − the month's rate) — which ignored a take-home the person had typed and their
  // 401(k), so the row and the screen it opens gave two answers (found 2026-10-04). It wears ≈ only
  // when the figure is the app's calculation.
  const payRows = incomeSummary(op).lands.lines.filter((l) => l.estimated != null);
  let earnerAt = -1;
  for (const w of earnerWages(op)) {
    if (!Number(w.baseSalary)) continue;
    earnerAt += 1;
    const monthlyNet = Math.round(payRows[earnerAt]?.amount ?? 0);
    const approx = payRows[earnerAt]?.estimated !== false;
    const FREQ_WORD: Record<string, string> = { monthly: 'monthly', biweekly: 'every 2 weeks', weekly: 'weekly', semimonthly: 'twice a month', annual: 'yearly' };
    const unit = FREQ_WORD[String(w.salaryFreq ?? 'monthly')] ?? 'monthly';
    const basis = w.salaryMode === 'takehome' ? 'take-home' : 'before tax';
    const plainMonthlyTakehome = w.salaryMode === 'takehome' && (w.salaryFreq ?? 'monthly') === 'monthly';
    const whose = earnerWages(op).length > 1 ? (w === (op as any) ? 'You' : (op as any)?.partnerName || 'Spouse') : null;
    sources.push({
      label: `${whose ? whose + ' · ' : ''}${varies ? 'Salary — varies' : 'Salary — steady'}`,
      sub: varies ? 'by-month table'
        : plainMonthlyTakehome ? 'take-home · monthly'
        : [basis, unit, `${approx ? '≈ ' : ''}${fig('MK-CF-M-031', monthlyNet)}/month take-home`],
      amount: fig('MK-CF-M-006', Math.round(Number(w.baseSalary) || 0)),
      open: onSetup,
    });
  }
  if (op?.seAmount) sources.push({ label: 'Self-employment', sub: op.seFreq === 'monthly' ? 'net · monthly' : 'net · yearly', amount: fig('MK-CF-M-007', Math.round(Number(op.seAmount) || 0)), open: manage('self') });
  // pre-48 audit A3 (PRD F2#2): every stored source is VISIBLE here — bonus with its month,
  // equity vesting, rental; invisible income was unexplainable months on the grid
  const MO = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  if (Number(op?.bonusAnnual) > 0) sources.push({ label: 'Bonus', sub: op?.bonusMonth ? `lands in ${MO[(Number(op.bonusMonth) - 1 + 12) % 12]}` : 'month not set', amount: `${fig('MK-CF-M-008', Math.round(Number(op.bonusAnnual)))}/year`, open: manage('bonus') });
  const rsuTotal = rsuAnnual(op);
  if (rsuTotal > 0) sources.push({ label: 'Stock vesting (equity)', sub: 'vests through the year', amount: `${fig('MK-CF-M-009', Math.round(rsuTotal))}/year`, open: manage('equity') });
  const rentalTotal = rentalNetAnnual(op);
  if (rentalTotal > 0) sources.push({ label: 'Rental property', sub: 'net', amount: `${fig('MK-CF-M-010', Math.round(rentalTotal / 12))}/month`, open: manage('rental') });
  if (guaranteed > 0) sources.push({ label: 'Social Security · pension', sub: 'guaranteed income', amount: `${fig('MK-CF-M-011', Math.round(guaranteed))}/month`, open: () => router.push('/monthly-income' as any) });
  const dayWords = (iso: string) => { const [, m, d] = String(iso).slice(0, 10).split('-').map(Number); return `${MON3[(m || 1) - 1]} ${d}`; };
  return (
    <>
      {/* THE MONTH'S EXPECTED TAKE-HOME, first (cash-flow_v01, frame 5) — the figure the sources below add up to */}
      <View style={styles.card}>
        <SectionBand inCard inset={16} title={current ? 'THIS MONTH' : monthLabel.toUpperCase()} />
        <Text style={styles.incomeHero} accessible accessibilityLabel={`${figSaid('MK-CF-M-047', Math.round(expected))}, expected take-home`}>{fig('MK-CF-M-047', Math.round(expected))}</Text>
        <Text style={styles.heroSub}>expected take-home</Text>
      </View>
      <View style={styles.card}>
        <SectionBand inCard inset={16} title="YOUR SOURCES" />
        {sources.length === 0 && <EmptyNote door="income" />}   {/* Q48 */}
        {sources.map((sc) => (
          <TouchableOpacity key={sc.label} accessibilityRole="button" activeOpacity={0.7} style={styles.mRow} onPress={sc.open}
            accessibilityLabel={`${sc.label}, ${Array.isArray(sc.sub) ? sc.sub.join(', ') : sc.sub}, ${sc.amount}. Opens it to change.`}>
            <View style={{ flex: 1 }}><Text style={styles.rowL}>{sc.label}</Text>{Array.isArray(sc.sub) ? <DotJoined style={styles.doorSub} parts={sc.sub} /> : <Text style={styles.doorSub}>{sc.sub}</Text>}</View>
            <Text style={styles.rowV}>{sc.amount} ›</Text>
          </TouchableOpacity>
        ))}
        {/* ONE way to add, in the one wording every screen uses for it (constants/doors.ts). The
            chooser's labels carry the meaning (B47 finding 10). */}
        <TouchableOpacity accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}
          accessibilityLabel="Add your income"
          onPress={() => {
            Alert.alert('Add your income', undefined, [
              { text: 'Salary / take-home', onPress: onSetup },
              { text: 'Stock vesting (equity)', onPress: manage('equity') },
              { text: 'Rental property', onPress: manage('rental') },
              { text: 'Self-employment', onPress: manage('self') },
              { text: 'Bonus / one-time', onPress: manage('bonus') },
              { text: 'Cancel', style: 'cancel' },
            ]);
          }}>
          <Text style={styles.link}>Add your income ›</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.card}>
        <SectionBand inCard inset={16} title={current ? 'RECEIVED THIS MONTH' : `RECEIVED · ${monthLabel.toUpperCase()}`} />
        {received.length === 0 && <Text style={styles.emptyP}>Nothing received yet this month.</Text>}
        {received.slice(0, 6).map((i: any) => (
          <Row key={i.id} label={`${dayWords(i.date)} · ${i.source || i.type || 'Income'}`} value={`+${fig('MK-CF-M-012', Math.round(Number(i.amount) || 0))}`} color={Colors.gainText} />
        ))}
      </View>
      {/* Your income, all of it — the summary (approved mock income-end-to-end, frames 16 and 17). Not
          on the tab's own drawing; kept, because it is the only way in to an approved screen. */}
      <TouchableOpacity accessibilityRole="button" style={styles.door} onPress={onSummary}
        accessibilityLabel="Your income, all of it — the take-home and what it is taxed on">
        <View style={{ flex: 1 }}><Text style={styles.doorT}>Your income, all of it</Text>
          <Text style={styles.doorSub}>the take-home, and what it is taxed on</Text></View>
        <Text style={styles.link}>Open ›</Text>
      </TouchableOpacity>
    </>
  );
}

/** EXPENSES tab — as cash-flow_v01 draws it (frames C and D): what repeats every month · what is
 *  planned · what was actually spent, by where it came from · and the big-ticket radar. Every figure is
 *  MK-CF-O-010 theMonth's; the screen prints. Every section keeps its heading when empty, "so the shape
 *  of the screen never changes — only what is in it". */
const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const BUCKET_WORDS: Record<string, string> = { fixed: 'Bills & fixed', nonmonthly: 'Once in a while', flexible: 'Everyday expenses' };
function ExpensesTab({ ym, liabilities, bva, expenses, onLog, budgetSentence }: { ym: string; liabilities: any[]; bva: any; expenses: any[]; onLog: () => void; budgetSentence?: string }) {
  const [allTxns, setAllTxns] = useState(false);
  const [importing, setImporting] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const x = useMemo(() => theMonth({
    ym, takeHomeMonthly: 0, debts: liabilities as any, plannedExpenses: Math.round(bva?.planned_total || 0),
    // the budget's own categories, in plain words — the same plan This month reads
    plannedByCategory: (bva?.buckets ?? []).filter((b: any) => (b.planned || 0) > 0)
      .map((b: any) => ({ label: BUCKET_WORDS[String(b.key)] ?? String(b.key), monthly: Math.round(b.planned || 0) })),
    expenses: expenses as any,
  }).expenses, [ym, liabilities, bva, expenses]);
  const day = (iso: string) => { const [, m, d] = String(iso).slice(0, 10).split('-').map(Number); return `${d} ${MON3[(m || 1) - 1]}`; };
  const every = x.recurringDebt.map((r) => r.label.toLowerCase());
  /** One list of what was spent: the five most recent, the way to the rest, and its closing total. */
  const list = (l: typeof x.byHand, closing: string, how: (e: any) => string) => (
    <>
      {l.shown.map((e: any, i: number) => (
        <View key={`${e.id ?? i}`} style={styles.mRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowL}>{day(e.date)} · {e.store || e.category}</Text>
            <Text style={styles.mSub}>{how(e)}</Text>
          </View>
          <Text style={[styles.rowV, { fontWeight: '800' }]}>{fig('MK-CF-M-014', Number(e.amount) || 0)}</Text>
        </View>
      ))}
      {l.hidden > 0 && (
        /* FIVE, THEN THE REST ON A TAP (rule 7 under the drawing). The rest opens in the full list,
           where a row can also be searched, corrected or removed. */
        <TouchableOpacity accessibilityRole="button" onPress={() => setAllTxns(true)} accessibilityLabel={`Show all ${l.items.length} — ${figSaid('MK-CF-M-004', Math.round(l.hiddenTotal))} more`}>
          <Text style={styles.link}>Show all {l.items.length} · {fig('MK-CF-M-004', Math.round(l.hiddenTotal))} more ›</Text>
        </TouchableOpacity>
      )}
      <View style={[styles.mRow, styles.mTotal]}>
        <Text style={[styles.rowL, { fontWeight: '800' }]}>= {closing}</Text>
        <Text style={[styles.rowV, { fontWeight: '800' }]}>{fig('MK-CF-M-004', Math.round(l.total))}</Text>
      </View>
    </>
  );
  const anySpent = x.actual.items.length > 0 || x.debtCountedAsExpense.length > 0;

  return (
    <>
      <View style={styles.card}>
        <SectionBand inCard inset={16} title="MONTHLY RECURRING EXPENSES" value={fig('MK-CF-M-004', Math.round(x.recurringDebtTotal))} />
        {x.recurringDebt.map((r) => (
          <View key={r.label} style={styles.mRow}>
            <View style={{ flex: 1 }}><Text style={styles.rowL}>{r.label}</Text><Text style={styles.mSub}>same every month</Text></View>
            <Text style={[styles.rowV, { fontWeight: '800' }]}>{fig('MK-CF-M-004', Math.round(r.monthly))}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <SectionBand inCard inset={16} title="PLANNED EXPENSES" value={x.plannedTotal > 0 ? fig('MK-CF-M-001', Math.round(x.plannedTotal)) : '—'} />
        {!!budgetSentence && <Text style={[styles.note, { paddingHorizontal: 16 }]}>{budgetSentence}</Text>}
        {x.plannedTotal > 0 ? (
          <TouchableOpacity accessibilityRole="button" activeOpacity={0.7} onPress={() => setBudgetOpen(true)} accessibilityLabel="Planned expenses, by category. Opens your budget.">
            {x.planned.map((c) => (
              <View key={c.label} style={styles.mRow}>
                <Text style={styles.rowL}>{c.label}</Text>
                <Text style={[styles.rowV, { fontWeight: '800' }]}>{fig('MK-CF-M-015', c.monthly)}</Text>
              </View>
            ))}
            <View style={[styles.mRow, styles.mTotal]}>
              <Text style={[styles.rowL, { fontWeight: '800' }]}>= Total</Text>
              <Text style={[styles.rowV, { fontWeight: '800' }]}>{fig('MK-CF-M-001', Math.round(x.plannedTotal))}</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <>
            <Text style={styles.emptyP}>You haven’t set your budget yet. This is what every “of $X planned” on any screen is measured against.</Text>
            <TouchableOpacity accessibilityRole="button" style={styles.cta} onPress={() => setBudgetOpen(true)} accessibilityLabel="Set your budget">
              <Text style={styles.ctaT}>Set your budget</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ACTUAL EXPENSES, by where each came from — one card a source, as the drawing sets them, and the
          all-sources total closing the last of them */}
      <View style={[styles.card, anySpent && styles.cardBandOnly]}>
        <SectionBand inCard inset={16} title="ACTUAL EXPENSES" value={fig('MK-CF-M-013', Math.round(x.actualTotal))} />
        {!anySpent && (
          <>
            <Text style={styles.emptyP}>Nothing logged this month. Connect a card and purchases arrive on their own, or add a receipt by hand.</Text>
            <TouchableOpacity accessibilityRole="button" style={styles.cta} onPress={onLog} accessibilityLabel="Log an expense">
              <Text style={styles.ctaT}>Log an expense</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
      {(() => {
        const allSources = (
          <View style={[styles.mRow, styles.mTotal]}>
            <Text style={[styles.rowL, { fontWeight: '800' }]}>= Actual expenses, all sources</Text>
            <Text style={[styles.rowV, { fontWeight: '800' }]}>{fig('MK-CF-M-013', Math.round(x.actualTotal))}</Text>
          </View>
        );
        const last = x.debtCountedAsExpense.length > 0 ? 'debt' : x.imported.items.length > 0 ? 'imported' : 'hand';
        return (
          <>
            {x.byHand.items.length > 0 && (
              <View style={styles.card}>
                <SectionBand light inCard inset={16} title="ENTERED BY HAND" value={fig('MK-CF-M-004', Math.round(x.byHand.total))} />
                {list(x.byHand, `Entered by hand · ${x.byHand.items.length} item${x.byHand.items.length === 1 ? '' : 's'}`,
                  (e) => `${e.category} · ${e.receiptUri ? 'receipt' : 'typed'}`)}
                {last === 'hand' && allSources}
              </View>
            )}
            {x.imported.items.length > 0 && (
              <View style={styles.card}>
                <SectionBand light inCard inset={16} title="IMPORTED FROM YOUR CARD" value={fig('MK-CF-M-004', Math.round(x.imported.total))} />
                {list(x.imported, `Imported · ${x.imported.items.length} purchase${x.imported.items.length === 1 ? '' : 's'}`, (e) => String(e.category))}
                {last === 'imported' && allSources}
              </View>
            )}
            {x.debtCountedAsExpense.length > 0 && (
              <View style={styles.card}>
                <SectionBand light inCard inset={16} title="DEBT PAYMENTS COUNTED AS EXPENSES" value={fig('MK-CF-M-004', Math.round(x.debtCountedAsExpense.reduce((t, d) => t + d.amount, 0)))} />
                {x.debtCountedAsExpense.map((d) => (
                  <View key={d.label} style={styles.mRow}>
                    <View style={{ flex: 1 }}><Text style={styles.rowL}>{d.label}</Text><Text style={styles.mSub}>entered on the Debts tab</Text></View>
                    <Text style={[styles.rowV, { fontWeight: '800' }]}>{fig('MK-CF-M-004', Math.round(d.amount))}</Text>
                  </View>
                ))}
                {allSources}
              </View>
            )}
          </>
        );
      })()}

      {/* THE RADAR NEVER DEDUCTS (rule 5): a lens on rows already counted, each saying whether it is */}
      <View style={styles.card}>
        <SectionBand light inCard inset={16} title="BIG-TICKET RADAR" />
        {x.radar.length === 0 ? (
          <Text style={styles.emptyP}>Nothing unusual. Regular debt payments never appear here — only a card or HELOC payment, or a bill well above its usual size.</Text>
        ) : (
          <>
            {x.radar.map((r, i) => (
              <View key={`${r.label}-${i}`} style={styles.mRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.mNameRow}>
                    <Text style={styles.rowL}>{r.label}</Text>
                    {r.reason !== 'big-bill' && <Text style={styles.mTag}>debt</Text>}
                  </View>
                  <Text style={styles.mSub}>{r.note}</Text>
                </View>
                <Text style={[styles.rowV, r.countedAsExpense ? { fontWeight: '800' } : { color: Colors.textSecondary }]}>{fig('MK-CF-M-016', Math.round(r.amount))}</Text>
              </View>
            ))}
            {every.length > 0 && (
              <Text style={styles.emptyP}>Your {every.join(' and ')} never appear here. They are the same every month, and a warning you see every month stops being a warning.</Text>
            )}
          </>
        )}
        {/* the one way anything arrives "imported" today: a statement file. Not on the drawing — kept, or
            the Imported list above could never fill. */}
        <TouchableOpacity accessibilityRole="button" onPress={() => setImporting(true)} accessibilityLabel="Import a statement — a CSV from your bank">
          <Text style={styles.link}>Import a statement ›</Text>
        </TouchableOpacity>
      </View>

      <BudgetEditor open={budgetOpen} onClose={() => setBudgetOpen(false)} />
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
        <View style={styles.card} accessible
          accessibilityLabel={`Expense pace: ${figSaid('MK-CF-M-013', Math.round(bva.spent_total))} of ${fig('MK-CF-M-049', safePool)} surplus — ${spentPct} percent spent, ${monthPct} percent of the month gone. Opens this month's detail.`}>
          <View style={styles.paceTrack}>
            <View style={[styles.paceFill, { width: `${Math.min(100, spentPct)}%`, backgroundColor: spentPct > 100 ? Colors.red : spentPct > monthPct + 10 ? Colors.amber : Colors.primary }]} />
            <View style={[styles.paceMark, { left: `${Math.min(99, monthPct)}%` }]} />
          </View>
          {/* P0 (design audit CF-1): the pace card's numbers are its message — money size, never 12pt gray */}
          <Text style={styles.paceLine}>Spent {fig('MK-CF-M-013', Math.round(bva.spent_total))} of {fig('MK-CF-M-049', safePool)} surplus this month</Text>
          <Text style={styles.paceSub}>{spentPct}% spent, {monthPct}% of the month gone</Text>
        </View>
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

// ── working: THIS MONTH as cash-flow_v01 draws it (frames A and B) — Planned, then Actual ──────
/** The budget editor: every category, with the live surplus math. One sheet, opened by "Set your
 *  budget" when there is none and by the budget row once there is. */
function BudgetEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal visible={open} animationType={modalAnimation()} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: Colors.bgSecondary, paddingTop: 54 }}>
        <View style={[styles.headRow, { paddingHorizontal: Spacing.base }]}>
          <Text style={styles.h1}>Your budget</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Done editing your budget" onPress={onClose}>
            <Text style={styles.link}>Done</Text>
          </TouchableOpacity>
        </View>
        <BudgetScreen embedded initialTab="Budget" />
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** The short words the drawing sets beside a row's name as a tag; anything else sits under the name. */
const TAG = /^(debt|paid|imported|not paid yet|due \d+(st|nd|rd|th))$/;
/** One row of the month: its name, where it came from, and what it adds or takes. */
function MonthRow({ line, onPress }: { line: MonthLine; onPress?: () => void }) {
  const parts = (line.note ?? '').split(' · ').filter(Boolean);
  const tags = line.notSet ? [] : parts.filter((x) => TAG.test(x));
  const subs = line.notSet ? [] : parts.filter((x) => !TAG.test(x));
  const dim = line.kind !== 'in';
  const value = line.notSet ? '— not set'
    // round the SIZE, then put the sign on: rounding a negative half-dollar goes the other way (−6.50 → −6)
    : `${line.amount < 0 ? '−' : ''}${fig('MK-CF-M-004', Math.round(Math.abs(line.amount)))}`;
  const body = (
    <View style={styles.mRow}>
      <View style={{ flex: 1 }}>
        <View style={styles.mNameRow}>
          <Text style={[styles.rowL, dim && { color: Colors.textSecondary }]}>{line.label}</Text>
          {tags.map((t) => <Text key={t} style={[styles.mTag, /^due|^not paid/.test(t) && styles.mTagDue, t === 'paid' && styles.mTagPaid]}>{t}</Text>)}
        </View>
        {subs.map((t) => <Text key={t} style={styles.mSub}>{t}</Text>)}
      </View>
      <Text style={[styles.rowV, dim ? { color: Colors.textSecondary } : { fontWeight: '800' }]}>{value}</Text>
    </View>
  );
  return onPress
    ? <TouchableOpacity accessibilityRole="button" activeOpacity={0.7} onPress={onPress} accessibilityLabel={`${line.label}, ${subs.join(', ')}, ${value}. Opens your budget.`}>{body}</TouchableOpacity>
    : body;
}

function WorkingMain({ grid, bva, op, liabilities, store, budgetSentence }: { grid: any; bva: any; op: any; liabilities: any[]; store: any; budgetSentence?: string }) {
  const router = useRouter();
  const cell = grid.cells[0];
  const inflow = cell?.inflow ?? 0;
  const [budgetOpen, setBudgetOpen] = useState(false);
  // ONE DOOR (MK-CF-O-010 theMonth, Q-CF-2), and THE FLOW SPELLED OUT. The approved design
  // (cash-flow_v01, frames A and B) spells out every row on both sides, and his rule under that
  // drawing is "every row shown is a row deducted — nothing appears without being in the sum".
  const month = useMemo(() => theMonth({
    ym: isoLocalDate(new Date()).slice(0, 7),   // the LOCAL day, never UTC (guard: local_day_not_utc)
    takeHomeMonthly: inflow,
    inflowSources: (cell?.incomeItems ?? []).map((i: any) => i.source),
    debts: liabilities as any,
    // THE BUDGET, and nothing when there is none. A person who has not set one gets "not set" and the
    // door, never a planned surplus built on a guess (rule 6 under the drawing). The month cell's own
    // bill items ARE the outflow by construction (grid.test: outflow === sum(billItems)), so the
    // spelled-out rows and the total can never disagree.
    plannedExpenses: (cell?.billItems ?? []).filter((b: any) => b.kind === 'bill').reduce((t: number, b: any) => t + (b.amount || 0), 0),
    // the SAME per-category plan the Expenses tab shows — one budget, read once
    plannedByCategory: (bva?.buckets ?? []).map((b: any) => ({ label: String(b.key), monthly: Math.round(b.planned || 0) })),
    expenses: (store.expenses ?? []) as any,
    commitments: ((store.retirementAssumptions ?? {}).commitments ?? []) as any,
  }), [inflow, cell, liabilities, bva, store.expenses, store.retirementAssumptions]);
  const commitments = (((store.retirementAssumptions ?? {}).commitments ?? []) as { label: string; monthlyAmount: number }[]);
  const signed = (id: string, n: number) => `${n < 0 ? '−' : '+'}${fig(id, Math.round(Math.abs(n)))}`;
  const { planned, actual } = month;
  const hasDebts = planned.lines.some((l) => l.kind === 'debt');
  const nothingLogged = actual.lines.filter((l) => l.kind === 'spend').every((l) => l.amount === 0);
  const monthWord = MONTHS_LONG[new Date().getMonth()].toUpperCase();
  // YOUR FUTURE PAYCHECK — KEPT, AND IT IS NOT ON THE DRAWING (cash-flow_v01). Everything else the
  // drawing does not carry left this tab on 2026-10-03; this card stays because he ruled on its
  // arithmetic by name (2026-09-08: which function its guaranteed income comes from, and that "the
  // screen was right") and nothing since has said to take it away. One door (MK-CF-O-017); the
  // estimate label is mandatory copy. Null is an answer: no pot, or past retirement age — no card.
  const A = store.retirementAssumptions ?? {};
  const projection = useMemo(() => futurePaycheck({
    op, accounts: store.assetAccounts ?? [], assumptions: A, bigCosts: store.bigCosts, inflationRate: store.inflationRate, employmentStatus: store.employmentStatus,
  }), [op, store.assetAccounts, A, store.inflationRate, store.employmentStatus]);
  // his ONE wording for the odds (DEC-0104, DEC-0109): the horizon travels with the chance
  const wil = useMemo(() => selectWillItLast({
    op, accounts: store.assetAccounts ?? [], assumptions: A, inflationRate: store.inflationRate, employmentStatus: store.employmentStatus,
  }), [op, store.assetAccounts, A, store.inflationRate, store.employmentStatus]);

  return (
    <>
      {/* PLANNED — what the month is meant to do */}
      <View style={styles.card}>
        <SectionBand inCard inset={16} title={`PLANNED · ${monthWord}`} value={planned.planSet ? signed('MK-CF-M-002', planned.surplus) : '—'} />
        {planned.lines.map((l, i) => (
          <MonthRow key={`p-${l.label}-${i}`} line={l} onPress={l.kind === 'spend' && !l.notSet ? () => setBudgetOpen(true) : undefined} />
        ))}
        {!!budgetSentence && <Text style={[styles.note, { paddingHorizontal: 16 }]}>{budgetSentence}</Text>}
        {planned.planSet ? (
          <>
            <View style={[styles.mRow, styles.mTotal]}>
              <Text style={[styles.rowL, { fontWeight: '800' }]}>= Planned surplus</Text>
              <Text style={[styles.rowV, { fontWeight: '800', color: planned.surplus >= 0 ? Colors.gainText : Colors.red }]}>{signed('MK-CF-M-002', planned.surplus)}</Text>
            </View>
            {/* promised to a goal in the Plan (F11): it comes off what is free, and says where it came from */}
            {month.committed > 0 && (
              <>
                {commitments.map((c, i) => (
                  <Row key={i} label={`${c.label} · from your Plan`} value={`−${fig('MK-CF-M-021', c.monthlyAmount)}`} dim />
                ))}
                <Row label="Surplus after your budget" value={signed('MK-CF-M-020', month.free)} strong color={month.free >= 0 ? Colors.gainText : Colors.red} />
              </>
            )}
          </>
        ) : (
          <>
            <Text style={styles.emptyP}>{hasDebts ? 'Your debts are here, but you haven’t set your budget.' : 'You haven’t set your budget.'} Until you do there is no planned surplus — we won’t guess one.</Text>
            <TouchableOpacity accessibilityRole="button" style={styles.cta} onPress={() => setBudgetOpen(true)} accessibilityLabel="Set your budget">
              <Text style={styles.ctaT}>Set your budget</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ACTUAL — what has happened so far. It needs no plan. */}
      <View style={styles.card}>
        <SectionBand inCard inset={16} title="ACTUAL · SO FAR" value={signed('MK-CF-M-003', actual.surplus)} />
        {actual.lines.map((l, i) => <MonthRow key={`a-${l.label}-${i}`} line={l} />)}
        <View style={[styles.mRow, styles.mTotal]}>
          <Text style={[styles.rowL, { fontWeight: '800' }]}>= Actual surplus so far</Text>
          <Text style={[styles.rowV, { fontWeight: '800', color: actual.surplus >= 0 ? Colors.gainText : Colors.red }]}>{signed('MK-CF-M-003', actual.surplus)}</Text>
        </View>
        {nothingLogged && (
          <Text style={styles.emptyP}>Nothing logged yet, and no card connected. Connect a card and your purchases arrive here on their own.</Text>
        )}
      </View>
      {projection && (
        <TouchableOpacity accessibilityRole="button" style={styles.projCard} activeOpacity={0.85} onPress={() => router.push('/(tabs)/plan')}
          accessibilityLabel={`Your future paycheck — a projection, an estimate, not a promise. At ${projection.retireAge}: about ${figSaid('MK-CF-M-022', projection.monthly)}.`}>
          <SectionBand inCard inset={16} title="YOUR FUTURE PAYCHECK" />
          <Text style={styles.projTag}>PROJECTION — an estimate, not a promise</Text>
          <Text style={styles.projHero}>At {projection.retireAge}:  ~{fig('MK-CF-M-022', projection.monthly)}/month</Text>
          {projection.guaranteed > 0 && <Row label="Social Security · pension" value={`~${fig('MK-CF-M-023', projection.guaranteed)}`} dim />}
          <Row label="Draw from savings" value={`~${fig('MK-CF-M-055', projection.draw)}`} dim />
          {wil.chance != null && <Text style={styles.note}>Based on your plan's {oddsLine(resolveLens(op ?? {}, store.lensOverride), wil.chance, wil.horizonAge)} · see Plan ›</Text>}
        </TouchableOpacity>
      )}
      <BudgetEditor open={budgetOpen} onClose={() => setBudgetOpen(false)} />
    </>
  );
}

// ── the dated 12-month bars (both lenses) ───────────────────────────────────────
function MonthBars({ lens, year, grid }: { lens: string; year: any; grid: any }) {
  const cells = lens === 'retired'
    ? year.months.map((m: any, s: number) => ({
        label: m.label,
        inflow: m.guaranteedTotal + m.safeDraw,
        outflow: m.billsTotal,
        flag: m.billsTotal > 0
          ? `! ${m.bills[0]?.label ?? 'big bill'} −${fig('MK-CF-M-016', Math.round(m.bills[0]?.amount ?? m.billsTotal))}`
          : (m.guaranteedTotal > year.months[0].guaranteedTotal + 0.005
            ? (() => { const extra = m.guaranteedTotal - year.months[0].guaranteedTotal; return `+ ${m.guaranteed.find((g: any) => g.amount > 0)?.source ?? 'extra income'} +${fig('MK-CF-M-024', Math.round(extra))}`; })()
            : null),
        spoken: `${m.label}: ${Math.round(m.guaranteedTotal + m.safeDraw)} dollars in, ${Math.round(m.billsTotal)} out${m.billsTotal > 0 ? `, ${m.bills[0]?.label} due` : ''}`,
      }))
    : grid.cells.map((c: any) => ({
        label: c.label,
        inflow: c.inflow,
        outflow: c.outflow,
        flag: (() => {
          const bonus = c.incomeItems.find((i: any) => i.source === 'Bonus');
          if (bonus) return `+ Bonus ${fig('MK-CF-M-008', Math.round(bonus.amount))}`;
          return c.net < -0.005 ? '! short month' : null;
        })(),
        spoken: `${c.label}: ${Math.round(c.inflow)} dollars in, ${Math.round(c.outflow)} out${c.net < -0.005 ? ', a short month' : ''}`,
      }));
  const max = Math.max(1, ...cells.map((c: any) => Math.max(c.inflow, c.outflow)));
  return (
    <View>
      {cells.map((c: any, s: number) => (
        <View key={c.label} style={styles.barRow} accessible accessibilityLabel={c.spoken}>
          <Text style={styles.barLabel}>{c.label}</Text>
          <View style={{ flex: 1 }}>
            <View style={styles.barTrack}><View style={[styles.barIn, { width: `${Math.max(2, (c.inflow / max) * 100)}%` }]} /></View>
            <View style={[styles.barTrack, { marginTop: 2 }]}><View style={[styles.barOut, { width: `${Math.max(2, (c.outflow / max) * 100)}%` }]} /></View>
            {/* P0 (design audit CF-2): the flag is why the chart exists — a full-width readable
                line under the bars, never a 10.5pt truncated gutter caption */}
            {c.flag && <Text style={styles.barFlag}>{c.flag}</Text>}
          </View>
        </View>
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
              <Text style={styles.whyStep}>{i + 1}. {s.label} — {fig('MK-CF-M-070', s.amount ?? 0)}</Text>
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
  // THIS MONTH as drawn (cash-flow_v01): rows 44 high, a tag beside the name, a quiet line under it
  mRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44, paddingVertical: 6, gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  mNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  mTag: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase', color: Colors.blue, backgroundColor: Colors.blueLight, paddingHorizontal: 5, paddingVertical: 1, overflow: 'hidden' },
  mTagDue: { color: Colors.amber, backgroundColor: Colors.amberLight },
  mTagPaid: { color: Colors.primaryDark, backgroundColor: Colors.primaryLight },
  mSub: { fontSize: 11, color: Colors.textTertiary },
  mTotal: { borderTopWidth: 1.5, borderTopColor: Colors.textPrimary },
  emptyP: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginTop: 9 },
  // a card that is only its band (the heading over the cards that follow) needs no room under it
  cardBandOnly: { paddingBottom: 0, marginBottom: 6 },
  cta: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', marginTop: 8, paddingHorizontal: 14, backgroundColor: Colors.primary },
  ctaT: { fontSize: 13, fontWeight: '800', color: Colors.white },
  heroNum: { fontSize: 38, fontWeight: '800', marginTop: 2 },
  incomeHero: { fontSize: 30, fontWeight: '800', color: Colors.gainText, marginTop: 2, fontVariant: ['tabular-nums'] },
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
