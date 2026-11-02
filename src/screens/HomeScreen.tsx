// Home (FCC detailed design v1.1, Home sheet) — the two-second glance, lens-driven:
//   working lens → Grow & Track hero (investments, vs the market, freshness stamp)
//   retired lens → Surplus hero (the F5 month-named paycheck)
// then one quiet net-worth line, WHAT NEEDS YOU (top 3 from the ONE insights function), and the
// will-it-last strip (reads the one selector's number — Home displays, it never re-derives).
// Home only displays numbers; the single capture affordance is the '+ Expense' button (M4).
import { setupEntered } from '../../MoneyKeel/functions/cashflow/setup-gate';   // R26, 2026-11-02: the one set-up gate
import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, RefreshControl, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { figWords, fig, figSaid, walkShown, flowShown } from '../components/figure';   // the odds print under their identifier, MK-XS-M-002 (2026-10-20)
import { oddsLine, sampleOddsLine } from '../domain/planning/hub';
import { Colors, Spacing, Radii, GaugeRamp } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { buildSnapshot } from '../domain/snapshot';
import { useNetWorthInputs } from '../hooks/useNetWorthInputs';   // the Net worth family's inputs, built once (MK-NW-F-145, DEC-0345)
import { budgetVsActual } from '../domain/budget';
// THIS MONTH IS THE CASH FLOW TAB'S (2026-10-23, DEC-0345; outside re-run of Performance, gap list item 38): the same inputs,
// assembled once, handed to the same door — so Home's "Left" is the tab's "= Actual surplus so far", to the dollar
import { useThisMonthInputs } from '../hooks/useCashflowModel';
import { theMonth } from '../../MoneyKeel/functions/cashflow/the-month';
import { pastMonthFlow } from '../../MoneyKeel/functions/cashflow/this-month';
import { PaycheckCard } from '../components/PaycheckCard';
import { Disclaimer } from '../components/Disclaimer';
import { AllocateSavings } from '../components/MoneySheets';
import { assetClassOf } from '../domain/assets';
import { DesktopInvestTable } from '../../desktop/platform/DesktopInvestTable';
import { buildPerformance, portfolioBenchReturn, marketGap, type Position } from '../domain/performance';
import { priceFreshness } from '../services/marketData';
import { connectionFreshness } from '../services/sync';
import { requiredPayment, paysInMonth } from '../domain/debt';   // the due-soon alert names ONE debt, not a total
// ONE DOOR (MK-NW-O-003 theNetWorth, Q-NW-1 ruled 2026-09-27: "Yes - for home, NW tab, and
// insights"). Home built its own net worth from its own assets state while the Net worth tab
// built another — two assemblies of one question, on the two screens a person compares first.
import { theNetWorth } from '../../MoneyKeel/functions/networth-and-performance/net-worth';
import { dataGaps } from '../domain/gaps';   // the Net worth tab's own list of missing information (MK-XS-F-002)
import { thePerformance, windowStartKey, investmentAccountIdsOf } from '../../MoneyKeel/functions/networth-and-performance/performance';
import { resolveLens } from '../domain/profile/lens';
import { selectWillItLast } from '../domain/retirement/willItLast';
import { milestoneCrossed, milestoneFloor, milestoneLabel } from '../domain/milestones';
import { makeMonthlySnapshot, readHistory } from '../domain/history';
import { useInsights, RentNotKnownLine } from './InsightsScreen';
import { maskedMoney, maskDollars, spokenDollars, spokenMoney } from '../components/useMoney';
import { InfoDot, EmptyNote } from '../components/UI';
import { HiddenBalancesBanner } from '../components/HiddenBalancesBanner';
import { SectionBand } from '../components/SectionBand';
import { DotJoined } from '../components/SepDot';
import { isoLocalDate, localDay } from '../domain/_shared/dates';
import { incomeSummary } from '../../MoneyKeel/functions/cashflow/income-summary';   // the take-home's own estimate flag (CF-24)
import { DOORS, EMPTY_DOORS } from '../constants/doors';
import { percentDigits, percentValue } from '../../MoneyKeel/functions/_figure-spec';   // the one percent writer (R24, NW6-05)
// The connect door's words come from the one list of ways in (founder ruling 2026-09-14: "Connect your bank"),
// so Home can never re-type them differently again — his build-53 note found Home using its own, different words.
const CONNECT_DOOR = DOORS.find((d) => d.route === '/connect')!;
const IMPORT_DOOR = DOORS.find((d) => d.route === '/import-holdings')!;
const BY_HAND_DOOR = DOORS.find((d) => d.route === '/add-account')!;

