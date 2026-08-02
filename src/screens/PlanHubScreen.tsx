// Plan hub (FCC detailed design v1.1, Plan sheet) — the chief-of-staff desk: the ONE home of the
// will-it-last number, the big decisions waiting on you, and your saved what-ifs. Nothing here
// changes the plan by itself — every path ends at an explicit adoption step.
import React, { useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { resolveNetWorthRows } from '../domain/snapshot';
import { selectWillItLast } from '../domain/retirement/willItLast';
import { resolveLens } from '../domain/profile/lens';
import { RMD_START_AGE, withdrawalPlan } from '../domain/decumulation';
import { retirementIncomeMonthly } from '../domain/income';
import { ageFromProfile } from '../utils/persona';
import { usePlanCompleteness } from './SharpenPlanScreen';
import { InfoDot } from '../components/UI';
import { maskedMoney, spokenMoney, maskDollars } from '../components/useMoney';
import { HiddenBalancesBanner } from '../components/HiddenBalancesBanner';
import { GaugeArc } from '../components/GaugeArc';
import { lensChanceWord, planDoor, nextDecision } from '../domain/planning/hub';
import { simulate } from '../domain/retirement';
import { useCashflowModel } from '../hooks/useCashflowModel';

// saved-scenario dates read like the rest of the app — never raw ISO (audit PH-3)
const prettySavedDate = (v: any) => { const d = new Date(String(v ?? '')); return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };

export default function PlanHubScreen() {
  const router = useRouter();
  const store = useStore() as any;
  const op = store.onboardingProfile ?? {};
  const uid = store.user?.uid ?? 'local';
  const A = store.retirementAssumptions ?? {};
  const plan = usePlanCompleteness();
  const lens = resolveLens(op, store.lensOverride);
  const age = ageFromProfile(op) ?? null;

  const { accounts } = resolveNetWorthRows(uid, op, store.nwSeeded ?? false, store.assetAccounts ?? [], store.liabilities ?? []);
  const wil = useMemo(
    () => selectWillItLast({ op, accounts, assumptions: A, inflationRate: store.inflationRate, employmentStatus: store.employmentStatus, withBand: true }),
    [op, accounts, A, store.inflationRate, store.employmentStatus],
  );
  // PIN: the hub's number is THE number — cache it so Home's strip and Insights read the same value.
  useEffect(() => { if (wil.chance != null) store.setLastRetireChance?.(wil.chance); }, [wil.chance]);

  const scenarios = (store.retirementScenarios ?? []) as any[];
  const guaranteedMonthly = retirementIncomeMonthly(op);
  const ssChip = A.ssClaimAge != null ? `your plan: claim at ${A.ssClaimAge}` : null;

  // ── mock v9 (founder-approved 2026-08-01): the if-clause, the door, the one next decision ──
  const planRetire = Math.round(Number(A.retireAge ?? op.targetRetirementAge ?? 67));
  const planSave = Number(A.contribMonthly ?? 0);
  const planSpend = Number(A.spendMonthly ?? op.monthlySpending ?? 0);
  const door = useMemo(() => planDoor(op, accounts), [op, accounts]);
  const preTaxIds = accounts.filter((a: any) => a.tax_bucket === 'PRE_TAX').map((a: any) => a.asset_id);
  const preTaxBal = accounts.filter((a: any) => a.tax_bucket === 'PRE_TAX').reduce((t: number, a: any) => t + (a.balance || 0), 0);
  const next = useMemo(() => nextDecision({
    lens, age, birthYear: Number(op.birthYear) || null, ssClaimAge: A.ssClaimAge != null ? Number(A.ssClaimAge) : null,
    preTaxBalance: preTaxBal, preTaxAccountIds: preTaxIds, transactions: store.transactions ?? [], moneyWord: maskedMoney,
  }), [lens, age, op.birthYear, A.ssClaimAge, preTaxBal, store.transactions]);
  // retired: the honest spend-more delta — the SAME engine re-run with +$500/mo, never a guess
  const spendMore = useMemo(() => {
    if (lens !== 'retired' || wil.chance == null || !wil.inputs) return null;
    const bumped = simulate({ ...wil.inputs, retire_monthly_spend_today: (wil.inputs.retire_monthly_spend_today || 0) + 500 }).chance_of_success;
    return { chance: bumped, delta: bumped - wil.chance };
  }, [lens, wil.chance, wil.inputs]);
  // retired: the paycheck numbers — the ONE model Home's card uses (never re-derived)
  const { year: payYear } = useCashflowModel();
  const payMonth = payYear.thisMonth;
  const drawUsed = Math.max(0, planSpend - (payMonth?.guaranteedTotal ?? 0));
  const paycheckTotal = (payMonth?.guaranteedTotal ?? 0) + (payMonth?.safeDraw ?? 0);
  // SAMENESS (pre-48 audit): the rate comes from the CANONICAL withdrawalPlan helper, fed the SAME
  // inputs the odds above used — claim-age-adjusted guaranteed income and the same nest-egg base.
  // Never re-derive inline (that exact drift was the July-24 audit's top finding).
  const wplan = wil.inputs
    ? withdrawalPlan(wil.inputs.retire_monthly_spend_today || planSpend, wil.inputs.guaranteed_monthly_income || 0, wil.inputs.start_balance || 0)
    : null;

  const deleteScenario = (s: any) => {
    Alert.alert('Delete this scenario?', s.name, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => store.deleteRetirementScenario?.(s.id) },
    ]);
  };

  // F11: revert is always a confirmation showing exactly what switches back
  const planHistory = (store.planHistory ?? []) as any[];
  const confirmRevert = () => {
    const prev = planHistory[0];
    if (!prev) return;
    Alert.alert('Back to your previous plan?', `Restores the plan saved ${prev.date} (${prev.label}). Every number switches back exactly.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Switch back', onPress: () => store.revertPlan?.() },
    ]);
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HiddenBalancesBanner />
      <Text style={styles.h1}>Plan</Text>
      <Text style={styles.tagline}>We lay it out. You decide.</Text>

      {/* THE VERDICT — mock v9: spectrum + word + the "if" clause that makes the number theirs */}
      {wil.captured && wil.chance != null ? (
        <TouchableOpacity accessibilityRole="button" style={styles.card} activeOpacity={0.85} onPress={() => router.push('/will-it-last')}
          accessibilityLabel={`${lens === 'retired' ? 'Is my money lasting' : 'Will my money last'} to ${wil.horizonAge}: ${lensChanceWord(lens, wil.chance)}, ${wil.chance} percent, an estimate. Opens what drives this.`}>
          <Text style={styles.cardKicker}>{lens === 'retired' ? 'IS MY MONEY LASTING?' : 'WILL MY MONEY LAST?'} — to {wil.horizonAge}</Text>
          <View style={styles.gaugeRow}>
            <GaugeArc pct={wil.chance} />
            <View style={{ flex: 1 }}>
              <View style={styles.chanceRow}>
                <Text style={styles.chanceWord}>{lensChanceWord(lens, wil.chance)}</Text>
                <Text style={styles.chancePct}> — {wil.chance}%</Text>
              </View>
              {wil.band && <Text style={styles.bandTxt}>range {wil.band.low}–{wil.band.high}% · estimate</Text>}
            </View>
          </View>
          {lens === 'retired' ? (
            <Text style={styles.ifLine}>
              Your {maskedMoney(planSpend)}/mo spending{wil.chance >= 80 ? ` is covered to ${wil.horizonAge} at today's pace` : ` — ${wil.chance} in 100 paths last to ${wil.horizonAge}`}
              {wplan?.withdrawalRate != null ? ` — a ${(wplan.withdrawalRate * 100).toFixed(1)}%/yr withdrawal, ${wplan.rateBand === 'safe' ? 'within the safe range' : wplan.rateBand === 'moderate' ? 'a bit above the 4% guideline — watch it' : 'above 5% — high risk of running short'}` : ''}.
            </Text>
          ) : (
            <Text style={styles.ifLine}>
              …if you retire at {planRetire}{planSave > 0 ? `, keep saving ${maskedMoney(planSave)}/mo` : ''}{planSpend > 0 ? `, and spend ${maskedMoney(planSpend)}/mo in retirement (your planned spending — you set it)` : ''}. Change any of those below.
            </Text>
          )}
          <Text style={styles.cardLink}>What drives this? ›</Text>
        </TouchableOpacity>
      ) : (
        <>
          {/* FIRST DAY — the page previews itself: locked sample gauge + the DYNAMIC door */}
          <View style={styles.card}>
            <Text style={styles.cardKicker}>{lens === 'retired' ? 'IS MY MONEY LASTING?' : 'WILL MY MONEY LAST?'}</Text>
            <View style={styles.gaugeRow} accessible
              accessibilityLabel={`Sample gauge: ${lens === 'retired' ? 'Holding, 88' : 'Likely, 84'} in 100 — a sample, not your number.`}>
              <GaugeArc locked />
              <Text style={styles.sampleTxt}>
                <Text style={{ fontWeight: '800', color: Colors.textPrimary }}>Sample: {lens === 'retired' ? 'Holding — 88 in 100' : 'Likely — 84 in 100'}</Text> paths last through age {wil.horizonAge}.{'\n'}
                <Text style={{ color: Colors.textTertiary }}>A sample — {door.count < 3 ? `yours needs ${door.count} more answer${door.count === 1 ? '' : 's'}` : 'not your number'}.</Text>
              </Text>
            </View>
            <TouchableOpacity accessibilityRole="button" style={styles.doorBtn} onPress={() => router.push('/sharpen')}
              accessibilityLabel={`${door.count} answer${door.count === 1 ? '' : 's'} left — see your real ${lens === 'retired' ? 'answer' : 'odds'}`}>
              <Text style={styles.doorBtnTxt}>{door.count < 3 ? `${door.count} answer${door.count === 1 ? '' : 's'} left — see your real ${lens === 'retired' ? 'answer' : 'odds'}` : `See your real ${lens === 'retired' ? 'answer' : 'odds'} — 3 questions`} ›</Text>
            </TouchableOpacity>
            <Text style={styles.doorSub}>{door.missing.map((m) => m === 'what you spend' && lens === 'retired' ? 'what you spend each month' : m).join(' · ')}{door.count === 3 ? ". That's all." : ''}</Text>
            {door.credit && (
              <Text style={styles.doorCredit}>✓ What you have — already in: {door.credit.accounts} {accounts.some((a: any) => a.source === 'connected') ? 'connected ' : ''}account{door.credit.accounts === 1 ? '' : 's'}, {maskedMoney(Math.round(door.credit.total))} counted</Text>
            )}
          </View>
          <View style={[styles.nextCard, { opacity: 0.5 }]} accessible
            accessibilityLabel="Sample of the next-decision card — real ones are dated from your numbers, never invented.">
            <Text style={styles.nextKicker}>{lens === 'retired' ? 'SAMPLE — DEADLINES LAND HERE' : 'SAMPLE — YOUR NEXT DECISION LANDS HERE'}</Text>
            <Text style={styles.nextTitle}>{lens === 'retired' ? 'Required withdrawal: due Dec 31' : 'Your Social Security claim window opens at 62'}</Text>
            <Text style={styles.nextSub}>{lens === 'retired' ? "Watched and dated from your real accounts, once they're in. Never invented before then." : 'Dated and in your dollars, once your numbers are in. Never invented before then.'}</Text>
          </View>
        </>
      )}

      {/* THE ONE NEXT DECISION — dated when real, absent when nothing is due */}
      {wil.captured && wil.chance != null && next && (
        <TouchableOpacity accessibilityRole="button" style={styles.nextCard} activeOpacity={0.85} onPress={() => router.push(next.route as any)}
          accessibilityLabel={`Next decision: ${next.title}. ${next.sub}`}>
          <Text style={styles.nextKicker}>{next.kicker}</Text>
          <Text style={styles.nextTitle}>{next.title}</Text>
          <Text style={styles.nextSub}>{next.sub}</Text>
          <Text style={styles.nextCta}>{next.cta}</Text>
        </TouchableOpacity>
      )}

      {/* RETIRED: the paycheck — the SAME engine as Home's card, one set of numbers */}
      {lens === 'retired' && wil.captured && wil.chance != null && payMonth && (
        <>
          <Text style={styles.section}>WHERE YOUR INCOME COMES FROM — YOUR RETIREMENT PAYCHECK</Text>
          <TouchableOpacity accessibilityRole="button" style={styles.card} activeOpacity={0.85} onPress={() => router.push('/monthly-income')}
            accessibilityLabel={`Your retirement paycheck: guaranteed ${spokenMoney(Math.round(payMonth.guaranteedTotal))}, safe draw ${spokenMoney(Math.round(payMonth.safeDraw))}, total ${spokenMoney(Math.round(paycheckTotal))} a month. Opens your income.`}>
            {(payMonth.guaranteed ?? []).map((g: any, i: number) => (
              <View key={i} style={styles.payRow}><Text style={styles.payL}>{g.label}</Text><Text style={styles.payV}>{maskedMoney(Math.round(g.amount))}</Text></View>
            ))}
            <View style={styles.payRow}><Text style={[styles.payL, styles.payStrong]}>= Guaranteed</Text><Text style={[styles.payV, styles.payStrong]}>{maskedMoney(Math.round(payMonth.guaranteedTotal))}</Text></View>
            <View style={styles.payRow}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Text style={styles.payL}>+ Safe draw from savings</Text><InfoDot term="safeDraw" /></View><Text style={styles.payV}>{maskedMoney(Math.round(payMonth.safeDraw))}</Text></View>
            <View style={[styles.payRow, styles.payTotal]}><Text style={[styles.payL, styles.payStrong]}>Your paycheck</Text><Text style={[styles.payV, styles.payStrong]}>{maskedMoney(Math.round(paycheckTotal))}/mo</Text></View>
            {planSpend > 0 && (paycheckTotal >= planSpend ? (
              <Text style={styles.payOk}>✓ covers your {maskedMoney(planSpend)}/mo spending — you're using {maskedMoney(Math.round(drawUsed))} of the {maskedMoney(Math.round(payMonth.safeDraw))} safe draw</Text>
            ) : (
              <Text style={styles.payWarn}>your {maskedMoney(planSpend)}/mo spending runs {maskedMoney(Math.round(planSpend - paycheckTotal))} above this paycheck — worth a look below</Text>
            ))}
            <Text style={styles.payNote}>The same paycheck as Home's card — one engine, one set of numbers.</Text>
          </TouchableOpacity>
        </>
      )}

      {/* DECISIONS — every row a complete question, ranked by what's on the mind (mock v9) */}
      {wil.captured && wil.chance != null ? (
        <>
          <Text style={styles.section}>YOUR OTHER DECISIONS — RANKED FOR YOU</Text>
          <View style={styles.card}>
            {lens === 'retired' ? (
              <>
                <DecisionRow title="Can I spend more?"
                  sub={spendMore ? maskDollars(`an extra $500/mo would take you to ${spendMore.chance}% (${spendMore.delta >= 0 ? '+' : '−'}${Math.abs(spendMore.delta)} points) — see the trade before deciding`) : 'see what spending a bit more does to your odds first'}
                  onPress={() => router.push('/retirement')} />
                <DecisionRow divider title="Which account do I draw from first?" sub="the order matters — taxes differ by account" onPress={() => router.push('/(tabs)/cashflow')} />
                {next?.kind !== 'ss-window' && (
                  <DecisionRow divider title="When should I claim Social Security?"
                    sub={A.ssClaimAge != null ? `claimed at ${A.ssClaimAge} ✓ — settled, shown so you know it's handled` : 'not claimed yet? set the age your plan counts on — in your dollars'}
                    onPress={() => router.push('/ss-timing')} />
                )}
                {next?.kind !== 'rmd' && age != null && age >= RMD_START_AGE && (
                  <DecisionRow divider title="Have I taken my required withdrawal?" sub={`✓ on track for ${new Date().getFullYear()} — the details live one tap away`} onPress={() => router.push('/required-withdrawals')} />
                )}
                <DecisionRow divider title="Is a Roth move worth it?"
                  sub={Number(A?.rothConversionThisYear) > 0
                    ? `✓ to do with your brokerage: convert ${maskedMoney(Number(A.rothConversionThisYear))} before Dec 31, ${new Date().getFullYear()}`
                    : 'conversions in low-tax years · and what passes on to family'}
                  onPress={() => router.push('/roth')} />
              </>
            ) : (
              <>
                <DecisionRow title="When can I retire?" sub={`your plan says ${planRetire} — try ${planRetire - 2} or ${planRetire + 2} and watch the ${wil.chance}% move`} onPress={() => router.push('/retirement')} />
                <DecisionRow divider title="Can I afford it?" sub="college help · the mortgage · keep saving — together, not one at a time" onPress={() => router.push('/multi-goal')} />
                {next?.kind !== 'ss-window' && (
                  <DecisionRow divider title="When should I claim Social Security?" sub={ssChip ?? 'set the age your plan counts on — 62 vs 67 vs 70 in your dollars'} onPress={() => router.push('/ss-timing')} />
                )}
                {age != null && age >= RMD_START_AGE && next?.kind !== 'rmd' && (
                  <DecisionRow divider title="Have I taken my required withdrawal?" sub={`✓ on track for ${new Date().getFullYear()}`} onPress={() => router.push('/required-withdrawals')} />
                )}
                <DecisionRow divider title="Is a Roth move worth it?"
                  sub={Number(A?.rothConversionThisYear) > 0
                    ? `✓ to do with your brokerage: convert ${maskedMoney(Number(A.rothConversionThisYear))} before Dec 31, ${new Date().getFullYear()}`
                    : `the window before required withdrawals begin at ${RMD_START_AGE}`}
                  onPress={() => router.push('/roth')} />
              </>
            )}
          </View>
          {/* the sandbox — visibly fenced */}
          <TouchableOpacity accessibilityRole="button" style={styles.sandbox} activeOpacity={0.85} onPress={() => router.push('/retirement')}
            accessibilityLabel="Try what-ifs — a sandbox. Nothing changes until you tap Use as my plan.">
            <Text style={styles.sandT}>Try what-ifs — a sandbox ›</Text>
            <Text style={styles.sandS}>{lens === 'retired' ? 'Sliders for spending and plan-to age.' : 'Sliders for retire age, saving, spending.'} Nothing changes until you tap "Use as my plan".</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.section}>{lens === 'retired' ? 'START WHERE IT PAYS MOST' : 'DECISIONS YOU CAN MAKE TODAY'}</Text>
          <View style={styles.card}>
            {lens === 'retired' ? (
              <>
                <DecisionRow title="Your income" sub="add Social Security and your pension — two minutes, and your paycheck view lights up" onPress={() => router.push('/monthly-income')} />
                <DecisionRow divider title="When should I claim Social Security?" sub="not claimed yet? set the age your plan counts on — 62 vs 67 vs 70 in your dollars" onPress={() => router.push('/ss-timing')} />
                <View style={styles.lockRow} accessible accessibilityLabel="Can I spend more? Locked — unlocks with your answers above.">
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>Can I spend more? 🔒</Text>
                    <Text style={styles.rowSub}>unlocks with your 3 answers above</Text>
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={styles.lockRow} accessible accessibilityLabel="When can I retire? Locked — your biggest question unlocks with the answers above.">
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>When can I retire? 🔒</Text>
                    <Text style={styles.rowSub}>your biggest question — it unlocks with the answers above</Text>
                  </View>
                </View>
                <DecisionRow divider title="Can I afford it?" sub="add a goal — college, the mortgage, helping parents — and see the trade" onPress={() => router.push('/multi-goal')} />
                <DecisionRow divider title="When should I claim Social Security?" sub="62 vs 67 vs 70 in your dollars — set the age your plan counts on. Worked example until your statement number goes in." onPress={() => router.push('/ss-timing')} />
              </>
            )}
          </View>
        </>
      )}

      {/* SAVED SCENARIOS */}
      {scenarios.length > 0 && (
        <>
          <Text style={styles.section}>SAVED SCENARIOS ({scenarios.length})</Text>
          <View style={styles.card}>
            {scenarios.map((s, i) => (
              <View key={s.id} style={[styles.scRow, i > 0 && styles.divider]}>
                <TouchableOpacity accessibilityRole="button" style={{ flex: 1 }} onPress={() => router.push('/retirement')}
                  accessibilityLabel={`Saved scenario ${s.name}, ${s.chance != null ? `${s.chance} percent when saved` : ''}`}>
                  <Text style={styles.rowTitle}>{s.name}</Text>
                  <Text style={styles.rowSub}>{s.chance != null ? `${s.chance}% when saved` : 'open to re-run'} · {prettySavedDate(s.createdAt)}</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" onPress={() => deleteScenario(s)} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                  accessibilityLabel={`Delete scenario ${s.name}`}>
                  <Text style={styles.deleteTxt}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Back to previous plan (appears only after an adoption) */}
      {planHistory.length > 0 && (
        <TouchableOpacity accessibilityRole="button" style={styles.card} activeOpacity={0.85} onPress={confirmRevert}
          accessibilityLabel={`Back to previous plan, saved ${planHistory[0].date}`}>
          <Text style={styles.rowTitle}>Back to previous plan ({planHistory[0].date})</Text>
          <Text style={styles.rowSub}>One tap shows exactly what would switch back — nothing changes without a confirmation.</Text>
        </TouchableOpacity>
      )}

      {/* Sharpen your plan meter */}
      <TouchableOpacity accessibilityRole="button" style={styles.card} activeOpacity={0.85} onPress={() => router.push('/sharpen')}
        accessibilityLabel={`Sharpen your plan, ${plan.doneCount} of ${plan.total} done`}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.rowTitle, { flex: 1 }]}>Sharpen your plan</Text>
          <Text style={styles.meterTxt}>{plan.doneCount} of {plan.total} answered ›</Text>
        </View>
        <View style={styles.meterBar}><View style={[styles.meterFill, { width: `${plan.pct}%` }]} /></View>
      </TouchableOpacity>

      {wil.captured && wil.chance != null
        ? <Text style={styles.tinyFoot}>Estimates from ~400 market simulations of your own numbers — not advice.</Text>
        : <Text style={styles.tinyFoot}>No percent is shown until it's yours — we never fake a number.</Text>}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function DecisionRow({ title, sub, onPress, divider }: { title: string; sub: string; onPress: () => void; divider?: boolean }) {
  return (
    <TouchableOpacity style={[styles.decRow, divider && styles.divider]} activeOpacity={0.7} onPress={onPress}
      accessibilityRole="button" accessibilityLabel={`${title} — ${sub}`}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.lg },
  h1: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },   // never outweigh the verdict hero (audit PH-2)
  tagline: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.md },
  section: { fontSize: 12, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginTop: Spacing.md, marginBottom: Spacing.xs },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  cardKicker: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.6 },
  chanceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  chanceWord: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary },
  chancePct: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary },
  bandTxt: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  bandTrack: { height: 8, borderRadius: 4, backgroundColor: Colors.bgSecondary, marginTop: 8, overflow: 'hidden' },
  bandFill: { position: 'absolute', top: 0, bottom: 0, backgroundColor: Colors.primaryLight },
  bandMark: { position: 'absolute', top: 0, bottom: 0, width: 3, borderRadius: 1.5, backgroundColor: Colors.primary },
  inviteTxt: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginTop: 6 },
  cardLink: { fontSize: 14, fontWeight: '600', color: Colors.primary, marginTop: 10 },
  decRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  divider: { borderTopWidth: 1, borderTopColor: Colors.border },
  rowTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  rowSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  arrow: { fontSize: 20, color: Colors.textTertiary, marginLeft: 8 },
  scRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  deleteTxt: { fontSize: 15, color: Colors.textTertiary, paddingHorizontal: 8 },
  gaugeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4, marginBottom: 2 },
  ifLine: { fontSize: 14, color: Colors.textPrimary, lineHeight: 20, marginTop: 6 },
  sampleTxt: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  doorBtn: { backgroundColor: Colors.primary, borderRadius: Radii.md, paddingVertical: 13, alignItems: 'center', marginTop: 10, minHeight: 44 },
  doorBtnTxt: { color: Colors.white, fontSize: 15, fontWeight: '800' },
  doorSub: { fontSize: 12, color: Colors.textTertiary, textAlign: 'center', marginTop: 7 },
  doorCredit: { fontSize: 12, color: Colors.primaryDark, fontWeight: '700', textAlign: 'center', marginTop: 5 },
  nextCard: { backgroundColor: Colors.amberLight, borderWidth: 1.5, borderColor: Colors.amberMid, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  nextKicker: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, color: Colors.amber, marginBottom: 3 },
  nextTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, lineHeight: 20 },
  nextSub: { fontSize: 12.5, color: Colors.textSecondary, marginTop: 3, lineHeight: 17 },
  nextCta: { fontSize: 13, fontWeight: '800', color: Colors.amber, marginTop: 7 },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  payL: { fontSize: 14, color: Colors.textSecondary },
  payV: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  payStrong: { fontWeight: '800', color: Colors.textPrimary },
  payTotal: { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 3, paddingTop: 9 },
  payOk: { fontSize: 12.5, color: Colors.primaryDark, fontWeight: '600', marginTop: 7 },
  payWarn: { fontSize: 12.5, color: Colors.amber, fontWeight: '600', marginTop: 7 },
  payNote: { fontSize: 11, color: Colors.textTertiary, marginTop: 5 },
  sandbox: { backgroundColor: Colors.cardBg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.borderStrong, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  sandT: { fontSize: 15, fontWeight: '800', color: Colors.primary },
  sandS: { fontSize: 12, color: Colors.textSecondary, marginTop: 3, lineHeight: 17 },
  lockRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, minHeight: 44, opacity: 0.75 },
  tinyFoot: { fontSize: 11, color: Colors.textTertiary, marginTop: 2, marginBottom: 4, lineHeight: 15 },
  meterTxt: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  meterBar: { height: 6, borderRadius: 3, backgroundColor: Colors.bgSecondary, marginTop: 8, overflow: 'hidden' },
  meterFill: { height: 6, borderRadius: 3, backgroundColor: Colors.primary },
});
