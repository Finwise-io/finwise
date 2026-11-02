// Cash flow main (FCC detailed design v1.1, Cash flow sheet) — ONE screen, lens-switched:
//   retired → the paycheck told truthfully month by month: the F5 hero, 12 dated bars, the
//             draw-order preview, and the will-it-last strip (mirroring its home in Plan)
//   working → THIS MONTH as the approved drawing has it (cash-flow_v01, frames A and B): what is
//             planned and what has actually happened, every row spelled out, each ending in its surplus
// Every number is a door's — this screen computes NOTHING of its own.
import { rentWaitingSentence } from './IncomeSummaryScreen';   // the one sentence for rent waiting for its property (R27, 2026-11-02)
import { MoneyBox } from '../components/MoneyBox';   // every money box, one component (DEC-8385)
import { plural, withArticle } from '../domain/_shared/plural';   // the one list of words and plurals (DEC-4082, 2026-10-10)
import { pastMonthFlow, addedAfterRecord, monthBeforeAnyRecord, type Line as MonthLine } from '../../MoneyKeel/functions/cashflow/this-month';
import { fig, figPer, figSaid, figWords, saidSentence, monthShown, flowShown, partsShown } from '../components/figure';   // rule 11: a figure prints with its identifier
import { centsShown, percentDigits, percentValue } from '../../MoneyKeel/functions/_figure-spec';   // rows to the cent that add up to their printed total (R5, 2026-10-27)
import { theBudgetCounted, expensesAsCounted } from '../../MoneyKeel/functions/cashflow/budget-counted';
import { theMonth } from '../../MoneyKeel/functions/cashflow/the-month';
import { futurePaycheck } from '../../MoneyKeel/functions/cashflow/future-paycheck';
import { receivedInMonth } from '../../MoneyKeel/functions/cashflow/whats-coming';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useStore } from '../store/useStore';
import { useIncomeProfile } from '../hooks/useIncomeProfile';   // the one profile income figures read (2026-10-26)
import { SectionBand } from '../components/SectionBand';
import { Colors, Typography, Spacing, Radii, Tap } from '../utils/theme';
import { budgetVsActual, plannedMonthlySpend } from '../domain/budget';
import { incomeSummary } from '../../MoneyKeel/functions/cashflow/income-summary';
import { taxBucketSplit, withdrawalOrder, RMD_NO_AGE } from '../domain/decumulation';
import { CountedTaxableLines } from '../components/CountedTaxableLines';   // (DEC-4105, 2026-10-10)
import { selectWillItLast } from '../domain/retirement/willItLast';
import { oddsLine } from '../domain/planning/hub';
import { resolveLens } from '../domain/profile/lens';
import { DrawSteerSheet } from '../components/DrawSteerSheet';
import { resolveNetWorthRows } from '../domain/snapshot';
import { ageFromProfile } from '../utils/persona';
import { PaycheckCard } from '../components/PaycheckCard';
import { QuickAddExpense, ExpenseFab } from '../components/MoneySheets';
import { useCashflowModel, thisMonthInputs } from '../hooks/useCashflowModel';   // this month's inputs, assembled once (DEC-0345) — Home reads the same
import BudgetScreen from './BudgetScreen';
import { EstimateTag, EmptyNote } from '../components/UI';
import { HiddenBalancesBanner } from '../components/HiddenBalancesBanner';
import { modalAnimation } from '../hooks/reducedMotion';
import { DotJoined } from '../components/SepDot';
import { wageRefusalOf } from '../domain/income/pay-frequency';   // R23a, 2026-11-01: a wage entered that cannot be read
import { setupEntered } from '../../MoneyKeel/functions/cashflow/setup-gate';   // R26, 2026-11-02: the one set-up gate
import { localDay } from '../domain/_shared/dates';   // the one reader of a stored day (CF-21, 2026-10-25)
import { datedBillsIn } from '../domain/grid';   // a month's dated bills, read one way (2026-10-26)

const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** WHAT A SCREEN READER SAYS FOR A ROW THAT PRINTS A FIGURE (2026-10-24, Cash flow journey E2E-78): the row is one element, and
 *  its words go through the one spoken writer — "hidden" for a hidden balance, never the dots; "a month", never "/month"; a
 *  total's "=" is not read out. The rows were bare Texts, so under hide-balances every figure was heard as "bullet bullet …". */
const sayRow = (...parts: (string | undefined | false)[]): string =>
  saidSentence(parts.filter(Boolean).join(', ').replace(/^= /, '')).replace(/≈\s?/g, 'about ');
/** A past or future month's band names the month, as its last drawing does ("MAY — WHAT ACTUALLY HAPPENED"); the switcher above
 *  already says "— final" or "— planned", and the band repeated it: "SEPTEMBER 2026 — FINAL — WHAT ACTUALLY HAPPENED" (E2E-76). */
