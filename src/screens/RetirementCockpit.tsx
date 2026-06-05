// Retirement — two screens.
// Screen 1 "Where you stand" (current, fact-based): nest-egg donut (earmarked, editable per-account) +
//   blended expected return from per-type benchmarks (editable) + a green insight ("retire at age Y even
//   if you never save again", based on CURRENT nest egg & benchmark return — not the scenario) + Social
//   Security (asked once) + a button into scenario analysis.
// Screen 2 "Scenario analysis": what-if sliders → projected-nest-egg hero (deterministic, live) +
//   Monte-Carlo confidence + percentile band (on release) + save/compare scenarios.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Switch, Modal, PanResponder, type LayoutChangeEvent } from 'react-native';
import Svg, { Path, Line, Circle, G, Rect, Text as SvgText } from 'react-native-svg';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { moneyCompact, currencySymbol } from '../domain/_shared/money';
import { simulate, projectNestEgg, solveRetireAge } from '../domain/retirement';
import { retirementEarmarkedValue, earmarkedAmount, earmarkDefault, assetKind, ASSET_SECTIONS, blendedReturn, benchmarkReturn, benchmarkInfo, portfolioActualReturn, monthlyContributionsFromOnboarding, type AssetAccount } from '../domain/assets';

const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };
const big = (n: number) => moneyCompact(n, 'M');
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const volOf = (ret: number) => clamp(ret * 1.7, 0.05, 0.2);            // higher return ⇒ more volatility
const SECTION_COLOR: Record<string, string> = { Cash: '#178F6B', Investments: '#7A5AA7', Retirement: '#185FA5', Property: '#EBB23A' };
const sectionOf = (a: AssetAccount) => assetKind(a.kind)?.section ?? (a.tax_bucket === 'CASH' ? 'Cash' : a.tax_bucket === 'PROPERTY' ? 'Property' : a.tax_bucket === 'TAXABLE' ? 'Investments' : 'Retirement');

