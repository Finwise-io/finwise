// Retirement — two screens.
// Screen 1 "Where you stand" (current, fact-based): nest-egg donut (earmarked, editable per-account) +
//   blended expected return from per-type benchmarks (editable) + a green insight ("retire at age Y even
//   if you never save again", based on CURRENT nest egg & benchmark return — not the scenario) + Social
//   Security (asked once) + a button into scenario analysis.
// Screen 2 "Scenario analysis": what-if sliders → projected-nest-egg hero (deterministic, live) +
//   Monte-Carlo confidence + percentile band (on release) + save/compare scenarios.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Switch, Modal, PanResponder, KeyboardAvoidingView, Platform, type LayoutChangeEvent } from 'react-native';
import Svg, { Path, Line, Circle, G, Rect, Text as SvgText } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { moneyCompact, currencySymbol } from '../domain/_shared/money';
import { simulate, projectNestEgg, solveRetireAge, retirementSpendMonthly } from '../domain/retirement';
import { colFactor } from '../domain/retirement/col';
import { retirementEarmarkedValue, earmarkedAmount, earmarkDefault, assetKind, ASSET_KINDS, ASSET_SECTIONS, blendedReturn, benchmarkReturn, benchmarkInfo, portfolioActualReturn, monthlyContributionsFromOnboarding, type AssetAccount } from '../domain/assets';
import { resolveNetWorthRows } from '../domain/snapshot';
import { taxBucketSplit, withdrawalPlan, depletionAge, withdrawalOrder, rmdAtAge, rmdDivisor, RMD_START_AGE } from '../domain/decumulation';
import { k401Headroom, annualIraLimit, rothVsTraditional, rothConversionWindow } from '../domain/income/limits';
import { marginalBracket } from '../domain/income/tax';
import { totalGrossAnnual, retirementIncomeMonthly } from '../domain/income';

const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };
const big = (n: number) => moneyCompact(n, 'M');
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const volOf = (ret: number) => clamp(ret * 1.7, 0.05, 0.2);            // higher return ⇒ more volatility
const SECTION_COLOR: Record<string, string> = { Cash: '#178F6B', Investments: '#7A5AA7', Retirement: '#185FA5', Property: '#EBB23A' };
const sectionOf = (a: AssetAccount) => assetKind(a.kind)?.section ?? (a.tax_bucket === 'CASH' ? 'Cash' : a.tax_bucket === 'PROPERTY' ? 'Property' : a.tax_bucket === 'TAXABLE' ? 'Investments' : 'Retirement');