const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function HomeScreen() {
  const router = useRouter();
  const store = useStore() as any;

  // Build-47 walk row 13 (audit Home·NW #12): pull down = refresh prices AND connected accounts.
  const [refreshing, setRefreshing] = React.useState(false);
  const onPull = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const { runSnapTradeSync } = require('../services/sync/snaptradeSync');
      await Promise.allSettled([store.refreshPrices?.(), runSnapTradeSync({ force: true })]);
    } finally { setRefreshing(false); }
  }, []);
  const op = store.onboardingProfile;
  const uid = store.user?.uid ?? 'local';
  // THE NET WORTH FAMILY'S INPUTS, BUILT ONCE (owner, DEC-0345): MK-NW-F-145 netWorthInputs. Home counts the rows it
  // hands back as withEstimate — the entered rows, or the sign-up estimate before Net worth is set up (B-49).
  const nwIn = useNetWorthInputs();
  const name = (store.user?.name || op?.name || 'there').split(' ')[0];
  const lens = resolveLens(op, store.lensOverride);
  const topInsights = useInsights(3);
  const expenses = (store.expenses ?? []) as any[];
  const [allocSheet, setAllocSheet] = useState<{ open: boolean; ym?: string; label?: string; available?: number; isPrompt?: boolean }>({ open: false });

  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const snap = useMemo(
    // B-49: net worth + nest egg come from the live store rows (so account edits/deletions show),
    // resolved by the one shared rule so Home, the Net worth tab and Plan always agree.
    () => {
      // no data = no answers AND nothing live — mirror resolveNetWorthRows' useLive rule, else a
      // skip-then-import user gets stuck on the doors with real money already in the store
      // an expense or an income logged is data too (2026-10-25, HM-02): with no answers yet, two expenses logged still bring the box
      if (!op && !store.nwSeeded && (store.assetAccounts?.length ?? 0) === 0 && (store.liabilities?.length ?? 0) === 0
        && (store.expenses?.length ?? 0) === 0 && (store.incomes?.length ?? 0) === 0) return null;
      const { accounts, debts: liabilities } = nwIn.withEstimate;   // the family's rows (DEC-0345)
      return buildSnapshot(uid, op, { inflationRate: store.inflationRate ?? 2.4, treasuryYield: store.treasuryYield ?? 4.3 }, accounts, liabilities);
    },
    [op, uid, store.inflationRate, store.treasuryYield, store.nwSeeded, store.assetAccounts, store.liabilities, store.expenses, store.incomes, nwIn],
  );

  const netWorthNow = snap ? Math.round((snap as any).networth?.net_worth ?? 0) : null;
  useEffect(() => {
    if (netWorthNow == null) return;
    if (store.milestoneHighSeen == null) store.setMilestoneHighSeen?.(milestoneFloor(netWorthNow));
  }, [netWorthNow == null, store.milestoneHighSeen == null]);
  const milestone = netWorthNow != null ? milestoneCrossed(netWorthNow, store.milestoneHighSeen) : null;

  // the rows every Home figure counts — read from the family's inputs, never resolved here again (DEC-0345)
  const resolvedRows = useMemo(() => ({ accounts: nwIn.withEstimate.accounts, liabilities: nwIn.withEstimate.debts }), [nwIn]);

  // ── month metrics used by the frozen-history effect + the month-end surplus prompt ──
  const bva = useMemo(() => budgetVsActual(expenses, op, now), [expenses, op, ym]);
  // THIS MONTH, AS THE CASH FLOW TAB SHOWS IT: what came in, what went out (expenses + the debt paid) and what is left, from
  // MK-CF-O-010 theMonth on the inputs the tab builds (useThisMonthInputs). Until 2026-10-23 Home calculated it here — the
  // take-home plus any income recorded as received, less the expenses logged, without the debt payments made: one month read
  // "Left $4,202" here and "+$3,952" on Cash flow, the $250 car loan paid.
  const monthIn = useThisMonthInputs();
  const cf = useMemo(() => theMonth(monthIn).actual, [monthIn]);
  // whether that take-home is the app's calculation (Your base pay's own flag) — then it wears ≈, as on the Cash flow tab (CF-24)
  // the accounts' interest and dividends in the tax, as the Income summary reads them (2026-10-26, FIX-INCOME-A; the one profile income figures read, src/hooks/useIncomeProfile.ts)
  const takeHomeCalculated = useMemo(() => incomeSummary(op, { accounts: store.assetAccounts, transactions: store.transactions }).lands.lines.some((l: any) => l.estimated === true),
    [op, store.assetAccounts, store.transactions]);

  // month-end nudge: after a month with savings, ask where it went (once, if not skipped)
  const priorDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const priorYm = `${priorDate.getFullYear()}-${String(priorDate.getMonth() + 1).padStart(2, '0')}`;
  const incomesArr = store.incomes ?? [];
  // each record's own day, read where the person is (localDay, CF-21 — 2026-10-25)
  const priorHasActivity = expenses.some((e: any) => localDay(e?.date).startsWith(priorYm))
    || incomesArr.some((i: any) => localDay(i?.date).startsWith(priorYm));
  useEffect(() => {
    if (!priorHasActivity) return;
    // last month's surplus as the Cash flow tab shows it for that month — the same producer (pastMonthFlow, 2026-10-23); it
    // was calculated here without the debt paid, so the sheet offered more than Cash flow said was left
    // as the past-month card prints it: its inflow less its outflow, each in whole dollars (flowShown, 2026-10-24)
    const prior = pastMonthFlow((store.monthlySnapshots ?? {})[priorYm], incomesArr, expenses, priorYm);
    const saved = flowShown(prior.inflow, prior.outflow).surplus;
    if (saved <= 0) return;
    if ((store.assetAccounts ?? []).length === 0) return;
    const done = store.allocatedByMonth?.[priorYm] ?? 0;
    if (done >= saved || store.allocPromptSkipped?.[priorYm]) return;
    setAllocSheet({ open: true, ym: priorYm, label: MONTHS_LONG[priorDate.getMonth()].slice(0, 3), available: saved - done, isPrompt: true });
  }, []);

  // debt due-soon reminder (current month, from due_day − 1)
  useEffect(() => {
    const paidThisMonth = (d: any) => (store.expenses ?? []).some((e: any) => e.category === 'Debt payment' && e.store === d.label && localDay(e.date).startsWith(ym));
    // only a debt with a payment in this month (paysInMonth, the Cash flow tab's rule; 2026-10-24, CF-FIX): a loan whose first
    // payment is next month said "due day 28" this month
    const due = (store.liabilities ?? []).filter((d: any) => d.due_day && paysInMonth(d, ym) && now.getDate() >= d.due_day - 1 && !paidThisMonth(d));
    if (due.length) Alert.alert('Debt due soon', due.map((d: any) => `${d.label} — ${maskedMoney(requiredPayment(d))} due day ${d.due_day}`).join('\n'), [{ text: 'OK' }]);
  }, []);

  // freeze month-by-month metrics for trailing history (net worth, income, spend, savings, debt)
  useEffect(() => {
    if (!op) return;
    // P0: freeze the SAME rows every screen displays (resolveNetWorthRows), not the raw store arrays.
    const { accounts: a, liabilities: l } = resolvedRows;
    const worth = theNetWorth({ ...nwIn, ...nwIn.withEstimate });   // the family's inputs, on Home's rows (DEC-0345)
    const nwv = { gross_assets: worth.assets, gross_debt: worth.debts, net_worth: worth.netWorth };
    // the month's expenses AS THIS MONTH COUNTS THEM (2026-10-25, FIX-MONTH; expensesAsCounted inside useThisMonthInputs): what was logged
    // under a budget line that stood down for a debt is that debt's payment, so the record splits expenses and debt paid as the tab does
    const monthExp = ((monthIn.expenses ?? []) as any[]).filter((e: any) => localDay(e.date).startsWith(ym));
    const dPaid = monthExp.filter((e: any) => e.category === 'Debt payment').reduce((t: number, e: any) => t + (Number(e.amount) || 0), 0);
    const eSpent = budgetVsActual(monthExp, op, now).spent_total;
    const byCategory: Record<string, number> = {};
    monthExp.filter((e: any) => e.category !== 'Debt payment').forEach((e: any) => { byCategory[e.category] = (byCategory[e.category] ?? 0) + (Number(e.amount) || 0); });
    const assetsSnap = a.map((x: any) => ({ id: x.asset_id, label: x.label, kind: x.kind ?? null, bucket: x.tax_bucket, institution: x.institution ?? null, balance: x.balance }));
    const debtsSnap = l.map((x: any) => ({ id: x.debt_id, label: x.label, type: x.debt_type, balance: x.remaining_balance, apr: x.interest_rate_apr }));
    // PRD F1#15: the typed, versioned writer — the identity net_worth = assets − debt is structural
    store.captureMonthlySnapshot?.(ym, makeMonthlySnapshot({
      month: ym,
      gross_assets: nwv.gross_assets, gross_debt: nwv.gross_debt,
      // the month's record keeps every figure exact (DEC-0403); these three were rounded when saved until 2026-10-20
      // what came in and the surplus are the month's own, as Cash flow shows them (2026-10-23): the record keeps what was shown
      income_net: cf.inflow, spending: eSpent, debt_paid: dPaid,
      savings: cf.surplus, allocated: store.allocatedByMonth?.[ym] ?? 0,
      // the month's planned expenses as This month and the Expenses tab show them — a once-a-year bill only in its month
      // (2026-10-23); it was the budget's monthly average
      planned_budget: monthIn.plannedExpenses, savings_rate: cf.inflow > 0 ? (cf.surplus / cf.inflow) * 100 : 0,
      by_category: byCategory,
      assets: assetsSnap,
      debts: debtsSnap,
      captured_at: new Date().toISOString(),
    }));
    // APPROVED 2026-07-19: one daily net-worth point per open day → the trend graph draws within
    // days of first use (monthly snapshots stay the deep record; this is just a chart point).
    // founder rule 2026-08-04: also capture cash+investments — the change-% denominator
    store.captureDailyNw?.(isoLocalDate(new Date()), nwv.net_worth, worth.investable);
    store.runReclassifyOnce?.();   // founder gaps 1 & 2: fix accounts stored under the OLD rule
  }, [ym, cf, monthIn, bva, expenses, store.assetAccounts, store.liabilities, store.allocatedByMonth, store.nwSeeded]);

  // ── working-lens hero numbers (canonical helpers named by the design) ──
  // THE ONE SET-UP GATE (2026-11-02, the lead's ruling R26; ways-to-add v10's row of 2026-11-02; CF6-09): the answer Cash flow,
  // Insights and the sign-up summary read to "is anything entered yet?" — an inflow (a wage that cannot be read among them), an
  // expense, a budget, a debt or a student loan from setup. Q48: a real $0 income is not "nothing entered"
  const gate = useMemo(() => setupEntered({ op, accounts: store.assetAccounts ?? [], transactions: store.transactions ?? [], expenses, incomes: store.incomes ?? [], debts: store.liabilities ?? [] }),
    [op, store.assetAccounts, store.transactions, expenses, store.incomes, store.liabilities]);
  const hasIncomeEntered = gate.inflow;
  const positions: Position[] = useMemo(
    () => (store.assetAccounts ?? []).flatMap((a: any) => a.positions ?? []),
    [store.assetAccounts]);
  const priceCache = store.priceCache ?? {};
  const priceOf = (t: string) => priceCache[t.trim().toUpperCase()];
  // the records and the accounts, so a bond's or a CD's interest is part of its return (DEC-6212, 2026-10-19)
  const perfRows = useMemo(() => buildPerformance(positions, priceOf, '1M', new Date(), undefined, undefined,
    { transactions: (store.transactions ?? []) as any[], accounts: (store.assetAccounts ?? []) as any[] }),
    [positions, priceCache, store.transactions, store.assetAccounts]);
  // ONE DOOR (MK-NW-O-008 thePerformance, Q-PF-1 ruled 2026-09-27: "yes"). The door's header has
  // said since that day that Home's return and Performance's can never disagree. They did: Home
  // called portfolioPeriodReturn, which counts PRICE CHANGE ONLY, while Performance's 1M chip counts
  // (corrected 2026-10-12: those prices were dividend-adjusted closes, so the holdings' dividends were in it; the
  // difference was the method, a holding-weighted price move against the walk — DEC-4645)
  // wealth generated — dividends and interest included. On one test household the same month read
  // +3.57% here and +3.69% there, a tap apart. Home now asks the door the same question (B-112).
  const oneMonth = useMemo(() => {
    const today = isoLocalDate(new Date());
    return thePerformance({
      windowStart: windowStartKey('1M', Object.keys((store.invDaily ?? {}) as Record<string, number>), today),
      windowLabel: 'past month', today,
      // the holdings themselves, as Performance hands them over (DEC-5068, 2026-10-13): where no daily record reaches
      // back, the month is worked back from each holding's price history, and Home's return is the one Performance's
      // 1M window shows — the return of the holdings with a history, the rest named beneath it
      holdings: perfRows as any,
      // each holding's price history: the days of a window before the daily record begins are worked back from it and joined to the record's own return (DEC-6412, 2026-10-19)
      priceOf,
      transactions: (store.transactions ?? []) as any[],
      snapshotDays: (store as any).snapshotDays ?? [],
      investmentAccountIds: investmentAccountIdsOf(resolvedRows.accounts as any, assetClassOf),
      accounts: resolvedRows.accounts as any[],
    });
  }, [store.transactions, store.snapshotDays, store.invDaily, perfRows, resolvedRows.accounts]);
  // "YOUR INVESTMENTS" IS MK-XS-M-003 — ONE FIGURE, on Home AND Net worth: stocks, funds, bonds and
  // alternatives, read from theNetWorth. His definition (DEC-0457): investments do not include cash.
  // From 2026-10-05 to 2026-10-08 Home printed Performance's ending value instead — the investment
  // ACCOUNTS whole, their uninvested cash included — so Home read $355,152 where Net worth's Investments
  // line, the same figure by its own record, read $354,314. That was my choice against his definition.
  const investTotal = useMemo(
    () => theNetWorth({ ...nwIn, ...nwIn.withEstimate }).investments,   // the family's inputs, on Home's rows (DEC-0345)
    [nwIn]);
  const youReturn = oneMonth.ret;                               // the door's 1M figure, the one Performance prints
  // and the dollars behind it — never re-derived from the %. Shown only beside a return, and a return
  // exists only where the walk does (a window the record reaches, or one worked back — DEC-5068), so the 0 here is never printed.
  // as the Performance tab's 1M walk prints it (walkShown, 2026-10-21): one figure on both screens, in whole dollars that add up
  const youDollar = oneMonth.walk ? walkShown(oneMonth.walk).wealthGenerated : 0;
  const marketReturn = useMemo(() => portfolioBenchReturn(perfRows), [perfRows]);   // the ONE shared formula (walk row 5)
  // THE GAP COMES FROM ONE FUNCTION (marketGap, 2026-10-21) — the one each holding's "You are ahead by" reads too; it was
  // calculated here on the screen (outside re-run OpenAI, cross-card case 7). Full precision; rounded once where it prints.
  const gap = marketGap(youReturn, marketReturn);
  const freshness = positions.length > 0 ? priceFreshness(store.pricesFetchedAt, Date.now()) : null;

  // ── will-it-last strip: the ONE selector's number (same seeded run as the Plan hub) ──
  const wil = useMemo(
    () => selectWillItLast({ op, accounts: resolvedRows.accounts, assumptions: store.retirementAssumptions ?? {}, employmentStatus: store.employmentStatus, transactions: store.transactions ?? [] }),   // no feed: the plan's one inflation (DEC-0259)
    [op, resolvedRows.accounts, store.retirementAssumptions, store.inflationRate, store.employmentStatus, store.transactions]);
  useEffect(() => { if (wil.chance != null) store.setLastRetireChance?.(wil.chance); }, [wil.chance]);

  // founder finding 2026-07-15: answering the two setup questions creates a PROFILE, not DATA —
  // a user who finished the questions still needs the doors in (connect / import / add by hand).
  // The doors show until real money data exists from ANY source: a live or onboarding-derived
  // account or debt, or a captured income. Never a dashboard of fake zeros.
  // AN EXPENSE OR AN INCOME LOGGED IS DATA TOO (2026-10-25, Cash flow drawing match HM-02): the THIS MONTH'S CASH FLOW box shows
  // "once anything is added" (ways-to-add v10, its 2026-10-23 row), and a person whose first act was to log a $40 expense saw
  // the first-day doors and no box
  // ONE GATE WITH CASH FLOW (2026-11-02, R26; CF6-09): a budget set, rent or any inflow, a wage that cannot be read, or a setup loan
  // opens Home too — a $600 budget alone showed these doors while Cash flow opened its month. An account opens Home (its net worth)
  const hasMoneyData = resolvedRows.accounts.length > 0 || resolvedRows.liabilities.length > 0 || gate.entered;
  if (!snap || !hasMoneyData) {
    // Home — first run, nothing connected yet (FCC detailed design v1.1, Home sheet): never fake
    // zeros or demo charts — one promise and the DOORS in: connect (honestly 'coming soon' until
    // the bank link ships), add by hand, import a file; the retired-paycheck fast path leads when
    // that's what they came for. A saved deep-setup draft still resumes (un-pause before routing).
    const draft = store.onboardingDraft;
    const goSetup = () => { store.setOnboardingPaused?.(false); router.replace('/onboarding'); };
    const paycheckFirst = lens === 'retired' && (Array.isArray(op?.intents) ? op.intents.includes('paycheck') : false);
    return (
      <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: Spacing.xl }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.sub}>Welcome{name !== 'there' ? `, ${name}` : ''}</Text>
        <Text style={styles.h1}>Let’s get your real numbers in.</Text>

        {draft && (
          <TouchableOpacity accessibilityRole="button" style={styles.cta} onPress={goSetup}
            accessibilityLabel="Pick up where you left off — continue setup">
            <Text style={styles.ctaText}>Pick up where you left off →</Text>
          </TouchableOpacity>
        )}

        {/* the retired fast path leads when a retirement paycheck is what they came for */}
        {paycheckFirst && (
          <TouchableOpacity accessibilityRole="button" style={[styles.door, styles.doorPrimary]} onPress={() => router.push('/monthly-income')}
            accessibilityLabel="Get your paycheck — enter your Social Security and pension. Two minutes, no bank login.">
            <Text style={styles.doorTitle}>Get your paycheck ›</Text>
            <Text style={styles.doorSub}>Enter your Social Security and pension — 2 minutes, no bank login.</Text>
          </TouchableOpacity>
        )}

        {/* connect: a real door into the flow — the flow itself says honestly whether live
            bank linking is switched on yet (never a dead button, never a hidden feature) */}
        <TouchableOpacity accessibilityRole="button" style={styles.door} onPress={() => router.push('/connect' as any)}
          accessibilityLabel={`${CONNECT_DOOR.title.replace(' ›', '')}. Takes about 2 minutes. Read-only: we can look, never touch your money.`}>
          <Text style={styles.doorTitle}>{CONNECT_DOOR.title}</Text>
          <Text style={styles.doorSub}>Takes about 2 minutes. Read-only: we can look, never touch your money.</Text>
        </TouchableOpacity>

        <TouchableOpacity accessibilityRole="button" style={styles.door} onPress={() => router.push(IMPORT_DOOR.route as any)}
          accessibilityLabel={IMPORT_DOOR.title.replace(' ›', '')}>
          <Text style={styles.doorTitle}>{IMPORT_DOOR.title}</Text>
          <Text style={styles.doorSub}>{IMPORT_DOOR.sub}</Text>
        </TouchableOpacity>

        {/* FOUNDER RULING 2026-09-14 ("love it. do it."): one destination and one wording for this door on every
            screen — it opens the Add account form in one tap. Home used to send it to the Net worth tab, four taps
            from the form, with its own line under it. */}
        <TouchableOpacity accessibilityRole="button" style={styles.door} onPress={() => router.push(BY_HAND_DOOR.route as any)}
          accessibilityLabel={`${BY_HAND_DOOR.title.replace(' ›', '')}. ${BY_HAND_DOOR.sub}`}>
          <Text style={styles.doorTitle}>{BY_HAND_DOOR.title}</Text>
          <Text style={styles.doorSub}>{BY_HAND_DOOR.sub}</Text>
        </TouchableOpacity>

        {!draft && (
          <TouchableOpacity accessibilityRole="button" onPress={goSetup}
            accessibilityLabel="Or answer guided setup questions instead">
            <Text style={styles.quietLink}>Or answer guided setup questions ›</Text>
          </TouchableOpacity>
        )}

        <SectionBand title={"WHAT YOU’LL SEE HERE"} />
        <Text style={styles.promiseLine}>· Your whole money picture in one place</Text>
        <Text style={styles.promiseLine}>· What needs your attention — with dollar amounts</Text>
        <Text style={styles.promiseLine}>· Whether your money will last — as honest odds</Text>
      </ScrollView>
    );
  }

  const netWorth = snap.networth.net_worth;
  // direction vs last frozen month (word + arrow — never color alone)
  const nwHistory = readHistory(store.monthlySnapshots).filter((h) => h.month !== ym);
  const prevNw = nwHistory.length ? nwHistory[nwHistory.length - 1].net_worth : null;
  const nwDir = prevNw != null && netWorth !== prevNw ? (netWorth > prevNw ? 'up' : 'down') : null;
  // A BALANCE NOT ENTERED IS NAMED UNDER THE NET WORTH LINE (2026-10-21, MK-XS-M-001, DEC-3523 tenet 3): the figure adds up
  // the rows it knows, as the Net worth tab's does, and the tab names the missing one in its amber box — Home printed the
  // same sum with nothing beside it. The words are the tab's own (dataGaps, the one function): "<name> has no balance".
  const balanceGaps = dataGaps(resolvedRows.accounts as any[], null, Date.now(), [], [], resolvedRows.liabilities as any[])
    .filter((g) => g.kind === 'no-balance');
  // the same gaps, for the accounts YOUR INVESTMENTS counts — the classes its line adds up (stocks and funds, bonds and CDs,
  // alternatives, not yet classed), the test the empty-state door below already uses (2026-10-21, MK-XS-M-003)
  const investGaps = balanceGaps.filter((g) => {
    const a = (resolvedRows.accounts as any[]).find((x) => String(x.asset_id) === String(g.accountId));
    return !!a && ['stocks_etf', 'bonds', 'alternatives', 'mixed'].includes(assetClassOf(a));
  });

  // ── section blocks — desktop places the SAME blocks in two columns; phone order unchanged ──
  // WHICH LINES THE HERO CARD PRINTS — named once, so the card's printed lines and its spoken label cannot disagree
  const heroEmpty = investTotal === 0 && !resolvedRows.accounts.some((a: any) => ['stocks_etf', 'bonds', 'alternatives', 'mixed'].includes(assetClassOf(a)));
  const heroBase = youReturn != null && oneMonth.ending != null && Math.round(oneMonth.ending) !== Math.round(investTotal);
  const heroLeftOut = youReturn != null && !!oneMonth.notIncluded;
  const heroVs = youReturn != null && marketReturn != null && gap != null;
  const heroStale = (() => {
    const st = (store.assetAccounts ?? [])
      .filter((a: any) => a.source === 'connected')
      .map((a: any) => ({ a, f: connectionFreshness(a.last_synced) }))
      .filter((x: any) => x.f?.stale)
      .sort((x: any, y: any) => y.f.daysOld - x.f.daysOld)[0];
    if (!st) return null;
    const asOf = st.a.last_synced ? new Date(st.a.last_synced).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
    return { who: st.a.institution ?? st.a.label, asOf, daysOld: st.f.daysOld as number };
  })();
  const asOfToday = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  // the "balance not entered" line's door — one route for the touch press and the spoken action
  const openGaps = () => router.push('/(tabs)/analytics');
  const heroGapAction = investGaps.length > 0
    ? { name: HERO_GAP_ACTION, label: `${investGaps[0].title}${investGaps.length > 1 ? `, and ${investGaps.length - 1} more` : ''}. Opens the Net worth tab` }
    : null;
  /** THE CARD SAYS WHAT IT PRINTS, IN PRINTED ORDER (2026-10-22, W-A11Y). The card is one button, so a screen reader reads its
   *  label and nothing inside it: it heard the total, the month and the price date, never the base of the month, the holding
   *  left out, the market line or a stale connection. Each line is said here from the same figures, through the spoken writers
   *  (figSaid, spokenMoney, spokenDollars) — "hidden" under hide-balances — and without the marks it prints (▲ ⚠ ⏱ ›). */
  const heroSaid = [
    `Your investments: ${spokenMoney(investTotal)}`,
    ...(investGaps.length > 0 ? [investGaps.map((g) => g.title).join('. ')] : []),
    ...(heroEmpty ? [`Nothing entered yet. ${EMPTY_DOORS.accounts.label}`] : []),
    youReturn != null
      ? `${youReturn >= 0 ? 'up' : 'down'} ${figSaid('MK-PF-M-002', Math.abs(youDollar))}, ${figSaid('MK-XS-M-004', Math.abs(youReturn)).replace(/%$/, ' percent')} this month`
      : investTotal > 0 ? 'change shows once your holdings have prices' : 'nothing invested yet — connect or add an account to start',
    ...(heroBase ? [`This month’s change is on ${figSaid('MK-PF-M-001', oneMonth.ending)}: your investment accounts with the cash in them`] : []),
    ...(heroLeftOut ? [spokenDollars(oneMonth.notIncluded as string)] : []),
    ...(heroVs ? [`you ${(youReturn as number) >= 0 ? 'plus' : 'minus'} ${figSaid('MK-XS-M-004', Math.abs(youReturn as number))} (including dividends and interest), `
      + `market ${(marketReturn as number) >= 0 ? 'plus' : 'minus'} ${figSaid('MK-PF-M-008', Math.abs(marketReturn as number))}, `
      + `${(gap as number) >= 0 ? 'ahead' : 'behind'} by ${figSaid('MK-PF-M-027', Math.abs(gap as number))}`] : []),
    freshness ? `${freshness.stale ? 'prices may be out of date, ' : 'prices '}updated ${freshness.label}` : `as of ${asOfToday}`,
    ...(heroStale ? [`${heroStale.who} part as of ${heroStale.asOf}, ${heroStale.daysOld} days old, pull to refresh`] : []),
    'See your growth',
  ].map((l) => l.replace(/\s*›\s*$/, '').replace(/[.\s]+$/, '')).join('. ') + '.';
  const heroBlock = (<>
        {/* HERO — lens-driven */}
        {lens === 'retired' ? (
          <PaycheckCard />
        ) : (
          <TouchableOpacity accessibilityRole="button" style={styles.heroCard} activeOpacity={0.85} onPress={() => router.push('/(tabs)/invest')}
            accessibilityLabel={heroSaid}
            /* EVERY DOOR A FINGER CAN REACH, A SCREEN READER CAN TOO (2026-10-22, W-A11Y): the card is one button, so the "balance
               not entered" line inside it could not be reached on its own. It is offered as the card's action, named with the
               line's own printed words, opening the same Net worth tab the touch press opens — only while the line shows. The
               pattern is the sliders' (RetirementCockpit, PlanSlider): accessibilityActions with onAccessibilityAction. */
            accessibilityActions={heroGapAction ? [heroGapAction] : undefined}
            onAccessibilityAction={(ev) => { if (ev.nativeEvent.actionName === HERO_GAP_ACTION) openGaps(); }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.heroKicker}>YOUR INVESTMENTS</Text>
              <InfoDot term="investments" line={styles.heroKicker} />
            </View>
            <Text style={styles.heroBig} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{maskedMoney(investTotal)}</Text>
            {/* A BALANCE NOT ENTERED, NAMED UNDER THE FIGURE IT IS MISSING FROM (2026-10-21, DEC-3523 tenet 3): the same words as
                the line under Net worth below and the Net worth tab's amber box; it opens the Net worth tab */}
            {investGaps.length > 0 && (
              <TouchableOpacity accessibilityRole="button" style={styles.staleLine} onPress={openGaps}
                accessibilityLabel={`${investGaps.map((g) => g.title).join('. ')}. Opens the Net worth tab.`}>
                <Text style={styles.staleTxt}>⚠ {investGaps[0].title}{investGaps.length > 1 ? ` · and ${investGaps.length - 1} more` : ''} ›</Text>
              </TouchableOpacity>
            )}
            {heroEmpty && <EmptyNote door="accounts" />}   {/* Q48 (MK-XS-M-003) */}
            {/* Build-43 feedback #3: the approved mock shows change + date under the hero ALWAYS —
                hiding them in the empty state made the built screen look nothing like the mock. */}
            {youReturn != null ? (
              /* approved wireframe: "up $11,200 this month ▲up" — DOLLAR and percent, word+arrow.
                 The dollar delta derives from the SAME measured return as the percent shown, so the
                 two can never disagree (accuracy rule: one source per concept). */
              <Text style={styles.heroLine}>
                <Text style={{ color: youReturn >= 0 ? Colors.gainText : Colors.red, fontWeight: '800' }}>
                  {/* the month's return is MK-XS-M-004 and prints under it, so the census can trace it (2026-10-21, outside re-run
                      OpenAI part 1, F4); the screen reader hears the same two decimals (MK-XS-M-004 tenet 4) — it heard one */}
                  {/* the month's dollars are the Performance tab's 1M Wealth generated, printed under its own identifier (MK-PF-M-002,
                      2026-10-22): they printed through maskedMoney, with no identifier */}
                  {youReturn >= 0 ? '▲ up' : '▼ down'} {fig('MK-PF-M-002', Math.abs(youDollar))} ({fig('MK-XS-M-004', Math.abs(youReturn))})
                </Text>
                <Text> this month</Text>
              </Text>
            ) : (
              <Text style={styles.heroLine}>
                {investTotal > 0 ? 'change shows once your holdings have prices' : 'nothing invested yet — connect or add an account to start'}
              </Text>
            )}
            {/* ONE BASE, NAMED (2026-10-21, the lead's decision on MK-PF-M-001 under DEC-3523 tenet 2, over DEC-0457 and Q-PF-1
                together): YOUR INVESTMENTS leaves the cash in investment accounts out (DEC-0457), while the month's change is
                Performance's 1M — the investment accounts whole, their cash included (Q-PF-1, one door). Under $35,775 the line
                read "up $8,200 (21.35%)" measured on $46,600, and nothing said so. Where the two differ, the base is printed
                beneath, the Performance tab's own Ending value. To reverse: delete this line. */}
            {heroBase && (
              <Text style={styles.freshness}>This month’s change is on {fig('MK-PF-M-001', oneMonth.ending)}: your investment accounts with the cash in them.</Text>
            )}
            {/* the holding left out of the month's figures above, in the words Performance uses (DEC-5068, 2026-10-13) */}
            {/* its dollars hidden under hide-balances like every other sentence on Home (maskDollars, spokenDollars) — they showed
                through: "Return is on the $40,000 …" with the balances hidden (2026-10-22, W-A11Y) */}
            {heroLeftOut && <Text style={styles.freshness} accessibilityLabel={spokenDollars(oneMonth.notIncluded as string)}>{maskDollars(oneMonth.notIncluded as string)}</Text>}
            {heroVs && youReturn != null && marketReturn != null && gap != null && (
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* HIS RULING ON Q51 (2026-09-30): "you +3.69% (including dividend and interest),
                    market +2.83%, ahead by 0.85%". The two sides are NOT measured the same way and
                    the line now says so. YOURS counts the dividends and interest you received (his
                    one-meaning-of-return ruling, 2026-09-25); the MARKET figure is the index's price
                    only, because no price feed we hold gives an index's dividends. Without the
                    clarifier the gap read as skill when part of it is simply income the index side
                    cannot see. Written "dividends and interest" — the words the walk, the category
                    table and the glossary already use for these two.
                    Corrected 2026-10-12: the market figure uses SPY and AGG adjusted closes, which include their dividends and interest. His approved wording above stays word for word (DEC-4645). */}
                <DotJoined style={styles.heroVs} parts={[
                  // EACH PRINTED THROUGH ITS IDENTIFIER (DEC-0402 step 2, 2026-10-22): your month MK-XS-M-004, the market MK-PF-M-008,
                  // the gap MK-PF-M-027 — they were written by a percent writer of Home's own, so none could be traced to its row
                  `you ${youReturn >= 0 ? '+' : '−'}${fig('MK-XS-M-004', Math.abs(youReturn))} (including dividends and interest)`,
                  `market ${marketReturn >= 0 ? '+' : '−'}${fig('MK-PF-M-008', Math.abs(marketReturn))}`,
                  `${gap >= 0 ? 'ahead' : 'behind'} by ${fig('MK-PF-M-027', Math.abs(gap))}`,
                ]} />
                <InfoDot term="benchmark" line={styles.heroVs} />
              </View>
            )}
            {/* the DATE line always renders (approved mock; build-43 feedback #3) — freshness when
                prices exist, plain "as of today" for hand-entered balances */}
            {freshness
              ? <Text style={[styles.freshness, freshness.stale && { color: Colors.amber }]}>{freshness.stale ? '⚠ prices may be out of date — ' : 'prices '}updated {freshness.label}</Text>
              : <Text style={styles.freshness}>as of {asOfToday}</Text>}
            {/* Approved 2026-07-31-era mock #4 + founder change (left-justified, in the box): when a
                connection goes 3+ days quiet, the number it feeds says so right here. */}
            {!!heroStale && (
              <DotJoined style={[styles.freshness, { color: Colors.amber }]}
                parts={[`⏱ ${heroStale.who} part as of ${heroStale.asOf} — ${heroStale.daysOld} days old`, 'pull to refresh']} />
            )}
            <Text style={styles.heroLink}>See your growth ›</Text>
          </TouchableOpacity>
        )}
  </>);
  const brokenBlock = (<>
        {/* BROKEN CONNECTION — SnapTrade serves cached data silently when a link breaks; the
            disabled flag is the only tell, so it gets a first-class fix line (their launch
            checklist requires exactly this detection + notification) */}
        {(() => {
          const broken = (store.snaptradeConnections ?? []).find((c: any) => c.disabled);
          if (!broken) return null;
          return (
            <TouchableOpacity accessibilityRole="button" style={styles.staleLine}
              onPress={() => router.push(`/connect?reconnect=${broken.id}` as any)}
              accessibilityLabel={`${broken.brokerage} needs linking again. Opens the fix.`}>
              <Text style={styles.staleTxt}>⚠ {broken.brokerage} needs linking again — fix it ›</Text>
            </TouchableOpacity>
          );
        })()}
  </>);
  const staleBlock = (<>
        {/* STALE CONNECTION — retired lens only: the working hero now carries the in-box stamp */}
        {lens === 'retired' && (() => {
          const stale = (store.assetAccounts ?? [])
            .filter((a: any) => a.source === 'connected')
            .map((a: any) => ({ a, f: connectionFreshness(a.last_synced) }))
            .filter((x: any) => x.f?.stale)
            .sort((x: any, y: any) => y.f.daysOld - x.f.daysOld)[0];
          if (!stale) return null;
          return (
            <TouchableOpacity accessibilityRole="button" style={styles.staleLine} onPress={() => router.push('/(tabs)/analytics')}
              accessibilityLabel={`Balances from ${stale.a.institution ?? stale.a.label} are ${stale.f.daysOld} days old — open Net worth to update them.`}>
              <Text style={styles.staleTxt}>⚠ Balances from {stale.a.institution ?? stale.a.label} are {stale.f.daysOld} days old — tap to update ›</Text>
            </TouchableOpacity>
          );
        })()}
  </>);
  const milestoneBlock = (<>
        {/* MILESTONE — one calm line under the hero, once, dismissed on tap (the strategy's
            stated retention moment; design Home STATES). Fact-toned, never repeated. */}
        {milestone != null && (
          <TouchableOpacity accessibilityRole="button" style={styles.milestoneLine}
            onPress={() => store.setMilestoneHighSeen?.(milestone)}
            accessibilityLabel={`Your net worth just crossed ${milestoneLabel(milestone)}. Tap to dismiss.`}>
            <Text style={styles.milestoneTxt}>Your net worth just crossed {milestoneLabel(milestone)}. <Text style={styles.milestoneDismiss}>✕</Text></Text>
          </TouchableOpacity>
        )}
  </>);
  const nwLineBlock = (<>
        {/* NET WORTH — one quiet line, taps to its one home */}
        <TouchableOpacity accessibilityRole="button" style={styles.nwLine} activeOpacity={0.7} onPress={() => router.push('/(tabs)/analytics')}
         
          accessibilityLabel={`Net worth ${spokenMoney(netWorth)}${nwDir ? `, ${nwDir} since last month` : ''}. Opens the Net worth tab.`}>
          <Text style={styles.nwLabel}>Net worth</Text>
          <InfoDot term="netWorth" line={styles.nwLabel} />
          <Text style={styles.nwValue}>{maskedMoney(netWorth)}</Text>
          {nwDir && <Text style={[styles.nwDir, { color: nwDir === 'up' ? Colors.gainText : Colors.red }]}>{nwDir === 'up' ? '▲ up' : '▼ down'}</Text>}
          <Text style={styles.nwArrow}>›</Text>
        </TouchableOpacity>
        {balanceGaps.length > 0 && (
          <TouchableOpacity accessibilityRole="button" style={styles.staleLine} onPress={() => router.push('/(tabs)/analytics')}
            accessibilityLabel={`${balanceGaps.map((g) => g.title).join('. ')}. Opens the Net worth tab.`}>
            <Text style={styles.staleTxt}>⚠ {balanceGaps[0].title}{balanceGaps.length > 1 ? ` · and ${balanceGaps.length - 1} more` : ''} ›</Text>
          </TouchableOpacity>
        )}
  </>);
  const needsBlock = (<>
        {/* WHAT NEEDS YOU — top 3 from the ONE insights function (same items/order as Insights) */}
        <View style={styles.box}>
          <SectionBand inCard title={`CHIEF OF STAFF — WHAT NEEDS YOU ${topInsights.length > 0 ? `(${topInsights.length})` : ''}`.trim()} />
          {topInsights.length === 0 && <Text style={styles.nothingTxt}>Nothing needs you today — nice.</Text>}
          {topInsights.map((ins, i) => (
            <TouchableOpacity accessibilityRole="button" key={ins.id} style={[styles.needRow, i > 0 && styles.divider]} activeOpacity={0.7}
              onPress={() => ins.route && router.push(ins.route as any)}
             
              accessibilityLabel={`${i + 1}. ${spokenDollars(ins.title)}. ${spokenDollars(ins.body)}`}>
              <Text style={[styles.needRank, i === 0 && styles.needRankTop]}>{i + 1}{i === 0 ? '◆' : '·'}</Text>
              <View style={{ flex: 1 }}>
                {/* function sentences carry dollar figures — mask them, keep the words (the walk test) */}
                <Text style={[styles.needTitle, i === 0 && { fontWeight: '800' }]}>{maskDollars(ins.title)}</Text>
                <Text style={styles.needBody}>{maskDollars(ins.body)}</Text>
                {/* RENT NOT KNOWN (DEC-3836, 2026-10-10): the emergency-fund row states months, so the line sits with them */}
                {ins.rentNotKnownMonths && <RentNotKnownLine months={ins.rentNotKnownMonths} onPress={() => router.push('/income-manager?open=rental' as any)} />}
              </View>
              <Text style={styles.nwArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
  </>);
  const gaugeBlock = (<>
        {/* WILL MY MONEY LAST? — Home displays the one selector's number; Plan is its home */}
        {/* FOUNDER RULE 2026-08-11: "See your real odds" opens THE SAME screen wherever it is tapped —
            Home, Net worth or Plan. Until the odds exist it goes to the three questions; once they do,
            it goes to the Plan tab where the full picture lives. */}
        <TouchableOpacity accessibilityRole="button" style={styles.box} activeOpacity={0.85}
          onPress={() => router.push('/(tabs)/plan' as any)}
         
          accessibilityLabel={wil.chance != null
            ? `Will my money last: ${wil.chance} percent odds of lasting to age ${wil.horizonAge}, an estimate. Opens Plan.`
            : `Will my money last: sample gauge, sample 84 percent odds of lasting to age ${wil.horizonAge}, not your number. Three quick answers show your real odds — questions, not a purchase. Opens Plan.`}>
          <SectionBand inCard title="WILL MY MONEY LAST?" />
          {wil.chance != null ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
              <Text style={styles.wilTxt}>{figWords('MK-XS-M-002', oddsLine(resolveLens(op ?? {}, store.lensOverride), wil.chance, wil.horizonAge))} <Text style={styles.wilEst}>— estimate</Text></Text>
              <InfoDot term="estimate" line={styles.wilTxt} />
            </View>
          ) : (
            // founder 2026-07-15: a living tease of the prediction function, never a chore — the full
            // gauge visual, LOCKED, with the number visibly blank (a fake 88% would be a trust bug)
            <View style={styles.gaugeRow}>
              <View accessible={false}>
                <Svg width={104} height={60} viewBox="0 0 104 60">
                  {['M 8 56 A 44 44 0 0 1 17.4 29.2', 'M 21.2 24.4 A 44 44 0 0 1 44.6 8.6', 'M 50.6 7.2 A 44 44 0 0 1 74.9 12.9', 'M 80.1 16.4 A 44 44 0 0 1 93.9 39.1', 'M 95.6 44.9 A 44 44 0 0 1 96 56'].map((d, i) => (
                    <Path key={d} d={d} stroke={GaugeRamp[i]} strokeWidth={9} strokeLinecap="round" fill="none" opacity={0.9} />
                  ))}
                </Svg>
                <Text style={styles.gaugeLock}>🔒</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.gaugeLine}>
                  <Text style={styles.gaugeBlank}><Text style={styles.gaugeSampleNum}>{sampleOddsLine(wil.horizonAge)}</Text></Text>
                </View>
                <Text style={styles.wilInvite}>3 quick answers unlock your real number</Text>
              </View>
            </View>
          )}
          <Text style={styles.heroLink}>{wil.chance != null ? 'See the full picture ›' : 'See your real odds ›'}</Text>
        </TouchableOpacity>
  </>);
  const cashflowBlock = (<>
        {/* THIS MONTH'S CASH FLOW — the dashboard readout (founder 2026-07-15): what came in against what went out, at a
            glance. The three figures are the Cash flow tab's own (theMonth's actual block, 2026-10-23) — Home calculates none */}
        {(() => {
          // the approved mock (2026-07-16): pace carries a WORD (never color alone) + the three
          // money figures at money size — Income / Outflow (expenses + debt) / Left in 17pt lining figures
          // NO PACE WORD BEFORE INCOME IS ENTERED (2026-10-23, tenet 3: unknown is not zero). With no income and nothing spent
          // the box showed the red "Over" above "Income $0 · Nothing entered yet · Left $0" — an answer where nothing is known
          // (outside re-run of Performance, MK-CF-M-053 tenet 3). Cash flow draws no surplus then (its two set-up steps), so
          // Home shows none either: Left reads — and the line under Income says why.
          // a wage entered that cannot be read (R23a, 2026-11-01, FX-CF-B): no income figure rests on it — the line says why
          const wageRefusal = gate.wageRefusal;
          const incomeKnown = (cf.inflow > 0 || hasIncomeEntered) && !wageRefusal;
          const over = cf.outflow > cf.inflow;
          const fast = !over && cf.outflow > 0.7 * cf.inflow;
          const pace = !incomeKnown || (cf.inflow <= 0 && cf.outflow <= 0) ? null
            : over ? { word: 'Over', bg: Colors.redLight, fg: Colors.red }
            : fast ? { word: 'Expenses running fast', bg: Colors.amberLight, fg: Colors.amber }
            : { word: '✓ On pace', bg: Colors.primaryLight, fg: Colors.primaryDark };
          const pctSpent = pace && cf.inflow > 0 ? Math.min(999, percentValue(cf.outflow / cf.inflow, 0)) : null;
          const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
          // THE THREE AS THE CASH FLOW TAB PRINTS THEM (2026-10-24 — tenet 2; Cash flow journey E2E-69): Income less Outflow is
          // Left on the screen. A $6.50 coffee read Income $5,000 · Outflow $4,107 · Left $894, each rounded alone. The outflow is
          // the door's own, made by MK-CF-F-194 monthOutflow (his DEC-0333): printed whole through flowShown, never re-added
          // from the rows here (it was monthShown of the rows until 2026-10-24 — the same dollars, from a second sum)
          const shown = flowShown(cf.inflow, cf.outflow);
          const left = shown.surplus;
          // A FIGURE WORKED FROM AN ESTIMATE WEARS ITS MARK (2026-11-02, R26 round; CF6-18, tenet 4): Left is Income less Outflow, so
          // when the take-home is the app's calculation Left wears the '~' Income wears — 'Income ~$3,995' read 'Left $3,995'
          const approx = takeHomeCalculated && shown.inflow > 0 ? '~' : '';
          const approxSaid = approx ? 'about ' : '';
          const inSaid = `${approxSaid}${spokenMoney(shown.inflow)}`;   // the Income cell, said once (the inflow beside a wage not read, R26)
          return (
            <TouchableOpacity accessibilityRole="button" style={styles.box} activeOpacity={0.85} onPress={() => router.push('/(tabs)/cashflow')}
              accessibilityLabel={`This month’s cash flow${pace ? `, ${pace.word.replace('✓ ', '')}` : ''}: income ${wageRefusal ? `${shown.inflow > 0 ? `${inSaid}, ` : ''}${wageRefusal.replace(/\.$/, '')}` : incomeKnown ? inSaid : 'not entered'}, expenses and debt paid so far ${spokenMoney(shown.outflow)}, ${wageRefusal ? 'nothing left is shown until your pay can be read' : !incomeKnown ? 'nothing left is shown until your income is entered' : left >= 0 ? `${approxSaid}${spokenMoney(left)} left, bills may still be coming` : `${approxSaid}${spokenMoney(-left)} over`}. Opens the Cash flow tab.`}
              // THE DOOR INSIDE THE BOX, AS THE BOX'S ACTION (2026-10-24, Cash flow journey E2E-78): "Add your income ›" sits inside
              // this one element, so a screen reader could not reach it; it is offered as the box's action, in its own words
              accessibilityActions={!incomeKnown && !wageRefusal ? [{ name: 'addIncome', label: EMPTY_DOORS.income.label.replace(' ›', '') }] : undefined}
              onAccessibilityAction={(e) => { if (e.nativeEvent.actionName === 'addIncome') router.push(EMPTY_DOORS.income.route as any); }}>
              <SectionBand inCard title={"THIS MONTH’S CASH FLOW"} />
              <View style={styles.paceRow}>
                {pace && <Text style={[styles.paceChip, { backgroundColor: pace.bg, color: pace.fg }]}>{pace.word}</Text>}
                {/* the pace line goes with the pace word: before income it is not shown at all — the row lists Income $0 · Nothing
                    entered yet · Outflow $0 · Left —, and no "day 20 of 31" (2026-10-25, HM-01) */}
                {pace && <Text style={styles.paceNote}>{pctSpent != null ? `${pctSpent}% spent · ` : ''}day {now.getDate()} of {daysInMonth}</Text>}
              </View>
              <View style={styles.cfBarTrack}>
                <View style={[styles.cfBarFill, {
                  width: `${pace ? Math.min(100, cf.inflow > 0 ? (cf.outflow / cf.inflow) * 100 : (cf.outflow > 0 ? 100 : 0)) : 0}%`,
                  backgroundColor: over ? Colors.red : fast ? Colors.amber : Colors.primary,
                }]} />
              </View>
              <View style={styles.cfRow}>
                {/* the tab's own form of the figure: a take-home the app calculated wears ≈, one typed never (2026-10-25, CF-24) */}
                <View style={styles.cfCell}><Text style={styles.cfLabel}>Income</Text>{wageRefusal && !(shown.inflow > 0) ? <Text style={styles.cfNum}>—</Text> : <Text style={styles.cfNum}>{approx}{fig('MK-CF-M-051', shown.inflow)}</Text>}{wageRefusal ? <Text style={styles.cfLabel}>{wageRefusal}</Text> : !incomeKnown && <EmptyNote door="income" />}</View>
                {/* the expenses AND the debt paid — Cash flow's "Outflow (expenses + debt)" (DEC-0269). It read "Actual expenses so
                    far" and left the debt paid out (2026-10-23) */}
                <View style={styles.cfCell}><Text style={styles.cfLabel}>Outflow (expenses + debt)</Text><Text style={styles.cfNum}>{fig('MK-CF-M-052', shown.outflow)}</Text></View>
                <View style={styles.cfCell}>
                  <Text style={styles.cfLabel}>{!incomeKnown || left >= 0 ? 'Left' : 'Over'}</Text>
                  {/* the size rounded, then the word — as Cash flow writes its signed surplus, so the two read the same dollar */}
                  <Text style={[styles.cfNum, { color: !incomeKnown ? Colors.textSecondary : left >= 0 ? Colors.primaryDark : Colors.red }]}>{incomeKnown ? `${approx}${fig('MK-CF-M-053', Math.abs(left))}` : '—'}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })()}
  </>);

  // DESKTOP (approved shell mock, Home window, 2026-08-03): glance LEFT (net worth · gauge ·
  // this month) | chief-of-staff + the investments TABLE RIGHT. Same blocks, zero forked math.
  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bgSecondary }}>
        <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onPull} />}>
          <View style={styles.headRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sub}>Good {greeting()}</Text>
              <Text style={styles.h1}>{name}</Text>
            </View>
          </View>
          <HiddenBalancesBanner />
          {store.priceRefreshFailed && (
            <Text style={styles.offlineBanner}>
              📡 Couldn’t refresh — showing your numbers from {store.pricesFetchedAt
                ? new Date(store.pricesFetchedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + new Date(store.pricesFetchedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                : 'your last session'}.
            </Text>
          )}
          {brokenBlock}{staleBlock}{milestoneBlock}
          <View style={styles.deskCols} testID="home-desktop-columns">
            <View style={styles.deskCol} testID="home-desktop-left">
              {lens === 'retired' && heroBlock}
              {nwLineBlock}
              {gaugeBlock}
              {cashflowBlock}
            </View>
            <View style={styles.deskCol} testID="home-desktop-right">
              {needsBlock}
              {lens !== 'retired' && heroBlock}
              <DesktopInvestTable accounts={resolvedRows.accounts} showHeader={lens === 'retired'} />
            </View>
          </View>
          <Disclaimer />
          <View style={{ height: 40 }} />
        </ScrollView>
        <AllocateSavings state={allocSheet} onClose={() => setAllocSheet({ open: false })} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bgSecondary }}>
      <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onPull} />}>
        <View style={styles.headRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sub}>Good {greeting()}</Text>
            <Text style={styles.h1}>{name}</Text>
          </View>
        </View>

        <HiddenBalancesBanner />

        {/* OFFLINE/COULDN'T-REFRESH (mock approved 2026-07-31 — banner only; the screen stays as
            agreed): the saved numbers keep showing with their honest as-of time. */}
        {store.priceRefreshFailed && (
          <Text style={styles.offlineBanner}>
            📡 Couldn’t refresh — showing your numbers from {store.pricesFetchedAt
              ? new Date(store.pricesFetchedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + new Date(store.pricesFetchedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
              : 'your last session'}.
          </Text>
        )}

        {heroBlock}
        {brokenBlock}
        {staleBlock}
        {milestoneBlock}
        {nwLineBlock}
        {needsBlock}
        {gaugeBlock}
        {cashflowBlock}
        <Disclaimer />
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* founder decision 2026-07-16: no '+ Expense' button on Home — logging lives on Cash flow */}
      <AllocateSavings state={allocSheet} onClose={() => setAllocSheet({ open: false })} />
    </View>
  );
}