const bandMonth = (label: string): string => label.replace(/ — (final|planned)$/, '').toUpperCase();

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
  const bva = useMemo(() => budgetVsActual(expensesAsCounted(expenses, budget.profile), budget.profile, now), [expenses, budget]);   // the mortgage counted once (2026-10-25)
  const { accounts } = useMemo(
    () => resolveNetWorthRows(uid, op, store.nwSeeded ?? false, store.assetAccounts ?? [], store.liabilities ?? []),
    [uid, op, store.nwSeeded, store.assetAccounts, store.liabilities]);

  // will-it-last strip mirrors Plan (the one selector — identical seeded run)
  const wil = useMemo(
    // no feed handed in: the plan's own inflation, else the dated default (DEC-0259; 2026-10-31, BRIEF-94)
    () => selectWillItLast({ op, accounts, assumptions: store.retirementAssumptions ?? {}, employmentStatus: store.employmentStatus, transactions: store.transactions ?? [] }),
    [op, accounts, store.retirementAssumptions, store.employmentStatus, store.transactions]);

  const header = `${MONTHS_LONG[now.getMonth()]} ${now.getFullYear()}`;

  // ── v1.3 CASH FLOW SURFACE (FINAL mock approved 2026-07-19): four tabs, one month switcher ──
  // A DOOR CAN OPEN A TAB (2026-11-01, the lead's ruling; cash-flow_v01's row of that date): "/(tabs)/cashflow?tab=debts" opens Debts —
  // Goals v03's "Your debts … are on Cash flow, under Debts ›" landed on This month. Read where a test's router has no params too.
  const params = (typeof useLocalSearchParams === 'function' ? useLocalSearchParams() : {}) as { tab?: string };
  const TABS: Record<string, 'This month' | 'Income' | 'Expenses' | 'Debts'> = { 'this-month': 'This month', income: 'Income', expenses: 'Expenses', debts: 'Debts' };
  const [surfTab, setSurfTab] = useState<'This month' | 'Income' | 'Expenses' | 'Debts'>(TABS[String(params?.tab ?? '').toLowerCase()] ?? 'This month');
  // the tab screen stays mounted, so a door used while Cash flow is open moves the tab too
  useEffect(() => { const t = TABS[String(params?.tab ?? '').toLowerCase()]; if (t) setSurfTab(t); }, [params?.tab]);
  const [surfOffset, setSurfOffset] = useState(0);           // 0 = current · negative past · positive future
  const selDate = new Date(now.getFullYear(), now.getMonth() + surfOffset, 1);
  const selYm = `${selDate.getFullYear()}-${String(selDate.getMonth() + 1).padStart(2, '0')}`;
  const selLabel = selDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    + (surfOffset < 0 ? ' — final' : surfOffset > 0 ? ' — planned' : '');
  // THE ONE SET-UP GATE (2026-11-02, the lead's ruling R26; cash-flow_v01's row of 2026-11-02; CF6-09, CF6-10): Cash flow, Home,
  // Insights and the sign-up summary read one answer to "is anything entered yet?" (setupEntered). Any inflow (a wage that cannot be
  // read among them — R23a, the round-5d row), any expense logged, a budget set, a debt or a student loan from setup opens the month;
  // the doors are for a first day only (round 5e) and the pay still missing is offered in words where it would be. A $9,800 car loan
  // alone showed the set-up doors beside a Debts tab listing it. With no inflow at all, no surplus rests on an income nobody entered
  const gate = setupEntered({ op, accounts: store.assetAccounts ?? [], transactions: store.transactions ?? [], expenses, incomes: store.incomes ?? [], debts: liabilities });
  const incomeReady = gate.payRead;
  const wageRefusal = gate.wageRefusal;   // R23's sentence, wageRefusalOf — Base pay's own words
  const inflowEntered = gate.inflow;
  const monthReady = gate.entered;
  const payMissing = !incomeReady && !wageRefusal;

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
        <TouchableOpacity hitSlop={Tap.slop} accessibilityRole="button" onPress={() => setSurfOffset((m) => m - 1)} accessibilityLabel="Previous month"><Text style={styles.switchArrow}>‹</Text></TouchableOpacity>
        <Text style={styles.switchLabel}>{selLabel}</Text>
        <TouchableOpacity hitSlop={Tap.slop} accessibilityRole="button" onPress={() => setSurfOffset((m) => Math.min(11, m + 1))} accessibilityLabel="Next month"><Text style={styles.switchArrow}>›</Text></TouchableOpacity>
        {surfOffset !== 0 && (
          <TouchableOpacity hitSlop={Tap.slop} accessibilityRole="button" onPress={() => setSurfOffset(0)} accessibilityLabel="Back to the current month">
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

      {surfTab === 'This month' && (!monthReady && lens !== 'retired' ? (
        /* FIRST OPEN (approved): no zeros — the two setup doors */
        <View style={styles.card}>
          {/* every box title on a dark-green bar, edge to edge (his words, DEC-8839; the lead's R1, 2026-10-27; cash-flow_v01's row of that date) — it was a quiet label (CF-19) */}
          <SectionBand inCard onRowEdges inset={16} title="SET UP YOUR MONTH — 2 STEPS" />
          {/* The approved mock (income-v5, 2a) replaces the bottom sheet with a full screen: a sheet
              caps at 88% of the display, and three figures plus a fourteen-month table plus a second
              earner never fitted in one. Founder approval 2026-08-27. */}
          <TouchableOpacity accessibilityRole="button" style={styles.door} onPress={() => router.push('/base-pay')}
            accessibilityLabel="Step 1: set up your income — your base pay, one section per earner">
            <View style={{ flex: 1 }}><Text style={styles.doorT}>1 · Your base pay</Text><Text style={styles.doorSub}>one section per earner — bonus and other income come after</Text></View>
            <Text style={styles.link}>Set up ›</Text>
          </TouchableOpacity>
          <SpendingQuestion op={op} store={store} />
          <Text style={styles.note}>✓ Answers save to your plan — Home, Plan and this screen use the same numbers. No zeros shown until they’re real.</Text>
        </View>
      ) : surfOffset === 0 ? (
        lens === 'retired' ? (
          <RetiredMain year={year} accounts={accounts} bva={bva} onWhyOrder={() => { setWhyOrder(true); (useStore.getState() as any).setTransitionCheck?.('drawOrder', true); }} />
        ) : (
          <WorkingMain grid={grid} bva={bva} op={op} budgetProfile={budget.profile} liabilities={liabilities} store={store} budgetSentence={budget.sentence} wageRefusal={wageRefusal} payMissing={payMissing} noInflow={!inflowEntered} />
        )
      ) : (
        <OtherMonthCard offset={surfOffset} ym={selYm} label={selLabel} grid={grid} store={store} onSpending={() => setSurfTab('Expenses')}
          budgetSet={plannedMonthlySpend(budget.profile) > 0} hasDebts={liabilities.length > 0} />
      ))}

      {surfTab === 'Income' && (
        <IncomeTab op={op} store={store} ym={selYm} expected={grid.cells[Math.max(0, surfOffset)]?.inflow ?? 0} current={surfOffset === 0}
          monthLabel={selDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          onSetup={() => router.push('/base-pay')} onSummary={() => router.push('/income-summary')} />
      )}

      {surfTab === 'Expenses' && (
        <ExpensesTab ym={selYm} grid={grid} budgetProfile={budget.profile} liabilities={liabilities} bva={bva} expenses={expenses} onLog={() => setSheet(true)} onDebts={() => setSurfTab('Debts')} budgetSentence={budget.sentence}
          record={surfOffset < 0 ? (store.monthlySnapshots ?? {})[selYm] : undefined} />
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
        <SectionBand inCard onRowEdges inset={16} title={`BY MONTH · ${grid.cells[0]?.label} – ${grid.cells[11]?.label}`} />
        {/* RETIRED 2026-10-02 (his finding): the approved This month (cash-flow_v01, frame 1) draws no door to a
            month's detail or to a bill calendar — it spells every row out itself. The bars stay as the drawing
            has them; nothing opens from them. */}
        <MonthBars lens={lens} year={year} grid={grid} />
      </View>

      {/* will-it-last strip — mirrors Plan, never a second computation */}
      <TouchableOpacity accessibilityRole="button" style={styles.card} activeOpacity={0.85} onPress={() => router.push('/(tabs)/plan')}
        accessibilityLabel={wil.chance != null ? `Will my money last: ${wil.chance} percent, an estimate. Lives in your Plan.` : 'See your odds in Plan'}>
        <SectionBand inCard onRowEdges inset={16} title="WILL MY MONEY LAST?" />
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
        <MoneyBox bare dollarBeside style={styles.doorInput} value={v} onChangeText={setV} onEndEditing={save}
          placeholder="—" a11y="Typical monthly expenses" />
      </View>
    </View>
  );
}

/** THIS MONTH extras: the category plan absorbed from the old Budget tab — summary + editor. */
/** A PAST month (frozen actuals) or a FUTURE month (the plan, labeled) — approved §C. */
function OtherMonthCard({ offset, ym, label, grid, store, onSpending, budgetSet = true, hasDebts = false }: { offset: number; ym: string; label: string; grid: any; store: any; onSpending: () => void; budgetSet?: boolean; hasDebts?: boolean }) {
  const [budgetOpen, setBudgetOpen] = useState(false);
  if (offset > 0) {
    const cell = grid.cells[offset];
    if (!cell) return <View style={styles.card}><Text style={styles.note}>Beyond the 12-month window — see All bills &amp; the calendar for later items.</Text></View>;
    // THE BILL THE OUTFLOW NAMES IS A DATED ONE (2026-10-24, Cash flow journey E2E-80; the card's last drawing: "usual $4,500 +
    // property tax $2,400"): the everyday budget left over and a debt's monthly payment are not named — November read "incl.
    // Everyday expenses" — and a month that plans anything at all is not "Nothing entered yet" (Q48 is for a $0 with nothing
    // behind it): November, $800 of groceries planned and a bill entered for December, read "Nothing entered yet. Add your bills ›"
    // the month's dated bills, read one way (datedBillsIn, 2026-10-26 — the lead's ruling): never a monthly category or a debt
    const bigBills = datedBillsIn(cell).filter((b: any) => (b.amount ?? 0) >= 500);
    const plan = flowShown(cell.inflow, cell.outflow);   // the three add up as printed (2026-10-24, tenet 2)
    const laterRefusal = wageRefusalOf(store.onboardingProfile);   // R27, 2026-11-02
    // the take-home the app calculated wears ≈ here too — one figure, one form across the tab (2026-10-25, CF-24)
    // the accounts' interest and dividends are in the tax here too (2026-10-26, FIX-INCOME-A; the one profile income figures read, src/hooks/useIncomeProfile.ts)
    const calculated = incomeSummary(store.onboardingProfile ?? null, { accounts: store.assetAccounts, transactions: store.transactions }).lands.lines.some((l: any) => l.estimated === true);
    return (
      <View style={styles.card}>
        <SectionBand inCard onRowEdges inset={16} title={`${bandMonth(label)} — THE PLAN (AN ESTIMATE)`} />
        {/* A WAGE THAT CANNOT BE READ (R27, 2026-11-02, FX-CF-B; cash-flow_v01 row of that day): the planned inflow rests on it — no
            figure, the reason instead of "Nothing entered yet"; the surplus below reads — */}
        <Row label="Planned inflow" value={laterRefusal ? '—' : `${calculated && plan.inflow > 0 ? '~' : ''}${fig('MK-CF-M-047', plan.inflow)}`} />
        {laterRefusal ? <Text style={styles.note}>{laterRefusal}</Text>
          : (cell.incomeItems ?? []).length === 0 && <EmptyNote door="income" />}   {/* Q48 (MK-CF-M-001) */}
        {/* NO BUDGET, NO PLANNED SURPLUS — in This month's words (2026-10-25, MK-CF-M-049 tenet 3; DEC-7939): October read "Planned
            outflow $2,650 · = Planned surplus $4,550", the take-home less the debts, as if nothing were spent */}
        {budgetSet ? (<>
          <Row label={bigBills.length ? `Planned outflow (expenses + debt) · incl. ${bigBills[0].label}` : 'Planned outflow (expenses + debt)'} value={fig('MK-CF-M-048', plan.outflow)} dim />
          {plan.outflow === 0 && <EmptyNote door="bills" />}   {/* Q48 (MK-CF-M-002): $0 planned, nothing behind it */}
          {/* the surplus carries its sign, as This month prints it — "+$3,450" (2026-10-27, CF2-07; tenet 4) */}
          <Row label="= Planned surplus" value={laterRefusal ? '—' : `${calculated && plan.inflow > 0 ? '~' : ''}${plan.surplus < 0 ? '−' : '+'}${fig('MK-CF-M-049', Math.abs(plan.surplus))}`} strong color={laterRefusal ? Colors.textPrimary : plan.surplus >= 0 ? Colors.gainText : Colors.red} />
        </>) : (<>
          <Row label="Planned outflow (expenses + debt)" value="— not set" dim />
          <Text style={styles.emptyP}>{hasDebts ? 'Your debts are here, but you haven’t set your budget.' : 'You haven’t set your budget.'} Until you do there is no planned surplus — we won’t guess one.</Text>
          <TouchableOpacity accessibilityRole="button" style={styles.cta} onPress={() => setBudgetOpen(true)} accessibilityLabel="Set your budget">
            <Text style={styles.ctaT}>Set your budget</Text>
          </TouchableOpacity>
          <BudgetEditor open={budgetOpen} onClose={() => setBudgetOpen(false)} />
        </>)}
        {budgetSet && cell.net < 0 && <Text style={styles.note}>A tight month you can see coming — the bill calendar feeds this.</Text>}
        <Text style={styles.note}>Every figure is planned — an estimate, never dressed as fact.</Text>
      </View>
    );
  }
  // past: the frozen snapshot when it exists, else the ledger's sums for that month
  const snap = (store.monthlySnapshots ?? {})[ym];
  // ONE PRODUCER for a past month (2026-10-23): what came in, what went out and the surplus come from pastMonthFlow — the
  // same function Home's month-end question reads, so the two can never offer two surpluses for one month. The screen rounds.
  const flow = pastMonthFlow(snap, store.incomes, store.expenses, ym);
  // the three as printed add up: the surplus is the inflow printed less the outflow printed (2026-10-24, tenet 2)
  const { inflow: inn, outflow: out, surplus: left } = flowShown(flow.inflow, flow.outflow);
  const predates = !snap && monthBeforeAnyRecord(ym, store.monthlySnapshots, store.incomes, store.expenses);
  return (
    <View style={styles.card}>
      <SectionBand inCard onRowEdges inset={16} title={`${bandMonth(label)} — WHAT ACTUALLY HAPPENED`} />
      {/* NOTHING RECORDED IS NOT $0 (R27, 2026-11-02, FX-CF-B; tenet 3): a month before tracking reads — on each line, with the sentence
          below — it read "$0 · $0 · +$0" beside an Income tab that expected $1,200 that month */}
      <Row label="Actual inflow" value={predates ? '—' : fig('MK-CF-M-051', inn)} />
      <Row label="Outflow (expenses + debt)" value={predates ? '—' : fig('MK-CF-M-052', out)} dim />
      <Row label="= Surplus" value={predates ? '—' : `${left < 0 ? '−' : '+'}${fig('MK-CF-M-053', Math.abs(left))}`} strong color={predates ? Colors.textPrimary : left >= 0 ? Colors.gainText : Colors.red} />
      {/* ONE LINE SAYS WHAT THE FIGURES ARE, NEVER TWO THAT DISAGREE (2026-10-27, CF2-08; tenet 1): a month before anything was recorded
          predates the tracking, and says only that; it also said "Added up from what is logged …", which says it was added up */}
      {predates && <Text style={styles.note}>Nothing recorded for this month — it predates your tracking.</Text>}
      <TouchableOpacity hitSlop={Tap.slop} accessibilityRole="button" onPress={onSpending} accessibilityLabel="See that month’s activity on the Expenses tab">
        <Text style={styles.link}>That month’s activity ›</Text>
      </TouchableOpacity>
      {/* "Frozen" only when a saved record stands behind the month (2026-10-25, FIX-MONTH; CFR-4 formula check MK-CF-F-220): a month never saved is added up from what is logged, and moves */}
      {!predates && <Text style={styles.note}>{snap ? 'Frozen — past months never change under you.' : 'Added up from what is logged for this month — it changes if more is logged.'}</Text>}
    </View>
  );
}

/** INCOME tab: sources + the steady/varies pop-up door + received-this-month + the Teller door. */
function IncomeTab({ op, store, ym, expected, current, monthLabel, onSetup, onSummary }: { op: any; store: any; ym: string; expected: number; current: boolean; monthLabel: string; onSetup: () => void; onSummary: () => void }) {
  const router = useRouter();
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
  const sum = incomeSummary(op, { accounts: store.assetAccounts, transactions: store.transactions });   // the accounts' interest in the tax (2026-10-26, FIX-INCOME-A; the one profile income figures read, src/hooks/useIncomeProfile.ts)
  // the one door: its pay rows, and its YOUR SOURCES list (MK-CF-O-004 → MK-CF-O-016, 2026-10-25)
  const payRows = sum.lands.lines.filter((l) => l.estimated != null);
  // THE LIST IS THE ONE FUNCTION'S (2026-10-25, FIX-INCOME-B; MK-CF-O-016 incomeSources; the dated row on cash-flow_v01 frame 5): every
  // source the household entered, in its own period, under the drawn names and in the drawn order — benefits, support and interest
  // and dividends had no row here, and the tab built its own list beside the function the Income summary and Your income read. This
  // screen only prints each row: its figure under its identifier, its period, and where it opens. A salary row also carries the
  // take-home the base-pay card shows (incomeSummary's pay rows, CF-24: ≈ only when calculated).
  const FIG: Record<string, string> = { 'self-employment': 'MK-CF-M-007', bonus: 'MK-CF-M-008', equity: 'MK-CF-M-009', rental: 'MK-CF-M-010', guaranteed: 'MK-CF-M-011' };
  const OPEN: Record<string, () => void> = { 'self-employment': manage('self'), bonus: manage('bonus'), other: manage('onetime'), rental: manage('rental'), equity: manage('equity'),
    guaranteed: () => router.push('/monthly-income' as any), benefits: manage('benefits'), support: manage('support'), interest: manage('dividends') };
  // the period beside the figure: self-employment and the rentals say it in their second line, as drawn
  const PER = (x: { kind: string; per: string }) => (x.kind === 'self-employment' || x.kind === 'rental' || x.per === 'once' || x.per === 'quarter' || x.per === 'as entered' ? '' : `/${x.per}`);
  let earnerAt = -1;
  for (const x of sum.sources) {
    if (x.kind === 'salary') {
      earnerAt += 1;
      const monthlyNet = Math.round(payRows[earnerAt]?.amount ?? 0);
      const approx = payRows[earnerAt]?.estimated !== false;
      // a wage that cannot be read has no take-home and no period (R23a follow-on, 2026-11-01): it read 'before tax · yearly · ~$0/month
      // take-home' for a $100,000 wage saved as 'annual' — Your income's words instead
      // THIS wage's own refusal, on its own row (R27, 2026-11-02; CF6-12): it was guessed from the household, so hourly with no hours read
      // "pay frequency not recognised", and a couple's readable wage wore its spouse's refusal
      const unread = x.unread;
      sources.push({ label: x.label,
        sub: unread ? [x.note, unread].filter(Boolean) as string[]
          : sum.wageRefusal && approx ? [x.note, x.every ?? 'monthly', 'take-home not calculated — the other pay cannot be read yet'].filter(Boolean) as string[]
          : x.note === 'by-month table' ? x.note
          : x.note === 'take-home' && x.every === 'monthly' ? 'take-home · monthly'
          : [x.note, x.every ?? 'monthly', `${approx ? '~' : ''}${fig('MK-CF-M-031', monthlyNet)}/month take-home`],   // "≈$6,976", the one form (CF-24)
        amount: x.hourly ? `${fig('MK-CF-M-006', x.amount)}/hour` : fig('MK-CF-M-006', Math.round(x.amount)), open: onSetup });   // '$25/hour' (CF6-12)
      continue;
    }
    // grants with no value yet read "—", as drawn ("Equity comp · RSU grants · — ›")
    sources.push({ label: x.label, sub: x.note, open: OPEN[x.kind],
      amount: x.kind === 'equity' && !(x.amount > 0) ? '—' : `${fig(FIG[x.kind] ?? 'MK-CF-M-027', Math.round(x.amount))}${PER(x)}` });
  }
  const dayWords = (iso: string) => { const [, m, d] = localDay(iso).split('-').map(Number); return `${MON3[(m || 1) - 1]} ${d}`; };   // its day where the person is (CF-21)
  // A CALCULATED TAKE-HOME WEARS ≈, A TYPED ONE NEVER (2026-10-25, CF-24; income v07 rule 9, "Every estimate is prefixed ≈"): the
  // source line and Your base pay print ≈$6,976 for the figure this card printed as $6,976
  const calculated = payRows.some((l) => l.estimated === true);
  // the one chooser, opened from wherever the door is printed — under the sources, or as the line that says nothing is entered
  const chooseIncome = () => {
    Alert.alert('Add your income', undefined, [
      { text: 'Salary / take-home', onPress: onSetup },
      { text: 'Stock vesting (equity)', onPress: manage('equity') },
      { text: 'Rental property', onPress: manage('rental') },
      { text: 'Self-employment', onPress: manage('self') },
      // TWO DOORS, NOT ONE (2026-10-24, Cash flow journey E2E-70): "Bonus / one-time" opened the bonus editor, which
      // records a bonus every year in its month — a one-time $2,000 came back next September. One-time money has its own
      // question ("Something else", One time, the month it lands — DEC-0447)
      { text: 'Bonus', onPress: manage('bonus') },
      { text: 'One-time income', onPress: manage('onetime') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };
  const heroShown = sum.wageRefusal ? '—' : `${calculated ? '~' : ''}${fig('MK-CF-M-047', Math.round(expected))}`;   // no take-home rests on a wage not read (R23a)
  return (
    <>
      {/* THE MONTH'S EXPECTED TAKE-HOME, first (cash-flow_v01, frame 5) — the figure the sources below add up to. The section
          names are the drawing's quiet grey labels: none carries a total (CF-02, 2026-10-25; standard 2.3) */}
      <View style={styles.card}>
        {/* the box titles on dark-green bars (his words, DEC-8839; the lead's R1, 2026-10-27; cash-flow_v01's row of that date) — they were the drawing's quiet grey labels (CF-02) */}
        <SectionBand inCard onRowEdges inset={16} title={current ? 'THIS MONTH' : monthLabel.toUpperCase()} />
        <Text style={styles.incomeHero} accessible accessibilityLabel={sum.wageRefusal ? 'No expected take-home figure' : `${calculated ? 'about ' : ''}${figSaid('MK-CF-M-047', Math.round(expected))}, expected take-home`}>{heroShown}</Text>
        <Text style={styles.heroSub}>expected take-home</Text>
        {!!sum.wageRefusal && <Text style={styles.note}>{sum.wageRefusal}</Text>}
      </View>
      <View style={styles.card}>
        <SectionBand inCard onRowEdges inset={16} title="YOUR SOURCES" />
        {/* ONE DOOR (Q48, DEC-0260): with nothing entered, the line that says so IS the door — the chooser — and it is not
            printed again under it (it read "Nothing entered yet. Add your income ›" then "Add your income ›"; CF-16) */}
        {/* rent that names no property is counted nowhere, and said — never "Nothing entered yet" (DEC-4059d; R27, 2026-11-02, FX-CF-B) */}
        {sum.rentWaiting != null && <Text style={styles.note}>{rentWaitingSentence(sum.rentWaiting)}</Text>}
        {sources.length === 0 && sum.rentWaiting == null && <EmptyNote door="income" onPress={chooseIncome} />}
        {sources.map((sc) => (
          <TouchableOpacity key={sc.label} accessibilityRole="button" activeOpacity={0.7} style={styles.mRow} onPress={sc.open}
            accessibilityLabel={`${sayRow(sc.label, ...(Array.isArray(sc.sub) ? sc.sub : [sc.sub]), sc.amount)}. Opens it to change.`}>
            <View style={{ flex: 1 }}><Text style={styles.rowL}>{sc.label}</Text>{Array.isArray(sc.sub) ? <DotJoined style={styles.doorSub} parts={sc.sub} /> : <Text style={styles.doorSub}>{sc.sub}</Text>}</View>
            <Text style={styles.rowV}>{sc.amount} ›</Text>
          </TouchableOpacity>
        ))}
        {/* ONE way to add, in the one wording every screen uses for it (constants/doors.ts). The
            chooser's labels carry the meaning (B47 finding 10). */}
        {sources.length > 0 && (
          <TouchableOpacity accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}
            accessibilityLabel="Add your income" onPress={chooseIncome}>
            <Text style={styles.link}>Add your income ›</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.card}>
        <SectionBand inCard onRowEdges inset={16} title={current ? 'RECEIVED THIS MONTH' : `RECEIVED · ${monthLabel.toUpperCase()}`} />
        {received.length === 0 && <Text style={styles.emptyP}>Nothing received yet this month.</Text>}
        {received.slice(0, 6).map((i: any) => (
          // to the cent from its full value (it was rounded to the dollar, then given cents: $3,100.40 read +$3,100.00) and bold, as
          // drawn — "a row's figure is bold (700)" (row 32; R5 and CF2-02, 2026-10-27)
          <Row key={i.id} label={`${dayWords(i.date)} · ${i.source || i.type || 'Income'}`} value={`+${fig('MK-CF-M-012', Number(i.amount) || 0)}`} color={Colors.gainText} figure />
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
function ExpensesTab({ ym, grid, budgetProfile, liabilities, bva, expenses, onLog, onDebts, budgetSentence, record }: { ym: string; grid: any; budgetProfile: any; liabilities: any[]; bva: any; expenses: any[]; onLog: () => void; onDebts: () => void; budgetSentence?: string; record?: any }) {
  const [allTxns, setAllTxns] = useState(false);
  const [importing, setImporting] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  // THE SAME INPUTS AS THIS MONTH (2026-10-23, DEC-0345): the planned rows are the month's own groups, from the one producer
  // This month's Expenses row sums — a once-a-year bill counts in its month, never a twelfth (DEC-0002, DEC-0447)
  const m = useMemo(() => theMonth(thisMonthInputs({ grid, bva, profile: budgetProfile, liabilities, expenses, ym })),
    [ym, grid, budgetProfile, liabilities, bva, expenses]);
  const x = m.expenses;
  const budgetSet = m.planned.planSet;   // the plan holds expenses, even when none falls in this month
  const day = (iso: string) => { const [, m, d] = localDay(iso).split('-').map(Number); return `${d} ${MON3[(m || 1) - 1]}`; };   // its day where the person is (CF-21)
  const every = x.recurringDebt.map((r) => r.label.toLowerCase());
  // EVERY LIST'S ROWS ADD UP TO ITS PRINTED TOTAL, in whole dollars (partsShown, 2026-10-24 — tenet 2, the class E2E-69 found
  // on This month): the recurring debts, the planned groups, and the three sources under ACTUAL EXPENSES
  const recShown = partsShown(x.recurringDebt.map((r) => r.monthly));
  const planShown = partsShown(x.planned.map((c) => c.monthly));
  // ROWS ROUND ONCE, TO THE CENT (2026-10-27, FX-CF-A; the lead's ruling R5 on CF2-06; cash-flow_v01's READ THIS FIRST row of that date):
  // an expense, a payment logged and a payment received are written to the cent, so every total over them is too, and the rows as
  // printed add up to it — two $200.40 payments read $200 + $200 under $401, each rounded to the dollar alone. Each list shares its
  // own total (centsShown, whole cents); the lists add up to all sources with no float left over.
  const handC = centsShown(x.byHand.items.map((e: any) => Number(e.amount) || 0));
  const impC = centsShown(x.imported.items.map((e: any) => Number(e.amount) || 0));
  const debtC = centsShown(x.debtCountedAsExpense.map((d) => d.amount));
  const allCents = handC.totalCents + impC.totalCents + debtC.totalCents;
  const cents = (id: string, c: number) => fig(id, c / 100);
  /** One list of what was spent: the five most recent, the way to the rest, and its closing total (as printed). */
  // A PAST MONTH'S EXPENSE ENTERED AFTER ITS RECORD WAS SAVED (2026-10-24, the lead's ruling on E2E-76): the month's card is
  // frozen and leaves it out (the approved card: "past months never change under you"), so this list says so on its row and under its total — never a silent disagreement
  const late = useMemo(() => addedAfterRecord(record, expensesAsCounted(expenses, budgetProfile), ym), [record, expenses, ym, budgetProfile]);   // as the list counts them (2026-10-25)
  const monthName = MONTHS_LONG[Number(ym.slice(5, 7)) - 1];
  const lateWords = `added after ${monthName} closed — not in ${monthName}’s figures`;
  const noteOf = (how: (e: any) => string) => (e: any) => (late.ids.has(String(e.id)) ? `${how(e)} · ${lateWords}` : how(e));
  const list = (l: typeof x.byHand, closing: string, how0: (e: any) => string, lc: { cents: number[]; totalCents: number }) => { const how = noteOf(how0);
    const restCents = lc.cents.slice(l.shown.length).reduce((t, c) => t + c, 0);   // the rows under "Show all", as they print there
    return (
    <>
      {l.shown.map((e: any, i: number) => (
        <View key={`${e.id ?? i}`} style={styles.mRow} accessible
          accessibilityLabel={sayRow(`${day(e.date)} · ${e.store || e.category}`, how(e), cents('MK-CF-M-014', lc.cents[i]))}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowL}>{day(e.date)} · {e.store || e.category}</Text>
            <Text style={styles.mSub}>{how(e)}</Text>
          </View>
          <Text style={[styles.rowV, styles.rowFig]}>{cents('MK-CF-M-014', lc.cents[i])}</Text>
        </View>
      ))}
      {l.hidden > 0 && (
        /* FIVE, THEN THE REST ON A TAP (rule 7 under the drawing). The rest opens in the full list,
           where a row can also be searched, corrected or removed. */
        <TouchableOpacity hitSlop={Tap.slop} accessibilityRole="button" onPress={() => setAllTxns(true)} accessibilityLabel={`Show all ${l.items.length} — ${figSaid('MK-CF-M-101', restCents / 100)} more`}>
          <Text style={styles.more}>Show all {l.items.length} · {cents('MK-CF-M-101', restCents)} more ›</Text>
        </TouchableOpacity>
      )}
      <View style={[styles.mRow, styles.mTotal]} accessible accessibilityLabel={sayRow(closing, cents('MK-CF-M-101', lc.totalCents))}>
        <Text style={[styles.rowL, { fontWeight: '800' }]}>= {closing}</Text>
        <Text style={[styles.rowV, { fontWeight: '800' }]}>{cents('MK-CF-M-101', lc.totalCents)}</Text>
      </View>
    </>
  ); };
  const anySpent = x.actual.items.length > 0 || x.debtCountedAsExpense.length > 0;

  return (
    <>
      <View style={styles.card}>
        <SectionBand inCard onRowEdges inset={16} title="MONTHLY RECURRING EXPENSES" value={fig('MK-CF-M-004', recShown.total)} />
        {/* "same every month" is drawn beside a budget (frame C) and not on a fresh account (frame D) — 2026-10-25, CF-11 */}
        {x.recurringDebt.map((r, i) => (
          <View key={r.label} style={styles.mRow} accessible accessibilityLabel={sayRow(r.label, budgetSet && 'same every month', fig('MK-CF-M-004', recShown.parts[i]))}>
            <View style={{ flex: 1 }}><Text style={styles.rowL}>{r.label}</Text>{budgetSet && <Text style={styles.mSub}>same every month</Text>}</View>
            <Text style={[styles.rowV, styles.rowFig]}>{fig('MK-CF-M-004', recShown.parts[i])}</Text>
          </View>
        ))}
        {/* NOTHING ENTERED IS SAID, AND THE DOOR IS BENEATH IT (Q48 — DEC-0260, DEC-0431; 2026-10-25, CF-17): a brand-new person saw
            "$0" with nothing under it. The door opens the Debts tab, where debts are added. */}
        {(liabilities ?? []).length === 0 && <EmptyNote door="debts" onPress={onDebts} />}
      </View>

      <View style={styles.card}>
        <SectionBand inCard onRowEdges inset={16} title="PLANNED EXPENSES" value={budgetSet ? fig('MK-CF-M-001', planShown.total) : '—'} />
        {!!budgetSentence && <Text style={[styles.note, { paddingHorizontal: 16 }]}>{budgetSentence}</Text>}
        {budgetSet ? (
          <TouchableOpacity accessibilityRole="button" activeOpacity={0.7} onPress={() => setBudgetOpen(true)}
            // the rows are inside the door, so the door says them — it said only "by category", and no amount was ever heard
            accessibilityLabel={`Planned expenses: ${[...x.planned.map((c, i) => sayRow(c.label, fig('MK-CF-M-015', planShown.parts[i]))), sayRow('total', fig('MK-CF-M-001', planShown.total))].join('; ')}. Opens your budget.`}>
            {x.planned.map((c, i) => (
              <View key={c.label} style={styles.mRow}>
                <Text style={styles.rowL}>{c.label}</Text>
                <Text style={[styles.rowV, styles.rowFig]}>{fig('MK-CF-M-015', planShown.parts[i])}</Text>
              </View>
            ))}
            <View style={[styles.mRow, styles.mTotal]}>
              <Text style={[styles.rowL, { fontWeight: '800' }]}>= Total</Text>
              <Text style={[styles.rowV, { fontWeight: '800' }]}>{fig('MK-CF-M-001', planShown.total)}</Text>
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
        <SectionBand inCard onRowEdges inset={16} title="ACTUAL EXPENSES" value={cents('MK-CF-M-101', allCents)} />
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
        const allSources = (<>
          <View style={[styles.mRow, styles.mTotal]} accessible accessibilityLabel={sayRow('Actual expenses, all sources', cents('MK-CF-M-101', allCents))}>
            <Text style={[styles.rowL, { fontWeight: '800' }]}>= Actual expenses, all sources</Text>
            <Text style={[styles.rowV, { fontWeight: '800' }]}>{cents('MK-CF-M-101', allCents)}</Text>
          </View>
          {late.total > 0 && (
            <Text style={styles.emptyP} accessibilityLabel={sayRow(`${fig('MK-CF-M-004', Math.round(late.total))} of it was ${lateWords}`)}>
              {fig('MK-CF-M-004', Math.round(late.total))} of it was {lateWords}.
            </Text>
          )}
          {/* a record that does not say when it was saved: which entries came later cannot be told, so the gap is said (2026-10-25, FIX-MONTH; DEC-7949) */}
          {late.noSavedTime && late.moreThanRecord > 0 && (
            <Text style={styles.emptyP}>{monthName}’s record does not say when it was saved, so it may leave out later entries — this list holds {fig('MK-CF-M-004', Math.round(late.moreThanRecord))} more than {monthName}’s figures.</Text>
          )}
        </>);
        const last = x.debtCountedAsExpense.length > 0 ? 'debt' : x.imported.items.length > 0 ? 'imported' : 'hand';
        return (
          <>
            {x.byHand.items.length > 0 && (
              <View style={styles.card}>
                <SectionBand light inCard onRowEdges inset={16} title="ENTERED BY HAND" value={cents('MK-CF-M-101', handC.totalCents)} />
                {list(x.byHand, `Entered by hand · ${plural(x.byHand.items.length, 'item')}`,
                  (e) => `${e.category} · ${e.receiptUri ? 'receipt' : 'typed'}`, handC)}
                {last === 'hand' && allSources}
              </View>
            )}
            {x.imported.items.length > 0 && (
              <View style={styles.card}>
                <SectionBand light inCard onRowEdges inset={16} title="IMPORTED FROM YOUR CARD" value={cents('MK-CF-M-101', impC.totalCents)} />
                {list(x.imported, `Imported · ${plural(x.imported.items.length, 'purchase')}`, (e) => String(e.category), impC)}
                {last === 'imported' && allSources}
              </View>
            )}
            {x.debtCountedAsExpense.length > 0 && (
              <View style={styles.card}>
                <SectionBand light inCard onRowEdges inset={16} title="DEBT PAYMENTS COUNTED AS EXPENSES" value={cents('MK-CF-M-101', debtC.totalCents)} />
                {/* a payment logged is written to the cent, as every expense row is — never rounded to the dollar alone (R5, CF2-06) */}
                {x.debtCountedAsExpense.map((d, i) => (
                  <View key={d.label} style={styles.mRow} accessible accessibilityLabel={sayRow(d.label, d.note ?? 'entered on the Debts tab', cents('MK-CF-M-014', debtC.cents[i]))}>
                    <View style={{ flex: 1 }}><Text style={styles.rowL}>{d.label}</Text><Text style={styles.mSub}>{d.note ?? 'entered on the Debts tab'}</Text></View>
                    <Text style={[styles.rowV, styles.rowFig]}>{cents('MK-CF-M-014', debtC.cents[i])}</Text>
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
        <SectionBand light inCard onRowEdges inset={16} title="BIG-TICKET RADAR" />
        {x.radar.length === 0 ? (
          <Text style={styles.emptyP}>Nothing unusual. Regular debt payments never appear here — only a card or HELOC payment, or a bill well above its usual size.</Text>
        ) : (
          <>
            {x.radar.map((r, i) => (
              <View key={`${r.label}-${i}`} style={styles.mRow} accessible
                // a payment logged prints to the cent, as its row above does; a sum due or a bill planned in whole dollars, as PLANNED
                // EXPENSES and the Bill calendar print it — each from its full value, rounded once (R5, CF2-06)
                accessibilityLabel={sayRow(r.label, r.reason !== 'big-bill' && 'debt', r.note, r.logged ? fig('MK-CF-M-014', r.amount) : fig('MK-CF-M-016', r.amount))}>
                <View style={{ flex: 1 }}>
                  <View style={styles.mNameRow}>
                    <Text style={styles.rowL}>{r.label}</Text>
                    {r.reason !== 'big-bill' && <Text style={styles.mTag}>debt</Text>}
                  </View>
                  <Text style={styles.mSub}>{r.note}</Text>
                </View>
                <Text style={[styles.rowV, r.countedAsExpense ? styles.rowFig : { color: Colors.textSecondary }]}>{r.logged ? fig('MK-CF-M-014', r.amount) : fig('MK-CF-M-016', r.amount)}</Text>
              </View>
            ))}
            {every.length > 0 && (
              // one debt reads as one (2026-10-24): "Your mortgage never appears here. It is the same every month" — it read
              // "never appear … They are", which a loan not yet started this month (paysInMonth) made the common case
              <Text style={styles.emptyP}>Your {every.join(' and ')} never {every.length === 1 ? 'appears' : 'appear'} here. {every.length === 1 ? 'It is' : 'They are'} the same every month, and a warning you see every month stops being a warning.</Text>
            )}
          </>
        )}
        {/* the one way anything arrives "imported" today: a statement file. Not on the drawing — kept, or
            the Imported list above could never fill. */}
        <TouchableOpacity hitSlop={Tap.slop} accessibilityRole="button" onPress={() => setImporting(true)} accessibilityLabel="Import a statement — a CSV from your bank">
          <Text style={styles.link}>Import a statement ›</Text>
        </TouchableOpacity>
      </View>

      <BudgetEditor open={budgetOpen} onClose={() => setBudgetOpen(false)} />
      <Modal visible={allTxns} animationType={modalAnimation()} onRequestClose={() => setAllTxns(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: Colors.bgSecondary, paddingTop: 54 }}>
          <View style={[styles.headRow, { paddingHorizontal: Spacing.base }]}>
            <Text style={styles.h1}>All transactions</Text>
            <TouchableOpacity hitSlop={Tap.slop} accessibilityRole="button" accessibilityLabel="Done with transactions" onPress={() => setAllTxns(false)}>
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
            <TouchableOpacity hitSlop={Tap.slop} accessibilityRole="button" accessibilityLabel="Done importing" onPress={() => setImporting(false)}>
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
  // NO BIRTH YEAR, NO MADE-UP AGE (2026-10-26, CLEANUP-LEFT; tenet 3, DEC-0296): it was `?? 68`. With no age the order is the kinds
  // of account alone — withdrawalOrder's own no-age path — and the required withdrawal, which turns on age, is said not calculated
  const age = ageFromProfile(store.onboardingProfile);
  const split = taxBucketSplit(accounts);
  const order = withdrawalOrder(split, age ?? undefined, store.drawOrder ?? null);   // the saved steer preference applies
  const [steerOpen, setSteerOpen] = useState(false);
  const m0 = year?.months[0];   // no birth year: no paycheck year, and the pace card is not drawn (2026-10-25, FIX-MONTH)
  const safePool = Math.max(0, Math.round(m0?.netSafeToSpend ?? 0));
  const now = new Date();
  const monthPct = percentValue(now.getDate() / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(), 0);
  const spentPct = safePool > 0 ? percentValue(bva.spent_total / safePool, 0) : 0;
  return (
    <>
      <PaycheckCard />
      {safePool > 0 && (
        <View style={styles.card} accessible
          accessibilityLabel={`Expense pace: ${figSaid('MK-CF-M-013', Math.round(bva.spent_total))} spent of your paycheck, ${figSaid('MK-CF-M-078', safePool)} — ${spentPct} percent spent, ${monthPct} percent of the month gone.`}>
          <View style={styles.paceTrack}>
            <View style={[styles.paceFill, { width: `${Math.min(100, spentPct)}%`, backgroundColor: spentPct > 100 ? Colors.red : spentPct > monthPct + 10 ? Colors.amber : Colors.primary }]} />
            <View style={[styles.paceMark, { left: `${Math.min(99, monthPct)}%` }]} />
          </View>
          {/* P0 (design audit CF-1): the pace card's numbers are its message — money size, never 12pt gray */}
          {/* the $Y is the paycheck card's own figure, MK-CF-M-078 — not the later-month card's MK-CF-M-049 (2026-10-24). It is YOUR
              PAYCHECK, not a surplus: it is what everyday expenses and debt payments are paid from (canon row 25, 2026-10-25) */}
          <Text style={styles.paceLine}>Spent {fig('MK-CF-M-013', Math.round(bva.spent_total))} of your {fig('MK-CF-M-078', safePool)} paycheck this month</Text>
          <Text style={styles.paceSub}>{spentPct}% spent, {monthPct}% of the month gone</Text>
        </View>
      )}
      <View style={styles.card}>
        {/* the box title on a dark-green bar, its two doors on the line under it (his words, DEC-8839; the lead's R1, 2026-10-27; cash-flow_v01's row of that date) */}
        <SectionBand inCard onRowEdges inset={16} title="DRAW COMES FROM" />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
          <TouchableOpacity hitSlop={Tap.slop} accessibilityRole="button" onPress={() => setSteerOpen(true)} accessibilityLabel="Steer it — reorder where the draw comes from">
            <Text style={styles.link}>Steer it ›</Text>
          </TouchableOpacity>
          <TouchableOpacity hitSlop={Tap.slop} accessibilityRole="button" onPress={onWhyOrder} accessibilityLabel="Why this order?" style={{ marginLeft: 12 }}>
            <Text style={styles.link}>Why? ›</Text>
          </TouchableOpacity>
        </View>
        {/* NOTHING ENTERED IS SAID, WITH ITS DOOR (Q48 — DEC-0260, DEC-0431; 2026-10-27, workplan row 360, the retired This month drawn
            from the build and checked against the screen standard): with no account there is no order, and the card printed an empty
            line and "The order the math would tap your accounts" about accounts nobody entered */}
        {order.length > 0 ? (<>
          <Text style={styles.orderLine}>
            {order.map((s: any, i: number) => `${i + 1} ${s.label}`).join('   ')}
          </Text>
          <Text style={styles.note}>{store.drawOrder ? 'Your order — steered by you. Balances match your Net worth.' : 'The order the math would tap your accounts — not a directive. Balances match your Net worth.'}</Text>
        </>) : <EmptyNote door="accounts" />}
        {/* the required withdrawal turns on age: with pre-tax money held and no birth year, the paycheck card's words (cash-flow_v01 row of 2026-10-26) */}
        {age == null && split.preTax > 0 && <Text style={styles.note}>{RMD_NO_AGE}</Text>}
        {/* an account with no tax type is drawn as taxable, and named (DEC-4105, 2026-10-10) */}
        <CountedTaxableLines accounts={accounts} />
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
          <TouchableOpacity hitSlop={Tap.slop} accessibilityRole="button" accessibilityLabel="Done editing your budget" onPress={onClose}>
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
function MonthRow({ line, onPress, shown, approx }: { line: MonthLine; onPress?: () => void; shown: number; approx?: boolean }) {
  const parts = (line.note ?? '').split(' · ').filter(Boolean);
  const tags = line.notSet ? [] : parts.filter((x) => TAG.test(x));
  const subs = line.notSet ? [] : parts.filter((x) => !TAG.test(x));
  const dim = line.kind !== 'in';
  // the row as printed, in whole dollars that add up to the block's surplus (monthShown, 2026-10-24 — tenet 2)
  const amt = shown;
  const value = line.notSet ? '— not set'
    : line.notEntered ? 'payment not entered'   // a payment never entered is not $0 (2026-10-23) — Net worth's words
    // round the SIZE, then put the sign on: rounding a negative half-dollar goes the other way (−6.50 → −6)
    // a take-home the app calculated wears ≈; one the person typed never does (2026-10-25, CF-24; income v07 rule 9)
    : `${amt < 0 ? '−' : ''}${approx ? '~' : ''}${fig('MK-CF-M-004', Math.abs(amt))}`;
  const said = sayRow(line.label, ...tags, ...subs, value);
  const body = (
    <View style={styles.mRow} accessible={!onPress} accessibilityLabel={onPress ? undefined : said}>
      <View style={{ flex: 1 }}>
        <View style={styles.mNameRow}>
          <Text style={[styles.rowL, dim && { color: Colors.textSecondary }]}>{line.label}</Text>
          {tags.map((t) => <Text key={t} style={[styles.mTag, /^due|^not paid/.test(t) && styles.mTagDue, t === 'paid' && styles.mTagPaid, t === 'imported' && styles.mTagImp]}>{t}</Text>)}
        </View>
        {subs.map((t) => <Text key={t} style={styles.mSub}>{t}</Text>)}
      </View>
      <Text style={[styles.rowV, dim ? { color: Colors.textSecondary } : styles.rowFig]}>{value}</Text>
    </View>
  );
  return onPress
    ? <TouchableOpacity accessibilityRole="button" activeOpacity={0.7} onPress={onPress} accessibilityLabel={`${sayRow(line.label, ...subs, value)}. Opens your budget.`}>{body}</TouchableOpacity>
    : body;
}

function WorkingMain({ grid, bva, op, budgetProfile, liabilities, store, budgetSentence, wageRefusal, payMissing, noInflow }: { grid: any; bva: any; op: any; budgetProfile: any; liabilities: any[]; store: any; budgetSentence?: string; wageRefusal?: string | null; payMissing?: boolean; noInflow?: boolean }) {
  const router = useRouter();
  const [budgetOpen, setBudgetOpen] = useState(false);
  // ONE DOOR (MK-CF-O-010 theMonth, Q-CF-2), and THE FLOW SPELLED OUT. The approved design
  // (cash-flow_v01, frames A and B) spells out every row on both sides, and his rule under that
  // drawing is "every row shown is a row deducted — nothing appears without being in the sum".
  // THE INPUTS ARE ASSEMBLED ONCE (2026-10-23, DEC-0345): thisMonthInputs builds them from this tab's grid and budget, and
  // Home's cash-flow box builds its own from the same function — so "Left" on Home is this tab's "= Actual surplus so far".
  const month = useMemo(() => theMonth(thisMonthInputs({
    grid, bva, profile: budgetProfile, liabilities, expenses: store.expenses ?? [], commitments: (store.retirementAssumptions ?? {}).commitments ?? [],
  })), [grid, budgetProfile, liabilities, bva, store.expenses, store.retirementAssumptions]);
  const commitments = (((store.retirementAssumptions ?? {}).commitments ?? []) as { label: string; monthlyAmount: number }[]);
  // a surplus worked on a calculated take-home carries the one 'about' mark before its sign — '~+$5,022' (R25a, 2026-11-02; cash-flow_v01
  // row of that day), as Home's Left reads '~$4,582'; on a take-home typed, none — '+$350', as drawn
  const signed = (id: string, n: number) => `${calculated ? '~' : ''}${n < 0 ? '−' : '+'}${fig(id, Math.round(Math.abs(n)))}`;
  const { planned: plannedExact, actual: actualExact } = month;
  // EVERY ROW SHOWN ADDS UP TO THE SURPLUS SHOWN (2026-10-24, tenet 2; Cash flow journey E2E-69): the rows and the surplus as
  // printed, in whole dollars, by one writer Home's box reads too (monthShown). A $6.50 coffee read rows making $893 over +$894.
  const pShown = monthShown(plannedExact.lines, !!plannedExact.refusal);
  const aShown = monthShown(actualExact.lines);
  const planned = { ...plannedExact, surplus: pShown.surplus };
  const actual = { ...actualExact, surplus: aShown.surplus };
  const hasDebts = planned.lines.some((l) => l.kind === 'debt');
  // the take-home is the app's calculation when any earner's is (Your base pay's own flag) — then it wears ≈ (CF-24)
  const calculated = useMemo(() => incomeSummary(op, { accounts: store.assetAccounts, transactions: store.transactions }).lands.lines.some((l: any) => l.estimated === true),
    [op, store.assetAccounts, store.transactions]);   // the accounts' interest in the tax (2026-10-26, FIX-INCOME-A; the one profile income figures read, src/hooks/useIncomeProfile.ts)
  const incomeOp = useIncomeProfile(op);   // read only — never saved
  const nothingLogged = actual.lines.filter((l) => l.kind === 'spend').every((l) => l.amount === 0);
  // A WAGE THAT CANNOT BE READ (2026-11-01, R23a follow-on; cash-flow_v01's round-5d row): the rows that do not rest on it print, its
  // sentence stands where it would be (after the last inflow row), and each surplus — which rests on it — reads '—'
  // a pay line with no pay behind it is not printed as '$0' (tenet 3): the door below says the pay is not entered (round 5e)
  // and with a wage that cannot be read, no inflow row prints at all: each rests on it — its take-home, or a rate it sets (R27, 2026-11-02)
  // with a wage that cannot be read, an inflow row that holds a take-home rests on it and does not print; a row that holds none — 'Actual
  // inflow (rent) $1,200' — still prints (R27, 2026-11-02); a pay line with no pay behind it is never '$0'
  const unpaid = (l: MonthLine) => l.kind === 'in' && ((!!wageRefusal && (/take-home/.test(l.label) || !(Math.abs(l.amount) > 0)))
    || (!!payMissing && !(Math.abs(l.amount) > 0)));
  const lastIn = (lines: MonthLine[]) => lines.map((l) => (l.kind === 'in' && !unpaid(l) ? 'in' : '')).lastIndexOf('in');
  const rentWaiting = useMemo(() => incomeSummary(op).rentWaiting, [op]);   // R27, 2026-11-02: rent waiting for its property, said
  const wageLine = (key: string) => (<React.Fragment key={key}>
    {!!wageRefusal && <Text style={[styles.note, { paddingHorizontal: 16 }]}>{wageRefusal}</Text>}
    {rentWaiting != null && <Text style={[styles.note, { paddingHorizontal: 16 }]}>{rentWaitingSentence(rentWaiting)}</Text>}
  </React.Fragment>);
  // the pay not entered, offered where it would be — once, in PLANNED (round 5e); with no inflow at all every surplus reads '—'
  const refused = !!wageRefusal || !!noInflow;
  const payDoor = (key: string) => (payMissing ? (
    <TouchableOpacity key={key} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 }} onPress={() => router.push('/base-pay' as any)}
      accessibilityLabel="Your pay is not entered yet. Add it">
      <Text style={styles.link}>Your pay is not entered yet — add it ›</Text>
    </TouchableOpacity>) : null);
  const monthWord = MONTHS_LONG[new Date().getMonth()].toUpperCase();
  // YOUR FUTURE PAYCHECK — KEPT, AND IT IS NOT ON THE DRAWING (cash-flow_v01). Everything else the
  // drawing does not carry left this tab on 2026-10-03; this card stays because he ruled on its
  // arithmetic by name (2026-09-08: which function its guaranteed income comes from, and that "the
  // screen was right") and nothing since has said to take it away. One door (MK-CF-O-017); the
  // estimate label is mandatory copy. Null is an answer: no pot, or past retirement age — no card.
  const A = store.retirementAssumptions ?? {};
  const projection = useMemo(() => futurePaycheck({
    // ONE INFLATION, THE PLAN'S (2026-10-31, FX-CF-A; BRIEF-94; his DEC-0259 "inflation defaults to the dated 30-year average, adjustable; no feed"): the
    // store's economic feed (3.2%) is not handed in — the simulation never read it, and the card states the rate it ran on
    op: incomeOp, accounts: store.assetAccounts ?? [], assumptions: A, bigCosts: store.bigCosts, employmentStatus: store.employmentStatus,
    transactions: store.transactions ?? [],
  }), [incomeOp, store.assetAccounts, A, store.employmentStatus, store.transactions]);
  // his ONE wording for the odds (DEC-0104, DEC-0109): the horizon travels with the chance
  const wil = useMemo(() => selectWillItLast({
    op: incomeOp, accounts: store.assetAccounts ?? [], assumptions: A, employmentStatus: store.employmentStatus,
    transactions: store.transactions ?? [],
  }), [incomeOp, store.assetAccounts, A, store.employmentStatus, store.transactions]);

  return (
    <>
      {/* PLANNED — what the month is meant to do */}
      <View style={styles.card}>
        <SectionBand inCard onRowEdges inset={16} title={`PLANNED · ${monthWord}`} value={planned.planSet && !planned.refusal && !refused ? signed('MK-CF-M-002', planned.surplus) : '—'} />
        {lastIn(planned.lines) < 0 && wageLine('p-wage')}
        {lastIn(planned.lines) < 0 && payDoor('p-pay')}
        {planned.lines.map((l, i) => (
          <React.Fragment key={`p-${l.label}-${i}`}>
            {!unpaid(l) && <MonthRow line={l} shown={pShown.amounts[i]} approx={l.kind === 'in' && calculated} onPress={l.kind === 'spend' && !l.notSet ? () => setBudgetOpen(true) : undefined} />}
            {i === lastIn(planned.lines) && wageLine('p-wage')}
            {i === lastIn(planned.lines) && payDoor('p-pay')}
          </React.Fragment>
        ))}
        {!!budgetSentence && <Text style={[styles.note, { paddingHorizontal: 16 }]}>{budgetSentence}</Text>}
        {planned.planSet && planned.refusal ? (
          // A DEBT'S PAYMENT NEVER ENTERED (2026-10-23, tenet 3): no planned surplus, and the sentence names the debt — the
          // words of the no-budget sentence below. It read "+No budget set…" with a budget set.
          <Text style={styles.emptyP}>{planned.refusal}</Text>
        ) : planned.planSet && refused ? (
          <View style={[styles.mRow, styles.mTotal]} accessible accessibilityLabel={sayRow('= Planned surplus', 'no figure')}>
            <Text style={[styles.rowL, { fontWeight: '800' }]}>= Planned surplus</Text>
            <Text style={[styles.rowV, { fontWeight: '800' }]}>—</Text>
          </View>
        ) : planned.planSet ? (
          <>
            <View style={[styles.mRow, styles.mTotal]} accessible accessibilityLabel={sayRow('= Planned surplus', signed('MK-CF-M-002', planned.surplus))}>
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
        <SectionBand inCard onRowEdges inset={16} title="ACTUAL · SO FAR" value={refused ? '—' : signed('MK-CF-M-003', actual.surplus)} />
        {lastIn(actual.lines) < 0 && wageLine('a-wage')}
        {actual.lines.map((l, i) => (
          <React.Fragment key={`a-${l.label}-${i}`}>
            {!unpaid(l) && <MonthRow line={l} shown={aShown.amounts[i]} approx={l.kind === 'in' && calculated} />}
            {i === lastIn(actual.lines) && wageLine('a-wage')}
          </React.Fragment>
        ))}
        <View style={[styles.mRow, styles.mTotal]} accessible accessibilityLabel={sayRow('= Actual surplus so far', refused ? 'no figure' : signed('MK-CF-M-003', actual.surplus))}>
          <Text style={[styles.rowL, { fontWeight: '800' }]}>= Actual surplus so far</Text>
          {refused
            ? <Text style={[styles.rowV, { fontWeight: '800' }]}>—</Text>
            : <Text style={[styles.rowV, { fontWeight: '800', color: actual.surplus >= 0 ? Colors.gainText : Colors.red }]}>{signed('MK-CF-M-003', actual.surplus)}</Text>}
        </View>
        {nothingLogged && (
          <Text style={styles.emptyP}>Nothing logged yet, and no card connected. Connect a card and your purchases arrive here on their own.</Text>
        )}
      </View>
      {/* no projection worked on a wage not read, or on no income at all (R23a; round 5e) */}
      {projection && !refused && (
        <TouchableOpacity accessibilityRole="button" style={styles.projCard} activeOpacity={0.85} onPress={() => router.push('/(tabs)/plan')}
          accessibilityLabel={`Your future paycheck — a projection, an estimate, not a promise. At ${projection.retireAge}${projection.retireAgeOurs ? ', ours until you change it,' : ''}: about ${figSaid('MK-CF-M-022', projection.monthly)}.`}>
          <SectionBand inCard onRowEdges inset={16} title="YOUR FUTURE PAYCHECK" />
          <Text style={styles.projTag}>PROJECTION — an estimate, not a promise</Text>
          <Text style={styles.projHero}>At {projection.retireAge}{projection.retireAgeOurs ? ' (ours until you change it)' : ''}: ~{fig('MK-CF-M-022', projection.monthly)}/month</Text>   {/* one space (CF3-07) */}
          {/* WHAT IT IS IN, AND WHAT IT ASSUMES (2026-10-25, MK-CF-M-022 and 023 tenets 2 and 4): his rules — the figure is what it buys
              today (DEC-2164) and an explanation names every figure it assumes (DEC-0088). The figures are futurePaycheck's own. */}
          {/* each rate prints under its own number (2026-10-26, PF-TOOLS): MK-CF-M-082 the return the paycheck runs on, MK-CF-M-083 the
              inflation — they printed under MK-CF-M-022, the paycheck itself */}
          {/* each rate the canon's way, "/year" (canon row 14; 2026-10-27, CF2-09) — it read "… a 6.00% return and 2.40% inflation a year" */}
          <Text style={styles.note}>{`In today’s dollars · assumes ${withArticle(figPer('MK-CF-M-082', projection.assumes.yearlyReturn))} return and ${fig('MK-CF-M-083', projection.assumes.yearlyInflation)}/year inflation`}</Text>
          {projection.guaranteed > 0 && <Row label="Social Security · pension" value={`~${fig('MK-CF-M-023', projection.guaranteed)}`} dim />}
          <Row label="Draw from savings" value={`~${fig('MK-CF-M-055', projection.draw)}`} dim />
          {wil.chance != null && <Text style={styles.note}>Based on your plan’s {oddsLine(resolveLens(op ?? {}, store.lensOverride), wil.chance, wil.horizonAge)} · see Plan ›</Text>}
        </TouchableOpacity>
      )}
      <BudgetEditor open={budgetOpen} onClose={() => setBudgetOpen(false)} />
    </>
  );
}

// ── the dated 12-month bars (both lenses) ───────────────────────────────────────
function MonthBars({ lens, year, grid }: { lens: string; year: any; grid: any }) {
  const cells = lens === 'retired' && year   // no birth year: no paycheck year, so the bars are the dated grid's (2026-10-25, FIX-MONTH)
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
        {/* no "· tap a month for detail" (2026-10-27, workplan row 360; tenet 1): the bars open nothing since month detail retired on
            2026-10-02 — the Bill calendar's foot line lost the same promise on 2026-10-24 (E2E-80) */}
      </View>
      {/* nothing in and nothing out in any month: the bars keep their shape and say why, with the one door (Q48) */}
      {cells.every((c: any) => !(c.inflow > 0) && !(c.outflow > 0)) && <EmptyNote door="guaranteed" />}
    </View>
  );
}

// ── the 'Why this order?' explainer (text already written in withdrawalOrder) ──
function DrawOrderWhy({ visible, onClose, accounts, op }: { visible: boolean; onClose: () => void; accounts: any[]; op: any }) {
  const age = ageFromProfile(op);   // no birth year: no age, never a made-up 68 (2026-10-26, CLEANUP-LEFT; tenet 3)
  const split = taxBucketSplit(accounts);
  const order = withdrawalOrder(split, age ?? undefined);
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
          {age == null && split.preTax > 0 && <Text style={styles.whyTxt}>{RMD_NO_AGE}</Text>}
          <TouchableOpacity hitSlop={Tap.slop} accessibilityRole="button" style={styles.modalBtn} onPress={onClose}>
            <Text style={styles.modalBtnT}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Row({ label, value, dim, strong, color, figure }: { label: string; value: string; dim?: boolean; strong?: boolean; color?: string; figure?: boolean }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={sayRow(label, value)}>
      <Text style={[styles.rowL, dim && { color: Colors.textSecondary }, strong && { fontWeight: '800' }]}>{label}</Text>
      <Text style={[styles.rowV, figure && styles.rowFig, strong && { fontWeight: '800' }, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.base, paddingBottom: 110 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 8, minHeight: 44 },
  // the month switcher as drawn (cash-flow_v01 .switchArrow 17, .switchLabel 13 — both on the scale; 2026-10-27, CF2-01): it was 20 and 15
  switchArrow: { fontSize: 17, fontWeight: '800', color: Colors.primary, paddingHorizontal: 6 },
  switchLabel: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary },
  switchToday: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  subTabs: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  // a choice's corner is 12 (DEC-0231; the drawing's square chips corrected by its 2026-10-25 row — CF-15)
  subTab: { minHeight: Tap.min, justifyContent: 'center', paddingHorizontal: 12, borderRadius: Radii.md, borderWidth: 1.5, borderColor: Colors.border },
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
  headDate: { fontSize: Typography.sizes.sm, fontWeight: '700', color: Colors.textTertiary },   // the drawing's lighter grey (textTertiary)
  // EDGE TO EDGE, SQUARE (cash-flow_v01: .card margin 0 −13px, no corner — CF-15, 2026-10-25): each card runs the screen's width
  // and its bands with it; the rows keep the 16-point inset, so every figure lands on one right edge
  card: { backgroundColor: Colors.white, padding: Spacing.base, marginHorizontal: -Spacing.base, marginBottom: Spacing.md },
  projCard: { backgroundColor: Colors.white, borderRadius: Radii.lg, padding: Spacing.base, marginBottom: Spacing.base, borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed' },
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
  mTagImp: { color: Colors.sepDot, backgroundColor: Colors.bgTertiary },   // the drawing's grey IMPORTED tag (CF-14)
  // a row's figure is bold (the drawing's <b>, 700); the closing total is heavier (800)
  rowFig: { fontWeight: '700' },
  // "Show all N · $X more ›" — dark green at 800, as drawn (summary.more, CF-14)
  more: { fontSize: 13, color: Colors.primaryDark, fontWeight: '800', paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
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