export default function RetirementCockpit() {
  const router = useRouter();
  const store = useStore() as any;
  useEffect(() => { store.maybeRefreshPrices?.(); }, []);   // nest egg tracks live market value
  const op = store.onboardingProfile ?? {};
  const A = store.retirementAssumptions ?? {};
  const setA = store.setRetirementAssumptions as (p: any) => void;
  // Use the SAME seeded source the Home net-worth box uses: when the user hasn't added live accounts
  // yet, fall back to the onboarding-captured portfolio (else the nest egg shows $0 despite NW > 0).
  const assets: AssetAccount[] = resolveNetWorthRows(
    store.user?.uid ?? 'me', op, store.nwSeeded ?? false, store.assetAccounts ?? [], store.liabilities ?? [],
  ).accounts;

  const [screen, setScreen] = useState<'current' | 'scenario'>('current');
  const [showDetails, setShowDetails] = useState(false);   // Simple: reveal the Advisor detail cards inline
  const [earmarkOpen, setEarmarkOpen] = useState(false);
  const [ssOpen, setSsOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [ttmEdit, setTtmEdit] = useState<AssetAccount | null>(null);
  const [kindPick, setKindPick] = useState<AssetAccount | null>(null);

  // ---- data-derived ----
  const age = op.birthYear ? new Date().getFullYear() - num(op.birthYear) : 45;
  const nestEgg = retirementEarmarkedValue(assets);
  // Money you want to LEAVE behind isn't spendable in retirement — reserve it so "will it last"
  // reflects what you can actually draw down. (nestEgg = what you have; spendableEgg = what you can spend.)
  const bequest = num(op.legacyTarget);
  const spendableEgg = Math.max(0, nestEgg - bequest);
  const benchBlended = blendedReturn(assets);                          // historic blended benchmark — NOT editable
  const actualBlended = portfolioActualReturn(assets);                 // weighted actual TTM from per-holding entries (may be null)
  const returnBasis: 'benchmark' | 'actual' | 'scenario' = A.returnBasis ?? 'benchmark';
  // growth rate that drives the projection + heroes — user picks which basis to use
  const scenarioReturn = A.expectedReturn ?? benchBlended;
  const growthRate = returnBasis === 'actual' ? (actualBlended ?? benchBlended) : returnBasis === 'scenario' ? scenarioReturn : benchBlended;
  const basisLabel = returnBasis === 'actual' ? 'your 12-month return' : returnBasis === 'scenario' ? 'your scenario return' : 'the blended benchmark';
  const inflDefault = (store.inflationRate ?? 2.5) / 100;
  // B-31: guaranteed income defaults from EVERYTHING onboarding captured (Social Security + pension
  // + annuities/withdrawals), cadence-normalized — not just ri_ss. If the user never touched the
  // on-screen Social Security editor (ssEligible == null), use that onboarding figure rather than $0;
  // an explicit "Not eligible" still zeroes it.
  // Keep full precision (DR-5): round only at DISPLAY via money(). Rounding the monthly figure here
  // and then ×12 dropped a few $/yr vs Money's totalGrossAnnual (e.g. $24,333.33→$24,333 → −$4/yr).
  const guaranteedDefault = retirementIncomeMonthly(op);
  const ssDefault = guaranteedDefault;
  const hasPension = num(op.ri_pension) > 0;
  const contribDefault = Math.round(monthlyContributionsFromOnboarding(op));
  const spendDefault = Math.round(retirementSpendMonthly(op) || num(op.monthlySpending) || 5000);
  // B-37: never default a retiree's "retire age" below their current age (an already-retired 74yo
  // must not be told the plan "assumes age 65"). Use their current age as the floor when retired.
  const retireDefault = num(op.targetRetirementAge) || (store.employmentStatus === 'retired' ? age : 65);
  const horizon = A.horizonAge ?? (num(op.horizonAge) || 90);
  const ssEligibleEffective = A.ssEligible == null ? guaranteedDefault > 0 : A.ssEligible;
  const ssIncome = ssEligibleEffective ? (A.ssMonthly ?? ssDefault) : 0;
  const claimAge = A.ssClaimAge ?? 67;

  // ---- YOUR PLAN (committed) — drives Screen 1; NOT the scenario sliders ----
  const planRetireAge = A.retireAge ?? retireDefault;
  const planSave = A.contribMonthly ?? contribDefault;
  const planSpend = A.spendMonthly ?? spendDefault;
  const planInfl = A.inflation ?? inflDefault;        // your applied inflation if set, else ACTUAL (economic data)
  const inflIsActual = A.inflation == null;
  const planGrowth = growthRate;                      // from the basis selector (benchmark / 12-mo / scenario)
  const planSalaryGrowth = A.salaryGrowth ?? 0;       // raises applied to contributions each year (0 by default)
  const isRetired = store.employmentStatus === 'retired' || age >= planRetireAge;
  const simple = (store.displayMode ?? 'simple') === 'simple';   // hide technical detail in Simple mode
  const advisor = !simple || showDetails;                         // show the mechanics when in Advisor or expanded
  const commit = (patch: any) => setA(patch);

  const planInputs = (over: any = {}) => ({
    current_age: age,
    retire_age: isRetired ? age : Math.max(age + 1, planRetireAge),
    horizon_age: Math.max((isRetired ? age : planRetireAge) + 1, horizon),
    start_balance: isRetired ? spendableEgg : nestEgg,   // retired: draw down only what's not reserved for legacy
    annual_contribution: (isRetired ? 0 : planSave) * 12,
    contribution_growth: planSalaryGrowth,
    retire_monthly_spend_today: planSpend,
    guaranteed_monthly_income: ssIncome,
    guaranteed_start_age: claimAge,
    inflation: planInfl,
    mean_return: planGrowth,
    vol_return: volOf(planGrowth),
    paths: 400, seed: 42,
    ...over,
  });

  // Screen 1 LEFT hero — age you could retire on today's egg with NO more saving (uses the plan growth)
  const retireAtAge = useMemo(() => solveRetireAge(planInputs({ annual_contribution: 0, mean_return: planGrowth })),
    [age, nestEgg, planGrowth, planInfl, planSpend, ssIncome, claimAge, horizon]);
  const spendEscFromAge = isRetired ? age : planRetireAge;
  const spendHi = Math.round(planSpend * Math.pow(1 + planInfl, Math.max(0, horizon - spendEscFromAge)));

  // Screen 1 RIGHT hero confidence — Monte Carlo on the PLAN (summary % only; the band chart is gated on Screen 2)
  const [planChance, setPlanChance] = useState<number | null>(null);
  useEffect(() => { setPlanChance(simulate(planInputs()).chance_of_success); },
    [age, nestEgg, planRetireAge, planSave, planSpend, planInfl, planGrowth, ssIncome, claimAge, horizon]);
  const level = planChance == null ? Colors.textTertiary : planChance >= 80 ? Colors.primary : planChance >= 60 ? Colors.amber : Colors.red;

  // donut segments (earmarked, grouped by section, Net-Worth colors)
  const earmarked = assets.filter((a) => earmarkedAmount(a) > 0);
  const bySection: Record<string, { amt: number; full: boolean }> = {};
  earmarked.forEach((a) => {
    const sec = sectionOf(a); const pct = a.retirement_pct == null ? earmarkDefault(a) : a.retirement_pct;
    (bySection[sec] ||= { amt: 0, full: true }); bySection[sec].amt += earmarkedAmount(a); if (pct < 100) bySection[sec].full = false;
  });
  const segs = ASSET_SECTIONS.filter((s) => (bySection[s]?.amt ?? 0) > 0).map((s) => ({ label: s, amt: bySection[s].amt, full: bySection[s].full, color: SECTION_COLOR[s] }));

  // instruments: each earmarked investment holding (property excluded) with its benchmark + source/period
  const instruments = earmarked
    .filter((a) => a.tax_bucket !== 'PROPERTY')
    .map((a) => ({ a, info: benchmarkInfo(a.kind) }))
    .sort((x, y) => earmarkedAmount(y.a) - earmarkedAmount(x.a));

  // beating-benchmark: actual portfolio return vs the blended benchmark. Portfolio actual =
  // explicit override if set, else value-weighted from the per-instrument actuals the user entered.
  const actualReturn: number | null = actualBlended;                                    // weighted from per-holding entries
  const beatBy = actualReturn != null ? actualReturn - benchBlended : null;             // +ve = ahead of benchmark

  // projected nest-egg, end of each year up to retirement (blended return + current contributions).
  // Span runs to the target retire age (clamped 3–20 yrs); contributions stop once retired, so the
  // trajectory doesn't overstate the nest egg past retirement.
  const projYears = useMemo(() => {
    const out: { year: number; age: number; bal: number; isRetire: boolean }[] = [];
    const retAge = Math.round(planRetireAge);
    const span = clamp(retAge - age, 3, 20);
    let bal = nestEgg;
    const yr0 = new Date().getFullYear();
    for (let i = 1; i <= span; i++) {
      const a = age + i;
      bal = bal * (1 + planGrowth) + (a <= retAge ? planSave * 12 : 0);
      out.push({ year: yr0 + i, age: a, bal, isRetire: a === retAge });
    }
    return out;
  }, [nestEgg, planGrowth, planSave, age, planRetireAge]);
  const hasRetireBar = projYears.some((d) => d.isRetire);

  // ---- DECUMULATION (retired "will it last?") ----
  const dSplit = taxBucketSplit(assets);
  const dPlan = withdrawalPlan(planSpend, ssIncome, spendableEgg);
  const dDeplete = depletionAge({ age, horizon, nestEgg: spendableEgg, netWithdrawalNow: dPlan.netWithdrawal, returnRate: planGrowth, inflation: planInfl });
  const dOrder = withdrawalOrder(dSplit, age);
  const dRmd = rmdAtAge(dSplit.preTax, Math.max(age, RMD_START_AGE));   // first-year RMD on pre-tax balances
  const rateColor = dPlan.rateBand === 'safe' ? Colors.primary : dPlan.rateBand === 'moderate' ? Colors.amber : Colors.red;

  // ---- TAX-SMART MOVES ----
  const annual401k = num(op.c_401k) * 12;
  const k401 = k401Headroom(age, annual401k);
  const marginalNow = marginalBracket(totalGrossAnnual(op));
  const marginalRetire = marginalBracket(planSpend * 12);
  const rvt = rothVsTraditional(marginalNow, marginalRetire);
  const inRothWindow = rothConversionWindow(age, Math.round(planRetireAge), claimAge);
  // transparency: split the final projected balance into starting egg + contributions you add + growth
  const projEnd = projYears.length ? projYears[projYears.length - 1].bal : nestEgg;
  const projContrib = projYears.reduce((t, d) => t + (d.age <= Math.round(planRetireAge) ? planSave * 12 : 0), 0);
  const projGrowth = Math.max(0, projEnd - nestEgg - projContrib);

  // ---- SCENARIO sandbox (Screen 2 only) — starts from the plan, never writes back unless "Use as my plan" ----
  const [rAge, setRAge] = useState<number>(planRetireAge);
  const [retPct, setRetPct] = useState<number>(Math.round(planGrowth * 1000) / 10);
  const [saveMo, setSaveMo] = useState<number>(planSave);
  const [spendMo, setSpendMo] = useState<number>(planSpend);
  const [inflPct, setInflPct] = useState<number>(Math.round(planInfl * 1000) / 10);
  const [salGrow, setSalGrow] = useState<number>(Math.round((A.salaryGrowth ?? 0) * 1000) / 10);   // raises %/yr
  const [scChance, setScChance] = useState<number | null>(null);
  const [scBand, setScBand] = useState<any>(null);
  const resetSandbox = () => {
    setRAge(planRetireAge); setRetPct(Math.round(planGrowth * 1000) / 10); setSaveMo(planSave);
    setSpendMo(planSpend); setInflPct(Math.round(planInfl * 1000) / 10); setScChance(null); setScBand(null);
  };
  const openScenario = () => { resetSandbox(); setScreen('scenario'); };
  const loadScenario = (a: any) => {
    setRAge(a.retireAge ?? planRetireAge); setRetPct(Math.round((a.expectedReturn ?? planGrowth) * 1000) / 10);
    setSaveMo(a.contribMonthly ?? planSave); setSpendMo(a.spendMonthly ?? planSpend);
    setInflPct(Math.round((a.inflation ?? planInfl) * 1000) / 10); setSalGrow(Math.round((a.salaryGrowth ?? A.salaryGrowth ?? 0) * 1000) / 10); setScChance(null); setScBand(null);
  };
  const scRetired = store.employmentStatus === 'retired' || age >= rAge;
  const scInputs = (over: any = {}) => ({
    current_age: age, retire_age: scRetired ? age : Math.max(age + 1, rAge),
    horizon_age: Math.max((scRetired ? age : rAge) + 1, horizon), start_balance: nestEgg,
    annual_contribution: (scRetired ? 0 : saveMo) * 12, contribution_growth: salGrow / 100, retire_monthly_spend_today: spendMo,
    guaranteed_monthly_income: ssIncome, guaranteed_start_age: claimAge,
    inflation: inflPct / 100, mean_return: retPct / 100, vol_return: volOf(retPct / 100),
    paths: 400, seed: 42, ...over,
  });
  const scProj = projectNestEgg(scInputs());
  // two-up hero: today's nest egg → projected balance at the horizon (reacts to every slider).
  // Retiree: roll the drawdown forward 10 yrs (grow at return, subtract inflation-rising net spend).
  // Accumulator: the projected nest egg AT retirement (projectNestEgg already grows it with return).
  const scHorizonYears = Math.min(10, Math.max(1, horizon - age));
  const scProjected = scRetired ? (() => {
    let bal = nestEgg; let net = Math.max(0, (spendMo - ssIncome) * 12); const r = retPct / 100, f = inflPct / 100;
    for (let y = 0; y < scHorizonYears; y++) { bal = bal * (1 + r) - net; if (bal <= 0) { bal = 0; break; } net = net * (1 + f); }
    return Math.round(bal);
  })() : Math.round(scProj.will_have);
  const scProjLabel = scRetired ? `In ${scHorizonYears} years` : `At retirement (${rAge})`;
  const scDelta = scProjected - nestEgg;
  const scDeplete = scRetired ? depletionAge({ age, horizon, nestEgg, netWithdrawalNow: Math.max(0, (spendMo - ssIncome) * 12), returnRate: retPct / 100, inflation: inflPct / 100 }) : null;
  const runMC = () => { const s = simulate(scInputs({ with_band: true })); setScChance(s.chance_of_success); setScBand(s.band); };
  const invalidateMC = () => { if (scChance != null || scBand != null) { setScChance(null); setScBand(null); } };  // input changed → require re-run
  const scLevel = scChance == null ? Colors.textTertiary : scChance >= 80 ? Colors.primary : scChance >= 60 ? Colors.amber : Colors.red;
  const useAsPlan = () => { commit({ retireAge: rAge, contribMonthly: saveMo, spendMonthly: spendMo, expectedReturn: retPct / 100, inflation: inflPct / 100, salaryGrowth: salGrow / 100, returnBasis: 'scenario' }); setScreen('current'); };

  // ───────────────── SCREEN 2 — SCENARIO ─────────────────
  if (screen === 'scenario') {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: Colors.bgSecondary }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topbar}>
          <TouchableOpacity onPress={() => setScreen('current')}><Text style={styles.back}>‹ Where you stand</Text></TouchableOpacity>
          <Text style={styles.sandboxTag}>SANDBOX</Text>
        </View>

        <Text style={styles.section}>{scRetired ? 'ADJUST YOUR PLAN — DRAG TO EXPLORE' : 'WHAT IF? — DRAG TO EXPLORE'}</Text>
        <Text style={styles.note}>This is a what-if sandbox. It won't change your plan until you tap “Use as my plan”.</Text>

        {/* HERO — two-up: today → projected at the horizon (reacts to the sliders) */}
        <View style={[styles.heroCard, { marginTop: 8 }]}>
          <View style={styles.heroTwoUp}>
            <View style={styles.heroCol}>
              <Text style={styles.heroColLabel}>Nest egg today</Text>
              <Text style={styles.heroColNum}>{big(nestEgg)}</Text>
            </View>
            <Text style={styles.heroArrow}>→</Text>
            <View style={styles.heroCol}>
              <Text style={styles.heroColLabel}>{scProjLabel}</Text>
              <Text style={[styles.heroColNum, { color: scDelta >= 0 ? Colors.primary : Colors.red }]}>{big(scProjected)}</Text>
              <Text style={[styles.heroDelta, { color: scDelta >= 0 ? Colors.primary : Colors.red }]}>{scDelta >= 0 ? '▲ +' : '▼ −'}{big(Math.abs(scDelta))}{scRetired ? ` / ${scHorizonYears}y` : ''}</Text>
            </View>
          </View>
          {ssIncome > 0 && <Text style={styles.heroSs}>incl. Social Security {money(ssIncome)}/mo from {claimAge}</Text>}
        </View>
        {scRetired && (
          <Text style={[styles.note, { fontWeight: '700', color: scDeplete == null ? Colors.primaryDark : Colors.red }]}>
            {scDeplete == null ? `✅ At ${retPct.toFixed(1)}% return, your money lasts past age ${horizon}.` : `⚠️ At ${retPct.toFixed(1)}% return spending ${money(spendMo)}/mo, your money runs low around age ${scDeplete}.`}
          </Text>
        )}
        {/* the abstract lump-sum framing, demoted from the headline */}
        <Text style={styles.note}>
          {scRetired
            ? `“${scProjLabel}” rolls your ${big(nestEgg)} forward at ${retPct.toFixed(1)}%/yr minus ${money(spendMo)}/mo (rising with inflation) — raise the return or trim spending and it climbs. To fully fund your plan to age ${horizon} you'd need about ${big(scProj.will_need)} today${scProj.shortfall > 0 ? ` (≈${big(scProj.shortfall)} short).` : ' — covered.'}`
            : `Your ${big(nestEgg)} grows to ${big(scProjected)} by age ${rAge} at ${retPct.toFixed(1)}%/yr. To fund ${money(spendMo)}/mo to age ${horizon} you'd need about ${big(scProj.will_need)}${scProj.shortfall > 0 ? ` (≈${big(scProj.shortfall)} short).` : ' — covered.'}`}
        </Text>

        {/* SLIDERS — with benchmark + current-plan reference markers */}
        <View style={styles.card}>
          {!scRetired && <SliderRow label="Retire at age" valueLabel={`${rAge}`} value={rAge} min={Math.max(age + 1, 45)} max={75} step={1} onChange={(v) => { setRAge(v); invalidateMC(); }} markers={[{ value: planRetireAge, label: 'plan' }]} fmt={(v) => `${Math.round(v)}`} />}
          <SliderRow label="Expected return" valueLabel={`${retPct.toFixed(1)}%`} value={retPct} min={2} max={14} step={0.5} onChange={(v) => { setRetPct(v); invalidateMC(); }}
            markers={[{ value: benchBlended * 100, label: 'bench' }, ...(actualBlended != null ? [{ value: actualBlended * 100, label: '12mo' }] : []), { value: planGrowth * 100, label: 'plan' }]} fmt={(v) => `${v.toFixed(1)}%`} />
          {!scRetired && <SliderRow label="Save / month" valueLabel={money(saveMo)} value={saveMo} min={0} max={8000} step={100} onChange={(v) => { setSaveMo(v); invalidateMC(); }} markers={[{ value: planSave, label: 'plan' }]} fmt={(v) => money(v)} />}
          {!scRetired && <SliderRow label="Pay raises / year" valueLabel={salGrow === 0 ? 'none' : `${salGrow.toFixed(1)}%`} value={salGrow} min={0} max={6} step={0.5} onChange={(v) => { setSalGrow(v); invalidateMC(); }} fmt={(v) => v === 0 ? 'none' : `${v.toFixed(1)}%`} />}
          <SliderRow label="Planned spend / month" valueLabel={money(spendMo)} value={spendMo} min={1000} max={20000} step={100} onChange={(v) => { setSpendMo(v); invalidateMC(); }} markers={[{ value: planSpend, label: 'plan' }]} fmt={(v) => money(v)} />
          <SliderRow label="Inflation" valueLabel={`${inflPct.toFixed(1)}%`} value={inflPct} min={0} max={6} step={0.5} onChange={(v) => { setInflPct(v); invalidateMC(); }} markers={[{ value: planInfl * 100, label: inflIsActual ? 'actual' : 'plan' }]} fmt={(v) => `${v.toFixed(1)}%`} />
          <Text style={styles.note}>▲ marks your benchmark, current plan, and 12-mo actual where relevant — so you can see how far a what-if drifts from them.</Text>
        </View>

        {/* MONTE CARLO — gated behind an explicit run */}
        <View style={styles.card}>
          <Text style={styles.liK}>How confident is this?</Text>
          <Text style={styles.note}>A Monte Carlo simulation runs this scenario through ~400 random market futures (good and bad return sequences) and counts how often your money lasts to {horizon}. Markets aren't a straight line, so this shows the range of outcomes — not a promise.</Text>
          {scBand == null ? (
            <TouchableOpacity style={[styles.save, { marginTop: 10 }]} onPress={runMC}><Text style={styles.saveT}>Run Monte Carlo simulation</Text></TouchableOpacity>
          ) : (
            <>
              <View style={[styles.conf, { alignSelf: 'stretch', marginTop: 10 }, scChance != null && scChance < 60 && { backgroundColor: Colors.redLight }]}>
                <Text style={[styles.confPct, { color: scLevel }]}>{scChance}%</Text>
                <Text style={styles.confT}>your money lasts to age {horizon} in {scChance}% of ~400 simulated markets</Text>
              </View>
              <Text style={[styles.section, { marginTop: 14 }]}>RANGE OF OUTCOMES BY AGE</Text>
              <BandChartAuto band={scBand} retireAge={scRetired ? null : Math.max(age + 1, rAge)} />
              <View style={styles.axis}>
                <Text style={styles.axisT}>age {scBand[0].age}</Text>
                {!scRetired && <Text style={styles.axisT}>retire {rAge}</Text>}
                <Text style={styles.axisT}>age {scBand[scBand.length - 1].age}</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={styles.legItem}><View style={[styles.legSwatch, { backgroundColor: Colors.primaryMid, opacity: 0.4 }]} /><Text style={styles.legT}>10th–90th percentile (range)</Text></View>
                <View style={styles.legItem}><View style={[styles.legSwatch, { backgroundColor: Colors.primary }]} /><Text style={styles.legT}>median (typical)</Text></View>
              </View>
              <Text style={styles.fx}>Y-axis is log-scaled. When the lower edge drops to the floor, the money has run out in those scenarios.</Text>
              <TouchableOpacity onPress={runMC}><Text style={[styles.editLink2, { marginTop: 8 }]}>↻ Re-run</Text></TouchableOpacity>
            </>
          )}
        </View>

        {/* ACTIONS */}
        <TouchableOpacity style={styles.save} onPress={useAsPlan}><Text style={styles.saveT}>Use as my plan</Text></TouchableOpacity>
        <Text style={styles.actionHint}>Makes these your real numbers — updates “Where you stand”.</Text>
        <View style={styles.scenarioBtnRow}>
          <TouchableOpacity style={styles.scenarioBtn2} onPress={() => setSaveOpen(true)}><Text style={styles.scenarioBtn2T}>＋ Save scenario</Text></TouchableOpacity>
          <TouchableOpacity style={styles.scenarioBtn2} onPress={resetSandbox}><Text style={styles.scenarioBtn2T}>↺ Reset to plan</Text></TouchableOpacity>
        </View>
        <Text style={styles.actionHint}>Save = bookmark this what-if to compare later (doesn't change your plan). Reset = pull the sliders back to your current plan.</Text>

        {(store.retirementScenarios?.length ?? 0) > 0 && (
          <View style={styles.chips}>
            <Text style={styles.chipHint}>Saved scenarios — tap to load, long-press to delete</Text>
            {store.retirementScenarios.map((sc: any) => (
              <TouchableOpacity key={sc.id} style={styles.chip} onLongPress={() => store.deleteRetirementScenario(sc.id)}
                onPress={() => loadScenario(sc.assumptions || {})}>
                <Text style={styles.chipT}>{sc.name} · {sc.chance}%</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
        <SaveScenario open={saveOpen} onClose={() => setSaveOpen(false)} defaultName={scRetired ? `Spend ${moneyCompact(spendMo, 'M')}` : `Retire ${rAge}`}
          onSave={(name) => { store.saveRetirementScenario(name, { retireAge: rAge, contribMonthly: saveMo, spendMonthly: spendMo, expectedReturn: retPct / 100, inflation: inflPct / 100 }, scRetired ? age : rAge, scChance ?? 0); setSaveOpen(false); }} />
      </ScrollView>
    );
  }

  // ───────────────── SCREEN 1 — WHERE YOU STAND ─────────────────
  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bgSecondary }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.eyebrow}>RETIREMENT · WHERE YOU STAND</Text>

      {/* RETIRED: input-first — WHAT YOU HAVE (nest egg + legacy) then ONE verdict; NON-RETIRED: the two target cards */}
      {isRetired ? (
        <>
          {/* WHAT YOU HAVE — nest egg donut + legacy reserve (Net-Worth screen pattern) */}
          <View style={[styles.donutCard, { marginTop: 10 }]}>
            {nestEgg > 0 ? (
              <>
                <View style={styles.donutRow}>
                  <Donut segments={bequest > 0
                    ? [{ value: spendableEgg, color: Colors.primary }, { value: bequest, color: Colors.textTertiary }]
                    : segs.map((s) => ({ value: s.amt, color: s.color }))}>
                    <Text style={styles.donutAmt}>{big(nestEgg)}</Text>
                    <Text style={styles.donutLab}>NEST EGG</Text>
                  </Donut>
                  <View style={{ flex: 1 }}>
                    <View style={styles.lg}><Text style={styles.lgL}>Nest egg</Text><Text style={styles.lgV}>{big(nestEgg)}</Text></View>
                    {bequest > 0 ? (
                      <>
                        <View style={styles.lg}><Text style={styles.lgL}>− Set aside as legacy</Text><Text style={[styles.lgV, { color: Colors.textSecondary }]}>−{big(bequest)}</Text></View>
                        <View style={[styles.lg, styles.lgTotal]}><Text style={[styles.lgL, { fontWeight: '800' }]}>Left to spend</Text><Text style={[styles.lgV, { color: Colors.primary }]}>{big(spendableEgg)}</Text></View>
                      </>
                    ) : (
                      segs.map((s) => (
                        <View key={s.label} style={styles.lg}>
                          <View style={[styles.dot, { backgroundColor: s.color }]} />
                          <Text style={styles.lgL} numberOfLines={1}>{s.label}</Text>
                          <Text style={styles.lgV}>{moneyCompact(s.amt, 'M')}</Text>
                        </View>
                      ))
                    )}
                  </View>
                </View>
                <TouchableOpacity onPress={() => setEarmarkOpen(true)}><Text style={styles.editLink}>⚙︎ Edit what counts toward retirement ›</Text></TouchableOpacity>
              </>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                <Text style={styles.donutAmt}>{money(0)}</Text>
                <Text style={styles.sub}>Add your accounts in the Net Worth tab to build your nest egg.</Text>
              </View>
            )}
          </View>

          {/* WILL YOUR MONEY LAST? — one verdict in the app's green insight box (semantic green/amber/red) */}
          {nestEgg > 0 && (() => {
            const band = planChance == null || planChance >= 80 ? 'good' : planChance >= 60 ? 'watch' : 'risk';
            const bg = band === 'risk' ? Colors.redLight : band === 'watch' ? Colors.amberLight : Colors.primaryLight;
            const head = band === 'risk' ? '⚠️  Might fall short' : band === 'watch' ? '⚠️  Close — worth tightening' : '✅  Looking good';
            const lasts = dDeplete == null ? `past age ${horizon}` : `to about age ${dDeplete}`;
            const pace = dPlan.rateBand === 'safe' ? 'a safe pace' : dPlan.rateBand === 'moderate' ? 'a bit high — watch it' : 'a high pace';
            return (
              <>
                <Text style={styles.divider}>WILL YOUR MONEY LAST?</Text>
                <View style={[styles.insightBox, { backgroundColor: bg }]}>
                  <Text style={styles.verdictHead}>{head}</Text>
                  <Text style={styles.verdictBody}>Your {big(spendableEgg)} covers your spending {lasts}{planChance != null ? ` in most futures — ${planChance}% of scenarios` : ''}.</Text>
                  <Text style={styles.verdictSub}>Each year you spend {money(dPlan.spendAnnual)}{dPlan.guaranteedAnnual > 0 ? `: Social Security / pension covers ${money(dPlan.guaranteedAnnual)}, and you take ${money(dPlan.netWithdrawal)} from savings` : ' from savings'} ({pace}).</Text>
                </View>
              </>
            );
          })()}

          {/* Simple: one action to reveal the mechanics */}
          {simple && !showDetails && nestEgg > 0 && (
            <TouchableOpacity style={styles.detailsBtn} onPress={() => setShowDetails(true)}>
              <Text style={styles.detailsBtnTxt}>See the details — taxes, RMDs, withdrawal order  →</Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <>
          <View style={styles.heroRow}>
            <View style={[styles.heroCardG, { marginRight: 5 }]}>
              <Text style={styles.heroK}>IF YOU NEVER SAVE AGAIN</Text>
              <Text style={styles.heroBig}>{retireAtAge ? `Retire ${retireAtAge}` : 'Keep saving'}</Text>
              <Text style={styles.heroSub}>on today's {big(nestEgg)}</Text>
              <Text style={styles.heroRoi}>at {(planGrowth * 100).toFixed(1)}%/yr</Text>
            </View>
            <View style={[styles.heroCardG, { marginLeft: 5 }]}>
              <Text style={styles.heroK}>AT YOUR TARGET, {Math.round(planRetireAge)}</Text>
              <Text style={styles.heroBig}>{big(projEnd)}</Text>
              <Text style={styles.heroSub}>{planChance == null ? 'projected nest egg' : `${planChance}% chance it lasts to ${horizon}`}</Text>
              <Text style={styles.heroRoi}>at {(planGrowth * 100).toFixed(1)}%/yr</Text>
            </View>
          </View>
          {!simple && planChance != null && <Text style={styles.heroExplain}>“{planChance}% chance it lasts to {horizon}” = across ~400 market simulations, your money doesn't run out before {horizon} in {planChance}% of them.</Text>}
          <Text style={styles.planStmt}>▸ Everything below assumes your plan: retire at {Math.round(planRetireAge)}{planSave > 0 ? `, keep saving ${money(planSave)}/mo` : ''}.</Text>
        </>
      )}

      {/* ── THE DETAILS (Advisor / expanded): the mechanics behind the verdict ── */}
      {advisor && isRetired && nestEgg > 0 && (
        <>
          <Text style={styles.divider}>THE DETAILS</Text>

          {/* net withdrawal + rate */}
          <View style={styles.card}>
            <View style={styles.dwRow}><Text style={styles.dwL}>You plan to spend</Text><Text style={styles.dwV}>{money(dPlan.spendAnnual)}/yr</Text></View>
            {dPlan.guaranteedAnnual > 0 && <View style={styles.dwRow}><Text style={styles.dwL}>− Social Security / pension</Text><Text style={[styles.dwV, { color: Colors.primary }]}>−{money(dPlan.guaranteedAnnual)}/yr</Text></View>}
            <View style={[styles.dwRow, styles.dwTotal]}><Text style={[styles.dwL, { fontWeight: '800', color: Colors.textPrimary }]}>From your portfolio</Text><Text style={styles.dwV}>{money(dPlan.netWithdrawal)}/yr</Text></View>
            {dPlan.withdrawalRate != null && dPlan.netWithdrawal > 0 && (
              <View style={[styles.rateBox, { backgroundColor: dPlan.rateBand === 'safe' ? Colors.primaryLight : dPlan.rateBand === 'moderate' ? Colors.amberLight : '#FBE9E9' }]}>
                <Text style={[styles.ratePct, { color: rateColor }]}>{(dPlan.withdrawalRate * 100).toFixed(1)}%</Text>
                <Text style={styles.rateTxt}>withdrawal rate · {dPlan.rateBand === 'safe' ? 'within the ~4% guideline' : dPlan.rateBand === 'moderate' ? 'a bit above 4% — watch it' : 'above 5% — high risk of running short'}</Text>
              </View>
            )}
            {dPlan.netWithdrawal === 0 && <Text style={styles.note}>Your guaranteed income covers your spending — your portfolio can keep growing.</Text>}
          </View>

          {/* where the money sits + suggested withdrawal order (combined into one box) */}
          <View style={styles.card}>
            <Text style={styles.liK}>Where your money sits</Text>
            {([['cash', 'Cash'], ['taxable', 'Taxable'], ['preTax', 'Pre-tax (401k / IRA)'], ['roth', 'Roth']] as const).map(([k, lbl]) => (dSplit[k] > 0 ? (
              <View key={k} style={styles.dwRow}><Text style={styles.dwL}>{lbl}</Text><Text style={styles.dwV}>{money(dSplit[k])}</Text></View>
            ) : null))}

            {dOrder.length > 0 && (
              <>
                <View style={styles.cardDivider} />
                <Text style={styles.liK}>Suggested withdrawal order</Text>
                {dOrder.map((s, i) => (
                  <View key={s.bucket} style={styles.orderRow}>
                    <Text style={styles.orderNum}>{i + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.orderName}>{s.label} <Text style={styles.orderAmt}>· {moneyCompact(s.amount, 'M')}{s.bucket === 'rmd' ? ' this year' : ''}</Text></Text>
                      {s.bucket === 'rmd' && (
                        <Text style={styles.orderCalc}>= your {money(dSplit.preTax)} pre-tax ÷ {rmdDivisor(Math.max(age, RMD_START_AGE)).toFixed(1)} (the IRS life-expectancy factor at {Math.max(age, RMD_START_AGE)}). It's the first slice of your pre-tax balance below — not money on top of it.</Text>
                      )}
                      <Text style={styles.orderWhy}>{s.why}</Text>
                    </View>
                  </View>
                ))}
                <Text style={styles.tFootMuted}>The amounts above are each bucket's full balance — what you draw from over the years — except the RMD, which is just this year's required minimum (taken out of the pre-tax balance). General guidance, not tax advice; your brackets or Roth conversions may change the order.</Text>
              </>
            )}
          </View>

          {/* RMDs + healthcare */}
          <View style={styles.card}>
            <Text style={styles.liK}>Heads-up</Text>
            {dSplit.preTax > 0 && <Text style={styles.note}>📅 <Text style={{ fontWeight: '700', color: Colors.textPrimary }}>Required Minimum Distributions</Text> {age >= RMD_START_AGE
              ? <>apply to you now — the IRS requires a withdrawal of about <Text style={{ fontWeight: '700', color: Colors.textPrimary }}>{money(dRmd)}</Text> this year</>
              : <>start at {RMD_START_AGE}; on today's pre-tax balance that's about <Text style={{ fontWeight: '700', color: Colors.textPrimary }}>{money(dRmd)}</Text> in the first year</>} from pre-tax — taxed as income whether you need it or not. The success-chance figure tracks balances <Text style={{ fontStyle: 'italic' }}>before tax</Text>, so set aside a bit for the tax.</Text>}
            <Text style={[styles.note, { marginTop: dSplit.preTax > 0 ? 8 : 0 }]}>🏥 <Text style={{ fontWeight: '700', color: Colors.textPrimary }}>Healthcare:</Text> {age >= 65
              ? "you're on Medicare — budget for premiums + out-of-pocket (often $6–7k/person/yr), and watch IRMAA surcharges if your income is high."
              : 'Medicare starts at 65; budget for premiums + out-of-pocket (often $6–7k/person/yr). Retiring earlier? Plan for private coverage until then.'}</Text>
            {inRothWindow && dSplit.preTax > 0 && <Text style={[styles.note, { marginTop: 8 }]}>💡 <Text style={{ fontWeight: '700', color: Colors.textPrimary }}>Roth conversion window:</Text> you're retired but before RMDs/Social Security, so your taxable income may be low. Converting some pre-tax to Roth now (filling the low brackets) can cut future RMDs and lifetime tax.</Text>}
          </View>
        </>
      )}

      {/* ── WHAT YOU HAVE — non-retired nest-egg donut (retired sees this at the top) ── */}
      {!isRetired && (<>
      <Text style={styles.divider}>WHAT YOU HAVE</Text>

      {/* DONUT — current earmarked nest egg */}
      <View style={[styles.donutCard, { marginTop: 10 }]}>
        {nestEgg > 0 ? (
          <>
            <View style={styles.donutRow}>
              <Donut segments={segs.map((s) => ({ value: s.amt, color: s.color }))}>
                <Text style={styles.donutAmt}>{big(nestEgg)}</Text>
                <Text style={styles.donutLab}>NEST EGG</Text>
              </Donut>
              <View style={{ flex: 1 }}>
                {segs.map((s) => (
                  <View key={s.label} style={styles.lg}>
                    <View style={[styles.dot, { backgroundColor: s.color }]} />
                    <Text style={styles.lgL} numberOfLines={1}>{s.label}{!s.full && <Text style={styles.lgPct}> ·partial</Text>}</Text>
                    <Text style={styles.lgV}>{moneyCompact(s.amt, 'M')}</Text>
                  </View>
                ))}
              </View>
            </View>
            <TouchableOpacity onPress={() => setEarmarkOpen(true)}><Text style={styles.editLink}>⚙︎ Edit what counts toward retirement ›</Text></TouchableOpacity>
          </>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <Text style={styles.donutAmt}>{money(0)}</Text>
            <Text style={styles.sub}>Add your accounts in the Net Worth tab to build your nest egg.</Text>
          </View>
        )}
      </View>
      </>)}

      {/* INSTRUMENTS — your 12-mo actual vs benchmark (30-yr) per holding */}
      {instruments.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.liK}>Your investments</Text>
          <View style={styles.tHead}>
            <Text style={[styles.tHL, { flex: 1 }]} numberOfLines={1}>INSTRUMENT</Text>
            <Text style={[styles.tHL, styles.tColNum]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>YOUR 12-MO</Text>
            <Text style={[styles.tHL, styles.tColNum]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>BENCHMARK</Text>
          </View>
          {instruments.map(({ a, info }) => {
            const ttm = a.actual_ttm;
            const uncategorized = !assetKind(a.kind);
            return (
              <View key={a.asset_id} style={styles.tRow}>
                <TouchableOpacity style={{ flex: 1 }} disabled={!uncategorized} onPress={() => setKindPick(a)}>
                  <Text style={styles.instName} numberOfLines={1}>{a.institution?.trim() || a.label}</Text>
                  {uncategorized
                    ? <Text style={styles.instWarn} numberOfLines={1}>{moneyCompact(earmarkedAmount(a), 'M')} · ⚠ Set a type ›</Text>
                    : <Text style={styles.instSrc} numberOfLines={2}>{assetKind(a.kind)?.label} · {moneyCompact(earmarkedAmount(a), 'M')}{simple ? '' : ` · ${info.source} · ${info.period}${info.estimate ? ' · est.' : ''}`}</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.tColNum} onPress={() => setTtmEdit(a)}>
                  {ttm == null
                    ? <Text style={styles.ttmAdd}>+ Add</Text>
                    : <Text style={[styles.instRet, { color: ttm >= info.ret ? Colors.primary : Colors.red }]}>{(ttm * 100).toFixed(1)}%</Text>}
                </TouchableOpacity>
                {uncategorized
                  ? <Text style={[styles.tColNum, styles.instBench, { color: Colors.textTertiary }]}>—</Text>
                  : <Text style={[styles.tColNum, styles.instBench]}>{(info.ret * 100).toFixed(1)}%</Text>}
              </View>
            );
          })}
          {/* weighted-average row (not editable) */}
          <View style={[styles.tRow, styles.tTotal]}>
            <Text style={[styles.instName, { flex: 1 }]}>Weighted average</Text>
            <Text style={[styles.tColNum, styles.instRet, actualReturn == null && { color: Colors.textTertiary, fontWeight: '700' }]}>{actualReturn == null ? '—' : `${(actualReturn * 100).toFixed(1)}%`}</Text>
            <Text style={[styles.tColNum, styles.instBench]}>{(benchBlended * 100).toFixed(1)}%</Text>
          </View>
          <Text style={styles.tFoot}>
            {actualReturn == null
              ? 'Add your actual 12-month return on each holding to see how you compare to the benchmark.'
              : `You returned ${(actualReturn * 100).toFixed(1)}% over the last 12 months vs a ${(benchBlended * 100).toFixed(1)}% benchmark — ${beatBy! >= 0 ? `${(beatBy! * 100).toFixed(1)} pts ahead` : `${(Math.abs(beatBy!) * 100).toFixed(1)} pts behind`}.`}
          </Text>
          {!simple && <Text style={styles.tFootMuted}>“Your 12-mo” = your actual trailing-12-month return (you enter it). Benchmark = the asset class's historical index return (not editable); past performance isn't a guarantee, and a 12-mo actual vs a ~30-yr average is directional only.</Text>}
          <TouchableOpacity onPress={() => router.push('/performance')}><Text style={[styles.editLink2, { marginTop: 10 }]}>📈 Track live performance vs benchmark ›</Text></TouchableOpacity>
        </View>
      )}

      {/* ── YOUR PLAN (assumptions) ── */}
      <Text style={styles.divider}>YOUR PLAN · {isRetired ? 'in retirement' : `assumes age ${Math.round(planRetireAge)}`}</Text>

      {/* GROWTH-RATE BASIS — which return drives the projection (growth in accumulation, returns during drawdown) */}
      <View style={styles.card}>
        <Text style={styles.liK}>{isRetired ? 'Assumed return on what\'s left' : 'Grow my nest egg using'}</Text>
        <View style={styles.basisRow}>
          {([
            { k: 'benchmark', label: 'Benchmark', rate: benchBlended, warn: false },
            { k: 'actual', label: 'Your 12-mo', rate: actualBlended, warn: true },
            { k: 'scenario', label: 'Scenario', rate: scenarioReturn, warn: false },
          ] as const).map((o) => {
            const sel = returnBasis === o.k;
            const disabled = o.k === 'actual' && actualBlended == null;
            return (
              <TouchableOpacity key={o.k} disabled={disabled} activeOpacity={0.8}
                style={[styles.basisPill, sel && styles.basisPillOn, disabled && { opacity: 0.4 }]}
                onPress={() => commit({ returnBasis: o.k })}>
                <Text style={[styles.basisPillT, sel && styles.basisPillTOn]} numberOfLines={1}>{o.label}{o.warn ? ' ⚠' : ''}</Text>
                <Text style={[styles.basisPillR, sel && styles.basisPillTOn]}>{o.rate == null ? '— add' : `${(o.rate * 100).toFixed(1)}%`}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {returnBasis === 'actual' && <Text style={styles.basisWarn}>⚠ Projecting decades from a single 12-month return is unreliable — benchmark is the safer basis.</Text>}
        {returnBasis === 'scenario' && <Text style={styles.note}>Using the expected return you set in scenario analysis.</Text>}
      </View>

      {/* PROJECTION — nest egg at end of each year, up to retirement */}
      {!isRetired && nestEgg > 0 && projYears.length > 0 && (
        <View style={styles.card}>
          <View style={styles.li}><Text style={styles.liK}>Projected nest egg</Text><Text style={[styles.liV, { color: Colors.primary }]}>{big(projYears[projYears.length - 1].bal)} by {projYears[projYears.length - 1].year}</Text></View>
          <Text style={styles.note}>If your {big(nestEgg)} grows at {(planGrowth * 100).toFixed(1)}% ({basisLabel}){planSave > 0 ? ` and you keep saving ${money(planSave)}/mo` : ''}.{hasRetireBar ? ` Amber bar = retirement at ${Math.round(planRetireAge)}.` : ''}</Text>
          <ProjectionChartAuto data={projYears} />
          <View style={styles.breakdown}>
            <View style={styles.bdItem}><Text style={styles.bdV}>{big(nestEgg)}</Text><Text style={styles.bdL}>now</Text></View>
            <Text style={styles.bdOp}>+</Text>
            <View style={styles.bdItem}><Text style={styles.bdV}>{big(projContrib)}</Text><Text style={styles.bdL}>you add</Text></View>
            <Text style={styles.bdOp}>+</Text>
            <View style={styles.bdItem}><Text style={styles.bdV}>{big(projGrowth)}</Text><Text style={styles.bdL}>growth</Text></View>
            <Text style={styles.bdOp}>=</Text>
            <View style={styles.bdItem}><Text style={[styles.bdV, { color: Colors.primary }]}>{big(projEnd)}</Text><Text style={styles.bdL}>at {Math.round(planRetireAge)}</Text></View>
          </View>
        </View>
      )}

      {/* IN RETIREMENT — spend, anchored to target age */}
      <View style={styles.card}>
        <Text style={styles.liK}>In retirement (from {Math.round(spendEscFromAge)})</Text>
        <Text style={styles.note}>You plan to spend <Text style={{ fontWeight: '800', color: Colors.textPrimary }}>{money(planSpend)}/mo</Text> in today's dollars → about <Text style={{ fontWeight: '800', color: Colors.textPrimary }}>{big(spendHi)}/mo</Text> by {horizon} as prices rise {(planInfl * 100).toFixed(1)}%/yr <Text style={styles.srcTag}>{inflIsActual ? 'actual' : 'your plan'}</Text>.</Text>
        {/* B-32: when a recognized retirement location adjusts the figure, say so — don't apply COL silently */}
        {A.spendMonthly == null && (() => {
          const col = colFactor(op.retLocation);
          if (col.factor === 1 || !op.retLocation) return null;
          return <Text style={[styles.note, { marginTop: 4 }]}>Adjusted for {col.name}'s cost of living ({col.factor < 1 ? `${Math.round((1 - col.factor) * 100)}% lower` : `${Math.round((col.factor - 1) * 100)}% higher`} than the US).</Text>;
        })()}
        {/* B-39: the projection doesn't subtract debt separately — make that explicit so a user with a
            mortgage includes its payment in the spend above rather than assuming it's handled. */}
        {(store.liabilities ?? []).reduce((t: number, d: any) => t + (d.remaining_balance || 0), 0) > 0 && (
          <Text style={[styles.note, { marginTop: 4 }]}>💳 This assumes any debt is covered within your spending — if a loan (e.g. a mortgage) will still be running, include its payment in the figure above.</Text>
        )}
      </View>

      {/* TAX-SMART MOVES (accumulators) */}
      {!isRetired && (
        <View style={styles.card}>
          <Text style={styles.liK}>Tax-smart moves</Text>
          {k401.remaining > 0
            ? <Text style={styles.note}>💼 You can still add <Text style={{ fontWeight: '800', color: Colors.textPrimary }}>{money(k401.remaining)}</Text> to your 401(k) this year{k401.catchUp ? ' (incl. the $8,000 age-50+ catch-up)' : ''} — up to {money(k401.limit)}.</Text>
            : <Text style={styles.note}>💼 401(k) maxed for the year ✓{k401.catchUp ? ' (incl. catch-up)' : ''}.</Text>}
          <Text style={[styles.note, { marginTop: 6 }]}>🏦 You can also contribute up to <Text style={{ fontWeight: '800', color: Colors.textPrimary }}>{money(annualIraLimit(age))}</Text> to an IRA{age >= 50 ? ' (incl. catch-up)' : ''}.</Text>
          {!simple && <Text style={[styles.note, { marginTop: 6 }]}>⚖️ <Text style={{ fontWeight: '700', color: Colors.textPrimary }}>{rvt.lean === 'roth' ? 'Lean Roth' : rvt.lean === 'traditional' ? 'Lean Traditional' : 'Roth or Traditional'}</Text> — {rvt.why} <Text style={styles.srcTag}>marginal ~{Math.round(marginalNow * 100)}% now</Text></Text>}
          <Text style={styles.tFootMuted}>General guidance, not tax advice.</Text>
        </View>
      )}

      {/* GUARANTEED INCOME (Social Security + pension) */}
      <TouchableOpacity style={styles.ssRow} onPress={() => setSsOpen(true)}>
        <Text style={styles.ssIc}>🏛️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.ssName}>{hasPension ? 'Social Security & pension' : 'Social Security'}</Text>
          <Text style={styles.ssSub}>{
            ssIncome > 0
              ? `${money(ssIncome)}/mo${claimAge > age ? ` starting at ${claimAge}` : ''} · today's $${A.ssEligible == null ? ' · from your setup' : ''}`
              : A.ssEligible === false ? 'Not eligible — tap to change' : 'Are you eligible? Tap to set up ›'
          }</Text>
        </View>
        <Text style={[styles.ssPill, ssIncome === 0 && A.ssEligible === false && { backgroundColor: Colors.bgTertiary, color: Colors.textSecondary }]}>{ssIncome > 0 ? 'Eligible ✓' : A.ssEligible === false ? 'None' : 'Set up'}</Text>
      </TouchableOpacity>

      {/* SCENARIO BUTTON */}
      <TouchableOpacity style={styles.save} onPress={openScenario}><Text style={styles.saveT}>Run scenario analysis  →</Text></TouchableOpacity>
      <Text style={styles.foot}>Test retiring earlier, saving more, market ups & downs.</Text>
      <View style={{ height: 40 }} />

      <EarmarkSheet open={earmarkOpen} onClose={() => setEarmarkOpen(false)} assets={assets} nestEgg={nestEgg}
        onSet={(id, pct) => store.updateAsset(id, { retirement_pct: pct })} onDone={() => setEarmarkOpen(false)} />
      <SsEditor open={ssOpen} onClose={() => setSsOpen(false)} A={A} ssDefault={ssDefault} onApply={(patch) => { commit(patch); setSsOpen(false); }} />
      <TtmEditor account={ttmEdit} onClose={() => setTtmEdit(null)} benchmark={ttmEdit ? benchmarkReturn(ttmEdit.kind) : 0}
        onApply={(ret) => { if (ttmEdit) store.updateAsset(ttmEdit.asset_id, { actual_ttm: ret }); setTtmEdit(null); }}
        onClear={() => { if (ttmEdit) store.updateAsset(ttmEdit.asset_id, { actual_ttm: null }); setTtmEdit(null); }} />
      <KindPicker account={kindPick} onClose={() => setKindPick(null)}
        onPick={(kind, bucket) => { if (kindPick) store.updateAsset(kindPick.asset_id, { kind, tax_bucket: bucket }); setKindPick(null); }} />
    </ScrollView>
  );
}

// auto-measuring band chart wrapper (keeps the screen JSX tidy)
function BandChartAuto({ band, retireAge }: { band: any[]; retireAge: number | null }) {
  const [w, setW] = useState(0);
  return <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>{w > 0 && <BandChart band={band} width={w} retireAge={retireAge} />}</View>;
}

// auto-measuring projected-nest-egg column chart
function ProjectionChartAuto({ data }: { data: { year: number; age: number; bal: number; isRetire: boolean }[] }) {
  const [w, setW] = useState(0);
  return <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>{w > 0 && <ProjectionChart data={data} width={w} />}</View>;
}
// column chart: nest-egg balance at the end of each of the next N years; retirement-age column tinted amber
function ProjectionChart({ data, width }: { data: { year: number; age: number; bal: number; isRetire: boolean }[]; width: number }) {
  const H = 150, padTop = 16, padBot = 18, gap = 4;
  const n = data.length;
  const bw = Math.max(4, (width - gap * (n - 1)) / n);
  const top = Math.max(...data.map((d) => d.bal), 1);
  const h = (v: number) => Math.max(2, (v / top) * (H - padTop - padBot));
  const vfs = n > 14 ? 6 : 7;                       // value-label font
  const vlabel = (v: number) => (v >= 1e6 ? `$${(v / 1e6).toFixed(v / 1e6 >= 10 ? 0 : 1)}M` : `$${Math.round(v / 1e3)}k`);
  return (
    <Svg width={width} height={H}>
      <Line x1={0} y1={H - padBot} x2={width} y2={H - padBot} stroke={Colors.border} strokeWidth={1} />
      {data.map((d, i) => {
        const bh = h(d.bal), x = i * (bw + gap), y = H - padBot - bh;
        const anchor = i === n - 1 ? 'end' : i === 0 ? 'start' : 'middle';
        const lx = i === n - 1 ? x + bw : i === 0 ? x : x + bw / 2;
        const fs = n > 16 ? 6.5 : 7.5;
        // value atop every bar; for dense charts (>14) thin to alternate + first/last/retire to avoid overlap
        const showVal = n <= 14 || i % 2 === 0 || i === n - 1 || d.isRetire;
        return (
          <G key={d.year}>
            <Rect x={x} y={y} width={bw} height={bh} rx={2} fill={d.isRetire ? Colors.amber : Colors.primaryMid} opacity={d.isRetire ? 0.95 : 0.85} />
            {showVal && <SvgText x={x + bw / 2} y={y - 3} fontSize={vfs} fontWeight="700" fill={d.isRetire ? Colors.amber : Colors.textSecondary} textAnchor="middle">{vlabel(d.bal)}</SvgText>}
            <SvgText x={lx} y={H - 5} fontSize={fs} fontWeight={d.isRetire ? '700' : '400'} fill={d.isRetire ? Colors.amber : Colors.textTertiary} textAnchor={anchor}>{`'${String(d.year).slice(2)}`}</SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// ───────────────────────── Slider ─────────────────────────
function Slider({ value, min, max, step = 1, onChange, onComplete, color = Colors.primary, markers }: {
  value: number; min: number; max: number; step?: number; onChange: (v: number) => void; onComplete?: () => void; color?: string; markers?: { value: number; label: string }[];
}) {
  const cfg = useRef<any>({}); cfg.current = { min, max, step, onChange, onComplete };
  const xRef = useRef(0), wRef = useRef(0), viewRef = useRef<View>(null);
  const measure = () => viewRef.current?.measureInWindow((x, _y, w) => { xRef.current = x; wRef.current = w; });
  const setFromX = (px: number) => {
    const c = cfg.current; const w = wRef.current; if (!w) return;
    let p = clamp((px - xRef.current) / w, 0, 1);
    let v = c.min + p * (c.max - c.min); v = Math.round(v / c.step) * c.step;
    c.onChange(clamp(v, c.min, c.max));
  };
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => setFromX(e.nativeEvent.pageX),
    onPanResponderMove: (e) => setFromX(e.nativeEvent.pageX),
    onPanResponderRelease: () => cfg.current.onComplete?.(),
    onPanResponderTerminate: () => cfg.current.onComplete?.(),
  })).current;
  const pct = clamp((value - min) / (max - min || 1), 0, 1) * 100;
  return (
    <View ref={viewRef} onLayout={measure} hitSlop={{ top: 14, bottom: 14 }} {...pan.panHandlers} style={styles.trackHit}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
        {(markers ?? []).map((m, i) => {
          const mp = clamp((m.value - min) / (max - min || 1), 0, 1) * 100;
          return <View key={i} style={[styles.tick, { left: `${mp}%` }]} pointerEvents="none" />;
        })}
        <View style={[styles.thumb, { left: `${pct}%`, borderColor: color }]} />
      </View>
    </View>
  );
}
function SliderRow(p: { label: string; valueLabel: string; fmt?: (v: number) => string } & React.ComponentProps<typeof Slider>) {
  const { label, valueLabel, fmt, markers, ...rest } = p;
  const f = fmt ?? ((v: number) => `${v}`);
  return (
    <View style={styles.sl}>
      <View style={styles.slTop}><Text style={styles.slL}>{label}</Text><Text style={styles.slV}>{valueLabel}</Text></View>
      <Slider {...rest} markers={markers} />
      {markers && markers.length > 0 && <Text style={styles.markerCap}>{markers.map((m) => `▲ ${m.label} ${f(m.value)}`).join('   ')}</Text>}
    </View>
  );
}

// ───────────────────────── Donut ─────────────────────────
function Donut({ segments, size = 124, stroke = 16, children }: { segments: { value: number; color: string }[]; size?: number; stroke?: number; children?: React.ReactNode }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const total = segments.reduce((t, s) => t + Math.max(0, s.value), 0) || 1;
  let acc = 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={Colors.bgTertiary} strokeWidth={stroke} fill="none" />
          {segments.map((s, i) => {
            const dash = (Math.max(0, s.value) / total) * c;
            const el = <Circle key={i} cx={size / 2} cy={size / 2} r={r} stroke={s.color} strokeWidth={stroke} fill="none" strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-acc} />;
            acc += dash; return el;
          })}
        </G>
      </Svg>
      <View style={{ alignItems: 'center' }}>{children}</View>
    </View>
  );
}

// ───────────────────────── Earmark sheet ─────────────────────────
export function EarmarkSheet({ open, onClose, assets, nestEgg, onSet, onDone }: {
  open: boolean; onClose: () => void; assets: AssetAccount[]; nestEgg: number; onSet: (id: string, pct: number) => void; onDone: () => void;
}) {
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose} />
      {/* #20: lift the sheet above the keyboard so the % field + Done button aren't hidden behind it */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav} pointerEvents="box-none">
      <View style={[styles.sheet, { position: 'relative' }]}>
        <View style={styles.grab} />
        <Text style={styles.sheetT}>What counts toward retirement?</Text>
        <Text style={styles.sheetS}>Some money is for other goals. Set how much of each account funds retirement — the rest stays free for things like a home or college.</Text>
        <ScrollView style={{ maxHeight: 380 }} keyboardShouldPersistTaps="handled">
          {assets.map((a) => {
            const isProp = a.tax_bucket === 'PROPERTY';
            const pct = a.retirement_pct == null ? earmarkDefault(a) : a.retirement_pct;
            return (
              <View key={a.asset_id} style={[styles.acc, (isProp || pct === 0) && { opacity: 0.55 }]}>
                <Text style={styles.accIc}>{assetKind(a.kind)?.icon ?? '💼'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.accName}>{a.institution?.trim() || a.label}</Text>
                  <Text style={styles.accBal}>{isProp ? 'excluded — you live in it' : `${assetKind(a.kind)?.label ?? 'Other'} · ${money(a.balance)}`}</Text>
                </View>
                {isProp ? <Text style={styles.counts}>—</Text> : (
                  <>
                    <View style={styles.pctBox}><TextInput style={styles.pctIn} keyboardType="number-pad" value={String(pct)} onChangeText={(t) => onSet(a.asset_id, clamp(Math.round(num(t)), 0, 100))} /><Text style={styles.pctU}>%</Text></View>
                    <Text style={styles.counts}>{moneyCompact(earmarkedAmount(a), 'M')}</Text>
                  </>
                )}
              </View>
            );
          })}
        </ScrollView>
        <TouchableOpacity style={styles.applyBtn} onPress={onDone}><Text style={styles.applyT}>Counts toward retirement: {big(nestEgg)} · Done</Text></TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ───────────────────────── Social Security editor ─────────────────────────
function SsEditor({ open, onClose, A, ssDefault, onApply }: { open: boolean; onClose: () => void; A: any; ssDefault: number; onApply: (patch: any) => void }) {
  const [eligible, setEligible] = useState<boolean>(A.ssEligible ?? (ssDefault > 0));
  const [amt, setAmt] = useState(String(A.ssMonthly ?? Math.round(ssDefault) ?? ''));
  const [claim, setClaim] = useState<number>(A.ssClaimAge ?? 67);
  useEffect(() => { if (open) { setEligible(A.ssEligible ?? (ssDefault > 0)); setAmt(String(A.ssMonthly ?? Math.round(ssDefault) ?? '')); setClaim(A.ssClaimAge ?? 67); } }, [open]);
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grab} />
        <Text style={styles.sheetT}>Social Security</Text>
        <Text style={styles.sheetS}>A monthly benefit from the government in retirement. If you've worked and paid in, you're likely eligible.</Text>
        <View style={styles.acc}>
          <View style={{ flex: 1 }}><Text style={styles.accName}>Eligible for Social Security?</Text><Text style={styles.accBal}>Turn off if you won't receive it.</Text></View>
          <Switch value={eligible} onValueChange={setEligible} trackColor={{ true: Colors.primaryMid, false: Colors.border }} thumbColor={eligible ? Colors.primary : '#fff'} />
        </View>
        {eligible && (
          <>
            <View style={styles.acc}>
              <View style={{ flex: 1 }}><Text style={styles.accName}>Estimated benefit</Text><Text style={styles.accBal}>Today's dollars, per month</Text></View>
              <View style={styles.pctBox}><Text style={styles.pctU}>{currencySymbol()}</Text><TextInput style={[styles.pctIn, { width: 78 }]} keyboardType="decimal-pad" value={amt} onChangeText={setAmt} placeholder="0" placeholderTextColor={Colors.textTertiary} /></View>
            </View>
            <View style={styles.acc}>
              <View style={{ flex: 1 }}><Text style={styles.accName}>Claim at age</Text><Text style={styles.accBal}>62 earliest · 67 full · 70 max</Text></View>
              <View style={styles.stepper}>
                <TouchableOpacity style={styles.stepBtn} onPress={() => setClaim((c) => clamp(c - 1, 62, 70))}><Text style={styles.stepBtnT}>−</Text></TouchableOpacity>
                <Text style={styles.stepVal}>{claim}</Text>
                <TouchableOpacity style={styles.stepBtn} onPress={() => setClaim((c) => clamp(c + 1, 62, 70))}><Text style={styles.stepBtnT}>+</Text></TouchableOpacity>
              </View>
            </View>
          </>
        )}
        <TouchableOpacity style={styles.applyBtn} onPress={() => onApply({ ssEligible: eligible, ssMonthly: eligible ? num(amt) : 0, ssClaimAge: claim })}><Text style={styles.applyT}>Done</Text></TouchableOpacity>
      </View>
          </KeyboardAvoidingView>
    </Modal>
  );
}

// ───────────────────────── Save-scenario prompt ─────────────────────────
function SaveScenario({ open, onClose, defaultName, onSave }: { open: boolean; onClose: () => void; defaultName: string; onSave: (name: string) => void }) {
  const [name, setName] = useState(defaultName);
  useEffect(() => { if (open) setName(defaultName); }, [open]);
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose} />
      <View style={styles.dialog}>
        <Text style={styles.sheetT}>Save scenario</Text>
        <Text style={styles.sheetS}>Name this what-if so you can compare it later.</Text>
        <TextInput style={styles.nameIn} value={name} onChangeText={setName} placeholder="e.g. Retire 60" placeholderTextColor={Colors.textTertiary} />
        <TouchableOpacity style={styles.applyBtn} onPress={() => onSave(name.trim() || defaultName)}><Text style={styles.applyT}>Save</Text></TouchableOpacity>
      </View>
          </KeyboardAvoidingView>
    </Modal>
  );
}

// ───────────────────────── Asset-type picker (categorize a holding) ─────────────────────────
function KindPicker({ account, onClose, onPick }: { account: AssetAccount | null; onClose: () => void; onPick: (kind: string, bucket: any) => void }) {
  return (
    <Modal visible={account != null} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grab} />
        <Text style={styles.sheetT}>What is {account?.institution?.trim() || account?.label}?</Text>
        <Text style={styles.sheetS}>Pick the type so we can use the right historical benchmark return for it.</Text>
        <ScrollView style={{ maxHeight: 400 }}>
          {ASSET_SECTIONS.map((sec) => (
            <View key={sec}>
              <Text style={styles.kindSec}>{sec.toUpperCase()}</Text>
              <View style={styles.kindGrid}>
                {ASSET_KINDS.filter((k) => k.section === sec).map((k) => (
                  <TouchableOpacity key={k.id} style={styles.kindChip} onPress={() => onPick(k.id, k.bucket)}>
                    <Text style={styles.kindT}>{k.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
          </KeyboardAvoidingView>
    </Modal>
  );
}

// ───────────────────────── Per-instrument TTM editor ─────────────────────────
function TtmEditor({ account, onClose, benchmark, onApply, onClear }: {
  account: AssetAccount | null; onClose: () => void; benchmark: number; onApply: (ret: number) => void; onClear: () => void;
}) {
  const open = account != null;
  const [val, setVal] = useState('');
  useEffect(() => { if (account) setVal(account.actual_ttm != null ? (account.actual_ttm * 100).toFixed(1) : ''); }, [account]);
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose} />
      <View style={styles.dialog}>
        <Text style={styles.sheetT}>{account?.institution?.trim() || account?.label} — actual return</Text>
        <Text style={styles.sheetS}>This holding's actual return over the last 12 months. Benchmark for its type is {(benchmark * 100).toFixed(1)}%.</Text>
        <View style={styles.pctBox}>
          <TextInput style={[styles.pctIn, { width: 90 }]} keyboardType="numbers-and-punctuation" value={val} onChangeText={setVal} placeholder="0.0" placeholderTextColor={Colors.textTertiary} autoFocus />
          <Text style={styles.pctU}>% last 12 mo</Text>
        </View>
        <TouchableOpacity style={styles.applyBtn} onPress={() => onApply(clamp(num(val) * (val.trim().startsWith('-') ? -1 : 1), -90, 200) / 100)}><Text style={styles.applyT}>Save</Text></TouchableOpacity>
        {account?.actual_ttm != null && <TouchableOpacity onPress={onClear}><Text style={styles.clearLink}>Clear</Text></TouchableOpacity>}
      </View>
          </KeyboardAvoidingView>
    </Modal>
  );
}

// log-scale 10–90 band + median
function BandChart({ band, width, retireAge }: { band: { age: number; p10: number; p50: number; p90: number }[]; width: number; retireAge: number | null }) {
  const H = 130, padTop = 8, padBot = 4;
  const top = Math.max(...band.map((b) => b.p90), 1);
  const hardFloor = Math.max(1000, top / 1000);
  const positives = band.map((b) => b.p10).filter((v) => v > hardFloor);
  const dataMin = positives.length ? Math.min(...positives) : hardFloor;
  const floor = Math.max(hardFloor, dataMin * 0.7);
  const lTop = Math.log(top), lFloor = Math.log(floor);
  const minAge = band[0].age, maxAge = band[band.length - 1].age;
  const x = (a: number) => ((a - minAge) / (maxAge - minAge || 1)) * width;
  const y = (v: number) => { const ly = (Math.log(Math.max(floor, v)) - lFloor) / (lTop - lFloor || 1); return padTop + (1 - ly) * (H - padTop - padBot); };
  const upper = band.map((b) => `${x(b.age).toFixed(1)},${y(b.p90).toFixed(1)}`).join(' L ');
  const lower = [...band].reverse().map((b) => `${x(b.age).toFixed(1)},${y(b.p10).toFixed(1)}`).join(' L ');
  const med = 'M ' + band.map((b) => `${x(b.age).toFixed(1)},${y(b.p50).toFixed(1)}`).join(' L ');
  return (
    <Svg width={width} height={H}>
      <Line x1={0} y1={H - padBot} x2={width} y2={H - padBot} stroke={Colors.border} strokeWidth={1} />
      <Path d={`M ${upper} L ${lower} Z`} fill={Colors.primaryMid} fillOpacity={0.4} />
      <Path d={med} stroke={Colors.primary} strokeWidth={2.5} fill="none" />
      {retireAge != null && retireAge >= minAge && retireAge <= maxAge && (
        <Line x1={x(retireAge)} y1={0} x2={x(retireAge)} y2={H - padBot} stroke={Colors.amber} strokeWidth={1.5} strokeDasharray="3,3" opacity={0.6} />
      )}
    </Svg>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg },
  eyebrow: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginTop: 8, marginBottom: 8 },
  sub: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, textAlign: 'center' },
  note: { fontSize: 11, color: Colors.textSecondary, marginTop: 8, lineHeight: 16 },

  donutCard: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.base },
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  donutAmt: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  donutLab: { fontSize: 9, fontWeight: '700', color: Colors.textTertiary },
  lg: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 3 },
  dot: { width: 9, height: 9, borderRadius: 3 },
  lgL: { flex: 1, fontSize: 12, color: Colors.textPrimary },
  lgPct: { color: Colors.textTertiary, fontSize: 11 },
  lgV: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  editLink: { marginTop: 12, fontSize: 12.5, fontWeight: '700', color: Colors.primary, textAlign: 'center' },

  heroRow: { flexDirection: 'row', marginTop: 10 },
  heroCardG: { flex: 1, backgroundColor: Colors.primaryDark, borderRadius: Radii.lg, paddingHorizontal: 13, paddingVertical: 14, minHeight: 96, justifyContent: 'center' },
  heroK: { color: '#BEE7D8', fontSize: 9.5, fontWeight: '800', letterSpacing: 0.3 },
  heroBig: { color: '#fff', fontSize: 25, fontWeight: '800', marginVertical: 3 },
  heroSub: { color: '#BEE7D8', fontSize: 11, fontWeight: '600', lineHeight: 14 },
  heroRoi: { color: '#9FD9C6', fontSize: 10.5, fontWeight: '700', marginTop: 5 },
  dwRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  dwL: { fontSize: 13, color: Colors.textSecondary, flexShrink: 1, paddingRight: 8 },
  dwV: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  dwTotal: { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 4, paddingTop: 8 },
  dwBig: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginVertical: 2 },
  rateBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: Radii.md, padding: 11, marginTop: 10 },
  ratePct: { fontSize: 20, fontWeight: '800' },
  rateTxt: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 16 },
  orderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.bgTertiary },
  orderNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primaryLight, color: Colors.primaryDark, fontWeight: '800', fontSize: 12, textAlign: 'center', lineHeight: 22, overflow: 'hidden' },
  orderName: { fontSize: 13.5, fontWeight: '700', color: Colors.textPrimary },
  orderAmt: { fontSize: 12.5, fontWeight: '700', color: Colors.textSecondary },
  orderWhy: { fontSize: 11.5, color: Colors.textTertiary, marginTop: 2, lineHeight: 15 },
  orderCalc: { fontSize: 11.5, color: Colors.primaryDark, fontWeight: '600', marginTop: 3, lineHeight: 15 },
  cardDivider: { height: 1, backgroundColor: Colors.bgTertiary, marginVertical: 12 },
  heroExplain: { fontSize: 10.5, color: Colors.textSecondary, lineHeight: 14, marginTop: 8 },
  planStmt: { fontSize: 12, color: Colors.primaryDark, fontWeight: '600', marginTop: 8, lineHeight: 16 },
  divider: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.6, marginTop: 18, marginBottom: 2 },
  basisRow: { flexDirection: 'row', gap: 7, marginTop: 8 },
  basisPill: { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center' },
  basisPillOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  basisPillT: { fontSize: 11.5, fontWeight: '700', color: Colors.textSecondary },
  basisPillR: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  basisPillTOn: { color: Colors.primaryDark },
  basisWarn: { fontSize: 11, color: Colors.amber, fontWeight: '600', marginTop: 8, lineHeight: 15 },
  tTotal: { borderBottomWidth: 0, borderTopWidth: 1.5, borderTopColor: Colors.border, marginTop: 2 },
  tFootMuted: { fontSize: 10, color: Colors.textTertiary, lineHeight: 13.5, marginTop: 6 },
  srcTag: { fontSize: 9.5, color: Colors.textTertiary, fontWeight: '700' },
  instWarn: { fontSize: 11.5, color: Colors.amber, fontWeight: '700', marginTop: 1 },
  kindSec: { fontSize: 10, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginTop: 12, marginBottom: 4 },
  kindGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kindChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.pill, paddingHorizontal: 11, paddingVertical: 8 },
  kindIc: { fontSize: 15 },
  kindT: { fontSize: 12.5, fontWeight: '700', color: Colors.textPrimary },

  sandboxTag: { fontSize: 10, fontWeight: '800', color: Colors.amber, letterSpacing: 0.6, backgroundColor: Colors.amberLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radii.pill, overflow: 'hidden' },
  actionHint: { fontSize: 11, color: Colors.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 15 },
  scenarioBtnRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  scenarioBtn2: { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, paddingVertical: 12, alignItems: 'center' },
  scenarioBtn2T: { fontSize: 13.5, fontWeight: '700', color: Colors.textPrimary },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 8 },
  legItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legSwatch: { width: 12, height: 12, borderRadius: 3 },
  legT: { fontSize: 11, color: Colors.textSecondary },
  tick: { position: 'absolute', top: -3, width: 2, height: 12, marginLeft: -1, backgroundColor: Colors.textTertiary, borderRadius: 1 },
  markerCap: { fontSize: 9.5, color: Colors.textTertiary, marginTop: 6 },
  gbox: { backgroundColor: Colors.primaryDark, borderRadius: Radii.lg, paddingHorizontal: Spacing.base, paddingVertical: 14, marginTop: 10 },
  gK: { color: '#BEE7D8', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  gAge: { color: '#fff', fontSize: 36, fontWeight: '800', marginVertical: 2 },
  gSub: { color: '#BEE7D8', fontSize: 12.5, fontWeight: '600' },
  insightBox: { backgroundColor: Colors.primaryLight, borderRadius: Radii.lg, padding: Spacing.base, marginTop: 8 },
  // legacy-reserve total row in the "what you have" legend
  lgTotal: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border, marginTop: 4, paddingTop: 6 },
  // verdict (Will your money last?) — the green/amber/red insight box
  verdictHead: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  verdictBody: { fontSize: 14, color: Colors.textPrimary, marginTop: 5, lineHeight: 20 },
  verdictSub: { fontSize: 12.5, color: Colors.textSecondary, marginTop: 6, lineHeight: 18 },
  // Simple-mode "see the details" reveal
  detailsBtn: { marginTop: 14, alignItems: 'center', paddingVertical: 13, borderRadius: Radii.md, backgroundColor: Colors.bgTertiary },
  detailsBtnTxt: { fontSize: 13.5, fontWeight: '700', color: Colors.textPrimary },
  insightTxt: { color: Colors.primaryDark, fontSize: 12.5, lineHeight: 18 },
  insightB: { color: Colors.primaryDark, fontWeight: '800' },

  ssRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.cardBg, borderRadius: Radii.md, padding: 12, marginTop: 10 },
  ssIc: { fontSize: 18 },
  ssName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  ssSub: { fontSize: 11.5, color: Colors.textSecondary, marginTop: 1 },
  ssPill: { backgroundColor: Colors.primaryLight, color: Colors.primary, borderRadius: Radii.pill, paddingHorizontal: 10, paddingVertical: 5, fontSize: 11, fontWeight: '800', overflow: 'hidden' },

  section: { fontSize: 12, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginTop: Spacing.base, marginBottom: 6 },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginTop: 10 },

  // instruments table
  tHead: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tHL: { fontSize: 9, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.4 },
  tColBal: { width: 60, textAlign: 'right' },
  tColRet: { width: 72, textAlign: 'right' },
  tColNum: { width: 64, alignItems: 'flex-end', justifyContent: 'center' },
  tRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: Colors.bgTertiary },
  instIc: { fontSize: 16 },
  instName: { fontSize: 13.5, fontWeight: '700', color: Colors.textPrimary },
  instSrc: { fontSize: 10.5, color: Colors.textSecondary, marginTop: 1, lineHeight: 14 },
  instBal: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  instRet: { fontSize: 13.5, fontWeight: '800', color: Colors.primary, textAlign: 'right' },
  instBench: { fontSize: 13.5, fontWeight: '700', color: Colors.textSecondary, textAlign: 'right' },
  ttmAdd: { fontSize: 12.5, fontWeight: '700', color: Colors.primary, textAlign: 'right' },
  instLinks: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  editLink2: { fontSize: 12.5, fontWeight: '700', color: Colors.primary },
  tFoot: { fontSize: 10.5, color: Colors.textTertiary, lineHeight: 14, marginTop: 8 },
  benchCaveat: { fontSize: 10.5, color: Colors.textTertiary, lineHeight: 14, marginTop: 6, fontStyle: 'italic' },
  clearLink: { fontSize: 12.5, fontWeight: '700', color: Colors.red, textAlign: 'center', marginTop: 12 },

  // projection breakdown (now + you add + growth = total)
  breakdown: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.bgTertiary },
  bdItem: { alignItems: 'center', flexShrink: 1 },
  bdV: { fontSize: 12.5, fontWeight: '800', color: Colors.textPrimary },
  bdL: { fontSize: 9.5, color: Colors.textSecondary, marginTop: 1 },
  bdOp: { fontSize: 12, color: Colors.textTertiary, fontWeight: '700', marginBottom: 10 },

  // beating-benchmark insight
  benchBox: { borderRadius: Radii.lg, padding: Spacing.base, marginTop: 10, borderWidth: 1 },
  benchNeutral: { backgroundColor: Colors.cardBg, borderColor: Colors.border },
  benchAhead: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryMid },
  benchBehind: { backgroundColor: '#FBE9E9', borderColor: '#E9B7B7' },
  benchK: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.3 },
  benchBig: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, marginVertical: 1 },
  benchD: { fontSize: 12.5, color: Colors.textSecondary, lineHeight: 18, marginTop: 3 },
  benchB: { fontWeight: '800', color: Colors.textPrimary },
  benchLink: { fontWeight: '800', color: Colors.primary },

  heroCard: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.base, marginTop: 6, alignItems: 'center' },
  heroLabel: { fontSize: 11, fontWeight: '700', color: Colors.textTertiary, letterSpacing: 0.5 },
  heroNum: { fontSize: 38, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  heroMetaRow: { flexDirection: 'row', gap: 14, marginTop: 4 },
  heroMeta: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  heroSs: { fontSize: 11, color: Colors.textTertiary, marginTop: 6 },
  heroTwoUp: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', marginTop: 2 },
  heroCol: { flex: 1, alignItems: 'center' },
  heroColLabel: { fontSize: 11, fontWeight: '700', color: Colors.textTertiary, letterSpacing: 0.3, textAlign: 'center' },
  heroColNum: { fontSize: 25, fontWeight: '800', color: Colors.textPrimary, marginTop: 3 },
  heroArrow: { fontSize: 20, color: Colors.textTertiary, fontWeight: '400', paddingHorizontal: 6 },
  heroDelta: { fontSize: 12, fontWeight: '800', marginTop: 2 },

  sl: { marginVertical: 9 },
  slTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  slL: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  slV: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  trackHit: { paddingVertical: 9 },
  track: { height: 6, borderRadius: 3, backgroundColor: Colors.border, position: 'relative' },
  fill: { position: 'absolute', left: 0, top: 0, height: 6, borderRadius: 3 },
  thumb: { position: 'absolute', top: -7, width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', borderWidth: 3, marginLeft: -10 },

  conf: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primaryLight, borderRadius: Radii.md, padding: 11, marginTop: 8 },
  confPct: { fontSize: 18, fontWeight: '800' },
  confT: { fontSize: 12, color: Colors.primaryDark, flex: 1, lineHeight: 15 },
  save: { backgroundColor: Colors.primary, borderRadius: Radii.md, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
  saveT: { color: '#fff', fontSize: 15, fontWeight: '800' },
  foot: { fontSize: 11.5, color: Colors.textTertiary, textAlign: 'center', marginTop: 8 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, alignItems: 'center' },
  chip: { backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.pill, paddingHorizontal: 12, paddingVertical: 7 },
  chipT: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  chipHint: { fontSize: 10.5, color: Colors.textTertiary, width: '100%' },

  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  back: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  chip2: { borderRadius: Radii.pill, paddingHorizontal: 10, paddingVertical: 5 },
  chip2T: { color: '#fff', fontSize: 11, fontWeight: '700' },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  axisT: { fontSize: 9, color: Colors.textTertiary },
  fx: { fontSize: 11, color: Colors.textSecondary, marginTop: 8 },

  li: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  liK: { fontSize: 13.5, color: Colors.textSecondary, flexShrink: 1, paddingRight: 8 },
  liV: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },

  scrim: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)' } as any,
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 28 },
  kav: { position: 'absolute', left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' } as any,   // #20: keyboard-aware bottom anchor
  grab: { width: 38, height: 5, borderRadius: 3, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 12 },
  sheetT: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  sheetS: { fontSize: 12.5, color: Colors.textSecondary, marginTop: 3, marginBottom: 8, lineHeight: 17 },
  acc: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderTopWidth: 1, borderTopColor: Colors.border },
  accIc: { fontSize: 18 },
  accName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  accBal: { fontSize: 11.5, color: Colors.textTertiary, marginTop: 1 },
  pctBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pctIn: { width: 56, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 8, padding: 6, textAlign: 'right', fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  pctU: { fontSize: 13, color: Colors.textSecondary },
  counts: { fontSize: 12, fontWeight: '700', color: Colors.primary, minWidth: 60, textAlign: 'right' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  stepBtnT: { fontSize: 18, color: Colors.primary, fontWeight: '700' },
  stepVal: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, minWidth: 30, textAlign: 'center' },
  applyBtn: { backgroundColor: Colors.primary, borderRadius: Radii.md, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  applyT: { color: '#fff', fontSize: 15, fontWeight: '800' },
  dialog: { position: 'absolute', left: 24, right: 24, top: '32%', backgroundColor: '#fff', borderRadius: Radii.lg, padding: 18 },
  nameIn: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, padding: 12, fontSize: 15, color: Colors.textPrimary, marginTop: 4 },
});