export default function RetirementCockpit() {
  const store = useStore() as any;
  const op = store.onboardingProfile ?? {};
  const A = store.retirementAssumptions ?? {};
  const setA = store.setRetirementAssumptions as (p: any) => void;
  const assets: AssetAccount[] = store.assetAccounts ?? [];

  const [screen, setScreen] = useState<'current' | 'scenario'>('current');
  const [earmarkOpen, setEarmarkOpen] = useState(false);
  const [ssOpen, setSsOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [ttmEdit, setTtmEdit] = useState<AssetAccount | null>(null);

  // ---- data-derived ----
  const age = op.birthYear ? new Date().getFullYear() - num(op.birthYear) : 45;
  const nestEgg = retirementEarmarkedValue(assets);
  const benchBlended = blendedReturn(assets);                          // historic blended benchmark — NOT editable
  const actualBlended = portfolioActualReturn(assets);                 // weighted actual TTM from per-holding entries (may be null)
  const returnBasis: 'benchmark' | 'actual' | 'scenario' = A.returnBasis ?? 'benchmark';
  // growth rate that drives the projection + heroes — user picks which basis to use
  const scenarioReturn = A.expectedReturn ?? benchBlended;
  const growthRate = returnBasis === 'actual' ? (actualBlended ?? benchBlended) : returnBasis === 'scenario' ? scenarioReturn : benchBlended;
  const basisLabel = returnBasis === 'actual' ? 'your 12-month return' : returnBasis === 'scenario' ? 'your scenario return' : 'the blended benchmark';
  const inflDefault = (store.inflationRate ?? 2.5) / 100;
  const ssDefault = Math.round(num(op.ri_ss));
  const contribDefault = Math.round(monthlyContributionsFromOnboarding(op));
  const spendDefault = Math.round(num(op.expectedRetirementSpending) || num(op.monthlySpending) || 5000);
  const retireDefault = num(op.targetRetirementAge) || 65;
  const horizon = A.horizonAge ?? (num(op.horizonAge) || 90);
  const ssIncome = A.ssEligible ? Math.round(A.ssMonthly ?? ssDefault) : 0;
  const claimAge = A.ssClaimAge ?? 67;

  // ---- scenario slider state ----
  const [rAge, setRAge] = useState<number>(A.retireAge ?? retireDefault);
  const [retPct, setRetPct] = useState<number>(Math.round((A.expectedReturn ?? benchBlended) * 1000) / 10);
  const [saveMo, setSaveMo] = useState<number>(A.contribMonthly ?? contribDefault);
  const [spendMo, setSpendMo] = useState<number>(A.spendMonthly ?? spendDefault);
  const [inflPct, setInflPct] = useState<number>(Math.round((A.inflation ?? inflDefault) * 1000) / 10);
  const [chance, setChance] = useState<number | null>(null);
  const [band, setBand] = useState<any>(null);
  const [commitTick, setCommitTick] = useState(0);

  const isRetired = store.employmentStatus === 'retired' || age >= rAge;

  const buildInputs = (over: any = {}) => ({
    current_age: age,
    retire_age: isRetired ? age : Math.max(age + 1, rAge),
    horizon_age: Math.max((isRetired ? age : rAge) + 1, horizon),
    start_balance: nestEgg,
    annual_contribution: (isRetired ? 0 : saveMo) * 12,
    retire_monthly_spend_today: spendMo,
    guaranteed_monthly_income: ssIncome,
    guaranteed_start_age: claimAge,
    inflation: inflPct / 100,
    mean_return: retPct / 100,
    vol_return: volOf(retPct / 100),
    paths: 400, seed: 42,
    ...over,
  });

  // CURRENT insight (green box): based on the nest egg + BENCHMARK return + no further saving — not the sliders
  const greenInputs = buildInputs({ annual_contribution: 0, mean_return: growthRate });
  const retireAtAge = useMemo(() => solveRetireAge(greenInputs), [age, nestEgg, growthRate, inflPct, spendMo, ssIncome, claimAge, horizon]);
  // spend rises with inflation over the retirement period. Everything below the heroes is anchored to
  // the TARGET retire age (rAge), so escalate from there (not from the never-save floor age).
  const spendEscFromAge = isRetired ? age : rAge;
  const spendHi = Math.round(spendMo * Math.pow(1 + inflPct / 100, Math.max(0, horizon - spendEscFromAge)));

  // scenario deterministic (instant) + Monte-Carlo (on release)
  const proj = projectNestEgg(buildInputs());
  useEffect(() => { const s = simulate(buildInputs({ with_band: true })); setChance(s.chance_of_success); setBand(s.band); }, [commitTick, nestEgg, ssIncome, claimAge]);
  const commit = (patch: any) => { setA(patch); setCommitTick((t) => t + 1); };
  const level = chance == null ? Colors.textTertiary : chance >= 80 ? Colors.primary : chance >= 60 ? Colors.amber : Colors.red;

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
    const retAge = Math.round(rAge);
    const span = clamp(retAge - age, 3, 20);
    let bal = nestEgg;
    const yr0 = new Date().getFullYear();
    for (let i = 1; i <= span; i++) {
      const a = age + i;
      bal = bal * (1 + growthRate) + (a <= retAge ? saveMo * 12 : 0);
      out.push({ year: yr0 + i, age: a, bal, isRetire: a === retAge });
    }
    return out;
  }, [nestEgg, growthRate, saveMo, age, rAge]);
  const hasRetireBar = projYears.some((d) => d.isRetire);
  // transparency: split the final projected balance into starting egg + contributions you add + growth
  const projEnd = projYears.length ? projYears[projYears.length - 1].bal : nestEgg;
  const projContrib = projYears.reduce((t, d) => t + (d.age <= Math.round(rAge) ? saveMo * 12 : 0), 0);
  const projGrowth = Math.max(0, projEnd - nestEgg - projContrib);

  // ───────────────── SCREEN 2 — SCENARIO ─────────────────
  if (screen === 'scenario') {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: Colors.bgSecondary }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topbar}>
          <TouchableOpacity onPress={() => setScreen('current')}><Text style={styles.back}>‹ Where you stand</Text></TouchableOpacity>
          <View style={[styles.chip2, { backgroundColor: level }]}><Text style={styles.chip2T}>{chance ?? '…'}% {isRetired ? 'lasts' : 'success'}</Text></View>
        </View>

        <Text style={styles.section}>{isRetired ? 'ADJUST YOUR PLAN — DRAG TO EXPLORE' : 'WHAT IF YOU PLANNED IT? — DRAG TO EXPLORE'}</Text>

        {/* HERO */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>{isRetired ? 'PROJECTED NEST EGG' : `PROJECTED NEST EGG AT ${rAge}`}</Text>
          <Text style={styles.heroNum}>{big(proj.will_have)}</Text>
          <View style={styles.heroMetaRow}>
            <Text style={styles.heroMeta}>you'll need {big(proj.will_need)}</Text>
            {proj.shortfall > 0
              ? <Text style={[styles.heroMeta, { color: Colors.red, fontWeight: '800' }]}>short {big(proj.shortfall)}</Text>
              : <Text style={[styles.heroMeta, { color: Colors.primary, fontWeight: '800' }]}>surplus {big(proj.will_have - proj.will_need)}</Text>}
          </View>
          {ssIncome > 0 && <Text style={styles.heroSs}>incl. Social Security {money(ssIncome)}/mo from {claimAge}</Text>}
          <View style={[styles.conf, { alignSelf: 'stretch' }, chance != null && chance < 60 && { backgroundColor: Colors.redLight }]}>
            <Text style={[styles.confPct, { color: level }]}>{chance == null ? '…' : `${chance}%`}</Text>
            <Text style={styles.confT}>lasts to age {horizon} across 400 market scenarios</Text>
          </View>
        </View>

        {/* SLIDERS */}
        <View style={styles.card}>
          {!isRetired && <SliderRow label="Retire at age" valueLabel={`${rAge}`} value={rAge} min={Math.max(age + 1, 45)} max={75} step={1} onChange={setRAge} onComplete={() => commit({ retireAge: rAge })} />}
          <SliderRow label="Expected return" valueLabel={`${retPct.toFixed(1)}%`} value={retPct} min={2} max={12} step={0.5} onChange={setRetPct} onComplete={() => commit({ expectedReturn: retPct / 100 })} />
          {!isRetired && <SliderRow label="Save / month" valueLabel={money(saveMo)} value={saveMo} min={0} max={8000} step={100} onChange={setSaveMo} onComplete={() => commit({ contribMonthly: saveMo })} />}
          <SliderRow label="Spend / month in retirement" valueLabel={money(spendMo)} value={spendMo} min={1000} max={20000} step={100} onChange={setSpendMo} onComplete={() => commit({ spendMonthly: spendMo })} />
          <SliderRow label="Inflation" valueLabel={`${inflPct.toFixed(1)}%`} value={inflPct} min={0} max={6} step={0.5} onChange={setInflPct} onComplete={() => commit({ inflation: inflPct / 100 })} />
          <Text style={styles.note}>Return starts from your blended benchmark ({(benchBlended * 100).toFixed(1)}%). Drag to stress-test.</Text>
        </View>

        <TouchableOpacity style={styles.save} onPress={() => setSaveOpen(true)}><Text style={styles.saveT}>＋ Save this scenario</Text></TouchableOpacity>

        {(store.retirementScenarios?.length ?? 0) > 0 && (
          <View style={styles.chips}>
            {store.retirementScenarios.map((sc: any) => (
              <TouchableOpacity key={sc.id} style={styles.chip} onLongPress={() => store.deleteRetirementScenario(sc.id)}
                onPress={() => {
                  const a = sc.assumptions || {};
                  setRAge(a.retireAge ?? rAge); setRetPct(Math.round((a.expectedReturn ?? retPct / 100) * 1000) / 10);
                  setSaveMo(a.contribMonthly ?? saveMo); setSpendMo(a.spendMonthly ?? spendMo);
                  setInflPct(Math.round((a.inflation ?? inflPct / 100) * 1000) / 10);
                  setA({ ...a }); setCommitTick((t) => t + 1);
                }}>
                <Text style={styles.chipT}>{sc.name} · {sc.chance}%</Text>
              </TouchableOpacity>
            ))}
            <Text style={styles.chipHint}>long-press a saved scenario to delete</Text>
          </View>
        )}

        {/* BAND CHART */}
        {band && band.length > 1 && (
          <>
            <Text style={styles.section}>PROJECTED BALANCE (10TH–90TH %)</Text>
            <View style={styles.card}>
              <BandChartAuto band={band} retireAge={isRetired ? null : Math.max(age + 1, rAge)} />
              <View style={styles.axis}>
                <Text style={styles.axisT}>{band[0].age}</Text>
                {!isRetired && <Text style={styles.axisT}>retire {rAge}</Text>}
                <Text style={styles.axisT}>{band[band.length - 1].age}</Text>
              </View>
              <Text style={styles.fx}>Shaded = 10th–90th percentile; line = median. Log scale — the lower edge hitting the floor means the money runs out in those scenarios.</Text>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
        <SaveScenario open={saveOpen} onClose={() => setSaveOpen(false)} defaultName={isRetired ? `Spend ${moneyCompact(spendMo, 'M')}` : `Retire ${rAge}`}
          onSave={(name) => { store.saveRetirementScenario(name, isRetired ? age : rAge, chance ?? 0); setSaveOpen(false); }} />
      </ScrollView>
    );
  }

  // ───────────────── SCREEN 1 — WHERE YOU STAND ─────────────────
  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bgSecondary }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.eyebrow}>RETIREMENT · WHERE YOU STAND</Text>

      {/* HERO — two dark-green cards: the never-save floor + the on-plan target */}
      {isRetired ? (
        <View style={styles.gbox}>
          <Text style={styles.heroK}>YOUR MONEY SO FAR</Text>
          <Text style={styles.heroBig}>{chance == null ? '…' : `${chance}%`}</Text>
          <Text style={styles.heroSub}>chance your {big(nestEgg)} lasts to age {horizon}</Text>
        </View>
      ) : (
        <>
          <View style={styles.heroRow}>
            <View style={[styles.heroCardG, { marginRight: 5 }]}>
              <Text style={styles.heroK}>IF YOU NEVER SAVE AGAIN</Text>
              <Text style={styles.heroBig}>{retireAtAge ? `Retire ${retireAtAge}` : 'Keep saving'}</Text>
              <Text style={styles.heroSub}>on today's {big(nestEgg)}</Text>
            </View>
            <View style={[styles.heroCardG, { marginLeft: 5 }]}>
              <Text style={styles.heroK}>AT YOUR TARGET, {Math.round(rAge)}</Text>
              <Text style={styles.heroBig}>{big(projEnd)}</Text>
              <Text style={styles.heroSub}>{chance == null ? 'projected nest egg' : `${chance}% chance it lasts to ${horizon}`}</Text>
            </View>
          </View>
          {chance != null && <Text style={styles.heroExplain}>“{chance}% chance it lasts to {horizon}” = across ~400 market simulations, your money doesn't run out before {horizon} in {chance}% of them.</Text>}
          <Text style={styles.planStmt}>▸ Everything below assumes your plan: retire at {Math.round(rAge)}{saveMo > 0 ? `, keep saving ${money(saveMo)}/mo` : ''}.</Text>
        </>
      )}

      {/* ── WHAT YOU HAVE (facts) ── */}
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
            return (
              <View key={a.asset_id} style={styles.tRow}>
                <Text style={styles.instIc}>{assetKind(a.kind)?.icon ?? '📈'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.instName} numberOfLines={1}>{a.institution?.trim() || a.label}</Text>
                  <Text style={styles.instSrc} numberOfLines={2}>{moneyCompact(earmarkedAmount(a), 'M')} · {info.source} · {info.period}{info.estimate ? ' · est.' : ''}</Text>
                </View>
                <TouchableOpacity style={styles.tColNum} onPress={() => setTtmEdit(a)}>
                  {ttm == null
                    ? <Text style={styles.ttmAdd}>+ Add</Text>
                    : <Text style={[styles.instRet, { color: ttm >= info.ret ? Colors.primary : Colors.red }]}>{(ttm * 100).toFixed(1)}%</Text>}
                </TouchableOpacity>
                <Text style={[styles.tColNum, styles.instBench]}>{(info.ret * 100).toFixed(1)}%</Text>
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
          <Text style={styles.tFootMuted}>“Your 12-mo” = your actual trailing-12-month return (you enter it). Benchmark = the asset class's historical index return (not editable); past performance isn't a guarantee, and a 12-mo actual vs a ~30-yr average is directional only.</Text>
        </View>
      )}

      {/* ── YOUR PLAN (assumptions) ── */}
      <Text style={styles.divider}>YOUR PLAN · assumes age {Math.round(rAge)}</Text>

      {/* GROWTH-RATE BASIS — which return drives the projection */}
      <View style={styles.card}>
        <Text style={styles.liK}>Grow my nest egg using</Text>
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
          <Text style={styles.note}>If your {big(nestEgg)} grows at {(growthRate * 100).toFixed(1)}% ({basisLabel}){saveMo > 0 ? ` and you keep saving ${money(saveMo)}/mo` : ''}.{hasRetireBar ? ` Amber bar = retirement at ${Math.round(rAge)}.` : ''}</Text>
          <ProjectionChartAuto data={projYears} />
          <View style={styles.breakdown}>
            <View style={styles.bdItem}><Text style={styles.bdV}>{big(nestEgg)}</Text><Text style={styles.bdL}>now</Text></View>
            <Text style={styles.bdOp}>+</Text>
            <View style={styles.bdItem}><Text style={styles.bdV}>{big(projContrib)}</Text><Text style={styles.bdL}>you add</Text></View>
            <Text style={styles.bdOp}>+</Text>
            <View style={styles.bdItem}><Text style={styles.bdV}>{big(projGrowth)}</Text><Text style={styles.bdL}>growth</Text></View>
            <Text style={styles.bdOp}>=</Text>
            <View style={styles.bdItem}><Text style={[styles.bdV, { color: Colors.primary }]}>{big(projEnd)}</Text><Text style={styles.bdL}>at {Math.round(rAge)}</Text></View>
          </View>
        </View>
      )}

      {/* IN RETIREMENT — spend, anchored to target age */}
      <View style={styles.card}>
        <Text style={styles.liK}>In retirement (from {Math.round(spendEscFromAge)})</Text>
        <Text style={styles.note}>You plan to spend <Text style={{ fontWeight: '800', color: Colors.textPrimary }}>{money(spendMo)}/mo</Text> in today's dollars → about <Text style={{ fontWeight: '800', color: Colors.textPrimary }}>{big(spendHi)}/mo</Text> by {horizon} as prices rise {inflPct.toFixed(1)}%/yr.</Text>
      </View>

      {/* SOCIAL SECURITY */}
      <TouchableOpacity style={styles.ssRow} onPress={() => setSsOpen(true)}>
        <Text style={styles.ssIc}>🏛️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.ssName}>Social Security</Text>
          <Text style={styles.ssSub}>{A.ssEligible == null ? 'Are you eligible? Tap to set up ›' : A.ssEligible ? `${money(ssIncome)}/mo starting at ${claimAge} · today's $` : 'Not eligible — tap to change'}</Text>
        </View>
        <Text style={[styles.ssPill, A.ssEligible === false && { backgroundColor: Colors.bgTertiary, color: Colors.textSecondary }]}>{A.ssEligible == null ? 'Set up' : A.ssEligible ? 'Eligible ✓' : 'None'}</Text>
      </TouchableOpacity>

      {/* SCENARIO BUTTON */}
      <TouchableOpacity style={styles.save} onPress={() => setScreen('scenario')}><Text style={styles.saveT}>Run scenario analysis  →</Text></TouchableOpacity>
      <Text style={styles.foot}>Test retiring earlier, saving more, market ups & downs.</Text>
      <View style={{ height: 40 }} />

      <EarmarkSheet open={earmarkOpen} onClose={() => setEarmarkOpen(false)} assets={assets} nestEgg={nestEgg}
        onSet={(id, pct) => store.updateAsset(id, { retirement_pct: pct })} onDone={() => { setEarmarkOpen(false); setCommitTick((t) => t + 1); }} />
      <SsEditor open={ssOpen} onClose={() => setSsOpen(false)} A={A} ssDefault={ssDefault} onApply={(patch) => { commit(patch); setSsOpen(false); }} />
      <TtmEditor account={ttmEdit} onClose={() => setTtmEdit(null)} benchmark={ttmEdit ? benchmarkReturn(ttmEdit.kind) : 0}
        onApply={(ret) => { if (ttmEdit) store.updateAsset(ttmEdit.asset_id, { actual_ttm: ret }); setTtmEdit(null); }}
        onClear={() => { if (ttmEdit) store.updateAsset(ttmEdit.asset_id, { actual_ttm: null }); setTtmEdit(null); }} />
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
  const H = 132, padTop = 6, padBot = 18, gap = 4;
  const n = data.length;
  const bw = Math.max(4, (width - gap * (n - 1)) / n);
  const top = Math.max(...data.map((d) => d.bal), 1);
  const h = (v: number) => Math.max(2, (v / top) * (H - padTop - padBot));
  return (
    <Svg width={width} height={H}>
      <Line x1={0} y1={H - padBot} x2={width} y2={H - padBot} stroke={Colors.border} strokeWidth={1} />
      {data.map((d, i) => {
        const bh = h(d.bal), x = i * (bw + gap), y = H - padBot - bh;
        // every bar gets a label; tiny font + edge anchoring keeps them readable even at 20 bars
        const anchor = i === n - 1 ? 'end' : i === 0 ? 'start' : 'middle';
        const lx = i === n - 1 ? x + bw : i === 0 ? x : x + bw / 2;
        const fs = n > 16 ? 6.5 : 7.5;
        return (
          <G key={d.year}>
            <Rect x={x} y={y} width={bw} height={bh} rx={2} fill={d.isRetire ? Colors.amber : Colors.primaryMid} opacity={d.isRetire ? 0.95 : 0.85} />
            <SvgText x={lx} y={H - 5} fontSize={fs} fontWeight={d.isRetire ? '700' : '400'} fill={d.isRetire ? Colors.amber : Colors.textTertiary} textAnchor={anchor}>{`'${String(d.year).slice(2)}`}</SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// ───────────────────────── Slider ─────────────────────────
function Slider({ value, min, max, step = 1, onChange, onComplete, color = Colors.primary }: {
  value: number; min: number; max: number; step?: number; onChange: (v: number) => void; onComplete?: () => void; color?: string;
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
        <View style={[styles.thumb, { left: `${pct}%`, borderColor: color }]} />
      </View>
    </View>
  );
}
function SliderRow(p: { label: string; valueLabel: string } & React.ComponentProps<typeof Slider>) {
  const { label, valueLabel, ...rest } = p;
  return <View style={styles.sl}><View style={styles.slTop}><Text style={styles.slL}>{label}</Text><Text style={styles.slV}>{valueLabel}</Text></View><Slider {...rest} /></View>;
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
function EarmarkSheet({ open, onClose, assets, nestEgg, onSet, onDone }: {
  open: boolean; onClose: () => void; assets: AssetAccount[]; nestEgg: number; onSet: (id: string, pct: number) => void; onDone: () => void;
}) {
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grab} />
        <Text style={styles.sheetT}>What counts toward retirement?</Text>
        <Text style={styles.sheetS}>Some money is for other goals. Set how much of each account funds retirement — the rest stays free for things like a home or college.</Text>
        <ScrollView style={{ maxHeight: 380 }}>
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
    </Modal>
  );
}

// ───────────────────────── Social Security editor ─────────────────────────
function SsEditor({ open, onClose, A, ssDefault, onApply }: { open: boolean; onClose: () => void; A: any; ssDefault: number; onApply: (patch: any) => void }) {
  const [eligible, setEligible] = useState<boolean>(A.ssEligible ?? (ssDefault > 0));
  const [amt, setAmt] = useState(String(A.ssMonthly ?? ssDefault ?? ''));
  const [claim, setClaim] = useState<number>(A.ssClaimAge ?? 67);
  useEffect(() => { if (open) { setEligible(A.ssEligible ?? (ssDefault > 0)); setAmt(String(A.ssMonthly ?? ssDefault ?? '')); setClaim(A.ssClaimAge ?? 67); } }, [open]);
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
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
    </Modal>
  );
}

// ───────────────────────── Save-scenario prompt ─────────────────────────
function SaveScenario({ open, onClose, defaultName, onSave }: { open: boolean; onClose: () => void; defaultName: string; onSave: (name: string) => void }) {
  const [name, setName] = useState(defaultName);
  useEffect(() => { if (open) setName(defaultName); }, [open]);
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose} />
      <View style={styles.dialog}>
        <Text style={styles.sheetT}>Save scenario</Text>
        <Text style={styles.sheetS}>Name this what-if so you can compare it later.</Text>
        <TextInput style={styles.nameIn} value={name} onChangeText={setName} placeholder="e.g. Retire 60" placeholderTextColor={Colors.textTertiary} />
        <TouchableOpacity style={styles.applyBtn} onPress={() => onSave(name.trim() || defaultName)}><Text style={styles.applyT}>Save</Text></TouchableOpacity>
      </View>
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
  gbox: { backgroundColor: Colors.primaryDark, borderRadius: Radii.lg, paddingHorizontal: Spacing.base, paddingVertical: 14, marginTop: 10 },
  gK: { color: '#BEE7D8', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  gAge: { color: '#fff', fontSize: 36, fontWeight: '800', marginVertical: 2 },
  gSub: { color: '#BEE7D8', fontSize: 12.5, fontWeight: '600' },
  insightBox: { backgroundColor: Colors.primaryLight, borderRadius: Radii.lg, padding: Spacing.base, marginTop: 8 },
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
  tHead: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tHL: { fontSize: 9, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.4 },
  tColBal: { width: 60, textAlign: 'right' },
  tColRet: { width: 72, textAlign: 'right' },
  tColNum: { width: 64, alignItems: 'flex-end', justifyContent: 'center' },
  tRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: Colors.bgTertiary },
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