function greeting() { const h = new Date().getHours(); return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'; }
/** One decimal place. domain/insights has a whole-number pctTxt; two precisions must not share
 *  one name. */
// Q49 (founder, 2026-09-09): a percent shows TWO decimals. This printed the hero return to one,
// so a +0.54% month read as +0.5% on the first screen a person sees — the same defect the founder
// found on Performance, in the place it is most visible.
/** The hero card's spoken action for its "balance not entered" line (2026-10-22). */
export const HERO_GAP_ACTION = 'openNetWorthGaps';
// (Home's own percent writers, pctTwoDp and signedPct, are gone: the glance line prints through fig() — DEC-0402, 2026-10-22)

const styles = StyleSheet.create({
  // desktop two-column (approved shell mock: 1fr/1fr, 16 gap)
  deskCols: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  deskCol: { flex: 1, minWidth: 0 },
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.lg, paddingTop: Spacing.xl },
  // Type sizes on this screen come from the official ladder only (11/13/15/17/20/24/38) —
  // approved mock 2026-07-16; money figures use lining (tabular) digits so columns align.
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  h1: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 13, color: Colors.textSecondary },
  staleLine: { backgroundColor: Colors.amberLight, borderRadius: Radii.md, paddingVertical: 9, paddingHorizontal: 12, marginBottom: Spacing.sm, minHeight: 44, justifyContent: 'center' },
  staleTxt: { fontSize: 13, fontWeight: '700', color: Colors.amber },
  milestoneLine: { backgroundColor: Colors.primaryLight, borderRadius: Radii.md, paddingVertical: 9, paddingHorizontal: 12, marginBottom: Spacing.sm, minHeight: 44, justifyContent: 'center' },
  milestoneTxt: { fontSize: 13, fontWeight: '700', color: Colors.primaryDark },
  milestoneDismiss: { color: Colors.textTertiary, fontWeight: '800' },
  offlineBanner: { fontSize: 13, fontWeight: '600', color: Colors.blue, backgroundColor: Colors.blueLight, borderRadius: Radii.md, paddingVertical: 8, paddingHorizontal: 12, marginBottom: Spacing.sm, overflow: 'hidden' },
  hiddenBanner: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, backgroundColor: Colors.bgTertiary, borderRadius: Radii.md, paddingVertical: 6, paddingHorizontal: 10, marginBottom: Spacing.sm, overflow: 'hidden' },
  coin: { fontSize: 38, textAlign: 'center', marginBottom: 10 },
  cta: { backgroundColor: Colors.primary, borderRadius: Radii.lg, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.lg, minHeight: 50, justifyContent: 'center' },
  ctaText: { color: Colors.white, fontWeight: '700', fontSize: 17 },
  door: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginTop: Spacing.sm, minHeight: 64, justifyContent: 'center' },
  doorPrimary: { borderWidth: 1.5, borderColor: Colors.primary },
  doorTitle: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  doorSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 3, lineHeight: 18 },
  soonChip: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary },
  quietLink: { fontSize: 15, fontWeight: '700', color: Colors.primary, marginTop: Spacing.md, minHeight: 44, textAlignVertical: 'center', paddingVertical: 12 },
  promiseLine: { fontSize: 15, color: Colors.textSecondary, lineHeight: 24 },

  heroCard: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  heroKicker: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.7 },
  heroBig: { fontSize: 38, fontWeight: '800', color: Colors.textPrimary, marginTop: 2, fontVariant: ['tabular-nums'] },
  heroLine: { fontSize: 15, color: Colors.textPrimary, marginTop: 4 },
  // flexShrink lets this WRAP inside its row (2026-09-30). React Native defaults flexShrink to 0,
  // so before his Q51 clarifier made the line longer it happened to fit and nothing wrapped; a
  // longer string would have run off the card edge instead of onto a second line.
  heroVs: { fontSize: 13, color: Colors.textSecondary, marginTop: 3, fontVariant: ['tabular-nums'], flexShrink: 1 },
  freshness: { fontSize: 13, color: Colors.textTertiary, marginTop: 4 },
  heroLink: { fontSize: 15, fontWeight: '700', color: Colors.primary, marginTop: 10, minHeight: 32, textAlignVertical: 'center' },

  nwLine: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardBg, borderRadius: Radii.lg, paddingHorizontal: Spacing.md, paddingVertical: 13, marginBottom: Spacing.sm, gap: 8, minHeight: 48 },
  nwLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  nwValue: { flex: 1, fontSize: 17, fontWeight: '800', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  nwDir: { fontSize: 13, fontWeight: '800' },
  nwArrow: { fontSize: 20, color: Colors.textTertiary },

  box: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  boxLabel: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.7, marginBottom: 4 },
  nothingTxt: { fontSize: 15, color: Colors.textSecondary, paddingVertical: 8 },
  needRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, minHeight: 44 },
  divider: { borderTopWidth: 1, borderTopColor: Colors.border },
  needRank: { fontSize: 13, fontWeight: '700', color: Colors.textTertiary, width: 26 },
  needRankTop: { color: Colors.primary, fontWeight: '800' },
  needTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  needBody: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },

  wilTxt: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  wilEst: { fontSize: 13, fontWeight: '500', color: Colors.textTertiary },
  wilInvite: { fontSize: 15, color: Colors.textSecondary, marginTop: 4, lineHeight: 20 },
  gaugeRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 6 },
  gaugeLock: { position: 'absolute', alignSelf: 'center', top: 26, fontSize: 20 },
  gaugeBlank: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  gaugeLine: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  gaugeSampleNum: { fontWeight: '800', color: Colors.textTertiary, fontStyle: 'italic' },
  paceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  paceChip: { fontSize: 13, fontWeight: '800', borderRadius: 10, paddingVertical: 3, paddingHorizontal: 9, overflow: 'hidden' },
  paceNote: { fontSize: 13, color: Colors.textTertiary, fontVariant: ['tabular-nums'] },
  cfBarTrack: { height: 12, borderRadius: 6, backgroundColor: Colors.bgTertiary, marginTop: 8, overflow: 'hidden' },
  cfBarFill: { height: 12, borderRadius: 6 },
  cfRow: { flexDirection: 'row', marginTop: 12 },
  cfCell: { flex: 1 },
  cfLabel: { fontSize: 13, color: Colors.textSecondary },
  cfNum: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, marginTop: 2, fontVariant: ['tabular-nums'] },
});
